"""
RailVision AI — Application Configuration

Centralises all environment-driven settings using pydantic-settings.
Values can be overridden via a `.env` file or actual environment variables.
"""

from pathlib import Path
from functools import lru_cache

from pydantic_settings import BaseSettings


# ── Resolve project root relative to this file ──────────────────────
_BASE_DIR = Path(__file__).resolve().parent.parent  # backend/


class Settings(BaseSettings):
    """Immutable, validated configuration for the entire application."""

    # ── Application metadata ──
    app_name: str = "RailVision AI"
    app_version: str = "0.1.0"
    debug: bool = False

    # ── File-system paths ──
    upload_dir: Path = _BASE_DIR / "uploads"
    output_dir: Path = _BASE_DIR / "outputs"
    weights_dir: Path = _BASE_DIR / "weights"

    # ── Model configuration (General / Person Detection) ──
    model_name: str = "yolo26n.pt"  # YOLO26 nano — fast, production-ready
    model_confidence: float = 0.25
    model_iou_threshold: float = 0.45
    model_device: str = "cpu"  # "cuda", "mps", or "cpu"

    # ── AI Module Feature Toggles ──
    enable_person_detection: bool = True
    enable_crowd_analysis: bool = True
    enable_crime_detection: bool = True
    enable_worker_monitoring: bool = True

    # ── Upload constraints ──
    max_upload_size_mb: int = 500
    allowed_extensions: list[str] = [".mp4", ".avi", ".mov", ".mkv"]
    
    # ── Inference Optimization ──
    frame_skip: int = 3  # Process every Nth frame

    # ── Video output settings ──
    output_codec: str = "mp4v"
    output_extension: str = ".mp4"

    # ── Server ──
    host: str = "0.0.0.0"
    port: int = 8000

    model_config = {
        "env_file": str(_BASE_DIR / ".env"),
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached, singleton Settings instance."""
    return Settings()
