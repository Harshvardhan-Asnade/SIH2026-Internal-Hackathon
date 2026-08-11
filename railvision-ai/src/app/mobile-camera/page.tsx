"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Camera, SwitchCamera, VideoOff, ShieldAlert } from "lucide-react";

// ── WebSocket URL for the phone ──────────────────────────────────────
// The phone MUST NOT connect to localhost — it needs the public/tunnel URL.
// NEXT_PUBLIC_API_URL should be the tunnel-exposed backend URL when using HTTPS mode.
// In LAN mode, it should be http://MAC_LAN_IP:8000.
function getPhoneWsBaseUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
  // Convert http(s):// → ws(s)://
  if (apiUrl.startsWith("https://")) return apiUrl.replace("https://", "wss://").replace(/\/$/, "");
  if (apiUrl.startsWith("http://")) return apiUrl.replace("http://", "ws://").replace(/\/$/, "");
  // Fallback: use the current page origin (works if the frontend URL was correct in the QR)
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    return origin.replace("https://", "wss://").replace("http://", "ws://");
  }
  return "ws://localhost:8000";
}

// User-friendly error messages for camera access failures
function getCameraErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) return "Unknown camera error. Please try again.";
  switch (err.name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return "Camera permission was denied. Please tap the camera icon in your browser's address bar and allow access, then refresh.";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "No camera found on this device. Please ensure a camera is available.";
    case "NotReadableError":
    case "TrackStartError":
      return "Camera is already in use by another app. Please close other apps using the camera and try again.";
    case "SecurityError":
      return "Camera access blocked by browser security policy. This page requires HTTPS to access the camera.";
    case "OverconstrainedError":
      return "Camera does not support the requested resolution. Trying a lower resolution.";
    default:
      return err.message || "Failed to access camera. Please check your browser permissions.";
  }
}

function MobileCameraView() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  
  const [permissionState, setPermissionState] = useState<"IDLE" | "REQUESTING" | "GRANTED" | "DENIED" | "ERROR" | "INSECURE">("IDLE");
  const [errorMsg, setErrorMsg] = useState("");
  const [wsState, setWsState] = useState<"CONNECTING" | "CONNECTED" | "DISCONNECTED" | "ERROR">("DISCONNECTED");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [isStreaming, setIsStreaming] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef<number | null>(null);
  const canSendFrameRef = useRef(true);

  // ── Security Context Check ────────────────────────────────────────
  // getUserMedia requires a secure context (HTTPS or localhost).
  // When opened via QR on a phone remotely, HTTP will fail on most browsers.
  useEffect(() => {
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setPermissionState("INSECURE");
    }
  }, []);

  const toggleCamera = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    if (streamRef.current) {
      stopCamera();
      setTimeout(() => startCameraWithMode(nextMode), 300);
    }
  };

  const startCameraWithMode = async (mode: "environment" | "user") => {
    setPermissionState("REQUESTING");
    setErrorMsg("");
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not available. This browser requires an HTTPS connection or localhost to access the camera.");
      }

      // Request 1280x720 from hardware, then downscale for AI to 640x360
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      setPermissionState("GRANTED");
      connectWebSocket();
    } catch (err: unknown) {
      console.error("Camera error:", err);
      const msg = getCameraErrorMessage(err);
      if (err instanceof Error && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")) {
        setPermissionState("DENIED");
      } else {
        setPermissionState("ERROR");
        setErrorMsg(err instanceof Error ? err.message : msg);
      }
    }
  };

  const startCamera = () => startCameraWithMode(facingMode);

  const stopCamera = () => {
    setIsStreaming(false);
    if (loopRef.current) cancelAnimationFrame(loopRef.current);
    loopRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setPermissionState("IDLE");
    setWsState("DISCONNECTED");
  };

  const connectWebSocket = () => {
    if (!sessionId) return;
    
    setWsState("CONNECTING");
    // ── CRITICAL: Use the public API URL, NOT localhost ──────────────
    const wsBase = getPhoneWsBaseUrl();
    const wsUrl = `${wsBase}/ws/mobile-camera/phone/${sessionId}`;
    console.log("[MobileCamera] Connecting to WS:", wsUrl);
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsState("CONNECTED");
      setIsStreaming(true);
      canSendFrameRef.current = true;
      requestAnimationFrame(captureAndSendFrame);
    };

    ws.onmessage = () => {
      // Backend ACK — unblock next frame
      canSendFrameRef.current = true;
    };

    ws.onclose = () => {
      setWsState("DISCONNECTED");
      setIsStreaming(false);
    };

    ws.onerror = () => {
      setWsState("ERROR");
      setIsStreaming(false);
    };
  };

  // Capture from video (at 1280x720) and downscale to 640x360 for AI
  const captureAndSendFrame = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (!videoRef.current || !canvasRef.current || !canSendFrameRef.current) {
      loopRef.current = requestAnimationFrame(captureAndSendFrame);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      loopRef.current = requestAnimationFrame(captureAndSendFrame);
      return;
    }

    // Downscale to 640x360 for transmission (saves ~75% bandwidth vs 1280x720)
    const TARGET_W = 640;
    const TARGET_H = Math.round(TARGET_W * (video.videoHeight / video.videoWidth));
    canvas.width = TARGET_W;
    canvas.height = TARGET_H;
    
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob && wsRef.current?.readyState === WebSocket.OPEN) {
          canSendFrameRef.current = false; // Block until ACK
          wsRef.current.send(blob);
        }
        loopRef.current = requestAnimationFrame(captureAndSendFrame);
      }, "image/jpeg", 0.65); // 65% JPEG — good quality/bandwidth balance
    } else {
      loopRef.current = requestAnimationFrame(captureAndSendFrame);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return stopCamera;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="bg-[#111] p-6 rounded-xl border border-red-500/20 text-center max-w-sm">
          <VideoOff className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Invalid Session</h1>
          <p className="text-sm text-gray-400">Please scan the QR code from the RailVision dashboard again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col overflow-hidden font-sans">
      {/* HEADER */}
      <div className="h-16 flex items-center justify-between px-6 bg-black/50 backdrop-blur-md z-20 border-b border-white/10 shrink-0">
        <div>
          <h1 className="font-bold tracking-widest text-[#B4FF29] text-sm">RAILVISION AI</h1>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest">Remote Surveillance Camera</p>
        </div>
        
        <div className="flex items-center gap-2 text-xs">
          {wsState === "CONNECTED" && (
            <span className="flex items-center gap-1.5 text-[#B4FF29] bg-[#B4FF29]/10 px-2 py-1 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B4FF29] animate-pulse" />
              LIVE
            </span>
          )}
          {wsState === "DISCONNECTED" && <span className="text-gray-500 text-[10px]">OFFLINE</span>}
          {wsState === "CONNECTING" && <span className="text-yellow-400 animate-pulse text-[10px]">CONNECTING...</span>}
          {wsState === "ERROR" && <span className="text-red-500 text-[10px]">WS ERROR</span>}
        </div>
      </div>

      {/* CAMERA VIEWPORT */}
      <div className="flex-1 relative bg-[#080808] flex items-center justify-center overflow-hidden">
        <video 
          ref={videoRef} 
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${permissionState === 'GRANTED' ? 'opacity-100' : 'opacity-0'}`} 
          playsInline 
          muted 
          autoPlay
        />
        {/* Hidden canvas for frame downscaling */}
        <canvas ref={canvasRef} className="hidden" />

        {/* ── INSECURE CONTEXT WARNING ── */}
        {permissionState === "INSECURE" && (
          <div className="text-center p-8 bg-black/90 rounded-2xl backdrop-blur-xl border border-orange-500/30 mx-6 max-w-sm">
            <ShieldAlert className="w-12 h-12 text-orange-400 mx-auto mb-4" />
            <p className="text-orange-400 font-bold mb-2 text-sm uppercase tracking-wider">HTTPS Required</p>
            <p className="text-sm text-gray-300 leading-relaxed mb-4">
              Camera access requires a <strong>secure HTTPS connection</strong>.
            </p>
            <p className="text-xs text-gray-500 leading-relaxed">
              You are currently on an insecure HTTP page. Please open the <strong>HTTPS tunnel link</strong> from the RailVision dashboard instead.
            </p>
            <div className="mt-4 text-[10px] text-gray-600 font-mono">
              Configure: NEXT_PUBLIC_MOBILE_CAMERA_URL=https://...
            </div>
          </div>
        )}

        {/* ── IDLE: START BUTTON ── */}
        {permissionState === "IDLE" && (
          <button 
            onClick={startCamera}
            className="flex flex-col items-center justify-center w-32 h-32 rounded-full bg-[#B4FF29] text-black hover:scale-105 active:scale-95 transition-transform shadow-[0_0_40px_rgba(180,255,41,0.3)]"
          >
            <Camera className="w-10 h-10 mb-2" />
            <span className="font-bold text-xs uppercase tracking-wider">Start</span>
          </button>
        )}

        {/* ── REQUESTING ── */}
        {permissionState === "REQUESTING" && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full border-2 border-[#B4FF29] border-t-transparent animate-spin" />
            <p className="text-[#B4FF29] animate-pulse uppercase tracking-widest text-sm font-medium">Accessing Camera...</p>
          </div>
        )}

        {/* ── DENIED ── */}
        {permissionState === "DENIED" && (
          <div className="text-center p-8 bg-black/80 rounded-2xl backdrop-blur-xl border border-red-500/20 mx-6 max-w-sm">
            <VideoOff className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-400 font-bold mb-2">Camera Access Denied</p>
            <p className="text-sm text-gray-400 leading-relaxed">
              Please tap the camera icon in your browser&apos;s address bar and <strong>allow camera access</strong>, then tap Start again.
            </p>
            <button onClick={startCamera} className="mt-4 px-4 py-2 bg-[#B4FF29] text-black rounded-lg text-sm font-bold">
              Try Again
            </button>
          </div>
        )}

        {/* ── ERROR ── */}
        {permissionState === "ERROR" && (
          <div className="text-center p-8 bg-black/80 rounded-2xl backdrop-blur-xl border border-red-500/20 mx-6 max-w-sm">
            <VideoOff className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-400 font-bold mb-2">Camera Error</p>
            <p className="text-sm text-gray-400 leading-relaxed break-words">{errorMsg}</p>
            <button onClick={startCamera} className="mt-4 px-4 py-2 bg-white/10 text-white rounded-lg text-sm">
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* CONTROLS FOOTER */}
      <div className="h-24 bg-black/80 backdrop-blur-xl border-t border-white/10 flex items-center justify-between px-8 z-20 shrink-0">
        <div className="flex flex-col">
          <span className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Transmit</span>
          <span className="text-xs font-mono text-gray-300">640×AI</span>
        </div>

        {permissionState === "GRANTED" && (
          <>
            <button 
              onClick={stopCamera}
              className="w-14 h-14 rounded-full border-2 border-red-500 bg-red-500/20 flex items-center justify-center hover:bg-red-500/40 active:scale-95 transition-all"
            >
              <div className="w-4 h-4 bg-red-500 rounded-sm" />
            </button>

            <button 
              onClick={toggleCamera}
              className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all"
            >
              <SwitchCamera className="w-5 h-5 text-white" />
            </button>
          </>
        )}

        {permissionState === "IDLE" && (
          <div className="text-[10px] text-gray-600 font-mono">Session: {sessionId?.slice(0, 8)}...</div>
        )}
      </div>
    </div>
  );
}

export default function MobileCameraPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <MobileCameraView />
    </Suspense>
  );
}
