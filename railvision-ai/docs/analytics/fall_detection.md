# Fall Detection Architecture

## Overview
The RailVision AI Fall Detection module leverages existing bounding-box tracking data emitted by ByteTrack to detect falls with zero-latency overhead. Instead of running a secondary heavy Pose Estimation model, it evaluates temporal state transitions based on geometry and movement.

## State Machine
The core engine is `FallStateMachine` which maintains states per `track_id`:
1. `NORMAL`
2. `FALL_CANDIDATE`
3. `FALL_CONFIRMED`

### Triggers
A person triggers candidate status if:
- **Aspect Ratio Shift:** The bounding box width exceeds its height (Aspect Ratio > 1.2), typical when a person lies flat.
- **Vertical Velocity:** The y-center coordinate drops by more than 40% of the bounding box height over a 5-frame rolling window.

### Deduplication
To prevent alert storms, once a fall reaches `FALL_CONFIRMED`, an `Alert` is emitted immediately. The state machine then locks deduplication until the bounding box returns to `NORMAL` state for `M` consecutive frames (Recovery window). 

## Performance
- **Time Complexity:** $O(1)$ per tracked person per frame.
- **Latency Impact:** 0ms overhead on GPU.
- **Data Dependency:** Relies purely on `shared_context["person_detections"]` from `PersonDetectionModule`.

## Frontend Fall Warning
The frontend implements an active real-time visual warning for confirmed fall events.

- **Trigger**: The overlay activates exclusively when receiving an event where `event_type = "FALL_DETECTED"` and `status = "ACTIVE"` (representing a confirmed fall). It ignores candidates.
- **Event Schema**: Handled via the unified `Alert` system.
- **3-Second Display**: Once triggered, a prominent overlay appears (`⚠️ FALL DETECTED`) and a secure React ref timeout holds it on screen for exactly 3000ms.
- **Deduplication**: Repeated identical events (matched by `event.id`) during the active warning window are suppressed to prevent timer resets and flicker. If a new physical fall event occurs while a warning is visible, the timer and data will correctly update.
- **Webcam Behavior**: The React component hooks directly into the WebSocket stream, ensuring the alert renders instantaneously upon frame receipt with zero polling latency.
- **Uploaded-Video Behavior**: Automatically triggered when polling updates the `processingResult`. The deduplication logic prevents repeated warnings for historical alerts while navigating tabs.
- **Accessibility**: Uses `role="alert"` and `aria-live="assertive"` so screen readers proactively announce the fall without requiring user interaction.
- **Timer Cleanup**: Safely leverages `useRef` and `useEffect` cleanup to guarantee no memory leaks or setState errors occur if the component unmounts while the 3-second timer is ticking.
