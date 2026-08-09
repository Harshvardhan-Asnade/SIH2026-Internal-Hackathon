"""
RailVision AI — Crowd Alert Service

Generates contextual crowd-management alerts based on real-time
person counts, density levels, and risk assessments.
"""

from __future__ import annotations

import logging
from datetime import datetime
import uuid

from app.ai.base.base_module import Alert
from app.ai.crowd.config import CrowdAnalysisConfig
from app.ai.crowd.risk_engine import (
    DENSITY_HIGH,
    DENSITY_CRITICAL,
    RISK_HIGH,
    RISK_CRITICAL,
)

logger = logging.getLogger(__name__)


class CrowdAlertService:
    """
    Evaluates crowd conditions and produces ``Alert`` objects
    for downstream consumption by the centralized Alert Engine.
    """

    MODULE_NAME = "crowd_analysis"

    def __init__(self, config: CrowdAnalysisConfig) -> None:
        self._cfg = config
        # Track which alert types have already fired (to avoid spam)
        self._fired: set[str] = set()

    def reset(self) -> None:
        self._fired.clear()

    def evaluate(
        self,
        count: int,
        density: str,
        risk: str,
        risk_score: float,
        frame_idx: int,
    ) -> list[Alert]:
        """
        Check all alert rules against the current frame state.
        Returns new alerts (each rule fires at most once per video).
        """
        alerts: list[Alert] = []
        now = datetime.now().isoformat()

        # ── High Density ─────────────────────────────────────────────
        if (
            count >= self._cfg.alert_high_density_count
            and density in (DENSITY_HIGH, DENSITY_CRITICAL)
            and "high_density" not in self._fired
        ):
            alerts.append(
                Alert(
                    id=f"alert_crowd_{uuid.uuid4().hex[:8]}",
                    timestamp=now,
                    module=self.MODULE_NAME,
                    event_type="high_density",
                    severity="high",
                    confidence=min(risk_score + 0.1, 1.0),
                    track_ids=[],
                    frame=frame_idx,
                    status="ACTIVE",
                )
            )
            self._fired.add("high_density")

        # ── Critical Density ─────────────────────────────────────────
        if (
            count >= self._cfg.alert_critical_density_count
            and density == DENSITY_CRITICAL
            and "critical_density" not in self._fired
        ):
            alerts.append(
                Alert(
                    id=f"alert_crowd_{uuid.uuid4().hex[:8]}",
                    timestamp=now,
                    module=self.MODULE_NAME,
                    event_type="critical_density",
                    severity="critical",
                    confidence=min(risk_score + 0.15, 1.0),
                    track_ids=[],
                    frame=frame_idx,
                    status="ACTIVE",
                )
            )
            self._fired.add("critical_density")

        # ── Platform Congestion ──────────────────────────────────────
        if (
            count >= self._cfg.alert_congestion_count
            and "congestion" not in self._fired
        ):
            alerts.append(
                Alert(
                    id=f"alert_crowd_{uuid.uuid4().hex[:8]}",
                    timestamp=now,
                    module=self.MODULE_NAME,
                    event_type="platform_congestion",
                    severity="high",
                    confidence=risk_score,
                    track_ids=[],
                    frame=frame_idx,
                    status="ACTIVE",
                )
            )
            self._fired.add("congestion")

        # ── Stampede Risk ────────────────────────────────────────────
        if (
            count >= self._cfg.alert_stampede_risk_count
            and risk == RISK_CRITICAL
            and "stampede_risk" not in self._fired
        ):
            alerts.append(
                Alert(
                    id=f"alert_crowd_{uuid.uuid4().hex[:8]}",
                    timestamp=now,
                    module=self.MODULE_NAME,
                    event_type="stampede_risk",
                    severity="critical",
                    confidence=min(risk_score + 0.2, 1.0),
                    track_ids=[],
                    frame=frame_idx,
                    status="ACTIVE",
                )
            )
            self._fired.add("stampede_risk")

        return alerts
