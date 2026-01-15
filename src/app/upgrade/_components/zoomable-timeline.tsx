'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface ZoomableTimelineProps {
  imagePath: string;
  alt?: string;
}

export function ZoomableTimeline({ imagePath, alt = 'Timeline' }: ZoomableTimelineProps) {
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  return (
    <div className="relative w-full">
      {/* Container */}
      <div
        ref={containerRef}
        className={cn(
          "relative w-full overflow-hidden rounded-xl border border-cyan-400/20",
          "bg-slate-950/50 backdrop-blur-sm",
          "transition-all duration-200",
          "hover:border-cyan-400/30 hover:shadow-lg hover:shadow-cyan-500/10"
        )}
        style={{ height: '500px' }}
      >
        {/* Zoom Controls */}
        <div className="absolute top-3 right-3 z-10 flex gap-1.5 rounded-lg bg-slate-900/95 backdrop-blur-md border border-cyan-400/20 p-1.5 shadow-xl">
          <button
            onClick={handleZoomIn}
            disabled={scale >= 3}
            className={cn(
              "p-2 rounded-md transition-all",
              "text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10",
              "disabled:opacity-30 disabled:cursor-not-allowed",
              "border border-cyan-400/20 hover:border-cyan-400/40"
            )}
            aria-label="Zoom in"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
            className={cn(
              "p-2 rounded-md transition-all",
              "text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10",
              "disabled:opacity-30 disabled:cursor-not-allowed",
              "border border-cyan-400/20 hover:border-cyan-400/40"
            )}
            aria-label="Zoom out"
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>

        {/* Image Container */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className="relative w-full h-full"
            animate={{
              scale,
            }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30,
            }}
          >
            <Image
              src={imagePath}
              alt={alt}
              fill
              className="object-contain"
              draggable={false}
              style={{ userSelect: 'none', pointerEvents: 'none' }}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
