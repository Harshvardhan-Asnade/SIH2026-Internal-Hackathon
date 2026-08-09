# AI Inference Pipeline

The AI Pipeline is the beating heart of the backend, located in `video_service.py`.

## Pipeline Execution Order
1. **Video Initialization**: OpenCV opens the MP4 file and calculates FPS and resolution.
2. **Frame Skipping Loop**: The loop iterates. If `frame_idx % frame_skip != 0`, inference is skipped.
3. **Person Detection**: `PersonDetectionModule` executes `model.predict()`. It returns a list of bounding boxes and saves them to the global `shared_context["detections"]`.
4. **Crowd Analysis**: `CrowdAnalysisModule` reads `shared_context["detections"]`. It calculates the bounding box area against the total frame area to generate a Density Percentage. It updates `shared_context["crowd_density"]`.
5. **Crime Detection**: `CrimeDetectionModule` uses the bounding boxes to map trajectories. If a trajectory stays within the same pixel radius for > 3 seconds, a "Loitering" alert is dispatched.
6. **Worker Monitoring**: `WorkerMonitoringModule` scans for specific classes (or overlaps with known safe zones).
7. **HUD Rendering**: OpenCV functions draw the resulting bounding boxes, alerts, and heatmaps directly onto the current frame.
8. **Serialization**: The final frame is encoded back into an `.mp4` by `cv2.VideoWriter`.

## Performance Impact
By caching the YOLO detections in step 3, we avoid running 3 separate neural networks per frame. This allows the backend to process a 1080p video at near real-time speeds on an Apple M4 or NVIDIA GPU.
