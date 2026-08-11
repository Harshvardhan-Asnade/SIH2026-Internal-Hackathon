from pydantic import BaseModel, Field

class WeaponDetectionConfig(BaseModel):
    enabled: bool = True
    frame_skip: int = 1  # 0 means process every frame, 1 means every 2nd frame, etc.
    
    # Weapon mapping (COCO class ID -> Weapon Name)
    # yolo26n classes: 34 = baseball bat, 43 = knife, 76 = scissors
    supported_classes: dict[int, str] = Field(
        default_factory=lambda: {34: "BASEBALL BAT", 43: "KNIFE", 76: "BLADE"}
    )
    
    min_confidence: float = 0.35
    
    # Temporal Confirmation
    # How many times must it be detected in a short window to be CONFIRMED?
    weapon_min_frames: int = 15
    weapon_confirmation_window_frames: int = 45  # Must see it 15 times within 45 frames
    
    # Person Association
    max_association_distance_px: int = 200  # Distance from person bounding box
    
    # Deduplication
    weapon_cooldown_seconds: int = 300  # 5 minutes before re-alerting for same track/zone
