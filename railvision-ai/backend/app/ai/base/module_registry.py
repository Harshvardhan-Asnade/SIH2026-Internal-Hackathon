"""
RailVision AI — Module Registry (Singleton Orchestrator)

Discovers, initialises, and orchestrates all AI modules.

The registry is the *single entry-point* the rest of the backend uses
to interact with the AI engine.  It:

1.  Registers modules at startup.
2.  Initialises only the **enabled** modules.
3.  Runs all enabled modules on each frame during ``process_video``.
4.  Aggregates results from every module into a unified response.
"""

from __future__ import annotations

import logging
import time
from pathlib import Path
from typing import Any

import cv2

from app.ai.base.base_module import BaseAIModule, ModuleResult

logger = logging.getLogger(__name__)


class ModuleRegistry:
    """
    Singleton that holds every registered AI module.

    Usage
    -----
    >>> registry = ModuleRegistry.get_instance()
    >>> registry.register(PersonDetectionModule(...))
    >>> registry.initialize_all()
    >>> result = registry.process_video(input_path, output_path)
    """

    _instance: ModuleRegistry | None = None

    def __init__(self) -> None:
        self._modules: dict[str, BaseAIModule] = {}

    # ── Registration ─────────────────────────────────────────────────
    def register(self, module: BaseAIModule) -> None:
        """Register a module.  Overwrites if the same name exists."""
        self._modules[module.name] = module
        logger.info(
            "Registered module: %-20s  enabled=%s",
            module.name,
            module.is_enabled,
        )

    # ── Lifecycle ────────────────────────────────────────────────────
    def initialize_all(self) -> None:
        """Initialise (load weights) for every *enabled* module."""
        for name, module in self._modules.items():
            if not module.is_enabled:
                logger.info("Skipping disabled module: %s", name)
                continue
            try:
                logger.info("Initialising module: %s …", name)
                module.initialize()
                logger.info("Module ready: %s", name)
            except Exception:
                logger.exception("Failed to initialise module: %s", name)

    # ── Queries ──────────────────────────────────────────────────────
    @property
    def modules(self) -> dict[str, BaseAIModule]:
        return self._modules

    @property
    def enabled_modules(self) -> dict[str, BaseAIModule]:
        return {k: v for k, v in self._modules.items() if v.is_enabled}

    def get_module(self, name: str) -> BaseAIModule | None:
        return self._modules.get(name)

    def is_ready(self) -> bool:
        """True if at least one enabled module is loaded."""
        return any(m.is_loaded for m in self._modules.values() if m.is_enabled)

    def get_status(self) -> dict[str, dict[str, Any]]:
        """Per-module status dict for the /health endpoint."""
        return {
            name: {
                "enabled": m.is_enabled,
                "loaded": m.is_loaded,
            }
            for name, m in self._modules.items()
        }

    # ── Video processing orchestrator ────────────────────────────────
    def process_video(
        self,
        input_path: Path,
        output_path: Path,
        confidence: float | None = None,
    ) -> dict[str, Any]:
        """
        Run **all enabled & loaded modules** on every frame of the video.

        Returns a unified dict containing:
        - Top-level stats (frames, processing_time, fps, video, detections)
        - Per-module results keyed by module name
        - Aggregated alerts list

        The top-level ``detections`` field mirrors ``person_detection``
        detections for backward compatibility with the existing frontend.
        """
        # Reset all modules
        for m in self._modules.values():
            m.reset()

        active = {
            name: m
            for name, m in self._modules.items()
            if m.is_enabled and m.is_loaded
        }

        # ── Open video ───────────────────────────────────────────────
        cap = cv2.VideoCapture(str(input_path))
        if not cap.isOpened():
            raise RuntimeError(f"Cannot open video: {input_path.name}")

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        src_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        if total_frames <= 0 or w <= 0 or h <= 0:
            cap.release()
            raise RuntimeError(f"Corrupted or empty video: {input_path.name}")

        fourcc = cv2.VideoWriter_fourcc(*"avc1")
        writer = cv2.VideoWriter(str(output_path), fourcc, src_fps, (w, h))
        if not writer.isOpened():
            cap.release()
            raise RuntimeError("Failed to create output video writer.")

        # ── Frame loop ───────────────────────────────────────────────
        frame_idx = 0
        t0 = time.perf_counter()

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            # Run every active module on this frame
            shared_context: dict[str, Any] = {}
            for _name, module in active.items():
                dets = module.process_frame(frame, frame_idx, shared_context)
                module._results.detections.extend(dets)
                shared_context[_name] = dets
                frame = module.draw_annotations(frame, dets)

            writer.write(frame)
            frame_idx += 1

            if frame_idx % 200 == 0:
                logger.info("  … registry: %d / %d frames", frame_idx, total_frames)

        elapsed = time.perf_counter() - t0
        cap.release()
        writer.release()

        proc_fps = round(frame_idx / elapsed, 2) if elapsed > 0 else 0.0

        logger.info(
            "Registry done — %d frames in %.2fs (%.1f FPS)",
            frame_idx, elapsed, proc_fps,
        )

        # ── Collect results from every module ────────────────────────
        module_results: dict[str, dict[str, Any]] = {}
        all_alerts: list[dict[str, Any]] = []

        for name, module in self._modules.items():
            result = module.get_results()
            module_results[name] = result.to_dict()

            # Collect alerts from this module
            for alert in result.alerts:
                all_alerts.append(
                    {
                        "severity": alert.severity,
                        "message": alert.message,
                        "module": alert.module,
                        "confidence": alert.confidence,
                        "timestamp": alert.timestamp,
                        "camera": alert.camera,
                        "location": alert.location,
                        **(alert.metadata or {}),
                    }
                )

        # ── Build backward-compatible top-level detections ───────────
        # Copy person_detection detections to top-level for frontend compat
        person_result = module_results.get("person_detection", {})
        top_level_detections = person_result.get("detections", [])

        return {
            # ── Original fields (backward compatible) ────────────────
            "status": "success",
            "video": output_path.name,
            "frames": frame_idx,
            "processing_time": round(elapsed, 2),
            "fps": proc_fps,
            "detections": top_level_detections,
            # ── New module-scoped results ─────────────────────────────
            "person_detection": module_results.get(
                "person_detection", {"enabled": False}
            ),
            "crowd_analysis": module_results.get(
                "crowd_analysis", {"enabled": False}
            ),
            "crime_detection": module_results.get(
                "crime_detection", {"enabled": False}
            ),
            "worker_monitoring": module_results.get(
                "worker_monitoring", {"enabled": False}
            ),
            "alerts": all_alerts,
        }

    # ── Singleton ────────────────────────────────────────────────────
    @classmethod
    def get_instance(cls) -> ModuleRegistry:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance


def get_module_registry() -> ModuleRegistry:
    """FastAPI dependency that returns the singleton registry."""
    return ModuleRegistry.get_instance()
