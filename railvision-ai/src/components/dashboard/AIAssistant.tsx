"use client";

import { useWorkspaceStore, type ChatMessage } from "@/lib/store";
import { queryAssistant, retryReport, generateWebcamReport } from "@/lib/api-service";
import {
  Brain, Send, Loader2, AlertCircle, Zap, RefreshCw,
  Shield, Users, HardHat, AlertTriangle, MessageSquare,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ═══════════════════════════════════════════════════════════════════
   Quick-prompt suggestions shown when chat is empty
   ═══════════════════════════════════════════════════════════════════ */
const QUICK_PROMPTS = [
  "What happened in this video?",
  "Summarize all incidents",
  "Show critical alerts",
  "Analyze crowd patterns",
  "Any safety violations?",
  "Generate a brief report",
];

/* ═══════════════════════════════════════════════════════════════════
   AI Assistant Panel
   ═══════════════════════════════════════════════════════════════════ */
import { useShallow } from 'zustand/react/shallow';

export function AIAssistant() {
  const {
    processingResult: r,
    chatMessages,
    isChatLoading,
    addChatMessage,
    setChatLoading,
    clearChat,
    isProcessing,
    videoId,
    isWebcamActive,
    webcamSessionId,
  } = useWorkspaceStore(useShallow(state => ({
    processingResult: state.processingResult,
    chatMessages: state.chatMessages,
    isChatLoading: state.isChatLoading,
    addChatMessage: state.addChatMessage,
    setChatLoading: state.setChatLoading,
    clearChat: state.clearChat,
    isProcessing: state.isProcessing,
    videoId: state.videoId,
    isWebcamActive: state.isWebcamActive,
    webcamSessionId: state.webcamSessionId
  })));

  const [input, setInput] = useState("");
  const [reportExpanded, setReportExpanded] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleRetry = async () => {
    if (!videoId) return;
    try {
      useWorkspaceStore.setState((s) => ({
        processingResult: s.processingResult ? {
          ...s.processingResult,
          ai_master_report: "Report is being generated in the background..."
        } : null
      }));
      await retryReport(videoId);
    } catch (e) {
      console.error("Failed to retry report", e);
    }
  };

  const handleWebcamReport = async () => {
    if (!webcamSessionId) return;
    try {
      useWorkspaceStore.setState((s) => ({
        processingResult: s.processingResult ? {
          ...s.processingResult,
          ai_master_report: "Report is being generated in the background..."
        } : null
      }));
      await generateWebcamReport(webcamSessionId);
    } catch (e) {
      console.error("Failed to generate webcam report", e);
      useWorkspaceStore.setState((s) => ({
        processingResult: s.processingResult ? {
          ...s.processingResult,
          ai_master_report: "FAILED: Network error while generating report."
        } : null
      }));
    }
  };

  // Build a lightweight context object (no raw bbox arrays)
  const buildContext = useCallback(() => {
    if (!r) return undefined;
    const ctx: Record<string, unknown> = {
      frames: r.frames,
      fps: r.fps,
      processing_time: r.processing_time,
    };
    if (r.crowd_analysis) {
      const { trend: _trend, heatmap: _heatmap, ...crowdSummary } = r.crowd_analysis;
      ctx.crowd_analysis = crowdSummary;
    }
    if (r.crime_detection) {
      // Strip large arrays, keep summary counts
      const { track_intrusion, restricted_area, abandoned_baggage, loitering,
        running_detection, crowd_panic, fight_detection, ...summary } = r.crime_detection;
      ctx.crime_detection = {
        ...summary,
        track_intrusion_count: track_intrusion?.length || 0,
        restricted_area_count: restricted_area?.length || 0,
        abandoned_baggage_count: abandoned_baggage?.length || 0,
        loitering_count: loitering?.length || 0,
        running_count: running_detection?.length || 0,
        panic_count: crowd_panic?.length || 0,
        fight_count: fight_detection?.length || 0,
      };
    }
    if (r.worker_monitoring) ctx.worker_monitoring = r.worker_monitoring;
    if (r.alerts) {
      ctx.alerts_summary = {
        total: r.alerts.length,
        critical: r.alerts.filter(a => a.severity === "critical").length,
        high: r.alerts.filter(a => a.severity === "high").length,
        modules: [...new Set(r.alerts.map(a => a.module))],
      };
    }
    return ctx;
  }, [r]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isChatLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: Date.now(),
    };
    addChatMessage(userMsg);
    setInput("");
    setChatLoading(true);

    try {
      const ctx = buildContext();
      const response = await queryAssistant(text.trim(), ctx);
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.answer,
        timestamp: Date.now(),
      };
      addChatMessage(assistantMsg);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "system",
        content: `Failed to get response from AI Engine. ${err instanceof Error ? err.message : "Check if the backend is running."}`,
        timestamp: Date.now(),
      };
      addChatMessage(errorMsg);
    } finally {
      setChatLoading(false);
    }
  }, [isChatLoading, addChatMessage, setChatLoading, buildContext]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // Parse the ai_master_report into sections
  const reportSections = useMemo(() => {
    if (!r?.ai_master_report) return null;
    const text = r.ai_master_report;
    // Try to split on markdown-style headers or numbered sections
    const sections: { title: string; content: string }[] = [];
    const lines = text.split("\n");
    let currentTitle = "Executive Summary";
    let currentContent: string[] = [];

    for (const line of lines) {
      // Match markdown headers (## Title) or numbered titles (1. Title)
      const headerMatch = line.match(/^#{1,3}\s+(.+)/) || line.match(/^\d+\.\s*\*?\*?(.+?)\*?\*?\s*$/);
      if (headerMatch) {
        if (currentContent.length > 0) {
          sections.push({ title: currentTitle, content: currentContent.join("\n").trim() });
        }
        currentTitle = headerMatch[1].replace(/\*\*/g, "").trim();
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    }
    if (currentContent.length > 0) {
      sections.push({ title: currentTitle, content: currentContent.join("\n").trim() });
    }

    return sections.filter(s => s.content.length > 0);
  }, [r?.ai_master_report]);

  // ─── Render: No data state ──────────────────────────────────────
  if (!r && !isProcessing) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-[var(--text-3)] bg-[var(--surface)] rounded-xl border border-white/10 shadow-inner relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
        <Brain className="w-10 h-10 text-white/10 mb-4 animate-pulse relative z-10" />
        <p className="font-sans font-bold text-sm text-white tracking-wide mb-1 relative z-10">NO VIDEO SELECTED</p>
        <p className="font-mono text-[9px] text-[var(--accent)] tracking-widest uppercase drop-shadow-[0_0_8px_rgba(184,255,59,0.4)] relative z-10">Powered by Qwen 3</p>
        <p className="font-mono text-[10px] text-white/40 mt-4 tracking-widest uppercase relative z-10 text-center px-6">Upload CCTV footage to begin investigation</p>
      </div>
    );
  }

  if (isProcessing && !r) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[var(--surface)] rounded-xl border border-white/10 shadow-inner relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--accent)]/5 to-transparent pointer-events-none" />
        <div className="flex gap-1.5 mb-5 relative z-10">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse shadow-[0_0_8px_var(--accent)]" style={{ animationDelay: "0ms" }} />
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse shadow-[0_0_8px_var(--accent)]" style={{ animationDelay: "150ms" }} />
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse shadow-[0_0_8px_var(--accent)]" style={{ animationDelay: "300ms" }} />
        </div>
        <p className="font-sans font-bold text-[12px] text-[var(--accent)] tracking-widest uppercase relative z-10 drop-shadow-[0_0_8px_rgba(184,255,59,0.2)]">AI Engine Processing</p>
        <p className="font-mono text-[9px] text-white/40 mt-2 tracking-widest uppercase relative z-10">Intelligence report generating...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[var(--surface)] shrink-0 shadow-md z-10 relative">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[rgba(184,255,59,0.1)] flex items-center justify-center border border-[var(--accent)]/30">
            <Brain className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <div className="flex flex-col">
            <p className="font-sans font-bold text-[12px] text-white tracking-wider uppercase drop-shadow-sm">AI Investigation Assistant</p>
            <p className="font-mono text-[9px] text-[var(--accent)] tracking-widest uppercase drop-shadow-[0_0_4px_rgba(184,255,59,0.3)]">Qwen 3 • Analysing JSON</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-[#33FF99] animate-pulse shadow-[0_0_8px_#33FF99]" />
          {chatMessages.length > 0 && (
            <button onClick={clearChat} className="font-mono text-[9px] text-white/40 hover:text-white transition-colors uppercase tracking-widest font-bold">
              [ Clear ]
            </button>
          )}
        </div>
      </div>

      {/* ── Scrollable content ──────────────────────────────── */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">

        {/* ── Webcam Report Generation ──── */}
        {isWebcamActive && !r?.ai_master_report && (
          <div className="bg-[var(--surface)] border border-[rgba(184,255,59,0.2)] rounded-lg p-4 flex flex-col items-center justify-center text-center">
            <Zap className="w-6 h-6 text-[var(--accent)] mb-2" />
            <p className="text-[11px] font-semibold text-[var(--accent)] tracking-wider mb-1">LIVE INTELLIGENCE</p>
            <p className="text-[10px] text-[var(--text-2)] mb-3">Generate an AI master report from current live stats.</p>
            <button
              onClick={handleWebcamReport}
              className="px-4 py-2 bg-[rgba(184,255,59,0.1)] hover:bg-[rgba(184,255,59,0.2)] border border-[rgba(184,255,59,0.3)] rounded-lg text-[10px] text-[var(--accent)] font-semibold transition-colors flex items-center gap-2"
            >
              <Zap className="w-3.5 h-3.5" /> Generate Live Report
            </button>
          </div>
        )}

        {/* ── AI Report (auto-generated from processing) ──── */}
        {r?.ai_master_report === "Report is being generated in the background..." ? (
          <div className="bg-[var(--surface)] border border-[var(--border-h)] rounded-lg p-4 flex flex-col items-center justify-center text-center">
            <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-[11px] font-semibold text-[var(--text-1)] tracking-wider mb-1">CV ANALYSIS COMPLETE</p>
            <p className="text-[10px] text-[var(--text-2)] uppercase">AI Report Generating...</p>
          </div>
        ) : r?.ai_master_report?.startsWith("FAILED:") ? (
          <div className="bg-[var(--surface)] border border-red-500/20 rounded-lg p-4 flex flex-col items-center justify-center text-center">
            <AlertTriangle className="w-6 h-6 text-red-500 mb-2" />
            <p className="text-[11px] font-semibold text-red-500 tracking-wider mb-1">AI REPORT FAILED</p>
            <p className="text-[10px] text-[var(--text-2)] mb-3">{r.ai_master_report.replace("FAILED:", "").trim()}</p>
            <button
              onClick={handleRetry}
              className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded text-[10px] text-red-400 font-medium transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3 h-3" /> Retry Report
            </button>
          </div>
        ) : reportSections && reportSections.length > 0 && (
          <div className="border border-[rgba(184,255,59,0.1)] rounded-lg overflow-hidden">
            <button
              onClick={() => setReportExpanded(!reportExpanded)}
              className="w-full flex items-center justify-between px-3 py-2 bg-[rgba(184,255,59,0.03)] hover:bg-[rgba(184,255,59,0.06)] transition-colors"
            >
              <span className="text-[10px] font-semibold text-[var(--accent)] uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-3.5 h-3.5" /> AI Intelligence Report Ready
              </span>
              {reportExpanded ? <ChevronUp className="w-3.5 h-3.5 text-[var(--text-3)]" /> : <ChevronDown className="w-3.5 h-3.5 text-[var(--text-3)]" />}
            </button>

            <AnimatePresence initial={false}>
              {reportExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-3 py-3 space-y-3 max-h-[300px] overflow-y-auto scrollbar-thin">
                    {reportSections.map((s, i) => (
                      <div key={i}>
                        <h4 className="text-[10px] font-semibold text-[var(--text-2)] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                          {getSectionIcon(s.title)}
                          {s.title}
                        </h4>
                        <p className="text-[11px] text-[#ccc] leading-relaxed whitespace-pre-wrap">{s.content}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── Fallback: raw report if parsing found nothing ── */}
        {r?.ai_master_report && (!reportSections || reportSections.length === 0) && (
          <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-3">
            <h4 className="text-[10px] font-semibold text-[var(--accent)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> AI Report
            </h4>
            <p className="text-[11px] text-[#ccc] leading-relaxed whitespace-pre-wrap font-mono max-h-[200px] overflow-y-auto scrollbar-thin">
              {r.ai_master_report}
            </p>
          </div>
        )}

        {/* ── Quick stats badges ─────────────────────────────── */}
        {r && (
          <div className="flex flex-wrap gap-2">
            <StatBadge icon={Users} label={`${r.crowd_analysis?.peak || 0} crowd`} color="#B8FF3B" />
            <StatBadge icon={Shield} label={`${r.crime_detection?.total_incidents || 0} incidents`} color="#FF7A00" />
            <StatBadge icon={HardHat} label={`${r.worker_monitoring?.statistics?.total_workers || 0} workers`} color="#33FF99" />
            <StatBadge icon={AlertTriangle} label={`${r.alerts?.length || 0} alerts`} color="#FF4D4D" />
          </div>
        )}

        {/* ── Chat messages ──────────────────────────────────── */}
        {chatMessages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-lg px-4 py-3 shadow-sm ${
              msg.role === "user"
                ? "bg-[rgba(184,255,59,0.1)] border border-[rgba(184,255,59,0.15)]"
                : msg.role === "system"
                ? "bg-[rgba(255,77,77,0.06)] border border-[rgba(255,77,77,0.15)]"
                : "bg-[var(--bg)] border border-[var(--border)]"
            }`}>
              {msg.role === "system" && (
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertCircle className="w-3 h-3 text-[#FF4D4D]" />
                  <span className="text-[9px] text-[#FF4D4D] font-semibold uppercase">Error</span>
                </div>
              )}
              {msg.role === "assistant" && (
                <div className="flex items-center gap-1.5 mb-1">
                  <Brain className="w-3 h-3 text-[var(--accent)]" />
                  <span className="text-[9px] text-[var(--accent)] font-semibold uppercase">Qwen 3</span>
                </div>
              )}
              <p className={`text-[11px] leading-relaxed whitespace-pre-wrap ${
                msg.role === "user" ? "text-[var(--text-1)]" : msg.role === "system" ? "text-[#FF4D4D]" : "text-[#ccc]"
              }`}>
                {msg.content}
              </p>
            </div>
          </div>
        ))}

        {/* ── Loading indicator ──────────────────────────────── */}
        {isChatLoading && (
          <div className="flex justify-start">
            <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 text-[var(--accent)] animate-spin" />
              <span className="text-[11px] text-[var(--text-2)]">Qwen 3 is thinking...</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* ── Quick prompts (when no chat yet) ─────────────────── */}
      {chatMessages.length === 0 && r && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
          {QUICK_PROMPTS.map((prompt, i) => (
            <button key={i} onClick={() => sendMessage(prompt)}
              className="text-[9px] text-[var(--text-2)] bg-[var(--bg)] border border-[var(--border)] hover:border-[rgba(184,255,59,0.2)] hover:text-[var(--accent)] px-2.5 py-1 rounded-full transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* ── Input bar ──────────────────────────────────────── */}
      <div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--bg)] shrink-0">
        <div className="flex items-center gap-3 bg-[var(--bg)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2 focus-within:border-[rgba(184,255,59,0.3)] transition-colors shadow-inner">
          <MessageSquare className="w-3.5 h-3.5 text-[var(--text-3)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={r ? "Ask about this investigation..." : "Process a video first..."}
            disabled={!r || isChatLoading}
            className="flex-1 bg-transparent text-[11px] text-[var(--text-1)] placeholder-[#555] focus:outline-none disabled:cursor-not-allowed"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isChatLoading || !r}
            className="w-6 h-6 rounded flex items-center justify-center bg-[var(--accent)] text-[#070707] hover:bg-[#c8ff5b] disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            {isChatLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════ Helpers ═══════════════════════════════════════════════ */

function StatBadge({ icon: Icon, label, color }: { icon: React.ElementType; label: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-[var(--bg)] border border-[var(--border)] px-2 py-1 rounded-full">
      <Icon className="w-3 h-3" style={{ color }} />
      <span className="text-[9px] text-[var(--text-2)]">{label}</span>
    </div>
  );
}

function getSectionIcon(title: string) {
  const t = title.toLowerCase();
  if (t.includes("crowd")) return <Users className="w-3 h-3 text-[var(--accent)]" />;
  if (t.includes("crime") || t.includes("incident")) return <Shield className="w-3 h-3 text-[#FF7A00]" />;
  if (t.includes("worker") || t.includes("safety")) return <HardHat className="w-3 h-3 text-[#33FF99]" />;
  if (t.includes("alert") || t.includes("risk")) return <AlertTriangle className="w-3 h-3 text-[#FF4D4D]" />;
  if (t.includes("recommend") || t.includes("action")) return <Zap className="w-3 h-3 text-[#FFC857]" />;
  return <Brain className="w-3 h-3 text-[var(--accent)]" />;
}
