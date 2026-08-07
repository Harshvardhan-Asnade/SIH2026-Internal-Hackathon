"""
RailVision AI — Motion Analyzer (Running / Panic Detection)

Analyses per-person velocity from tracked positions.
If multiple persons simultaneously exceed the speed threshold
and move in a common direction, a Crowd Panic alert is emitted.
If individual persons run, a Running Detection event is emitted.
"""

from __future__ import annotations

import logging
import math
from collections import Counter

from app.ai.crime.config import CrimeDetectionConfig
from app.ai.crime.crime_models import CrimeEvent, TrackedPerson
from app.ai.crime.crime_risk_engine import CrimeRiskEngine

logger = logging.getLogger(__name__)

# Compass buckets (8-direction)
_DIRECTIONS = [
    "N", "NE", "E", "SE", "S", "SW", "W", "NW",
]


def _get_direction(dx: float, dy: float) -> str:
    """Convert displacement to 8-direction compass label."""
    angle = math.degrees(math.atan2(-dy, dx)) % 360  # screen coords (y down)
    idx = int((angle + 22.5) / 45) % 8
    return _DIRECTIONS[idx]


class MotionAnalyzer:
    """
    Detects running individuals and crowd-panic events.
    """

    def __init__(self, config: CrimeDetectionConfig) -> None:
        self._speed_threshold = config.running_speed_threshold_px
        self._min_runners = config.running_min_persons
        self._panic_dir_threshold = config.panic_directional_threshold
        self._fired_panic = False

    def reset(self) -> None:
        self._fired_panic = False

    def process(
        self,
        persons: dict[int, TrackedPerson],
        frame_idx: int,
        fps: float,
    ) -> list[CrimeEvent]:
        events: list[CrimeEvent] = []

        runners: list[tuple[int, float, str]] = []  # (pid, speed, direction)

        for pid, person in persons.items():
            if len(person.positions) < 3:
                continue

            # Average velocity over last 3 frames
            speeds: list[float] = []
            dirs: list[str] = []
            for i in range(-1, -min(4, len(person.positions)), -1):
                p1 = person.positions[i - 1]
                p2 = person.positions[i]
                dx = p2[0] - p1[0]
                dy = p2[1] - p1[1]
                speed = math.hypot(dx, dy)
                speeds.append(speed)
                if speed > 1:
                    dirs.append(_get_direction(dx, dy))

            avg_speed = sum(speeds) / len(speeds) if speeds else 0

            if avg_speed >= self._speed_threshold:
                direction = dirs[-1] if dirs else "N"
                runners.append((pid, avg_speed, direction))

                # Individual running event
                risk_eval = CrimeRiskEngine.evaluate(
                    "running_detection", person.avg_confidence
                )
                events.append(
                    CrimeEvent(
                        event_type="running_detection",
                        person_id=pid,
                        frame=frame_idx,
                        confidence=person.avg_confidence,
                        risk=risk_eval["risk"],
                        speed=avg_speed,
                        direction=direction,
                        bbox=person.last_bbox,
                    )
                )

        # ── Crowd panic check ────────────────────────────────────────
        if (
            len(runners) >= self._min_runners
            and not self._fired_panic
        ):
            dir_counts = Counter(d for _, _, d in runners)
            dominant_dir, dominant_count = dir_counts.most_common(1)[0]
            ratio = dominant_count / len(runners)

            if ratio >= self._panic_dir_threshold:
                avg_speed = sum(s for _, s, _ in runners) / len(runners)
                risk_eval = CrimeRiskEngine.evaluate("crowd_panic", 0.85)
                events.append(
                    CrimeEvent(
                        event_type="crowd_panic",
                        frame=frame_idx,
                        confidence=0.85,
                        risk=risk_eval["risk"],
                        speed=avg_speed,
                        direction=dominant_dir,
                        affected_persons=len(runners),
                    )
                )
                self._fired_panic = True
                logger.warning(
                    "[crime] CROWD PANIC — %d persons running %s",
                    len(runners), dominant_dir,
                )

        return events
