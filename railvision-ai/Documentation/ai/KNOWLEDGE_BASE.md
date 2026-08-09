# Enterprise Knowledge Base Generation

**Status**: [IMPLEMENTED]
**Service**: `app/services/knowledge_base.py`

## 1. Purpose
Raw neural network outputs (bounding box matrices, float confidences) are impossible for LLMs to interpret efficiently. The `KnowledgeBaseBuilder` converts raw frame detections into a structured semantic database of JSON files stored in `outputs/{video_id}/report/`.

---

## 2. Generated JSON Files Reference

| File | Structure & Purpose |
|---|---|
| **`summary.json`** | Contains high-level executive metrics (total duration, total people seen, peak crowd density, overall safety score). |
| **`crowd.json`** | Time-series data of density percentages, maximum occupants, and zone-wise crowd breakdowns. |
| **`crime.json`** | Detailed log of all crime/security events (loitering, running, intrusion) categorized by severity. |
| **`worker.json`** | Worker attendance, PPE compliance stats, and safety violation details. |
| **`alerts.json`** | Array of all discrete alerts emitted by the Alert Engine. |
| **`timeline.json`** | Chronological event stream combining alerts, crowd peaks, and key events indexed by frame/timestamp. |
| **`events.json`** | Higher-level semantic grouping of timeline events. |
| **`statistics.json`** | Key numerical aggregates for quick UI rendering. |
| **`recommendations.json`** | Rule-based action recommendations (e.g. "Deploy staff to Platform 2"). |
| **`objects.json`** | Comprehensive tracking history per object ID (first seen time, last seen time, class). |

---

## 3. Advantages
- **Zero VRAM Leak**: Allows LLM prompts to be constructed from lightweight disk JSONs rather than holding raw video frames in GPU memory.
- **Fast UI Loading**: Frontend dashboard fetches pre-computed `summary.json` instantly without re-running models.
