"""
RailVision AI — File Utility Helpers

Reusable functions for file validation, unique naming, and directory
management used across the upload and processing endpoints.
"""

from __future__ import annotations

import uuid
import logging
from pathlib import Path

from app.config import get_settings

logger = logging.getLogger(__name__)


def validate_video_extension(filename: str) -> None:
    """
    Raise ``ValueError`` if the file extension is not in the allow-list.
    """
    settings = get_settings()
    ext = Path(filename).suffix.lower()
    if ext not in settings.allowed_extensions:
        allowed = ", ".join(settings.allowed_extensions)
        raise ValueError(
            f"Unsupported file extension '{ext}'. Allowed: {allowed}"
        )


def generate_video_id() -> str:
    """Return a short, filesystem-safe unique identifier."""
    return uuid.uuid4().hex[:12]


def get_upload_path(video_id: str, original_filename: str) -> Path:
    """
    Build the full upload path:  uploads/<video_id>_<sanitised_name>

    Creates the upload directory if it doesn't exist.
    """
    settings = get_settings()
    settings.upload_dir.mkdir(parents=True, exist_ok=True)

    safe_name = Path(original_filename).name  # strip any directory components
    dest = settings.upload_dir / f"{video_id}_{safe_name}"
    return dest


def get_output_path(video_id: str) -> Path:
    """
    Build the full output path:  outputs/<video_id>_processed.mp4

    Creates the output directory if it doesn't exist.
    """
    settings = get_settings()
    settings.output_dir.mkdir(parents=True, exist_ok=True)

    dest = settings.output_dir / f"{video_id}_processed{settings.output_extension}"
    return dest


def validate_file_size(size_bytes: int) -> None:
    """
    Raise ``ValueError`` if the file exceeds the configured max upload size.
    """
    settings = get_settings()
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    if size_bytes > max_bytes:
        raise ValueError(
            f"File size ({size_bytes / (1024*1024):.1f} MB) exceeds "
            f"maximum allowed size ({settings.max_upload_size_mb} MB)."
        )


def ensure_directories() -> None:
    """Create upload, output, and weights directories if they are missing."""
    settings = get_settings()
    for d in (settings.upload_dir, settings.output_dir, settings.weights_dir):
        d.mkdir(parents=True, exist_ok=True)
        logger.debug("Ensured directory: %s", d)
