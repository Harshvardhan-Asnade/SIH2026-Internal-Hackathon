"use client";

import { TopHeader } from "@/components/dashboard/TopHeader";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { VideoWorkspace } from "@/components/dashboard/VideoWorkspace";
import { PipelineStatus } from "@/components/dashboard/PipelineStatus";
import { DynamicTabs } from "@/components/dashboard/DynamicTabs";

import { AIAssistant } from "@/components/dashboard/AIAssistant";
import { useWorkspaceStore } from "@/lib/store";
import { useEffect } from "react";

export default function DashboardPage() {
  const { resetWorkspace } = useWorkspaceStore();

  useEffect(() => {
    return () => resetWorkspace();
  }, [resetWorkspace]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#070707]">
      <TopHeader />

      <div className="flex flex-1 min-h-0 px-3 pt-3 pb-3 gap-3">
        {/* ── Left Sidebar (Upload & Actions) ────────────── */}
        <Sidebar />

        {/* ── Main Content Area (Scrollable single column) ─ */}
        <div className="flex-1 flex flex-col gap-3 min-w-0 min-h-0 overflow-y-auto scrollbar-thin pr-1 pb-4">
          


          {/* Investigation Split: Video (60%) + AI Chat (40%) */}
          <div className="flex gap-3 h-[450px] shrink-0">
            <div className="flex-[6] min-w-0 bg-[#111] border border-white/5 rounded-xl overflow-hidden flex flex-col">
              <VideoWorkspace />
            </div>
            <div className="flex-[4] min-w-0 bg-[#111] rounded-xl overflow-hidden flex flex-col">
              <AIAssistant />
            </div>
          </div>

          {/* Pipeline Tracker */}
          <div className="shrink-0 bg-[#111] border border-white/5 rounded-xl overflow-hidden">
            <PipelineStatus />
          </div>

          {/* Detailed Analytics & Reports (Full width) */}
          <div className="flex-1 min-h-[400px]">
            <DynamicTabs />
          </div>

        </div>
      </div>
    </div>
  );
}
