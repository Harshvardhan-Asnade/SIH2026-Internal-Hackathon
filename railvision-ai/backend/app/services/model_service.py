"""
RailVision AI — YOLO Model Service (Singleton)

Loads the YOLO model exactly once at application startup and exposes it
via FastAPI's dependency-injection system.  Every request handler that
needs the model receives the *same* pre-warmed instance.
"""

from __future__ import annotations

import logging
from pathlib import Path

from ultralytics import YOLO

from app.config import Settings, get_settings

logger = logging.getLogger(__name__)


class ModelService:
    """
    Singleton wrapper around the Ultralytics YOLO model.

    Lifecycle
    ---------
    1.  Instantiated once inside the FastAPI ``lifespan`` context manager.
    2.  Injected into route handlers via ``get_model_service()``.
    3.  Never reloaded — the same weights stay resident for the entire
        process lifetime.
    """

    _instance: ModelService | None = None

    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()
        self._model: YOLO | None = None

    # ── Public API ───────────────────────────────────────────────────
    def load(self) -> None:
        """Load model weights from disk (or download if missing)."""
        weights_path: Path = self._settings.weights_dir / self._settings.model_name

        if self._model is not None:
            logger.info("Model already loaded — skipping reload.")
            return

        # Ultralytics auto-downloads the weights when the file is missing
        logger.info("Loading YOLO model: %s (device=%s)", weights_path, self._settings.model_device)
        self._model = YOLO(str(weights_path))

        # Warm-up: a single dummy forward pass to initialise CUDA/MPS kernels
        logger.info("Running warm-up inference …")
        import numpy as np

        dummy = np.zeros((640, 640, 3), dtype=np.uint8)
        self._model.predict(dummy, verbose=False, device=self._settings.model_device)
        logger.info("Model ready on device '%s'.", self._settings.model_device)

    def predict(self, frame, confidence: float | None = None):
        """
        Run inference on a single BGR frame (numpy array).

        Returns the raw Ultralytics ``Results`` object so callers can
        extract boxes, masks, or keypoints as needed.
        """
        if self._model is None:
            raise RuntimeError("Model has not been loaded. Call load() first.")

        conf = confidence if confidence is not None else self._settings.model_confidence
        results = self._model.predict(
            frame,
            conf=conf,
            iou=self._settings.model_iou_threshold,
            verbose=False,
            device=self._settings.model_device,
        )
        return results

    @property
    def is_loaded(self) -> bool:
        return self._model is not None

    @property
    def device(self) -> str:
        return self._settings.model_device

    @property
    def class_names(self) -> dict[int, str]:
        """Mapping of class index → human-readable label."""
        if self._model is None:
            return {}
        return self._model.names  # type: ignore[return-value]

    # ── Singleton access ─────────────────────────────────────────────
    @classmethod
    def get_instance(cls) -> ModelService:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance


def get_model_service() -> ModelService:
    """FastAPI dependency that returns the singleton ModelService."""
    return ModelService.get_instance()
