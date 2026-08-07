"use client";

import { useWorkspaceStore } from "@/lib/store";
import { Upload, Video, Clock, AlertCircle, RotateCcw, Loader2, CheckCircle2 } from "lucide-react";
import { useRef } from "react";
import { uploadVideo, processVideo, getResultVideoUrl } from "@/lib/api-service";
import { motion, AnimatePresence } from "framer-motion";

export function UploadQueue() {
  const {
    activeFile, setActiveFile, isUploading, setIsUploading,
    setUploadProgress, isProcessing, setIsProcessing,
    setPipelineStage, setProcessingResult, setError,
    setResultVideoUrl, setVideoId, error, pipelineStage, uploadProgress,
  } = useWorkspaceStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const sampleVideos = [
    { name: "platform_1.mp4",    dur: "02:14", status: "Ready" },
    { name: "entrance_main.mp4", dur: "05:30", status: "Done"  },
    { name: "track_south.mp4",   dur: "01:45", status: "Done"  },
  ];

  return (
    /* Fixed width: 220px — compact but usable */
    <div className="w-[220px] flex-shrink-0 flex flex-col gap-2 min-h-0">

      {/* ── Drop Zone Card ─────────────────────────── */}
      <div className="bg-[#111] border border-[rgba(255,255,255,0.05)] rounded-xl p-3 flex flex-col gap-2 flex-shrink-0">
        <p className="text-[10px] font-semibold text-[#A0A0A0] uppercase tracking-widest">Source Input</p>

        {/* Drop area */}
        <div
          className={`h-[90px] rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            activeFile
              ? "border-[rgba(184,255,59,0.3)] bg-[rgba(184,255,59,0.04)]"
              : "border-[rgba(255,255,255,0.07)] hover:border-[rgba(255,255,255,0.18)] hover:bg-[rgba(255,255,255,0.02)]"
          }`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => !isRunning && fileInputRef.current?.click()}
        >
          <input type="file" accept="video/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
          <Upload className={`w-5 h-5 mb-1.5 ${activeFile ? "text-[#B8FF3B]" : "text-[#444]"}`} />
          <p className="text-[10px] font-medium text-white leading-tight">
            {activeFile ? "Video ready" : "Drop video here"}
          </p>
          <p className="text-[9px] text-[#555] mt-0.5 truncate max-w-[90%]">
            {activeFile ? activeFile.name : "MP4 · AVI · MOV"}
          </p>
        </div>

        {/* Upload progress */}
        <AnimatePresence>
          {isUploading && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="flex justify-between text-[9px] font-mono text-[#B8FF3B] mb-1">
                <span>UPLOADING</span><span>{uploadProgress}%</span>
              </div>
              <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  className="h-full bg-[#B8FF3B] rounded-full" 
                />
              </div>
            </motion.div>
          )}

          {/* Error */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1, x: [0, -5, 5, -5, 5, 0] }} 
              transition={{ duration: 0.4 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-start gap-2 p-2 rounded-lg bg-[rgba(255,77,77,0.06)] border border-[rgba(255,77,77,0.15)] overflow-hidden"
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
          className={`w-full py-2.5 rounded-xl text-[11px] font-semibold tracking-wide flex items-center justify-center gap-2 transition-all ${
            isDone
              ? "bg-[rgba(184,255,59,0.1)] text-[#B8FF3B] border border-[rgba(184,255,59,0.2)] hover:bg-[rgba(184,255,59,0.15)]"
              : activeFile && !isRunning
              ? "bg-[#B8FF3B] text-[#070707] hover:bg-[#c8ff5b] shadow-[0_0_16px_rgba(184,255,59,0.2)]"
              : "bg-[#181818] text-[#444] cursor-not-allowed border border-[rgba(255,255,255,0.04)]"
          }`}
        >
          {isRunning && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {isDone && <CheckCircle2 className="w-3.5 h-3.5" />}
          {isUploading ? "Uploading…" : isProcessing ? "Processing…" : isDone ? "New Analysis" : "Run AI Pipeline"}
        </button>
      </div>

      {/* ── Recent Files ───────────────────────────── */}
      <div className="bg-[#111] border border-[rgba(255,255,255,0.05)] rounded-xl p-3 flex-1 flex flex-col min-h-0 overflow-hidden">
        <p className="text-[10px] font-semibold text-[#A0A0A0] uppercase tracking-widest mb-2">Recent Files</p>
        <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin">
          {sampleVideos.map((v, i) => (
            <div key={i} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[rgba(255,255,255,0.03)] cursor-pointer transition-colors group">
              <Video className="w-3.5 h-3.5 text-[#444] shrink-0 group-hover:text-white transition-colors" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-white truncate group-hover:text-[#B8FF3B] transition-colors">{v.name}</p>
                <p className="text-[9px] text-[#555] flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{v.dur}</p>
              </div>
              <span className={`text-[8px] uppercase font-mono ${v.status === "Ready" ? "text-[#B8FF3B]" : "text-[#555]"}`}>{v.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }
