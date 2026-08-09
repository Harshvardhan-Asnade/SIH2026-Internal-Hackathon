# YOLO (You Only Look Once) Algorithm

## 1. Implementation
RailVision uses the `ultralytics` Python package, specifically targeting the YOLOv11 nano/small architectures (`yolo11n.pt`).
- **Why Nano/Small?**: For hackathon constraints and edge-device compatibility, the smaller models offer >30 FPS inference without a dedicated GPU.

## 2. Tensor Processing
```python
results = self._model.predict(
    frame,
    conf=0.3,
    iou=0.45,
    device="mps" # or "cuda", "cpu"
)
```
- **conf (Confidence)**: We strip out any detection that the network is less than 30% sure about to reduce false positives.
- **iou (Intersection over Union)**: Set to 0.45 to run Non-Maximum Suppression (NMS). This prevents the model from drawing 5 overlapping boxes on the same person.
