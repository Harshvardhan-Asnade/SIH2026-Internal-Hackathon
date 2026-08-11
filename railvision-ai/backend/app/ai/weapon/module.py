from __future__ import annotations

import logging
import time
import math
from typing import Any
import numpy as np

from app.ai.base.base_module import BaseAIModule, FrameDetection, Alert, ModuleResult
from app.ai.weapon.config import WeaponDetectionConfig
import uuid

logger = logging.getLogger(__name__)

class WeaponCandidate:
    def __init__(self, cls_id: int, cls_name: str, first_frame: int):
        self.cls_id = cls_id
        self.cls_name = cls_name
        self.first_seen_frame = first_frame
        self.last_seen_frame = first_frame
        self.detection_count = 1
        
        self.associated_person_track: int | None = None
        self.last_bbox = [0, 0, 0, 0]
        self.last_confidence = 0.0

class WeaponDetectionModule(BaseAIModule):
    """
    Weapon Detection Module.
    Tracks proxy weapons (knives, baseball bats) to evaluate temporal 
    persistence, associate with tracked persons, and generate deduplicated alerts.
    """

    def __init__(self, config: WeaponDetectionConfig) -> None:
        super().__init__(name="weapon_detection", enabled=config.enabled)
        self.config = config
        
        # Spatial-based tracking of weapon candidates
        # We don't have ByteTrack for weapons, so we associate by spatial IoU or centroid
        self.candidates: list[WeaponCandidate] = []
        
        # Deduplication tracking: 
        # Dict of {person_track_id -> last_alert_time} OR {zone/spatial_key -> last_alert_time}
        self.cooldowns: dict[str, float] = {}

    def initialize(self) -> None:
        if not self._enabled:
            return
        logger.info("[weapon_detection] Initializing (PARTIALLY_IMPLEMENTED: No Firearm support)")
        self._loaded = True

    def reset(self) -> None:
        super().reset()
        self.candidates.clear()
        self.cooldowns.clear()

    def _get_centroid(self, bbox: list[int]) -> tuple[int, int]:
        return (bbox[0] + bbox[2]) // 2, (bbox[1] + bbox[3]) // 2

    def _distance(self, c1: tuple[int, int], c2: tuple[int, int]) -> float:
        return math.hypot(c1[0] - c2[0], c1[1] - c2[1])

    def _match_candidate(self, bbox: list[int], cls_id: int, frame_idx: int) -> WeaponCandidate | None:
        c_new = self._get_centroid(bbox)
        
        best_match = None
        best_dist = float('inf')
        
        for cand in self.candidates:
            if cand.cls_id != cls_id:
                continue
            # Must be seen recently
            if frame_idx - cand.last_seen_frame > self.config.weapon_confirmation_window_frames:
                continue
                
            c_cand = self._get_centroid(cand.last_bbox)
            d = self._distance(c_new, c_cand)
            if d < 100:  # 100 pixels spatial jump threshold
                if d < best_dist:
                    best_dist = d
                    best_match = cand
                    
        return best_match

    def _associate_person(self, weapon_bbox: list[int], person_dets: list[FrameDetection]) -> int | None:
        c_weapon = self._get_centroid(weapon_bbox)
        
        best_person = None
        best_dist = float('inf')
        
        for p in person_dets:
            if p.class_name != "person":
                continue
                
            # Check if weapon is inside or very close to person
            px1, py1, px2, py2 = p.bbox
            
            # Simple bounding box expansion check
            exp = 50
            if (px1 - exp) <= c_weapon[0] <= (px2 + exp) and (py1 - exp) <= c_weapon[1] <= (py2 + exp):
                c_person = self._get_centroid(p.bbox)
                d = self._distance(c_weapon, c_person)
                if d < best_dist:
                    best_dist = d
                    best_person = p.metadata.get("track_id")
                    
        return best_person

    def process_frame(
        self, frame: np.ndarray, frame_idx: int, shared_context: dict[str, Any]
    ) -> list[FrameDetection]:
        if not self._enabled or not self._loaded:
            return []

        if self.config.frame_skip > 0 and frame_idx % (self.config.frame_skip + 1) != 0:
            return []

        # Get raw YOLO detections from shared_context
        all_dets: list[FrameDetection] = shared_context.get("raw_detections", [])
        
        # The tracked persons from ByteTrack are usually in 'person_detection'
        person_dets: list[FrameDetection] = shared_context.get("person_detection", [])

        # Filter for weapon classes
        weapon_dets = [
            d for d in all_dets
            if d.class_id in self.config.supported_classes and d.confidence >= self.config.min_confidence
        ]
        
        current_time = time.time()
        new_alerts = []

        for w_det in weapon_dets:
            # 1. Match to existing candidate temporally
            cand = self._match_candidate(w_det.bbox, w_det.class_id, frame_idx)
            
            if cand:
                cand.detection_count += 1
                cand.last_seen_frame = frame_idx
                cand.last_bbox = w_det.bbox
                cand.last_confidence = w_det.confidence
            else:
                cand = WeaponCandidate(
                    cls_id=w_det.class_id,
                    cls_name=self.config.supported_classes[w_det.class_id],
                    first_frame=frame_idx
                )
                cand.last_bbox = w_det.bbox
                cand.last_confidence = w_det.confidence
                self.candidates.append(cand)
            
            # 2. Update Person Association
            cand.associated_person_track = self._associate_person(w_det.bbox, person_dets)
            
            # 3. Check Temporal Confirmation
            if cand.detection_count >= self.config.weapon_min_frames:
                # Deduplication
                dedup_key = f"track_{cand.associated_person_track}" if cand.associated_person_track else f"loc_{self._get_centroid(cand.last_bbox)[0]//200}_{self._get_centroid(cand.last_bbox)[1]//200}"
                
                last_alert_time = self.cooldowns.get(dedup_key, 0)
                if current_time - last_alert_time > self.config.weapon_cooldown_seconds:
                    
                    # Generate Alert
                    # Using specific name (KNIFE DETECTED) rather than WEAPON
                    alert = Alert(
                        id=str(uuid.uuid4()),
                        event_type=f"{cand.cls_name} DETECTED",
                        module="weapon_detection",
                        timestamp=str(current_time),
                        frame=frame_idx,
                        severity="critical",
                        status="ACTIVE",
                        track_ids=[cand.associated_person_track] if cand.associated_person_track else [],
                    )
                    new_alerts.append(alert)
                    self._results.alerts.append(alert)
                    self.cooldowns[dedup_key] = current_time
                    
                    # Reset candidate so it doesn't immediately fire again if cooldown is short
                    cand.detection_count = 0

        # Clean up stale candidates
        self.candidates = [
            c for c in self.candidates 
            if frame_idx - c.last_seen_frame <= self.config.weapon_confirmation_window_frames
        ]

        return []

    def draw_annotations(self, frame: np.ndarray, detections: list[FrameDetection]) -> np.ndarray:
        return frame

    def get_results(self) -> ModuleResult:
        """Return accumulated results for the current video/session."""
        # Attach any module-specific data if needed, otherwise return base results
        return self._results
