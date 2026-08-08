# Work Monitoring AI Module

## Overview

The Work Monitoring module automates the supervision of railway staff, contractors, and maintenance workers. It consumes person detections from the `PersonDetectionModule` via the shared context pipeline, tracking workers to evaluate safety compliance (PPE), idle time, and work zone adherence.

## Architecture

```
Person Detections (shared_context)
        │
        ▼
Worker Tracker (accumulate positions, IDs)
        │
        ├─────────────────────────────────────────┐
        ▼               ▼            ▼            ▼
   PPE Analyzer   Attendance   Idle Detection  Work Zone
        │               │            │            │
        └─────┬─────────┴────────────┴────────────┘
              ▼
    Safety Score Service → Worker Alert Engine → JSON Output
```

## Sub-Modules

### 1. Worker Tracking
Uses the `TrackedPerson` logic to assign a unique ID to every detected person, keeping history of positions to determine movement.

### 2. PPE Analyzer (`ppe_analyzer.py`)
**How it works**: Uses colour heuristics on bounding box segments.
- **Helmet**: Evaluates the top 25% (head region) for bright/saturated safety colours (yellow, orange, white, red) indicating a hardhat.
- **Jacket**: Evaluates the middle 40% (torso region) against high-visibility HSV hue ranges (lime, yellow, orange).

**Limitations & Upgrades**: Currently colour-heuristic. For production, this should be upgraded to a dedicated YOLO-based PPE detector that explicitly detects "hardhat", "no_hardhat", "vest", "no_vest" classes.

### 3. Attendance Service (`attendance.py`)
**How it works**: Tracks the first and last frames a `worker_id` is seen. Computes the total duration spent in the camera frame.

### 4. Idle Worker Detection (`idle_detection.py`)
**How it works**: Compares a worker's current position to their position `idle_timeout_seconds` ago. If the displacement is less than `idle_movement_threshold_px`, the worker is flagged as idle and an alert is generated.

### 5. Work Zone Manager (`work_zone.py`)
**How it works**: Uses configurable polygons representing valid maintenance or work areas. If a worker's foot-point (bottom centre of bounding box) steps outside these zones, a "Worker outside designated work zone" alert fires.

### 6. Safety Score Service (`safety_score.py`)
**How it works**: Aggregates the `ppe_compliance_pct` of all currently active workers to produce an overall safety percentage for the camera feed.

## JSON Output Structure

```json
{
  "work_monitoring": {
    "statistics": {
      "helmet_compliance": 92.0,
      "jacket_compliance": 88.0,
      "overall_safety": 90.0,
      "total_workers": 15
    },
    "workers": [
      {
        "worker_id": 7,
        "helmet": true,
        "jacket": false,
        "compliance": 50.0,
        "working": true,
        "idle_time": 0.0,
        "zone": "Maintenance Area",
        "confidence": 0.8912,
        "bbox": [150, 200, 250, 450]
      }
    ]
  },
  "alerts": [
    {
      "severity": "high",
      "message": "Worker #7 detected without reflective jacket.",
      "module": "worker_monitoring",
      "confidence": 0.9,
      "timestamp": "2026-08-07T14:30:00"
    }
  ]
}
```

## Future Improvements
- Replace colour heuristics with a custom YOLO26 PPE Model.
- Add facial recognition for actual staff attendance identity linking.
- DeepSort tracking to re-identify workers who temporarily leave the frame.
- Optical Flow integration for more accurate idle-vs-working classification (detecting hand movement even when feet are stationary).
