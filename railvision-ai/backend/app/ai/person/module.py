"""
RailVision AI — Person Detection Module

The **only** module that runs real YOLO inference.  It detects people
(and all other COCO classes) in uploaded videos.

This module migrates the logic that was previously in
``services/model_service.py`` into the new ``BaseAIModule`` interface.
"""

from __future__ import annotations

import logging
from typing import Any

import numpy as np
from ultralytics import YOLO

from app.ai.base.base_module import (
    BaseAIModule,
    FrameDetection,
    ModuleResult,
)
from app.ai.person.config import PersonDetectionConfig

logger = logging.getLogger(__name__)


class PersonDetectionModule(BaseAIModule):
    """
    YOLO-based person / object detection.

    This is the production module — it loads real weights and runs
    real inference on every frame.
    """

    def __init__(self, config: PersonDetectionConfig) -> None:
        super().__init__(name="person_detection", enabled=config.enabled)
        self._config = config
        self._model: YOLO | None = None
        self._class_names: dict[int, str] = {}

    # ── Lifecycle ────────────────────────────────────────────────────
    def initialize(self) -> None:
        """Load YOLO weights and run a warm-up inference."""
        if self._model is not None:
            logger.info("[person_detection] Model already loaded.")
            return

        model_path = self._config.full_model_path
        logger.info(
            "[person_detection] Loading YOLO: %s (device=%s)",
            model_path,
            self._config.device,
        )

        # Ultralytics auto-downloads weights when the file is missing
        self._model = YOLO(str(model_path))
        self._class_names = self._model.names  # type: ignore[assignment]

        # Warm-up pass to initialise CUDA/MPS kernels
        logger.info("[person_detection] Warm-up inference …")
        dummy = np.zeros((640, 640, 3), dtype=np.uint8)
        self._model.predict(
            dummy, verbose=False, device=self._config.device
        )

        self._loaded = True
        logger.info("[person_detection] Ready on device '%s'.", self._config.device)

    # ── Frame-level inference ────────────────────────────────────────
    def process_frame(
        self, frame: np.ndarray, frame_idx: int, shared_context: dict[str, Any]
    ) -> list[FrameDetection]:
        """Run YOLO on a single frame and return detections."""
        if self._model is None:
            return []

        # Optional frame-skip
        if self._config.frame_skip > 0 and frame_idx % (self._config.frame_skip + 1) != 0:
            return []

        results = self._model.predict(
            frame,
            conf=self._config.confidence,
            iou=self._config.iou_threshold,
            verbose=False,
            device=self._config.device,
        )

        detections: list[FrameDetection] = []

        for result in results:
            if result.boxes is None:
                continue
            for box in result.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                conf = float(box.conf[0])
                cls_id = int(box.cls[0])
                cls_name = self._class_names.get(cls_id, str(cls_id))

                detections.append(
                    FrameDetection(
                        frame=frame_idx,
                        class_name=cls_name,
                        confidence=round(conf, 4),
                        bbox=[x1, y1, x2, y2],
                    )
                )

        return detections

    # ── Results ──────────────────────────────────────────────────────
    def get_results(self) -> ModuleResult:
        """Return accumulated detections for the processed video."""
        self._results.summary["total_detections"] = len(self._results.detections)

        # Count per-class
        class_counts: dict[str, int] = {}
        for d in self._results.detections:
            class_counts[d.class_name] = class_counts.get(d.class_name, 0) + 1
        self._results.summary["class_counts"] = class_counts

        return self._results

    # ── Public helpers ───────────────────────────────────────────────
    @property
    def class_names(self) -> dict[int, str]:
        return self._class_names
