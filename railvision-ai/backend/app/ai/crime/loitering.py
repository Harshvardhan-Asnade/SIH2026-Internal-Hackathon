"""
RailVision AI — Suspicious Loitering Detection Service

Tracks each person's movement over time. If a person stays
within a small radius for longer than a configurable threshold,
a Loitering Alert is generated.
"""

from __future__ import annotations

import logging
import math

from app.ai.crime.config import CrimeDetectionConfig
from app.ai.crime.crime_models import CrimeEvent, TrackedPerson
from app.ai.crime.crime_risk_engine import CrimeRiskEngine

logger = logging.getLogger(__name__)


class LoiteringAnalyzer:
    """
    Monitors person movement and detects loitering.

    For each tracked person, we compare the current position to
    the position recorded ``loitering_seconds`` ago.  If they are
    still within ``loitering_radius_px``, a loitering event is emitted.
    """

    def __init__(self, config: CrimeDetectionConfig) -> None:
        self._radius = config.loitering_radius_px
        self._threshold_s = config.loitering_seconds
        self._min_conf = config.loitering_min_confidence
        self._fired: set[int] = set()

    def reset(self) -> None:
        self._fired.clear()

    def process(
        self,
        persons: dict[int, TrackedPerson],
        frame_idx: int,
        fps: float,
    ) -> list[CrimeEvent]:
        events: list[CrimeEvent] = []

        threshold_frames = int(self._threshold_s * fps) if fps > 0 else 30

        for pid, person in persons.items():
            if pid in self._fired:
                continue
            if person.avg_confidence < self._min_conf:
                continue

            # Need enough history
            if len(person.positions) < threshold_frames:
                continue

            # Compare current position to the one N frames ago
            old_pos = person.positions[-threshold_frames]
            cur_pos = person.last_position

            dist = math.hypot(cur_pos[0] - old_pos[0], cur_pos[1] - old_pos[1])

            if dist <= self._radius:
                duration_s = threshold_frames / fps if fps > 0 else 0
                risk_eval = CrimeRiskEngine.evaluate("loitering", person.avg_confidence)

                events.append(
                    CrimeEvent(
                        event_type="loitering",
                        person_id=pid,
                        frame=frame_idx,
                        confidence=person.avg_confidence,
                        risk=risk_eval["risk"],
                        duration_seconds=duration_s,
                        bbox=person.last_bbox,
                    )
                )
                self._fired.add(pid)
                logger.warning(
                    "[crime] Loitering — person %d stationary for %.1fs",
                    pid, duration_s,
                )

        return events
