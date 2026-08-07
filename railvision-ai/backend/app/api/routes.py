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

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse

from app.config import get_settings, Settings
from app.models.schemas import (
    ErrorResponse,
    HealthResponse,
    ProcessingResult,
    ProcessRequest,
    UploadResponse,
)
from app.ai.base.module_registry import ModuleRegistry, get_module_registry
from app.services.video_service import process_video, VideoProcessingError
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

    dest.write_bytes(content)
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

    return result


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
