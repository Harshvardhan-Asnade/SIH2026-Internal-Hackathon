"""
RailVision AI — Crowd Risk Engine

Evaluates crowd risk level based on the current person count
and configurable thresholds.
"""

from __future__ import annotations

from typing import Any

from app.ai.crowd.config import CrowdAnalysisConfig


# ── Density & Risk enums as strings ─────────────────────────────────
DENSITY_LOW = "LOW"
DENSITY_MEDIUM = "MEDIUM"
DENSITY_HIGH = "HIGH"
DENSITY_CRITICAL = "CRITICAL"

RISK_NORMAL = "NORMAL"
RISK_MEDIUM = "MEDIUM"
RISK_HIGH = "HIGH"
RISK_CRITICAL = "CRITICAL"


class CrowdRiskEngine:
    """
    Stateless risk evaluator.

    Call ``evaluate()`` with a person count to get density level,
    risk level, and a numeric risk score (0.0–1.0).
    """

    def __init__(self, config: CrowdAnalysisConfig) -> None:
        self._cfg = config

    def get_density_level(self, count: int) -> str:
        """Classify density from person count."""
        if count <= self._cfg.density_low_max:
            return DENSITY_LOW
        if count <= self._cfg.density_medium_max:
            return DENSITY_MEDIUM
        if count <= self._cfg.density_high_max:
            return DENSITY_HIGH
        return DENSITY_CRITICAL

    def get_risk_level(self, count: int) -> str:
        """Classify risk from person count."""
        if count <= self._cfg.risk_normal_max:
            return RISK_NORMAL
        if count <= self._cfg.risk_medium_max:
            return RISK_MEDIUM
        if count <= self._cfg.risk_high_max:
            return RISK_HIGH
        return RISK_CRITICAL

    def get_risk_score(self, count: int) -> float:
        """
        Continuous risk score 0.0–1.0.

        Uses the critical threshold as the normalisation ceiling.
        """
        ceiling = max(self._cfg.risk_high_max * 1.5, 1)
        return round(min(count / ceiling, 1.0), 3)

    def evaluate(self, count: int) -> dict[str, Any]:
        """Full risk evaluation for a single frame."""
        return {
            "density": self.get_density_level(count),
            "risk": self.get_risk_level(count),
            "risk_score": self.get_risk_score(count),
            "person_count": count,
        }
