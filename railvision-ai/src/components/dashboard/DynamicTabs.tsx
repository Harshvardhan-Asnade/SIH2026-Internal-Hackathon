"use client";

import { useWorkspaceStore } from "@/lib/store";
import type { Alert, CrimeEvent, WorkerInfo } from "@/lib/api-types";
import {
  AlertTriangle, Activity, Users, Shield, HardHat, FileText, Download,
  Clock, BarChart3, Eye, Filter, Play,
  TrendingUp, MapPin, Flame, Zap, Target, ShieldAlert,
} from "lucide-react";
import { useMemo, memo, useState } from "react";
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

const ThumbnailImage = memo(({ videoName, frame }: { videoName: string; frame: number }) => {
  const videoId = videoName.replace('_processed.mp4', '').replace('.mp4', '');
  const [error, setError] = useState(false);
  const url = `http://localhost:8000/api/v1/outputs/${videoId}/thumbnails/frame_${frame}.jpg`;

  if (error) {
    return (
      <div className="w-12 h-12 rounded-xl bg-[var(--bg)] flex flex-col items-center justify-center font-mono text-[10px] border border-red-500/20 text-[var(--text-2)] shrink-0">
        <span className="text-[9px] text-red-500/50 mb-0.5">ERR</span>
        F{frame}
      </div>
    );
  }

  return (
    <div className="w-full aspect-video rounded-lg bg-[var(--surface-2)] border border-white/10 overflow-hidden shrink-0 shadow-inner group-hover:border-[var(--accent)]/30 transition-colors">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={`Frame ${frame}`}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        loading="lazy"
        onError={() => setError(true)}
      />
    </div>
  );
});
ThumbnailImage.displayName = "ThumbnailImage";

import { useShallow } from 'zustand/react/shallow';

export function DynamicTabs() {
  const {
    activeTab, setActiveTab, processingResult, triggerJumpToFrame,
    alertFilter, setAlertFilter, moduleFilter, setModuleFilter,
    isProcessing
  } = useWorkspaceStore(useShallow(state => ({
    activeTab: state.activeTab, setActiveTab: state.setActiveTab, processingResult: state.processingResult, triggerJumpToFrame: state.triggerJumpToFrame,
    alertFilter: state.alertFilter, setAlertFilter: state.setAlertFilter, moduleFilter: state.moduleFilter, setModuleFilter: state.setModuleFilter,
    isProcessing: state.isProcessing
  })));

  const tabs = [
    { id: "overview", label: "Overview", icon: Eye },
    { id: "crowd", label: "Crowd", icon: Users },
    { id: "crime", label: "Crime", icon: Shield },
    { id: "workers", label: "Workers", icon: HardHat },
    { id: "security", label: "Security", icon: ShieldAlert },
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
    <div className="flex flex-col flex-1 min-h-0 bg-[var(--bg)] rounded-xl border border-[var(--border)] overflow-hidden shadow-lg">
      {/* ── Tab Navigation ────────────────────────────────── */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-[var(--border)] bg-[var(--bg)] overflow-x-auto relative">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          let badge: number | null = null;
          if (tab.id === "alerts" && r?.alerts) badge = r.alerts.length;
          if (tab.id === "crime" && r?.crime_detection) badge = r.crime_detection.total_incidents;

          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`relative px-4 py-2 rounded-lg text-[12px] font-medium transition-colors whitespace-nowrap flex items-center gap-2 z-10 group ${
                isActive ? "text-white" : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-[var(--accent)]/5 border border-[var(--accent)]/30 rounded-lg shadow-inner"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <Icon className={`w-3.5 h-3.5 transition-colors ${isActive ? 'text-[var(--accent)]' : 'group-hover:text-white/80'}`} />
                <span className="font-sans font-bold tracking-wide uppercase">{tab.label}</span>
                {badge !== null && badge > 0 && (
                  <span className="ml-1 flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-white/5 border border-white/10">
                    <div className="w-1 h-1 rounded-full bg-[#FF4D4D] animate-pulse shadow-[0_0_8px_#FF4D4D]" />
                    <span className="text-[9px] font-mono font-bold text-white/70">{badge}</span>
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Dynamic Content Area ──────────────────────────── */}
      <div className="flex-1 p-8 overflow-y-auto bg-[var(--bg)]">
        {!r ? (
          isProcessing ? (
            <div className="h-full w-full space-y-6">
              <div className="grid grid-cols-4 gap-5">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-[90px] rounded-xl bg-[rgba(255,255,255,0.05)] border border-[var(--border)] animate-pulse" />
                ))}
              </div>
              <div className="h-[250px] rounded-xl bg-[rgba(255,255,255,0.05)] border border-[var(--border)] animate-pulse" />
              <div className="h-[150px] rounded-xl bg-[rgba(255,255,255,0.05)] border border-[var(--border)] animate-pulse" />
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="h-full flex flex-col items-center justify-center text-[var(--text-3)] relative"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none rounded-xl" />
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-[var(--accent)] blur-2xl opacity-10 rounded-full" />
                <Activity className="w-12 h-12 text-white/10 relative z-10 animate-pulse" />
              </div>
              <p className="text-[13px] font-sans font-bold text-white tracking-widest uppercase mb-1 drop-shadow-md relative z-10">NO VIDEO SELECTED</p>
              <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest relative z-10">Upload CCTV footage to begin investigation</p>
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

                <div className="col-span-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
                  <h4 className="text-[11px] text-[var(--text-2)] uppercase tracking-wider mb-4 font-semibold">Module Summary</h4>
                  <div className="space-y-3">
                    <SummaryRow icon={Users} label="Crowd" value={`Peak: ${r.crowd_analysis?.peak || 0} people`} color="#B8FF3B" />
                    <SummaryRow icon={Shield} label="Crime" value={`${r.crime_detection?.total_incidents || 0} incidents`} color="#FF7A00" />
                    <SummaryRow icon={AlertTriangle} label="Falls" value={`${r.fall_detection?.confirmed_falls || 0} confirmed`} color="#FF4D4D" />
                    <SummaryRow icon={HardHat} label="Workers" value={`${r.worker_monitoring?.statistics?.total_workers || 0} staff`} color="#33FF99" />
                    <SummaryRow icon={AlertTriangle} label="Alerts" value={`${r.alerts?.length || 0} total`} color="#FF4D4D" />
                  </div>
                </div>

                <div className="col-span-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
                  <h4 className="text-[11px] text-[var(--text-2)] uppercase tracking-wider mb-4 font-semibold">Latest Events</h4>
                  <div className="space-y-2">
                    {(r.alerts || []).slice(0, 5).map((a, i) => (
                      <div key={i} onClick={() => a.frame && triggerJumpToFrame(a.frame)}
                        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[rgba(255,255,255,0.05)] cursor-pointer transition-colors group"
                      >
                        <div className={`w-2 h-2 rounded-full ${a.severity === "critical" ? "bg-[#FF4D4D]" : a.severity === "high" ? "bg-[#FF7A00]" : "bg-[#FFC857]"}`} />
                        <span className="text-[12px] text-[var(--text-1)] flex-1 truncate group-hover:text-[var(--accent)] transition-colors">{a.message}</span>
                        <span className="text-[10px] text-[var(--text-3)] font-mono">F{a.frame}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ════════════════ CROWD ═══════════════════════ */}
            {activeTab === "crowd" && (
              <motion.div key="crowd" variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="grid grid-cols-4 md:grid-cols-7 gap-4">
                  <MetricCard label="Current Count" value={r.crowd_analysis?.current || 0} accent />
                  <MetricCard label="Average" value={r.crowd_analysis?.average?.toFixed(1) || "0"} />
                  <MetricCard label="Peak" value={r.crowd_analysis?.peak || 0} />
                  <MetricCard label="Minimum" value={r.crowd_analysis?.minimum || 0} />
                  <MetricCard label="Unique Tracks" value={r.crowd_analysis?.unique_tracks || 0} />
                  <MetricCard label="Occupancy" value={`${r.crowd_analysis?.occupancy || 0}%`} />
                  <MetricCard label="Density" value={r.crowd_analysis?.density || "Low"} />
                </div>

                {/* Occupancy bar */}
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
                  <h4 className="text-[11px] text-[var(--text-2)] uppercase tracking-wider mb-4 font-semibold">Space Occupancy</h4>
                  <div className="w-full h-3 bg-[var(--surface-2)] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#33FF99] via-[#FFC857] to-[#FF4D4D] rounded-full transition-all duration-700"
                      style={{ width: `${r.crowd_analysis?.occupancy || 0}%` }} />
                  </div>
                  <div className="flex justify-between mt-3 text-[10px] text-[var(--text-3)] uppercase tracking-wider">
                    <span>0%</span><span>Safe</span><span>Warning</span><span>Critical</span><span>100%</span>
                  </div>
                </div>

                {/* Crowd Trend */}
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
                  <h4 className="text-[11px] text-[var(--text-2)] uppercase tracking-wider mb-4 font-semibold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[var(--accent)]" /> Crowd Trend
                  </h4>
                  <div className="h-32 flex items-end gap-1">
                    {(r.crowd_analysis?.trend || []).slice(0, 60).map((t, i) => {
                      const maxP = r.crowd_analysis?.peak || 1;
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
                  <p className="text-[10px] text-[var(--text-3)] mt-3">Click any bar to jump to the corresponding frame.</p>
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
                    { label: "Falls", data: Array.from({length: r.fall_detection?.confirmed_falls || 0}), icon: AlertTriangle },
                  ].map((cat, i) => {
                    const Icon = cat.icon;
                    const count = cat.data?.length || 0;
                    return (
                      <div key={i} className={`bg-[var(--surface)] border rounded-xl p-4 transition-colors ${count > 0 ? "border-[rgba(255,122,0,0.2)] bg-[rgba(255,122,0,0.02)]" : "border-[var(--border)]"}`}>
                        <div className="flex items-center gap-2 mb-3">
                          <Icon className={`w-4 h-4 ${count > 0 ? "text-[#FF7A00]" : "text-[var(--text-3)]"}`} />
                          <span className="text-[11px] text-[var(--text-2)] uppercase tracking-wider">{cat.label}</span>
                        </div>
                        <p className={`text-3xl font-display font-bold ${count > 0 ? "text-[#FF7A00]" : "text-[var(--text-3)]"}`}>{count}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Crime event list */}
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
                  <h4 className="text-[11px] text-[var(--text-2)] uppercase tracking-wider mb-4 font-semibold">Incident Log</h4>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                    {allCrimeEvents.map((e, i) => (
                      <div key={i} onClick={() => triggerJumpToFrame(e.frame)}
                        className="flex items-center gap-4 p-3 rounded-lg border border-[rgba(255,122,0,0.1)] bg-[rgba(255,122,0,0.03)] hover:bg-[rgba(255,122,0,0.08)] cursor-pointer transition-colors"
                      >
                        <div className="w-12 h-12 rounded-lg bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center font-mono text-[11px] text-[var(--text-2)]">F{e.frame}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-[var(--text-1)] font-medium mb-1">{(e as CrimeEvent & { _type: string })._type}</p>
                          <p className="text-[11px] text-[var(--text-2)]">Confidence: {(e.confidence * 100).toFixed(0)}% — Risk: {e.risk}</p>
                        </div>
                        <span className={`text-[10px] uppercase font-mono px-3 py-1 rounded-full ${
                          e.risk === "critical" ? "bg-[rgba(255,77,77,0.15)] text-[#FF4D4D]" : "bg-[rgba(255,122,0,0.15)] text-[#FF7A00]"
                        }`}>{e.risk}</span>
                      </div>
                    ))}
                    {allCrimeEvents.length === 0 && <p className="text-[13px] text-[var(--text-3)] text-center py-6">No incidents detected in this session.</p>}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ════════════════ WORKERS ═════════════════════ */}
            {activeTab === "workers" && (
              <motion.div key="workers" variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="grid grid-cols-4 gap-5">
                  <MetricCard label="Total Staff" value={r.worker_monitoring?.statistics?.total_workers || 0} />
                  <MetricCard label="Helmet %" value={`${r.worker_monitoring?.statistics?.helmet_compliance || 0}%`} color="#33FF99" />
                  <MetricCard label="Jacket %" value={`${r.worker_monitoring?.statistics?.jacket_compliance || 0}%`} color="#33FF99" />
                  <MetricCard label="Safety Score" value={`${r.worker_monitoring?.statistics?.overall_safety || 0}%`} accent />
                </div>

                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
                  <h4 className="text-[11px] text-[var(--text-2)] uppercase tracking-wider mb-4 font-semibold">Worker Roster</h4>
                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2">
                    {(r.worker_monitoring?.workers || []).map((w: WorkerInfo) => (
                      <div key={w.worker_id} className="flex items-center gap-4 p-3 rounded-lg border border-[var(--border)] bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.05)] transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center text-[11px] font-mono text-[var(--text-2)]">
                          W{w.worker_id}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1.5">
                            <span className="text-[13px] font-medium text-[var(--text-1)]">Worker #{w.worker_id}</span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${w.working ? "bg-[rgba(51,255,153,0.1)] text-[#33FF99]" : "bg-[rgba(255,77,77,0.1)] text-[#FF4D4D]"}`}>
                              {w.working ? "Active" : "Idle"}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-[11px] text-[var(--text-2)]">
                            <span className={w.helmet ? "text-[#33FF99]" : "text-[#FF4D4D]"}>{w.helmet ? "🪖 Helmet ✓" : "🪖 No Helmet"}</span>
                            <span className={w.jacket ? "text-[#33FF99]" : "text-[#FF4D4D]"}>{w.jacket ? "🦺 Jacket ✓" : "🦺 No Jacket"}</span>
                            <span className="text-[var(--text-3)] ml-2">Zone: {w.zone}</span>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end justify-center">
                          <p className={`text-[18px] font-mono font-bold leading-none ${w.compliance >= 80 ? "text-[#33FF99]" : w.compliance >= 50 ? "text-[#FFC857]" : "text-[#FF4D4D]"}`}>
                            {w.compliance}%
                          </p>
                          <p className="text-[9px] text-[var(--text-3)] mt-1 uppercase tracking-wider">Compliance</p>
                        </div>
                      </div>
                    ))}
                    {(!r.worker_monitoring?.workers || r.worker_monitoring.workers.length === 0) && (
                      <p className="text-[13px] text-[var(--text-3)] text-center py-6">No workers detected.</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ════════════════ ALERTS ══════════════════════ */}
            {activeTab === "alerts" && (
              <motion.div key="alerts" variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0, y: -10 }} className="space-y-5">
                {/* Filter bar */}
                <div className="flex items-center gap-3 flex-wrap bg-[var(--surface)] p-3 rounded-xl border border-[var(--border)]">
                  <Filter className="w-4 h-4 text-[var(--text-3)] mx-2" />
                  {["all", "critical", "high", "medium", "low"].map(f => (
                    <button key={f} onClick={() => setAlertFilter(f)}
                      className={`px-4 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                        alertFilter === f ? "bg-[var(--surface-2)] text-[var(--text-1)]" : "text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[rgba(255,255,255,0.05)]"
                      }`}
                    >{f === "all" ? "All Severities" : f.charAt(0).toUpperCase() + f.slice(1)}</button>
                  ))}
                  <div className="w-px h-5 bg-[rgba(255,255,255,0.1)] mx-2" />
                  {["all", "crowd", "crime", "workers"].map(m => (
                    <button key={m} onClick={() => setModuleFilter(m)}
                      className={`px-4 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                        moduleFilter === m ? "bg-[var(--surface-2)] text-[var(--text-1)]" : "text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[rgba(255,255,255,0.05)]"
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
                        className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex gap-4 cursor-pointer hover:border-[var(--border)] transition-all group"
                      >
                        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${c}15` }}>
                          <AlertTriangle className="w-4 h-4" style={{ color: c }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-3 mb-1.5">
                            <h4 className="text-[13px] font-semibold text-[var(--text-1)] tracking-wide">{a.module.toUpperCase()} ALERT</h4>
                            <span className="text-[10px] font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider" style={{ backgroundColor: `${c}20`, color: c }}>{a.severity}</span>
                          </div>
                          <p className="text-[12px] text-[var(--text-2)] leading-relaxed mb-3">{a.message}</p>
                          <div className="flex items-center gap-4 text-[11px] text-[var(--text-3)] font-mono">
                            <span>F {a.frame}</span>
                            <span>CONF {(a.confidence * 100).toFixed(0)}%</span>
                            <span className="ml-auto text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
                              <Play className="w-3.5 h-3.5" /> Jump to frame
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {filteredAlerts.length === 0 && <p className="text-[13px] text-[var(--text-3)] text-center py-10">No alerts match the current filter.</p>}
                </div>
              </motion.div>
            )}

            {/* ════════════════ TIMELINE ════════════════════ */}
            {activeTab === "timeline" && (
              <motion.div key="timeline" variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0, y: -10 }} className="space-y-8">
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
                  <h3 className="text-[11px] font-semibold text-[var(--text-2)] uppercase tracking-wider mb-6">Event Timeline</h3>

                  {/* Visual timeline bar */}
                  <div className="relative h-10 bg-[var(--bg)] rounded-lg border border-[var(--border)] overflow-visible">
                    <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 h-[2px] bg-[var(--surface-2)]" />
                    {(r.alerts || []).map((a, i) => {
                      if (!a.frame) return null;
                      const pos = (a.frame / r.frames) * 100;
                      const c = a.severity === "critical" ? "#FF4D4D" : a.severity === "high" ? "#FF7A00" : "#B8FF3B";
                      return (
                        <div key={i} onClick={() => triggerJumpToFrame(a.frame!)}
                          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-6 rounded-full cursor-pointer hover:scale-150 transition-transform z-10 group"
                          style={{ left: `${pos}%`, backgroundColor: c }}
                        >
                          <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black border border-[var(--border-h)] px-3 py-1.5 rounded text-[10px] whitespace-nowrap pointer-events-none z-50 font-medium">
                            {a.module.toUpperCase()} @ F{a.frame}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Chronological event list */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-5 max-h-[450px] overflow-y-auto pr-2 pb-4 scrollbar-thin">
                  {[...(r.alerts || [])].sort((a, b) => (a.frame || 0) - (b.frame || 0)).map((a, i) => {
                    const c = a.severity === "critical" ? "#FF4D4D" : a.severity === "high" ? "#FF7A00" : "#FFC857";
                    return (
                      <div key={i} onClick={() => a.frame && triggerJumpToFrame(a.frame)}
                        className="bg-[var(--surface)] border border-white/10 rounded-xl p-3 flex flex-col gap-3 cursor-pointer hover:border-white/30 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition-all group relative overflow-hidden"
                      >
                        <ThumbnailImage videoName={r.video} frame={a.frame || 0} />
                        <div className="flex flex-col">
                          <div className="flex justify-between items-start mb-1">
                            <p className="font-sans font-bold text-[13px] text-white tracking-wide uppercase group-hover:text-[var(--accent)] transition-colors">{a.module}</p>
                            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-sm uppercase tracking-widest shadow-md" style={{ backgroundColor: `${c}15`, color: c, border: `1px solid ${c}30` }}>{a.severity}</span>
                          </div>
                          <p className="font-mono text-[10px] text-white/50 tracking-widest">
                            {(a.frame || 0) / r.fps > 3600 ? new Date(((a.frame || 0) / r.fps) * 1000).toISOString().substr(11, 8) : new Date(((a.frame || 0) / r.fps) * 1000).toISOString().substr(14, 5)} • F{a.frame}
                          </p>
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
                  <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
                    <h4 className="text-[11px] text-[var(--text-2)] uppercase tracking-wider mb-5 font-semibold">Detection Distribution</h4>
                    <div className="space-y-3">
                      {(() => {
                        const counts: Record<string, number> = {};
                        (r.detections || []).forEach(d => { counts[d.class] = (counts[d.class] || 0) + 1; });
                        const total = r.detections?.length || 1;
                        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([cls, count]) => (
                          <div key={cls} className="flex items-center gap-4">
                            <span className="text-[11px] text-[var(--text-2)] w-24 truncate">{cls}</span>
                            <div className="flex-1 h-2 bg-[var(--surface-2)] rounded-full overflow-hidden">
                              <div className="h-full bg-[var(--accent)] rounded-full" style={{ width: `${(count / total) * 100}%` }} />
                            </div>
                            <span className="text-[11px] font-mono text-[var(--text-1)] w-12 text-right">{count}</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>

                  {/* Alert severity distribution */}
                  <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
                    <h4 className="text-[11px] text-[var(--text-2)] uppercase tracking-wider mb-5 font-semibold">Alert Severity Breakdown</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {["critical", "high", "medium", "low"].map(sev => {
                        const count = (r.alerts || []).filter(a => a.severity === sev).length;
                        const c = sev === "critical" ? "#FF4D4D" : sev === "high" ? "#FF7A00" : sev === "medium" ? "#FFC857" : "#33FF99";
                        return (
                          <div key={sev} className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-4 flex flex-col items-center justify-center">
                            <p className="text-4xl font-display font-bold mb-1" style={{ color: c }}>{count}</p>
                            <p className="text-[10px] uppercase tracking-widest text-[var(--text-3)]">{sev}</p>
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
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8">
                  <h4 className="text-[14px] font-semibold text-[var(--text-1)] uppercase tracking-wider mb-6 pb-4 border-b border-[var(--border)]">AI Investigation Report</h4>
                  <div className="space-y-6 text-[13px] text-[var(--text-2)]">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-[var(--bg)] p-4 rounded-lg border border-[var(--border)]"><span className="text-[var(--text-3)] uppercase tracking-wider text-[10px] block mb-1">Source Video</span> <span className="text-[var(--text-1)] font-medium">{r.video}</span></div>
                      <div className="bg-[var(--bg)] p-4 rounded-lg border border-[var(--border)]"><span className="text-[var(--text-3)] uppercase tracking-wider text-[10px] block mb-1">Total Frames</span> <span className="text-[var(--text-1)] font-mono">{r.frames}</span></div>
                      <div className="bg-[var(--bg)] p-4 rounded-lg border border-[var(--border)]"><span className="text-[var(--text-3)] uppercase tracking-wider text-[10px] block mb-1">Processing FPS</span> <span className="text-[var(--text-1)] font-mono">{r.fps}</span></div>
                      <div className="bg-[var(--bg)] p-4 rounded-lg border border-[var(--border)]"><span className="text-[var(--text-3)] uppercase tracking-wider text-[10px] block mb-1">Total Time</span> <span className="text-[var(--accent)] font-mono font-bold">{r.processing_time.toFixed(2)}s</span></div>
                    </div>
                    <div className="pt-2 space-y-4">
                      <div className="flex gap-4 items-center"><Users className="w-5 h-5 text-[var(--accent)]" /> <p><strong className="text-[var(--text-1)]">Crowd Analytics:</strong> Peak of {r.crowd_analysis?.peak || 0} people, Density Level: {r.crowd_analysis?.density || "N/A"}</p></div>
                      <div className="flex gap-4 items-center"><Shield className="w-5 h-5 text-[#FF7A00]" /> <p><strong className="text-[var(--text-1)]">Crime Detection:</strong> {r.crime_detection?.total_incidents || 0} total incidents detected ({r.crime_detection?.critical_incidents || 0} critical severity)</p></div>
                      <div className="flex gap-4 items-center"><AlertTriangle className="w-5 h-5 text-[#FF4D4D]" /> <p><strong className="text-[var(--text-1)]">Fall Detection:</strong> {r.fall_detection?.confirmed_falls || 0} confirmed falls detected</p></div>
                      <div className="flex gap-4 items-center"><HardHat className="w-5 h-5 text-[#33FF99]" /> <p><strong className="text-[var(--text-1)]">Worker Monitoring:</strong> {r.worker_monitoring?.statistics?.total_workers || 0} staff identified, Overall Safety Score: {r.worker_monitoring?.statistics?.overall_safety || 0}%</p></div>
                      <div className="flex gap-4 items-center"><AlertTriangle className="w-5 h-5 text-[#FF4D4D]" /> <p><strong className="text-[var(--text-1)]">Alert Generation:</strong> {r.alerts?.length || 0} total actionable alerts</p></div>
                    </div>
                  </div>
                </div>

                {/* ── AI Master Intelligence Report ──────────── */}
                {r.ai_master_report && (
                  <div className="bg-[var(--surface)] border border-[rgba(184,255,59,0.15)] rounded-xl p-8">
                    <h4 className="text-[14px] font-semibold text-[var(--accent)] uppercase tracking-wider mb-6 pb-4 border-b border-[rgba(184,255,59,0.1)] flex items-center gap-3">
                      <Activity className="w-5 h-5" />
                      AI Master Intelligence Report
                    </h4>
                    <div className="text-[13px] text-[#ccc] leading-relaxed whitespace-pre-wrap font-mono bg-[var(--bg)] p-6 rounded-lg border border-[var(--border)] max-h-[400px] overflow-y-auto">
                      {r.ai_master_report}
                    </div>
                  </div>
                )}
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
    <motion.div variants={itemVariants} className="bg-[var(--surface)] border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.2)] rounded-xl p-5 flex flex-col justify-center transition-colors hover:bg-white/5 group">
      <p className="font-mono text-[9px] text-white/50 uppercase tracking-widest mb-2 font-bold group-hover:text-white/70 transition-colors">{label}</p>
      <p className={`text-3xl font-sans font-bold tracking-tight drop-shadow-md ${accent ? "text-[var(--accent)]" : color ? "" : "text-white"}`}
        style={color ? { color } : undefined}
      >{value}</p>
    </motion.div>
  );
});

const SummaryRow = memo(function SummaryRow({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <motion.div variants={itemVariants} className="flex items-center gap-3 py-2 border-b border-[var(--border)] last:border-0">
      <div className="w-7 h-7 rounded bg-[rgba(255,255,255,0.05)] flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5" style={{ color }} />
      </div>
      <span className="text-[12px] text-[var(--text-2)] w-20 font-medium">{label}</span>
      <span className="text-[12px] text-[var(--text-1)] flex-1 text-right">{value}</span>
    </motion.div>
  );
});

function ExportButton({ label, desc, icon: Icon, onClick }: { label: string; desc: string; icon: React.ElementType; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="glass-card p-6 flex flex-col items-center justify-center gap-3 hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(184,255,59,0.2)] transition-all group cursor-pointer"
    >
      <Icon className="w-6 h-6 text-[var(--text-3)] group-hover:text-[var(--accent)] transition-colors" />
      <div className="text-center">
        <p className="text-[12px] text-[var(--text-1)] font-medium">{label}</p>
        <p className="text-[9px] text-[var(--text-3)]">{desc}</p>
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
