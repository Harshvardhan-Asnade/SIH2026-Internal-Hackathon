"use client";

import { useWorkspaceStore } from "@/lib/store";
import { Activity, Users, AlertTriangle, Target, Cpu } from "lucide-react";

export function KPIRow() {
  const { processingResult: r } = useWorkspaceStore();

  const crowdPeak = r?.crowd_analysis?.maximum_people || 0;
  const alertCount = r?.alerts?.length || 0;
  const criticalCount = r?.alerts?.filter(a => a.severity === "critical").length || 0;
  const detectionsCount = r?.detections?.length || 0;
  const crimeCount = r?.crime_detection?.total_incidents || 0;

  let riskScore = 10;
  if (criticalCount > 0) riskScore += criticalCount * 15;
  if (crowdPeak > 30) riskScore += 20;
  if (crimeCount > 0) riskScore += 25;
  riskScore = Math.min(riskScore, 100);
  const riskColor = riskScore > 75 ? "#FF4D4D" : riskScore > 40 ? "#FF7A00" : "#B8FF3B";

  const cards = [
    {
      icon: Activity,
      color: riskColor,
      title: "Risk Level",
      value: r ? riskScore : "—",
      sub: r ? (riskScore > 75 ? "Critical" : riskScore > 40 ? "Elevated" : "Normal") : "Idle",
    },
    {
      icon: Users,
      color: "#B8FF3B",
      title: "Crowd Peak",
      value: r ? crowdPeak : "—",
      sub: r ? `${r.crowd_analysis?.density || "Low"} density` : "Idle",
    },
    {
      icon: AlertTriangle,
      color: criticalCount > 0 ? "#FF4D4D" : "#FFC857",
      title: "Active Alerts",
      value: r ? alertCount : "—",
      sub: r ? `${criticalCount} critical` : "Idle",
    },
    {
      icon: Target,
      color: "#B8FF3B",
      title: "Detections",
      value: r ? detectionsCount : "—",
      sub: r ? "Tracked entities" : "Idle",
    },
    {
      icon: Cpu,
      color: "#33FF99",
      title: "Processing",
      value: r ? `${r.fps}` : "—",
      sub: r ? `${r.processing_time.toFixed(2)}s • FPS` : "Idle",
    },
  ];

  return (
    <div className="flex flex-col gap-2 flex-shrink-0 mt-2">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div
            key={i}
            className="flex-1 bg-[#111] border border-white/5 rounded-xl p-3 flex items-center gap-3 hover:border-[rgba(255,255,255,0.1)] transition-colors min-w-0"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${c.color}10` }}
            >
              <Icon className="w-4 h-4" style={{ color: c.color }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] text-[#555] uppercase tracking-wider font-semibold truncate">{c.title}</p>
              <p className="text-[20px] font-display font-bold text-white leading-none mt-0.5">{c.value}</p>
              <p className="text-[9px] text-[#555] mt-0.5 truncate">{c.sub}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
