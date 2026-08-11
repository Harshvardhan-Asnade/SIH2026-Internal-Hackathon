import logging
from typing import Any
import uuid
import datetime

from app.ai.base.base_module import BaseAIModule, FrameDetection, ModuleResult, Alert
from app.ai.fall.config import FallDetectionConfig
from app.ai.fall.state_machine import FallStateMachine, FallState

logger = logging.getLogger(__name__)

class FallDetectionModule(BaseAIModule):
    """
    Fall Detection Module
    
    Reads from `shared_context["person_detections"]` populated by PersonDetectionModule.
    Does not run its own YOLO inference.
    """

    def __init__(self, config: FallDetectionConfig):
        super().__init__(name="fall_detection", enabled=config.enabled)
        self._config = config
        self._machines: dict[int, FallStateMachine] = {}
        
        # Keep track of metrics for the JSON schema
        self._total_falls = 0
        self._active_candidates = 0

    def initialize(self) -> None:
        """No model weights to load since we reuse YOLO output."""
        if not self.is_enabled:
            return
        self._loaded = True
        logger.info("[fall_detection] Initialized. Awaiting tracking context.")

    def process_frame(
        self, frame: Any, frame_idx: int, shared_context: dict[str, Any]
    ) -> list[FrameDetection]:
        if not self._loaded or not self._enabled:
            return []

        # Read tracking context
        person_detections: list[FrameDetection] = shared_context.get("person_detections", [])
        
        # Gather active track IDs in this frame to prune lost tracks later
        active_track_ids = set()
        
        current_candidates = 0

        # We don't generate our own bounding boxes, but we can generate an Alert if a fall is confirmed.
        for det in person_detections:
            track_id = det.metadata.get("track_id")
            if track_id is None or track_id == -1:
                continue
                
            active_track_ids.add(track_id)

            if track_id not in self._machines:
                self._machines[track_id] = FallStateMachine(
                    track_id=track_id, 
                    confirm_frames=self._config.temporal_confirm_frames,
                    recovery_frames=self._config.recovery_frames
                )
            
            machine = self._machines[track_id]
            state = machine.update(det.bbox)
            
            if state == FallState.CANDIDATE:
                current_candidates += 1
                
            if machine.should_emit_alert():
                self._total_falls += 1
                
                alert = Alert(
                    id=f"fall_{uuid.uuid4().hex[:8]}",
                    timestamp=datetime.datetime.now(datetime.UTC).isoformat() + "Z",
                    module="fall_detection",
                    event_type="FALL_DETECTED",
                    severity="critical",
                    confidence=0.90, # Fall confirmed by temporal persistence
                    track_ids=[track_id],
                    frame=frame_idx,
                    status="ACTIVE"
                )
                self._results.alerts.append(alert)
                logger.warning(f"[fall_detection] Fall confirmed for track {track_id} at frame {frame_idx}")

        self._active_candidates = current_candidates

        # Prune old machines to prevent memory leaks
        # If a track_id hasn't been seen for a long time, we could delete it, but 
        # a simple garbage collection isn't strictly necessary for short clips. 
        # In production, we'd prune `self._machines.keys() - active_track_ids` after a timeout.

        return []

    def get_results(self) -> ModuleResult:
        # Build the structured summary needed by the frontend/knowledge base
        self._results.summary = {
            "total_falls": self._total_falls,
            "confirmed_falls": self._total_falls,
            "active_candidates": self._active_candidates,
            "status": "SAFE" if self._total_falls == 0 else "CRITICAL"
        }
        return self._results
