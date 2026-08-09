"""
RailVision AI — Alert Pydantic Models

Schemas used by the centralized Alert Engine and serialised into API
responses.  Every AI module can emit alerts through the base-class
``Alert`` dataclass; these schemas mirror that structure for Pydantic
validation and OpenAPI documentation.
"""

from __future__ import annotations

from enum import Enum
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class AlertSeverity(str, Enum):
    """Severity levels for alerts — ordered from most to least urgent."""

    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class AlertSchema(BaseModel):
    """A single alert raised by any AI module.
    
    Mirrors the canonical ``Alert`` dataclass in ``base_module.py``.
    The ``message`` field is optional — if omitted, it is auto-derived
    from ``event_type`` and ``severity`` at the serialization boundary.
    """

    id: str = Field(default="", description="Unique alert identifier")
    timestamp: str = Field(
        default_factory=lambda: datetime.now().isoformat(),
        description="ISO-8601 timestamp",
    )
    module: str = Field(..., description="Name of the AI module that raised this alert")
    event_type: str = Field(default="", description="Canonical event type (e.g. track_intrusion)")
    severity: str = Field(default="medium", description="Alert urgency level")
    confidence: float = Field(
        default=0.0, ge=0.0, le=1.0, description="Model confidence behind this alert"
    )
    track_ids: list[int] = Field(default_factory=list, description="ByteTrack IDs involved")
    frame: int = Field(default=0, description="Frame number of the trigger")
    status: str = Field(default="ACTIVE", description="Alert status")
    message: str = Field(default="", description="Optional human-readable description")
    camera: str = Field(default="", description="Camera identifier")
    location: str = Field(default="", description="Location or zone description")

    def model_post_init(self, __context: Any) -> None:
        """Auto-derive message from event_type if not provided."""
        if not self.message and self.event_type:
            readable = self.event_type.replace("_", " ").title()
            self.message = f"{readable} detected"

    model_config = {"populate_by_name": True}
