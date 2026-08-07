"""
RailVision AI — Worker Alert Engine

Generates standardized Alert objects for PPE violations,
idle workers, and zone breaches.
"""

from __future__ import annotations

from datetime import datetime

from app.ai.base.base_module import Alert
from app.ai.worker.worker_models import WorkerState


class WorkerAlertEngine:
    """Generates standard alerts for the worker module."""

    MODULE_NAME = "worker_monitoring"

    @staticmethod
    def generate_ppe_alert(worker: WorkerState, missing: str) -> Alert:
        return Alert(
            severity="high",
            message=f"Worker #{worker.worker_id} detected without {missing}.",
            module=WorkerAlertEngine.MODULE_NAME,
            confidence=0.9,
            timestamp=datetime.now().isoformat(),
        )

    @staticmethod
    def generate_idle_alert(worker: WorkerState, idle_secs: float) -> Alert:
        return Alert(
            severity="medium",
            message=f"Worker #{worker.worker_id} idle for {idle_secs:.1f}s at {worker.current_zone}.",
            module=WorkerAlertEngine.MODULE_NAME,
            confidence=0.85,
            timestamp=datetime.now().isoformat(),
        )

    @staticmethod
    def generate_zone_alert(worker: WorkerState) -> Alert:
        return Alert(
            severity="medium",
            message=f"Worker #{worker.worker_id} outside designated work zone.",
            module=WorkerAlertEngine.MODULE_NAME,
            confidence=0.85,
            timestamp=datetime.now().isoformat(),
        )
