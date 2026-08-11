"use client";

import { useWorkspaceStore } from "@/lib/store";
import {
  Play, Pause, Maximize, Volume2, VolumeX,
  Download, Scan, ChevronLeft, ChevronRight,
  Activity
} from "lucide-react";
import FallWarningOverlay from "./FallWarningOverlay";
import { useShallow } from 'zustand/react/shallow';
import { useEffect, useRef, useState, useCallback, useMemo } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function VideoWorkspace() {
  const {
    activePreviewUrl, resultVideoUrl,
    isProcessing, pipelineStage, uploadProgress,
    processingResult, jumpToFrameTrigger, overlays, toggleOverlay,
    updateVideoState, videoState, videoId,
  } = useWorkspaceStore(useShallow(state => ({
    activePreviewUrl: state.activePreviewUrl, resultVideoUrl: state.resultVideoUrl,
    isProcessing: state.isProcessing, pipelineStage: state.pipelineStage, uploadProgress: state.uploadProgress,
    processingResult: state.processingResult, jumpToFrameTrigger: state.jumpToFrameTrigger, overlays: state.overlays, toggleOverlay: state.toggleOverlay,
    updateVideoState: state.updateVideoState, videoState: state.videoState, videoId: state.videoId,
  })));

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoWrapperRef = useRef<HTMLDivElement>(null);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [videoDims, setVideoDims] = useState({ w: 1920, h: 1080 });

  const fps = processingResult?.fps || 30;
  const videoSrc = resultVideoUrl || activePreviewUrl;

  // ── Jump to frame ────────────────────────────────────────
  useEffect(() => {
    if (videoRef.current && jumpToFrameTrigger !== null) {
      const timeInSeconds = jumpToFrameTrigger / fps;
      videoRef.current.currentTime = timeInSeconds;
      updateVideoState({ currentTime: timeInSeconds, currentFrame: jumpToFrameTrigger });
    }
  }, [jumpToFrameTrigger, fps, updateVideoState]);

  // ── Keyboard shortcuts ───────────────────────────────────
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    const v = videoRef.current;
    if (!v) return;

    switch (e.key) {
      case " ":
        e.preventDefault();
        if (videoState.isPlaying) v.pause(); else v.play();
        updateVideoState({ isPlaying: !videoState.isPlaying });
        break;
      case "ArrowLeft":
        e.preventDefault();
        v.currentTime = Math.max(0, v.currentTime - (e.shiftKey ? 5 : 1 / fps));
        break;
      case "ArrowRight":
        e.preventDefault();
        v.currentTime = Math.min(v.duration, v.currentTime + (e.shiftKey ? 5 : 1 / fps));
        break;
      case "f":
      case "F":
        e.preventDefault();
        if (document.fullscreenElement) document.exitFullscreen();
        else containerRef.current?.requestFullscreen();
        break;
    }
  }, [videoState.isPlaying, fps, updateVideoState]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // ── Player controls ──────────────────────────────────────
  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (videoState.isPlaying) v.pause(); else v.play();
    updateVideoState({ isPlaying: !videoState.isPlaying });
  };

  const stepFrame = (dir: 1 | -1) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + dir / fps));
  };

  const setPlaybackRate = (rate: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = rate;
    updateVideoState({ playbackRate: rate });
    setShowSpeedMenu(false);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else containerRef.current?.requestFullscreen();
  };

  const formatTime = (time: number) => {
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 100);
    return `${m}:${s.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
  };

  // ── AI Detections Overlay ────────────────────────────────
  const currentDetections = useMemo(() => {
    if (!processingResult || !processingResult.detections || !overlays.alertIndicators) return [];
    return processingResult.detections.filter(d => d.frame === videoState.currentFrame);
  }, [processingResult, videoState.currentFrame, overlays.alertIndicators]);

  // Gallery Keyframes (Detections)
  const keyFrames = useMemo(() => {
    if (!processingResult || !processingResult.alerts) return [];
    const alerts = processingResult.alerts.filter(a => a.frame !== undefined && a.frame !== null);
    const uniqueFrames = new Set<number>();
    const gallery = [] as typeof alerts;
    for (const a of alerts) {
      if (a.severity !== 'critical' && a.severity !== 'high') continue;
      const f = a.frame!;
      // Only keep one alert per ~30 frames (1 second) to avoid clutter
      if (!Array.from(uniqueFrames).some(uf => Math.abs(uf - f) < fps)) {
        uniqueFrames.add(f);
        gallery.push(a);
      }
    }
    return gallery.sort((a, b) => a.frame! - b.frame!);
  }, [processingResult, fps]);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg)] border border-[var(--border)] rounded-xl overflow-hidden relative shadow-lg" ref={containerRef}>
      
      {/* ── Video Viewport (Strict Containment) ──────────────── */}
      <div className="flex-1 min-h-0 bg-black relative flex items-center justify-center overflow-hidden">
        
        {/* Empty State */}
        {!videoSrc && !isProcessing && pipelineStage !== "upload" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-3)] z-10">
            <Scan className="w-16 h-16 mb-6 opacity-30" />
            <p className="text-[15px] font-medium">NO VIDEO SELECTED</p>
            <p className="text-[10px] uppercase tracking-[0.2em] mt-2 opacity-40">Upload CCTV footage to begin investigation</p>
          </div>
        )}

        {/* Uploading State */}
        {pipelineStage === "upload" && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20 backdrop-blur-sm">
            <div className="w-72">
              <div className="flex justify-between text-[10px] font-mono mb-3 text-[var(--accent)]">
                <span>UPLOADING TO SERVER</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
                <div className="h-full bg-[var(--accent)] rounded-full transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* Processing State */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20 backdrop-blur-md">
            <div className="relative flex items-center justify-center">
              <div className="absolute w-56 h-56 border border-[var(--accent)]/10 rounded-full animate-ping" style={{ animationDuration: "3s" }} />
              <div className="absolute w-40 h-40 border border-[var(--accent)]/20 rounded-full animate-spin" style={{ animationDuration: "8s" }} />
              <div className="flex flex-col items-center bg-black/90 px-8 py-6 rounded-xl border border-[rgba(184,255,59,0.2)]">
                <Activity className="w-8 h-8 text-[var(--accent)] mb-3 animate-pulse" />
                <p className="text-[var(--accent)] text-[12px] font-mono tracking-[0.3em] uppercase">{pipelineStage}</p>
                <p className="text-[9px] text-[var(--text-3)] font-mono mt-2">YOLO v11 + ByteTrack</p>
              </div>
            </div>
          </div>
        )}

        {/* Video & AI Overlays */}
        {videoSrc && (
          <div 
            ref={videoWrapperRef}
            className="relative flex items-center justify-center" 
            style={{ 
              width: "100%", height: "100%", 
              aspectRatio: `${videoDims.w} / ${videoDims.h}`,
              maxHeight: "100%", maxWidth: "100%"
            }}
          >
            <FallWarningOverlay />
            <video
              ref={videoRef}
              src={videoSrc}
              className="absolute inset-0 w-full h-full object-contain"
              onTimeUpdate={() => {
                if (!videoRef.current) return;
                updateVideoState({
                  currentTime: videoRef.current.currentTime,
                  currentFrame: Math.floor(videoRef.current.currentTime * fps),
                });
              }}
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  updateVideoState({ duration: videoRef.current.duration });
                  setVideoDims({ w: videoRef.current.videoWidth || 1920, h: videoRef.current.videoHeight || 1080 });
                }
              }}
              onEnded={() => updateVideoState({ isPlaying: false })}
              onPlay={() => updateVideoState({ isPlaying: true })}
              onPause={() => updateVideoState({ isPlaying: false })}
            />
            
            {/* ── Bounding Boxes ── */}
            {currentDetections.map((d, i) => {
              const left = (d.bbox[0] / videoDims.w) * 100;
              const top = (d.bbox[1] / videoDims.h) * 100;
              const width = ((d.bbox[2] - d.bbox[0]) / videoDims.w) * 100;
              const height = ((d.bbox[3] - d.bbox[1]) / videoDims.h) * 100;
              
              const isPerson = d.class.toLowerCase() === "person";
              const color = isPerson ? "#33FF99" : "#FFC857";

              return (
                <div 
                  key={i} 
                  className="absolute border-2 z-10 pointer-events-none"
                  style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%`, borderColor: color }}
                >
                  <div 
                    className="absolute bottom-full left-[-2px] px-1 text-[8px] font-mono whitespace-nowrap text-black font-bold"
                    style={{ backgroundColor: color }}
                  >
                    {d.class.toUpperCase()} {(d.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── CCTV Static Overlays ── */}
        {videoSrc && !isProcessing && pipelineStage !== "upload" && (
          <div className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-between p-5">
            <div className="flex justify-between items-start">
              <div className="flex flex-col gap-2">
                <div className="bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-sm shadow-md text-[9px] font-mono text-white flex items-center gap-2 w-max tracking-widest uppercase">
                  <span className="text-white/50">{'// CAM'}</span> <span>CAM-01</span>
                </div>
                <div className="bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-sm shadow-md text-[9px] font-mono text-white flex items-center gap-2 w-max tracking-widest uppercase">
                  <span className="text-white/50">{'// LOC'}</span> <span>VADODARA JUNCTION • PF-1</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 items-end">
                <div className="bg-black/40 backdrop-blur-md border border-[var(--accent)]/30 px-3 py-1.5 rounded-sm shadow-md text-[9px] font-mono text-[var(--accent)] flex items-center gap-2 tracking-widest uppercase">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse shadow-[0_0_8px_var(--accent)]" />
                  <span>VIDEO ANALYSIS</span>
                </div>
                <div className="bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-sm shadow-md text-[9px] font-mono text-white flex items-center gap-2 tracking-widest uppercase">
                  <span className="text-white/50">SRC FPS</span> <span>30</span>
                </div>
                <div className="bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-sm shadow-md text-[9px] font-mono text-white flex items-center gap-2 tracking-widest uppercase">
                  <span className="text-white/50">AI FPS</span> <span>{fps}</span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-end">
              <div className="flex flex-col gap-2">
                <div className="bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-sm shadow-md text-[9px] font-mono text-white flex items-center gap-2 w-max tracking-widest uppercase">
                  <span className="text-white/50">TIME</span> <span>{formatTime(videoState.currentTime)}</span>
                </div>
                <div className="bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-sm shadow-md text-[9px] font-mono text-white flex items-center gap-2 w-max tracking-widest uppercase">
                  <span className="text-white/50">FRAME</span> <span>{videoState.currentFrame}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 items-end">
                <div className="bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-sm shadow-md text-[9px] font-mono text-white flex items-center gap-2 tracking-widest uppercase">
                  <span className="text-white/50">YOLO26</span> <span className="text-[var(--accent)]">● ACTIVE</span>
                </div>
                <div className="bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-sm shadow-md text-[9px] font-mono text-white flex items-center gap-2 tracking-widest uppercase">
                  <span className="text-white/50">BYTETRACK</span> <span className="text-[var(--accent)]">● ACTIVE</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Smart Timeline ────────────────────────────────── */}
      {processingResult && (
        <div className="h-8 bg-[var(--bg)] border-t border-[var(--border)] relative px-4 shrink-0 group/timeline cursor-pointer"
             onClick={(e) => {
               const rect = e.currentTarget.getBoundingClientRect();
               const percent = (e.clientX - rect.left - 16) / (rect.width - 32);
               if (percent >= 0 && percent <= 1 && videoRef.current) {
                 videoRef.current.currentTime = percent * videoState.duration;
               }
             }}>
          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-[4px] bg-[var(--surface-2)] rounded-full overflow-hidden">
             <div className="h-full bg-white/20 transition-all pointer-events-none" style={{ width: `${(videoState.currentTime / videoState.duration) * 100}%` }} />
          </div>
          
          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-white z-20 pointer-events-none"
            style={{ left: `${4 + (videoState.duration ? (videoState.currentTime / videoState.duration) * (100 - 3.2) : 0)}%` }}
          />

          {/* Detection Markers */}
          {(processingResult.alerts || []).map((alert, i) => {
            if (!alert.frame) return null;
            const pos = (alert.frame / processingResult.frames) * 100;
            const c = alert.severity === "critical" ? "#FF4D4D" : alert.severity === "high" ? "#FF7A00" : "#FFC857";
            const timeStr = new Date((alert.frame / fps) * 1000).toISOString().substr(14, 5);
            return (
              <div
                key={i}
                onClick={(e) => { e.stopPropagation(); useWorkspaceStore.getState().triggerJumpToFrame(alert.frame!); }}
                className="absolute top-1/2 -translate-y-1/2 w-1.5 h-3.5 rounded-full cursor-pointer hover:scale-[2.5] transition-transform z-10 group"
                style={{ left: `calc(16px + ${pos}% - 24px)`, backgroundColor: c }}
              >
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black border border-[rgba(255,255,255,0.15)] px-2 py-1.5 rounded text-[10px] whitespace-nowrap pointer-events-none z-50 flex flex-col items-center shadow-xl">
                  <span className="font-bold" style={{ color: c }}>{alert.severity.toUpperCase()}</span>
                  <span className="text-[var(--text-1)] text-[9px] mt-0.5">{alert.message}</span>
                  <span className="text-[var(--text-2)] font-mono text-[9px] mt-1">{timeStr} • Frame {alert.frame}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Controls Bar ──────────────────────────────────── */}
      <div className="h-12 border-t border-[var(--border)] bg-[var(--bg)] px-4 flex items-center gap-3 shrink-0 relative">
        <button onClick={togglePlay} disabled={!videoSrc || isProcessing}
          className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:bg-[var(--accent)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
        >
          {videoState.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
        
        <button onClick={() => stepFrame(-1)} disabled={!videoSrc} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-[var(--text-2)] transition-colors"><ChevronLeft className="w-4 h-4" /></button>
        <button onClick={() => stepFrame(1)} disabled={!videoSrc} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-[var(--text-2)] transition-colors"><ChevronRight className="w-4 h-4" /></button>

        <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-2)] min-w-[100px]">
          <span className="text-[var(--text-1)]">{formatTime(videoState.currentTime)}</span>
          <span className="text-[var(--text-3)]">/</span>
          <span>{formatTime(videoState.duration)}</span>
        </div>

        <div className="flex-1" />

        <div className="relative shrink-0">
          <button onClick={() => setShowSpeedMenu(!showSpeedMenu)} className="px-2 h-8 rounded-lg hover:bg-white/5 text-[10px] font-mono text-[var(--text-2)] transition-colors">
            {videoState.playbackRate}x
          </button>
          {showSpeedMenu && (
            <div className="absolute bottom-full mb-2 right-0 bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden shadow-xl z-50">
              {[0.25, 0.5, 1, 1.5, 2].map(r => (
                <button key={r} onClick={() => setPlaybackRate(r)}
                  className={`block w-full px-4 py-2 text-[11px] text-left hover:bg-white/5 \${videoState.playbackRate === r ? "text-[var(--accent)]" : "text-[var(--text-2)]"}`}
                >{r}x</button>
              ))}
            </div>
          )}
        </div>

        <button onClick={() => { if(videoRef.current) { videoRef.current.muted = !videoState.isMuted; updateVideoState({isMuted: !videoState.isMuted}); } }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-[var(--text-2)] transition-colors shrink-0">
          {videoState.isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {resultVideoUrl && (
          <a href={resultVideoUrl} download className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-[var(--text-2)] transition-colors shrink-0">
            <Download className="w-4 h-4" />
          </a>
        )}

        <button onClick={toggleFullscreen} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-[var(--text-2)] transition-colors shrink-0">
          <Maximize className="w-4 h-4" />
        </button>
      </div>

      {/* ── Key-Frame Gallery ──────────────────────────────── */}
      {keyFrames.length > 0 && (
        <div className="h-28 bg-[var(--bg)] border-t border-[var(--border)] shrink-0 px-4 py-3 flex gap-3 overflow-x-auto scrollbar-thin">
          {keyFrames.map((kf, i) => (
            <div 
              key={i}
              onClick={() => useWorkspaceStore.getState().triggerJumpToFrame(kf.frame!)}
              className="h-full min-w-[140px] bg-[var(--surface)] border border-[var(--border-h)] rounded-lg p-2 flex flex-col justify-between cursor-pointer hover:border-[var(--accent)]/50 transition-colors group relative overflow-hidden"
            >
              {videoId && (
                <img 
                  src={`${API_BASE_URL}/outputs/${videoId}/thumbnails/frame_${kf.frame}.jpg`} 
                  alt={`Frame ${kf.frame}`}
                  className="absolute inset-0 w-full h-full object-cover z-0 opacity-80 group-hover:opacity-100 transition-opacity"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/90 z-0 pointer-events-none" />
              <div className="flex justify-between items-start z-10 relative">
                <span className="text-[10px] font-mono text-[var(--text-1)] drop-shadow-md">F{kf.frame}</span>
                <div className={`w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.8)] ${kf.severity === 'critical' ? 'bg-[#FF4D4D]' : 'bg-[#FF7A00]'}`} />
              </div>
              <div className="z-10 relative">
                <p className="text-[10px] text-[var(--text-1)] font-medium truncate drop-shadow-md">{kf.module}</p>
                <p className="text-[9px] text-[var(--text-1)] truncate drop-shadow-md opacity-80">{new Date((kf.frame! / fps) * 1000).toISOString().substr(14, 5)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
