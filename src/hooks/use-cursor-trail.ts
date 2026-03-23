'use client';

import { useEffect, useRef } from 'react';

interface TrailPoint {
  x: number;
  y: number;
  id: number;
  age: number;
}

export const useCursorTrail = (enabled: boolean = true) => {
  const trailPointsRef = useRef<TrailPoint[]>([]);
  const idRef = useRef(0);
  const lastTimeRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Create canvas for trail rendering
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '60';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);

    canvasRef.current = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let accentRgb = '16 185 129';

    const readAccent = () => {
      const rgb = getComputedStyle(document.documentElement).getPropertyValue('--persona-accent-rgb').trim();
      if (rgb) accentRgb = rgb;
    };
    readAccent();

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastTimeRef.current < 20) return; // Only add point every 20ms
      lastTimeRef.current = now;

      const newPoint: TrailPoint = {
        x: e.clientX,
        y: e.clientY,
        id: idRef.current++,
        age: 0,
      };

      trailPointsRef.current.push(newPoint);

      // Keep only last 30 points
      if (trailPointsRef.current.length > 30) {
        trailPointsRef.current.shift();
      }
    };

    const animateTrail = () => {
      if (!ctx || !canvas) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      trailPointsRef.current = trailPointsRef.current
        .map((point) => ({ ...point, age: point.age + 1 }))
        .filter((point) => point.age < 30);

      trailPointsRef.current.forEach((point) => {
        const opacity = 1 - point.age / 30;
        const size = 7 * opacity;

        ctx.fillStyle = `rgb(${accentRgb} / ${opacity * 0.55})`;
        ctx.beginPath();
        ctx.arc(point.x, point.y, size / 2, 0, Math.PI * 2);
        ctx.fill();

        // Add glow
        ctx.strokeStyle = `rgb(${accentRgb} / ${opacity * 0.28})`;
        ctx.lineWidth = 1.75;
        ctx.beginPath();
        ctx.arc(point.x, point.y, size * 0.9, 0, Math.PI * 2);
        ctx.stroke();
      });

      rafRef.current = requestAnimationFrame(animateTrail);
    };

    const handleResize = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        readAccent();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);
    animateTrail();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (canvas && canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    };
  }, [enabled]);

  return containerRef;
};
