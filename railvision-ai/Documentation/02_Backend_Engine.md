# Backend AI Engine Architecture

The Python backend is built on **FastAPI**, but its core is a custom, highly scalable computer vision inference engine.

## 1. The `ModuleRegistry`
The `ModuleRegistry` is a singleton pattern orchestrator. Instead of a monolithic processing script, all AI capabilities are modularized. The registry initializes, manages, and executes these modules.

Modules are registered during the FastAPI `lifespan` event (in `main.py`).

### Active Modules:
1. **PersonDetectionModule**: Runs the base object detection (YOLO) and updates bounding boxes.
2. **CrowdAnalysisModule**: Uses person bounding boxes to generate density heatmaps and trigger crowd panic alerts.
3. **CrimeDetectionModule**: Uses tracks to identify running, loitering, intrusions, and fighting.
4. **WorkerMonitoringModule**: Identifies railway staff and tracks PPE (Personal Protective Equipment) compliance.

---

## 2. The Inference Loop
Located in `services/video_service.py`, the inference loop is responsible for reading raw video frames via OpenCV and executing the AI modules.

### Shared Context Optimization
To prevent running the same heavy AI model multiple times, the inference loop uses a `shared_context` dictionary. 
- The `PersonDetectionModule` runs first and saves its YOLO bounding box outputs to the `shared_context`.
- Subsequent modules (like Crowd and Crime) read from the `shared_context` instead of running their own object detectors. This ensures YOLO is only run **once per frame**.

### Frame Skipping
Processing every single frame of a 30fps video through multiple AI models is computationally prohibitive. 
The inference loop utilizes a configurable `frame_skip` parameter (default `3`).
- Inference (YOLO + Modules) is run only every 3rd frame.
- The results (bounding boxes, alerts) are held and painted onto the intermediate frames.
- This cuts processing time by 66% while visually outputting a smooth 30fps video.

---

## 3. Asynchronous Compute
FastAPI is an async framework, but OpenCV and PyTorch block the event loop. To prevent the API server from freezing while processing a video:
- The inference loop is dispatched via `asyncio.to_thread()`.
- This pushes the heavy compute to a background OS thread, keeping the API responsive for concurrent requests (like checking `/health` or querying the LLM).
