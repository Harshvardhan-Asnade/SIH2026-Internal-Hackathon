from dataclasses import dataclass

@dataclass
class FallDetectionConfig:
    enabled: bool = True
    aspect_ratio_threshold: float = 1.0  # Width > Height usually means aspect ratio > 1.0 (width/height)
    vertical_drop_threshold: float = 0.2  # Fractional drop relative to frame height per second
    temporal_confirm_frames: int = 15     # Number of frames candidate must remain true before alerting
    recovery_frames: int = 30             # Number of frames of normal state before clearing a fall state
    
    # Optional: If we want to skip heavy analytics
    frame_skip: int = 0
