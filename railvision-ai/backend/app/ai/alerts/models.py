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

from pydantic import BaseModel, Field


class AlertSeverity(str, Enum):
    """Severity levels for alerts — ordered from most to least urgent."""

    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class AlertSchema(BaseModel):
    """A single alert raised by any AI module."""

    severity: AlertSeverity = Field(..., description="Alert urgency level")
    message: str = Field(..., description="Human-readable alert description")
    module: str = Field(..., description="Name of the AI module that raised this alert")
    confidence: float = Field(
        default=0.0, ge=0.0, le=1.0, description="Model confidence behind this alert"
    )
    timestamp: str = Field(
        default_factory=lambda: datetime.now().isoformat(),
        description="ISO-8601 timestamp",
    )
    camera: str = Field(default="", description="Camera identifier")
    location: str = Field(default="", description="Location or zone description")

    model_config = {"populate_by_name": True}
