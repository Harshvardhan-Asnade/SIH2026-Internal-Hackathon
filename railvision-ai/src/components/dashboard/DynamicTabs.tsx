"use client";

import { useWorkspaceStore } from "@/lib/store";
import type { Alert, CrimeEvent, WorkerInfo } from "@/lib/api-types";
import {
  AlertTriangle, Activity, Users, Shield, HardHat, FileText, Download,
  Clock, BarChart3, Eye, Search, Filter, ChevronRight, Play,
  TrendingUp, MapPin, Flame, Zap, Target, CheckCircle2,
} from "lucide-react";
import { useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { exportToPDF } from "@/lib/export-pdf";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } }
};

export function DynamicTabs() {
  const {
    activeTab, setActiveTab, processingResult, triggerJumpToFrame,
    alertFilter, setAlertFilter, moduleFilter, setModuleFilter,
    isProcessing
  } = useWorkspaceStore();

  const tabs = [
    { id: "overview", label: "Overview", icon: Eye },
    { id: "crowd", label: "Crowd", icon: Users },
    { id: "crime", label: "Crime", icon: Shield },
    { id: "workers", label: "Workers", icon: HardHat },
    { id: "alerts", label: "Alerts", icon: AlertTriangle },
    { id: "timeline", label: "Timeline", icon: Clock },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "reports", label: "Reports", icon: FileText },
    { id: "export", label: "Export", icon: Download },
  ];

  const r = processingResult;

  // ── Alert filtering ──────────────────────────────────────
  const filteredAlerts = useMemo(() => {
    if (!r?.alerts) return [];
    let out = [...r.alerts];
    if (alertFilter !== "all") out = out.filter(a => a.severity === alertFilter);
    if (moduleFilter !== "all") out = out.filter(a => a.module === moduleFilter);
    return out;
  }, [r, alertFilter, moduleFilter]);

  // ── Crime events aggregation ─────────────────────────────
  const allCrimeEvents = useMemo(() => {
    if (!r?.crime_detection) return [];
    const cd = r.crime_detection;
    const events: (CrimeEvent & { _type: string })[] = [];
    (cd.track_intrusion || []).forEach(e => events.push({ ...e, _type: "Track Intrusion" }));
    (cd.restricted_area || []).forEach(e => events.push({ ...e, _type: "Restricted Area" }));
    (cd.abandoned_baggage || []).forEach(e => events.push({ ...e, _type: "Abandoned Baggage" }));
    (cd.loitering || []).forEach(e => events.push({ ...e, _type: "Loitering" }));
    (cd.running_detection || []).forEach(e => events.push({ ...e, _type: "Running Detection" }));
    (cd.crowd_panic || []).forEach(e => events.push({ ...e, _type: "Crowd Panic" }));
    (cd.fight_detection || []).forEach(e => events.push({ ...e, _type: "Fight Detection" }));
    return events.sort((a, b) => a.frame - b.frame);
  }, [r]);

  return (
    <div className="flex flex-col mt-3 flex-1 min-h-0 bg-[#0a0a0a] rounded-xl border border-[rgba(255,255,255,0.04)] overflow-hidden">
      {/* ── Tab Navigation ────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[rgba(255,255,255,0.04)] bg-[#0c0c0c] overflow-x-auto relative">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          let badge: number | null = null;
          if (tab.id === "alerts" && r?.alerts) badge = r.alerts.length;
          if (tab.id === "crime" && r?.crime_detection) badge = r.crime_detection.total_incidents;

          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`relative px-4 py-2 rounded-lg text-[12px] font-medium transition-colors whitespace-nowrap flex items-center gap-2 z-10 ${
                isActive ? "text-white" : "text-[#A0A0A0] hover:text-white hover:bg-[rgba(255,255,255,0.03)]"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-[rgba(255,255,255,0.08)] rounded-lg shadow-sm"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <Icon className="w-4 h-4" />
                {tab.label}
                {badge !== null && badge > 0 && (
                  <span className="ml-1 text-[10px] bg-[rgba(255,77,77,0.2)] text-[#FF4D4D] px-2 py-0.5 rounded-full font-mono">{badge}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Dynamic Content Area ──────────────────────────── */}
      <div className="flex-1 p-6 overflow-y-auto">
        {!r ? (
          isProcessing ? (
            <div className="h-full w-full space-y-6">
              <div className="grid grid-cols-4 gap-5">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-[90px] rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] animate-pulse" />
                ))}
              </div>
              <div className="h-[250px] rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] animate-pulse" />
              <div className="h-[150px] rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] animate-pulse" />
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="h-full flex flex-col items-center justify-center text-[#555]"
            >
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-[#B8FF3B] blur-3xl opacity-10 rounded-full" />
                <Activity className="w-16 h-16 opacity-30 relative z-10" />
              </div>
              <p className="text-[15px] text-white font-medium mb-1">Awaiting Video Input</p>
              <p className="text-[11px] text-[#A0A0A0]">Upload CCTV footage to begin the AI investigation</p>
            </motion.div>
          )
        ) : (
          <AnimatePresence mode="wait">
            {/* ════════════════ OVERVIEW ════════════════════ */}
            {activeTab === "overview" && (
              <motion.div key="overview" variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0, y: -10 }} className="grid grid-cols-4 gap-5">
                <MetricCard label="FPS" value={r.fps} />
                <MetricCard label="Total Frames" value={r.frames} />
                <MetricCard label="Processing Time" value={`${r.processing_time.toFixed(2)}s`} accent />
                <MetricCard label="Detections" value={r.detections?.length || 0} />

                <div className="col-span-2 bg-[#111] border border-[rgba(255,255,255,0.05)] rounded-xl p-5">
                  <h4 className="text-[11px] text-[#A0A0A0] uppercase tracking-wider mb-4 font-semibold">Module Summary</h4>
                  <div className="space-y-3">
                    <SummaryRow icon={Users} label="Crowd" value={`Peak: ${r.crowd_analysis?.maximum_people || 0} people`} color="#B8FF3B" />
                    <SummaryRow icon={Shield} label="Crime" value={`${r.crime_detection?.total_incidents || 0} incidents`} color="#FF7A00" />
                    <SummaryRow icon={HardHat} label="Workers" value={`${r.work_monitoring?.statistics?.total_workers || 0} staff`} color="#33FF99" />
                    <SummaryRow icon={AlertTriangle} label="Alerts" value={`${r.alerts?.length || 0} total`} color="#FF4D4D" />
                  </div>
                </div>

                <div className="col-span-2 bg-[#111] border border-[rgba(255,255,255,0.05)] rounded-xl p-5">
                  <h4 className="text-[11px] text-[#A0A0A0] uppercase tracking-wider mb-4 font-semibold">Latest Events</h4>
                  <div className="space-y-2">
                    {(r.alerts || []).slice(0, 5).map((a, i) => (
                      <div key={i} onClick={() => a.frame && triggerJumpToFrame(a.frame)}
                        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[rgba(255,255,255,0.03)] cursor-pointer transition-colors group"
                      >
                        <div className={`w-2 h-2 rounded-full ${a.severity === "critical" ? "bg-[#FF4D4D]" : a.severity === "high" ? "bg-[#FF7A00]" : "bg-[#FFC857]"}`} />
                        <span className="text-[12px] text-white flex-1 truncate group-hover:text-[#B8FF3B] transition-colors">{a.message}</span>
                        <span className="text-[10px] text-[#555] font-mono">F{a.frame}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ════════════════ CROWD ═══════════════════════ */}
            {activeTab === "crowd" && (
              <motion.div key="crowd" variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="grid grid-cols-5 gap-5">
                  <MetricCard label="Current Count" value={r.crowd_analysis?.maximum_people || 0} accent />
                  <MetricCard label="Average" value={r.crowd_analysis?.average_people?.toFixed(1) || "0"} />
                  <MetricCard label="Peak Frame" value={r.crowd_analysis?.peak_frame || 0} />
                  <MetricCard label="Occupancy" value={`${r.crowd_analysis?.occupancy_percentage || 0}%`} />
                  <MetricCard label="Density" value={r.crowd_analysis?.density || "Low"} />
                </div>

                {/* Occupancy bar */}
                <div className="bg-[#111] border border-[rgba(255,255,255,0.05)] rounded-xl p-5">
                  <h4 className="text-[11px] text-[#A0A0A0] uppercase tracking-wider mb-4 font-semibold">Space Occupancy</h4>
                  <div className="w-full h-3 bg-[#181818] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#33FF99] via-[#FFC857] to-[#FF4D4D] rounded-full transition-all duration-700"
                      style={{ width: `${r.crowd_analysis?.occupancy_percentage || 0}%` }} />
                  </div>
                  <div className="flex justify-between mt-3 text-[10px] text-[#555] uppercase tracking-wider">
                    <span>0%</span><span>Safe</span><span>Warning</span><span>Critical</span><span>100%</span>
                  </div>
                </div>

                {/* Crowd Trend */}
                <div className="bg-[#111] border border-[rgba(255,255,255,0.05)] rounded-xl p-5">
                  <h4 className="text-[11px] text-[#A0A0A0] uppercase tracking-wider mb-4 font-semibold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#B8FF3B]" /> Crowd Trend
                  </h4>
                  <div className="h-32 flex items-end gap-1">
                    {(r.crowd_analysis?.trend || []).slice(0, 60).map((t, i) => {
                      const maxP = r.crowd_analysis?.maximum_people || 1;
                      const h = Math.max(4, (t.people_count / maxP) * 100);
                      return (
                        <div key={i} className="flex-1 cursor-pointer group relative h-full flex items-end"
                          onClick={() => triggerJumpToFrame(t.frame)}>
                          <div className="w-full bg-[rgba(184,255,59,0.3)] hover:bg-[rgba(184,255,59,0.7)] rounded-t transition-colors"
                            style={{ height: `${h}%` }} />
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-[#555] mt-3">Click any bar to jump to the corresponding frame.</p>
                </div>
              </motion.div>
            )}

            {/* ════════════════ CRIME ═══════════════════════ */}
            {activeTab === "crime" && (
              <motion.div key="crime" variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="grid grid-cols-4 gap-5">
                  <MetricCard label="Total Incidents" value={r.crime_detection?.total_incidents || 0} color="#FF7A00" />
                  <MetricCard label="Critical" value={r.crime_detection?.critical_incidents || 0} color="#FF4D4D" />
                  <MetricCard label="High" value={r.crime_detection?.high_incidents || 0} color="#FF7A00" />
                  <MetricCard label="Tracked Persons" value={r.crime_detection?.tracked_persons || 0} />
                </div>

                {/* Category breakdown */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Track Intrusion", data: r.crime_detection?.track_intrusion, icon: Target },
                    { label: "Restricted Area", data: r.crime_detection?.restricted_area, icon: MapPin },
                    { label: "Abandoned Bag", data: r.crime_detection?.abandoned_baggage, icon: Shield },
                    { label: "Loitering", data: r.crime_detection?.loitering, icon: Clock },
                    { label: "Running", data: r.crime_detection?.running_detection, icon: Zap },
                    { label: "Crowd Panic", data: r.crime_detection?.crowd_panic, icon: Flame },
                    { label: "Fight", data: r.crime_detection?.fight_detection, icon: AlertTriangle },
                  ].map((cat, i) => {
                    const Icon = cat.icon;
                    const count = cat.data?.length || 0;
                    return (
                      <div key={i} className={`bg-[#111] border rounded-xl p-4 transition-colors ${count > 0 ? "border-[rgba(255,122,0,0.2)] bg-[rgba(255,122,0,0.02)]" : "border-[rgba(255,255,255,0.05)]"}`}>
                        <div className="flex items-center gap-2 mb-3">
                          <Icon className={`w-4 h-4 ${count > 0 ? "text-[#FF7A00]" : "text-[#555]"}`} />
                          <span className="text-[11px] text-[#A0A0A0] uppercase tracking-wider">{cat.label}</span>
                        </div>
                        <p className={`text-3xl font-display font-bold ${count > 0 ? "text-[#FF7A00]" : "text-[#555]"}`}>{count}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Crime event list */}
                <div className="bg-[#111] border border-[rgba(255,255,255,0.05)] rounded-xl p-5">
                  <h4 className="text-[11px] text-[#A0A0A0] uppercase tracking-wider mb-4 font-semibold">Incident Log</h4>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                    {allCrimeEvents.map((e, i) => (
                      <div key={i} onClick={() => triggerJumpToFrame(e.frame)}
                        className="flex items-center gap-4 p-3 rounded-lg border border-[rgba(255,122,0,0.1)] bg-[rgba(255,122,0,0.03)] hover:bg-[rgba(255,122,0,0.08)] cursor-pointer transition-colors"
                      >
                        <div className="w-12 h-12 rounded-lg bg-[#0a0a0a] border border-[rgba(255,255,255,0.05)] flex items-center justify-center font-mono text-[11px] text-[#A0A0A0]">F{e.frame}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-white font-medium mb-1">{(e as CrimeEvent & { _type: string })._type}</p>
                          <p className="text-[11px] text-[#A0A0A0]">Confidence: {(e.confidence * 100).toFixed(0)}% — Risk: {e.risk}</p>
                        </div>
                        <span className={`text-[10px] uppercase font-mono px-3 py-1 rounded-full ${
                          e.risk === "critical" ? "bg-[rgba(255,77,77,0.15)] text-[#FF4D4D]" : "bg-[rgba(255,122,0,0.15)] text-[#FF7A00]"
                        }`}>{e.risk}</span>
                      </div>
                    ))}
                    {allCrimeEvents.length === 0 && <p className="text-[13px] text-[#555] text-center py-6">No incidents detected in this session.</p>}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ════════════════ WORKERS ═════════════════════ */}
            {activeTab === "workers" && (
              <motion.div key="workers" variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="grid grid-cols-4 gap-5">
                  <MetricCard label="Total Staff" value={r.work_monitoring?.statistics?.total_workers || 0} />
                  <MetricCard label="Helmet %" value={`${r.work_monitoring?.statistics?.helmet_compliance || 0}%`} color="#33FF99" />
                  <MetricCard label="Jacket %" value={`${r.work_monitoring?.statistics?.jacket_compliance || 0}%`} color="#33FF99" />
                  <MetricCard label="Safety Score" value={`${r.work_monitoring?.statistics?.overall_safety || 0}%`} accent />
                </div>

                <div className="bg-[#111] border border-[rgba(255,255,255,0.05)] rounded-xl p-5">
                  <h4 className="text-[11px] text-[#A0A0A0] uppercase tracking-wider mb-4 font-semibold">Worker Roster</h4>
                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2">
                    {(r.work_monitoring?.workers || []).map((w: WorkerInfo) => (
                      <div key={w.worker_id} className="flex items-center gap-4 p-3 rounded-lg border border-[rgba(255,255,255,0.03)] bg-[rgba(255,255,255,0.01)] hover:bg-[rgba(255,255,255,0.04)] transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-[#0a0a0a] border border-[rgba(255,255,255,0.05)] flex items-center justify-center text-[11px] font-mono text-[#A0A0A0]">
                          W{w.worker_id}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1.5">
                            <span className="text-[13px] font-medium text-white">Worker #{w.worker_id}</span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${w.working ? "bg-[rgba(51,255,153,0.1)] text-[#33FF99]" : "bg-[rgba(255,77,77,0.1)] text-[#FF4D4D]"}`}>
                              {w.working ? "Active" : "Idle"}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-[11px] text-[#A0A0A0]">
                            <span className={w.helmet ? "text-[#33FF99]" : "text-[#FF4D4D]"}>{w.helmet ? "🪖 Helmet ✓" : "🪖 No Helmet"}</span>
                            <span className={w.jacket ? "text-[#33FF99]" : "text-[#FF4D4D]"}>{w.jacket ? "🦺 Jacket ✓" : "🦺 No Jacket"}</span>
                            <span className="text-[#555] ml-2">Zone: {w.zone}</span>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end justify-center">
                          <p className={`text-[18px] font-mono font-bold leading-none ${w.compliance >= 80 ? "text-[#33FF99]" : w.compliance >= 50 ? "text-[#FFC857]" : "text-[#FF4D4D]"}`}>
                            {w.compliance}%
                          </p>
                          <p className="text-[9px] text-[#555] mt-1 uppercase tracking-wider">Compliance</p>
                        </div>
                      </div>
                    ))}
                    {(!r.work_monitoring?.workers || r.work_monitoring.workers.length === 0) && (
                      <p className="text-[13px] text-[#555] text-center py-6">No workers detected.</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ════════════════ ALERTS ══════════════════════ */}
            {activeTab === "alerts" && (
              <motion.div key="alerts" variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0, y: -10 }} className="space-y-5">
                {/* Filter bar */}
                <div className="flex items-center gap-3 flex-wrap bg-[#111] p-3 rounded-xl border border-[rgba(255,255,255,0.05)]">
                  <Filter className="w-4 h-4 text-[#555] mx-2" />
                  {["all", "critical", "high", "medium", "low"].map(f => (
                    <button key={f} onClick={() => setAlertFilter(f)}
                      className={`px-4 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                        alertFilter === f ? "bg-[#333] text-white" : "text-[#A0A0A0] hover:text-white hover:bg-[rgba(255,255,255,0.04)]"
                      }`}
                    >{f === "all" ? "All Severities" : f.charAt(0).toUpperCase() + f.slice(1)}</button>
                  ))}
                  <div className="w-px h-5 bg-[rgba(255,255,255,0.1)] mx-2" />
                  {["all", "crowd", "crime", "workers"].map(m => (
                    <button key={m} onClick={() => setModuleFilter(m)}
                      className={`px-4 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                        moduleFilter === m ? "bg-[#333] text-white" : "text-[#A0A0A0] hover:text-white hover:bg-[rgba(255,255,255,0.04)]"
                      }`}
                    >{m === "all" ? "All Modules" : m.charAt(0).toUpperCase() + m.slice(1)}</button>
                  ))}
                </div>

                {/* Alert list */}
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {filteredAlerts.map((a, i) => {
                    const c = a.severity === "critical" ? "#FF4D4D" : a.severity === "high" ? "#FF7A00" : "#FFC857";
                    return (
                      <div key={i} onClick={() => a.frame && triggerJumpToFrame(a.frame)}
                        className="bg-[#111] border border-[rgba(255,255,255,0.05)] rounded-xl p-4 flex gap-4 cursor-pointer hover:border-[rgba(255,255,255,0.15)] transition-all group"
                      >
                        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${c}15` }}>
                          <AlertTriangle className="w-4 h-4" style={{ color: c }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-3 mb-1.5">
                            <h4 className="text-[13px] font-semibold text-white tracking-wide">{a.module.toUpperCase()} ALERT</h4>
                            <span className="text-[10px] font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider" style={{ backgroundColor: `${c}20`, color: c }}>{a.severity}</span>
                          </div>
                          <p className="text-[12px] text-[#A0A0A0] leading-relaxed mb-3">{a.message}</p>
                          <div className="flex items-center gap-4 text-[11px] text-[#555] font-mono">
                            <span>F {a.frame}</span>
                            <span>CONF {(a.confidence * 100).toFixed(0)}%</span>
                            <span className="ml-auto text-[#B8FF3B] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
                              <Play className="w-3.5 h-3.5" /> Jump to frame
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {filteredAlerts.length === 0 && <p className="text-[13px] text-[#555] text-center py-10">No alerts match the current filter.</p>}
                </div>
              </motion.div>
            )}

            {/* ════════════════ TIMELINE ════════════════════ */}
            {activeTab === "timeline" && (
              <motion.div key="timeline" variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0, y: -10 }} className="space-y-8">
                <div className="bg-[#111] border border-[rgba(255,255,255,0.05)] rounded-xl p-6">
                  <h3 className="text-[11px] font-semibold text-[#A0A0A0] uppercase tracking-wider mb-6">Event Timeline</h3>

                  {/* Visual timeline bar */}
                  <div className="relative h-10 bg-[#0a0a0a] rounded-lg border border-[rgba(255,255,255,0.04)] overflow-visible">
                    <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 h-[2px] bg-[#181818]" />
                    {(r.alerts || []).map((a, i) => {
                      if (!a.frame) return null;
                      const pos = (a.frame / r.frames) * 100;
                      const c = a.severity === "critical" ? "#FF4D4D" : a.severity === "high" ? "#FF7A00" : "#B8FF3B";
                      return (
                        <div key={i} onClick={() => triggerJumpToFrame(a.frame!)}
                          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-6 rounded-full cursor-pointer hover:scale-150 transition-transform z-10 group"
                          style={{ left: `${pos}%`, backgroundColor: c }}
                        >
                          <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black border border-[rgba(255,255,255,0.1)] px-3 py-1.5 rounded text-[10px] whitespace-nowrap pointer-events-none z-50 font-medium">
                            {a.module.toUpperCase()} @ F{a.frame}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Chronological event list */}
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
                  {[...(r.alerts || [])].sort((a, b) => (a.frame || 0) - (b.frame || 0)).map((a, i) => {
                    const c = a.severity === "critical" ? "#FF4D4D" : a.severity === "high" ? "#FF7A00" : "#FFC857";
                    return (
                      <div key={i} onClick={() => a.frame && triggerJumpToFrame(a.frame)}
                        className="bg-[#111] border border-[rgba(255,255,255,0.05)] rounded-xl p-4 flex items-center gap-5 cursor-pointer hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                      >
                        <div className="w-12 h-12 rounded-xl bg-[#0a0a0a] flex items-center justify-center font-mono text-[12px] border border-[rgba(255,255,255,0.05)] text-[#A0A0A0]">
                          F{a.frame}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1.5">
                            <p className="text-[13px] font-medium text-white">{a.module.toUpperCase()} — {a.message}</p>
                            <span className="text-[10px] font-mono font-bold px-3 py-1 rounded-full uppercase" style={{ backgroundColor: `${c}15`, color: c }}>{a.severity}</span>
                          </div>
                          <p className="text-[11px] text-[#555] font-mono">CONF {(a.confidence * 100).toFixed(0)}%</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ════════════════ ANALYTICS ═══════════════════ */}
            {activeTab === "analytics" && (
              <motion.div key="analytics" variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="grid grid-cols-5 gap-5">
                  <MetricCard label="FPS" value={r.fps} />
                  <MetricCard label="Total Frames" value={r.frames} />
                  <MetricCard label="Processing" value={`${r.processing_time.toFixed(2)}s`} accent />
                  <MetricCard label="Detections" value={r.detections?.length || 0} />
                  <MetricCard label="Alerts" value={r.alerts?.length || 0} color="#FF4D4D" />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Detection class distribution */}
                  <div className="bg-[#111] border border-[rgba(255,255,255,0.05)] rounded-xl p-5">
                    <h4 className="text-[11px] text-[#A0A0A0] uppercase tracking-wider mb-5 font-semibold">Detection Distribution</h4>
                    <div className="space-y-3">
                      {(() => {
                        const counts: Record<string, number> = {};
                        (r.detections || []).forEach(d => { counts[d.class] = (counts[d.class] || 0) + 1; });
                        const total = r.detections?.length || 1;
                        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([cls, count]) => (
                          <div key={cls} className="flex items-center gap-4">
                            <span className="text-[11px] text-[#A0A0A0] w-24 truncate">{cls}</span>
                            <div className="flex-1 h-2 bg-[#181818] rounded-full overflow-hidden">
                              <div className="h-full bg-[#B8FF3B] rounded-full" style={{ width: `${(count / total) * 100}%` }} />
                            </div>
                            <span className="text-[11px] font-mono text-white w-12 text-right">{count}</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>

                  {/* Alert severity distribution */}
                  <div className="bg-[#111] border border-[rgba(255,255,255,0.05)] rounded-xl p-5">
                    <h4 className="text-[11px] text-[#A0A0A0] uppercase tracking-wider mb-5 font-semibold">Alert Severity Breakdown</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {["critical", "high", "medium", "low"].map(sev => {
                        const count = (r.alerts || []).filter(a => a.severity === sev).length;
                        const c = sev === "critical" ? "#FF4D4D" : sev === "high" ? "#FF7A00" : sev === "medium" ? "#FFC857" : "#33FF99";
                        return (
                          <div key={sev} className="bg-[#0a0a0a] border border-[rgba(255,255,255,0.03)] rounded-lg p-4 flex flex-col items-center justify-center">
                            <p className="text-4xl font-display font-bold mb-1" style={{ color: c }}>{count}</p>
                            <p className="text-[10px] uppercase tracking-widest text-[#555]">{sev}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ════════════════ REPORTS ═════════════════════ */}
            {activeTab === "reports" && (
              <motion.div key="reports" variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="bg-[#111] border border-[rgba(255,255,255,0.05)] rounded-xl p-8">
                  <h4 className="text-[14px] font-semibold text-white uppercase tracking-wider mb-6 pb-4 border-b border-[rgba(255,255,255,0.04)]">AI Investigation Report</h4>
                  <div className="space-y-6 text-[13px] text-[#A0A0A0]">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-[#0a0a0a] p-4 rounded-lg border border-[rgba(255,255,255,0.03)]"><span className="text-[#555] uppercase tracking-wider text-[10px] block mb-1">Source Video</span> <span className="text-white font-medium">{r.video}</span></div>
                      <div className="bg-[#0a0a0a] p-4 rounded-lg border border-[rgba(255,255,255,0.03)]"><span className="text-[#555] uppercase tracking-wider text-[10px] block mb-1">Total Frames</span> <span className="text-white font-mono">{r.frames}</span></div>
                      <div className="bg-[#0a0a0a] p-4 rounded-lg border border-[rgba(255,255,255,0.03)]"><span className="text-[#555] uppercase tracking-wider text-[10px] block mb-1">Processing FPS</span> <span className="text-white font-mono">{r.fps}</span></div>
                      <div className="bg-[#0a0a0a] p-4 rounded-lg border border-[rgba(255,255,255,0.03)]"><span className="text-[#555] uppercase tracking-wider text-[10px] block mb-1">Total Time</span> <span className="text-[#B8FF3B] font-mono font-bold">{r.processing_time.toFixed(2)}s</span></div>
                    </div>
                    <div className="pt-2 space-y-4">
                      <div className="flex gap-4 items-center"><Users className="w-5 h-5 text-[#B8FF3B]" /> <p><strong className="text-white">Crowd Analytics:</strong> Peak of {r.crowd_analysis?.maximum_people || 0} people, Density Level: {r.crowd_analysis?.density || "N/A"}</p></div>
                      <div className="flex gap-4 items-center"><Shield className="w-5 h-5 text-[#FF7A00]" /> <p><strong className="text-white">Crime Detection:</strong> {r.crime_detection?.total_incidents || 0} total incidents detected ({r.crime_detection?.critical_incidents || 0} critical severity)</p></div>
                      <div className="flex gap-4 items-center"><HardHat className="w-5 h-5 text-[#33FF99]" /> <p><strong className="text-white">Worker Monitoring:</strong> {r.work_monitoring?.statistics?.total_workers || 0} staff identified, Overall Safety Score: {r.work_monitoring?.statistics?.overall_safety || 0}%</p></div>
                      <div className="flex gap-4 items-center"><AlertTriangle className="w-5 h-5 text-[#FF4D4D]" /> <p><strong className="text-white">Alert Generation:</strong> {r.alerts?.length || 0} total actionable alerts</p></div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ════════════════ EXPORT ══════════════════════ */}
            {activeTab === "export" && (
              <motion.div key="export" variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0, y: -10 }} className="grid grid-cols-2 md:grid-cols-4 gap-5">
                <ExportButton label="Export JSON" desc="Full AI results payload" icon={Download} onClick={() => downloadJSON(r)} />
                <ExportButton label="Export CSV" desc="Tabular alert data" icon={FileText} onClick={() => downloadCSV(r)} />
                <ExportButton label="Export PDF" desc="Formatted report document" icon={FileText} onClick={() => exportToPDF(r)} />
                {useWorkspaceStore.getState().resultVideoUrl && (
                  <ExportButton label="Download Video" desc="Processed video with overlays" icon={Download}
                    onClick={() => { const a = document.createElement("a"); a.href = useWorkspaceStore.getState().resultVideoUrl!; a.download = "processed.mp4"; a.click(); }}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

/* ═══════════ Reusable sub-components ═══════════════════════════════ */

const MetricCard = memo(function MetricCard({ label, value, accent, color }: { label: string; value: string | number; accent?: boolean; color?: string }) {
  return (
    <motion.div variants={itemVariants} className="bg-[#111] border border-[rgba(255,255,255,0.05)] rounded-xl p-5 flex flex-col justify-center transition-colors hover:bg-[rgba(255,255,255,0.02)]">
      <p className="text-[11px] text-[#A0A0A0] uppercase tracking-wider mb-2 font-medium">{label}</p>
      <p className={`text-4xl font-display font-bold ${accent ? "text-[#B8FF3B]" : color ? "" : "text-white"}`}
        style={color ? { color } : undefined}
      >{value}</p>
    </motion.div>
  );
});

const SummaryRow = memo(function SummaryRow({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <motion.div variants={itemVariants} className="flex items-center gap-3 py-2 border-b border-[rgba(255,255,255,0.02)] last:border-0">
      <div className="w-7 h-7 rounded bg-[rgba(255,255,255,0.03)] flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5" style={{ color }} />
      </div>
      <span className="text-[12px] text-[#A0A0A0] w-20 font-medium">{label}</span>
      <span className="text-[12px] text-white flex-1 text-right">{value}</span>
    </motion.div>
  );
});

function ExportButton({ label, desc, icon: Icon, onClick }: { label: string; desc: string; icon: React.ElementType; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="glass-card p-6 flex flex-col items-center justify-center gap-3 hover:bg-[rgba(255,255,255,0.02)] hover:border-[rgba(184,255,59,0.2)] transition-all group cursor-pointer"
    >
      <Icon className="w-6 h-6 text-[#555] group-hover:text-[#B8FF3B] transition-colors" />
      <div className="text-center">
        <p className="text-[12px] text-white font-medium">{label}</p>
        <p className="text-[9px] text-[#555]">{desc}</p>
      </div>
    </button>
  );
}

/* ═══════════ Export helpers ═════════════════════════════════════════ */

function downloadJSON(data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "railvision_report.json"; a.click();
  URL.revokeObjectURL(url);
}

function downloadCSV(data: { alerts?: Alert[] } | null | undefined) {
  const alerts = data?.alerts || [];
  const rows = [["Module", "Severity", "Message", "Frame", "Confidence"]];
  alerts.forEach((a: Alert) => rows.push([a.module, a.severity, a.message, String(a.frame || ""), String(a.confidence)]));
  const csv = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "railvision_alerts.csv"; a.click();
  URL.revokeObjectURL(url);
}
