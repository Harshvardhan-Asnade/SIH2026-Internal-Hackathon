"""
RailVision AI — Centralized Alert Engine

Collects, normalises, and manages alerts produced by all AI modules.

The engine is **not** an AI module itself — it is a service that sits
*above* the module layer and aggregates alerts from every module's
``ModuleResult.alerts`` list.

Usage
-----
>>> engine = AlertEngine()
>>> engine.ingest(person_module.get_results())
>>> engine.ingest(crowd_module.get_results())
>>> all_alerts = engine.get_alerts()
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from app.ai.base.base_module import Alert, ModuleResult

logger = logging.getLogger(__name__)


class AlertEngine:
    """
    Centralized alert aggregation service.

    Responsibilities
    ----------------
    1.  Ingest ``ModuleResult`` objects from any module.
    2.  Normalise alert timestamps, deduplicate if desired.
    3.  Expose a flat list of all alerts for the API response.
    """

    def __init__(self) -> None:
        self._alerts: list[Alert] = []

    def reset(self) -> None:
        """Clear all alerts — call before processing a new video."""
        self._alerts.clear()

    def ingest(self, result: ModuleResult) -> None:
        """
        Accept a module result and store its alerts.

        Automatically fills in missing timestamps.
        """
        for alert in result.alerts:
            if not alert.timestamp:
                alert.timestamp = datetime.now().isoformat()
            self._alerts.append(alert)

        if result.alerts:
            logger.info(
                "Alert engine ingested %d alert(s) from '%s'",
                len(result.alerts),
                result.module_name,
            )

    def get_alerts(
        self,
        severity: str | None = None,
        module: str | None = None,
    ) -> list[Alert]:
        """
        Return alerts, optionally filtered by severity or module name.
        """
        alerts = self._alerts

        if severity:
            alerts = [a for a in alerts if a.severity == severity]
        if module:
            alerts = [a for a in alerts if a.module == module]

        return alerts

    def get_alerts_as_dicts(self, **filters: Any) -> list[dict[str, Any]]:
        """Serialised version suitable for JSON responses."""
        return [
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
            for a in self.get_alerts(**filters)
        ]

    @property
    def count(self) -> int:
        return len(self._alerts)
