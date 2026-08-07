"use client";

import { TopHeader } from "@/components/dashboard/TopHeader";
import { UploadQueue } from "@/components/dashboard/UploadQueue";
import { VideoWorkspace } from "@/components/dashboard/VideoWorkspace";
import { LiveIntelligence } from "@/components/dashboard/LiveIntelligence";
import { PipelineStatus } from "@/components/dashboard/PipelineStatus";
import { DynamicTabs } from "@/components/dashboard/DynamicTabs";
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

      {/*
        12-column grid layout:
        Left  (Upload)    → 2.5 cols  ~220px
        Center (Video)    → 6.5 cols  flex-1
        Right  (Intel)    → 3 cols    ~280px
      */}
      <div className="flex flex-col flex-1 min-h-0 px-4 pt-3 pb-3 gap-3">
        {/* ── Tier 1: Three Pillars ───────────────────────── */}
        <div className="flex gap-3 min-h-0" style={{ height: "calc(56vh - 40px)", minHeight: "340px" }}>
          <UploadQueue />
          <VideoWorkspace />
          <LiveIntelligence />
        </div>

        {/* ── Tier 2: Pipeline ────────────────────────────── */}
        <PipelineStatus />

        {/* ── Tier 3: Tabs + Content ──────────────────────── */}
        <DynamicTabs />
      </div>
    </div>
  );
}
