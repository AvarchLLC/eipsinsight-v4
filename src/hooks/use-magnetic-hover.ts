'use client';

import { useEffect, useRef } from 'react';

interface MagneticPosition {
  x: number;
  y: number;
}

export const useMagneticHover = (strength: number = 30) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const currentPositionRef = useRef<MagneticPosition>({ x: 0, y: 0 });
  const targetPositionRef = useRef<MagneticPosition>({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);
  const activeRef = useRef(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const runAnimation = () => {
      const current = currentPositionRef.current;
      const target = targetPositionRef.current;

      const dx = target.x - current.x;
      const dy = target.y - current.y;

      current.x += dx * 0.14;
      current.y += dy * 0.14;

      element.style.transform = `translate3d(${current.x}px, ${current.y}px, 0)`;

      const settled = Math.abs(dx) < 0.08 && Math.abs(dy) < 0.08;
      if (!activeRef.current && settled) {
        animationFrameRef.current = null;
        return;
      }

      animationFrameRef.current = requestAnimationFrame(runAnimation);
    };

    const ensureAnimation = () => {
      if (!animationFrameRef.current) {
        animationFrameRef.current = requestAnimationFrame(runAnimation);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const distance = Math.hypot(e.clientX - centerX, e.clientY - centerY);
      const maxDistance = 150;

      if (distance < maxDistance) {
        activeRef.current = true;
        const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        const force = (1 - distance / maxDistance) * strength;

        targetPositionRef.current = {
          x: Math.cos(angle) * force,
          y: Math.sin(angle) * force,
        };
        ensureAnimation();
      } else {
        activeRef.current = false;
        targetPositionRef.current = { x: 0, y: 0 };
        ensureAnimation();
      }
    };

    const handleMouseLeave = () => {
      activeRef.current = false;
      targetPositionRef.current = { x: 0, y: 0 };
      ensureAnimation();
    };

    window.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [strength]);

  return elementRef;
};
