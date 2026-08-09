"""
RailVision AI — Person Detection Module Configuration

Dataclass-based config that can be constructed from the central
``Settings`` object or overridden per-request.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass
class PersonDetectionConfig:
    """Configuration specific to the person-detection module."""

    enabled: bool = True
    model_path: str = "yolo26n.pt"
    confidence: float = 0.25
    iou_threshold: float = 0.50
    imgsz: int = 1280
    device: str = "cpu"          # "cpu" | "cuda" | "mps"
    frame_skip: int = 0          # 0 = process every frame
    weights_dir: Path = Path("weights")

    @property
    def full_model_path(self) -> Path:
        return self.weights_dir / self.model_path
