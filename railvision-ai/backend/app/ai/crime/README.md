# Crime Prevention AI Module

## Overview

The Crime Prevention module is part of RailVision AI's modular AI engine, designed specifically for Indian Railways security surveillance. It consumes person detections from the `PersonDetectionModule` via the shared context pipeline and applies behavioral analysis algorithms to detect suspicious activities.

## Architecture

```
Person Detections (shared_context)
        │
        ▼
  Person Tracker (accumulate positions, IDs)
        │
        ├─────────────────────────────────────────────┐
        ▼                 ▼                 ▼         ▼
Track Intrusion   Restricted Area   Bag Monitoring   Loitering
        │                 │                 │         │
        ├─────────────────┤─────────────────┤─────────┤
        ▼                 ▼                                
Motion Analyzer   Fight Detection (placeholder)
        │                 │
        └─────┬───────────┘
              ▼
      Crime Risk Engine → Crime Alert Engine → JSON Output
```

## Detection Modules

### 1. Track Intrusion Detection (`track_intrusion.py`)
**How it works**: Defines polygon-based danger zones (normalised 0.0–1.0 coordinates). For each tracked person, the foot-point (bottom-centre of bounding box) is tested against each zone polygon using ray-casting. An alert fires after the person has been inside the zone for N consecutive frames.

**Current limitations**: Default zones are proportional rectangles. For production deployment, zones should be calibrated to the actual camera perspective.

### 2. Restricted Area Detection (`restricted_area.py`)
**How it works**: Same polygon approach as track intrusion, but for multiple named restricted zones (e.g., "Control Room", "Staff Only").

**Current limitations**: No integration with access control systems. All persons are treated as unauthorized.

### 3. Unattended Baggage Detection (`bag_monitoring.py`)
**How it works**: Detects COCO baggage classes (suitcase, backpack, handbag) from person_detection detections. Each bag is associated with the nearest tracked person. If the owner moves beyond a configurable pixel distance for longer than a timeout, an "Abandoned Baggage" alert is generated.

**Current limitations**: Relies on YOLO detecting baggage classes in the same pass as persons. Position matching is pixel-based (no depth estimation). Coarse grid-based bag identity tracking.

### 4. Suspicious Loitering (`loitering.py`)
**How it works**: For each tracked person, compares the current position to the position N seconds ago. If displacement is within a configurable pixel radius, the person is flagged as loitering.

**Current limitations**: Pixel-based radius doesn't account for camera perspective (persons farther from camera appear to move less). No zone-specific loitering thresholds.

### 5. Running / Panic Detection (`motion_analyzer.py`)
**How it works**: Calculates per-person velocity from consecutive tracked positions. Individuals exceeding the speed threshold trigger "Running Detected" events. If multiple runners simultaneously move in the same compass direction (8-bucket), a "Crowd Panic" alert is generated.

**Current limitations**: Speed is measured in pixels/frame, which varies with resolution and camera angle. No optical flow confirmation.

### 6. Fight Detection (`fight_detection.py`)
**How it works**: **Architecture placeholder.** Current implementation uses simple proximity heuristics (two persons in very close proximity for multiple frames). This is NOT reliable violence detection.

**Future AI improvements**:
- VideoMAE temporal transformer for action recognition
- SlowFast dual-pathway architecture for spatiotemporal features  
- Custom violence classification CNN trained on surveillance footage
- Pose estimation + gesture analysis using MediaPipe/OpenPose

## Risk Classification

| Event Type | Default Risk Level |
|---|---|
| Track Intrusion | CRITICAL |
| Restricted Area | HIGH |
| Abandoned Baggage | HIGH |
| Loitering | MEDIUM |
| Running Detection | HIGH |
| Crowd Panic | CRITICAL |
| Fight Detection | CRITICAL |

## Configuration

All thresholds are configurable via `config.py`:

```python
# Track zones (normalised polygons)
track_zones: list[ZoneDefinition]

# Restricted area zones
restricted_zones: list[ZoneDefinition]

# Baggage
baggage_unattended_seconds: float = 10.0
baggage_owner_distance_px: int = 150

# Loitering
loitering_seconds: float = 15.0
loitering_radius_px: int = 80

# Running / Panic
running_speed_threshold_px: float = 25.0
running_min_persons: int = 3
panic_directional_threshold: float = 0.7
```

## JSON Output

```json
{
  "crime_detection": {
    "total_incidents": 3,
    "critical_incidents": 1,
    "high_incidents": 2,
    "tracked_persons": 15,
    "track_intrusion": [
      {
        "event_type": "track_intrusion",
        "person_id": 15,
        "frame": 240,
        "confidence": 0.94,
        "risk": "CRITICAL",
        "zone_name": "Railway Track",
        "duration_seconds": 2.5
      }
    ],
    "restricted_area": [],
    "abandoned_baggage": [],
    "loitering": [],
    "running_detection": [],
    "crowd_panic": [],
    "fight_detection": []
  },
  "alerts": [
    {
      "severity": "critical",
      "message": "Track Intrusion — Person #15 — Zone: Railway Track — Duration: 2.5s",
      "module": "crime_detection",
      "confidence": 0.94,
      "timestamp": "2026-08-07T14:30:00"
    }
  ]
}
```

## Video Output Overlays

The processed video includes:
- **Red polygon** overlay on track danger zones with "DANGER" label
- **Yellow polygon** overlay on restricted areas with "RESTRICTED" label
- **Alert banners** in the top-right corner showing risk level and event type
- All overlays from other modules (person detection boxes, crowd count, etc.)
