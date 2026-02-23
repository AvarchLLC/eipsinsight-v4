'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Calendar } from 'lucide-react';
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
  return (
    <div className="relative w-full py-6">
      {/* Timeline line */}
      <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent" />

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
                  ? "bg-cyan-50 dark:bg-cyan-500/20 border-cyan-400 shadow-lg shadow-cyan-200/50 dark:shadow-cyan-500/30"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 group-hover:border-cyan-300/60 dark:group-hover:border-slate-500 shadow-sm dark:shadow-none"
              )}>
                {isSelected && (
                  <motion.div
                    layoutId="year-indicator"
                    className="absolute inset-0 rounded-full bg-cyan-400/20"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <span className={cn(
                  "dec-title text-sm font-bold relative z-10",
                  isSelected ? "text-cyan-600 dark:text-cyan-300" : "text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white"
                )}>
                  {String(yearData.year).slice(2)}
                </span>
              </div>

              {/* Year label */}
              <span className={cn(
                "mt-2 text-xs font-medium transition-colors",
                isSelected ? "text-cyan-600 dark:text-cyan-400" : "text-slate-500 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300"
              )}>
                {yearData.year}
              </span>

              {/* Stats tooltip on hover */}
              <div className={cn(
                "absolute -top-16 left-1/2 -translate-x-1/2",
                "px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg",
                "text-xs whitespace-nowrap",
                "opacity-0 group-hover:opacity-100 transition-opacity",
                "pointer-events-none z-20"
              )}>
                <div className="font-semibold text-slate-900 dark:text-white mb-1">{yearData.year}</div>
                <div className="text-slate-600 dark:text-slate-300">{yearData.newEIPs} EIPs</div>
                <div className="text-slate-500 dark:text-slate-400">{yearData.statusChanges} changes</div>
                <div className="absolute left-1/2 -translate-x-1/2 top-full -mt-1 border-4 border-transparent border-t-white dark:border-t-slate-800" />
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
