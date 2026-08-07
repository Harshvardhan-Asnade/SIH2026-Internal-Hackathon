"""
RailVision AI — Base AI Module (Abstract Base Class)

Every AI module in the engine MUST inherit from ``BaseAIModule`` and
implement all abstract methods.  This guarantees a uniform interface
for the ``ModuleRegistry`` orchestrator.

Lifecycle
---------
1.  ``__init__``        — Store config, declare internal state.
2.  ``initialize()``    — Load model weights / warm up.  Called once at startup.
3.  ``process_frame()`` — Run inference on a single BGR frame.
4.  ``process_video()`` — (Optional override) run the full video pipeline.
5.  ``get_results()``   — Return the accumulated ``ModuleResult``.
"""

from __future__ import annotations

import logging
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import cv2
import numpy as np

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════
# Data containers returned by every module
# ═══════════════════════════════════════════════════════════════════════

@dataclass
class FrameDetection:
    """A single detection within one frame."""
    frame: int
    class_name: str
    confidence: float
    bbox: list[int]              # [x1, y1, x2, y2]
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class Alert:
    """An alert raised by any module."""
    severity: str                # "critical" | "high" | "medium" | "low" | "info"
    message: str
    module: str
    confidence: float = 0.0
    timestamp: str = ""
    camera: str = ""
    location: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class ModuleResult:
    """Standardised output returned by ``get_results()``."""
    module_name: str
    enabled: bool = True
    detections: list[FrameDetection] = field(default_factory=list)
    alerts: list[Alert] = field(default_factory=list)
    summary: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        """Serialise for JSON response."""
        d: dict[str, Any] = {"enabled": self.enabled}
        if not self.enabled:
            return d
        d["detections"] = [
            {
                "frame": det.frame,
                "class": det.class_name,
                "confidence": det.confidence,
                "bbox": det.bbox,
                **(det.metadata or {}),
            }
            for det in self.detections
        ]
        d["alerts"] = [
            {
                "severity": a.severity,
                "message": a.message,
                "module": a.module,
                "confidence": a.confidence,
                "timestamp": a.timestamp,
                "camera": a.camera,
                "location": a.location,
                **(a.metadata or {}),
            }
            for a in self.alerts
        ]
        d.update(self.summary)
        return d


# ═══════════════════════════════════════════════════════════════════════
# Abstract base class
# ═══════════════════════════════════════════════════════════════════════

class BaseAIModule(ABC):
    """
    Abstract contract that every RailVision AI module must fulfil.

    Subclasses implement *at minimum*:
        - ``initialize``
        - ``process_frame``
        - ``get_results``

    The default ``process_video`` loops over frames, calling
    ``process_frame`` and optionally drawing annotations via
    ``draw_annotations``.  Override it if the module needs a
    custom video-level pipeline.
    """

    def __init__(self, name: str, enabled: bool = True) -> None:
        self.name = name
        self._enabled = enabled
        self._loaded = False
        self._results = ModuleResult(module_name=name, enabled=enabled)

    # ── Properties ───────────────────────────────────────────────────
    @property
    def is_enabled(self) -> bool:
        return self._enabled

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    # ── Abstract methods ─────────────────────────────────────────────
    @abstractmethod
    def initialize(self) -> None:
        """Load model weights and warm up.  Called once at startup."""
        ...

    @abstractmethod
    def process_frame(
        self, frame: np.ndarray, frame_idx: int, shared_context: dict[str, Any]
    ) -> list[FrameDetection]:
        """
        Run inference on a single BGR frame.

        Returns a list of ``FrameDetection`` objects for this frame.
        """
        ...

    @abstractmethod
    def get_results(self) -> ModuleResult:
        """Return accumulated results for the current video."""
        ...

    # ── Optional overrides ───────────────────────────────────────────
    def draw_annotations(
        self, frame: np.ndarray, detections: list[FrameDetection]
    ) -> np.ndarray:
        """
        Draw bounding boxes / overlays on *frame* in-place.

        The default implementation draws green boxes with labels.
        Override for custom drawing (heatmaps, skeleton, etc.).
        """
        for det in detections:
            x1, y1, x2, y2 = det.bbox
            color = (0, 255, 0)
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

            label = f"{det.class_name} {det.confidence:.2f}"
            (tw, th), baseline = cv2.getTextSize(
                label, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 1
            )
            cv2.rectangle(
                frame,
                (x1, y1 - th - baseline - 4),
                (x1 + tw + 4, y1),
                color,
                cv2.FILLED,
            )
            cv2.putText(
                frame,
                label,
                (x1 + 2, y1 - baseline - 2),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.55,
                (0, 0, 0),
                1,
                cv2.LINE_AA,
            )

        return frame

    def reset(self) -> None:
        """Clear accumulated results before processing a new video."""
        self._results = ModuleResult(
            module_name=self.name, enabled=self._enabled
        )

    def process_video(
        self,
        input_path: Path,
        output_path: Path | None = None,
        write_video: bool = True,
    ) -> ModuleResult:
        """
        Default video-level pipeline.

        Loops over every frame, calls ``process_frame`` and
        ``draw_annotations``, writes the annotated output, and
        returns ``get_results()``.

        Override this if the module needs a completely custom pipeline.
        """
        self.reset()

        cap = cv2.VideoCapture(str(input_path))
        if not cap.isOpened():
            raise RuntimeError(f"[{self.name}] Cannot open video: {input_path.name}")

        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        writer = None
        if write_video and output_path:
            fourcc = cv2.VideoWriter_fourcc(*"mp4v")
            writer = cv2.VideoWriter(str(output_path), fourcc, fps, (w, h))

        frame_idx = 0
        t0 = time.perf_counter()

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            dets = self.process_frame(frame, frame_idx)
            self._results.detections.extend(dets)

            if writer:
                frame = self.draw_annotations(frame, dets)
                writer.write(frame)

            frame_idx += 1
            if frame_idx % 200 == 0:
                logger.info("[%s] %d / %d frames", self.name, frame_idx, total)

        elapsed = time.perf_counter() - t0
        cap.release()
        if writer:
            writer.release()

        self._results.summary["frames_processed"] = frame_idx
        self._results.summary["processing_time"] = round(elapsed, 2)
        self._results.summary["fps"] = (
            round(frame_idx / elapsed, 2) if elapsed > 0 else 0.0
        )

        logger.info(
            "[%s] Done — %d frames in %.2fs, %d detections",
            self.name, frame_idx, elapsed, len(self._results.detections),
        )

        return self.get_results()
