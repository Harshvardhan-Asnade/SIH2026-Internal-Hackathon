"""
RailVision AI — Crime Detection Module Configuration

All thresholds, zone definitions, feature toggles, and tuning
parameters for the Crime Prevention pipeline.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class ZoneDefinition:
    """A named polygon zone (normalised 0.0–1.0 coordinates)."""
    name: str
    # List of (x, y) tuples in normalised [0..1] space
    polygon: list[tuple[float, float]]


@dataclass
class CrimeDetectionConfig:
    """Full configuration for the crime-detection module."""

    # ── Core ──────────────────────────────────────────────────────────
    enabled: bool = True
    frame_skip: int = 0               # 0 = process every frame

    # ── Feature toggles ──────────────────────────────────────────────
    enable_track_intrusion: bool = True
    enable_restricted_area: bool = True
    enable_abandoned_bag: bool = True
    enable_loitering: bool = True
    enable_running_detection: bool = True
    enable_fight_detection: bool = True   # Architecture only

    # ── Track Intrusion ──────────────────────────────────────────────
    # Default danger zone: bottom 30% of frame (simulates railway tracks)
    track_zones: list[ZoneDefinition] = field(default_factory=lambda: [
        ZoneDefinition(
            name="Railway Track",
            polygon=[(0.0, 0.75), (1.0, 0.75), (1.0, 1.0), (0.0, 1.0)],
        )
    ])
    track_intrusion_min_frames: int = 3    # Must be inside for N frames

    # ── Restricted Areas ─────────────────────────────────────────────
    restricted_zones: list[ZoneDefinition] = field(default_factory=lambda: [
        ZoneDefinition(
            name="Control Room",
            polygon=[(0.0, 0.0), (0.15, 0.0), (0.15, 0.25), (0.0, 0.25)],
        )
    ])
    restricted_area_min_frames: int = 2

    # ── Abandoned Baggage ────────────────────────────────────────────
    baggage_classes: list[str] = field(default_factory=lambda: [
        "suitcase", "backpack", "handbag",
    ])
    baggage_unattended_seconds: float = 10.0    # Time before alert
    baggage_owner_distance_px: int = 150        # Max pixel distance to owner
    baggage_min_confidence: float = 0.35

    # ── Loitering ────────────────────────────────────────────────────
    loitering_seconds: float = 15.0             # Time in same area
    loitering_radius_px: int = 80               # Pixel radius = "same area"
    loitering_min_confidence: float = 0.40

    # ── Running / Panic ──────────────────────────────────────────────
    running_speed_threshold_px: float = 25.0    # Pixels per frame
    running_min_persons: int = 3                # Min simultaneous runners
    panic_directional_threshold: float = 0.7    # 70% running same direction

    # ── Fight Detection (placeholder) ────────────────────────────────
    fight_proximity_px: int = 60                # Closeness threshold
    fight_min_confidence: float = 0.50

    # ── Alert confidence floor ───────────────────────────────────────
    alert_min_confidence: float = 0.40

    # ── Output ───────────────────────────────────────────────────────
    output_dir: Path = Path("outputs")
