"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight, ArrowUpRight, Play } from "lucide-react";
import Counter from "@/components/landing/Counter";

const RailwayCanvas = dynamic(
  () => import("@/components/landing/RailwayCanvas"),
  { ssr: false }
);

/* ── Fade-in on scroll ─────────────────────────────────────── */
function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Timeline step ─────────────────────────────────────────── */
const problemSteps = [
  { number: "12,000+", unit: "hours", desc: "of footage recorded daily across Indian Railways" },
  { number: "3%", unit: "", desc: "of that footage is ever reviewed by human operators" },
  { number: "95%", unit: "", desc: "of incidents go completely unnoticed in real-time" },
  { number: "15+", unit: "min", desc: "average response time after an incident is detected" },
];

/* ── Capabilities ──────────────────────────────────────────── */
const capabilities = [
  {
    title: "Crowd Intelligence",
    stat: "12,847",
    unit: "people tracked simultaneously",
    desc: "Real-time density estimation, flow analysis, and overcrowding prediction across every platform.",
  },
  {
    title: "Crime Prevention",
    stat: "< 500ms",
    unit: "detection to alert",
    desc: "Track intrusion, unattended baggage, loitering, and suspicious behaviour — detected before it escalates.",
  },
  {
    title: "Worker Safety",
    stat: "94.2%",
    unit: "compliance rate",
    desc: "PPE monitoring, idle detection, attendance tracking, and safety zone enforcement for every worker.",
  },
  {
    title: "Incident Response",
    stat: "23×",
    unit: "faster than manual",
    desc: "Severity-classified alerts with auto-routing. From detection to action in seconds, not minutes.",
  },
];

/* ── Architecture ──────────────────────────────────────────── */
const archSteps = [
  { label: "Existing Cameras", sub: "50,000+ across Indian Railways" },
  { label: "AI Engine", sub: "YOLO26 + ByteTrack on GPU" },
  { label: "Event Engine", sub: "Real-time classification & scoring" },
  { label: "Dashboard", sub: "Unified command interface" },
  { label: "Control Room", sub: "Actionable intelligence" },
];

/* ── Performance ───────────────────────────────────────────── */
const perf = [
  { value: 60, suffix: " FPS", label: "Processing Speed" },
  { value: 98.5, suffix: "%", label: "Detection Accuracy", decimals: 1 },
  { value: 500, suffix: "ms", label: "Latency", prefix: "<" },
  { value: 50000, suffix: "+", label: "Concurrent Cameras" },
];

/* ═══════════════════════════════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#070707] text-white overflow-x-hidden">
      <div className="noise" />

      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[rgba(255,255,255,0.05)]" style={{ background: "rgba(7,7,7,0.8)", backdropFilter: "blur(12px)" }}>
        <div className="container-narrow h-14 flex items-center justify-between">
          <Link href="/" className="font-display font-bold text-[15px] tracking-tight">
            RailVision<span className="text-[#B8FF3B]">.</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-[13px] text-[#555]">
            <a href="#problem" className="hover:text-[#A0A0A0] transition-colors">Problem</a>
            <a href="#platform" className="hover:text-[#A0A0A0] transition-colors">Platform</a>
            <a href="#capabilities" className="hover:text-[#A0A0A0] transition-colors">Capabilities</a>
            <a href="#architecture" className="hover:text-[#A0A0A0] transition-colors">Architecture</a>
          </div>
          <Link href="/dashboard" className="btn-primary !py-2 !px-5 !text-[12px]">
            Launch Platform
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════
          1. HERO
      ═══════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center justify-center">
        <RailwayCanvas />

        {/* Gradient wash */}
        <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-[#070707] to-transparent pointer-events-none z-[1]" />

        <div className="relative z-10 container-narrow text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="accent-badge mb-10 mx-auto"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[#B8FF3B] animate-pulse-dot" />
            Railway Intelligence Platform
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="font-display text-hero max-w-[900px] mx-auto mb-7"
          >
            Every Camera Knows More
            <br />
            Than It Can Tell<span className="text-[#B8FF3B]">.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            className="text-[#555] text-lg max-w-[480px] mx-auto mb-12 leading-relaxed"
          >
            Transform existing CCTV infrastructure into
            real-time intelligence. No new hardware.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.2 }}
            className="flex items-center justify-center gap-4"
          >
            <Link href="/dashboard" className="btn-primary">
              Launch Platform
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button className="btn-ghost">
              <Play className="w-3.5 h-3.5" />
              Watch Demo
            </button>
          </motion.div>
        </div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
        >
          <div className="w-[1px] h-10 bg-gradient-to-b from-transparent via-[#333] to-transparent" />
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          2. THE PROBLEM
      ═══════════════════════════════════════════════════════ */}
      <section id="problem" className="section-gap">
        <div className="container-narrow">
          <Reveal>
            <p className="text-[13px] text-[#B8FF3B] font-medium uppercase tracking-[0.15em] mb-6">
              The Problem
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="font-display text-section max-w-[700px] mb-20">
              Cameras are watching.
              <br />
              <span className="text-[#333]">Nobody is.</span>
            </h2>
          </Reveal>

          <div className="relative max-w-[500px] mx-auto">
            {/* Vertical line */}
            <div className="absolute left-[24px] top-0 bottom-0 w-[1px] bg-gradient-to-b from-[#222] via-[#222] to-transparent" />

            {problemSteps.map((step, i) => (
              <Reveal key={i} delay={i * 0.15}>
                <div className="relative pl-20 pb-16 last:pb-0">
                  {/* Dot */}
                  <div className="absolute left-[17px] top-[6px] w-[15px] h-[15px] rounded-full border border-[#333] bg-[#070707] flex items-center justify-center">
                    <div className="w-[5px] h-[5px] rounded-full bg-[#555]" />
                  </div>

                  <div className="font-display text-3xl font-bold tracking-tight mb-1">
                    {step.number}
                    {step.unit && <span className="text-[#555] text-xl ml-1">{step.unit}</span>}
                  </div>
                  <p className="text-[#555] text-sm leading-relaxed">{step.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          3. THE TRANSFORMATION
      ═══════════════════════════════════════════════════════ */}
      <section className="section-gap border-t border-[rgba(255,255,255,0.05)]">
        <div className="container-narrow">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
            {/* Before */}
            <Reveal>
              <div>
                <p className="text-[12px] text-[#555] uppercase tracking-[0.15em] mb-4">Before</p>
                <div className="aspect-square max-w-[320px] rounded-xl border border-[rgba(255,255,255,0.05)] bg-[#070707] flex items-center justify-center relative overflow-hidden">
                  <div className="w-16 h-16 rounded-full border border-[#222] flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-[#181818]" />
                  </div>
                  <p className="absolute bottom-6 text-[11px] text-[#333]">Static. Passive. Blind.</p>
                </div>
              </div>
            </Reveal>

            {/* After */}
            <Reveal delay={0.2}>
              <div>
                <p className="text-[12px] text-[#B8FF3B] uppercase tracking-[0.15em] mb-4">After</p>
                <div className="aspect-square max-w-[320px] rounded-xl border border-[rgba(184,255,59,0.08)] bg-[#070707] flex items-center justify-center relative overflow-hidden">
                  {/* Pulsing ring */}
                  <div className="absolute w-32 h-32 rounded-full border border-[rgba(184,255,59,0.08)] animate-pulse" />
                  <div className="absolute w-24 h-24 rounded-full border border-[rgba(184,255,59,0.05)]" />
                  <div className="w-16 h-16 rounded-full bg-[rgba(184,255,59,0.06)] border border-[rgba(184,255,59,0.12)] flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-[#B8FF3B]" />
                  </div>
                  <p className="absolute bottom-6 text-[11px] text-[#B8FF3B]/60">Intelligent. Active. Aware.</p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          4. PRODUCT PREVIEW
      ═══════════════════════════════════════════════════════ */}
      <section id="platform" className="section-gap border-t border-[rgba(255,255,255,0.05)]">
        <div className="container-narrow">
          <Reveal>
            <p className="text-[13px] text-[#B8FF3B] font-medium uppercase tracking-[0.15em] mb-6">
              Platform
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="font-display text-section max-w-[600px] mb-16">
              One interface.
              <br />
              <span className="text-[#333]">Complete visibility.</span>
            </h2>
          </Reveal>

          {/* MacBook frame */}
          <Reveal delay={0.2}>
            <div className="animate-float">
              <div className="rounded-xl border border-[rgba(255,255,255,0.05)] bg-[#0c0c0c] overflow-hidden shadow-2xl shadow-black/50">
                {/* Chrome bar */}
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[rgba(255,255,255,0.05)] bg-[#070707]">
                  <div className="flex gap-1.5">
                    <div className="w-[10px] h-[10px] rounded-full bg-[#ff5f57]/70" />
                    <div className="w-[10px] h-[10px] rounded-full bg-[#febc2e]/70" />
                    <div className="w-[10px] h-[10px] rounded-full bg-[#28c840]/70" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="px-16 py-1 rounded-md bg-[#111] text-[10px] text-[#444] font-mono">
                      railvision.ai/dashboard
                    </div>
                  </div>
                </div>

                {/* Dashboard mockup */}
                <div className="p-5 min-h-[350px] bg-[#070707]">
                  {/* Top bar */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#B8FF3B]" />
                      <span className="text-[11px] text-[#555] font-medium">System Online — 247 Active Cameras</span>
                    </div>
                    <span className="text-[10px] text-[#333] font-mono">14:32:07 IST</span>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-3 mb-5">
                    {[
                      { label: "People Detected", value: "12,847" },
                      { label: "Active Alerts", value: "23" },
                      { label: "Safety Score", value: "94.2%" },
                      { label: "Workers", value: "186" },
                    ].map((s) => (
                      <div key={s.label} className="surface-2 p-3">
                        <p className="text-[9px] text-[#444] uppercase tracking-wider mb-1">{s.label}</p>
                        <p className="text-base font-semibold">{s.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Camera grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="aspect-video rounded-xl bg-[#0e0e0e] border border-[rgba(255,255,255,0.05)] relative">
                        <div className="absolute top-1.5 left-2 flex items-center gap-1">
                          <div className="w-1 h-1 rounded-full bg-[#FF4D4D] animate-pulse-dot" />
                          <span className="text-[7px] text-[#333] font-mono">CAM-{String(i + 1).padStart(3, "0")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          5. CAPABILITIES
      ═══════════════════════════════════════════════════════ */}
      <section id="capabilities" className="section-gap border-t border-[rgba(255,255,255,0.05)]">
        <div className="container-narrow">
          <Reveal>
            <p className="text-[13px] text-[#B8FF3B] font-medium uppercase tracking-[0.15em] mb-6">
              Capabilities
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="font-display text-section max-w-[600px] mb-20">
              Not features.
              <br />
              <span className="text-[#333]">Superpowers.</span>
            </h2>
          </Reveal>

          <div className="space-y-0">
            {capabilities.map((cap, i) => (
              <Reveal key={cap.title} delay={i * 0.1}>
                <div className="border-t border-[rgba(255,255,255,0.05)] py-14 grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-8 items-start group">
                  <div>
                    <p className="text-[11px] text-[#444] uppercase tracking-[0.15em] mb-3">0{i + 1}</p>
                    <h3 className="font-display text-2xl font-semibold tracking-tight group-hover:text-[#B8FF3B] transition-colors duration-300">
                      {cap.title}
                    </h3>
                  </div>
                  <div>
                    <div className="mb-4">
                      <span className="font-display text-4xl font-bold tracking-tight">{cap.stat}</span>
                      {" "}
                      <span className="text-[#555] text-sm ml-2">{cap.unit}</span>
                    </div>
                    <p className="text-[#555] text-sm leading-relaxed max-w-[450px]">{cap.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          6. ARCHITECTURE
      ═══════════════════════════════════════════════════════ */}
      <section id="architecture" className="section-gap border-t border-[rgba(255,255,255,0.05)]">
        <div className="container-narrow max-w-[700px]">
          <Reveal>
            <p className="text-[13px] text-[#B8FF3B] font-medium uppercase tracking-[0.15em] mb-6">
              Architecture
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="font-display text-section mb-20">
              From camera
              <br />
              <span className="text-[#333]">to control room.</span>
            </h2>
          </Reveal>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[40px] top-0 bottom-0 w-[1px] bg-gradient-to-b from-[#B8FF3B]/20 via-[#222] to-transparent" />

            {archSteps.map((step, i) => (
              <Reveal key={step.label} delay={i * 0.12}>
                <div className="relative pl-24 pb-14 last:pb-0">
                  {/* Node */}
                  <div className="absolute left-[28px] top-[4px] w-[25px] h-[25px] rounded-full border border-[#222] bg-[#070707] flex items-center justify-center">
                    <div
                      className="w-[7px] h-[7px] rounded-full"
                      style={{ background: i === 0 ? "#B8FF3B" : i === archSteps.length - 1 ? "#B8FF3B" : "#333" }}
                    />
                  </div>

                  <h4 className="font-display text-lg font-semibold tracking-tight mb-1">{step.label}</h4>
                  <p className="text-[#555] text-sm">{step.sub}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          7. PERFORMANCE
      ═══════════════════════════════════════════════════════ */}
      <section className="section-gap border-t border-[rgba(255,255,255,0.05)]">
        <div className="container-narrow">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 md:gap-8">
            {perf.map((p, i) => (
              <Reveal key={p.label} delay={i * 0.1}>
                <div className="text-center">
                  <div className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-2">
                    <Counter
                      target={p.value}
                      suffix={p.suffix}
                      prefix={p.prefix}
                      decimals={p.decimals || 0}
                    />
                  </div>
                  <p className="text-[#555] text-xs uppercase tracking-[0.1em]">{p.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          8. CTA
      ═══════════════════════════════════════════════════════ */}
      <section className="section-gap border-t border-[rgba(255,255,255,0.05)]">
        <div className="container-narrow text-center">
          <Reveal>
            <h2 className="font-display text-section mb-6">
              Ready<span className="text-[#B8FF3B]">?</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-[#555] text-base max-w-[400px] mx-auto mb-10">
              Transform your existing cameras into an intelligent surveillance network.
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <div className="flex items-center justify-center gap-4">
              <a href="#" className="btn-primary">
                Request Demo
                <ArrowRight className="w-4 h-4" />
              </a>
              <Link href="/dashboard" className="btn-ghost">
                Launch Platform
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          9. FOOTER
      ═══════════════════════════════════════════════════════ */}
      <footer className="border-t border-[rgba(255,255,255,0.05)] py-12">
        <div className="container-narrow">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <p className="font-display font-bold text-sm mb-1">
                RailVision<span className="text-[#B8FF3B]">.</span>
              </p>
              <p className="text-[11px] text-[#333]">AI-Powered Railway Intelligence</p>
            </div>

            <div className="flex items-center gap-8 text-[12px] text-[#444]">
              <a href="#" className="hover:text-[#A0A0A0] transition-colors">Documentation</a>
              <a href="#" className="hover:text-[#A0A0A0] transition-colors">API</a>
              <a href="#" className="hover:text-[#A0A0A0] transition-colors">Privacy</a>
              <a href="#" className="hover:text-[#A0A0A0] transition-colors">Terms</a>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-[rgba(255,255,255,0.05)] flex items-center justify-between">
            <p className="text-[10px] text-[#222]">© {new Date().getFullYear()} RailVision AI</p>
            <p className="text-[10px] text-[#222]">Built for Indian Railways</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
