"""
RailVision AI — Restricted Area Detection Service

Detects persons entering multiple configurable restricted zones.
Uses the same polygon point-in-polygon approach as track intrusion.
"""

from __future__ import annotations

import logging

from app.ai.crime.config import CrimeDetectionConfig
from app.ai.crime.crime_models import CrimeEvent, TrackedPerson
from app.ai.crime.crime_risk_engine import CrimeRiskEngine
from app.ai.crime.track_intrusion import _point_in_polygon

logger = logging.getLogger(__name__)


class RestrictedAreaService:
    """
    Detects unauthorised access into restricted zones.
    """

    def __init__(self, config: CrimeDetectionConfig) -> None:
        self._zones = config.restricted_zones
        self._min_frames = config.restricted_area_min_frames
        self._inside_count: dict[int, dict[str, int]] = {}
        self._fired: set[str] = set()

    def reset(self) -> None:
        self._inside_count.clear()
        self._fired.clear()

    def process(
        self,
        persons: dict[int, TrackedPerson],
        frame_idx: int,
        frame_h: int,
        frame_w: int,
        fps: float,
    ) -> list[CrimeEvent]:
        events: list[CrimeEvent] = []

        for pid, person in persons.items():
            bbox = person.last_bbox
            foot_x = (bbox[0] + bbox[2]) / 2 / frame_w if frame_w else 0
            foot_y = bbox[3] / frame_h if frame_h else 0

            if pid not in self._inside_count:
                self._inside_count[pid] = {}

            for zone in self._zones:
                key = f"{pid}:{zone.name}"

                if _point_in_polygon(foot_x, foot_y, zone.polygon):
                    self._inside_count[pid][zone.name] = (
                        self._inside_count[pid].get(zone.name, 0) + 1
                    )
                    count = self._inside_count[pid][zone.name]

                    if count >= self._min_frames and key not in self._fired:
                        risk_eval = CrimeRiskEngine.evaluate(
                            "restricted_area", person.avg_confidence
                        )
                        events.append(
                            CrimeEvent(
                                event_type="restricted_area",
                                person_id=pid,
                                frame=frame_idx,
                                confidence=person.avg_confidence,
                                risk=risk_eval["risk"],
                                zone_name=zone.name,
                                duration_frames=count,
                                duration_seconds=count / fps if fps > 0 else 0,
                                bbox=person.last_bbox,
                            )
                        )
                        self._fired.add(key)
                        logger.warning(
                            "[crime] Restricted area — person %d in '%s'",
                            pid, zone.name,
                        )
                else:
                    self._inside_count.setdefault(pid, {})[zone.name] = 0

        return events
