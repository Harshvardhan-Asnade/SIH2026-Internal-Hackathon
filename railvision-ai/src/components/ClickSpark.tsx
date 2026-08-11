"use client";
import React, { useRef, useEffect, useCallback, MouseEvent } from 'react';

interface Spark {
  x: number;
  y: number;
  angle: number;
  startTime: number;
}

interface ClickSparkProps {
  sparkColor?: string;
  sparkSize?: number;
  sparkRadius?: number;
  sparkCount?: number;
  duration?: number;
  children?: React.ReactNode;
  className?: string;
  extraCanvasStyle?: React.CSSProperties;
}

const ClickSpark: React.FC<ClickSparkProps> = ({
  sparkColor = '#E63B2E',
  sparkSize = 10,
  sparkRadius = 25,
  sparkCount = 8,
  duration = 400,
  children,
  className = '',
  extraCanvasStyle = {},
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparksRef = useRef<Spark[]>([]);
  const animIdRef = useRef<number | null>(null);

  // Resize canvas to cover container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const drawRef = useRef<() => void>(() => {});

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const now = performance.now();
    sparksRef.current = sparksRef.current.filter((spark) => {
      const elapsed = now - spark.startTime;
      if (elapsed >= duration) return false;

      const progress = elapsed / duration;
      const easeOut = 1 - Math.pow(1 - progress, 3); // cubic ease out
      const currentRadius = easeOut * sparkRadius;
      const opacity = 1 - progress;

      ctx.save();
      ctx.strokeStyle = sparkColor;
      ctx.lineWidth = Math.max(1, (1 - progress) * (sparkSize / 2));
      ctx.globalAlpha = opacity;

      // Draw radial spark line
      const x1 = spark.x + Math.cos(spark.angle) * (currentRadius * 0.3);
      const y1 = spark.y + Math.sin(spark.angle) * (currentRadius * 0.3);
      const x2 = spark.x + Math.cos(spark.angle) * currentRadius;
      const y2 = spark.y + Math.sin(spark.angle) * currentRadius;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Draw tiny dot head
      ctx.fillStyle = sparkColor;
      ctx.beginPath();
      ctx.arc(x2, y2, Math.max(1, (1 - progress) * (sparkSize / 3)), 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      return true;
    });

    if (sparksRef.current.length > 0) {
      animIdRef.current = requestAnimationFrame(() => drawRef.current());
    } else {
      animIdRef.current = null;
    }
  }, [sparkColor, sparkSize, sparkRadius, duration]);

  useEffect(() => {
    drawRef.current = draw;
  }, [draw]);

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const now = performance.now();
    const newSparks = [];

    for (let i = 0; i < sparkCount; i++) {
      const angle = (2 * Math.PI * i) / sparkCount + (Math.random() * 0.2 - 0.1);
      newSparks.push({
        x,
        y,
        angle,
        startTime: now,
      });
    }

    sparksRef.current.push(...newSparks);

    if (!animIdRef.current) {
      animIdRef.current = requestAnimationFrame(() => drawRef.current());
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`relative w-full ${className}`}
      style={{ position: 'relative' }}
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-50 w-full h-full"
        style={extraCanvasStyle}
      />
      {children}
    </div>
  );
};

export default ClickSpark;
