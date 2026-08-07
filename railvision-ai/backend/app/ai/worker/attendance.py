"""
RailVision AI — Worker Attendance Service

Tracks worker presence across video frames to compute
entry time, exit time, and total working duration.
"""

from __future__ import annotations

import logging
from typing import Any

from app.ai.worker.worker_models import AttendanceRecord, WorkerState

logger = logging.getLogger(__name__)


class AttendanceService:
    """
    Tracks when workers appear and disappear from the video feed
    to generate attendance records.
    """

    def __init__(self) -> None:
        self._records: dict[int, AttendanceRecord] = {}
        self._last_seen: dict[int, int] = {}
        self._exit_gap = 60  # Frames without detection = "exited"

    def reset(self) -> None:
        self._records.clear()
        self._last_seen.clear()

    def update(
        self, workers: dict[int, WorkerState], frame_idx: int
    ) -> None:
        """Update attendance from currently visible workers."""
        for wid, worker in workers.items():
            if wid not in self._records:
                self._records[wid] = AttendanceRecord(
                    worker_id=wid,
                    entry_frame=worker.first_seen_frame,
                )
            rec = self._records[wid]
            rec.total_frames += 1
            rec.exit_frame = frame_idx
            self._last_seen[wid] = frame_idx

    def get_summary(self, fps: float) -> dict[str, Any]:
        """Return attendance summary."""
        workers_list = []
        for wid, rec in self._records.items():
            workers_list.append({
                "worker_id": wid,
                "entry_frame": rec.entry_frame,
                "exit_frame": rec.exit_frame,
                "total_frames_present": rec.total_frames,
                "duration_seconds": round(rec.duration_seconds(fps), 1),
            })

        total = len(self._records)
        # Active = seen in last exit_gap frames
        max_frame = max((r.exit_frame for r in self._records.values()), default=0)
        active = sum(
            1 for r in self._records.values()
            if max_frame - r.exit_frame < self._exit_gap
        )

        return {
            "total_workers_seen": total,
            "currently_active": active,
            "records": workers_list,
        }
