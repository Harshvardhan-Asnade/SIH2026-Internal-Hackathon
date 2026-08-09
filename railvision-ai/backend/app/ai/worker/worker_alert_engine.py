"""
RailVision AI — Worker Alert Engine

Generates standardized Alert objects for PPE violations,
idle workers, and zone breaches.
"""

from __future__ import annotations

from datetime import datetime
import uuid

from app.ai.base.base_module import Alert
from app.ai.worker.worker_models import WorkerState


class WorkerAlertEngine:
    """Generates standard alerts for the worker module."""

    MODULE_NAME = "worker_monitoring"

    @staticmethod
    def generate_ppe_alert(worker: WorkerState, missing: str) -> Alert:
        return Alert(
            id=f"alert_ppe_{uuid.uuid4().hex[:8]}",
            timestamp=datetime.now().isoformat(),
            module=WorkerAlertEngine.MODULE_NAME,
            event_type="ppe_violation",
            severity="high",
            confidence=0.9,
            track_ids=[worker.worker_id],
            frame=worker.last_seen_frame,
            status="ACTIVE",
        )

    @staticmethod
    def generate_idle_alert(worker: WorkerState, idle_secs: float) -> Alert:
        return Alert(
            id=f"alert_idle_{uuid.uuid4().hex[:8]}",
            timestamp=datetime.now().isoformat(),
            module=WorkerAlertEngine.MODULE_NAME,
            event_type="idle_worker",
            severity="medium",
            confidence=0.85,
            track_ids=[worker.worker_id],
            frame=worker.last_seen_frame,
            status="ACTIVE",
        )

    @staticmethod
    def generate_zone_alert(worker: WorkerState) -> Alert:
        return Alert(
            id=f"alert_zone_{uuid.uuid4().hex[:8]}",
            timestamp=datetime.now().isoformat(),
            module=WorkerAlertEngine.MODULE_NAME,
            event_type="zone_breach",
            severity="medium",
            confidence=0.85,
            track_ids=[worker.worker_id],
            frame=worker.last_seen_frame,
            status="ACTIVE",
        )
