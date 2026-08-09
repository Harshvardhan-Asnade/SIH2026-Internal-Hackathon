# Crime Detection Module

**Status**: [IMPLEMENTED]
**File**: `app/ai/crime/module.py`

## 1. Trajectory Tracking
Crime detection relies on maintaining state across frames. We track the center `(x,y)` coordinate of bounding boxes.

## 2. Evaluated Behaviors
- **Loitering**: If a tracked coordinate stays within a 50-pixel radius for more than a configurable `loitering_frames` threshold, it triggers a "Suspicious Loitering" alert.
- **Intrusion**: (Planned enhancement) Checking coordinates against predefined polygon zones.
- **Running / Panic**: If the velocity of a tracked coordinate spikes drastically compared to historical averages, it triggers a "Running / Potential Panic" alert.

## 3. Limitations
Heavy crowd occlusion can break the tracking state, causing the module to lose the trajectory of a specific person.
