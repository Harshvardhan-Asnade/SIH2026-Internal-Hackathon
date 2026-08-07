"use client";

import { ErrorBoundary } from "@/components/ErrorBoundary";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutGrid, ArrowLeft,
} from "lucide-react";
import { useState, useEffect } from "react";

const navItems = [
  { href: "/dashboard", icon: LayoutGrid, label: "Workspace" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("en-IN", { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-[#070707] text-white flex">
      {/* ── Left Rail ─────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col items-center w-[60px] border-r border-[rgba(255,255,255,0.04)] bg-[#0a0a0a] py-4 flex-shrink-0 fixed top-0 bottom-0 left-0 z-40">
        {/* Logo */}
        <Link href="/" className="mb-6 group" title="Home">
          <div className="w-8 h-8 rounded-xl bg-[#B8FF3B] flex items-center justify-center group-hover:bg-[#c8ff5b] transition-colors">
            <span className="font-display font-bold text-[10px] text-[#070707]">RV</span>
          </div>
        </Link>

        {/* Nav icons */}
        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`dash-nav-item ${active ? "active" : ""}`}
                title={item.label}
              >
                <Icon className="w-[18px] h-[18px]" />
              </Link>
            );
          })}
        </nav>

        {/* Back */}
        <Link href="/" className="dash-nav-item mt-auto" title="Back to site">
          <ArrowLeft className="w-[18px] h-[18px]" />
        </Link>
      </aside>

      {/* ── Main ──────────────────────────────────────────── */}
      <div className="flex-1 md:ml-[60px] flex flex-col min-h-screen overflow-hidden">
        {/* Content */}
        <main className="flex-1 overflow-auto">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
