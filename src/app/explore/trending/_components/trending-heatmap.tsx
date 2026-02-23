'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DailyActivity {
  date: string;
  value: number;
}

interface HeatmapRow {
  eipNumber: number;
  title: string;
  totalActivity: number;
  dailyActivity: DailyActivity[];
}

interface TrendingHeatmapProps {
  data: HeatmapRow[];
  loading: boolean;
}

function getIntensityColor(value: number, maxValue: number): string {
  if (value === 0) return 'bg-slate-200 dark:bg-slate-800';
  const ratio = value / maxValue;
  if (ratio >= 0.8) return 'bg-cyan-500 dark:bg-cyan-400';
  if (ratio >= 0.6) return 'bg-cyan-500/80';
  if (ratio >= 0.4) return 'bg-cyan-600/60';
  if (ratio >= 0.2) return 'bg-cyan-700/40';
  return 'bg-cyan-800/30';
}

export function TrendingHeatmap({ data, loading }: TrendingHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{ eip: number; date: string; value: number } | null>(null);

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700/40 p-6">
        <div className="animate-pulse">
          <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded mb-4" />
          <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded" />
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700/40 p-12 text-center">
        <p className="text-slate-600 dark:text-slate-400">No heatmap data available</p>
      </div>
    );
  }

  // Find max value for color scaling
  const maxValue = Math.max(
    ...data.flatMap(row => row.dailyActivity.map(d => d.value)),
    1
  );

  // Get day labels (last 30 days)
  const dayLabels = data[0]?.dailyActivity.map(d => {
    const date = new Date(d.date);
    return date.getDate();
  }) || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-6 rounded-xl",
        "bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/40",
        "backdrop-blur-sm"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Activity Heatmap (Last 30 Days)
        </h3>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-slate-500">Less</span>
        <div className="flex gap-1">
          <div className="h-3 w-3 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-3 w-3 rounded bg-cyan-800/30" />
          <div className="h-3 w-3 rounded bg-cyan-700/40" />
          <div className="h-3 w-3 rounded bg-cyan-600/60" />
          <div className="h-3 w-3 rounded bg-cyan-500/80" />
          <div className="h-3 w-3 rounded bg-cyan-500 dark:bg-cyan-400" />
        </div>
        <span className="text-xs text-slate-500">More</span>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Day labels */}
          <div className="flex items-center mb-2 pl-32">
            {dayLabels.map((day, i) => (
              i % 5 === 0 && (
                <span
                  key={i}
                  className="text-[10px] text-slate-500"
                  style={{ width: '16px', textAlign: 'center' }}
                >
                  {day}
                </span>
              )
            ))}
          </div>

          {/* Rows */}
          <div className="space-y-1">
            {data.map((row, rowIndex) => (
              <div key={row.eipNumber} className="flex items-center gap-2">
                {/* EIP Label */}
                <div className="w-28 shrink-0 text-right pr-2">
                  <span className="text-xs font-medium text-cyan-600 dark:text-cyan-400">
                    EIP-{row.eipNumber}
                  </span>
                </div>

                {/* Cells */}
                <div className="flex gap-0.5">
                  {row.dailyActivity.map((day, dayIndex) => (
                    <motion.div
                      key={day.date}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: rowIndex * 0.02 + dayIndex * 0.005 }}
                      onMouseEnter={() => setHoveredCell({ eip: row.eipNumber, date: day.date, value: day.value })}
                      onMouseLeave={() => setHoveredCell(null)}
                      className={cn(
                        "h-4 w-4 rounded-sm cursor-pointer",
                        "transition-all duration-150",
                        getIntensityColor(day.value, maxValue),
                        hoveredCell?.eip === row.eipNumber && hoveredCell?.date === day.date
                          ? "ring-1 ring-slate-900 dark:ring-white scale-110"
                          : ""
                      )}
                    />
                  ))}
                </div>

                {/* Total */}
                <div className="w-12 shrink-0 text-right">
                  <span className="text-xs text-slate-600 dark:text-slate-500">
                    {row.totalActivity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredCell && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "fixed z-50 px-3 py-2 rounded-lg",
            "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700",
            "text-xs shadow-xl pointer-events-none"
          )}
          style={{
            top: 'var(--mouse-y, 0)',
            left: 'var(--mouse-x, 0)',
          }}
        >
          <div className="font-medium text-slate-900 dark:text-white">
            EIP-{hoveredCell.eip}
          </div>
          <div className="text-slate-600 dark:text-slate-400">
            {new Date(hoveredCell.date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </div>
          <div className="text-cyan-600 dark:text-cyan-400 font-bold">
            {hoveredCell.value} event{hoveredCell.value !== 1 ? 's' : ''}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
