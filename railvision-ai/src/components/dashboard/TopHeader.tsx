"use client";

import { useWorkspaceStore } from "@/lib/store";
import { useShallow } from 'zustand/react/shallow';
import { useState, useEffect } from "react";

export function TopHeader() {
  const { isProcessing, pipelineStage, isDemoMode, startDemoMode, setActiveTab } = useWorkspaceStore(useShallow(state => ({
    isProcessing: state.isProcessing,
    pipelineStage: state.pipelineStage,
    isDemoMode: state.isDemoMode,
    startDemoMode: state.startDemoMode,
    setActiveTab: state.setActiveTab
  })));
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("en-IN", { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-cycle tabs in Demo Mode
  useEffect(() => {
    if (!isDemoMode) return;
    const tabs = ["overview", "crowd", "crime", "workers", "alerts"];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % tabs.length;
      setActiveTab(tabs[i]);
    }, 6000); // cycle every 6 seconds
    return () => clearInterval(interval);
  }, [isDemoMode, setActiveTab]);

  const statusLabel = isDemoMode ? "DEMO MODE" : isProcessing ? "PROCESSING" : pipelineStage === "report" ? "COMPLETE" : "ACTIVE";
  const statusColor = isDemoMode ? "#B8FF3B" : isProcessing ? "#FF7A00" : pipelineStage === "report" ? "#B8FF3B" : "#33FF99";

  return (
    <div className="h-14 border-b border-white/5 bg-[#070707] flex items-center justify-between px-6 flex-shrink-0 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 rounded-lg bg-[#B8FF3B] flex items-center justify-center shadow-[0_0_12px_rgba(184,255,59,0.15)]">
          <span className="font-display font-bold text-[10px] text-[#070707]">RV</span>
        </div>
        <span className="text-[13px] font-semibold text-white tracking-wide">RailVision AI</span>
        <div className="w-px h-5 bg-white/10 mx-2" />
        <span className="text-[11px] text-[#777] font-medium tracking-wide">AI Investigation Workspace</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10px] text-[#555] uppercase tracking-wider">Station:</span>
        <span className="text-[11px] text-white">Vadodara Junction</span>
      </div>

      <div className="flex items-center gap-4">
        {!isDemoMode && (
          <button 
            onClick={startDemoMode}
            className="text-[9px] font-mono border border-[rgba(255,255,255,0.1)] hover:bg-[#333] px-2 py-1 rounded transition-colors text-[#A0A0A0]"
          >
            START DEMO
          </button>
        )}
        <span className="text-[10px] text-[#333] font-mono">{time}</span>
        <div className="flex items-center gap-2 bg-[#111] px-3 py-1.5 rounded border border-white/5">
          <div className={`w-2 h-2 rounded-full ${isProcessing || isDemoMode ? "animate-pulse" : ""}`} style={{ backgroundColor: statusColor }} />
          <span className="text-[9px] font-bold font-mono" style={{ color: statusColor }}>{statusLabel}</span>
        </div>
      </div>
    </div>
  );
}
