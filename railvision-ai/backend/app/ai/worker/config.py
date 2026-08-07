"""
RailVision AI — Worker Monitoring Module Configuration

All thresholds, zone definitions, feature toggles, and tuning
parameters for the Worker Monitoring pipeline.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class WorkZoneDefinition:
    """A named polygon work zone (normalised 0.0–1.0 coordinates)."""
    name: str
    polygon: list[tuple[float, float]]


@dataclass
class WorkerMonitoringConfig:
    """Full configuration for the worker-monitoring module."""

    # ── Core ──────────────────────────────────────────────────────────
    enabled: bool = True
    frame_skip: int = 0

    # ── Feature toggles ──────────────────────────────────────────────
    enable_ppe_detection: bool = True
    enable_attendance: bool = True
    enable_idle_detection: bool = True
    enable_work_zone: bool = True
    enable_safety_score: bool = True

    # ── PPE Detection ────────────────────────────────────────────────
    # Helmet: analyse top 25% of person bbox for bright/safety colors
    helmet_confidence: float = 0.45
    helmet_brightness_threshold: int = 160   # Avg brightness in head region
    helmet_saturation_threshold: int = 40    # Min saturation for colored helmets

    # Jacket: analyse middle 40% of person bbox for high-vis colors
    jacket_confidence: float = 0.45
    jacket_highvis_hue_ranges: list[tuple[int, int]] = field(
        default_factory=lambda: [
            (10, 35),    # Orange / yellow
            (35, 85),    # Yellow-green / lime
        ]
    )
    jacket_min_highvis_ratio: float = 0.08   # 8% of torso must be high-vis

    # ── Idle Detection ───────────────────────────────────────────────
    idle_timeout_seconds: float = 20.0
    idle_movement_threshold_px: int = 30     # Max displacement = "idle"

    # ── Work Zones ───────────────────────────────────────────────────
    work_zones: list[WorkZoneDefinition] = field(default_factory=lambda: [
        WorkZoneDefinition(
            name="Maintenance Area",
            polygon=[(0.1, 0.1), (0.9, 0.1), (0.9, 0.9), (0.1, 0.9)],
        )
    ])

    # ── Safety Compliance ────────────────────────────────────────────
    safety_low_threshold: float = 70.0       # Below = LOW compliance
    safety_medium_threshold: float = 85.0    # Below = MEDIUM
    # Above medium_threshold = HIGH compliance

    # ── Alert thresholds ─────────────────────────────────────────────
    ppe_violation_alert_count: int = 1       # Alert after N violations
    idle_alert_after_seconds: float = 20.0

    # ── Output ───────────────────────────────────────────────────────
    output_dir: Path = Path("outputs")
