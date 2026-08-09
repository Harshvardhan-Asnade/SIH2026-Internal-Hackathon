# ByteTrack Object Tracking Algorithm

**Status**: [PARTIALLY IMPLEMENTED]

## 1. Overview
Standard trackers (like SORT) discard low-confidence bounding boxes ($conf < 0.5$). However, in crowded railway stations, occlusion often drops a person's detection confidence temporarily to $0.2 - 0.4$. Discarding these boxes causes track fragmentations and identity switches.

ByteTrack retains low-score bounding boxes and pairs them with unconfirmed tracks using Kalman Filters.

## 2. Two-Stage Data Association
1. **First Association**: High-confidence detection boxes ($conf \ge 0.6$) are matched against existing tracks using **Intersection over Union (IoU)** or Re-ID feature distance.
2. **Second Association**: Unmatched tracks are then compared against *low-confidence* detection boxes ($0.1 \le conf < 0.6$). This recovers tracks temporarily obscured by pillars, trains, or other passengers.

## 3. Integration in Codebase
Ultralytics YOLO provides built-in ByteTrack support:
```python
results = model.track(source=frame, persist=True, tracker="bytetrack.yaml")
```
This preserves `track_id` values across frames for velocity and loitering calculations.
