# Weapon Detection (Phase 3.5)

**Status: PARTIALLY_IMPLEMENTED**

RailVision AI includes a security object detection module designed to identify potential threats without impacting the latency of the low-level camera pipeline.

## 1. Supported Capabilities

### IMPLEMENTED
- **Knife detection** (`class 43`)
- **Baseball bat detection** (`class 34`)
- **Temporal confirmation state machine** (Prevents 1-frame artifact false positives)
- **Person association** (Assigns detected weapons to the nearest person track)
- **Event deduplication** (Prevents alert spam via spatial and temporal cooldowns)
- **Dashboard & Alert Integration** (Real-time live view overlays)

### NOT IMPLEMENTED (Requires Model Upgrade)
- **Firearm detection** (Guns, pistols, rifles are NOT supported by the current COCO-based model).
- Generic weapon classification.

## 2. Architecture

The `WeaponDetectionModule` processes YOLO bounding boxes synchronously in $O(1)$ time by observing specific class IDs.

### 2.1 State Machine
Raw detections are stored as `WeaponCandidate`. A candidate must appear in `N` frames (`weapon_min_frames=15`) within a sliding confirmation window before transitioning to `WEAPON_CONFIRMED`.

### 2.2 Deduplication
Once a weapon is confirmed, an alert is dispatched. The system immediately sets a cooldown hash based on either the associated `track_id` or the `(x,y)` spatial grid cell. This ensures a person holding a knife only generates 1 alert, rather than 30 alerts per second.

### 2.3 Semantic Output
Alerts and the Knowledge Base explicitly use the object's class name (e.g., `KNIFE DETECTED`), instead of the generic `WEAPON DETECTED`, to avoid falsely implying firearm detection capabilities.

## 3. Performance
- **AI Latency Cost:** `< 2ms` per frame.
- **Webcam Framerate:** Unaffected (Maintains 30 FPS).
- **Compute Overhead:** Minimal (Reuses existing YOLO model output).

## 4. Future Upgrades
To transition this module to `IMPLEMENTED`, the core `yolo26n.pt` weights must be replaced or augmented with a dedicated dataset containing firearms, or a secondary lightweight classifier must be invoked solely when high-risk objects are identified. The temporal architecture built in Phase 3.5 supports this future drop-in replacement with zero logic changes.
