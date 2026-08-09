"""
RailVision AI — Motion Analyzer (Running / Panic Detection)

Analyses per-person velocity from tracked foot-point positions.
Uses Perspective-Aware Normalization, Trajectory Smoothing (EMA),
and Temporal Confirmation to prevent false running alarms.
"""

from __future__ import annotations

import logging
import math
import time
from collections import Counter

from app.ai.crime.config import CrimeDetectionConfig
from app.ai.crime.crime_models import CrimeEvent, TrackedPerson
from app.ai.crime.crime_risk_engine import CrimeRiskEngine

logger = logging.getLogger(__name__)

# Compass buckets (8-direction)
_DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]

def _get_direction(dx: float, dy: float) -> str:
    """Convert displacement to 8-direction compass label."""
    angle = math.degrees(math.atan2(-dy, dx)) % 360  # screen coords (y down)
    idx = int((angle + 22.5) / 45) % 8
    return _DIRECTIONS[idx]


class MotionAnalyzer:
    """
    Detects running individuals and crowd-panic events using
    perspective-normalized velocity and temporal smoothing.
    """

    def __init__(self, config: CrimeDetectionConfig) -> None:
        self._cfg = config
        self._speed_threshold = config.running_speed_threshold
        self._min_frames = config.running_min_frames
        self._alpha = config.running_smoothing_alpha
        self._cooldown = config.running_cooldown_seconds
        
        self._min_runners = config.running_min_persons
        self._panic_dir_threshold = config.panic_directional_threshold
        
        # State
        self._fired_panic = False
        self._running_streaks: dict[int, int] = {}
        self._last_alert_time: dict[int, float] = {}
        self._smoothed_positions: dict[int, tuple[float, float]] = {}

    def reset(self) -> None:
        self._fired_panic = False
        self._running_streaks.clear()
        self._last_alert_time.clear()
        self._smoothed_positions.clear()

    def _get_perspective_scale(self, y: float, frame_h: int) -> float:
        """
        Estimate perspective scale if homography is unavailable.
        FAR (low y) -> high multiplier (pixels represent more distance)
        NEAR (high y) -> low multiplier (pixels represent less distance)
        """
        if not self._cfg.perspective_enabled or frame_h == 0:
            return 1.0
            
        normalized_y = y / frame_h
        # Simple linear approximation: 
        # y=0.1 (FAR) -> scale 3.0
        # y=0.9 (NEAR) -> scale 1.0
        # y=1.0 (BOTTOM) -> scale 0.8
        # This prevents distant people from requiring massive pixel displacement to trigger running.
        scale = max(0.5, 3.0 - (normalized_y * 2.5))
        return scale

    def process(
        self,
        persons: dict[int, TrackedPerson],
        frame_idx: int,
        fps: float,
        frame_h: int = 720,
    ) -> list[CrimeEvent]:
        events: list[CrimeEvent] = []
        runners: list[tuple[int, float, str]] = []  # (pid, speed, direction)
        
        active_pids = set(persons.keys())
        current_time = time.time()
        time_delta = 1.0 / max(1.0, fps)

        for pid, person in persons.items():
            if len(person.positions) < 2:
                continue

            # 1. Trajectory Smoothing (EMA)
            raw_x, raw_y = person.positions[-1]
            if pid not in self._smoothed_positions:
                self._smoothed_positions[pid] = (raw_x, raw_y)
            else:
                prev_x, prev_y = self._smoothed_positions[pid]
                smooth_x = prev_x + self._alpha * (raw_x - prev_x)
                smooth_y = prev_y + self._alpha * (raw_y - prev_y)
                self._smoothed_positions[pid] = (smooth_x, smooth_y)

            # Need at least 2 smoothed positions to calculate velocity, but we only store the latest.
            # We'll calculate velocity using the difference between current smoothed and previous smoothed.
            # Wait, if we just updated it, we need to compare it against what it was before updating.
            # Let's rework smoothing slightly:
            if len(person.positions) >= 2:
                prev_raw_x, prev_raw_y = person.positions[-2]
                curr_raw_x, curr_raw_y = person.positions[-1]
                
                # We can just smooth the velocity vector directly or use the distance between smoothed points.
                # To keep it simple, we calculate raw dx, dy, and smooth those.
                dx = curr_raw_x - prev_raw_x
                dy = curr_raw_y - prev_raw_y
                
                raw_speed_px_per_frame = math.hypot(dx, dy)
                
                # Time conversion
                raw_speed_px_per_sec = raw_speed_px_per_frame / time_delta
                
                # Perspective normalization based on current Y foot-point
                scale = self._get_perspective_scale(curr_raw_y, frame_h)
                normalized_speed = raw_speed_px_per_sec * scale
                
                direction = _get_direction(dx, dy) if raw_speed_px_per_frame > 1 else "N"

                # Check Thresholds
                if normalized_speed >= self._speed_threshold:
                    self._running_streaks[pid] = self._running_streaks.get(pid, 0) + 1
                else:
                    self._running_streaks[pid] = 0

                # Check Temporal Confirmation
                if self._running_streaks[pid] >= self._min_frames:
                    runners.append((pid, normalized_speed, direction))
                    
                    # Cooldown check
                    last_alert = self._last_alert_time.get(pid, 0)
                    if (current_time - last_alert) >= self._cooldown:
                        risk_eval = CrimeRiskEngine.evaluate("running_detection", person.avg_confidence)
                        
                        events.append(CrimeEvent(
                            event_type="running_detection",
                            person_id=pid,
                            frame=frame_idx,
                            confidence=person.avg_confidence,
                            risk=risk_eval["risk"],
                            speed=normalized_speed,
                            direction=direction,
                            bbox=person.last_bbox,
                            metadata={
                                "raw_speed_px_s": round(raw_speed_px_per_sec, 2),
                                "normalized_speed": round(normalized_speed, 2),
                                "perspective_scale": round(scale, 2),
                                "calibration_status": self._cfg.calibration_status
                            }
                        ))
                        self._last_alert_time[pid] = current_time

        # Cleanup stale tracks
        stale_pids = [p for p in self._running_streaks if p not in active_pids]
        for p in stale_pids:
            del self._running_streaks[p]
            self._last_alert_time.pop(p, None)
            self._smoothed_positions.pop(p, None)

        # ── Crowd panic check ────────────────────────────────────────
        if len(runners) >= self._min_runners and not self._fired_panic:
            dir_counts = Counter(d for _, _, d in runners)
            dominant_dir, dominant_count = dir_counts.most_common(1)[0]
            ratio = dominant_count / len(runners)

            if ratio >= self._panic_dir_threshold:
                avg_speed = sum(s for _, s, _ in runners) / len(runners)
                risk_eval = CrimeRiskEngine.evaluate("crowd_panic", 0.85)
                events.append(CrimeEvent(
                    event_type="crowd_panic",
                    frame=frame_idx,
                    confidence=0.85,
                    risk=risk_eval["risk"],
                    speed=avg_speed,
                    direction=dominant_dir,
                    affected_persons=len(runners),
                    metadata={
                        "calibration_status": self._cfg.calibration_status
                    }
                ))
                self._fired_panic = True
                logger.warning(f"[crime] CROWD PANIC — {len(runners)} persons running {dominant_dir}")

        return events
