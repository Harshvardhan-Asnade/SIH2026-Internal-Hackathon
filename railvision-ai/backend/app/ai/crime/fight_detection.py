"""
RailVision AI — Fight Detection Service (Architecture Ready)

Placeholder module with clean interfaces.
Future implementation will use action-recognition models like
VideoMAE, SlowFast, or custom trained violence classifiers.

Current implementation uses simple proximity heuristics as a
baseline placeholder.
"""

from __future__ import annotations

import logging
import math

from app.ai.crime.config import CrimeDetectionConfig
from app.ai.crime.crime_models import CrimeEvent, TrackedPerson
from app.ai.crime.crime_risk_engine import CrimeRiskEngine

logger = logging.getLogger(__name__)


class FightDetectionService:
    """
    Fight / Violence detection placeholder.

    Current logic:
    - Detects when 2+ tracked persons are in very close proximity
      for multiple consecutive frames (simple heuristic).

    Future upgrades:
    - VideoMAE / SlowFast action-recognition on temporal clips
    - Pose estimation + gesture analysis
    - Custom violence classification CNN
    """

    def __init__(self, config: CrimeDetectionConfig) -> None:
        self._proximity_px = config.fight_proximity_px
        self._min_conf = config.fight_min_confidence
        # Track proximity pairs across frames
        self._pair_counts: dict[str, int] = {}
        self._fired: set[str] = set()
        self._min_frames = 5  # Must be close for 5 frames

    def reset(self) -> None:
        self._pair_counts.clear()
        self._fired.clear()

    def process(
        self,
        persons: dict[int, TrackedPerson],
        frame_idx: int,
        fps: float,
    ) -> list[CrimeEvent]:
        """
        Heuristic-based fight detection using proximity.

        NOTE: This is a PLACEHOLDER. Real fight detection requires
        action recognition models (VideoMAE, SlowFast, etc.).
        """
        events: list[CrimeEvent] = []
        pids = list(persons.keys())

        # Reset proximity counts for pairs not seen
        active_pairs: set[str] = set()

        for i in range(len(pids)):
            for j in range(i + 1, len(pids)):
                p1 = persons[pids[i]]
                p2 = persons[pids[j]]

                dist = math.hypot(
                    p1.last_position[0] - p2.last_position[0],
                    p1.last_position[1] - p2.last_position[1],
                )

                pair_key = f"{min(pids[i], pids[j])}:{max(pids[i], pids[j])}"
                active_pairs.add(pair_key)

                if dist <= self._proximity_px:
                    self._pair_counts[pair_key] = (
                        self._pair_counts.get(pair_key, 0) + 1
                    )

                    if (
                        self._pair_counts[pair_key] >= self._min_frames
                        and pair_key not in self._fired
                    ):
                        avg_conf = (p1.avg_confidence + p2.avg_confidence) / 2
                        if avg_conf >= self._min_conf:
                            risk_eval = CrimeRiskEngine.evaluate(
                                "fight_detection", avg_conf
                            )
                            events.append(
                                CrimeEvent(
                                    event_type="fight_detection",
                                    person_id=pids[i],
                                    frame=frame_idx,
                                    confidence=avg_conf,
                                    risk=risk_eval["risk"],
                                    affected_persons=2,
                                    metadata={
                                        "person_ids": [pids[i], pids[j]],
                                        "detection_method": "proximity_heuristic",
                                        "note": "Placeholder — upgrade to VideoMAE/SlowFast",
                                    },
                                )
                            )
                            self._fired.add(pair_key)
                            logger.info(
                                "[crime] Fight heuristic — persons %d & %d in close proximity",
                                pids[i], pids[j],
                            )
                else:
                    self._pair_counts[pair_key] = 0

        # Cleanup stale pairs
        stale = [k for k in self._pair_counts if k not in active_pairs]
        for k in stale:
            del self._pair_counts[k]

        return events
