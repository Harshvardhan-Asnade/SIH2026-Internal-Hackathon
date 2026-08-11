"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useWorkspaceStore } from "@/lib/store";
import { useShallow } from 'zustand/react/shallow';
import { startMobileCameraSession, checkMobileCameraSession, WS_BASE_URL } from "@/lib/api-service";
import { Loader2, Smartphone, WifiOff, Copy, Check, AlertTriangle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { ProcessingResult } from "@/lib/api-types";

// ── URL Helpers ──────────────────────────────────────────────────────
// Returns the base URL to embed in the QR code.
// Priority:
//  1. NEXT_PUBLIC_MOBILE_CAMERA_URL env var (configured by user — safest)
//  2. Fallback: current page origin (works ONLY if not localhost)
function getMobileCameraBaseUrl(): string {
  // Env var is set at build time; in Next.js it's inlined into the bundle.
  const envUrl = process.env.NEXT_PUBLIC_MOBILE_CAMERA_URL;
  if (envUrl && envUrl.trim() !== "") {
    return envUrl.trim().replace(/\/$/, ""); // strip trailing slash
  }
  // No env var — use the current page origin as fallback.
  // This works when running dev with --hostname 0.0.0.0 and accessed via LAN IP.
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

// Returns true if the URL looks like it will fail on a phone (points to Mac's loopback)
function isLocalhostUrl(url: string): boolean {
  return /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(url);
}

export function MobileCameraWorkspace() {
  const {
    isMobileCameraActive,
    mobileSessionId,
    setMobileSessionId,
    setProcessingResult,
    setIsMobileCameraActive,
  } = useWorkspaceStore(useShallow(state => ({
    isMobileCameraActive: state.isMobileCameraActive,
    mobileSessionId: state.mobileSessionId,
    setMobileSessionId: state.setMobileSessionId,
    setProcessingResult: state.setProcessingResult,
    setIsMobileCameraActive: state.setIsMobileCameraActive,
  })));

  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [connectionState, setConnectionState] = useState<"WAITING" | "STREAMING" | "DISCONNECTED" | "ERROR">("WAITING");
  const [qrUrl, setQrUrl] = useState("");
  const [isLocalhostWarning, setIsLocalhostWarning] = useState(false);
  const [stats, setStats] = useState({ aiFps: 0, latency: 0 });
  const [copied, setCopied] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Copy link to clipboard
  const handleCopyLink = useCallback(async () => {
    if (!qrUrl) return;
    try {
      await navigator.clipboard.writeText(qrUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select text
    }
  }, [qrUrl]);

  // 1. Initialize Session & build QR URL
  useEffect(() => {
    async function initSession() {
      try {
        const { session_id } = await startMobileCameraSession();
        setMobileSessionId(session_id);
        
        // ── Build mobile URL ──────────────────────────────────────
        // NEVER use localhost — it resolves to the phone itself, not the Mac.
        const baseUrl = getMobileCameraBaseUrl();
        const mobileUrl = `${baseUrl}/mobile-camera?session=${session_id}`;
        
        setQrUrl(mobileUrl);
        setIsLocalhostWarning(isLocalhostUrl(mobileUrl));
        setConnectionState("WAITING");
      } catch (e) {
        console.error("Failed to start mobile session", e);
        setConnectionState("ERROR");
      }
    }
    
    if (isMobileCameraActive && !mobileSessionId) {
      initSession();
    }
  }, [isMobileCameraActive, mobileSessionId, setMobileSessionId]);

  // 2. Poll for Phone Connection Status
  useEffect(() => {
    if (!mobileSessionId || connectionState !== "WAITING") return;
    
    const checkStatus = async () => {
      try {
        const { status } = await checkMobileCameraSession(mobileSessionId);
        if (status === "STREAMING") {
          setConnectionState("STREAMING");
        }
      } catch {
        // ignore polling errors silently
      }
    };
    
    pollIntervalRef.current = setInterval(checkStatus, 1500);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [mobileSessionId, connectionState]);

  // 3. Open Laptop WebSocket when phone connects
  useEffect(() => {
    if (!mobileSessionId || connectionState !== "STREAMING") return;
    
    const wsUrl = `${WS_BASE_URL}/ws/mobile-camera/laptop/${mobileSessionId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status === "success") {
          const currentAiFps = data.ai_fps > 0 ? (1 / data.ai_fps).toFixed(1) : "0";
          const latencyMs = Math.round(data.ai_fps * 1000) + 15;
          setStats({ aiFps: parseFloat(currentAiFps), latency: latencyMs });
          
          // Draw annotated frame onto canvas
          if (data.image && displayCanvasRef.current) {
            const ctx = displayCanvasRef.current.getContext("2d");
            const img = new Image();
            img.onload = () => {
              if (ctx && displayCanvasRef.current) {
                displayCanvasRef.current.width = img.width;
                displayCanvasRef.current.height = img.height;
                ctx.drawImage(img, 0, 0);
              }
            };
            img.src = `data:image/jpeg;base64,${data.image}`;
          }
          
          // Push live analytics into the store (feeds DynamicTabs)
          const resultObj: ProcessingResult = {
            status: "success",
            video: `mobile_${mobileSessionId}`,
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
          
          // Trigger Fall Warning overlay if applicable
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
      }
    };

    ws.onerror = () => setConnectionState("DISCONNECTED");
    ws.onclose = () => setConnectionState("DISCONNECTED");

    return () => ws.close();
  }, [mobileSessionId, connectionState, setProcessingResult]);

  const stopCamera = () => {
    wsRef.current?.close();
    setIsMobileCameraActive(false);
    setMobileSessionId(null);
    useWorkspaceStore.getState().resetWorkspace();
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-black relative">
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] pointer-events-none mix-blend-overlay z-0" />
      
      {/* ── TOP BAR ─────────────────────────────────────── */}
      <div className="h-14 border-b border-[var(--border)] shrink-0 flex items-center justify-between px-6 bg-[var(--surface)] z-10">
        <div className="flex items-center gap-3">
          <Smartphone className="w-5 h-5 text-[var(--accent)]" />
          <h2 className="text-sm font-medium text-[var(--text-1)] uppercase tracking-wider flex items-center gap-2">
            Mobile Live Stream
            {connectionState === "STREAMING" && (
              <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse ml-2" />
            )}
          </h2>
        </div>

        <div className="flex items-center gap-6">
          {connectionState === "STREAMING" && (
            <div className="flex items-center gap-4 text-[10px] font-mono text-[var(--text-3)] bg-[var(--bg)] px-3 py-1.5 rounded border border-[var(--border)]">
              <span className="flex items-center gap-1.5"><span className="text-[var(--accent)]">AI FPS:</span> {stats.aiFps.toFixed(1)}</span>
              <span className="w-px h-3 bg-[var(--border)]" />
              <span className="flex items-center gap-1.5"><span className="text-[var(--accent)]">LATENCY:</span> {stats.latency}ms</span>
            </div>
          )}
          
          <button 
            onClick={stopCamera}
            className="text-[11px] font-medium text-red-400 hover:text-red-300 transition-colors uppercase tracking-wider px-3 py-1.5 border border-red-500/20 hover:border-red-500/40 rounded bg-red-500/5"
          >
            Stop Camera
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT ────────────────────────────────── */}
      <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden z-10">
        
        {connectionState === "WAITING" && (
          <div className="flex flex-col items-center justify-center p-8 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl max-w-sm w-full mx-4">
            <Smartphone className="w-10 h-10 text-[var(--accent)] mb-3 animate-bounce" />
            <h3 className="text-base font-bold text-[var(--text-1)] mb-1 tracking-wide uppercase">Connect Phone</h3>
            <p className="text-xs text-[var(--text-3)] text-center mb-5 max-w-[240px]">
              Scan this QR code with your mobile device to use it as a remote surveillance camera.
            </p>
            
            {/* ── Localhost Warning ─── */}
            {isLocalhostWarning && (
              <div className="w-full mb-5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex gap-2 items-start">
                <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-bold text-yellow-400 uppercase tracking-wider mb-0.5">Mobile URL Not Configured</p>
                  <p className="text-[10px] text-yellow-300/70 leading-relaxed">
                    QR points to <code className="font-mono">localhost</code> — this will not work on a phone.<br />
                    Set <code className="font-mono text-yellow-400">NEXT_PUBLIC_MOBILE_CAMERA_URL</code> in <code className="font-mono">.env.local</code> to your LAN IP or HTTPS tunnel URL.
                  </p>
                </div>
              </div>
            )}

            {/* ── QR Code ─── */}
            <div className={`bg-white p-3 rounded-lg mb-4 shadow-inner ${isLocalhostWarning ? 'opacity-40 pointer-events-none' : ''}`}>
              {qrUrl && !isLocalhostWarning ? (
                <QRCodeSVG value={qrUrl} size={168} />
              ) : isLocalhostWarning ? (
                <div className="w-[168px] h-[168px] flex flex-col items-center justify-center bg-gray-100 rounded gap-2">
                  <AlertTriangle className="w-8 h-8 text-yellow-500" />
                  <p className="text-[10px] text-gray-500 text-center font-mono px-2">Configure URL first</p>
                </div>
              ) : (
                <div className="w-[168px] h-[168px] flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              )}
            </div>

            {/* ── Status Pill ─── */}
            <div className="flex items-center gap-3 text-[11px] text-[var(--accent)] bg-[var(--accent)]/10 px-4 py-2 rounded-full border border-[var(--accent)]/20 mb-4">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              WAITING FOR PHONE CONNECTION...
            </div>
            
            {/* ── URL + Copy Button ─── */}
            {qrUrl && (
              <div className="w-full mt-1">
                <p className="text-[9px] text-[var(--text-3)] uppercase tracking-widest mb-1.5 font-mono">Scan URL</p>
                <div className="flex items-center gap-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2">
                  <span className={`flex-1 text-[9px] font-mono break-all leading-relaxed ${isLocalhostWarning ? 'text-yellow-400/60' : 'text-[var(--text-3)]'}`}>
                    {qrUrl}
                  </span>
                  <button
                    onClick={handleCopyLink}
                    title="Copy link"
                    className="shrink-0 text-[var(--text-3)] hover:text-[var(--accent)] transition-colors"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-[var(--accent)]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {connectionState === "STREAMING" && (
          <canvas 
            ref={displayCanvasRef}
            className="w-full h-full object-contain"
          />
        )}

        {connectionState === "DISCONNECTED" && (
          <div className="flex flex-col items-center text-[var(--text-3)] bg-[var(--surface)] p-8 rounded-xl border border-[var(--border)]">
            <WifiOff className="w-12 h-12 mb-4 opacity-50 text-red-400" />
            <p className="text-sm uppercase tracking-widest text-[var(--text-2)] mb-1">Connection Lost</p>
            <p className="text-xs">The phone disconnected from the stream.</p>
          </div>
        )}

        {connectionState === "ERROR" && (
          <div className="flex flex-col items-center text-[var(--text-3)] bg-[var(--surface)] p-8 rounded-xl border border-red-500/20">
            <AlertTriangle className="w-12 h-12 mb-4 text-red-400" />
            <p className="text-sm uppercase tracking-widest text-red-400 mb-1">Session Error</p>
            <p className="text-xs text-center max-w-[200px]">Could not create a mobile camera session. Is the backend running?</p>
          </div>
        )}
      </div>
    </div>
  );
}
