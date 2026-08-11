"use client";

import { useWorkspaceStore } from "@/lib/store";
import { Shield, Users, HardHat, AlertTriangle, Activity, Clock } from "lucide-react";
import { motion, animate, useMotionValue, useTransform } from "framer-motion";
import { useEffect } from "react";

export function LiveIntelligence() {
  const result = useWorkspaceStore((state) => state.processingResult);

  const activeAlerts    = result?.alerts?.length || 0;
  const criticalAlerts  = result?.alerts?.filter(a => a.severity === "critical").length || 0;
  const crowdDensity    = result?.crowd_analysis?.peak || 0;
  const crimeIncidents  = result?.crime_detection?.total_incidents || 0;
  const activeWorkers   = result?.worker_monitoring?.statistics?.total_workers || 0;
  const processingTime  = result?.processing_time?.toFixed(2) || "—";

  let riskScore = 10;
  if (criticalAlerts > 0) riskScore += criticalAlerts * 15;
  if (crowdDensity > 30)  riskScore += 20;
  if (crimeIncidents > 0) riskScore += 25;
  riskScore = Math.min(riskScore, 100);

  const riskColor =
    riskScore > 75 ? "#FF4D4D" :
    riskScore > 40 ? "#FF7A00" :
    "#33FF99";

  // Animated number
  const count = useMotionValue(0);
  const rounded = useTransform(count, Math.round);

  useEffect(() => {
    const animation = animate(count, result ? riskScore : 0, { duration: 1.5, ease: "easeOut" });
    return animation.stop;
  }, [result, riskScore, count]);

  return (
    /* Fixed width: 300px — wider than upload, full stats visible */
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-[300px] flex-shrink-0 flex flex-col gap-2 min-h-0">

      {/* ── Header ─────────────────────────────────── */}
      <div className="flex items-center gap-2 px-1">
        <Activity className="w-3.5 h-3.5 text-[var(--accent)]" />
        <h3 className="text-[10px] font-semibold text-[var(--text-1)] uppercase tracking-widest">Live Intelligence</h3>
        <div className="ml-auto flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${result ? "bg-[var(--accent)] animate-pulse" : "bg-[var(--surface-2)]"}`} />
          <span className="text-[9px] text-[var(--text-3)] font-mono">LIVE</span>
        </div>
      </div>

      {/* ── Risk Score ─────────────────────────────── */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex-shrink-0">
        <div className="flex items-baseline justify-between mb-3">
          <span className="text-[10px] text-[#666] uppercase tracking-wider">System Risk</span>
          <span className="text-[9px] text-[var(--text-3)] font-mono">/ 100</span>
        </div>
        <div className="flex items-end gap-2 mb-3">
          <motion.span className="text-5xl font-display font-bold leading-none" style={{ color: riskColor }}>
            {result ? rounded : "—"}
          </motion.span>
        </div>
        <div className="w-full h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${result ? riskScore : 0}%`, backgroundColor: riskColor }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="h-full rounded-full"
          />
        </div>
        <div className="flex justify-between mt-1.5 text-[8px] text-[var(--text-3)]">
          <span>LOW</span><span>MED</span><span>HIGH</span><span>CRITICAL</span>
        </div>
      </div>

      {/* ── 4 Stat Cards ───────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 flex-shrink-0">
        <StatCard
          icon={Users}
          iconColor="#B8FF3B"
          label="Crowd Peak"
          value={result ? String(crowdDensity) : "—"}
          sub="people detected"
        />
        <StatCard
          icon={Shield}
          iconColor="#FF7A00"
          label="Incidents"
          value={result ? String(crimeIncidents) : "—"}
          sub="crime events"
          valueColor="#FF7A00"
        />
        <StatCard
          icon={HardHat}
          iconColor="#33FF99"
          label="Workers"
          value={result ? String(activeWorkers) : "—"}
          sub="active staff"
        />
        <StatCard
          icon={AlertTriangle}
          iconColor="#FF4D4D"
          label="Alerts"
          value={result ? String(activeAlerts) : "—"}
          sub={`${criticalAlerts} critical`}
          valueColor={activeAlerts > 0 ? "#FF4D4D" : undefined}
        />
      </div>

      {/* ── Footer ─────────────────────────────────── */}
      <div className="mt-auto bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 grid grid-cols-2 gap-2">
        <div>
          <p className="text-[9px] text-[var(--text-3)] uppercase tracking-wider mb-1">AI Confidence</p>
          <p className="text-[15px] font-mono font-bold text-[var(--text-1)]">96.4<span className="text-[10px] text-[var(--text-3)]">%</span></p>
        </div>
        <div>
          <p className="text-[9px] text-[var(--text-3)] uppercase tracking-wider mb-1 flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" /> Proc. Time
          </p>
          <p className="text-[15px] font-mono font-bold text-[var(--accent)]">{processingTime}<span className="text-[10px] text-[var(--text-3)]">s</span></p>
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({
  icon: Icon, iconColor, label, value, sub, valueColor
}: {
  icon: React.ElementType; iconColor: string; label: string;
  value: string; sub?: string; valueColor?: string;
}) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-4 h-4" style={{ color: iconColor }} />
        <span className="text-[8px] text-[var(--text-3)] uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-2xl font-display font-bold leading-none" style={{ color: valueColor || "white" }}>{value}</span>
      {sub && <span className="text-[8px] text-[var(--text-3)] mt-1">{sub}</span>}
    </div>
  );
}
