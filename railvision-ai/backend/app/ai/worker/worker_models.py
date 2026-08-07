"""
RailVision AI — Worker Monitoring Data Models

Structured data containers for worker tracking and analysis.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class WorkerState:
    """Accumulated state for a single tracked worker."""
    worker_id: int
    positions: list[tuple[int, int]] = field(default_factory=list)
    bboxes: list[list[int]] = field(default_factory=list)
    confidences: list[float] = field(default_factory=list)
    first_seen_frame: int = 0
    last_seen_frame: int = 0

    # PPE status (updated each frame)
    helmet: bool = False
    jacket: bool = False
    helmet_confidence: float = 0.0
    jacket_confidence: float = 0.0

    # Activity
    is_idle: bool = False
    idle_since_frame: int = -1
    current_zone: str = ""

    @property
    def last_position(self) -> tuple[int, int]:
        return self.positions[-1] if self.positions else (0, 0)

    @property
    def last_bbox(self) -> list[int]:
        return self.bboxes[-1] if self.bboxes else [0, 0, 0, 0]

    @property
    def avg_confidence(self) -> float:
        return sum(self.confidences) / len(self.confidences) if self.confidences else 0.0

    @property
    def ppe_compliance_pct(self) -> float:
        """Simple compliance: helmet=50%, jacket=50%."""
        score = 0.0
        if self.helmet:
            score += 50.0
        if self.jacket:
            score += 50.0
        return score

    def to_dict(self, fps: float = 30.0) -> dict[str, Any]:
        idle_seconds = 0.0
        if self.is_idle and self.idle_since_frame >= 0:
            idle_frames = self.last_seen_frame - self.idle_since_frame
            idle_seconds = idle_frames / fps if fps > 0 else 0
        return {
            "worker_id": self.worker_id,
            "helmet": self.helmet,
            "jacket": self.jacket,
            "compliance": self.ppe_compliance_pct,
            "working": not self.is_idle,
            "idle_time": round(idle_seconds, 1),
            "zone": self.current_zone,
            "confidence": round(self.avg_confidence, 4),
            "bbox": self.last_bbox,
        }


@dataclass
class AttendanceRecord:
    """Attendance record for a single worker."""
    worker_id: int
    entry_frame: int
    exit_frame: int = -1
    total_frames: int = 0

    def duration_seconds(self, fps: float) -> float:
        return self.total_frames / fps if fps > 0 else 0.0
