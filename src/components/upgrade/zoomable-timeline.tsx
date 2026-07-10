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
          "relative w-full overflow-hidden rounded-xl border border-border",
          "bg-card/60 backdrop-blur-sm",
          "transition-all duration-200",
          "hover:border-primary/40 hover:shadow-lg hover:shadow-primary/15"
        )}
        style={{ height: '500px' }}
      >
        {/* Zoom Controls */}
        <div className="absolute top-3 right-3 z-10 flex gap-1.5 rounded-lg bg-card/90 backdrop-blur-md border border-border p-1.5 shadow-xl">
          <button
            onClick={handleZoomIn}
            disabled={scale >= 3}
            className={cn(
              "p-2 rounded-md transition-all",
              "text-muted-foreground hover:text-primary hover:bg-primary/10",
              "disabled:opacity-30 disabled:cursor-not-allowed",
              "border border-border hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
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
              "text-muted-foreground hover:text-primary hover:bg-primary/10",
              "disabled:opacity-30 disabled:cursor-not-allowed",
              "border border-border hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
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
