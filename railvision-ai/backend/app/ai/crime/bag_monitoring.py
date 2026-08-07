"""
RailVision AI — Unattended Baggage Detection Service

Detects luggage-class objects (suitcase, backpack, handbag) from
YOLO detections, associates each with the nearest tracked person,
and raises an alert when baggage remains unattended for a
configurable duration.
"""

from __future__ import annotations

import logging
import math
from typing import Any

from app.ai.base.base_module import FrameDetection
from app.ai.crime.config import CrimeDetectionConfig
from app.ai.crime.crime_models import CrimeEvent, TrackedObject, TrackedPerson
from app.ai.crime.crime_risk_engine import CrimeRiskEngine

logger = logging.getLogger(__name__)


def _center(bbox: list[int]) -> tuple[int, int]:
    return ((bbox[0] + bbox[2]) // 2, (bbox[1] + bbox[3]) // 2)


def _dist(a: tuple[int, int], b: tuple[int, int]) -> float:
    return math.hypot(a[0] - b[0], a[1] - b[1])


class BagMonitoringService:
    """
    Associates detected baggage with the nearest person.
    If the owner moves away beyond a distance threshold
    for longer than ``unattended_seconds``, fires an alert.
    """

    def __init__(self, config: CrimeDetectionConfig) -> None:
        self._cfg = config
        # Persistent tracked bags (keyed by approximate position hash)
        self._bags: dict[str, TrackedObject] = {}
        self._next_id = 0
        self._fired: set[str] = set()

    def reset(self) -> None:
        self._bags.clear()
        self._next_id = 0
        self._fired.clear()

    def _bag_key(self, cx: int, cy: int) -> str:
        """Quantise centre to 40px grid for coarse matching."""
        return f"{cx // 40}:{cy // 40}"

    def process(
        self,
        person_dets: list[FrameDetection],
        persons: dict[int, TrackedPerson],
        frame_idx: int,
        fps: float,
    ) -> list[CrimeEvent]:
        """
        Scan detections for baggage classes and check for abandonment.
        """
        events: list[CrimeEvent] = []

        # ── Identify baggage detections ──────────────────────────────
        bag_dets = [
            d for d in person_dets
            if d.class_name in self._cfg.baggage_classes
            and d.confidence >= self._cfg.baggage_min_confidence
        ]

        # ── Update tracked bags ──────────────────────────────────────
        seen_keys: set[str] = set()

        for det in bag_dets:
            cx, cy = _center(det.bbox)
            key = self._bag_key(cx, cy)
            seen_keys.add(key)

            if key not in self._bags:
                self._bags[key] = TrackedObject(
                    object_id=self._next_id,
                    class_name=det.class_name,
                    bbox=det.bbox,
                    center=(cx, cy),
                    first_seen_frame=frame_idx,
                    last_seen_frame=frame_idx,
                    confidence=det.confidence,
                )
                self._next_id += 1
            else:
                bag = self._bags[key]
                bag.bbox = det.bbox
                bag.center = (cx, cy)
                bag.last_seen_frame = frame_idx
                bag.confidence = det.confidence

        # ── Associate bags with nearest person ───────────────────────
        for key, bag in self._bags.items():
            min_dist = float("inf")
            nearest_pid = -1

            for pid, person in persons.items():
                d = _dist(bag.center, person.last_position)
                if d < min_dist:
                    min_dist = d
                    nearest_pid = pid

            bag.owner_distance = min_dist
            bag.owner_id = nearest_pid

            # Check if unattended
            if min_dist > self._cfg.baggage_owner_distance_px:
                if bag.unattended_since_frame < 0:
                    bag.unattended_since_frame = frame_idx
                else:
                    unattended_frames = frame_idx - bag.unattended_since_frame
                    unattended_secs = unattended_frames / fps if fps > 0 else 0

                    alert_key = f"bag:{bag.object_id}"
                    if (
                        unattended_secs >= self._cfg.baggage_unattended_seconds
                        and alert_key not in self._fired
                    ):
                        risk_eval = CrimeRiskEngine.evaluate(
                            "abandoned_baggage", bag.confidence
                        )
                        events.append(
                            CrimeEvent(
                                event_type="abandoned_baggage",
                                object_id=bag.object_id,
                                person_id=bag.owner_id,
                                frame=frame_idx,
                                confidence=bag.confidence,
                                risk=risk_eval["risk"],
                                duration_seconds=unattended_secs,
                                bbox=bag.bbox,
                                metadata={
                                    "bag_class": bag.class_name,
                                    "owner_distance_px": round(bag.owner_distance, 1),
                                },
                            )
                        )
                        self._fired.add(alert_key)
                        logger.warning(
                            "[crime] Abandoned baggage — bag %d unattended %.1fs",
                            bag.object_id, unattended_secs,
                        )
            else:
                # Owner is nearby — reset timer
                bag.unattended_since_frame = -1

        # ── Purge stale bags (not seen for 30 frames) ────────────────
        stale_keys = [
            k for k, b in self._bags.items()
            if frame_idx - b.last_seen_frame > 30
        ]
        for k in stale_keys:
            del self._bags[k]

        return events
