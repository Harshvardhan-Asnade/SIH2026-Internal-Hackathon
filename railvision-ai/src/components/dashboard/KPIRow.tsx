"use client";

import { useWorkspaceStore } from "@/lib/store";
import { Activity, Users, AlertTriangle, Target, Cpu } from "lucide-react";

export function KPIRow() {
  const r = useWorkspaceStore(state => state.processingResult);

  const crowdPeak = r?.crowd_analysis?.peak || 0;
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
    <div className="flex flex-col gap-4 flex-shrink-0">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div
            key={i}
            className="flex-1 relative overflow-hidden rounded-xl p-5 flex items-center gap-4 border border-white/10 hover:border-white/30 shadow-[0_4px_24px_rgba(0,0,0,0.4)] transition-all duration-300 min-w-0 group"
            style={{ backgroundColor: `color-mix(in srgb, ${c.color} 5%, var(--surface))` }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform"
              style={{ backgroundColor: `${c.color}15`, border: `1px solid ${c.color}30` }}
            >
              <Icon className="w-4 h-4" style={{ color: c.color }} />
            </div>
            <div className="min-w-0 flex-1 relative z-10">
              <p className="font-mono text-[9px] text-white/50 uppercase tracking-widest font-bold truncate mb-1">{c.title}</p>
              <p className="font-sans text-3xl font-extrabold text-white leading-none tracking-tight">{c.value}</p>
              <p className="font-mono text-[10px] mt-1.5 truncate uppercase tracking-wider font-bold" style={{ color: c.sub === 'Idle' ? 'rgba(255,255,255,0.4)' : c.color }}>{c.sub}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
