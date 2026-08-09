import time
import asyncio
import cv2
from pathlib import Path
import logging

from app.config import get_settings
from app.ai.base.module_registry import get_module_registry
from app.services.llm_service import LLMService

from app.ai.person.config import PersonDetectionConfig
from app.ai.person.module import PersonDetectionModule
from app.ai.crowd.config import CrowdAnalysisConfig
from app.ai.crowd.module import CrowdAnalysisModule
from app.ai.crime.config import CrimeDetectionConfig
from app.ai.crime.module import CrimeDetectionModule
from app.ai.worker.config import WorkerMonitoringConfig
from app.ai.worker.module import WorkerMonitoringModule

logging.basicConfig(level=logging.INFO)

async def run_profile():
    settings = get_settings()
    registry = get_module_registry()
    
    # Person Detection (WORKING)
    person_cfg = PersonDetectionConfig(
        enabled=settings.enable_person_detection,
        model_path=settings.model_name,
        confidence=settings.model_confidence,
        iou_threshold=settings.model_iou_threshold,
        device=settings.model_device,
        weights_dir=settings.weights_dir,
    )
    registry.register(PersonDetectionModule(person_cfg))

    # Crowd Analysis (PRODUCTION)
    crowd_cfg = CrowdAnalysisConfig(
        enabled=settings.enable_crowd_analysis,
        output_dir=settings.output_dir,
    )
    registry.register(CrowdAnalysisModule(crowd_cfg))

    # Crime Detection (PRODUCTION)
    crime_cfg = CrimeDetectionConfig(
        enabled=settings.enable_crime_detection,
        output_dir=settings.output_dir,
    )
    registry.register(CrimeDetectionModule(crime_cfg))

    # Worker Monitoring
    worker_cfg = WorkerMonitoringConfig(
        enabled=settings.enable_worker_monitoring,
    )
    registry.register(WorkerMonitoringModule(worker_cfg))
    
    registry.initialize_all()
    llm = LLMService()

    input_video = Path("/Users/harshvardhan/Developer/SIH2026 Internal Hackathon/railvision-ai/backend/uploads/75854eca3453_From_Klickpin.com-_Printable_Wall_Art_Ideas_Inspiration_for_Holiday-pin-id-747034656985861033.mp4")
    
    # Ensure sample exists
    if not input_video.exists():
        logging.error(f"Please place a sample video at {input_video}")
        # fallback to any mp4 in uploads
        uploads = list(Path("/Users/harshvardhan/Developer/SIH2026 Internal Hackathon/railvision-ai/backend/uploads").glob("*.mp4"))
        if not uploads:
            print("No video found in uploads!")
            return
        input_video = uploads[0]

    output_video = Path("outputs/profile_test.mp4")

    print(f"=== Profiling {input_video.name} ===")

    # Monkey patch to record detailed timings
    times = {
        "video_io": 0.0,
        "yolo_track": 0.0,
        "crime": 0.0,
        "crowd": 0.0,
        "worker": 0.0,
        "total_frames": 0,
        "processed_frames": 0,
    }

    cap = cv2.VideoCapture(str(input_video))
    
    frame_idx = 0
    t0_total = time.perf_counter()

    while True:
        t_io0 = time.perf_counter()
        ret, frame = cap.read()
        times["video_io"] += time.perf_counter() - t_io0
        
        if not ret:
            break
            
        times["total_frames"] += 1
        
        if frame_idx % settings.frame_skip == 0:
            times["processed_frames"] += 1
            shared_context = {}
            
            # Person (YOLO + Track)
            if "person_detection" in registry._modules and registry._modules["person_detection"].is_enabled:
                m = registry._modules["person_detection"]
                t0 = time.perf_counter()
                dets = m.process_frame(frame, frame_idx, shared_context)
                times["yolo_track"] += time.perf_counter() - t0
                shared_context["person_detection"] = dets
                
            # Crime
            if "crime_detection" in registry._modules and registry._modules["crime_detection"].is_enabled:
                m = registry._modules["crime_detection"]
                t0 = time.perf_counter()
                dets = m.process_frame(frame, frame_idx, shared_context)
                times["crime"] += time.perf_counter() - t0
                shared_context["crime_detection"] = dets
                
            # Crowd
            if "crowd_analysis" in registry._modules and registry._modules["crowd_analysis"].is_enabled:
                m = registry._modules["crowd_analysis"]
                t0 = time.perf_counter()
                dets = m.process_frame(frame, frame_idx, shared_context)
                times["crowd"] += time.perf_counter() - t0
                shared_context["crowd_analysis"] = dets
                
            # Worker
            if "worker_monitoring" in registry._modules and registry._modules["worker_monitoring"].is_enabled:
                m = registry._modules["worker_monitoring"]
                t0 = time.perf_counter()
                dets = m.process_frame(frame, frame_idx, shared_context)
                times["worker"] += time.perf_counter() - t0
                shared_context["worker_monitoring"] = dets

        frame_idx += 1

    cap.release()
    total_time = time.perf_counter() - t0_total
    
    # Profile Qwen
    print("Generating Qwen report...")
    t_qwen0 = time.perf_counter()
    try:
        report = await llm.query_assistant("Generate a dummy report based on sample stats")
    except Exception as e:
        print("Qwen error:", e)
    qwen_time = time.perf_counter() - t_qwen0

    print("\n--- PERFORMANCE PROFILE ---")
    print(f"Total Video Time : {total_time:.2f}s")
    print(f"Total Frames     : {times['total_frames']}")
    print(f"Processed Frames : {times['processed_frames']}")
    print(f"Video I/O        : {times['video_io']:.2f}s")
    print(f"YOLO + ByteTrack : {times['yolo_track']:.2f}s")
    print(f"Crime Analysis   : {times['crime']:.2f}s")
    print(f"Crowd Analysis   : {times['crowd']:.2f}s")
    print(f"Worker Analysis  : {times['worker']:.2f}s")
    print(f"Qwen Generation  : {qwen_time:.2f}s")
    
    print("\n--- PERCENTAGES (Excl Qwen) ---")
    if total_time > 0:
        print(f"YOLO + Track   : {(times['yolo_track'] / total_time) * 100:.1f}%")
        print(f"Crime Analysis : {(times['crime'] / total_time) * 100:.1f}%")
        print(f"Video I/O      : {(times['video_io'] / total_time) * 100:.1f}%")
        
    print("\n--- PER PROCESSED FRAME ---")
    if times['processed_frames'] > 0:
        print(f"YOLO + Track   : {times['yolo_track'] / times['processed_frames']:.3f}s / frame")
        print(f"Crime (MC3-18) : {times['crime'] / times['processed_frames']:.3f}s / frame")

if __name__ == "__main__":
    asyncio.run(run_profile())
