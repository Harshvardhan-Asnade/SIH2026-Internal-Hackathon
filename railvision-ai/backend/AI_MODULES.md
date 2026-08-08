# Modular AI Engine — Architecture & Developer Guide

This document explains the architecture of the **RailVision AI Engine**, how modules are structured, how the pipeline operates, and step-by-step instructions for adding new AI modules.

---

## 1. Architecture Overview

The AI engine uses a **Plugin / Registry Architecture**. Instead of hardcoding inference pipelines in API routes, every domain analysis feature (Person Detection, Crowd Analysis, Crime Detection, Worker Monitoring) is an independent module subclassing `BaseAIModule`.

```
backend/app/
├── ai/
│   ├── base/
│   │   ├── base_module.py       # BaseAIModule ABC & data structures (FrameDetection, Alert, ModuleResult)
│   │   └── module_registry.py   # Singleton orchestrator managing lifecycle and frame dispatch
│   ├── alerts/
│   │   ├── engine.py            # Centralized AlertEngine aggregator
│   │   └── models.py            # Alert schemas & severity enums
│   ├── person/                  # [WORKING] Person Detection (YOLO26)
│   │   ├── config.py
│   │   └── module.py
│   ├── crowd/                   # [PLACEHOLDER] Crowd Analysis
│   │   ├── config.py
│   │   └── module.py
│   ├── crime/                   # [PLACEHOLDER] Crime Detection
│   │   ├── config.py
│   │   └── module.py
│   └── worker/                  # [PLACEHOLDER] Worker Monitoring
│       ├── config.py
│       └── module.py
```

---

## 2. Pipeline Execution Flow

```
     POST /process (video_id)
                │
                ▼
      ModuleRegistry.process_video()
                │
     ┌──────────┴──────────┐
     │  OpenCV VideoCapture│
     └──────────┬──────────┘
                │
      For each frame in video:
     ┌──────────┴─────────────────────────────────────────┐
     │  1. person_detection.process_frame(frame, idx)     │
     │  2. crowd_analysis.process_frame(frame, idx)       │
     │  3. crime_detection.process_frame(frame, idx)      │
     │  4. worker_monitoring.process_frame(frame, idx)    │
     │  5. Draw annotations on frame in-place              │
     │  6. Write frame to Output Video Writer             │
     └──────────┬─────────────────────────────────────────┘
                │
      Collect results & alerts from all modules:
     ┌──────────┴─────────────────────────────────────────┐
     │  - Aggregate per-module ModuleResult               │
     │  - Centralize alerts in AlertEngine                │
     │  - Maintain top-level 'detections' array           │
     └──────────┬─────────────────────────────────────────┘
                │
                ▼
     Return unified JSON API Response
```

---

## 3. How to Add a New AI Module

To add a new AI analysis module (e.g. `track_monitoring` or `fire_detection`):

### Step 1: Create Module Directory
Create `backend/app/ai/<new_module>/` with `__init__.py`, `config.py`, and `module.py`.

### Step 2: Create Module Configuration (`config.py`)
```python
from dataclasses import dataclass
from pathlib import Path

@dataclass
class FireDetectionConfig:
    enabled: bool = True
    model_path: str = "fire_v1.pt"
    confidence: float = 0.50
    device: str = "cpu"
    weights_dir: Path = Path("weights")
```

### Step 3: Implement Module (`module.py`)
Subclass `BaseAIModule`:

```python
import numpy as np
from app.ai.base.base_module import BaseAIModule, FrameDetection, ModuleResult

class FireDetectionModule(BaseAIModule):
    def __init__(self, config: FireDetectionConfig):
        super().__init__(name="fire_detection", enabled=config.enabled)
        self._config = config

    def initialize(self) -> None:
        # Load your model weights here
        self._loaded = True

    def process_frame(self, frame: np.ndarray, frame_idx: int) -> list[FrameDetection]:
        # Run model inference on frame
        return []

    def get_results(self) -> ModuleResult:
        return self._results
```

### Step 4: Register in `main.py` Lifespan
```python
from app.ai.fire.config import FireDetectionConfig
from app.ai.fire.module import FireDetectionModule

fire_cfg = FireDetectionConfig(enabled=True)
registry.register(FireDetectionModule(fire_cfg))
```

---

## 4. Response JSON Format

The API response remains 100% backward-compatible with the existing testing interface while providing modular blocks:

```json
{
  "status": "success",
  "video": "abc123_processed.mp4",
  "frames": 300,
  "processing_time": 5.2,
  "fps": 57.6,
  "detections": [
    {
      "frame": 0,
      "class": "person",
      "confidence": 0.92,
      "bbox": [100, 200, 300, 400]
    }
  ],
  "person_detection": {
    "enabled": true,
    "detections": [ ... ],
    "summary": { "total_detections": 1, "class_counts": { "person": 1 } }
  },
  "crowd_analysis": {
    "enabled": false
  },
  "crime_detection": {
    "enabled": false
  },
  "worker_monitoring": {
    "enabled": false
  },
  "alerts": [
    {
      "severity": "high",
      "message": "Track Intrusion Detected",
      "module": "crime_detection",
      "confidence": 0.88,
      "timestamp": "2026-08-07T11:00:00Z",
      "camera": "CAM_01",
      "location": "Platform 2"
    }
  ]
}
```

---

## 5. Centralized Alert Engine

Any module can emit alerts by adding `Alert` instances to its `self._results.alerts` list during `process_frame`.

The `AlertEngine` automatically ingests these alerts, normalises ISO timestamps, and serialises them into the top-level `alerts` array in the response.
