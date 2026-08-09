# AI Architecture

## Model Layers
1. **Perception**: YOLOv11 (`yolo11n.pt`) detects raw objects (people, items). [IMPLEMENTED]
2. **Logic**: Modules like `CrimeDetectionModule` track object persistence to determine behaviors (e.g. loitering). [IMPLEMENTED]
3. **Reasoning**: `Qwen2.5-0.5B-Instruct` reads the JSON logs to generate reports. [IMPLEMENTED]
