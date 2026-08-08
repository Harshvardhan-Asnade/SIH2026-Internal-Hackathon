"use client";

import { useWorkspaceStore } from "@/lib/store";
import { Upload, Focus, Activity, Box, ShieldAlert, CheckCircle2, FileText, Search, Layers } from "lucide-react";

export function PipelineStatus() {
  const pipelineStage = useWorkspaceStore(state => state.pipelineStage);

  const stages = [
    { id: "upload", label: "Upload", icon: Upload },
    { id: "extraction", label: "Frame Extraction", icon: Search },
    { id: "detection", label: "YOLO Detection", icon: Focus },
    { id: "tracking", label: "ByteTrack", icon: Activity },
    { id: "analysis", label: "Analysis", icon: Layers },
    { id: "alerts", label: "Alert Generation", icon: ShieldAlert },
    { id: "report", label: "Report Ready", icon: FileText },
  ];

  const getStageState = (stageId: string, index: number) => {
    const currentIndex = stages.findIndex(s => s.id === pipelineStage);
    if (pipelineStage === "idle") return "pending";
    if (pipelineStage === "report") return "completed";
    if (index < currentIndex) return "completed";
    if (index === currentIndex) return "active";
    return "pending";
  };

  return (
    <div className="bg-[#111] border border-white/5 rounded-xl py-2 px-8 mt-0 flex items-center justify-between relative overflow-hidden flex-shrink-0 shadow-md">
      {/* Background track */}
      <div className="absolute left-10 right-10 top-1/2 -translate-y-1/2 h-[1px] bg-[rgba(255,255,255,0.05)] z-0" />

      {/* Active track */}
      <div
        className="absolute left-10 top-1/2 -translate-y-1/2 h-[1px] z-0 transition-all duration-700 ease-in-out"
        style={{
          background: "linear-gradient(90deg, #B8FF3B, rgba(184,255,59,0.3))",
          width: pipelineStage === "idle" ? "0%" :
                 pipelineStage === "report" ? "calc(100% - 80px)" :
                 `${((stages.findIndex(s => s.id === pipelineStage) + 0.5) / stages.length) * 100}%`
        }}
      />

      {stages.map((stage, i) => {
        const state = getStageState(stage.id, i);
        const Icon = stage.icon;

        return (
          <div key={stage.id} className="relative z-10 flex flex-row items-center gap-2 bg-[#111] px-2 rounded-full">
            <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300 ${
              state === "completed" ? "bg-[#B8FF3B] text-[#070707] shadow-[0_0_8px_rgba(184,255,59,0.3)]" :
              state === "active" ? "bg-[#070707] border border-[#B8FF3B] text-[#B8FF3B] shadow-[0_0_10px_rgba(184,255,59,0.2)] animate-pulse" :
              "bg-[#181818] border border-white/5 text-[#555]"
            }`}>
              {state === "completed" ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Icon className="w-2.5 h-2.5" />}
            </div>
            <span className={`text-[8px] uppercase tracking-widest font-medium whitespace-nowrap ${
              state === "completed" ? "text-white" :
              state === "active" ? "text-[#B8FF3B]" :
              "text-[#555]"
            }`}>
              {stage.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
