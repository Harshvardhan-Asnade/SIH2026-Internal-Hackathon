"""
RailVision AI — Crime Detection Data Models

Structured data containers for every crime-detection sub-service.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class TrackedPerson:
    """Accumulated tracking state for a single person across frames."""
    track_id: int
    positions: list[tuple[int, int]] = field(default_factory=list)  # (cx, cy)
    bboxes: list[list[int]] = field(default_factory=list)
    first_seen_frame: int = 0
    last_seen_frame: int = 0
    confidences: list[float] = field(default_factory=list)

    @property
    def last_position(self) -> tuple[int, int]:
        return self.positions[-1] if self.positions else (0, 0)

    @property
    def last_bbox(self) -> list[int]:
        return self.bboxes[-1] if self.bboxes else [0, 0, 0, 0]

    @property
    def avg_confidence(self) -> float:
        return sum(self.confidences) / len(self.confidences) if self.confidences else 0.0


@dataclass
class TrackedObject:
    """Accumulated tracking state for a detected baggage item."""
    object_id: int
    class_name: str
    bbox: list[int]
    center: tuple[int, int]
    first_seen_frame: int
    last_seen_frame: int = 0
    owner_id: int = -1             # Track ID of closest person, -1 = unassigned
    owner_distance: float = 0.0
    unattended_since_frame: int = -1
    confidence: float = 0.0


@dataclass
class CrimeEvent:
    """A single detected crime / suspicious event."""
    event_type: str        # "track_intrusion" | "restricted_area" | etc.
    person_id: int = -1
    object_id: int = -1
    frame: int = 0
    timestamp: str = ""
    confidence: float = 0.0
    risk: str = "MEDIUM"
    zone_name: str = ""
    duration_frames: int = 0
    duration_seconds: float = 0.0
    speed: float = 0.0
    direction: str = ""
    affected_persons: int = 0
    bbox: list[int] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        d: dict[str, Any] = {
            "event_type": self.event_type,
            "frame": self.frame,
            "timestamp": self.timestamp,
            "confidence": round(self.confidence, 4),
            "risk": self.risk,
        }
        if self.person_id >= 0:
            d["person_id"] = self.person_id
        if self.object_id >= 0:
            d["object_id"] = self.object_id
        if self.zone_name:
            d["zone_name"] = self.zone_name
        if self.duration_seconds > 0:
            d["duration_seconds"] = round(self.duration_seconds, 2)
        if self.speed > 0:
            d["speed"] = round(self.speed, 2)
        if self.direction:
            d["direction"] = self.direction
        if self.affected_persons > 0:
            d["affected_persons"] = self.affected_persons
        if self.bbox:
            d["bbox"] = self.bbox
        if self.metadata:
            d.update(self.metadata)
        return d
