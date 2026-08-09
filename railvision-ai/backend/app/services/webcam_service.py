"""
RailVision AI — Webcam Service

Provides a stateful session manager for real-time webcam inference.
It runs a dedicated ModuleRegistry per session to ensure trackers (ByteTrack)
do not bleed across concurrent webcams or video uploads.
"""

from __future__ import annotations

import logging
import time
import cv2
import numpy as np
from typing import Any
import base64

from app.config import get_settings
from app.ai.base.module_registry import ModuleRegistry
from app.ai.person.config import PersonDetectionConfig
from app.ai.person.module import PersonDetectionModule
from app.ai.crowd.config import CrowdAnalysisConfig
from app.ai.crowd.module import CrowdAnalysisModule
from app.ai.crime.config import CrimeDetectionConfig
from app.ai.crime.module import CrimeDetectionModule
from app.ai.worker.config import WorkerMonitoringConfig
from app.ai.worker.module import WorkerMonitoringModule
from app.models.schemas import ProcessingResult

logger = logging.getLogger(__name__)

class WebcamSession:
    """
    A stateful session for processing live webcam frames.
    Maintains its own isolated AI ModuleRegistry.
    """
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.settings = get_settings()
        self.frame_idx = 0
        self.start_time = time.perf_counter()
        
        # Instantiate an isolated registry so tracker state doesn't leak
        self.registry = ModuleRegistry()
        
        # Initialize active modules
        # Person Detection
        person_cfg = PersonDetectionConfig(
            enabled=self.settings.enable_person_detection,
            model_path=self.settings.model_name,
            confidence=self.settings.model_confidence,
            iou_threshold=self.settings.model_iou_threshold,
            device=self.settings.model_device,
            weights_dir=self.settings.weights_dir,
            imgsz=640,
            frame_skip=0,
        )
        self.registry.register(PersonDetectionModule(person_cfg))

        # Crowd Analysis
        crowd_cfg = CrowdAnalysisConfig(
            enabled=self.settings.enable_crowd_analysis,
            output_dir=self.settings.output_dir,
        )
        self.registry.register(CrowdAnalysisModule(crowd_cfg))

        # Crime Detection
        crime_cfg = CrimeDetectionConfig(
            enabled=self.settings.enable_crime_detection,
            output_dir=self.settings.output_dir,
        )
        self.registry.register(CrimeDetectionModule(crime_cfg))

        # Worker Monitoring
        worker_cfg = WorkerMonitoringConfig(
            enabled=self.settings.enable_worker_monitoring,
        )
        self.registry.register(WorkerMonitoringModule(worker_cfg))

        # Load weights
        self.registry.initialize_all()
        
        self.last_dets = {}
        
    def process_frame(self, frame_bytes: bytes) -> dict[str, Any]:
        """
        Process a single JPEG frame, return the annotated base64 image
        and canonical processing stats.
        """
        t0 = time.perf_counter()
        
        # Decode JPEG bytes to OpenCV frame
        np_arr = np.frombuffer(frame_bytes, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if frame is None:
            return {"error": "Failed to decode frame"}
            
        active_modules = {
            name: m for name, m in self.registry._modules.items()
            if m.is_enabled and m.is_loaded
        }
        
        shared_context: dict[str, Any] = {}
        
        # Always run YOLO for tracking stability
        if "person_detection" in active_modules:
            person_module = active_modules["person_detection"]
            dets = person_module.process_frame(frame, self.frame_idx, shared_context)
            person_module._results.detections.extend(dets)
            shared_context["person_detection"] = dets
            self.last_dets["person_detection"] = dets
            frame = person_module.draw_annotations(frame, dets)
            
        # Throttle expensive analytics (run every 3 received frames)
        analytics_skip = 3
        if self.frame_idx % analytics_skip == 0:
            for _name, module in active_modules.items():
                if _name == "person_detection": continue
                dets = module.process_frame(frame, self.frame_idx, shared_context)
                module._results.detections.extend(dets)
                shared_context[_name] = dets
                self.last_dets[_name] = dets
                frame = module.draw_annotations(frame, dets)
        else:
            # Skip inference, use cached detections
            for _name, module in active_modules.items():
                if _name == "person_detection": continue
                if _name in self.last_dets:
                    frame = module.draw_annotations(frame, self.last_dets[_name])
                    
        self.frame_idx += 1
        elapsed = time.perf_counter() - self.start_time
        proc_time = time.perf_counter() - t0
        
        # Encode annotated frame back to JPEG base64
        _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
        b64_img = base64.b64encode(buffer).decode('utf-8')
        
        # Collect live stats
        module_results = {}
        all_alerts = []
        for name, module in self.registry._modules.items():
            res = module.get_results().to_dict()
            module_results[name] = res
            all_alerts.extend(res.get("alerts", []))
            
        person_result = module_results.get("person_detection", {})
        top_level_detections = person_result.get("detections", [])
        
        return {
            "status": "success",
            "frame_idx": self.frame_idx,
            "ai_fps": proc_time, # Will be inverted on frontend
            "image": b64_img,
            "detections": top_level_detections,
            "person_detection": module_results.get("person_detection", {"enabled": False}),
            "crowd_analysis": module_results.get("crowd_analysis", {"enabled": False}),
            "crime_detection": module_results.get("crime_detection", {"enabled": False}),
            "worker_monitoring": module_results.get("worker_monitoring", {"enabled": False}),
            "alerts": all_alerts,
        }
        
    def generate_snapshot(self) -> ProcessingResult:
        """
        Generate a canonical ProcessingResult snapshot for Qwen.
        """
        elapsed = time.perf_counter() - self.start_time
        proc_fps = round(self.frame_idx / elapsed, 2) if elapsed > 0 else 0.0
        
        module_results = {}
        all_alerts = []
        for name, module in self.registry._modules.items():
            res = module.get_results().to_dict()
            module_results[name] = res
            all_alerts.extend(res.get("alerts", []))
            
        person_result = module_results.get("person_detection", {})
        top_level_detections = person_result.get("detections", [])
        
        raw_result = {
            "status": "success",
            "video": f"webcam_{self.session_id}",
            "frames": self.frame_idx,
            "processing_time": round(elapsed, 2),
            "fps": proc_fps,
            "detections": top_level_detections,
            "person_detection": module_results.get("person_detection", {"enabled": False}),
            "crowd_analysis": module_results.get("crowd_analysis", {"enabled": False}),
            "crime_detection": module_results.get("crime_detection", {"enabled": False}),
            "worker_monitoring": module_results.get("worker_monitoring", {"enabled": False}),
            "alerts": all_alerts,
            "frame_metadata": []
        }
        return ProcessingResult(**raw_result)

class WebcamSessionManager:
    """Manages active webcam sessions."""
    def __init__(self):
        self.sessions: dict[str, WebcamSession] = {}
        
    def create_session(self, session_id: str) -> WebcamSession:
        if session_id in self.sessions:
            logger.warning(f"Session {session_id} already exists, recreating.")
        sess = WebcamSession(session_id)
        self.sessions[session_id] = sess
        return sess
        
    def get_session(self, session_id: str) -> WebcamSession | None:
        return self.sessions.get(session_id)
        
    def end_session(self, session_id: str):
        if session_id in self.sessions:
            del self.sessions[session_id]
            
webcam_manager = WebcamSessionManager()
