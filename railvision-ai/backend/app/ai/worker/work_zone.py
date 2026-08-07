"""
RailVision AI — Work Zone Manager

Assigns workers to defined work zones and detects when they
are outside designated working areas.
"""

from __future__ import annotations

import logging
from typing import Any

from app.ai.worker.config import WorkerMonitoringConfig
from app.ai.worker.worker_models import WorkerState
from app.ai.crime.track_intrusion import _point_in_polygon

logger = logging.getLogger(__name__)


class WorkZoneManager:
    """
    Assigns each worker to a named work zone if they are inside
    the defined polygon. If they are in none, assigns 'Outside Zone'.
    """

    def __init__(self, config: WorkerMonitoringConfig) -> None:
        self._zones = config.work_zones

    def update(
        self,
        workers: dict[int, WorkerState],
        frame_h: int,
        frame_w: int,
    ) -> None:
        """Update `current_zone` for all workers."""
        for worker in workers.values():
            bbox = worker.last_bbox
            foot_x = (bbox[0] + bbox[2]) / 2 / frame_w if frame_w else 0
            foot_y = bbox[3] / frame_h if frame_h else 0

            in_zone = False
            for zone in self._zones:
                if _point_in_polygon(foot_x, foot_y, zone.polygon):
                    worker.current_zone = zone.name
                    in_zone = True
                    break
            
            if not in_zone:
                worker.current_zone = "Outside Zone"

    def get_zone_polygons(self, frame_h: int, frame_w: int) -> list[dict[str, Any]]:
        """Return absolute-pixel polygons for OSD drawing."""
        result = []
        for zone in self._zones:
            pts = [(int(x * frame_w), int(y * frame_h)) for x, y in zone.polygon]
            result.append({"name": zone.name, "points": pts})
        return result
