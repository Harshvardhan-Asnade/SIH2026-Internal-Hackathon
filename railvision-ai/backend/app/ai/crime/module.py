"""
RailVision AI — Crime Detection Module (Production)

Full crime-prevention pipeline for Indian Railways:

    Person Detections (shared_context) → Person Tracker →
    Track Intrusion | Restricted Area | Abandoned Baggage |
    Loitering | Running / Panic | Fight (placeholder) →
    Crime Risk Engine → Alert Engine → JSON Output

This module consumes person detections from ``shared_context``
and does NOT load its own YOLO model.

Architecture
------------
- ``TrackIntrusionService``  — Polygon-based danger zone detection.
- ``RestrictedAreaService``  — Multiple restricted zone monitoring.
- ``BagMonitoringService``   — Unattended baggage detection.
- ``LoiteringAnalyzer``      — Stationary-person detection.
- ``MotionAnalyzer``         — Running / panic detection.
- ``FightDetectionService``  — Proximity heuristic (placeholder).
- ``CrimeRiskEngine``       — Risk classification per event type.
- ``CrimeAlertEngine``      — Event → Alert conversion.
"""

from __future__ import annotations

import logging
from typing import Any

import cv2
import numpy as np

from app.ai.base.base_module import (
    BaseAIModule,
    FrameDetection,
    ModuleResult,
    Alert,
)
from app.ai.crime.config import CrimeDetectionConfig
from app.ai.crime.crime_models import TrackedPerson, CrimeEvent
from app.ai.crime.track_intrusion import TrackIntrusionService
from app.ai.crime.restricted_area import RestrictedAreaService
from app.ai.crime.bag_monitoring import BagMonitoringService
from app.ai.crime.loitering import LoiteringAnalyzer
from app.ai.crime.motion_analyzer import MotionAnalyzer
from app.ai.crime.fight_detection import FightDetectionService
from app.ai.crime.crime_alert_engine import CrimeAlertEngine

logger = logging.getLogger(__name__)

# ── Drawing constants ────────────────────────────────────────────────
_FONT = cv2.FONT_HERSHEY_SIMPLEX
_WHITE = (255, 255, 255)
_RED = (0, 0, 255)
_YELLOW = (0, 255, 255)
_ORANGE = (0, 165, 255)
_MAGENTA = (255, 0, 255)

_RISK_COLORS = {
    "CRITICAL": _RED,
    "HIGH": _ORANGE,
    "MEDIUM": _YELLOW,
    "LOW": (0, 255, 0),
}


class CrimeDetectionModule(BaseAIModule):
    """
    Production crime-detection module.

    Consumes person detections from ``shared_context["person_detection"]``
    and runs all crime-analysis sub-services.
    """

    def __init__(self, config: CrimeDetectionConfig) -> None:
        super().__init__(name="crime_detection", enabled=config.enabled)
        self._config = config

        # Sub-services
        self._track_intrusion = TrackIntrusionService(config)
        self._restricted_area = RestrictedAreaService(config)
        self._bag_monitoring = BagMonitoringService(config)
        self._loitering = LoiteringAnalyzer(config)
        self._motion = MotionAnalyzer(config)
        self._fight = FightDetectionService(config)

        # Person tracker state (accumulated across frames)
        self._persons: dict[int, TrackedPerson] = {}

        # All crime events collected during processing
        self._events: list[CrimeEvent] = []

        # Frame dimensions
        self._frame_h: int = 0
        self._frame_w: int = 0
        self._fps: float = 30.0

        # Latest frame alerts for OSD
        self._latest_alerts: list[str] = []
        
        # Temporal frame buffer for Action Recognition
        self._frame_buffer: list[np.ndarray] = []

    # ── Lifecycle ────────────────────────────────────────────────────
    def initialize(self) -> None:
        """No model to load — consumes shared detections."""
        if not self._enabled:
            return
        logger.info(
            "[crime_detection] Initializing (reuses person_detection via shared_context)"
        )
        self._loaded = True

    def reset(self) -> None:
        """Clear all state for a new video."""
        super().reset()
        self._persons.clear()
        self._events.clear()
        self._latest_alerts.clear()
        self._track_intrusion.reset()
        self._restricted_area.reset()
        self._bag_monitoring.reset()
        self._loitering.reset()
        self._motion.reset()
        self._fight.reset()
        self._frame_buffer.clear()

    # ── Frame-level processing ───────────────────────────────────────
    def process_frame(
        self, frame: np.ndarray, frame_idx: int, shared_context: dict[str, Any]
    ) -> list[FrameDetection]:
        if not self._enabled or not self._loaded:
            return []

        # Frame-skip
        if (
            self._config.frame_skip > 0
            and frame_idx % (self._config.frame_skip + 1) != 0
        ):
            return []

        # Init frame dims
        if self._frame_h == 0:
            self._frame_h, self._frame_w = frame.shape[:2]

        # ── Consume person detections ────────────────────────────────
        person_dets: list[FrameDetection] = shared_context.get("person_detection", [])
        self._latest_alerts.clear()
        
        # Update rolling frame buffer (only if Fight Detection is enabled to save memory/compute)
        if self._config.fight_detection_enabled:
            self._frame_buffer.append(frame.copy())
            if len(self._frame_buffer) > self._config.fight_sequence_length:
                self._frame_buffer.pop(0)

        # Update person tracker
        for det in person_dets:
            if det.class_name != "person":
                continue

            tid = det.metadata.get("track_id", -1)
            if tid < 0:
                continue

            cx = (det.bbox[0] + det.bbox[2]) // 2
            # Use foot point (bottom center) instead of true center for better ground-plane stability
            foot_y = det.bbox[3]

            if tid not in self._persons:
                self._persons[tid] = TrackedPerson(
                    track_id=tid,
                    first_seen_frame=frame_idx,
                )
            p = self._persons[tid]
            p.positions.append((cx, foot_y))
            p.bboxes.append(det.bbox)
            p.last_seen_frame = frame_idx
            p.confidences.append(det.confidence)

            # Limit history to prevent unbounded memory
            if len(p.positions) > 600:
                p.positions = p.positions[-400:]
                p.bboxes = p.bboxes[-400:]
                p.confidences = p.confidences[-400:]

        # ── Run sub-services ─────────────────────────────────────────
        frame_events: list[CrimeEvent] = []

        if self._config.enable_track_intrusion:
            frame_events.extend(
                self._track_intrusion.process(
                    self._persons, frame_idx,
                    self._frame_h, self._frame_w, self._fps,
                )
            )

        if self._config.enable_restricted_area:
            frame_events.extend(
                self._restricted_area.process(
                    self._persons, frame_idx,
                    self._frame_h, self._frame_w, self._fps,
                )
            )

        if self._config.enable_abandoned_bag:
            frame_events.extend(
                self._bag_monitoring.process(
                    person_dets, self._persons,
                    frame_idx, self._fps,
                )
            )

        if self._config.enable_loitering:
            frame_events.extend(
                self._loitering.process(
                    self._persons, frame_idx, self._fps,
                )
            )

        if self._config.enable_running_detection:
            frame_events.extend(
                self._motion.process(
                    self._persons, frame_idx, self._fps,
                )
            )

        if self._config.enable_fight_detection:
            frame_events.extend(
                self._fight.process(
                    self._persons, frame_idx, self._fps, self._frame_buffer
                )
            )

        # Convert to alerts and store
        for event in frame_events:
            self._events.append(event)
            alert = CrimeAlertEngine.event_to_alert(event)
            self._results.alerts.append(alert)
            self._latest_alerts.append(
                f"{event.risk}: {event.event_type.replace('_', ' ').title()}"
            )

        # Purge stale persons (not seen for 60 frames)
        stale = [
            pid for pid, p in self._persons.items()
            if frame_idx - p.last_seen_frame > 60
        ]
        for pid in stale:
            del self._persons[pid]

        return []  # Crime module doesn't emit FrameDetections

    # ── Video OSD annotations ────────────────────────────────────────
    def draw_annotations(
        self, frame: np.ndarray, detections: list[FrameDetection]
    ) -> np.ndarray:
        """
        Draw crime-specific overlays:
        - Danger zone polygons (red dashed outline)
        - Restricted area polygons (yellow outline)
        - Alert banners
        """
        h, w = frame.shape[:2]

        # ── Draw track-zone polygons ─────────────────────────────────
        if self._config.enable_track_intrusion:
            for zone_info in self._track_intrusion.get_zone_polygons(h, w):
                pts = np.array(zone_info["points"], np.int32).reshape((-1, 1, 2))
                # Semi-transparent red overlay
                overlay = frame.copy()
                cv2.fillPoly(overlay, [pts], (0, 0, 80))
                frame = cv2.addWeighted(overlay, 0.3, frame, 0.7, 0)
                cv2.polylines(frame, [pts], True, (0, 0, 255), 2)
                # Label
                label_pt = zone_info["points"][0]
                cv2.putText(
                    frame, f"DANGER: {zone_info['name']}",
                    (label_pt[0] + 5, label_pt[1] + 18),
                    _FONT, 0.4, _RED, 1, cv2.LINE_AA,
                )

        # ── Draw restricted-area polygons ────────────────────────────
        if self._config.enable_restricted_area:
            for zone in self._config.restricted_zones:
                pts_list = [(int(x * w), int(y * h)) for x, y in zone.polygon]
                pts = np.array(pts_list, np.int32).reshape((-1, 1, 2))
                overlay = frame.copy()
                cv2.fillPoly(overlay, [pts], (0, 60, 80))
                frame = cv2.addWeighted(overlay, 0.25, frame, 0.75, 0)
                cv2.polylines(frame, [pts], True, _YELLOW, 2)
                cv2.putText(
                    frame, f"RESTRICTED: {zone.name}",
                    (pts_list[0][0] + 5, pts_list[0][1] + 18),
                    _FONT, 0.4, _YELLOW, 1, cv2.LINE_AA,
                )

        # ── Alert banners (top-right) ────────────────────────────────
        if self._latest_alerts:
            y_start = 15
            for i, alert_text in enumerate(self._latest_alerts[-3:]):
                risk_level = alert_text.split(":")[0].strip()
                color = _RISK_COLORS.get(risk_level, _YELLOW)

                text_w = cv2.getTextSize(alert_text, _FONT, 0.5, 1)[0][0]
                x_pos = w - text_w - 20

                # Background
                overlay = frame.copy()
                cv2.rectangle(
                    overlay,
                    (x_pos - 8, y_start + i * 25 - 12),
                    (w - 5, y_start + i * 25 + 10),
                    (0, 0, 0), cv2.FILLED,
                )
                frame = cv2.addWeighted(overlay, 0.6, frame, 0.4, 0)

                cv2.putText(
                    frame, alert_text,
                    (x_pos, y_start + i * 25),
                    _FONT, 0.45, color, 1, cv2.LINE_AA,
                )

        return frame

    # ── Results ──────────────────────────────────────────────────────
    def get_results(self) -> ModuleResult:
        """Build the crime_detection summary for the JSON response."""
        
        events_by_type: dict[str, Any] = {}
        
        def _init_bucket(key: str, enabled: bool):
            if enabled:
                events_by_type[key] = []
            else:
                events_by_type[key] = "NOT_IMPLEMENTED"
                
        _init_bucket("track_intrusion", self._config.enable_track_intrusion)
        _init_bucket("restricted_area", self._config.enable_restricted_area)
        _init_bucket("abandoned_baggage", self._config.enable_abandoned_bag)
        _init_bucket("loitering", self._config.enable_loitering)
        _init_bucket("running_detection", self._config.enable_running_detection)
        _init_bucket("crowd_panic", self._config.enable_running_detection)
        _init_bucket("fight_detection", self._config.enable_fight_detection)

        for event in self._events:
            bucket = events_by_type.get(event.event_type)
            if isinstance(bucket, list):
                bucket.append(event.to_dict())

        self._results.summary = {
            "total_incidents": len(self._events),
            "critical_incidents": sum(
                1 for e in self._events if e.risk == "CRITICAL"
            ),
            "high_incidents": sum(
                1 for e in self._events if e.risk == "HIGH"
            ),
            "tracked_persons": len(self._persons),
            **events_by_type,
        }

        return self._results
