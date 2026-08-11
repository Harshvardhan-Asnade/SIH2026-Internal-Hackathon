from collections import deque
import logging

logger = logging.getLogger(__name__)

class FallState:
    NORMAL = "NORMAL"
    CANDIDATE = "FALL_CANDIDATE"
    CONFIRMED = "FALL_CONFIRMED"

class FallStateMachine:
    """
    Maintains temporal state for a single tracked person to detect falls.
    """
    def __init__(self, track_id: int, confirm_frames: int = 15, recovery_frames: int = 30):
        self.track_id = track_id
        self.state = FallState.NORMAL
        
        self.confirm_frames = confirm_frames
        self.recovery_frames = recovery_frames
        
        self.candidate_counter = 0
        self.recovery_counter = 0
        
        # Keep a small history of center_y to calculate velocity/drop
        self.y_history = deque(maxlen=10)
        
        # State tracking for deduplication
        self.alert_emitted = False

    def update(self, bbox: list[int]) -> str:
        """
        bbox: [x1, y1, x2, y2]
        Returns the current state.
        """
        x1, y1, x2, y2 = bbox
        width = x2 - x1
        height = y2 - y1
        
        if height == 0:
            return self.state
            
        aspect_ratio = width / float(height)
        center_y = y1 + (height / 2.0)
        
        self.y_history.append(center_y)
        
        # Check drop velocity if we have enough history
        is_rapid_drop = False
        if len(self.y_history) >= 5:
            # If the y-center increased significantly compared to 5 frames ago
            drop_dist = center_y - self.y_history[0]
            # normalized by person height to account for perspective
            if drop_dist > (height * 0.4): 
                is_rapid_drop = True

        # Heuristic for fall candidate
        # 1. Wide aspect ratio (person is horizontal) OR
        # 2. Rapid vertical drop detected
        is_candidate_frame = (aspect_ratio > 1.2) or is_rapid_drop

        if self.state == FallState.NORMAL:
            if is_candidate_frame:
                self.state = FallState.CANDIDATE
                self.candidate_counter = 1
                
        elif self.state == FallState.CANDIDATE:
            if is_candidate_frame:
                self.candidate_counter += 1
                if self.candidate_counter >= self.confirm_frames:
                    self.state = FallState.CONFIRMED
                    self.candidate_counter = 0
            else:
                # If they stand up quickly, reset
                self.candidate_counter -= 1
                if self.candidate_counter <= 0:
                    self.state = FallState.NORMAL
                    self.candidate_counter = 0
                    
        elif self.state == FallState.CONFIRMED:
            if not is_candidate_frame:
                self.recovery_counter += 1
                if self.recovery_counter >= self.recovery_frames:
                    self.state = FallState.NORMAL
                    self.recovery_counter = 0
                    self.alert_emitted = False # Reset deduplication lock
            else:
                self.recovery_counter = max(0, self.recovery_counter - 1)

        return self.state

    def should_emit_alert(self) -> bool:
        """Returns True only on the exact frame the fall is confirmed and not yet emitted."""
        if self.state == FallState.CONFIRMED and not self.alert_emitted:
            self.alert_emitted = True
            return True
        return False
