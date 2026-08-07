"use client";

import { useWorkspaceStore } from "@/lib/store";
import {
  Play, Pause, Maximize, Volume2, VolumeX, SkipBack, SkipForward,
  Camera, Download, Scan, Radar, AlertTriangle, ChevronLeft, ChevronRight,
  PictureInPicture2, Settings2, Eye, EyeOff, Layers,
} from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { getResultVideoUrl } from "@/lib/api-service";

export function VideoWorkspace() {
  const {
    activePreviewUrl, resultVideoUrl, videoId,
    isProcessing, pipelineStage, uploadProgress,
    processingResult, jumpToFrameTrigger, overlays, toggleOverlay,
    updateVideoState, videoState,
  } = useWorkspaceStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showOverlayPanel, setShowOverlayPanel] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

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

  const takeScreenshot = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext("2d")?.drawImage(v, 0, 0);
    const link = document.createElement("a");
    link.download = `railvision_frame_${Math.floor(v.currentTime * fps)}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [fps]);

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
        if (e.shiftKey) { v.currentTime = Math.max(0, v.currentTime - 5); }
        else { v.currentTime = Math.max(0, v.currentTime - 1 / fps); }
        break;
      case "ArrowRight":
        e.preventDefault();
        if (e.shiftKey) { v.currentTime = Math.min(v.duration, v.currentTime + 5); }
        else { v.currentTime = Math.min(v.duration, v.currentTime + 1 / fps); }
        break;
      case "f":
      case "F":
        e.preventDefault();
        if (document.fullscreenElement) document.exitFullscreen();
        else containerRef.current?.requestFullscreen();
        break;
      case "s":
      case "S":
        e.preventDefault();
        takeScreenshot();
        break;
      case "m":
      case "M":
        e.preventDefault();
        if (v.muted) { v.muted = false; updateVideoState({ isMuted: false }); }
        else { v.muted = true; updateVideoState({ isMuted: true }); }
        break;
    }
  }, [videoState.isPlaying, fps, updateVideoState, takeScreenshot]);

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

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    updateVideoState({ isMuted: v.muted });
  };

  const togglePiP = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await v.requestPictureInPicture();
    } catch {}
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else containerRef.current?.requestFullscreen();
  };



  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    updateVideoState({
      currentTime: v.currentTime,
      currentFrame: Math.floor(v.currentTime * fps),
    });
  };

  const formatTime = (time: number) => {
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 100);
    return `${m}:${s.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
  };

  // ── Pipeline overlay renderer ────────────────────────────
  const renderOverlay = () => {
    if (!videoSrc && !isProcessing && !processingResult) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-[#555] z-10">
          <Scan className="w-16 h-16 mb-6 opacity-30" />
          <p className="text-[15px] font-medium">NO VIDEO SELECTED</p>
          <p className="text-[10px] uppercase tracking-[0.2em] mt-2 opacity-40">Upload CCTV footage to begin investigation</p>
          <div className="mt-8 grid grid-cols-3 gap-6 text-[9px] opacity-30 uppercase tracking-wider">
            <span>Space — Play/Pause</span>
            <span>← → — Frame step</span>
            <span>F — Fullscreen</span>
          </div>
        </div>
      );
    }

    if (pipelineStage === "upload") {
      return (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20 backdrop-blur-sm">
          <div className="w-72">
            <div className="flex justify-between text-[10px] font-mono mb-3 text-[#B8FF3B]">
              <span>UPLOADING TO SERVER</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-1.5 bg-[#181818] rounded-full overflow-hidden">
              <div className="h-full bg-[#B8FF3B] rounded-full transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
            </div>
            <p className="text-[9px] text-[#555] font-mono mt-3 text-center">Transferring video stream to AI pipeline...</p>
          </div>
        </div>
      );
    }

    if (isProcessing) {
      return (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20 backdrop-blur-md">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-56 h-56 border border-[#B8FF3B]/10 rounded-full animate-ping" style={{ animationDuration: "3s" }} />
            <div className="absolute w-40 h-40 border border-[#B8FF3B]/20 rounded-full animate-spin" style={{ animationDuration: "8s" }} />
            <div className="absolute w-28 h-28 border-2 border-[#B8FF3B]/40 border-t-[#B8FF3B] rounded-full animate-spin" style={{ animationDuration: "2s" }} />
            <div className="flex flex-col items-center bg-black/90 px-8 py-6 rounded-xl border border-[rgba(184,255,59,0.2)]">
              <Radar className="w-8 h-8 text-[#B8FF3B] mb-3 animate-pulse" />
              <p className="text-[#B8FF3B] text-[12px] font-mono tracking-[0.3em] uppercase">{pipelineStage}</p>
              <p className="text-[9px] text-[#555] font-mono mt-2">YOLO v11 + ByteTrack</p>
            </div>
          </div>
        </div>
      );
    }

    // ── AI result overlays on processed video ──────────────
    if (processingResult && overlays.alertIndicators) {
      const critCount = (processingResult.alerts || []).filter(a => a.severity === "critical").length;
      return (
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none z-10">
          <div className="flex gap-2">
            <div className="bg-black/60 backdrop-blur-sm border border-[#B8FF3B]/30 px-3 py-1.5 rounded-lg flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#B8FF3B] animate-pulse" />
              <span className="text-[10px] font-mono text-[#B8FF3B]">AI ACTIVE</span>
            </div>
            {overlays.crowdCount && processingResult.crowd_analysis && (
              <div className="bg-black/60 backdrop-blur-sm border border-white/10 px-3 py-1.5 rounded-lg flex items-center gap-2">
                <span className="text-[10px] font-mono text-white">{processingResult.crowd_analysis.maximum_people} PERSONS</span>
              </div>
            )}
            {critCount > 0 && (
              <div className="bg-black/60 backdrop-blur-sm border border-[#FF4D4D]/50 px-3 py-1.5 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-3 h-3 text-[#FF4D4D]" />
                <span className="text-[10px] font-mono text-[#FF4D4D]">{critCount} CRITICAL</span>
              </div>
            )}
          </div>
          {overlays.riskLevel && (
            <div className="bg-black/60 backdrop-blur-sm border border-white/10 px-3 py-1.5 rounded-lg flex flex-col items-end">
              <span className="text-[9px] text-[#A0A0A0] uppercase">Frame</span>
              <span className="text-[12px] font-mono text-white">{videoState.currentFrame}</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex-1 flex flex-col min-w-0" ref={containerRef}>
      <div className="glass-card flex-1 flex flex-col overflow-hidden relative">
        {/* ── Video viewport ──────────────────────────────── */}
        <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
          {renderOverlay()}
          {videoSrc && (
            <video
              ref={videoRef}
              src={videoSrc}
              className="w-full h-full object-contain"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={() => {
                if (videoRef.current) updateVideoState({ duration: videoRef.current.duration });
              }}
              onEnded={() => updateVideoState({ isPlaying: false })}
              onPlay={() => updateVideoState({ isPlaying: true })}
              onPause={() => updateVideoState({ isPlaying: false })}
            />
          )}
        </div>

        {/* ── Smart Timeline with detection markers ───────── */}
        {processingResult && (
          <div className="h-6 bg-[#0c0c0c] border-t border-[rgba(255,255,255,0.04)] relative px-4 flex-shrink-0">
            <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-[3px] bg-[#181818] rounded-full" />
            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-white z-20"
              style={{ left: `${4 + (videoState.duration ? (videoState.currentTime / videoState.duration) * (100 - 3.2) : 0)}%` }}
            />
            {/* Detection markers */}
            {(processingResult.alerts || []).map((alert, i) => {
              if (!alert.frame) return null;
              const pos = (alert.frame / processingResult.frames) * 100;
              const c = alert.severity === "critical" ? "#FF4D4D" : alert.severity === "high" ? "#FF7A00" : "#B8FF3B";
              return (
                <div
                  key={i}
                  onClick={() => useWorkspaceStore.getState().triggerJumpToFrame(alert.frame!)}
                  className="absolute top-1/2 -translate-y-1/2 w-1.5 h-3 rounded-full cursor-pointer hover:scale-[2] transition-transform z-10"
                  style={{ left: `${pos}%`, backgroundColor: c }}
                  title={`${alert.module} — ${alert.severity} — F${alert.frame}`}
                />
              );
            })}
          </div>
        )}

        {/* ── Controls bar ────────────────────────────────── */}
        <div className="h-12 border-t border-[rgba(255,255,255,0.04)] bg-[#0a0a0a] px-4 flex items-center gap-3 flex-shrink-0">
          {/* Frame step back */}
          <button onClick={() => stepFrame(-1)} disabled={!videoSrc} className="ctrl-btn"><ChevronLeft className="w-4 h-4" /></button>
          {/* Play/Pause */}
          <button onClick={togglePlay} disabled={!videoSrc || isProcessing}
            className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:bg-[#B8FF3B] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {videoState.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          {/* Frame step forward */}
          <button onClick={() => stepFrame(1)} disabled={!videoSrc} className="ctrl-btn"><ChevronRight className="w-4 h-4" /></button>

          {/* Timecode */}
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#A0A0A0] min-w-[120px]">
            <span>{formatTime(videoState.currentTime)}</span>
            <span className="text-[#333]">/</span>
            <span>{formatTime(videoState.duration)}</span>
          </div>

          {/* Frame counter */}
          <div className="text-[10px] font-mono text-[#555] bg-[#111] px-2 py-1 rounded border border-[rgba(255,255,255,0.04)]">
            F{videoState.currentFrame}
          </div>

          <div className="flex-1" />

          {/* Speed */}
          <div className="relative">
            <button onClick={() => setShowSpeedMenu(!showSpeedMenu)} className="ctrl-btn text-[10px] font-mono min-w-[40px]">
              {videoState.playbackRate}x
            </button>
            {showSpeedMenu && (
              <div className="absolute bottom-full mb-2 right-0 bg-[#111] border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden shadow-xl z-50">
                {[0.25, 0.5, 1, 1.5, 2].map(r => (
                  <button key={r} onClick={() => setPlaybackRate(r)}
                    className={`block w-full px-4 py-2 text-[11px] text-left hover:bg-[rgba(255,255,255,0.04)] ${videoState.playbackRate === r ? "text-[#B8FF3B]" : "text-[#A0A0A0]"}`}
                  >{r}x</button>
                ))}
              </div>
            )}
          </div>

          {/* Volume */}
          <button onClick={toggleMute} className="ctrl-btn">
            {videoState.isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Screenshot */}
          <button onClick={takeScreenshot} disabled={!videoSrc} className="ctrl-btn" title="Screenshot (S)">
            <Camera className="w-4 h-4" />
          </button>

          {/* Overlay toggle */}
          <button onClick={() => setShowOverlayPanel(!showOverlayPanel)} className="ctrl-btn" title="AI Overlays">
            <Layers className="w-4 h-4" />
          </button>

          {/* PiP */}
          <button onClick={togglePiP} disabled={!videoSrc} className="ctrl-btn" title="Picture-in-Picture">
            <PictureInPicture2 className="w-4 h-4" />
          </button>

          {/* Fullscreen */}
          <button onClick={toggleFullscreen} className="ctrl-btn" title="Fullscreen (F)">
            <Maximize className="w-4 h-4" />
          </button>

          {/* Download */}
          {resultVideoUrl && (
            <a href={resultVideoUrl} download className="ctrl-btn" title="Download Processed Video">
              <Download className="w-4 h-4" />
            </a>
          )}
        </div>

        {/* ── Overlay toggle panel ────────────────────────── */}
        {showOverlayPanel && (
          <div className="absolute bottom-14 right-4 bg-[#111] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 shadow-2xl z-50 w-56">
            <h4 className="text-[11px] font-medium text-white uppercase tracking-wider mb-3">AI Overlays</h4>
            {(Object.keys(overlays) as Array<keyof typeof overlays>).map(key => (
              <button key={key} onClick={() => toggleOverlay(key)}
                className="flex items-center justify-between w-full py-2 text-[11px] hover:bg-[rgba(255,255,255,0.02)] px-2 rounded transition-colors"
              >
                <span className="text-[#A0A0A0] capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                {overlays[key] ? <Eye className="w-3.5 h-3.5 text-[#B8FF3B]" /> : <EyeOff className="w-3.5 h-3.5 text-[#555]" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
