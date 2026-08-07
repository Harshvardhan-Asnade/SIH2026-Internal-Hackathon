"""
RailVision AI — Video Processing Service

Delegates execution to the modular ``ModuleRegistry`` AI engine:

    Open video → extract frames → run all active AI modules → draw annotations → write output → return structured JSON
"""

from __future__ import annotations

import logging
from pathlib import Path

from app.models.schemas import ProcessingResult
from app.ai.base.module_registry import ModuleRegistry

logger = logging.getLogger(__name__)


def process_video(
    input_path: Path,
    output_path: Path,
    registry: ModuleRegistry,
    confidence: float | None = None,
) -> ProcessingResult:
    """
    Full inference pipeline for a single uploaded video using the AI ModuleRegistry.

    Parameters
    ----------
    input_path : Path
        Absolute path to the uploaded video file.
    output_path : Path
        Absolute path where the annotated output will be saved.
    registry : ModuleRegistry
        Singleton AI module registry.
    confidence : float | None
        Optional per-request confidence override.

    Returns
    -------
    ProcessingResult
        Pydantic model with modular results, detections, timing stats, and output filename.
    """
    try:
        raw_result = registry.process_video(
            input_path=input_path,
            output_path=output_path,
            confidence=confidence,
        )
        return ProcessingResult(**raw_result)
    except Exception as exc:
        logger.exception("Video processing failed: %s", exc)
        raise VideoProcessingError(str(exc)) from exc


class VideoProcessingError(Exception):
    """Raised when the video pipeline encounters an unrecoverable problem."""
