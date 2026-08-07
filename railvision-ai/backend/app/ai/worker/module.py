"""
RailVision AI — Worker Monitoring Module (Production)

Full worker-monitoring pipeline for Indian Railways:

    Person Detections (shared_context) → Tracker (ByteTrack style) →
    PPE Analyzer → Attendance → Idle Detection → Work Zone → Safety Score

Consumes detections from ``shared_context`` and orchestrates sub-services.
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
)
from app.ai.worker.config import WorkerMonitoringConfig
from app.ai.worker.worker_models import WorkerState
from app.ai.worker.ppe_analyzer import PPEAnalyzer
from app.ai.worker.attendance import AttendanceService
from app.ai.worker.idle_detection import IdleDetectionService
from app.ai.worker.work_zone import WorkZoneManager
from app.ai.worker.safety_score import SafetyScoreService
from app.ai.worker.worker_alert_engine import WorkerAlertEngine

logger = logging.getLogger(__name__)

# ── Drawing constants ────────────────────────────────────────────────
_FONT = cv2.FONT_HERSHEY_SIMPLEX
_GREEN = (0, 255, 0)
_RED = (0, 0, 255)
_ORANGE = (0, 165, 255)
_CYAN = (255, 255, 0)


class WorkerMonitoringModule(BaseAIModule):
    """
    Production worker-monitoring module.
    """

    def __init__(self, config: WorkerMonitoringConfig) -> None:
        super().__init__(name="worker_monitoring", enabled=config.enabled)
        self._config = config

        self._ppe = PPEAnalyzer(config)
        self._attendance = AttendanceService()
        self._idle = IdleDetectionService(config)
        self._zone = WorkZoneManager(config)
        self._safety = SafetyScoreService(config)

        self._workers: dict[int, WorkerState] = {}
        self._frame_h = 0
        self._frame_w = 0
        self._fps = 30.0

        # State to track alerts so we don't spam
        self._ppe_violations_fired: set[str] = set()
        self._zone_violations_fired: set[int] = set()

    def initialize(self) -> None:
        if not self._enabled:
            return
        logger.info("[worker_monitoring] Initializing (reuses person_detection via shared_context)")
        self._loaded = True

    def reset(self) -> None:
        super().reset()
        self._workers.clear()
        self._attendance.reset()
        self._idle.reset()
        self._ppe_violations_fired.clear()
        self._zone_violations_fired.clear()

    def process_frame(
        self, frame: np.ndarray, frame_idx: int, shared_context: dict[str, Any]
    ) -> list[FrameDetection]:
        if not self._enabled or not self._loaded:
            return []

        if self._config.frame_skip > 0 and frame_idx % (self._config.frame_skip + 1) != 0:
            return []

        if self._frame_h == 0:
            self._frame_h, self._frame_w = frame.shape[:2]

        person_dets: list[FrameDetection] = shared_context.get("person_detection", [])

        # ── Update tracker state ─────────────────────────────────────
        active_ids = set()
        for det in person_dets:
            if det.class_name != "person":
                continue
            tid = det.metadata.get("track_id", -1)
            if tid < 0:
                continue

            cx = (det.bbox[0] + det.bbox[2]) // 2
            cy = (det.bbox[1] + det.bbox[3]) // 2
            active_ids.add(tid)

            if tid not in self._workers:
                self._workers[tid] = WorkerState(worker_id=tid, first_seen_frame=frame_idx)
            
            w = self._workers[tid]
            w.positions.append((cx, cy))
            w.bboxes.append(det.bbox)
            w.confidences.append(det.confidence)
            w.last_seen_frame = frame_idx

            # Keep history manageable
            if len(w.positions) > 600:
                w.positions = w.positions[-400:]
                w.bboxes = w.bboxes[-400:]
                w.confidences = w.confidences[-400:]

            # ── Run PPE Analysis ─────────────────────────────────────
            if self._config.enable_ppe_detection:
                h_ok, h_conf = self._ppe.detect_helmet(frame, det.bbox)
                j_ok, j_conf = self._ppe.detect_jacket(frame, det.bbox)
                # Simple temporal smoothing (only update if confidence is decent or status changed)
                w.helmet = h_ok
                w.helmet_confidence = h_conf
                w.jacket = j_ok
                w.jacket_confidence = j_conf

                # Alert generation
                if not h_ok:
                    k = f"{tid}:helmet"
                    if k not in self._ppe_violations_fired:
                        self._results.alerts.append(WorkerAlertEngine.generate_ppe_alert(w, "safety helmet"))
                        self._ppe_violations_fired.add(k)
                if not j_ok:
                    k = f"{tid}:jacket"
                    if k not in self._ppe_violations_fired:
                        self._results.alerts.append(WorkerAlertEngine.generate_ppe_alert(w, "reflective jacket"))
                        self._ppe_violations_fired.add(k)

        # ── Run Sub-services ─────────────────────────────────────────
        if self._config.enable_work_zone:
            self._zone.update(self._workers, self._frame_h, self._frame_w)
            for w in self._workers.values():
                if w.worker_id in active_ids and w.current_zone == "Outside Zone":
                    if w.worker_id not in self._zone_violations_fired:
                        self._results.alerts.append(WorkerAlertEngine.generate_zone_alert(w))
                        self._zone_violations_fired.add(w.worker_id)
                elif w.current_zone != "Outside Zone":
                    self._zone_violations_fired.discard(w.worker_id)

        if self._config.enable_idle_detection:
            newly_idle = self._idle.update(self._workers, frame_idx, self._fps)
            for wid in newly_idle:
                self._results.alerts.append(
                    WorkerAlertEngine.generate_idle_alert(self._workers[wid], self._config.idle_timeout_seconds)
                )

        if self._config.enable_attendance:
            self._attendance.update(self._workers, frame_idx)

        # Purge stale workers
        stale = [wid for wid, w in self._workers.items() if frame_idx - w.last_seen_frame > 60]
        for wid in stale:
            del self._workers[wid]

        return []

    def draw_annotations(self, frame: np.ndarray, detections: list[FrameDetection]) -> np.ndarray:
        """Draw worker stats on OSD."""
        if not self._enabled:
            return frame

        h, w = frame.shape[:2]

        # Draw zones
        if self._config.enable_work_zone:
            for z in self._zone.get_zone_polygons(h, w):
                pts = np.array(z["points"], np.int32).reshape((-1, 1, 2))
                cv2.polylines(frame, [pts], True, _CYAN, 2)
                cv2.putText(frame, z["name"], (z["points"][0][0], z["points"][0][1] - 10), _FONT, 0.5, _CYAN, 1)

        # Draw worker info
        for worker in self._workers.values():
            if not worker.bboxes:
                continue
            x1, y1, x2, y2 = worker.last_bbox
            
            # Box color depends on PPE
            color = _GREEN if worker.ppe_compliance_pct == 100 else (_ORANGE if worker.ppe_compliance_pct > 0 else _RED)
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

            # Labels
            labels = [f"W{worker.worker_id}"]
            if self._config.enable_ppe_detection:
                labels.append(f"H:{'OK' if worker.helmet else 'NO'} J:{'OK' if worker.jacket else 'NO'}")
            if worker.is_idle:
                labels.append("IDLE")

            for i, txt in enumerate(labels):
                y = y1 - 25 + (i * 15)
                cv2.putText(frame, txt, (x1, max(15, y)), _FONT, 0.45, color, 1, cv2.LINE_AA)

        return frame

    def get_results(self) -> ModuleResult:
        stats = self._safety.evaluate(self._workers)
        stats["total_workers"] = len(self._workers)

        workers_list = [w.to_dict(self._fps) for w in self._workers.values()]

        self._results.summary = {
            "statistics": stats,
            "workers": workers_list,
        }
        return self._results
