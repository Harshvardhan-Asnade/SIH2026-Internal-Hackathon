# System Architecture

## Overview
The RailVision AI system is designed with a strict decoupling of the presentation layer and the AI inference engine. This ensures the frontend remains at a fluid 60FPS while the backend GPU/CPU cranks through heavy tensor operations.

## Detailed Architecture Flow
```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant F as Next.js Frontend
    participant API as FastAPI
    participant Q as AI ThreadPool
    participant LLM as Qwen 3 (Local)
    
    U->>F: Upload CCTV Video
    F->>API: POST /upload (multipart/form-data)
    API-->>F: Returns video_id
    F->>API: POST /process {video_id}
    API->>Q: Dispatch video_service.process_video()
    
    rect rgb(200, 220, 250)
        Note over Q: Asynchronous Inference Loop
        Q->>Q: Frame Extraction (OpenCV)
        Q->>Q: YOLOv11 Detection (Shared Context)
        Q->>Q: Crowd, Crime, Worker Modules
        Q->>Q: Serialize to Knowledge Base JSON
    end
    
    Q-->>API: ProcessingResult (Detections)
    API->>LLM: ContextBuilder -> Qwen LLM
    LLM-->>API: Natural Language Summary
    API-->>F: JSON Payload + AI Report
    F-->>U: Render Dashboard
```

## AI Inference Pipeline (`video_service.py`)
1. **Frame Extraction**: OpenCV reads the raw `.mp4`.
2. **Frame Skipping Optimization**: [IMPLEMENTED] The `frame_skip` config (default 3) forces the pipeline to only run heavy YOLO inference on every 4th frame. Missing frames hold the previous bounding boxes, cutting compute by ~66% without visually sacrificing 30fps smoothness.
3. **Module Registry Execution**: The `ModuleRegistry` acts as a Singleton orchestrator. It passes the current frame to the `PersonDetectionModule` (YOLO) first. The resulting bounding boxes are saved to `shared_context["detections"]`.
4. **Shared Context Optimization**: Subsequent modules (`CrowdAnalysis`, `CrimeDetection`) do not run YOLO again. They read `shared_context["detections"]` directly, saving massive overhead.
