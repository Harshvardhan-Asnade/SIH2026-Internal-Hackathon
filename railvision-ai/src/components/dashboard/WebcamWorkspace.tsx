"use client";

import { useEffect, useRef, useState } from "react";
import { useWorkspaceStore } from "@/lib/store";
import { startWebcamSession, WS_BASE_URL } from "@/lib/api-service";
import { Loader2, VideoOff } from "lucide-react";
import type { ProcessingResult } from "@/lib/api-types";
import FallWarningOverlay from "./FallWarningOverlay";

export function WebcamWorkspace() {
  const {
    isWebcamActive,
    webcamSessionId,
    setWebcamSessionId,
    setProcessingResult,
    setIsWebcamActive,
  } = useWorkspaceStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [permissionState, setPermissionState] = useState<"IDLE" | "REQUESTING" | "GRANTED" | "DENIED" | "ERROR">("IDLE");
  const [errorMsg, setErrorMsg] = useState("");
  const [isWebSocketReady, setIsWebSocketReady] = useState(false);
  const [stats, setStats] = useState({ camFps: 0, aiFps: 0, latency: 0 });

  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef<number>(0);
  const lastSentTimeRef = useRef<number>(0);
  const isProcessingFrameRef = useRef(false);

  // 1. Initialize Camera
  const startCamera = async () => {
    setPermissionState("REQUESTING");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setPermissionState("GRANTED");
      
      // 2. Start Backend Session
      const { session_id } = await startWebcamSession();
      setWebcamSessionId(session_id);
      
    } catch (err: unknown) {
      console.error("Camera error:", err);
      if (err instanceof Error && err.name === "NotAllowedError") {
        setPermissionState("DENIED");
      } else {
        setPermissionState("ERROR");
        setErrorMsg(err instanceof Error ? err.message : "Failed to access camera");
      }
    }
  };

  // 3. Initialize WebSocket
  useEffect(() => {
    if (!webcamSessionId || permissionState !== "GRANTED") return;
    
    const wsUrl = `${WS_BASE_URL}/ws/webcam/${webcamSessionId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsWebSocketReady(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status === "success") {
          // Calculate Latency
          const latency = performance.now() - lastSentTimeRef.current;
          
          // Update Stats
          const currentAiFps = data.ai_fps > 0 ? (1 / data.ai_fps).toFixed(1) : "0";
          setStats(s => ({ ...s, aiFps: parseFloat(currentAiFps), latency: Math.round(latency) }));
          
          // Draw image
          if (data.image && displayCanvasRef.current) {
            const ctx = displayCanvasRef.current.getContext("2d");
            const img = new Image();
            img.onload = () => {
              if (ctx && displayCanvasRef.current) {
                displayCanvasRef.current.width = img.width;
                displayCanvasRef.current.height = img.height;
                ctx.drawImage(img, 0, 0, displayCanvasRef.current.width, displayCanvasRef.current.height);
              }
            };
            img.src = `data:image/jpeg;base64,${data.image}`;
          }
          
          // Update Store with Live Stats
          const resultObj: ProcessingResult = {
            status: "success",
            video: `webcam_${webcamSessionId}`,
            frames: data.frame_idx,
            processing_time: 0,
            fps: parseFloat(currentAiFps),
            detections: data.detections || [],
            person_detection: data.person_detection,
            crowd_analysis: data.crowd_analysis,
            crime_detection: data.crime_detection,
            worker_monitoring: data.worker_monitoring,
            alerts: data.alerts || [],
            ai_master_report: useWorkspaceStore.getState().processingResult?.ai_master_report
          };
          setProcessingResult(resultObj);
          
          // Trigger Fall Warning if applicable
          if (data.alerts) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data.alerts.forEach((alert: any) => {
              if (alert.event_type === "FALL_DETECTED" && alert.status === "ACTIVE") {
                useWorkspaceStore.getState().triggerFallWarning(alert);
              }
            });
          }
        }
      } catch (e) {
        console.error("WebSocket message error", e);
      } finally {
        isProcessingFrameRef.current = false;
      }
    };

    ws.onerror = (e) => {
      console.error("WebSocket Error", e);
      setIsWebSocketReady(false);
    };

    ws.onclose = () => {
      setIsWebSocketReady(false);
    };

    return () => {
      ws.close();
    };
  }, [webcamSessionId, permissionState, setProcessingResult]);

  // 4. Capture & Send Frame Loop
  useEffect(() => {
    if (!isWebSocketReady || !wsRef.current || permissionState !== "GRANTED") return;
    
    let animationFrameId: number;
    let lastCaptureTime = 0;
    const captureInterval = 1000 / 30; // Max 30fps capture rate
    
    const sendFrame = (timestamp: number) => {
      animationFrameId = requestAnimationFrame(sendFrame);
      
      // Calculate Cam FPS
      frameCountRef.current++;
      const elapsed = performance.now() - lastTimeRef.current;
      if (elapsed >= 1000) {
        setStats(s => ({ ...s, camFps: Math.round((frameCountRef.current * 1000) / elapsed) }));
        frameCountRef.current = 0;
        lastTimeRef.current = performance.now();
      }

      if (timestamp - lastCaptureTime < captureInterval) return;
      if (isProcessingFrameRef.current) return; // Backpressure: wait for previous frame

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState >= video.HAVE_CURRENT_DATA) {
        lastCaptureTime = timestamp;
        
        // Scale to 640px wide for AI latency processing
        const targetWidth = 640;
        const scale = targetWidth / video.videoWidth;
        canvas.width = targetWidth;
        canvas.height = video.videoHeight * scale;
        
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Lock BEFORE the async toBlob call!
          isProcessingFrameRef.current = true;
          lastSentTimeRef.current = performance.now();
          
          // Extract JPEG blob (quality 0.6 for lower latency payload) and send
          canvas.toBlob((blob) => {
            if (blob && wsRef.current?.readyState === WebSocket.OPEN) {
              blob.arrayBuffer().then(buffer => {
                 wsRef.current?.send(buffer);
              }).catch(() => {
                 isProcessingFrameRef.current = false;
              });
            } else {
              isProcessingFrameRef.current = false;
            }
          }, "image/jpeg", 0.6);
        }
      }
    };

    animationFrameId = requestAnimationFrame(sendFrame);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isWebSocketReady, permissionState]);

  // 5. Cleanup completely on unmount or when stopped
  useEffect(() => {
    if (!isWebcamActive) {
       if (streamRef.current) {
         streamRef.current.getTracks().forEach(t => t.stop());
         streamRef.current = null;
       }
       if (wsRef.current) {
         wsRef.current.close();
         wsRef.current = null;
       }
       setWebcamSessionId(null);
       setTimeout(() => setPermissionState("IDLE"), 0);
    }
  }, [isWebcamActive, setWebcamSessionId]);
  
  useEffect(() => {
    if (isWebcamActive && permissionState === "IDLE") {
       setTimeout(() => startCamera(), 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWebcamActive]);


  return (
    <div className="w-full h-full relative bg-black flex items-center justify-center rounded-xl overflow-hidden border border-[var(--border)] shadow-2xl">
      
      {/* Hidden elements for capture */}
      <video ref={videoRef} playsInline muted className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      {/* Main Display */}
      {permissionState === "IDLE" || permissionState === "REQUESTING" ? (
        <div className="flex flex-col items-center justify-center space-y-4">
           {permissionState === "REQUESTING" ? (
             <>
               <Loader2 className="w-12 h-12 text-[var(--accent)] animate-spin mb-4" />
               <h3 className="text-xl font-medium text-[var(--text-1)] tracking-wide">Requesting Camera Access</h3>
               <p className="text-sm text-[var(--text-2)]">Please allow camera permissions in your browser.</p>
             </>
           ) : null}
        </div>
      ) : permissionState === "DENIED" || permissionState === "ERROR" ? (
        <div className="flex flex-col items-center justify-center space-y-4 max-w-md text-center p-6 bg-[var(--surface)] rounded-2xl border border-red-500/20">
           <VideoOff className="w-12 h-12 text-red-500 mb-2" />
           <h3 className="text-lg font-medium text-red-500">Camera Access Denied</h3>
           <p className="text-[13px] text-[var(--text-2)] leading-relaxed">
             {errorMsg || "You must allow camera permissions to use Webcam Live Analysis. Please update your browser settings and try again."}
           </p>
           <button 
             onClick={() => setIsWebcamActive(false)}
             className="mt-4 px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-[var(--border-h)] rounded-lg text-sm text-[var(--text-1)] font-medium transition-colors"
           >
             Cancel
           </button>
        </div>
      ) : (
        <>
          {/* Output Canvas */}
          <canvas 
            ref={displayCanvasRef} 
            className="w-full h-full object-contain"
          />
          
          <FallWarningOverlay />
          
          {/* Live Overlay HUD */}
          <div className="absolute top-5 left-5 flex gap-3 z-30">
             <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-sm border border-[var(--accent)]/30 shadow-md">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse shadow-[0_0_8px_var(--accent)]" />
                <span className="text-[9px] font-mono text-[var(--accent)] tracking-widest uppercase">LIVE ANALYSIS</span>
             </div>
             
             {isWebSocketReady && (
               <div className="flex gap-2">
                 <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-sm border border-white/10 shadow-md">
                   <span className="text-[9px] font-mono text-white/50 uppercase tracking-widest">CAM FPS</span>
                   <span className="text-[9px] font-mono text-white tracking-widest">{stats.camFps}</span>
                 </div>
                 <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-sm border border-white/10 shadow-md">
                   <span className="text-[9px] font-mono text-white/50 uppercase tracking-widest">AI FPS</span>
                   <span className="text-[9px] font-mono text-white tracking-widest">{stats.aiFps}</span>
                 </div>
                 <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-sm border border-white/10 shadow-md">
                  <span className="text-[9px] font-mono text-white/50 uppercase tracking-widest">LATENCY</span>
                  <span className={`text-[9px] font-mono tracking-widest ${stats.latency < 500 ? 'text-[var(--accent)]' : stats.latency < 1000 ? 'text-[#FFC857]' : 'text-[#FF4D4D]'}`}>{stats.latency}ms</span>
                 </div>
               </div>
             )}
          </div>
          
          {!isWebSocketReady && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
               <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin mb-4" />
               <p className="text-sm font-medium text-[var(--text-1)] tracking-widest uppercase">Connecting AI Engine...</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
