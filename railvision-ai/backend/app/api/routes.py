"""
RailVision AI — API Routes

Defines every HTTP endpoint the backend exposes:

    POST  /upload        Upload a video file
    POST  /process       Run AI engine inference on an uploaded video
    GET   /result/{id}   Retrieve a processed video file
    GET   /health        Liveness / readiness probe

All heavy compute is delegated to ``asyncio.to_thread`` so the event
loop stays responsive.
"""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path
import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse

from app.config import get_settings, Settings
from app.models.schemas import (
    ErrorResponse,
    HealthResponse,
    ProcessingResult,
    ProcessRequest,
    UploadResponse,
    QueryRequest,
    QueryResponse,
)
from app.ai.base.module_registry import ModuleRegistry, get_module_registry
from app.services.video_service import process_video, VideoProcessingError
from app.services.llm_service import llm_service
from app.services.webcam_service import webcam_manager
from app.utils.file_utils import (
    generate_video_id,
    get_output_path,
    get_upload_path,
    validate_file_size,
    validate_video_extension,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────
# POST /upload
# ─────────────────────────────────────────────────────────────────────
@router.post(
    "/upload",
    response_model=UploadResponse,
    responses={400: {"model": ErrorResponse}, 413: {"model": ErrorResponse}},
    summary="Upload a video file for processing",
)
async def upload_video(
    file: UploadFile = File(..., description="Video file (MP4, AVI, MOV, MKV)"),
    settings: Settings = Depends(get_settings),
):
    """
    Accept a video upload, validate its extension and size, persist it
    to disk, and return a ``video_id`` that the caller uses to trigger
    processing.
    """
    # ── Validate filename / extension ────────────────────────────────
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is missing from the upload.",
        )

    try:
        validate_video_extension(file.filename)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    # ── Read content and validate size ───────────────────────────────
    content = await file.read()

    try:
        validate_file_size(len(content))
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=str(exc),
        )

    # ── Persist to disk ──────────────────────────────────────────────
    video_id = generate_video_id()
    dest = get_upload_path(video_id, file.filename)

    import asyncio
    await asyncio.to_thread(dest.write_bytes, content)
    logger.info("Saved upload → %s (%d bytes)", dest, len(content))

    return UploadResponse(
        status="success",
        message="Video uploaded successfully.",
        video_id=video_id,
        filename=dest.name,
    )


# ─────────────────────────────────────────────────────────────────────
# POST /process
# ─────────────────────────────────────────────────────────────────────
@router.post(
    "/process",
    response_model=ProcessingResult,
    responses={
        400: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
    summary="Run AI inference on an uploaded video",
)
async def process_uploaded_video(
    body: ProcessRequest,
    background_tasks: BackgroundTasks,
    registry: ModuleRegistry = Depends(get_module_registry),
    settings: Settings = Depends(get_settings),
):
    """
    Locate the previously-uploaded video by ``video_id``, run
    frame-by-frame inference across all active AI modules, annotate the video,
    and return the modular detection JSON.
    """
    # ── Ensure at least one AI module is loaded ──────────────────────
    if not registry.is_ready():
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI engine is not ready. No active modules loaded.",
        )

    # ── Locate the uploaded file ─────────────────────────────────────
    upload_dir: Path = settings.upload_dir
    matches = list(upload_dir.glob(f"{body.video_id}_*"))
    if not matches:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No uploaded video found for id '{body.video_id}'.",
        )

    input_path = matches[0]
    output_path = get_output_path(body.video_id)

    # ── Run inference in a thread (CPU/GPU-bound) ────────────────────
    try:
        result: ProcessingResult = await asyncio.to_thread(
            process_video,
            input_path,
            output_path,
            registry,
            body.confidence,
        )
    except VideoProcessingError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    except Exception as exc:
        logger.exception("Inference failed for video_id=%s", body.video_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference failed: {exc}",
        )

    # Initialize report status on disk
    report_dir = get_settings().output_dir / body.video_id / "report"
    report_dir.mkdir(parents=True, exist_ok=True)
    status_file = report_dir / "report_status.json"
    
    # Write initial PENDING/GENERATING state
    with open(status_file, "w", encoding="utf-8") as f:
        json.dump({
            "video_id": body.video_id,
            "status": "GENERATING",
            "report": None,
            "error": None,
            "started_at": datetime.utcnow().isoformat(),
            "completed_at": None
        }, f, indent=2)

    # Set placeholder so frontend doesn't hang (legacy support, though not strictly needed anymore)
    result.ai_master_report = "Report is being generated in the background..."

    async def generate_report_task(vid: str, res: ProcessingResult):
        r_dir = get_settings().output_dir / vid / "report"
        s_file = r_dir / "report_status.json"
        
        def update_status(status: str, report: str | None = None, error: str | None = None):
            try:
                # read existing to keep started_at
                current = {}
                if s_file.exists():
                    with open(s_file, "r", encoding="utf-8") as sf:
                        current = json.load(sf)
                current.update({
                    "status": status,
                    "report": report,
                    "error": error,
                    "completed_at": datetime.utcnow().isoformat() if status in ["COMPLETE", "FAILED"] else None
                })
                with open(s_file, "w", encoding="utf-8") as sf:
                    json.dump(current, sf, indent=2)
            except Exception as e:
                logger.error(f"Failed to update report status file: {e}")

        # ── 1. Generate Knowledge Base ────────────────────────────────────
        try:
            from app.services.knowledge_base import KnowledgeBaseBuilder
            import app.services.context_builder as cb
            cb.LATEST_VIDEO_ID = vid
            
            kb = KnowledgeBaseBuilder()
            kb.generate(vid, res)
            
            # Validate required files
            required = ["summary.json", "crowd.json", "crime.json", "worker.json", "alerts.json", "timeline.json"]
            missing = [f for f in required if not (r_dir / f).exists()]
            if missing:
                raise Exception(f"Knowledge Base generation failed. Missing files: {', '.join(missing)}")
                
        except Exception as exc:
            logger.exception("Failed to generate Knowledge Base")
            update_status("FAILED", error=f"Knowledge Base Error: {exc}")
            return

        # ── 2. Generate AI Master Intelligence Report ─────────────────────
        try:
            from app.services.context_builder import ContextBuilder
            cb2 = ContextBuilder()
            report_prompt = cb2.build_prompt("Generate a comprehensive executive intelligence report for this video.", vid)
            report_content = await llm_service.query_assistant(report_prompt)
            
            if not report_content or not report_content.strip():
                raise Exception("Qwen generated an empty report.")
                
            # Write report to markdown file
            report_md_file = r_dir / "report.md"
            with open(report_md_file, "w", encoding="utf-8") as rf:
                rf.write(report_content)
                
            # Final success status
            update_status("COMPLETE", report=report_content)
            
        except Exception as exc:
            logger.exception("Failed to generate AI Master report")
            update_status("FAILED", error=f"LLM Generation Error: {exc}")

    background_tasks.add_task(generate_report_task, body.video_id, result)

    return result

# ─────────────────────────────────────────────────────────────────────
# GET /report/{video_id}
# ─────────────────────────────────────────────────────────────────────
@router.get(
    "/report/{video_id}",
    responses={404: {"model": ErrorResponse}},
    summary="Get the generated AI Master report",
)
async def get_report(video_id: str):
    """
    Get the background-generated report for the given video.
    """
    status_file = get_settings().output_dir / video_id / "report" / "report_status.json"
    if not status_file.exists():
        return {
            "video_id": video_id,
            "status": "FAILED",
            "report": None,
            "error": "Report not found or never started.",
            "started_at": None,
            "completed_at": None
        }
        
    try:
        with open(status_file, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        return {
            "video_id": video_id,
            "status": "FAILED",
            "report": None,
            "error": f"Failed to read report status: {e}",
            "started_at": None,
            "completed_at": None
        }

# ─────────────────────────────────────────────────────────────────────
# POST /report/{video_id}/retry
# ─────────────────────────────────────────────────────────────────────
@router.post(
    "/report/{video_id}/retry",
    responses={404: {"model": ErrorResponse}},
    summary="Retry Qwen Report Generation",
)
async def retry_report(video_id: str, background_tasks: BackgroundTasks):
    """
    Retry report generation using the existing Knowledge Base.
    """
    report_dir = get_settings().output_dir / video_id / "report"
    status_file = report_dir / "report_status.json"
    
    # 1. Update status to GENERATING
    try:
        with open(status_file, "w", encoding="utf-8") as f:
            json.dump({
                "video_id": video_id,
                "status": "GENERATING",
                "report": None,
                "error": None,
                "started_at": datetime.utcnow().isoformat(),
                "completed_at": None
            }, f, indent=2)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reset status: {e}")

    # 2. Add Background Task (Only LLM generation)
    async def retry_task(vid: str):
        r_dir = get_settings().output_dir / vid / "report"
        s_file = r_dir / "report_status.json"
        
        def update_status(status: str, report: str | None = None, error: str | None = None):
            try:
                current = {}
                if s_file.exists():
                    with open(s_file, "r", encoding="utf-8") as sf:
                        current = json.load(sf)
                current.update({
                    "status": status,
                    "report": report,
                    "error": error,
                    "completed_at": datetime.utcnow().isoformat() if status in ["COMPLETE", "FAILED"] else None
                })
                with open(s_file, "w", encoding="utf-8") as sf:
                    json.dump(current, sf, indent=2)
            except Exception as e:
                logger.error(f"Failed to update report status file: {e}")

        try:
            from app.services.context_builder import ContextBuilder
            import app.services.context_builder as cb
            cb.LATEST_VIDEO_ID = vid
            
            cb2 = ContextBuilder()
            report_prompt = cb2.build_prompt("Generate a comprehensive executive intelligence report for this video.", vid)
            report_content = await llm_service.query_assistant(report_prompt)
            
            if not report_content or not report_content.strip():
                raise Exception("Qwen generated an empty report.")
                
            report_md_file = r_dir / "report.md"
            with open(report_md_file, "w", encoding="utf-8") as rf:
                rf.write(report_content)
                
            update_status("COMPLETE", report=report_content)
            
        except Exception as exc:
            logger.exception("Failed to retry AI Master report")
            update_status("FAILED", error=f"LLM Generation Error: {exc}")

    background_tasks.add_task(retry_task, video_id)
    
    return {"message": "Retry task started."}


# ─────────────────────────────────────────────────────────────────────
# GET /result/{video_id}
# ─────────────────────────────────────────────────────────────────────
@router.get(
    "/result/{video_id}",
    responses={404: {"model": ErrorResponse}},
    summary="Download the processed (annotated) video",
)
async def get_result_video(
    video_id: str,
    settings: Settings = Depends(get_settings),
):
    """
    Serve the annotated output video as a downloadable ``video/mp4``
    response.
    """
    output_path = get_output_path(video_id)

    if not output_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Processed video not found for id '{video_id}'. Run /process first.",
        )

    return FileResponse(
        path=str(output_path),
        media_type="video/mp4",
        filename=output_path.name,
    )


# ─────────────────────────────────────────────────────────────────────
# GET /health
# ─────────────────────────────────────────────────────────────────────
@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check / readiness probe",
)
async def health_check(
    registry: ModuleRegistry = Depends(get_module_registry),
    settings: Settings = Depends(get_settings),
):
    return HealthResponse(
        status="healthy",
        model_loaded=registry.is_ready(),
        device=settings.model_device,
        version=settings.app_version,
        modules=registry.get_status(),
    )


# ─────────────────────────────────────────────────────────────────────
# GET /heatmap
# ─────────────────────────────────────────────────────────────────────
@router.get(
    "/heatmap",
    responses={404: {"model": ErrorResponse}},
    summary="Serve the latest crowd heatmap image",
)
async def get_heatmap(
    settings: Settings = Depends(get_settings),
):
    """
    Serve the most recent crowd heatmap image generated during
    video processing.
    """
    heatmap_path = settings.output_dir / "crowd_heatmap.png"

    if not heatmap_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No heatmap found. Process a video with crowd analysis enabled first.",
        )

    return FileResponse(
        path=str(heatmap_path),
        media_type="image/png",
        filename="crowd_heatmap.png",
    )


# ─────────────────────────────────────────────────────────────────────
# POST /query
# ─────────────────────────────────────────────────────────────────────
@router.post(
    "/query",
    response_model=QueryResponse,
    summary="Ask the AI Master a natural language question",
)
async def ask_query(
    body: QueryRequest,
):
    """
    Query the RailVision AI Master engine with a natural language question.
    Optionally accepts a context JSON payload (e.g., detection results).
    """
    try:
        from app.services.context_builder import ContextBuilder
        cb = ContextBuilder()
        vid = body.video_id if hasattr(body, 'video_id') and body.video_id else None
        
        # Build optimized prompt using the new AI Context Builder
        optimized_prompt = cb.build_prompt(body.query, vid)
        
        # Query LLM with the optimized string
        answer = await llm_service.query_assistant(optimized_prompt)
        return QueryResponse(status="success", answer=answer, confidence="High")
    except Exception as exc:
        logger.exception("Natural Language Query failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Query failed: {exc}",
        )

# ─────────────────────────────────────────────────────────────────────
# WEBCAM ENDPOINTS
# ─────────────────────────────────────────────────────────────────────
@router.post(
    "/webcam/session",
    summary="Initialize a new webcam tracking session",
)
async def create_webcam_session():
    """
    Creates an isolated ModuleRegistry instance for real-time tracking.
    """
    import uuid
    session_id = str(uuid.uuid4())
    # The session is created inside the WS connection to avoid memory leaks if they never connect.
    # But returning it allows frontend to connect.
    return {"session_id": session_id}

@router.websocket("/ws/webcam/{session_id}")
async def webcam_websocket(websocket: WebSocket, session_id: str):
    await websocket.accept()
    logger.info(f"WebSocket connected for webcam session {session_id}")
    
    session = webcam_manager.create_session(session_id)
    try:
        while True:
            # Receive JPEG frame bytes from the browser
            frame_bytes = await websocket.receive_bytes()
            
            # Process frame using isolated session (runs synchronously but fast)
            # In production, might offload to thread, but for local backpressure it's fine.
            res = session.process_frame(frame_bytes)
            
            # Send back annotated JPEG and stats
            await websocket.send_json(res)
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for {session_id}")
    except Exception as e:
        logger.error(f"WebSocket error for {session_id}: {e}")
    finally:
        webcam_manager.end_session(session_id)
        
@router.post(
    "/webcam/report/{session_id}",
    summary="Generate AI Master Report for a Live Webcam Session",
)
async def generate_webcam_report(session_id: str, background_tasks: BackgroundTasks):
    """
    Creates a snapshot of current canonical statistics, builds the Knowledge Base,
    and runs Qwen asynchronously.
    """
    session = webcam_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Webcam session not found")
        
    # Generate canonical snapshot
    result = session.generate_snapshot()
    video_id = f"webcam_{session_id}"
    
    report_dir = get_settings().output_dir / video_id / "report"
    report_dir.mkdir(parents=True, exist_ok=True)
    status_file = report_dir / "report_status.json"
    
    # 1. Set status to GENERATING
    with open(status_file, "w", encoding="utf-8") as f:
        json.dump({
            "video_id": video_id,
            "status": "GENERATING",
            "report": None,
            "error": None,
            "started_at": datetime.utcnow().isoformat(),
            "completed_at": None
        }, f, indent=2)

    # 2. Add Background Task
    async def webcam_report_task(vid: str, res: ProcessingResult):
        r_dir = get_settings().output_dir / vid / "report"
        s_file = r_dir / "report_status.json"
        
        def update_status(status: str, report: str | None = None, error: str | None = None):
            try:
                current = {}
                if s_file.exists():
                    with open(s_file, "r", encoding="utf-8") as sf:
                        current = json.load(sf)
                current.update({
                    "status": status,
                    "report": report,
                    "error": error,
                    "completed_at": datetime.utcnow().isoformat() if status in ["COMPLETE", "FAILED"] else None
                })
                with open(s_file, "w", encoding="utf-8") as sf:
                    json.dump(current, sf, indent=2)
            except Exception as e:
                logger.error(f"Failed to update report status file: {e}")

        try:
            # Build Knowledge Base
            from app.services.knowledge_base import KnowledgeBaseBuilder
            kbb = KnowledgeBaseBuilder()
            kbb.generate(vid, res)
            
            # Query Qwen
            from app.services.context_builder import ContextBuilder
            import app.services.context_builder as cb
            cb.LATEST_VIDEO_ID = vid
            
            cb2 = ContextBuilder()
            report_prompt = cb2.build_prompt("Generate a comprehensive executive intelligence report for this live webcam session.", vid)
            report_content = await llm_service.query_assistant(report_prompt)
            
            if not report_content or not report_content.strip():
                raise Exception("Qwen generated an empty report.")
                
            report_md_file = r_dir / "report.md"
            with open(report_md_file, "w", encoding="utf-8") as rf:
                rf.write(report_content)
                
            update_status("COMPLETE", report=report_content)
            
        except Exception as exc:
            logger.exception("Failed to generate AI Master report for webcam")
            update_status("FAILED", error=f"LLM Generation Error: {exc}")

    background_tasks.add_task(webcam_report_task, video_id, result)
    
    return {"message": "Report generation started", "video_id": video_id}

# ─────────────────────────────────────────────────────────────────────
# GET /outputs/{video_id}/thumbnails/{filename}
# ─────────────────────────────────────────────────────────────────────
@router.get(
    "/outputs/{video_id}/thumbnails/{filename}",
    response_class=FileResponse,
    summary="Retrieve a thumbnail frame",
)
def get_thumbnail(video_id: str, filename: str):
    """Serve thumbnail images extracted from AI events."""
    base_dir = get_output_path(video_id).parent
    thumb_path = base_dir / video_id / "thumbnails" / filename
    if not thumb_path.exists() or not thumb_path.is_file():
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    return FileResponse(thumb_path)
