"use client";

import { useEffect, useRef } from "react";

interface Station {
  x: number;
  y: number;
  name: string;
}

interface Route {
  from: number;
  to: number;
  progress: number;
  speed: number;
}

const STATIONS: Station[] = [
  { x: 0.12, y: 0.35, name: "Delhi" },
  { x: 0.28, y: 0.28, name: "Lucknow" },
  { x: 0.45, y: 0.45, name: "Patna" },
  { x: 0.62, y: 0.32, name: "Kolkata" },
  { x: 0.78, y: 0.55, name: "Chennai" },
  { x: 0.35, y: 0.65, name: "Mumbai" },
  { x: 0.55, y: 0.72, name: "Hyderabad" },
  { x: 0.2, y: 0.55, name: "Jaipur" },
  { x: 0.88, y: 0.4, name: "Guwahati" },
  { x: 0.7, y: 0.68, name: "Bengaluru" },
];

export default function RailwayCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const routesRef = useRef<Route[]>([]);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Init routes
    const routePairs: [number, number][] = [
      [0, 1], [1, 2], [2, 3], [0, 7], [7, 5],
      [5, 6], [6, 4], [3, 8], [4, 9], [6, 9],
      [1, 5], [2, 6], [3, 4],
    ];
    routesRef.current = routePairs.map(([f, t]) => ({
      from: f,
      to: t,
      progress: Math.random(),
      speed: 0.001 + Math.random() * 0.002,
    }));

    let currentW = 0;
    let currentH = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      currentW = rect.width;
      currentH = rect.height;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      ctx.clearRect(0, 0, currentW, currentH);
      const w = currentW;
      const h = currentH;
      const routes = routesRef.current;

      // Draw routes (subtle lines)
      for (const route of routes) {
        const s1 = STATIONS[route.from];
        const s2 = STATIONS[route.to];
        const x1 = s1.x * w, y1 = s1.y * h;
        const x2 = s2.x * w, y2 = s2.y * h;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = "rgba(255,255,255,0.05)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Moving train dot
        route.progress += route.speed;
        if (route.progress > 1) route.progress = 0;

        const tx = x1 + (x2 - x1) * route.progress;
        const ty = y1 + (y2 - y1) * route.progress;

        // Trail
        const grad = ctx.createRadialGradient(tx, ty, 0, tx, ty, 20);
        grad.addColorStop(0, "rgba(184,255,59,0.15)");
        grad.addColorStop(1, "rgba(184,255,59,0)");
        ctx.beginPath();
        ctx.arc(tx, ty, 20, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Dot
        ctx.beginPath();
        ctx.arc(tx, ty, 2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(184,255,59,0.6)";
        ctx.fill();
      }

      // Draw stations
      for (const station of STATIONS) {
        const sx = station.x * w;
        const sy = station.y * h;

        // Outer glow
        const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 12);
        glow.addColorStop(0, "rgba(255,255,255,0.05)");
        glow.addColorStop(1, "rgba(255,255,255,0)");
        ctx.beginPath();
        ctx.arc(sx, sy, 12, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // Station dot
        ctx.beginPath();
        ctx.arc(sx, sy, 3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.fill();
      }

      frameRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ opacity: 0.7 }}
    />
  );
}
