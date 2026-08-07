"""
RailVision AI — Heatmap Generator

Builds an accumulated heatmap across all processed frames.
Uses OpenCV's Gaussian blur + colour mapping to produce a
visual density overlay.
"""

from __future__ import annotations

import logging
from pathlib import Path

import cv2
import numpy as np

from app.ai.crowd.config import CrowdAnalysisConfig

logger = logging.getLogger(__name__)


class HeatmapGenerator:
    """
    Accumulates foot-point positions from person detections
    and produces a colourised heatmap image.
    """

    def __init__(self, config: CrowdAnalysisConfig) -> None:
        self._cfg = config
        self._accumulator: np.ndarray | None = None
        self._frame_h: int = 0
        self._frame_w: int = 0

    def reset(self, height: int, width: int) -> None:
        """Initialise / clear the heatmap accumulator."""
        self._frame_h = height
        self._frame_w = width
        self._accumulator = np.zeros((height, width), dtype=np.float64)

    def update(self, bboxes: list[list[int]]) -> None:
        """
        Add person positions from one frame.

        Uses the bottom-centre of each bounding box as the foot point
        (most representative of where the person is standing).
        """
        if self._accumulator is None:
            return

        for bbox in bboxes:
            x1, y1, x2, y2 = bbox
            # Foot-point = bottom-centre
            cx = (x1 + x2) // 2
            cy = y2  # bottom edge

            # Clamp to frame bounds
            cx = max(0, min(cx, self._frame_w - 1))
            cy = max(0, min(cy, self._frame_h - 1))

            # Add a Gaussian blob centred on the foot-point
            radius = max(20, (x2 - x1) // 3)
            self._add_gaussian(cx, cy, radius)

        # Apply per-frame decay so older positions fade
        self._accumulator *= self._cfg.heatmap_decay

    def _add_gaussian(self, cx: int, cy: int, radius: int) -> None:
        """Stamp a Gaussian kernel onto the accumulator."""
        assert self._accumulator is not None
        h, w = self._accumulator.shape

        # Bounding box for the kernel
        x0 = max(cx - radius, 0)
        y0 = max(cy - radius, 0)
        x1 = min(cx + radius, w)
        y1 = min(cy + radius, h)

        if x1 <= x0 or y1 <= y0:
            return

        # Build the Gaussian patch
        yy, xx = np.mgrid[y0:y1, x0:x1]
        gauss = np.exp(
            -((xx - cx) ** 2 + (yy - cy) ** 2) / (2 * (radius / 2.5) ** 2)
        )

        self._accumulator[y0:y1, x0:x1] += gauss

    def render(self) -> np.ndarray | None:
        """
        Render the accumulated heatmap as a BGR image.

        Returns None if no data has been accumulated.
        """
        if self._accumulator is None or self._accumulator.max() == 0:
            return None

        # Normalise to 0–255
        norm = self._accumulator.copy()
        norm = (norm / norm.max() * 255).astype(np.uint8)

        # Apply Gaussian blur for smoothness
        k = self._cfg.heatmap_blur_kernel
        if k % 2 == 0:
            k += 1
        norm = cv2.GaussianBlur(norm, (k, k), 0)

        # Apply JET colour map
        heatmap = cv2.applyColorMap(norm, cv2.COLORMAP_JET)

        return heatmap

    def overlay_on_frame(self, frame: np.ndarray) -> np.ndarray:
        """
        Overlay the current heatmap on a video frame.
        """
        heatmap = self.render()
        if heatmap is None:
            return frame

        heatmap_resized = cv2.resize(heatmap, (frame.shape[1], frame.shape[0]))
        alpha = self._cfg.heatmap_opacity
        return cv2.addWeighted(frame, 1.0 - alpha * 0.3, heatmap_resized, alpha, 0)

    def save(self, path: Path, background: np.ndarray | None = None) -> str | None:
        """
        Save the heatmap to disk.

        If ``background`` is provided, the heatmap is overlaid on it.
        Returns the filename or None.
        """
        heatmap = self.render()
        if heatmap is None:
            return None

        path.parent.mkdir(parents=True, exist_ok=True)

        if background is not None:
            bg = cv2.resize(background, (self._frame_w, self._frame_h))
            alpha = self._cfg.heatmap_opacity
            out = cv2.addWeighted(bg, 1.0 - alpha * 0.5, heatmap, alpha, 0)
        else:
            out = heatmap

        cv2.imwrite(str(path), out)
        logger.info("[heatmap] Saved → %s", path)
        return path.name
