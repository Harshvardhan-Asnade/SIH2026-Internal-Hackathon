"""
RailVision AI — Crowd Statistics Tracker

Accumulates per-frame crowd counts and produces summary statistics
after the full video has been processed.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class CrowdStatistics:
    """Tracks crowd metrics across all processed frames."""

    # Per-frame counts
    _frame_counts: list[int] = field(default_factory=list)
    _frame_zones: list[dict[str, int]] = field(default_factory=list)

    # Tracking IDs seen (for unique-person counting)
    _unique_ids: set[int] = field(default_factory=set)

    def reset(self) -> None:
        self._frame_counts.clear()
        self._frame_zones.clear()
        self._unique_ids.clear()

    def record_frame(
        self,
        count: int,
        zones: dict[str, int] | None = None,
        track_ids: list[int] | None = None,
    ) -> None:
        """Record the count for one frame."""
        self._frame_counts.append(count)
        if zones:
            self._frame_zones.append(zones)
        if track_ids:
            self._unique_ids.update(track_ids)

    # ── Computed properties ──────────────────────────────────────────
    @property
    def current_count(self) -> int:
        return self._frame_counts[-1] if self._frame_counts else 0

    @property
    def maximum_count(self) -> int:
        return max(self._frame_counts) if self._frame_counts else 0

    @property
    def minimum_count(self) -> int:
        return min(self._frame_counts) if self._frame_counts else 0

    @property
    def average_count(self) -> float:
        if not self._frame_counts:
            return 0.0
        return round(sum(self._frame_counts) / len(self._frame_counts), 1)

    @property
    def total_frames(self) -> int:
        return len(self._frame_counts)

    @property
    def unique_people(self) -> int:
        return len(self._unique_ids)

    @property
    def peak_frame(self) -> int:
        """Frame index where the crowd was densest."""
        if not self._frame_counts:
            return 0
        return self._frame_counts.index(max(self._frame_counts))

    @property
    def trend(self) -> list[dict[str, Any]]:
        """Time-series data for frontend charts."""
        # For very long videos, we might want to sample this, but for now we return all
        # or sample every N frames to keep JSON size reasonable.
        step = max(1, len(self._frame_counts) // 100) # Max 100 data points
        return [
            {"frame": i, "people_count": count}
            for i, count in enumerate(self._frame_counts)
            if i % step == 0 or i == len(self._frame_counts) - 1
        ]

    def get_occupancy_percentage(self, max_capacity: int) -> float:
        if max_capacity <= 0: return 0.0
        return min(100.0, round((self.current_count / max_capacity) * 100, 1))

    def to_dict(self) -> dict[str, Any]:
        """Serialise statistics for JSON response."""
        return {
            "current": self.current_count,
            "peak": self.maximum_count,
            "minimum": self.minimum_count,
            "average": self.average_count,
            "unique_tracks": self.unique_people,
            "total_frames_analyzed": self.total_frames,
            "peak_frame": self.peak_frame,
            "trend": self.trend,
        }
