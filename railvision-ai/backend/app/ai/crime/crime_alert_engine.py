"""
RailVision AI — Crime Alert Engine

Converts CrimeEvent objects into standardised Alert objects
for the centralized alert system.
"""

from __future__ import annotations

from datetime import datetime

from app.ai.base.base_module import Alert
from app.ai.crime.crime_models import CrimeEvent


# Human-readable event labels
_EVENT_LABELS: dict[str, str] = {
    "track_intrusion":   "Track Intrusion",
    "restricted_area":   "Unauthorized Access",
    "abandoned_baggage": "Abandoned Baggage",
    "loitering":         "Suspicious Loitering",
    "running_detection": "Running Detected",
    "crowd_panic":       "Crowd Panic",
    "fight_detection":   "Possible Altercation",
}


class CrimeAlertEngine:
    """Converts ``CrimeEvent`` into ``Alert`` for the pipeline."""

    MODULE_NAME = "crime_detection"

    @staticmethod
    def event_to_alert(event: CrimeEvent) -> Alert:
        label = _EVENT_LABELS.get(event.event_type, event.event_type.replace("_", " ").title())

        parts = [label]
        if event.person_id >= 0:
            parts.append(f"Person #{event.person_id}")
        if event.zone_name:
            parts.append(f"Zone: {event.zone_name}")
        if event.duration_seconds > 0:
            parts.append(f"Duration: {event.duration_seconds:.1f}s")
        if event.affected_persons > 0:
            parts.append(f"{event.affected_persons} persons affected")

        message = " — ".join(parts)

        import uuid
        return Alert(
            id=f"alert_crime_{uuid.uuid4().hex[:8]}",
            timestamp=event.timestamp or datetime.now().isoformat(),
            module=CrimeAlertEngine.MODULE_NAME,
            event_type=event.event_type,
            severity=event.risk.lower(),
            confidence=event.confidence,
            track_ids=[event.person_id] if event.person_id >= 0 else [],
            frame=event.frame,
            status="ACTIVE",
        )
