"use client";

import React from 'react';
import { cn } from "@/lib/utils";

export function ThemedLogoGif({
  width = 32,
  height = 32,
  className,
}: {
  width?: number | string;
  height?: number | string;
  className?: string;
  [key: string]: any;
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-primary shrink-0 select-none", className)}
    >
      <defs>
        <linearGradient id="eth-top-gradient" x1="60" y1="12" x2="60" y2="108" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--primary, #06b6d4)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--persona-accent, #10b981)" stopOpacity="0.8" />
        </linearGradient>
        <linearGradient id="eth-glow" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
          <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.4" />
        </linearGradient>
      </defs>

      {/* Pulsing ambient outer ring */}
      <circle
        cx="60"
        cy="60"
        r="54"
        className="stroke-primary/20 dark:stroke-primary/10"
        strokeWidth="1"
        strokeDasharray="4 4"
      />
      <circle
        cx="60"
        cy="60"
        r="48"
        className="stroke-primary/10 dark:stroke-primary/5"
        strokeWidth="1.5"
      />

      {/* Glowing backdrop shadow */}
      <circle cx="60" cy="60" r="28" fill="url(#eth-glow)" className="blur-md" />

      {/* Ethereum Diamond facets */}
      <g className="transition-transform duration-300 origin-center">
        {/* Top Front Right */}
        <path
          d="M 60 18 L 84 56 L 60 67 Z"
          fill="url(#eth-top-gradient)"
          fillOpacity="0.9"
        />
        {/* Top Front Left */}
        <path
          d="M 60 18 L 60 67 L 36 56 Z"
          fill="url(#eth-top-gradient)"
          fillOpacity="0.75"
        />
        {/* Bottom Front Right */}
        <path
          d="M 60 102 L 84 67 L 60 67 Z"
          fill="url(#eth-top-gradient)"
          fillOpacity="0.85"
        />
        {/* Bottom Front Left */}
        <path
          d="M 60 102 L 60 67 L 36 67 Z"
          fill="url(#eth-top-gradient)"
          fillOpacity="0.7"
        />
        {/* Center line */}
        <path
          d="M 60 18 L 60 102"
          stroke="white"
          strokeWidth="1"
          strokeOpacity="0.3"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
