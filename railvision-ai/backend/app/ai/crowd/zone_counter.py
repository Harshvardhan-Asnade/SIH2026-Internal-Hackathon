"""
RailVision AI — Zone Counter

Splits the video frame into spatial zones and counts persons per zone.
Uses the foot-point (bottom-centre of bounding box) to assign each
person to exactly one zone.
"""

from __future__ import annotations

from typing import Any


class ZoneCounter:
    """
    Divides the frame into a 3×3 grid of named zones:

        top-left     | top-center     | top-right
        center-left  | center-center  | center-right
        bottom-left  | bottom-center  | bottom-right

    And also provides simplified 3-zone vertical / 3-zone horizontal
    counts (top/center/bottom, left/center/right).
    """

    # Zone names for the 3-row vertical split
    VERTICAL_ZONES = ("top", "center", "bottom")
    HORIZONTAL_ZONES = ("left", "center", "right")

    def __init__(self, frame_height: int, frame_width: int) -> None:
        self._h = frame_height
        self._w = frame_width

    def count_zones(self, bboxes: list[list[int]]) -> dict[str, Any]:
        """
        Assign each person to a zone and return counts.

        Parameters
        ----------
        bboxes : list of [x1, y1, x2, y2]

        Returns
        -------
        dict with ``vertical`` (top/center/bottom),
        ``horizontal`` (left/center/right), and ``grid`` (3×3) counts.
        """
        v_counts = {"top": 0, "center": 0, "bottom": 0}
        h_counts = {"left": 0, "center": 0, "right": 0}
        grid: dict[str, int] = {}

        row_h = self._h / 3
        col_w = self._w / 3

        for bbox in bboxes:
            x1, y1, x2, y2 = bbox
            # Foot-point = bottom-centre
            cx = (x1 + x2) / 2
            cy = y2

            # Vertical zone
            if cy < row_h:
                vz = "top"
            elif cy < row_h * 2:
                vz = "center"
            else:
                vz = "bottom"
            v_counts[vz] += 1

            # Horizontal zone
            if cx < col_w:
                hz = "left"
            elif cx < col_w * 2:
                hz = "center"
            else:
                hz = "right"
            h_counts[hz] += 1

            # Grid cell
            cell = f"{vz}-{hz}"
            grid[cell] = grid.get(cell, 0) + 1

        return {
            "vertical": v_counts,
            "horizontal": h_counts,
            "grid": grid,
        }
