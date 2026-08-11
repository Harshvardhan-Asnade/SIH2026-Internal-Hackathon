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
    <header className="h-16 border-b border-white/10 bg-[var(--surface)]/50 backdrop-blur-md flex items-center justify-between px-6 flex-shrink-0 shadow-[0_4px_24px_rgba(0,0,0,0.4)] z-50">
      <div className="flex items-center gap-4 group link-lift cursor-pointer">
        <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
          <span className="font-mono font-bold text-[12px] text-[#070707]">rA</span>
        </div>
        <div className="flex flex-col">
          <span className="font-sans font-bold text-lg tracking-tight leading-none text-white">
            railway<span className="text-[var(--accent)]">Ai</span>
          </span>
          <span className="font-mono text-[9px] opacity-60 tracking-wider">
            [ EDGE CCTV ]
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest">{'// STATION:'}</span>
        <span className="text-[11px] font-sans font-bold tracking-wide text-[var(--text-1)]">VADODARA JUNCTION</span>
      </div>

      <div className="flex items-center gap-4">
        {!isDemoMode && (
          <button 
            onClick={startDemoMode}
            className="text-[9px] font-mono font-bold border border-white/10 hover:border-[var(--accent)] hover:text-[var(--accent)] px-3 py-1.5 rounded-full transition-colors text-[var(--text-2)] uppercase tracking-widest"
          >
            START DEMO
          </button>
        )}
        <span className="text-[10px] text-white/40 font-mono tracking-wider">{time}</span>
        <div className="flex items-center gap-2 bg-[var(--surface-2)] px-3 py-1.5 rounded-lg border border-white/10 shadow-inner">
          <div className={`w-2 h-2 rounded-full ${isProcessing || isDemoMode ? "animate-pulse" : ""}`} style={{ backgroundColor: statusColor, boxShadow: `0 0 8px ${statusColor}80` }} />
          <span className="text-[9px] font-bold font-mono tracking-widest" style={{ color: statusColor }}>{statusLabel}</span>
        </div>
      </div>
    </header>
  );
}
