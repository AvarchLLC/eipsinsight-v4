"use client";

import React from "react";

interface AnalyticsAnnotationProps {
  children: React.ReactNode;
}

/**
 * AnalyticsAnnotation Component
 * 
 * Displays a clean, explanatory note beneath analytics charts and visualizations.
 * Provides context and insights to help users understand the data being presented.
 * 
 * @example
 * ```tsx
 * <AnalyticsAnnotation>
 *   Draft proposals increased following the Dencun upgrade cycle.
 * </AnalyticsAnnotation>
 * ```
 */
export function AnalyticsAnnotation({ children }: AnalyticsAnnotationProps) {
  return (
    <div className="mt-4 rounded-lg border-l-4 border-cyan-500/40 bg-muted/30 px-4 py-3 backdrop-blur-sm">
      <div className="flex gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Note
        </span>
      </div>
      <div className="mt-1 text-sm leading-relaxed text-muted-foreground/90">
        {children}
      </div>
    </div>
  );
}
