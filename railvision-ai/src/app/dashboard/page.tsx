"use client";

import { TopHeader } from "@/components/dashboard/TopHeader";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { VideoWorkspace } from "@/components/dashboard/VideoWorkspace";
import { WebcamWorkspace } from "@/components/dashboard/WebcamWorkspace";
import { MobileCameraWorkspace } from "@/components/dashboard/MobileCameraWorkspace";
import { PipelineStatus } from "@/components/dashboard/PipelineStatus";
import { DynamicTabs } from "@/components/dashboard/DynamicTabs";

import { AIAssistant } from "@/components/dashboard/AIAssistant";
import { useWorkspaceStore } from "@/lib/store";
import { useShallow } from 'zustand/react/shallow';
import { useEffect } from "react";

export default function DashboardPage() {
  const { resetWorkspace, isWebcamActive, isMobileCameraActive } = useWorkspaceStore(useShallow(state => ({
    resetWorkspace: state.resetWorkspace,
    isWebcamActive: state.isWebcamActive,
    isMobileCameraActive: state.isMobileCameraActive,
  })));

  useEffect(() => {
    return () => resetWorkspace();
  }, [resetWorkspace]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--bg)]">
      <TopHeader />

      <div className="flex flex-1 min-h-0 p-4 gap-4">
        {/* ── Left Sidebar (Upload & Actions) ────────────── */}
        <Sidebar />

        {/* ── Main Content Area (Fixed viewport, flex grid) ─ */}
        <div className="flex-1 flex flex-col gap-4 min-w-0 min-h-0 pb-2">
          
          {/* Investigation Split: Video (60%) + AI Chat (40%) */}
          <div className="flex gap-4 flex-[5] min-h-0 shrink-0">
            <div className="flex-[6] min-w-0 flex flex-col">
              {isMobileCameraActive ? <MobileCameraWorkspace /> : isWebcamActive ? <WebcamWorkspace /> : <VideoWorkspace />}
            </div>
            <div className="flex-[4] min-w-0 bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden flex flex-col shadow-lg">
              <AIAssistant />
            </div>
          </div>

          {/* Pipeline Tracker */}
          <div className="shrink-0">
            <PipelineStatus />
          </div>

          {/* Detailed Analytics & Reports (Full width) */}
          <div className="flex-[4] min-h-0 flex flex-col">
            <DynamicTabs />
          </div>

        </div>
      </div>
    </div>
  );
}
