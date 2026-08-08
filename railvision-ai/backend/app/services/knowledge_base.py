"""
RailVision AI — Enterprise Knowledge Base Builder (v2)

Converts raw ProcessingResult into optimized, persisted structured JSON reports
for fast LLM context retrieval.

KEY CHANGES from v1:
- Generates analysis.json, recommendations.json, processing.json
- Extracts inline alerts from crowd/crime/worker modules (not just top-level)
- Produces compressed crowd/crime/worker summaries (no raw detections)
- Builds rich timeline from all alert sources
- Generates a human-readable report.md
"""

import json
import logging
from pathlib import Path
from typing import Any
from datetime import datetime

from app.models.schemas import ProcessingResult
from app.config import get_settings

logger = logging.getLogger(__name__)


class KnowledgeBaseBuilder:
    """
    Enterprise AI Knowledge Base Builder.
    Converts raw ProcessingResult into optimized, persisted structured JSON reports
    for fast LLM context retrieval.
    """

    def __init__(self):
        self.settings = get_settings()

    def generate(self, video_id: str, result: ProcessingResult) -> None:
        """Generate and save all reports for a processed video."""
        report_dir = self.settings.output_dir / video_id / "report"
        report_dir.mkdir(parents=True, exist_ok=True)

        logger.info(f"Generating Knowledge Base for video {video_id} at {report_dir}")

        rd = result.model_dump(mode="json")
        fps = result.fps or 30.0
        total_frames = result.frames or 0

        # Extract module data safely
        crowd_raw = rd.get("crowd_analysis") or {}
        crime_raw = rd.get("crime_detection") or {}
        worker_raw = rd.get("worker_monitoring") or {}
        top_alerts = [a.model_dump(mode="json") for a in result.alerts] if result.alerts else []

        # ── 1. metadata.json ──────────────────────────────────────
        metadata = {
            "video_id": video_id,
            "processed_at": datetime.utcnow().isoformat(),
            "total_frames": total_frames,
            "fps": fps,
            "processing_time_seconds": round(result.processing_time, 2),
            "video_duration_seconds": round(total_frames / fps, 2) if fps > 0 else 0,
        }
        self._write(report_dir / "metadata.json", metadata)

        # ── 2. crowd.json (COMPRESSED — no raw detections) ────────
        crowd_summary = self._build_crowd_summary(crowd_raw, fps)
        self._write(report_dir / "crowd.json", crowd_summary)

        # ── 3. crime.json (COMPRESSED — no raw arrays) ────────────
        crime_summary = self._build_crime_summary(crime_raw, fps)
        self._write(report_dir / "crime.json", crime_summary)

        # ── 4. worker.json (COMPRESSED) ───────────────────────────
        worker_summary = self._build_worker_summary(worker_raw)
        self._write(report_dir / "worker.json", worker_summary)

        # ── 5. Unified alerts.json ────────────────────────────────
        all_alerts = self._collect_all_alerts(top_alerts, crowd_raw, crime_raw, worker_raw, fps)
        self._write(report_dir / "alerts.json", all_alerts)

        # ── 6. timeline.json ─────────────────────────────────────
        timeline = self._build_timeline(all_alerts)
        self._write(report_dir / "timeline.json", timeline)

        # ── 7. events.json ───────────────────────────────────────
        events = self._build_events(crime_raw, crowd_raw, worker_raw, fps)
        self._write(report_dir / "events.json", events)

        # ── 8. objects.json (Tracked entities — compressed) ──────
        objects = self._build_objects(result.detections, fps)
        self._write(report_dir / "objects.json", objects)

        # ── 9. keyframes.json ────────────────────────────────────
        keyframes = self._extract_keyframes(all_alerts, events, fps)
        self._write(report_dir / "keyframes.json", keyframes)

        # ── 10. statistics.json ──────────────────────────────────
        stats = {
            "total_objects_tracked": len(objects),
            "total_events": len(events),
            "total_alerts": len(all_alerts),
            "critical_alerts": len([a for a in all_alerts if a.get("severity", "").lower() == "critical"]),
            "high_alerts": len([a for a in all_alerts if a.get("severity", "").lower() == "high"]),
            "crowd_maximum": crowd_summary.get("maximum_people", 0),
            "crowd_average": crowd_summary.get("average_people", 0),
            "crowd_density": crowd_summary.get("density", "Unknown"),
            "crowd_risk": crowd_summary.get("risk", "Unknown"),
            "crime_total_incidents": crime_summary.get("total_incidents", 0),
            "worker_total": worker_summary.get("total_workers", 0),
            "worker_safety_score": worker_summary.get("overall_safety", 0),
            "processing_fps": fps,
            "video_duration_seconds": metadata["video_duration_seconds"],
        }
        self._write(report_dir / "statistics.json", stats)

        # ── 11. recommendations.json ─────────────────────────────
        recommendations = self._generate_recommendations(crowd_summary, crime_summary, worker_summary, all_alerts)
        self._write(report_dir / "recommendations.json", recommendations)

        # ── 12. analysis.json (Comprehensive merged analysis) ────
        analysis = {
            "crowd_analysis": crowd_summary,
            "crime_analysis": crime_summary,
            "worker_analysis": worker_summary,
            "risk_assessment": {
                "crowd_risk": crowd_summary.get("risk", "NORMAL"),
                "crime_risk": "HIGH" if crime_summary.get("total_incidents", 0) > 0 else "LOW",
                "worker_risk": "HIGH" if worker_summary.get("overall_safety", 100) < 80 else "LOW",
                "overall_risk": self._calculate_overall_risk(crowd_summary, crime_summary, worker_summary),
            },
            "statistics": stats,
        }
        self._write(report_dir / "analysis.json", analysis)

        # ── 13. summary.json (Executive brief) ───────────────────
        summary = {
            "video_id": video_id,
            "processed_at": metadata["processed_at"],
            "video_duration": f"{metadata['video_duration_seconds']:.1f}s ({total_frames} frames at {fps:.1f} FPS)",
            "processing_time": f"{result.processing_time:.1f}s",
            "executive_summary": self._build_executive_summary(crowd_summary, crime_summary, worker_summary, all_alerts, stats),
            "crowd_overview": f"Max {crowd_summary.get('maximum_people', 0)} people, Avg {crowd_summary.get('average_people', 0)}, Density: {crowd_summary.get('density', 'N/A')}, Risk: {crowd_summary.get('risk', 'N/A')}",
            "crime_overview": f"{crime_summary.get('total_incidents', 0)} incidents detected" + (f" ({crime_summary.get('critical_incidents', 0)} critical)" if crime_summary.get("critical_incidents") else ""),
            "worker_overview": f"{worker_summary.get('total_workers', 0)} workers, Safety: {worker_summary.get('overall_safety', 100)}%",
            "alert_overview": f"{len(all_alerts)} total alerts ({stats['critical_alerts']} critical, {stats['high_alerts']} high)",
            "top_alerts": all_alerts[:5],
            "top_events": events[:10],
            "recommendations": recommendations[:5],
        }
        self._write(report_dir / "summary.json", summary)

        # ── 14. processing.json ──────────────────────────────────
        processing = {
            "video_id": video_id,
            "modules_used": ["person_detection", "crowd_analysis", "crime_detection", "worker_monitoring"],
            "total_frames_processed": total_frames,
            "fps": fps,
            "processing_time_seconds": round(result.processing_time, 2),
            "frame_skip": self.settings.frame_skip,
            "model_confidence": self.settings.model_confidence,
        }
        self._write(report_dir / "processing.json", processing)

        # ── 15. report.md (Human-readable) ───────────────────────
        report_md = self._generate_report_md(summary, crowd_summary, crime_summary, worker_summary, all_alerts, events, recommendations)
        (report_dir / "report.md").write_text(report_md, encoding="utf-8")

        logger.info(f"Knowledge Base generation complete: {len(list(report_dir.iterdir()))} files generated for {video_id}")

    # ─── HELPERS ─────────────────────────────────────────────────────

    def _write(self, path: Path, data: Any) -> None:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, default=str)

    def _fmt_time(self, frame: int, fps: float) -> str:
        s = int(frame / (fps or 30))
        return f"{s // 60:02d}:{s % 60:02d}"

    # ── CROWD ────────────────────────────────────────────────────────

    def _build_crowd_summary(self, raw: dict, fps: float) -> dict:
        """Extract only the meaningful summary fields from crowd analysis."""
        return {
            "enabled": raw.get("enabled", False),
            "current_people": raw.get("current_people", 0),
            "average_people": raw.get("average_people", 0),
            "maximum_people": raw.get("maximum_people", 0),
            "minimum_people": raw.get("minimum_people", 0),
            "peak_frame": raw.get("peak_frame", 0),
            "peak_time": self._fmt_time(raw.get("peak_frame", 0), fps),
            "unique_people_tracked": raw.get("unique_people_tracked", 0),
            "density": raw.get("density", "Unknown"),
            "occupancy_percentage": raw.get("occupancy_percentage", 0),
            "risk": raw.get("risk", "NORMAL"),
            "risk_score": raw.get("risk_score", 0),
            "zones": raw.get("zones", {}),
            "zones_horizontal": raw.get("zones_horizontal", {}),
            "heatmap": raw.get("heatmap", None),
            "total_detections": len(raw.get("detections", [])),
            "alert_count": len(raw.get("alerts", [])),
            "alerts": [
                {
                    "message": a.get("message", ""),
                    "severity": a.get("severity", "Medium"),
                    "frame": a.get("frame", 0),
                    "time": self._fmt_time(a.get("frame", 0), fps),
                }
                for a in (raw.get("alerts") or [])
                if isinstance(a, dict)
            ],
        }

    # ── CRIME ────────────────────────────────────────────────────────

    def _build_crime_summary(self, raw: dict, fps: float) -> dict:
        """Extract crime summary with incident counts and details."""
        crime_categories = [
            "track_intrusion", "restricted_area", "abandoned_baggage",
            "loitering", "running_detection", "crowd_panic", "fight_detection"
        ]

        incidents_by_type = {}
        incident_details = []

        for cat in crime_categories:
            items = raw.get(cat, [])
            if isinstance(items, list) and len(items) > 0:
                incidents_by_type[cat] = len(items)
                for i, item in enumerate(items[:10]):  # Cap at 10 per category
                    if isinstance(item, dict):
                        frame = item.get("frame", 0)
                        incident_details.append({
                            "type": cat.replace("_", " ").title(),
                            "frame": frame,
                            "time": self._fmt_time(frame, fps),
                            "confidence": item.get("confidence", 0),
                            "risk": item.get("risk", "Medium"),
                            "details": item.get("details", item.get("message", "")),
                        })

        return {
            "enabled": raw.get("enabled", False),
            "total_incidents": raw.get("total_incidents", 0),
            "critical_incidents": raw.get("critical_incidents", 0),
            "high_incidents": raw.get("high_incidents", 0),
            "tracked_persons": raw.get("tracked_persons", 0),
            "incidents_by_type": incidents_by_type,
            "incident_details": incident_details[:20],  # Top 20 incidents
            "alert_count": len(raw.get("alerts", [])),
            "alerts": [
                {
                    "message": a.get("message", ""),
                    "severity": a.get("severity", "High"),
                    "frame": a.get("frame", 0),
                    "time": self._fmt_time(a.get("frame", 0), fps),
                }
                for a in (raw.get("alerts") or [])
                if isinstance(a, dict)
            ],
        }

    # ── WORKER ───────────────────────────────────────────────────────

    def _build_worker_summary(self, raw: dict) -> dict:
        stats = raw.get("statistics", {}) if isinstance(raw, dict) else {}
        workers = raw.get("workers", []) if isinstance(raw, dict) else []

        return {
            "enabled": raw.get("enabled", False) if isinstance(raw, dict) else False,
            "total_workers": stats.get("total_workers", len(workers)),
            "helmet_compliance": stats.get("helmet_compliance", 100),
            "jacket_compliance": stats.get("jacket_compliance", 100),
            "overall_safety": stats.get("overall_safety", 100),
            "workers": [
                {
                    "id": w.get("id", f"worker_{i}"),
                    "helmet": w.get("helmet", False),
                    "jacket": w.get("jacket", False),
                    "violations": w.get("violations", []),
                }
                for i, w in enumerate(workers[:20])
                if isinstance(w, dict)
            ],
            "alert_count": len(raw.get("alerts", [])) if isinstance(raw, dict) else 0,
            "alerts": [
                {
                    "message": a.get("message", ""),
                    "severity": a.get("severity", "Medium"),
                    "frame": a.get("frame", 0),
                }
                for a in (raw.get("alerts") or []) if isinstance(raw, dict)
                if isinstance(a, dict)
            ],
        }

    # ── UNIFIED ALERTS ───────────────────────────────────────────────

    def _collect_all_alerts(self, top_alerts, crowd_raw, crime_raw, worker_raw, fps) -> list:
        """Merge alerts from ALL sources: top-level + each module's inline alerts."""
        all_alerts = []

        # Top-level alerts
        for a in top_alerts:
            if isinstance(a, dict):
                a["source"] = a.get("module", "system")
                a["time"] = self._fmt_time(a.get("frame", 0), fps)
                all_alerts.append(a)

        # Crowd alerts
        for a in (crowd_raw.get("alerts") or []):
            if isinstance(a, dict):
                all_alerts.append({
                    "message": a.get("message", "Crowd alert"),
                    "severity": a.get("severity", "Medium"),
                    "frame": a.get("frame", 0),
                    "time": self._fmt_time(a.get("frame", 0), fps),
                    "source": "crowd_analysis",
                    "module": "crowd_analysis",
                })

        # Crime alerts
        for a in (crime_raw.get("alerts") or []):
            if isinstance(a, dict):
                all_alerts.append({
                    "message": a.get("message", "Crime alert"),
                    "severity": a.get("severity", "High"),
                    "frame": a.get("frame", 0),
                    "time": self._fmt_time(a.get("frame", 0), fps),
                    "source": "crime_detection",
                    "module": "crime_detection",
                })

        # Worker alerts
        for a in (worker_raw.get("alerts") or []) if isinstance(worker_raw, dict) else []:
            if isinstance(a, dict):
                all_alerts.append({
                    "message": a.get("message", "Worker alert"),
                    "severity": a.get("severity", "Medium"),
                    "frame": a.get("frame", 0),
                    "time": self._fmt_time(a.get("frame", 0), fps),
                    "source": "worker_monitoring",
                    "module": "worker_monitoring",
                })

        # Sort by severity priority then by frame
        severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        all_alerts.sort(key=lambda x: (severity_order.get(x.get("severity", "").lower(), 4), x.get("frame", 0)))

        return all_alerts

    # ── TIMELINE ─────────────────────────────────────────────────────

    def _build_timeline(self, all_alerts: list) -> list:
        """Build chronological timeline sorted by frame."""
        timeline = []
        for i, a in enumerate(all_alerts):
            timeline.append({
                "event_id": f"tl_{i}",
                "time": a.get("time", "00:00"),
                "frame": a.get("frame", 0),
                "severity": a.get("severity", "Medium"),
                "description": a.get("message", "Unknown event"),
                "source": a.get("source", "system"),
            })
        timeline.sort(key=lambda x: x.get("frame", 0))
        return timeline

    # ── EVENTS ───────────────────────────────────────────────────────

    def _build_events(self, crime_raw, crowd_raw, worker_raw, fps) -> list:
        """Build semantic events from module data."""
        events = []

        # Crowd events
        crowd_stats = crowd_raw.get("statistics", {}) if isinstance(crowd_raw, dict) else {}
        max_people = crowd_raw.get("maximum_people", 0) if isinstance(crowd_raw, dict) else 0
        if max_people > 0:
            peak_frame = crowd_raw.get("peak_frame", 0) if isinstance(crowd_raw, dict) else 0
            events.append({
                "event_id": "evt_crowd_peak",
                "type": "crowd_peak",
                "time": self._fmt_time(peak_frame, fps),
                "frame": peak_frame,
                "description": f"Peak crowd of {max_people} people detected",
                "severity": "High" if max_people > 30 else "Medium" if max_people > 15 else "Low",
            })

        density = crowd_raw.get("density", "LOW") if isinstance(crowd_raw, dict) else "LOW"
        if density not in ("LOW", "low"):
            events.append({
                "event_id": "evt_crowd_density",
                "type": "crowd_density_alert",
                "time": "00:00",
                "frame": 0,
                "description": f"Crowd density classified as {density}",
                "severity": "High" if density in ("HIGH", "CRITICAL") else "Medium",
            })

        # Crime events
        crime_categories = ["track_intrusion", "restricted_area", "abandoned_baggage", "loitering", "running_detection", "crowd_panic", "fight_detection"]
        if isinstance(crime_raw, dict):
            for cat in crime_categories:
                items = crime_raw.get(cat, [])
                if isinstance(items, list) and len(items) > 0:
                    events.append({
                        "event_id": f"evt_crime_{cat}",
                        "type": cat,
                        "time": self._fmt_time(items[0].get("frame", 0) if isinstance(items[0], dict) else 0, fps),
                        "frame": items[0].get("frame", 0) if isinstance(items[0], dict) else 0,
                        "description": f"{len(items)} {cat.replace('_', ' ').title()} incident(s) detected",
                        "severity": "Critical" if cat in ("track_intrusion", "fight_detection") else "High",
                        "count": len(items),
                    })

        # Worker events
        if isinstance(worker_raw, dict):
            w_stats = worker_raw.get("statistics", {})
            if w_stats.get("total_workers", 0) > 0:
                events.append({
                    "event_id": "evt_worker_summary",
                    "type": "worker_monitoring",
                    "time": "00:00",
                    "frame": 0,
                    "description": f"{w_stats.get('total_workers', 0)} workers detected. Safety: {w_stats.get('overall_safety', 100)}%",
                    "severity": "High" if w_stats.get("overall_safety", 100) < 80 else "Low",
                })

        return events

    # ── OBJECTS ───────────────────────────────────────────────────────

    def _build_objects(self, detections: list, fps: float) -> list:
        """Build compressed object tracking database from raw detections."""
        tracks = {}
        for det in detections:
            d = det.model_dump(mode="json") if hasattr(det, "model_dump") else det
            tid = d.get("track_id")
            if not tid:
                continue  # Skip untracked detections

            if tid not in tracks:
                tracks[tid] = {
                    "object_id": tid,
                    "class": d.get("class", "person"),
                    "first_seen_frame": d.get("frame", 0),
                    "last_seen_frame": d.get("frame", 0),
                    "first_seen_time": self._fmt_time(d.get("frame", 0), fps),
                    "detection_count": 0,
                }

            t = tracks[tid]
            t["last_seen_frame"] = max(t["last_seen_frame"], d.get("frame", 0))
            t["detection_count"] = t.get("detection_count", 0) + 1

        # Post-process: calculate durations
        for t in tracks.values():
            duration = (t["last_seen_frame"] - t["first_seen_frame"]) / (fps or 30)
            t["duration_seconds"] = round(duration, 2)
            t["last_seen_time"] = self._fmt_time(t["last_seen_frame"], fps)

        return list(tracks.values())

    # ── KEYFRAMES ────────────────────────────────────────────────────

    def _extract_keyframes(self, alerts, events, fps) -> list:
        frames = set()
        for a in alerts:
            if a.get("frame"):
                frames.add(a["frame"])
        for e in events:
            if e.get("frame"):
                frames.add(e["frame"])

        return [
            {"frame": f, "time": self._fmt_time(f, fps), "reason": "Alert or event"}
            for f in sorted(frames)
        ]

    # ── RECOMMENDATIONS ──────────────────────────────────────────────

    def _generate_recommendations(self, crowd, crime, worker, alerts) -> list:
        recs = []

        # Crowd recommendations
        max_p = crowd.get("maximum_people", 0)
        density = crowd.get("density", "LOW")
        if max_p > 30:
            recs.append({"priority": "Critical", "action": "Deploy additional RPF personnel to manage crowd", "reason": f"Peak crowd of {max_p} detected"})
        if density in ("HIGH", "CRITICAL"):
            recs.append({"priority": "High", "action": "Open additional entry/exit gates", "reason": f"Crowd density is {density}"})
            recs.append({"priority": "High", "action": "Increase PA system announcements", "reason": "High crowd density requires flow management"})
        elif max_p > 10:
            recs.append({"priority": "Medium", "action": "Monitor crowd closely via CCTV", "reason": f"Moderate crowd of {max_p} detected"})

        # Crime recommendations
        if crime.get("total_incidents", 0) > 0:
            recs.append({"priority": "Critical", "action": "Alert RPF immediately", "reason": f"{crime['total_incidents']} crime incidents detected"})
        for cat, count in crime.get("incidents_by_type", {}).items():
            if cat == "track_intrusion":
                recs.append({"priority": "Critical", "action": "Halt approaching trains and clear tracks", "reason": f"{count} track intrusion(s) detected"})
            elif cat == "fight_detection":
                recs.append({"priority": "Critical", "action": "Deploy RPF to intervene", "reason": f"{count} fight(s) detected"})
            elif cat == "abandoned_baggage":
                recs.append({"priority": "High", "action": "Deploy bomb disposal squad", "reason": f"{count} abandoned baggage case(s)"})

        # Worker recommendations
        if worker.get("overall_safety", 100) < 80:
            recs.append({"priority": "High", "action": "Issue safety compliance warning to workers", "reason": f"Safety score is only {worker['overall_safety']}%"})
        if worker.get("helmet_compliance", 100) < 100:
            recs.append({"priority": "Medium", "action": "Enforce helmet policy", "reason": f"Helmet compliance at {worker['helmet_compliance']}%"})

        # General recommendations if nothing detected
        if not recs:
            recs.append({"priority": "Low", "action": "Continue standard monitoring", "reason": "No significant incidents detected"})

        return recs

    # ── RISK ─────────────────────────────────────────────────────────

    def _calculate_overall_risk(self, crowd, crime, worker) -> str:
        score = 0
        if crowd.get("risk", "NORMAL") in ("HIGH", "CRITICAL"):
            score += 30
        if crowd.get("maximum_people", 0) > 30:
            score += 20
        if crime.get("total_incidents", 0) > 0:
            score += 30
        if crime.get("critical_incidents", 0) > 0:
            score += 20
        if worker.get("overall_safety", 100) < 80:
            score += 15

        if score >= 60:
            return "CRITICAL"
        elif score >= 40:
            return "HIGH"
        elif score >= 20:
            return "MEDIUM"
        return "LOW"

    # ── EXECUTIVE SUMMARY ────────────────────────────────────────────

    def _build_executive_summary(self, crowd, crime, worker, alerts, stats) -> str:
        parts = []
        parts.append(f"Video processed with {stats.get('total_objects_tracked', 0)} tracked objects over {stats.get('video_duration_seconds', 0):.0f} seconds.")

        if crowd.get("maximum_people", 0) > 0:
            parts.append(f"Crowd analysis: Maximum {crowd['maximum_people']} people, average {crowd.get('average_people', 0)}, density {crowd.get('density', 'N/A')}, risk level {crowd.get('risk', 'N/A')}.")

        if crime.get("total_incidents", 0) > 0:
            parts.append(f"Crime detection: {crime['total_incidents']} incidents detected ({crime.get('critical_incidents', 0)} critical).")
        else:
            parts.append("Crime detection: No incidents detected.")

        if worker.get("total_workers", 0) > 0:
            parts.append(f"Worker monitoring: {worker['total_workers']} workers, safety score {worker.get('overall_safety', 100)}%.")
        else:
            parts.append("Worker monitoring: No railway workers detected in this video.")

        parts.append(f"Total alerts: {len(alerts)} ({stats.get('critical_alerts', 0)} critical, {stats.get('high_alerts', 0)} high).")

        return " ".join(parts)

    # ── REPORT.MD ────────────────────────────────────────────────────

    def _generate_report_md(self, summary, crowd, crime, worker, alerts, events, recs) -> str:
        lines = [
            f"# RailVision AI — Investigation Report",
            f"",
            f"**Video ID:** {summary.get('video_id', 'N/A')}",
            f"**Processed:** {summary.get('processed_at', 'N/A')}",
            f"**Duration:** {summary.get('video_duration', 'N/A')}",
            f"",
            f"## Executive Summary",
            f"{summary.get('executive_summary', 'N/A')}",
            f"",
            f"## Crowd Analysis",
            f"- Maximum People: {crowd.get('maximum_people', 0)}",
            f"- Average People: {crowd.get('average_people', 0)}",
            f"- Density: {crowd.get('density', 'N/A')}",
            f"- Risk: {crowd.get('risk', 'N/A')}",
            f"- Peak Time: {crowd.get('peak_time', 'N/A')}",
            f"",
            f"## Crime Analysis",
            f"- Total Incidents: {crime.get('total_incidents', 0)}",
            f"- Critical: {crime.get('critical_incidents', 0)}",
        ]
        for cat, count in crime.get("incidents_by_type", {}).items():
            lines.append(f"- {cat.replace('_', ' ').title()}: {count}")
        lines += [
            f"",
            f"## Worker Monitoring",
            f"- Total Workers: {worker.get('total_workers', 0)}",
            f"- Safety Score: {worker.get('overall_safety', 100)}%",
            f"- Helmet Compliance: {worker.get('helmet_compliance', 100)}%",
            f"",
            f"## Alerts ({len(alerts)})",
        ]
        for a in alerts[:10]:
            lines.append(f"- [{a.get('severity', 'N/A')}] {a.get('message', 'N/A')} @ {a.get('time', 'N/A')}")
        lines += [
            f"",
            f"## Events ({len(events)})",
        ]
        for e in events[:10]:
            lines.append(f"- [{e.get('severity', 'N/A')}] {e.get('description', 'N/A')} @ {e.get('time', 'N/A')}")
        lines += [
            f"",
            f"## Recommendations",
        ]
        for r in recs[:10]:
            lines.append(f"- **[{r.get('priority', 'N/A')}]** {r.get('action', 'N/A')} — {r.get('reason', 'N/A')}")

        return "\n".join(lines)
