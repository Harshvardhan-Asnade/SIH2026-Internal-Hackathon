"use client";

import { useWorkspaceStore } from "@/lib/store";
import type { PipelineStage } from "@/lib/store";
import {
  Upload, Video, AlertCircle, RotateCcw, Loader2, CheckCircle2,
  Search, Focus, Activity, Layers, ShieldAlert, FileText, ChevronDown, ChevronUp, Camera, VideoOff
} from "lucide-react";
import { useRef, useState } from "react";
import { uploadVideo, processVideo, getResultVideoUrl, getReportStatus } from "@/lib/api-service";
import { motion, AnimatePresence } from "framer-motion";
import { KPIRow } from "@/components/dashboard/KPIRow";

/* ═══════════════════════════════════════════════════════════════
   Sidebar — Unified left panel combining Upload, Pipeline, & Stats
   ═══════════════════════════════════════════════════════════════ */

import { useShallow } from 'zustand/react/shallow';

export function Sidebar() {
  const {
    activeFile, setActiveFile, isUploading, setIsUploading,
    setUploadProgress, isProcessing, setIsProcessing,
    setPipelineStage, setProcessingResult, setError,
    setResultVideoUrl, setVideoId, error, pipelineStage, uploadProgress,
    processingResult, isWebcamActive, setIsWebcamActive
  } = useWorkspaceStore(useShallow(state => ({
    activeFile: state.activeFile, setActiveFile: state.setActiveFile, isUploading: state.isUploading, setIsUploading: state.setIsUploading,
    setUploadProgress: state.setUploadProgress, isProcessing: state.isProcessing, setIsProcessing: state.setIsProcessing,
    setPipelineStage: state.setPipelineStage, setProcessingResult: state.setProcessingResult, setError: state.setError,
    setResultVideoUrl: state.setResultVideoUrl, setVideoId: state.setVideoId, error: state.error, pipelineStage: state.pipelineStage, uploadProgress: state.uploadProgress,
    processingResult: state.processingResult, isWebcamActive: state.isWebcamActive, setIsWebcamActive: state.setIsWebcamActive
  })));

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadExpanded, setUploadExpanded] = useState(true);

  // ── File handlers ─────────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) { setError("Invalid file. Upload MP4, AVI or MOV."); return; }
    if (file.size > 1024 * 1024 * 1024) { setError("File too large. Max 1 GB."); return; }
    const old = useWorkspaceStore.getState().activePreviewUrl;
    if (old) URL.revokeObjectURL(old);
    setActiveFile(file, URL.createObjectURL(file));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file?.type.startsWith("video/")) { setError("Please drop a video file."); return; }
    const old = useWorkspaceStore.getState().activePreviewUrl;
    if (old) URL.revokeObjectURL(old);
    setActiveFile(file, URL.createObjectURL(file));
  };

  const runPipeline = async () => {
    const file = useWorkspaceStore.getState().activeFile;
    if (!file) return;
    try {
      setError(null);
      setIsUploading(true);
      setUploadProgress(0);
      setPipelineStage("upload");
      setUploadExpanded(false);

      const uploadRes = await uploadVideo(file, (pct) => setUploadProgress(pct));
      setVideoId(uploadRes.video_id);
      setUploadProgress(100);

      setIsUploading(false);
      setIsProcessing(true);
      setPipelineStage("extraction");
      await delay(400);
      setPipelineStage("detection");
      await delay(400);
      setPipelineStage("tracking");

      const result = await processVideo({ video_id: uploadRes.video_id });

      setPipelineStage("analysis"); await delay(300);
      setPipelineStage("alerts");  await delay(300);
      setPipelineStage("report");

      setProcessingResult(result);
      setResultVideoUrl(getResultVideoUrl(uploadRes.video_id));
      setIsProcessing(false);

      // ── Poll for AI Master Report ──────────────────────────────
      (async () => {
        try {
          const maxAttempts = 60; // 2 mins max
          let attempts = 0;
          while (attempts < maxAttempts) {
            attempts++;
            await delay(2000);
            const reportData = await getReportStatus(uploadRes.video_id);
            const st = reportData.status.toUpperCase();
            
            if (st === "COMPLETE") {
              const currentRes = useWorkspaceStore.getState().processingResult;
              if (currentRes) {
                setProcessingResult({ 
                  ...currentRes, 
                  ai_master_report: reportData.report || "No report generated." 
                });
              }
              break;
            } else if (st === "FAILED") {
              const currentRes = useWorkspaceStore.getState().processingResult;
              if (currentRes) {
                setProcessingResult({ 
                  ...currentRes, 
                  ai_master_report: `FAILED: ${reportData.error || "Unknown error occurred during report generation."}`
                });
              }
              break;
            }
          }
          if (attempts >= maxAttempts) {
            const currentRes = useWorkspaceStore.getState().processingResult;
            if (currentRes) {
              setProcessingResult({ ...currentRes, ai_master_report: "FAILED: Generation timed out." });
            }
          }
        } catch (e) {
          console.error("Report polling failed", e);
          const currentRes = useWorkspaceStore.getState().processingResult;
          if (currentRes) {
            setProcessingResult({ ...currentRes, ai_master_report: "FAILED: Network error while polling report status." });
          }
        }
      })();
    } catch (err: unknown) {
      let msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      if (!msg) {
        const errorMsg = (err as Error)?.message || "";
        if (errorMsg.toLowerCase().includes("timeout")) {
          msg = "Processing timed out. The video is too large or the AI engine is overloaded.";
        } else if (errorMsg.toLowerCase().includes("network error")) {
          msg = "Network Error: Cannot connect to the AI engine. Is the backend running?";
        } else {
          msg = errorMsg || "Processing failed. Check backend is running.";
        }
      }
      setError(msg);
      setIsUploading(false);
      setIsProcessing(false);
      setPipelineStage("idle");
    }
  };

  const isRunning = isUploading || isProcessing;
  const isDone = pipelineStage === "report";

  return (
    <div className="w-64 flex-shrink-0 flex flex-col gap-4 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-thin">

      {/* ═══════════ SECTION 1: Upload Zone ═══════════════════ */}
      <div className="bg-[#111] border border-white/5 rounded-xl p-4 flex-shrink-0 shadow-sm">
        <button
          onClick={() => setUploadExpanded(!uploadExpanded)}
          className="w-full flex items-center justify-between text-[10px] font-semibold text-[#A0A0A0] uppercase tracking-widest mb-1"
        >
          Source Input
          {uploadExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        <AnimatePresence initial={false}>
          {uploadExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              {/* Drop area */}
              <div
                className={`h-[80px] rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all mt-2 ${
                  activeFile
                    ? "border-[rgba(184,255,59,0.3)] bg-[rgba(184,255,59,0.04)]"
                    : "border-white/5 hover:border-white/5 hover:bg-[rgba(255,255,255,0.05)]"
                }`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => !isRunning && fileInputRef.current?.click()}
              >
                <input type="file" accept="video/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                <Upload className={`w-5 h-5 mb-1 ${activeFile ? "text-[#B8FF3B]" : "text-[#444]"}`} />
                <p className="text-[10px] font-medium text-white leading-tight">
                  {activeFile ? "Video ready" : "Drop video here"}
                </p>
                <p className="text-[9px] text-[#555] mt-0.5 truncate max-w-[90%] mx-auto">
                  {activeFile ? activeFile.name : "MP4 · AVI · MOV"}
                </p>
              </div>

              {/* Webcam Button */}
              <div className="mt-2">
                {!isWebcamActive ? (
                  <button
                    onClick={() => setIsWebcamActive(true)}
                    disabled={isRunning}
                    className="w-full py-2.5 rounded-lg text-[10px] font-semibold tracking-wider uppercase flex items-center justify-center gap-2 border border-white/10 bg-[#181818] hover:bg-[#222] hover:border-white/20 text-[#A0A0A0] transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Use Webcam
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsWebcamActive(false);
                      setProcessingResult(null);
                    }}
                    className="w-full py-2.5 rounded-lg text-[10px] font-semibold tracking-wider uppercase flex items-center justify-center gap-2 border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors"
                  >
                    <VideoOff className="w-3.5 h-3.5" />
                    Stop Camera
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Compact file indicator (when collapsed) */}
        {!uploadExpanded && activeFile && (
          <div className="flex items-center gap-2 mt-1 px-1">
            <Video className="w-3 h-3 text-[#B8FF3B] shrink-0" />
            <span className="text-[9px] text-[#A0A0A0] truncate flex-1">{activeFile.name}</span>
          </div>
        )}

        {/* Upload progress */}
        <AnimatePresence>
          {isUploading && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mt-2">
              <div className="flex justify-between text-[9px] font-mono text-[#B8FF3B] mb-1">
                <span>UPLOADING</span><span>{uploadProgress}%</span>
              </div>
              <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${uploadProgress}%` }} className="h-full bg-[#B8FF3B] rounded-full" />
              </div>
            </motion.div>
          )}

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1, x: [0, -5, 5, -5, 5, 0] }}
              transition={{ duration: 0.4 }} exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-start gap-2 p-2 rounded-lg bg-[rgba(255,77,77,0.06)] border border-[rgba(255,77,77,0.15)] overflow-hidden mt-2"
            >
              <AlertCircle className="w-3.5 h-3.5 text-[#FF4D4D] shrink-0 mt-0.5" />
              <div>
                <p className="text-[9px] text-[#FF4D4D] leading-snug">{error}</p>
                <button onClick={runPipeline} className="text-[9px] text-[#FF7A00] flex items-center gap-1 mt-1 hover:text-white transition-colors">
                  <RotateCcw className="w-3 h-3" /> Retry
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Primary CTA */}
        <button
          onClick={isDone ? () => useWorkspaceStore.getState().resetWorkspace() : runPipeline}
          disabled={!activeFile || isRunning}
          className={`w-full py-2.5 rounded-xl text-[11px] font-semibold tracking-wide flex items-center justify-center gap-2 transition-all mt-2 ${
            isDone
              ? "bg-[rgba(184,255,59,0.1)] text-[#B8FF3B] border border-[rgba(184,255,59,0.2)] hover:bg-[rgba(184,255,59,0.15)]"
              : activeFile && !isRunning
              ? "bg-[#B8FF3B] text-[#070707] hover:bg-[#c8ff5b] shadow-[0_0_16px_rgba(184,255,59,0.2)]"
              : "bg-[#181818] text-[#444] cursor-not-allowed border border-white/5"
          }`}
        >
          {isRunning && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {isDone && <CheckCircle2 className="w-3.5 h-3.5" />}
          {isUploading ? "Uploading…" : isProcessing ? "Processing…" : isDone ? "New Analysis" : "Run AI Pipeline"}
        </button>
      </div>

      <KPIRow />

    </div>
  );
}

/* ═══════════ Constants ════════════════════════════════════════ */

const PIPELINE_STAGES = [
  { id: "upload", label: "Upload", icon: Upload },
  { id: "extraction", label: "Frame Extract", icon: Search },
  { id: "detection", label: "YOLO Detection", icon: Focus },
  { id: "tracking", label: "ByteTrack", icon: Activity },
  { id: "analysis", label: "Analysis", icon: Layers },
  { id: "alerts", label: "Alert Gen", icon: ShieldAlert },
  { id: "report", label: "Report", icon: FileText },
];

function getStageState(stageId: PipelineStage, index: number, currentStage: PipelineStage): "completed" | "active" | "pending" {
  const currentIndex = PIPELINE_STAGES.findIndex(s => s.id === currentStage);
  if (currentStage === "idle") return "pending";
  if (currentStage === "report") return "completed";
  if (index < currentIndex) return "completed";
  if (index === currentIndex) return "active";
  return "pending";
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

