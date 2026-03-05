'use client';

import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface YearData {
  year: number;
  newEIPs: number;
  statusChanges: number;
  activePRs: number;
}

interface YearTimelineProps {
  years: YearData[];
  selectedYear: number;
  onYearSelect: (year: number) => void;
}

export function YearTimeline({ years, selectedYear, onYearSelect }: YearTimelineProps) {
  const getYoY = (year: number, value: number) => {
    const previous = years.find((y) => y.year === year - 1);
    if (!previous || previous.newEIPs <= 0) return null;
    const delta = value - previous.newEIPs;
    const pct = (delta / previous.newEIPs) * 100;
    return `${delta >= 0 ? '↑' : '↓'} ${Math.abs(pct).toFixed(1)}% YoY`;
  };

  return (
    <div className="relative w-full py-6">
      {/* Timeline line */}
      <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* Year markers */}
      <div className="relative flex justify-between items-center px-4">
        {years.map((yearData, index) => {
          const isSelected = yearData.year === selectedYear;
          
          return (
            <motion.button
              key={yearData.year}
              onClick={() => onYearSelect(yearData.year)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.03 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="relative flex flex-col items-center group"
            >
              {/* Marker */}
              <div className={cn(
                "relative flex h-12 w-12 items-center justify-center rounded-full",
                "border-2 transition-all duration-300",
                isSelected
                  ? "bg-primary/10 border-primary/50 persona-glow"
                  : "bg-card border-border group-hover:border-primary/40"
              )}>
                {isSelected && (
                  <motion.div
                    layoutId="year-indicator"
                    className="absolute inset-0 rounded-full bg-primary/15"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <span className={cn(
                  "dec-title text-sm font-bold relative z-10",
                  isSelected ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}>
                  {String(yearData.year).slice(2)}
                </span>
              </div>

              {/* Year label */}
              <span className={cn(
                "mt-2 text-xs font-medium transition-colors",
                isSelected ? "text-primary" : "text-muted-foreground group-hover:text-foreground/80"
              )}>
                {yearData.year}
              </span>

              {/* Stats tooltip on hover */}
              <div className={cn(
                "absolute -top-16 left-1/2 -translate-x-1/2",
                "px-3 py-2 rounded-lg bg-card border border-border",
                "text-xs whitespace-nowrap",
                "opacity-0 group-hover:opacity-100 transition-opacity",
                "pointer-events-none z-20"
              )}>
                <div className="font-semibold text-foreground mb-1">{yearData.year}</div>
                <div className="text-muted-foreground">{yearData.newEIPs} new EIPs</div>
                <div className="text-muted-foreground">{yearData.statusChanges} status changes</div>
                {getYoY(yearData.year, yearData.newEIPs) && (
                  <div className="text-primary mt-1">{getYoY(yearData.year, yearData.newEIPs)}</div>
                )}
                <div className="absolute left-1/2 -translate-x-1/2 top-full -mt-1 border-4 border-transparent border-t-card" />
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
