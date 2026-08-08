"""
RailVision AI — Enterprise Context Builder & Question Router (v2)

Builds optimized, comprehensive context prompts for Qwen 3.

KEY PRINCIPLES:
- ALWAYS include crowd, crime, worker, alerts, and recommendations
- Route questions to load EXTRA relevant reports on top of the base context
- Never send raw detections or trend arrays
- Target 1000-5000 high-quality tokens
- Save debug prompts for developer inspection
"""

import json
import re
import logging
from pathlib import Path
from datetime import datetime

from app.config import get_settings

logger = logging.getLogger(__name__)

# Global state to track the latest video processed
LATEST_VIDEO_ID = None


class QuestionRouter:
    """Classifies user questions into categories that determine which EXTRA reports to load."""

    ROUTES = {
        "crowd": [
            r"\b(how many people|crowd|density|occupancy|congestion|packed|busy|peak|heatmap|station capacity)\b",
        ],
        "crime": [
            r"\b(crime|criminal|fight|stolen|theft|intrusion|restricted|abandoned|suspicious|loiter|violence|attack)\b",
        ],
        "worker": [
            r"\b(worker|staff|helmet|jacket|safety|ppe|compliance|employee|labour|labor)\b",
        ],
        "frame": [
            r"\b(frame \d+|at \d+:\d+|happened at|timestamp|minute|second)\b",
        ],
        "object": [
            r"\b(person \d+|track \d+|object \d+|track id|follow|trace)\b",
        ],
        "report": [
            r"\b(report|executive|generate report|summary report|investigation report)\b",
        ],
        "recommend": [
            r"\b(recommend|suggestion|what should|advise|action|deploy)\b",
        ],
    }

    @staticmethod
    def route(query: str) -> str:
        q = query.lower()
        for category, patterns in QuestionRouter.ROUTES.items():
            for pattern in patterns:
                if re.search(pattern, q):
                    return category
        return "summary"


class ContextBuilder:
    """
    Builds optimized, comprehensive prompts for Qwen 3 from the Knowledge Base.

    Every prompt ALWAYS includes:
    - Executive summary
    - Crowd analysis summary
    - Crime analysis summary
    - Worker analysis summary
    - Alert summary
    - Recommendations

    Category-specific prompts ADD extra detail on top.
    """

    def __init__(self):
        self.settings = get_settings()

    def _load(self, video_id: str, filename: str) -> dict | list | None:
        path = self.settings.output_dir / video_id / "report" / filename
        if path.exists():
            try:
                with open(path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Failed to load {filename}: {e}")
        return None

    def _detect_latest_video(self) -> str | None:
        """Auto-detect the most recently processed video from the filesystem."""
        try:
            output_dir = self.settings.output_dir
            dirs = [d for d in output_dir.iterdir() if d.is_dir() and (d / "report").exists()]
            if dirs:
                latest = max(dirs, key=lambda x: x.stat().st_mtime)
                logger.info(f"Auto-detected latest video_id: {latest.name}")
                return latest.name
        except Exception as e:
            logger.error(f"Error detecting latest video: {e}")
        return None

    def build_prompt(self, query: str, video_id: str | None = None) -> str:
        """Build a comprehensive, structured prompt for Qwen 3."""
        vid = video_id or LATEST_VIDEO_ID or self._detect_latest_video()

        if not vid:
            return f"USER QUERY:\n{query}\n\nCONTEXT:\nNo video has been processed yet. Ask the user to upload and process a video first."

        # ── Load base reports (ALWAYS included) ──────────────────
        summary = self._load(vid, "summary.json") or {}
        crowd = self._load(vid, "crowd.json") or {}
        crime = self._load(vid, "crime.json") or {}
        worker = self._load(vid, "worker.json") or {}
        alerts = self._load(vid, "alerts.json") or []
        stats = self._load(vid, "statistics.json") or {}
        recommendations = self._load(vid, "recommendations.json") or []

        # ── Build the base context (always present) ──────────────
        context_sections = []

        # Executive Summary
        exec_sum = summary.get("executive_summary", "No executive summary available.")
        context_sections.append(f"=== EXECUTIVE SUMMARY ===\n{exec_sum}")

        # Crowd Analysis
        crowd_text = self._format_crowd(crowd)
        context_sections.append(f"=== CROWD ANALYSIS ===\n{crowd_text}")

        # Crime Analysis
        crime_text = self._format_crime(crime)
        context_sections.append(f"=== CRIME ANALYSIS ===\n{crime_text}")

        # Worker Monitoring
        worker_text = self._format_worker(worker)
        context_sections.append(f"=== WORKER MONITORING ===\n{worker_text}")

        # Alerts
        alert_text = self._format_alerts(alerts)
        context_sections.append(f"=== ALERTS ({len(alerts)} total) ===\n{alert_text}")

        # Statistics
        stats_text = "\n".join(f"- {k}: {v}" for k, v in stats.items()) if stats else "No statistics available."
        context_sections.append(f"=== STATISTICS ===\n{stats_text}")

        # Recommendations
        rec_text = self._format_recommendations(recommendations)
        context_sections.append(f"=== RECOMMENDATIONS ===\n{rec_text}")

        # ── Load EXTRA category-specific data ────────────────────
        category = QuestionRouter.route(query)
        logger.info(f"Query category: '{category}' for: '{query}'")

        extra_sections = []

        if category == "crowd":
            # Add zone breakdown and trend info
            zones = crowd.get("zones", {})
            zones_h = crowd.get("zones_horizontal", {})
            if zones or zones_h:
                zone_text = f"Vertical zones: {json.dumps(zones)}\nHorizontal zones: {json.dumps(zones_h)}"
                extra_sections.append(f"=== CROWD ZONE BREAKDOWN ===\n{zone_text}")

        elif category == "crime":
            # Add incident details
            details = crime.get("incident_details", [])
            if details:
                detail_text = "\n".join(
                    f"- [{d.get('risk', 'N/A')}] {d.get('type', 'N/A')} at {d.get('time', 'N/A')} (conf: {d.get('confidence', 0):.2f})"
                    for d in details[:15]
                )
                extra_sections.append(f"=== CRIME INCIDENT DETAILS ===\n{detail_text}")

        elif category == "worker":
            # Add individual worker details
            workers_list = worker.get("workers", [])
            if workers_list:
                w_text = "\n".join(
                    f"- Worker {w.get('id', '?')}: Helmet={'Yes' if w.get('helmet') else 'No'}, Jacket={'Yes' if w.get('jacket') else 'No'}"
                    for w in workers_list[:15]
                )
                extra_sections.append(f"=== INDIVIDUAL WORKERS ===\n{w_text}")

        elif category == "frame":
            timeline = self._load(vid, "timeline.json") or []
            if timeline:
                tl_text = "\n".join(
                    f"- [{e.get('severity', 'N/A')}] {e.get('description', 'N/A')} at frame {e.get('frame', '?')} ({e.get('time', '?')})"
                    for e in timeline[:20]
                )
                extra_sections.append(f"=== TIMELINE ===\n{tl_text}")

        elif category == "object":
            objects = self._load(vid, "objects.json") or []
            if objects:
                obj_text = "\n".join(
                    f"- {o.get('class', 'object')} #{o.get('object_id', '?')}: first seen {o.get('first_seen_time', '?')}, last seen {o.get('last_seen_time', '?')}, duration {o.get('duration_seconds', 0)}s"
                    for o in objects[:25]
                )
                extra_sections.append(f"=== TRACKED OBJECTS ({len(objects)} total) ===\n{obj_text}")

        elif category == "report":
            events = self._load(vid, "events.json") or []
            timeline = self._load(vid, "timeline.json") or []
            if events:
                evt_text = "\n".join(
                    f"- [{e.get('severity', 'N/A')}] {e.get('description', 'N/A')} at {e.get('time', '?')}"
                    for e in events[:15]
                )
                extra_sections.append(f"=== EVENTS ===\n{evt_text}")
            if timeline:
                tl_text = "\n".join(
                    f"- [{t.get('severity', 'N/A')}] {t.get('description', 'N/A')} at {t.get('time', '?')}"
                    for t in timeline[:15]
                )
                extra_sections.append(f"=== TIMELINE ===\n{tl_text}")

        elif category == "recommend":
            # Recommendations already in base context; add events for reasoning
            events = self._load(vid, "events.json") or []
            if events:
                evt_text = "\n".join(
                    f"- [{e.get('severity', 'N/A')}] {e.get('description', 'N/A')}"
                    for e in events[:10]
                )
                extra_sections.append(f"=== EVENTS ===\n{evt_text}")

        else:
            # "summary" — add events and timeline
            events = self._load(vid, "events.json") or []
            timeline = self._load(vid, "timeline.json") or []
            if events:
                evt_text = "\n".join(
                    f"- [{e.get('severity', 'N/A')}] {e.get('description', 'N/A')} at {e.get('time', '?')}"
                    for e in events[:10]
                )
                extra_sections.append(f"=== EVENTS ===\n{evt_text}")
            if timeline:
                tl_text = "\n".join(
                    f"- {t.get('description', 'N/A')} at {t.get('time', '?')}"
                    for t in timeline[:10]
                )
                extra_sections.append(f"=== TIMELINE ===\n{tl_text}")

        # ── Assemble final prompt ────────────────────────────────
        all_context = "\n\n".join(context_sections + extra_sections)

        prompt = (
            f"You are the RailVision AI Master — an enterprise AI railway investigation assistant.\n"
            f"You have been provided with COMPLETE AI analysis data from a processed CCTV video.\n"
            f"Use ALL of the following investigation data to answer the user's question.\n"
            f"Never say you only have metadata. You have the full analysis.\n"
            f"Produce detailed, professional, actionable intelligence.\n\n"
            f"--- INVESTIGATION DATA START ---\n\n"
            f"{all_context}\n\n"
            f"--- INVESTIGATION DATA END ---\n\n"
            f"USER QUESTION: {query}\n\n"
            f"Respond with a detailed, structured answer using the investigation data above."
        )

        # ── DEBUG: Save prompt for inspection ────────────────────
        self._save_debug(vid, query, category, prompt, context_sections, extra_sections)

        return prompt

    # ── Formatting Helpers ───────────────────────────────────────────

    def _format_crowd(self, crowd: dict) -> str:
        if not crowd or not crowd.get("enabled"):
            return "Crowd analysis was not enabled for this video."
        lines = [
            f"Current People: {crowd.get('current_people', 0)}",
            f"Average People: {crowd.get('average_people', 0)}",
            f"Maximum People: {crowd.get('maximum_people', 0)}",
            f"Minimum People: {crowd.get('minimum_people', 0)}",
            f"Peak Time: {crowd.get('peak_time', 'N/A')} (frame {crowd.get('peak_frame', 0)})",
            f"Density: {crowd.get('density', 'N/A')}",
            f"Occupancy: {crowd.get('occupancy_percentage', 0)}%",
            f"Risk Level: {crowd.get('risk', 'NORMAL')} (score: {crowd.get('risk_score', 0)})",
            f"Total Detections: {crowd.get('total_detections', 0)}",
        ]
        if crowd.get("alerts"):
            lines.append(f"Crowd Alerts ({len(crowd['alerts'])}):")
            for a in crowd["alerts"][:5]:
                lines.append(f"  - [{a.get('severity', 'N/A')}] {a.get('message', 'N/A')} at {a.get('time', 'N/A')}")
        return "\n".join(lines)

    def _format_crime(self, crime: dict) -> str:
        if not crime or not crime.get("enabled"):
            return "Crime detection was not enabled for this video."
        lines = [
            f"Total Incidents: {crime.get('total_incidents', 0)}",
            f"Critical Incidents: {crime.get('critical_incidents', 0)}",
            f"High Incidents: {crime.get('high_incidents', 0)}",
            f"Tracked Persons: {crime.get('tracked_persons', 0)}",
        ]
        by_type = crime.get("incidents_by_type", {})
        if by_type:
            lines.append("Incidents by Type:")
            for cat, count in by_type.items():
                lines.append(f"  - {cat.replace('_', ' ').title()}: {count}")
        if crime.get("alerts"):
            lines.append(f"Crime Alerts ({len(crime['alerts'])}):")
            for a in crime["alerts"][:5]:
                lines.append(f"  - [{a.get('severity', 'N/A')}] {a.get('message', 'N/A')} at {a.get('time', 'N/A')}")
        if not by_type and crime.get("total_incidents", 0) == 0:
            lines.append("No criminal incidents detected in this video.")
        return "\n".join(lines)

    def _format_worker(self, worker: dict) -> str:
        if not worker or not worker.get("enabled"):
            return "Worker monitoring was not enabled for this video."
        lines = [
            f"Total Workers Detected: {worker.get('total_workers', 0)}",
            f"Helmet Compliance: {worker.get('helmet_compliance', 100)}%",
            f"Jacket Compliance: {worker.get('jacket_compliance', 100)}%",
            f"Overall Safety Score: {worker.get('overall_safety', 100)}%",
        ]
        if worker.get("total_workers", 0) == 0:
            lines.append("No railway workers detected in this video.")
        return "\n".join(lines)

    def _format_alerts(self, alerts: list) -> str:
        if not alerts:
            return "No alerts generated during video analysis."
        lines = []
        for a in alerts[:10]:
            lines.append(f"- [{a.get('severity', 'N/A')}] {a.get('message', 'N/A')} at {a.get('time', 'N/A')} (source: {a.get('source', 'N/A')})")
        if len(alerts) > 10:
            lines.append(f"  ... and {len(alerts) - 10} more alerts")
        return "\n".join(lines)

    def _format_recommendations(self, recs: list) -> str:
        if not recs:
            return "No specific recommendations."
        lines = []
        for r in recs[:8]:
            lines.append(f"- [{r.get('priority', 'N/A')}] {r.get('action', 'N/A')} — {r.get('reason', 'N/A')}")
        return "\n".join(lines)

    # ── DEBUG ────────────────────────────────────────────────────────

    def _save_debug(self, video_id, query, category, prompt, base_sections, extra_sections):
        """Save the generated prompt and context metadata for developer inspection."""
        try:
            debug_dir = self.settings.output_dir / video_id / "report"
            debug_dir.mkdir(parents=True, exist_ok=True)

            # Save the full prompt
            (debug_dir / "debug_prompt.md").write_text(
                f"# Debug: Generated Prompt\n\n"
                f"**Query:** {query}\n"
                f"**Category:** {category}\n"
                f"**Timestamp:** {datetime.utcnow().isoformat()}\n"
                f"**Token estimate:** ~{len(prompt.split())} words\n\n"
                f"---\n\n"
                f"```\n{prompt}\n```\n",
                encoding="utf-8"
            )

            # Save context metadata
            context_used = {
                "video_id": video_id,
                "query": query,
                "category": category,
                "timestamp": datetime.utcnow().isoformat(),
                "base_sections_count": len(base_sections),
                "extra_sections_count": len(extra_sections),
                "prompt_word_count": len(prompt.split()),
                "prompt_char_count": len(prompt),
            }
            with open(debug_dir / "context_used.json", "w") as f:
                json.dump(context_used, f, indent=2)

        except Exception as e:
            logger.error(f"Failed to save debug info: {e}")
