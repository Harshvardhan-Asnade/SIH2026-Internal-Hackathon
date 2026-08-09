"""
RailVision AI — Temporal Fight Detection Service

Uses TorchVision's 3D CNNs (mc3_18) on spatial-temporal crops
extracted from candidate interactions to classify NORMAL vs FIGHT.
"""

from __future__ import annotations

import logging
import math
import time

import cv2
import numpy as np
import torch
import torchvision.transforms as T
import torchvision.models.video as video_models

from app.ai.crime.config import CrimeDetectionConfig
from app.ai.crime.crime_models import CrimeEvent, TrackedPerson
from app.ai.crime.crime_risk_engine import CrimeRiskEngine

logger = logging.getLogger(__name__)


class FightDetectionService:
    """
    Temporal Fight / Violence detection.

    1. Uses spatial proximity as a Candidate Generator.
    2. Extracts a combined spatial-temporal crop across a rolling buffer.
    3. Feeds clip [C, T, H, W] into mc3_18 Action Recognition model.
    4. Applies temporal confirmation (multiple positive sliding windows)
       and cooldown to prevent duplicate alerts.
    """

    def __init__(self, config: CrimeDetectionConfig) -> None:
        self._cfg = config
        self._proximity_px = config.fight_proximity_px
        self._seq_len = config.fight_sequence_length
        self._clf_thresh = config.fight_classification_threshold
        self._min_windows = config.fight_min_positive_windows
        self._cooldown = config.fight_cooldown_seconds
        
        # State tracking
        self._consecutive_fights: dict[str, int] = {}
        self._last_alert_time: dict[str, float] = {}

        # ── Initialize 3D CNN Model ──────────────────────────────────
        self.device = torch.device("mps" if hasattr(torch.backends, "mps") and torch.backends.mps.is_available() else "cuda" if torch.cuda.is_available() else "cpu")
        
        self.model = None
        if self._cfg.fight_detection_enabled:
            try:
                # We instantiate mc3_18 with 2 classes (NORMAL, FIGHT)
                # Operating with random weights pending actual fine-tuning
                self.model = video_models.mc3_18(weights=None, num_classes=2)
                self.model.to(self.device)
                self.model.eval()
                self._untrained = True
                logger.info(f"[crime] Initialized Temporal Fight Model (mc3_18) on {self.device} (Untrained)")
            except Exception as e:
                logger.error(f"[crime] Failed to initialize 3D model: {e}")
        else:
            logger.info("[crime] Fight Detection is DISABLED. MC3-18 will not be loaded.")

        # Standard Video Transform
        self.transform = T.Compose([
            T.ToTensor(),
            T.Normalize(mean=[0.43216, 0.394666, 0.37645],
                        std=[0.22803, 0.22145, 0.216989])
        ])

    def reset(self) -> None:
        self._consecutive_fights.clear()
        self._last_alert_time.clear()

    def process(
        self,
        persons: dict[int, TrackedPerson],
        frame_idx: int,
        fps: float,
        frame_buffer: list[np.ndarray],
    ) -> list[CrimeEvent]:
        
        events: list[CrimeEvent] = []
        if self.model is None or len(frame_buffer) < self._seq_len:
            return events

        pids = list(persons.keys())
        active_pairs = set()
        current_time = time.time()

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

                # Cooldown check
                if pair_key in self._last_alert_time:
                    if (current_time - self._last_alert_time[pair_key]) < self._cooldown:
                        continue

                # Candidate Proximity Generator
                if dist <= self._proximity_px:
                    avg_conf = (p1.avg_confidence + p2.avg_confidence) / 2
                    if avg_conf < self._cfg.fight_min_confidence:
                        continue

                    # Generate Temporal Clip
                    clip = self._extract_temporal_clip(p1.last_bbox, p2.last_bbox, frame_buffer)
                    if clip is None:
                        continue

                    # Inference
                    is_fight, confidence = self._run_inference(clip)

                    if is_fight:
                        self._consecutive_fights[pair_key] = self._consecutive_fights.get(pair_key, 0) + 1
                    else:
                        self._consecutive_fights[pair_key] = 0

                    # Temporal Confirmation
                    if self._consecutive_fights[pair_key] >= self._min_windows:
                        risk_eval = CrimeRiskEngine.evaluate("fight_detection", confidence)
                        
                        # Union bbox for OSD
                        ubbox = [
                            min(p1.last_bbox[0], p2.last_bbox[0]),
                            min(p1.last_bbox[1], p2.last_bbox[1]),
                            max(p1.last_bbox[2], p2.last_bbox[2]),
                            max(p1.last_bbox[3], p2.last_bbox[3]),
                        ]

                        events.append(CrimeEvent(
                            event_type="fight_detection",
                            person_id=pids[i],
                            frame=frame_idx,
                            confidence=confidence,
                            risk=risk_eval["risk"],
                            affected_persons=2,
                            bbox=ubbox,
                            metadata={
                                "person_ids": [pids[i], pids[j]],
                                "detection_method": "mc3_18_temporal",
                                "consecutive_windows": self._consecutive_fights[pair_key]
                            },
                        ))
                        
                        self._last_alert_time[pair_key] = current_time
                        self._consecutive_fights[pair_key] = 0
                        logger.warning(f"[crime] FIGHT DETECTED! Persons {pids[i]} & {pids[j]} (Conf: {confidence:.2f})")
                else:
                    self._consecutive_fights[pair_key] = 0

        # Cleanup stale pairs
        stale = [k for k in self._consecutive_fights if k not in active_pairs]
        for k in stale:
            del self._consecutive_fights[k]

        return events

    def _extract_temporal_clip(self, bbox1: list[int], bbox2: list[int], frame_buffer: list[np.ndarray]) -> torch.Tensor | None:
        """
        Extracts a combined bounding box spatial crop across the temporal buffer,
        resizes to 112x112, and returns a [1, C, T, H, W] tensor.
        """
        h, w = frame_buffer[0].shape[:2]
        margin = 20
        
        # Union bounding box
        x1 = max(0, min(bbox1[0], bbox2[0]) - margin)
        y1 = max(0, min(bbox1[1], bbox2[1]) - margin)
        x2 = min(w, max(bbox1[2], bbox2[2]) + margin)
        y2 = min(h, max(bbox1[3], bbox2[3]) + margin)

        if (x2 - x1) < 10 or (y2 - y1) < 10:
            return None

        frames_tensor = []
        for frame in frame_buffer:
            # Crop
            crop = frame[int(y1):int(y2), int(x1):int(x2)]
            # Resize
            crop = cv2.resize(crop, (112, 112))
            # Convert BGR to RGB
            crop = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
            # Transform to [C, H, W] tensor
            t_crop = self.transform(crop)
            frames_tensor.append(t_crop)

        # Stack into [T, C, H, W]
        stacked = torch.stack(frames_tensor)
        # Permute to [C, T, H, W]
        stacked = stacked.permute(1, 0, 2, 3)
        # Add batch dim [1, C, T, H, W]
        return stacked.unsqueeze(0).to(self.device)

    def _run_inference(self, clip_tensor: torch.Tensor) -> tuple[bool, float]:
        with torch.inference_mode():
            outputs = self.model(clip_tensor)
            probs = torch.nn.functional.softmax(outputs, dim=1)
            fight_prob = probs[0, 1].item()
            
        # If model is untrained, prevent false positives by suppressing classification
        if getattr(self, '_untrained', False):
            return False, 0.0

        is_fight = fight_prob >= self._clf_thresh
        return is_fight, fight_prob

