"""
RailVision AI — Crime Risk Engine

Classifies crime events into risk levels and assigns risk scores.
"""

from __future__ import annotations

from typing import Any


# Risk level mapping per event type
_EVENT_RISK_MAP: dict[str, str] = {
    "track_intrusion":   "CRITICAL",
    "restricted_area":   "HIGH",
    "abandoned_baggage": "HIGH",
    "loitering":         "MEDIUM",
    "running_detection": "HIGH",
    "crowd_panic":       "CRITICAL",
    "fight_detection":   "CRITICAL",
}

_RISK_SCORES: dict[str, float] = {
    "LOW": 0.25,
    "MEDIUM": 0.50,
    "HIGH": 0.75,
    "CRITICAL": 1.0,
}


class CrimeRiskEngine:
    """Stateless risk classifier for crime events."""

    @staticmethod
    def get_risk_level(event_type: str) -> str:
        """Return the default risk level for a given event type."""
        return _EVENT_RISK_MAP.get(event_type, "MEDIUM")

    @staticmethod
    def get_risk_score(risk_level: str) -> float:
        return _RISK_SCORES.get(risk_level, 0.5)

    @staticmethod
    def evaluate(event_type: str, confidence: float = 0.0) -> dict[str, Any]:
        risk = CrimeRiskEngine.get_risk_level(event_type)
        score = CrimeRiskEngine.get_risk_score(risk)
        # Boost score by detection confidence
        final_score = min(1.0, score * (0.5 + confidence * 0.5))
        return {
            "risk": risk,
            "risk_score": round(final_score, 3),
        }
