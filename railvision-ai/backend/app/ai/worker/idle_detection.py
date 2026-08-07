"""
RailVision AI — Idle Worker Detection Service

Tracks per-worker movement over time and fires an alert
when a worker stays stationary beyond the configured threshold.
"""

from __future__ import annotations

import logging
import math

from app.ai.worker.config import WorkerMonitoringConfig
from app.ai.worker.worker_models import WorkerState

logger = logging.getLogger(__name__)


class IdleDetectionService:
    """
    Detects idle workers by comparing current position to a
    historical position N seconds ago.
    """

    def __init__(self, config: WorkerMonitoringConfig) -> None:
        self._threshold_px = config.idle_movement_threshold_px
        self._timeout_s = config.idle_timeout_seconds
        self._fired: set[int] = set()

    def reset(self) -> None:
        self._fired.clear()

    def update(
        self,
        workers: dict[int, WorkerState],
        frame_idx: int,
        fps: float,
    ) -> list[int]:
        """
        Returns list of worker IDs that just became idle (new alerts only).
        Also updates is_idle / idle_since_frame on each worker.
        """
        newly_idle: list[int] = []
        threshold_frames = int(self._timeout_s * fps) if fps > 0 else 30

        for wid, worker in workers.items():
            if len(worker.positions) < threshold_frames:
                worker.is_idle = False
                worker.idle_since_frame = -1
                continue

            old = worker.positions[-threshold_frames]
            cur = worker.last_position
            dist = math.hypot(cur[0] - old[0], cur[1] - old[1])

            if dist <= self._threshold_px:
                if worker.idle_since_frame < 0:
                    worker.idle_since_frame = frame_idx - threshold_frames
                worker.is_idle = True

                if wid not in self._fired:
                    newly_idle.append(wid)
                    self._fired.add(wid)
                    logger.warning(
                        "[worker] Idle detected — worker %d stationary for %.1fs",
                        wid, self._timeout_s,
                    )
            else:
                worker.is_idle = False
                worker.idle_since_frame = -1
                # Allow re-fire if they become idle again
                self._fired.discard(wid)

        return newly_idle
