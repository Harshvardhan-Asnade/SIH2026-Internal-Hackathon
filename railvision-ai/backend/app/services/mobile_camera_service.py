"""
RailVision AI — Mobile Camera Service

Manages isolated sessions for mobile phone cameras.
Implements a strict Queue Size = 1 backpressure mechanism to guarantee
low latency by aggressively dropping older frames when the AI is busy.
"""

from __future__ import annotations

import logging
import asyncio
from fastapi import WebSocket, WebSocketDisconnect
from typing import Optional

from app.services.webcam_service import WebcamSession

logger = logging.getLogger(__name__)

class MobileCameraConnection:
    """
    Manages the state for a single Mobile Camera session.
    Bridges the phone (sender) and the laptop dashboard (receiver).
    """
    def __init__(self, session_id: str):
        self.session_id = session_id
        
        # WebSockets
        self.phone_ws: Optional[WebSocket] = None
        self.laptop_ws: Optional[WebSocket] = None
        
        # State
        self.is_streaming = False
        
        # Isolated AI engine (reuses the webcam architecture)
        self.ai_session = WebcamSession(session_id)
        
        # Strict Backpressure Queue (size = 1)
        # Prevents frame buffer bloat and ensures lowest latency.
        self.frame_queue: asyncio.Queue[bytes] = asyncio.Queue(maxsize=1)
        
        # Task for processing
        self.process_task: Optional[asyncio.Task] = None

    async def _process_loop(self):
        """Background loop to process frames from the queue."""
        logger.info(f"Mobile session {self.session_id} process loop started.")
        try:
            while self.is_streaming:
                frame_bytes = await self.frame_queue.get()
                
                # Push frame to AI engine
                # Offload to thread to prevent blocking asyncio loop
                res = await asyncio.to_thread(self.ai_session.process_frame, frame_bytes)
                
                # Send result to laptop dashboard if connected
                if self.laptop_ws:
                    try:
                        await self.laptop_ws.send_json(res)
                    except Exception as e:
                        logger.error(f"Failed to send result to laptop: {e}")
                
                self.frame_queue.task_done()
        except asyncio.CancelledError:
            logger.info(f"Mobile session {self.session_id} process loop cancelled.")
        except Exception as e:
            logger.exception(f"Error in mobile session {self.session_id} process loop.")

    def start_processing(self):
        self.is_streaming = True
        if self.process_task is None or self.process_task.done():
            self.process_task = asyncio.create_task(self._process_loop())

    def stop_processing(self):
        self.is_streaming = False
        if self.process_task:
            self.process_task.cancel()
            self.process_task = None
            
        # Empty queue
        while not self.frame_queue.empty():
            try:
                self.frame_queue.get_nowait()
                self.frame_queue.task_done()
            except asyncio.QueueEmpty:
                break

    def enqueue_frame(self, frame_bytes: bytes):
        """
        Push a frame. If queue is full, aggressively drop the old one.
        This guarantees processing the absolute freshest frame.
        """
        if self.frame_queue.full():
            try:
                self.frame_queue.get_nowait()
                self.frame_queue.task_done()
            except asyncio.QueueEmpty:
                pass
                
        try:
            self.frame_queue.put_nowait(frame_bytes)
        except asyncio.QueueFull:
            pass # Should not happen due to the logic above


class MobileCameraManager:
    """Global manager for all active mobile camera sessions."""
    def __init__(self):
        self.sessions: dict[str, MobileCameraConnection] = {}
        
    def get_session(self, session_id: str) -> MobileCameraConnection:
        if session_id not in self.sessions:
            logger.info(f"Creating new MobileCameraConnection for {session_id}")
            self.sessions[session_id] = MobileCameraConnection(session_id)
        return self.sessions[session_id]
        
    def end_session(self, session_id: str):
        if session_id in self.sessions:
            logger.info(f"Ending MobileCameraConnection for {session_id}")
            sess = self.sessions[session_id]
            sess.stop_processing()
            del self.sessions[session_id]

mobile_camera_manager = MobileCameraManager()
