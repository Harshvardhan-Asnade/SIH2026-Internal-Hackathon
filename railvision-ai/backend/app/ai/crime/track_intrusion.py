"""
RailVision AI — Track Intrusion Detection Service

Detects when a tracked person enters a defined railway-track danger zone.

Uses the foot-point (bottom-centre of bounding box) and a
point-in-polygon test against normalised zone polygons.
"""

from __future__ import annotations

import logging
from typing import Any

from app.ai.crime.config import CrimeDetectionConfig, ZoneDefinition
from app.ai.crime.crime_models import CrimeEvent, TrackedPerson
from app.ai.crime.crime_risk_engine import CrimeRiskEngine

logger = logging.getLogger(__name__)


def _point_in_polygon(px: float, py: float, polygon: list[tuple[float, float]]) -> bool:
    """Ray-casting point-in-polygon test."""
    n = len(polygon)
    inside = False
    j = n - 1
    for i in range(n):
        xi, yi = polygon[i]
        xj, yj = polygon[j]
        if ((yi > py) != (yj > py)) and (px < (xj - xi) * (py - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside


class TrackIntrusionService:
    """
    Detects persons inside railway-track danger zones.

    Tracks how many consecutive frames each person has been inside
    the zone and fires an alert after ``min_frames`` threshold.
    """

    def __init__(self, config: CrimeDetectionConfig) -> None:
        self._zones = config.track_zones
        self._min_frames = config.track_intrusion_min_frames
        # person_id → {zone_name: consecutive_frames_inside}
        self._inside_count: dict[int, dict[str, int]] = {}
        self._fired: set[str] = set()  # "pid:zone" keys
        self._zone_cooldown: dict[str, int] = {} # zone_name -> frame_idx of last alert

    def reset(self) -> None:
        self._inside_count.clear()
        self._fired.clear()
        self._zone_cooldown.clear()

    def process(
        self,
        persons: dict[int, TrackedPerson],
        frame_idx: int,
        frame_h: int,
        frame_w: int,
        fps: float,
    ) -> list[CrimeEvent]:
        """Check all tracked persons against all track zones."""
        events: list[CrimeEvent] = []
        
        # 5 seconds cooldown
        cooldown_frames = int(fps * 5) if fps > 0 else 150

        for pid, person in persons.items():
            cx, cy = person.last_position
            # Normalise to [0..1]
            nx = cx / frame_w if frame_w else 0
            ny = cy / frame_h if frame_h else 0
            # Use foot-point (bottom of bbox)
            bbox = person.last_bbox
            foot_y = bbox[3] / frame_h if frame_h else 0
            foot_x = (bbox[0] + bbox[2]) / 2 / frame_w if frame_w else 0

            if pid not in self._inside_count:
                self._inside_count[pid] = {}

            for zone in self._zones:
                key = f"{pid}:{zone.name}"

                if _point_in_polygon(foot_x, foot_y, zone.polygon):
                    self._inside_count[pid][zone.name] = (
                        self._inside_count[pid].get(zone.name, 0) + 1
                    )
                    count = self._inside_count[pid][zone.name]

                    # Check if zone is on cooldown
                    last_fired_frame = self._zone_cooldown.get(zone.name, -cooldown_frames)
                    is_on_cooldown = (frame_idx - last_fired_frame) < cooldown_frames

                    if count >= self._min_frames and key not in self._fired and not is_on_cooldown:
                        risk_eval = CrimeRiskEngine.evaluate(
                            "track_intrusion", person.avg_confidence
                        )
                        duration_s = count / fps if fps > 0 else 0
                        events.append(
                            CrimeEvent(
                                event_type="track_intrusion",
                                person_id=pid,
                                frame=frame_idx,
                                confidence=person.avg_confidence,
                                risk=risk_eval["risk"],
                                zone_name=zone.name,
                                duration_frames=count,
                                duration_seconds=duration_s,
                                bbox=person.last_bbox,
                            )
                        )
                        self._fired.add(key)
                        self._zone_cooldown[zone.name] = frame_idx
                        logger.warning(
                            "[crime] Track intrusion — person %d in '%s' for %d frames",
                            pid, zone.name, count,
                        )
                else:
                    # Reset counter when person leaves
                    self._inside_count.setdefault(pid, {})[zone.name] = 0

        return events

    def get_zone_polygons(self, frame_h: int, frame_w: int) -> list[dict[str, Any]]:
        """Return absolute-pixel polygons for OSD drawing."""
        result = []
        for zone in self._zones:
            pts = [(int(x * frame_w), int(y * frame_h)) for x, y in zone.polygon]
            result.append({"name": zone.name, "points": pts, "color": (0, 0, 255)})
        return result
