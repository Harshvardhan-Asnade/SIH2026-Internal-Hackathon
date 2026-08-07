"""
RailVision AI — Pydantic Schemas

Defines every request/response shape used by the API layer.
All validation, serialisation, and documentation derive from these models.
"""

from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field

from app.ai.alerts.models import AlertSchema


# ── Individual detection ─────────────────────────────────────────────
class Detection(BaseModel):
    """A single object detection within a video frame."""

    frame: int = Field(..., description="0-indexed frame number where the detection occurred")
    class_name: str = Field(..., alias="class", description="Detected object class label")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Model confidence score")
    bbox: list[int] = Field(
        ...,
        min_length=4,
        max_length=4,
        description="Bounding box as [x1, y1, x2, y2] in pixels",
    )

    model_config = {"populate_by_name": True}


# ── Full processing result ───────────────────────────────────────────
class ProcessingResult(BaseModel):
    """Aggregated inference result returned after video processing."""

    status: str = Field(default="success")
    video: str = Field(..., description="Filename of the processed output video")
    frames: int = Field(..., description="Total frames processed")
    processing_time: float = Field(..., description="Wall-clock time in seconds")
    fps: float = Field(..., description="Processing throughput (frames / second)")

    # Top-level detections (kept for backward compatibility with frontend)
    detections: list[Detection] = Field(default_factory=list)

    # Modular AI Engine outputs
    person_detection: dict[str, Any] = Field(default_factory=dict)
    crowd_analysis: dict[str, Any] = Field(default_factory=dict)
    crime_detection: dict[str, Any] = Field(default_factory=dict)
    worker_monitoring: dict[str, Any] = Field(default_factory=dict)

    # Centralized alerts
    alerts: list[AlertSchema] = Field(default_factory=list)

    model_config = {"populate_by_name": True}


# ── Upload response ─────────────────────────────────────────────────
class UploadResponse(BaseModel):
    """Returned immediately after a successful upload."""

    status: str = "success"
    message: str
    video_id: str = Field(..., description="Unique identifier for the uploaded video")
    filename: str


# ── Process request body ─────────────────────────────────────────────
class ProcessRequest(BaseModel):
    """Body for the /process endpoint."""

    video_id: str = Field(..., description="ID returned by /upload")
    confidence: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Override default confidence threshold for this run",
    )


# ── Health check ─────────────────────────────────────────────────────
class HealthResponse(BaseModel):
    status: str = "healthy"
    model_loaded: bool
    device: str
    version: str
    modules: dict[str, dict[str, Any]] = Field(
        default_factory=dict, description="Per-module loaded and enabled status"
    )


# ── Generic error ────────────────────────────────────────────────────
class ErrorResponse(BaseModel):
    status: str = "error"
    detail: str
