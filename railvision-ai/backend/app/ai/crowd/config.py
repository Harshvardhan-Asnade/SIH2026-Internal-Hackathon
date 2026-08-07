"""
RailVision AI — Crowd Analysis Module Configuration

All thresholds, feature toggles, and tuning parameters for the
crowd management pipeline.  Every value can be overridden from
the central ``Settings`` or per-request.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class CrowdAnalysisConfig:
    """Full configuration for the crowd-analysis module."""

    # ── Core ──────────────────────────────────────────────────────────
    enabled: bool = True
    frame_skip: int = 0               # 0 = process every frame

    # ── Platform Capacity ────────────────────────────────────────────
    max_platform_capacity: int = 200  # for occupancy % calculation

    # ── Feature toggles ──────────────────────────────────────────────
    enable_crowd_count: bool = True
    enable_density_estimation: bool = True
    enable_heatmap: bool = True
    enable_zone_counting: bool = True
    enable_crowd_risk: bool = True
    enable_alerts: bool = True

    # ── Density thresholds (number of people) ────────────────────────
    density_low_max: int = 50
    density_medium_max: int = 100
    density_high_max: int = 200
    # Above density_high_max ⇒ CRITICAL

    # ── Risk thresholds (number of people) ───────────────────────────
    risk_normal_max: int = 50
    risk_medium_max: int = 100
    risk_high_max: int = 200
    # Above risk_high_max ⇒ CRITICAL

    # ── Alert thresholds ─────────────────────────────────────────────
    alert_high_density_count: int = 60
    alert_critical_density_count: int = 100
    alert_congestion_count: int = 80
    alert_stampede_risk_count: int = 120

    # ── Heatmap ──────────────────────────────────────────────────────
    heatmap_opacity: float = 0.55
    heatmap_blur_kernel: int = 51     # Must be odd
    heatmap_decay: float = 0.97       # Per-frame decay factor

    # ── Zone counting ────────────────────────────────────────────────
    # Zones are proportional splits of frame height/width
    zone_vertical_splits: int = 3     # top, center, bottom
    zone_horizontal_splits: int = 3   # left, center, right

    # ── Output ───────────────────────────────────────────────────────
    output_dir: Path = Path("outputs")


