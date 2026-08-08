"use client";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useState, useEffect } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("en-IN", { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-[#070707] text-white flex">


      {/* ── Main ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
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
