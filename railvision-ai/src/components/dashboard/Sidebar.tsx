"use client";

import { useWorkspaceStore } from "@/lib/store";
import type { PipelineStage } from "@/lib/store";
import {
  Upload, Video, AlertCircle, RotateCcw, Loader2, CheckCircle2,
  Search, Focus, Activity, Layers, ShieldAlert, FileText, ChevronDown, ChevronUp,
} from "lucide-react";
import { useRef, useState } from "react";
import { uploadVideo, processVideo, getResultVideoUrl } from "@/lib/api-service";
import { motion, AnimatePresence } from "framer-motion";
import { KPIRow } from "@/components/dashboard/KPIRow";

/* ═══════════════════════════════════════════════════════════════
   Sidebar — Unified left panel combining Upload, Pipeline, & Stats
   ═══════════════════════════════════════════════════════════════ */

export function Sidebar() {
  const {
    activeFile, setActiveFile, isUploading, setIsUploading,
    setUploadProgress, isProcessing, setIsProcessing,
    setPipelineStage, setProcessingResult, setError,
    setResultVideoUrl, setVideoId, error, pipelineStage, uploadProgress,
    processingResult,
  } = useWorkspaceStore();

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
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || (err as Error)?.message || "Processing failed. Check backend is running.";
      setError(msg);
      setIsUploading(false);
      setIsProcessing(false);
      setPipelineStage("idle");
    }
  };

  const isRunning = isUploading || isProcessing;
  const isDone = pipelineStage === "report";

  return (
    <div className="w-[220px] flex-shrink-0 flex flex-col gap-2 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-thin">

      {/* ═══════════ SECTION 1: Upload Zone ═══════════════════ */}
      <div className="bg-[#111] border border-white/5 rounded-xl p-3 flex-shrink-0">
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

