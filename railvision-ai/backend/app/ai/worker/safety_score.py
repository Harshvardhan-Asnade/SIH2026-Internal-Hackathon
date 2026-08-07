"""
RailVision AI — Safety Score Service

Computes the overall site safety compliance score from all active workers.
"""

from __future__ import annotations

from typing import Any

from app.ai.worker.config import WorkerMonitoringConfig
from app.ai.worker.worker_models import WorkerState


class SafetyScoreService:
    """Computes global safety statistics for all current workers."""

    def __init__(self, config: WorkerMonitoringConfig) -> None:
        self._cfg = config

    def evaluate(self, workers: dict[int, WorkerState]) -> dict[str, Any]:
        """Return compliance rates and overall score."""
        if not workers:
            return {
                "helmet_compliance": 100.0,
                "jacket_compliance": 100.0,
                "overall_safety": 100.0,
            }

        helmet_count = sum(1 for w in workers.values() if w.helmet)
        jacket_count = sum(1 for w in workers.values() if w.jacket)
        total = len(workers)

        helmet_comp = round((helmet_count / total) * 100, 1)
        jacket_comp = round((jacket_count / total) * 100, 1)
        
        # Overall score is the average of individual compliances
        overall = sum(w.ppe_compliance_pct for w in workers.values()) / total

        return {
            "helmet_compliance": helmet_comp,
            "jacket_compliance": jacket_comp,
            "overall_safety": round(overall, 1),
        }
