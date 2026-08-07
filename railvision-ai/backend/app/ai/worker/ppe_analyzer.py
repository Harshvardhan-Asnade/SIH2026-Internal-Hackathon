"""
RailVision AI — PPE Analyzer

Detects Personal Protective Equipment (helmet, reflective jacket)
by analysing colour and brightness patterns within person bounding boxes.

Current approach: colour-heuristic analysis (no custom PPE model needed).
Future: drop-in replacement with a dedicated PPE YOLO model.

Helmet detection:  Analyses top 25% of bbox (head region) for bright,
                   saturated safety colours (yellow, white, orange, red).
Jacket detection:  Analyses middle 40% of bbox (torso) for high-visibility
                   colours using HSV hue ranges.
"""

from __future__ import annotations

import logging

import cv2
import numpy as np

from app.ai.worker.config import WorkerMonitoringConfig

logger = logging.getLogger(__name__)


class PPEAnalyzer:
    """
    Colour-heuristic PPE detector.

    Upgrade path: Replace ``detect_helmet`` and ``detect_jacket``
    with a custom-trained YOLO model for PPE classes.
    """

    def __init__(self, config: WorkerMonitoringConfig) -> None:
        self._cfg = config

    def detect_helmet(
        self, frame: np.ndarray, bbox: list[int]
    ) -> tuple[bool, float]:
        """
        Analyse the head region for a safety helmet.

        Returns (has_helmet, confidence).
        """
        x1, y1, x2, y2 = bbox
        h = y2 - y1
        if h < 20 or x2 <= x1:
            return False, 0.0

        # Head region = top 25%
        head_y2 = y1 + max(int(h * 0.25), 10)
        head = frame[y1:head_y2, x1:x2]
        if head.size == 0:
            return False, 0.0

        # Convert to HSV
        hsv = cv2.cvtColor(head, cv2.COLOR_BGR2HSV)
        h_channel = hsv[:, :, 0]
        s_channel = hsv[:, :, 1]
        v_channel = hsv[:, :, 2]

        avg_brightness = float(np.mean(v_channel))
        avg_saturation = float(np.mean(s_channel))

        # Safety helmet colours: bright + some saturation
        # White helmets: high brightness, low saturation
        # Yellow/Orange/Red helmets: moderate-high brightness, high saturation
        is_white_helmet = (
            avg_brightness > self._cfg.helmet_brightness_threshold
            and avg_saturation < 50
        )

        # Coloured helmet: check for safety hue ranges
        safety_hues = (
            ((h_channel >= 0) & (h_channel <= 15))     # Red
            | ((h_channel >= 15) & (h_channel <= 35))   # Orange/Yellow
            | ((h_channel >= 35) & (h_channel <= 70))   # Yellow-green
        )
        safety_mask = safety_hues & (s_channel > self._cfg.helmet_saturation_threshold)
        safety_ratio = float(np.sum(safety_mask)) / max(safety_mask.size, 1)

        is_colored_helmet = safety_ratio > 0.15 and avg_brightness > 100

        has_helmet = is_white_helmet or is_colored_helmet

        # Confidence based on how strongly the heuristic fires
        if is_white_helmet:
            conf = min(0.95, 0.5 + (avg_brightness - 150) / 200)
        elif is_colored_helmet:
            conf = min(0.90, 0.4 + safety_ratio * 2)
        else:
            conf = max(0.1, 0.5 - (180 - avg_brightness) / 200)

        return has_helmet, round(max(0.0, min(1.0, conf)), 3)

    def detect_jacket(
        self, frame: np.ndarray, bbox: list[int]
    ) -> tuple[bool, float]:
        """
        Analyse the torso region for a reflective/high-vis jacket.

        Returns (has_jacket, confidence).
        """
        x1, y1, x2, y2 = bbox
        h = y2 - y1
        if h < 30 or x2 <= x1:
            return False, 0.0

        # Torso region = 25%–65% of bbox height
        torso_y1 = y1 + int(h * 0.25)
        torso_y2 = y1 + int(h * 0.65)
        torso = frame[torso_y1:torso_y2, x1:x2]
        if torso.size == 0:
            return False, 0.0

        hsv = cv2.cvtColor(torso, cv2.COLOR_BGR2HSV)
        h_channel = hsv[:, :, 0]
        s_channel = hsv[:, :, 1]
        v_channel = hsv[:, :, 2]

        # High-vis detection: orange/yellow/lime hue + high saturation + brightness
        highvis_mask = np.zeros_like(h_channel, dtype=bool)
        for hue_low, hue_high in self._cfg.jacket_highvis_hue_ranges:
            highvis_mask |= (
                (h_channel >= hue_low) & (h_channel <= hue_high)
                & (s_channel > 60) & (v_channel > 100)
            )

        highvis_ratio = float(np.sum(highvis_mask)) / max(highvis_mask.size, 1)
        has_jacket = highvis_ratio >= self._cfg.jacket_min_highvis_ratio

        conf = min(0.95, 0.3 + highvis_ratio * 5) if has_jacket else max(0.1, highvis_ratio * 3)

        return has_jacket, round(max(0.0, min(1.0, conf)), 3)
