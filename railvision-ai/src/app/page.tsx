'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import Link from 'next/link';
import ClickSpark from '@/components/ClickSpark';
import {
  Zap, Lock, Terminal, Activity, Calendar, Check,
  ChevronRight, ArrowRight, X
} from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

// --- Noise Overlay ---
const NoiseOverlay = () => (
  <div className="bg-noise" aria-hidden="true" />
);

// --- Navbar ---
const Navbar = ({ onOpenConsultation }: { onOpenConsultation: () => void }) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-7xl px-4 sm:px-6 transition-all duration-500`}
    >
      <div className={`w-full rounded-full px-6 py-3.5 flex items-center justify-between border transition-all duration-500 ${
        scrolled
          ? 'bg-[var(--surface)]/85 backdrop-blur-xl border-white/10 text-white shadow-[0_4px_30px_rgba(0,0,0,0.5)]'
          : 'bg-black/40 backdrop-blur-md border-white/15 text-white'
      }`}>
      <a href="#" className="flex items-center gap-3 group link-lift">
        <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center text-dark font-mono font-bold text-sm shadow-md group-hover:scale-105 transition-transform">
          rA
        </div>
        <div className="flex flex-col">
          <span className="font-sans font-bold text-lg tracking-tight leading-none text-white">
            railway<span className="text-[var(--accent)]">Ai</span>
          </span>
          <span className="font-mono text-[9px] opacity-60 tracking-wider">
            [ EDGE CCTV ]
          </span>
        </div>
      </a>

      <div className="hidden md:flex items-center gap-8 font-sans font-medium text-xs tracking-wider uppercase text-white/80">
        <a href="#features" className="link-lift hover:text-[var(--accent)]">01 // Telemetry</a>
        <a href="#philosophy" className="link-lift hover:text-[var(--accent)]">02 // Manifesto</a>
        <a href="#protocol" className="link-lift hover:text-[var(--accent)]">03 // Protocol</a>
      </div>

      <button
        onClick={onOpenConsultation}
        className="btn-magnetic bg-[var(--accent)] text-dark text-xs font-mono font-bold uppercase tracking-wider px-5 py-2.5 shadow-lg group hover:shadow-[0_0_20px_rgba(184,255,59,0.3)] transition-shadow"
      >
        <span className="btn-bg bg-white"></span>
        <span className="btn-text flex items-center gap-2">
          <span>Book Consultation</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </span>
      </button>
      </div>
    </nav>
  );
};

// --- Hero Section ---
const Hero = ({ onOpenConsultation }: { onOpenConsultation: () => void }) => {
  const heroRef = useRef(null);
  const title1Ref = useRef(null);
  const title2Ref = useRef(null);
  const descRef = useRef(null);
  const ctaRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.fromTo(title1Ref.current, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, delay: 0.2 })
        .fromTo(title2Ref.current, { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 1.0 }, '-=0.6')
        .fromTo(descRef.current, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, '-=0.6')
        .fromTo(ctaRef.current, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, '-=0.5');
    }, heroRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={heroRef} className="relative w-full h-[100dvh] flex flex-col justify-end overflow-hidden bg-black text-white">
      <div
        className="absolute inset-0 bg-cover bg-center scale-105 filter grayscale-[80%] brightness-[0.4] contrast-125 opacity-70 transition-transform duration-1000"
        style={{ backgroundImage: `url('/hero-bg.jpg')` }}
      />
      <div className="absolute inset-0 bg-black/50 mix-blend-multiply" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent opacity-90" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(184,255,59,0.08)_0%,transparent_50%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pb-20 md:pb-32">
        <div className="space-y-0 md:space-y-1 mb-8">
          <h1 ref={title1Ref} className="font-sans font-extrabold uppercase text-5xl sm:text-7xl lg:text-[7.5rem] tracking-tighter text-white leading-[0.9] drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] opacity-0">
            SURVEIL THE
          </h1>
          <div ref={title2Ref} className="font-drama italic font-normal text-6xl sm:text-[5.5rem] lg:text-[9rem] text-[var(--accent)] leading-[0.8] drop-shadow-[0_6px_24px_rgba(184,255,59,0.3)] opacity-0 mt-2 sm:mt-4">
            CRITICAL GRID.
          </div>
        </div>

        <p ref={descRef} className="max-w-3xl text-white/80 font-sans font-light text-lg sm:text-xl md:text-2xl leading-relaxed mb-12 drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] opacity-0">
          Sub-millisecond edge CCTV surveillance engineered for high-density railway corridors, freight terminals, and zero-trust critical infrastructure.
        </p>

        <div ref={ctaRef} className="flex flex-wrap items-center gap-4 opacity-0">
          <button
            onClick={onOpenConsultation}
            className="btn-magnetic bg-[var(--accent)] text-dark text-sm font-mono font-bold uppercase tracking-wider px-8 py-4 shadow-2xl group hover:shadow-[0_0_20px_rgba(184,255,59,0.3)] transition-shadow"
          >
            <span className="btn-bg bg-white"></span>
            <span className="btn-text group-hover:text-dark flex items-center gap-3">
              <span>Book a Consultation</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </button>
          
          <Link
            href="/dashboard"
            className="px-6 py-4 rounded-full bg-black/50 backdrop-blur-md border border-white/10 hover:border-white/30 text-white font-mono text-xs tracking-wider uppercase link-lift flex items-center gap-2"
          >
            <Terminal className="w-4 h-4 text-[var(--accent)]" />
            <span>Launch Dashboard</span>
          </Link>
        </div>
      </div>
    </section>
  );
};

// --- Features Section ---
const Features = () => {
  const sectionRef = useRef(null);

  // Card 1: Diagnostic Shuffler
  const [cards, setCards] = useState([
    { id: '01', title: '0.38ms Edge Inference', subtitle: 'Zero-Buffer Optical Tokenization', metric: '0.38 ms', badge: 'LATENCY OPTIMIZED', status: 'VERIFIED' },
    { id: '02', title: '100Gbps Fibre Pipeline', subtitle: 'Hardware Accelerated Frame Parser', metric: '100 Gbps', badge: 'THROUGHPUT HIGH', status: 'STABLE' },
    { id: '03', title: 'Neural Motion Vectoring', subtitle: 'Autonomous Object Tracking Mesh', metric: '99.98 %', badge: 'PRECISION TARGET', status: 'LOCKED' },
  ]);

  const cycleCards = () => setCards(prev => [...prev.slice(1), prev[0]]);

  useEffect(() => {
    const timer = setInterval(cycleCards, 3200);
    return () => clearInterval(timer);
  }, []);

  // Card 2: Telemetry Typewriter
  const logs = useMemo(() => [
    '[05:32:01] PQC-NTRU 4096-bit handshake locked across Sector 09 corridor.',
    '[05:32:03] Anti-tamper telemetry verified. 0 frame drops across 14,820 cameras.',
    '[05:32:06] Autonomous neural threat vector clear: 0 intrusion anomalies.',
    '[05:32:09] Edge Node #842-A sync complete. Hardware security module intact.',
  ], []);
  const [logIndex, setLogIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    const currentFullText = logs[logIndex];
    if (charIndex < currentFullText.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + currentFullText[charIndex]);
        setCharIndex(prev => prev + 1);
      }, 35);
      return () => clearTimeout(timeout);
    } else {
      const timeout = setTimeout(() => {
        setDisplayedText('');
        setCharIndex(0);
        setLogIndex(prev => (prev + 1) % logs.length);
      }, 2500);
      return () => clearTimeout(timeout);
    }
  }, [charIndex, logIndex, logs]);

  // Card 3: Cursor Protocol Scheduler
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const [activeDay, setActiveDay] = useState(2);
  const [cursorPos, setCursorPos] = useState({ x: 30, y: 30 });
  const [clicking, setClicking] = useState(false);
  const [saveStatus, setSaveStatus] = useState('STANDBY');

  useEffect(() => {
    let step = 0;
    const interval = setInterval(() => {
      if (step === 0) {
        setCursorPos({ x: 70, y: 35 }); setClicking(false); step = 1;
      } else if (step === 1) {
        setClicking(true); setActiveDay(4); step = 2;
      } else if (step === 2) {
        setCursorPos({ x: 80, y: 80 }); setClicking(false); step = 3;
      } else if (step === 3) {
        setClicking(true); setSaveStatus('PROTOCOL SAVED'); step = 4;
      } else {
        setCursorPos({ x: 35, y: 35 }); setClicking(false); setActiveDay(2); setSaveStatus('STANDBY'); step = 0;
      }
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="features" ref={sectionRef} className="py-24 md:py-32 px-6 bg-black text-white relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(184,255,59,0.03)_0%,transparent_50%)] pointer-events-none" />
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 border-b border-white/10 pb-8">
          <div>
            <div className="font-mono text-xs text-[var(--accent)] uppercase font-bold tracking-widest mb-3">
              {'// FUNCTIONAL ARTIFACTS'}
            </div>
            <h2 className="font-sans font-bold text-4xl md:text-5xl tracking-tight uppercase leading-[1.1] max-w-2xl">
              REDEFINING SURVEILLANCE INFRASTRUCTURE
            </h2>
          </div>
          <p className="max-w-md text-white/60 font-sans text-sm md:text-base mt-4 md:mt-0">
            Three real-time engineering protocols powering zero-compromise CCTV surveillance across high-risk rail and industrial corridors.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {/* Card 1 */}
          <div className="bg-[var(--surface)] border border-white/10 hover:border-white/20 hover:-translate-y-2 transition-all duration-300 rounded-3xl p-8 shadow-[0_8px_30px_rgba(0,0,0,0.4)] flex flex-col justify-between relative overflow-hidden group">
            <div>
              <div className="flex items-center justify-between mb-6">
                <span className="font-mono text-xs text-[var(--accent)] font-bold tracking-widest bg-[var(--accent)]/10 px-3 py-1 rounded-full border border-[var(--accent)]/20">
                  PROP 01 // SHUFFLER
                </span>
                <Zap className="w-5 h-5 text-[var(--accent)] drop-shadow-[0_0_8px_rgba(184,255,59,0.5)]" />
              </div>
              <h3 className="font-sans font-bold text-2xl mb-2 uppercase text-white">Sub-Millisecond Latency</h3>
              <p className="font-sans text-xs text-white/50 mb-6">Real-time optical frame tokenization with zero frame buffers.</p>
            </div>
            <div className="relative h-64 my-4 flex items-center justify-center cursor-pointer" onClick={cycleCards}>
              {cards.map((card, index) => {
                const isTop = index === 0;
                const isMiddle = index === 1;
                return (
                  <div key={card.id} className={`absolute w-full p-6 rounded-2xl border shuffler-card shadow-xl transition-all duration-500 ${
                    isTop ? 'bg-[var(--surface-2)] text-white border-[var(--accent)] z-30 translate-y-0 scale-100 opacity-100 shadow-[0_0_20px_rgba(184,255,59,0.1)]'
                    : isMiddle ? 'bg-black text-white border-white/20 z-20 translate-y-4 scale-95 opacity-60'
                    : 'bg-black text-white/50 border-white/10 z-10 translate-y-8 scale-90 opacity-30'
                  }`}>
                    <div className="flex justify-between items-start mb-4">
                      <span className="font-mono text-xs opacity-60">CARD #{card.id}</span>
                      <span className={`font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded ${isTop ? 'bg-[var(--accent)] text-dark' : 'bg-white/10 text-white'}`}>
                        {card.badge}
                      </span>
                    </div>
                    <div className="font-sans font-bold text-lg mb-1">{card.title}</div>
                    <div className="font-sans text-xs opacity-70 mb-4">{card.subtitle}</div>
                    <div className="flex items-baseline justify-between border-t border-white/10 pt-3">
                      <span className={`font-mono text-2xl font-bold ${isTop ? 'text-[var(--accent)]' : 'text-white'}`}>{card.metric}</span>
                      <span className="font-mono text-[10px] uppercase tracking-wider">{card.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={cycleCards} className="mt-4 text-xs font-mono font-bold uppercase text-[var(--accent)] flex items-center justify-between w-full hover:text-white transition-colors">
              <span>Click to Cycle Telemetry</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card 2 */}
          <div className="bg-[var(--surface)] text-white border border-white/10 hover:border-white/20 hover:-translate-y-2 transition-all duration-300 rounded-3xl p-8 shadow-[0_8px_30px_rgba(0,0,0,0.4)] flex flex-col justify-between relative overflow-hidden group">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
                  <span className="font-mono text-[10px] text-white uppercase font-bold tracking-widest">LIVE FEED STREAM</span>
                </div>
                <Lock className="w-5 h-5 text-[var(--accent)] drop-shadow-[0_0_8px_rgba(184,255,59,0.5)]" />
              </div>
              <h3 className="font-sans font-bold text-2xl mb-2 uppercase">Quantum Encryption</h3>
              <p className="font-sans text-xs text-white/60 mb-6">4096-bit NTRU lattice cryptography over live video streams.</p>
            </div>
            <div className="bg-black/90 rounded-2xl border border-white/10 p-5 font-mono text-xs my-4 h-64 flex flex-col justify-between shadow-inner">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[var(--accent)]" />
                  <span className="text-white/60">railwayAi_node_ctl</span>
                </div>
                <span className="text-[10px] text-[var(--accent)] font-bold">ENCRYPTED</span>
              </div>
              <div className="my-auto text-[var(--accent)]/80 leading-relaxed font-mono min-h-[5rem]">
                {displayedText}
                <span className="inline-block w-2 h-4 bg-[var(--accent)] ml-1 animate-pulse align-middle" />
              </div>
              <div className="border-t border-white/10 pt-3 flex items-center justify-between text-[10px] text-white/40">
                <span>BUFFER: 0 FRAMES</span>
                <span>CIPHER: PQC-NTRU</span>
              </div>
            </div>
            <div className="font-mono text-[11px] text-white/50 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-[var(--accent)] animate-pulse" />
              <span>Real-time optical anti-tamper stream locked</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-[var(--surface)] text-white border border-white/10 hover:border-white/20 hover:-translate-y-2 transition-all duration-300 rounded-3xl p-8 shadow-[0_8px_30px_rgba(0,0,0,0.4)] flex flex-col justify-between relative overflow-hidden group">
            <div>
              <div className="flex items-center justify-between mb-6">
                <span className="font-mono text-xs text-[var(--accent)] font-bold tracking-widest bg-[var(--accent)]/10 px-3 py-1 rounded-full border border-[var(--accent)]/20">PROP 03 // SCHEDULER</span>
                <Calendar className="w-5 h-5 text-[var(--accent)] drop-shadow-[0_0_8px_rgba(184,255,59,0.5)]" />
              </div>
              <h3 className="font-sans font-bold text-2xl mb-2 uppercase">Autonomous Edge Grid</h3>
              <p className="font-sans text-xs text-white/50 mb-6">Self-healing grid protocol with automated drone-CCTV sync.</p>
            </div>
            <div className="relative bg-black/60 rounded-2xl border border-white/10 p-5 my-4 h-64 flex flex-col justify-between overflow-hidden shadow-inner">
              <div className="flex items-center justify-between text-xs font-mono font-bold mb-3 text-white/70">
                <span>ACTIVE DISPATCH SCHEDULE</span>
                <span className="text-[var(--accent)]">{saveStatus}</span>
              </div>
              <div className="grid grid-cols-7 gap-1.5 my-auto">
                {days.map((day, idx) => {
                  const isActive = idx === activeDay;
                  return (
                    <button key={day} onClick={() => setActiveDay(idx)} className={`py-3 rounded-lg text-[10px] font-mono font-bold transition-all flex flex-col items-center gap-1 ${isActive ? 'bg-[var(--accent)] text-dark shadow-[0_0_15px_rgba(184,255,59,0.3)] scale-105' : 'bg-white/5 border border-white/5 text-white/60 hover:bg-white/10'}`}>
                      <span>{day}</span>
                      {isActive && <Check className="w-3 h-3 text-dark" />}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center">
                <span className="font-mono text-[10px] text-white/40">AUTO ROTATION: ENABLED</span>
                <button className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${clicking && cursorPos.y > 60 ? 'scale-95' : 'hover:bg-[var(--accent)] hover:text-dark'} bg-white/10 border border-white/20 text-white`}>
                  SAVE PROTOCOL
                </button>
              </div>
              <div className="absolute pointer-events-none transition-all duration-700 z-50 ease-out" style={{ left: `${cursorPos.x}%`, top: `${cursorPos.y}%`, transform: clicking ? 'scale(0.85)' : 'scale(1)' }}>
                <svg className="w-6 h-6 text-[var(--accent)] drop-shadow-[0_0_10px_rgba(184,255,59,0.8)]" fill="currentColor" viewBox="0 0 24 24"><path d="M3 3l7 18 3-7 7-3L3 3z" /></svg>
              </div>
            </div>
            <div className="font-mono text-[11px] text-white/50 flex items-center justify-between">
              <span>SYNC STATUS: OPTIMAL</span>
              <span className="text-[var(--accent)] font-bold">100% COVERAGE</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// --- Philosophy Section ---
const Philosophy = () => {
  const sectionRef = useRef(null);
  const text1Ref = useRef(null);
  const text2Ref = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(text1Ref.current, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1, scrollTrigger: { trigger: sectionRef.current, start: 'top 70%' } });
      gsap.fromTo(text2Ref.current, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1.2, delay: 0.3, scrollTrigger: { trigger: sectionRef.current, start: 'top 65%' } });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="philosophy" ref={sectionRef} className="relative w-full py-24 md:py-32 px-6 bg-dark text-white overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center opacity-15 filter grayscale pointer-events-none" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=2000')` }} />
      <div className="absolute inset-0 bg-gradient-to-b from-dark via-dark/95 to-dark pointer-events-none" />
      <div className="relative z-10 max-w-7xl mx-auto space-y-16">
        <div className="font-mono text-xs text-[var(--accent)] font-bold tracking-widest uppercase">{'// THE MANIFESTO'}</div>
        <div className="space-y-12">
          <div ref={text1Ref} className="max-w-3xl opacity-0">
            <p className="font-sans text-xl sm:text-2xl md:text-3xl text-white/50 font-light leading-relaxed">
              Most CCTV surveillance focuses on: <span className="text-white/80 font-normal underline decoration-white/20">passive recording of forensic evidence after perimeter breaches occur.</span>
            </p>
          </div>
          <div ref={text2Ref} className="pt-4 opacity-0">
            <p className="font-sans text-4xl sm:text-5xl md:text-6xl lg:text-[4.5rem] font-extrabold tracking-tighter leading-[1.15] text-white">
              We focus on: <span className="font-drama italic font-normal text-[var(--accent)] drop-shadow-[0_0_10px_rgba(184,255,59,0.3)] block sm:inline mt-2 sm:mt-0">autonomous, sub-millisecond edge intelligence</span> where critical infrastructure demands zero compromised seconds.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-16 border-t border-white/10">
          <div><div className="font-mono text-3xl md:text-5xl font-bold text-[var(--accent)] mb-1">0.38ms</div><div className="font-sans text-xs text-white/60 uppercase tracking-wider">Edge Inference Speed</div></div>
          <div><div className="font-mono text-3xl md:text-5xl font-bold text-white mb-1">4096-bit</div><div className="font-sans text-xs text-white/60 uppercase tracking-wider">Quantum Lattice Key</div></div>
          <div><div className="font-mono text-3xl md:text-5xl font-bold text-[var(--accent)] mb-1">100%</div><div className="font-sans text-xs text-white/60 uppercase tracking-wider">Zero-Trust Hardware</div></div>
          <div><div className="font-mono text-3xl md:text-5xl font-bold text-white mb-1">99.999%</div><div className="font-sans text-xs text-white/60 uppercase tracking-wider">Corridor Uptime</div></div>
        </div>
      </div>
    </section>
  );
};

// --- Protocol Section ---
const Protocol = () => (
  <section id="protocol" className="py-24 md:py-32 bg-black text-white relative">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,rgba(184,255,59,0.03)_0%,transparent_50%)] pointer-events-none" />
    <div className="max-w-7xl mx-auto px-6 mb-20 relative z-10">
      <div className="font-mono text-xs text-[var(--accent)] uppercase font-bold tracking-widest mb-3">{'// ARCHITECTURE STACK'}</div>
      <h2 className="font-sans font-bold text-3xl md:text-5xl tracking-tight uppercase leading-[1.1] max-w-3xl">THE THREE-PHASE DEPLOYMENT PROTOCOL</h2>
    </div>
    <div className="max-w-7xl mx-auto px-6 space-y-12 md:space-y-16 relative z-10">
      {/* Step 1 */}
      <div className="sticky top-28 rounded-4xl p-8 md:p-16 border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.4)] bg-[var(--surface)] text-white">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-4"><span className="font-mono text-3xl md:text-5xl font-extrabold text-[var(--accent)] drop-shadow-[0_0_10px_rgba(184,255,59,0.4)]">STEP 01</span><div className="h-px bg-white/10 flex-grow" /></div>
            <h3 className="font-sans font-extrabold text-2xl sm:text-4xl md:text-5xl tracking-tight uppercase text-white">SENSOR MESH INGESTION</h3>
            <div className="font-mono text-sm uppercase text-[var(--accent)] font-semibold">Zero-Latency Video Tokenization</div>
            <p className="font-sans text-base md:text-lg opacity-80 leading-relaxed max-w-xl text-white/70">Edge optical cameras capture 4K streams at 120 FPS, tokenizing image slices directly inside TPU hardware before reaching memory buffers.</p>
          </div>
          <div className="lg:col-span-5 flex items-center justify-center p-6 bg-black/40 rounded-3xl border border-white/10 min-h-[260px] relative overflow-hidden shadow-inner">
            <div className="relative w-48 h-48 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-[var(--accent)]/30 animate-ping" />
              <div className="absolute inset-4 rounded-full border border-[var(--accent)]/10" />
              <div className="absolute inset-12 rounded-full border border-[var(--accent)]/50" />
              <div className="w-3 h-3 bg-[var(--accent)] rounded-full animate-pulse shadow-[0_0_15px_rgba(184,255,59,0.8)]" />
              <div className="absolute inset-0 rounded-full border-t-2 border-[var(--accent)] animate-spin duration-3000" style={{ animationDuration: '3s' }} />
              <span className="absolute bottom-2 font-mono text-[9px] text-[var(--accent)] font-bold">RADAR SWEEP: 360°</span>
            </div>
          </div>
        </div>
      </div>
      {/* Step 2 */}
      <div className="sticky top-28 rounded-4xl p-8 md:p-16 border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.5)] bg-[var(--surface-2)] text-white">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-4"><span className="font-mono text-3xl md:text-5xl font-extrabold text-[var(--accent)] drop-shadow-[0_0_10px_rgba(184,255,59,0.4)]">STEP 02</span><div className="h-px bg-white/10 flex-grow" /></div>
            <h3 className="font-sans font-extrabold text-2xl sm:text-4xl md:text-5xl tracking-tight uppercase text-white">QUANTUM THREAT VECTORING</h3>
            <div className="font-mono text-sm uppercase text-[var(--accent)] font-semibold">Real-Time Neural Pattern Classification</div>
            <p className="font-sans text-base md:text-lg opacity-80 leading-relaxed max-w-xl text-white/70">Convolutional optical transformers classify intrusion vectors, track unauthorized track crossings, and isolate thermal anomalies in under 400 microseconds.</p>
          </div>
          <div className="lg:col-span-5 flex items-center justify-center p-6 bg-black/60 rounded-3xl border border-white/10 min-h-[260px] relative overflow-hidden shadow-inner">
            <div className="relative w-full h-48 flex flex-col justify-between p-4">
              <div className="grid grid-cols-8 gap-3 my-auto opacity-40">
                {Array.from({ length: 32 }).map((_, i) => <div key={i} className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />)}
              </div>
              <div className="absolute left-0 right-0 h-1 bg-[var(--accent)] shadow-[0_0_15px_rgba(184,255,59,0.8)] animate-bounce top-1/2" />
              <span className="font-mono text-[9px] text-[var(--accent)]/70 text-center uppercase">LASER SCAN MESH: ACTIVE</span>
            </div>
          </div>
        </div>
      </div>
      {/* Step 3 */}
      <div className="sticky top-28 rounded-4xl p-8 md:p-16 border border-[var(--accent)]/20 shadow-[0_8px_40px_rgba(184,255,59,0.1)] bg-black text-white">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-4"><span className="font-mono text-3xl md:text-5xl font-extrabold text-[var(--accent)] drop-shadow-[0_0_10px_rgba(184,255,59,0.4)]">STEP 03</span><div className="h-px bg-white/10 flex-grow" /></div>
            <h3 className="font-sans font-extrabold text-2xl sm:text-4xl md:text-5xl tracking-tight uppercase text-white">AUTONOMOUS RESPONSE MATRIX</h3>
            <div className="font-mono text-sm uppercase text-white font-semibold">Instantaneous Perimeter Lockdown</div>
            <p className="font-sans text-base md:text-lg opacity-80 leading-relaxed max-w-xl text-white/70">Identified threat coordinates trigger automated drone launch signals, optical laser deterrents, and direct emergency dispatch protocols.</p>
          </div>
          <div className="lg:col-span-5 flex items-center justify-center p-6 bg-[var(--surface-2)]/50 rounded-3xl border border-[var(--accent)]/10 min-h-[260px] relative overflow-hidden shadow-inner">
            <div className="relative w-full h-48 flex flex-col items-center justify-center">
              <svg className="w-full h-24 stroke-[var(--accent)] fill-none stroke-2">
                <path d="M0 40 Q 30 40, 60 10 T 120 70 T 180 40 T 240 40 T 300 10 T 360 40" className="animate-pulse drop-shadow-[0_0_8px_rgba(184,255,59,0.5)]" />
              </svg>
              <span className="font-mono text-[9px] text-[var(--accent)] font-bold uppercase mt-2">AUTONOMOUS PULSE // LOCKED</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

// --- Footer ---
const Footer = () => (
  <footer className="bg-dark text-white rounded-t-4xl px-6 py-20 md:py-28 border-t border-white/10 mt-16 md:mt-24">
    <div className="max-w-7xl mx-auto space-y-12 md:space-y-16">
      <div className="flex flex-col md:flex-row items-center justify-between p-6 rounded-2xl bg-white/5 border border-white/10 gap-4">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
          <span className="font-mono text-xs font-bold uppercase tracking-wider">SYSTEM OPERATIONAL // ALL 14,820 CCTV NODES SYNCED</span>
        </div>
        <span className="font-mono text-xs text-white/50">[ UP-TIME: 99.999% | LATENCY: 0.38MS ]</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pt-8 border-t border-white/10">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-[var(--accent)] flex items-center justify-center font-mono font-bold text-xs text-dark">rA</div>
            <span className="font-sans font-bold text-xl tracking-tight">railway<span className="text-[var(--accent)]">Ai</span></span>
          </div>
          <p className="font-sans text-xs text-white/60 leading-relaxed max-w-xs">Advance CCTV surveillance where it matters. Autonomous edge intelligence for critical transit & industrial corridors.</p>
        </div>
        <div>
          <h4 className="font-mono text-xs text-[var(--accent)] uppercase font-bold tracking-widest mb-4">{'// INFRASTRUCTURE'}</h4>
          <ul className="space-y-2.5 font-sans text-xs text-white/70">
            <li><a href="#features" className="hover:text-white transition-colors">Edge Tokenization</a></li>
            <li><a href="#features" className="hover:text-white transition-colors">Quantum NTRU Lattice</a></li>
            <li><a href="#features" className="hover:text-white transition-colors">Drone Dispatch Sync</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-mono text-xs text-[var(--accent)] uppercase font-bold tracking-widest mb-4">{'// SECTORS'}</h4>
          <ul className="space-y-2.5 font-sans text-xs text-white/70">
            <li>High-Speed Rail Lines</li>
            <li>Freight & Intermodal Depots</li>
            <li>Nuclear Energy Facilities</li>
            <li>Defense Perimeter Corridors</li>
          </ul>
        </div>
        <div>
          <h4 className="font-mono text-xs text-[var(--accent)] uppercase font-bold tracking-widest mb-4">{'// COMPLIANCE'}</h4>
          <ul className="space-y-2.5 font-sans text-xs text-white/70">
            <li>ISO 27001 Certified</li>
            <li>NDAA Section 889 Compliant</li>
            <li>Zero-Trust Hardware Architecture</li>
          </ul>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-between pt-8 border-t border-white/10 font-mono text-[11px] text-white/40 gap-4">
        <div>© 2026 railwayAi Inc. All rights reserved.</div>
        <div className="flex items-center gap-6">
          <a href="#" className="hover:text-white">PRIVACY PROTOCOL</a>
          <a href="#" className="hover:text-white">TERMS OF DISPATCH</a>
          <a href="#" className="hover:text-white">SECURITY AUDITS</a>
        </div>
      </div>
    </div>
  </footer>
);

// --- Consultation Modal ---
const ConsultationModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[var(--surface-2)] text-white border border-[var(--accent)]/30 rounded-3xl w-full max-w-xl p-8 relative shadow-[0_0_50px_rgba(184,255,59,0.1)]">
        <button onClick={onClose} className="absolute top-6 right-6 text-white/50 hover:text-[var(--accent)] p-2 rounded-full hover:bg-white/5 transition-colors">
          <X className="w-5 h-5" />
        </button>
        {submitted ? (
          <div className="py-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-[var(--accent)]/20 border border-[var(--accent)] text-[var(--accent)] flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(184,255,59,0.4)]">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="font-sans font-bold text-2xl uppercase">CONSULTATION DISPATCHED</h3>
            <p className="font-mono text-xs text-white/70 max-w-sm mx-auto">Our tactical security engineering team will contact your organization within 2 hours.</p>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="space-y-6">
            <div>
              <div className="font-mono text-xs text-[var(--accent)] uppercase font-bold tracking-widest mb-1">{'// DISPATCH AUDIT'}</div>
              <h3 className="font-sans font-bold text-2xl uppercase">BOOK TACTICAL CONSULTATION</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block font-mono text-xs text-white/60 uppercase mb-1">Full Name</label>
                <input required type="text" placeholder="e.g. Director Sarah Vance" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 font-sans text-sm focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_10px_rgba(184,255,59,0.2)] transition-all" />
              </div>
              <div>
                <label className="block font-mono text-xs text-white/60 uppercase mb-1">Official Email</label>
                <input required type="email" placeholder="s.vance@railway.gov" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 font-sans text-sm focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_10px_rgba(184,255,59,0.2)] transition-all" />
              </div>
              <div>
                <label className="block font-mono text-xs text-white/60 uppercase mb-1">Organization / Transit Authority</label>
                <input required type="text" placeholder="National Transit & Infrastructure Grid" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 font-sans text-sm focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_10px_rgba(184,255,59,0.2)] transition-all" />
              </div>
              <div>
                <label className="block font-mono text-xs text-white/60 uppercase mb-1">Estimated CCTV Nodes Scope</label>
                <select className="w-full bg-black/50 text-white border border-white/10 rounded-xl px-4 py-3 font-sans text-sm focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_10px_rgba(184,255,59,0.2)] transition-all">
                  <option>10-50 Nodes (Local Rail Hub)</option>
                  <option>50-200 Nodes (Corridor Network)</option>
                  <option>200-1000+ Nodes (Nationwide Infrastructure)</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn-magnetic w-full bg-[var(--accent)] text-dark font-mono text-xs font-bold uppercase tracking-wider py-4 shadow-[0_0_20px_rgba(184,255,59,0.2)] hover:shadow-[0_0_30px_rgba(184,255,59,0.4)] transition-all">
              <span className="btn-bg bg-white" />
              <span className="btn-text hover:text-dark">Submit Consultation Request</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default function App() {
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.8,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.5,
      lerp: 0.07,
    });
    function raf(time: number) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    return () => lenis.destroy();
  }, []);

  return (
    <ClickSpark sparkColor="#E63B2E" sparkSize={10} sparkRadius={20} sparkCount={8} duration={400} className="min-h-screen selection:bg-signal-red selection:text-white">
      <NoiseOverlay />
      <Navbar onOpenConsultation={() => setModalOpen(true)} />
      <main>
        <Hero onOpenConsultation={() => setModalOpen(true)} />
        <Features />
        <Philosophy />
        <Protocol />
      </main>
      <Footer />
      <ConsultationModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </ClickSpark>
  );
}
