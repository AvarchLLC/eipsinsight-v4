'use client';

import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface PRLifecycleFunnelProps {
  data: Array<{
    stage: string;
    count: number;
    percentage: number;
  }>;
}

const STAGE_COLORS: Record<string, string> = {
  created: 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300',
  reviewed: 'bg-blue-500/20 border-blue-400/40 text-blue-300',
  merged: 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300',
  closed: 'bg-rose-500/20 border-rose-400/40 text-rose-300',
};

export function PRLifecycleFunnel({ data }: PRLifecycleFunnelProps) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-cyan-400/20 bg-slate-950/50 p-6 text-center text-slate-400">
        No data available
      </div>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-lg border border-cyan-400/20 bg-slate-950/50 backdrop-blur-sm p-4 sm:p-5"
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-white mb-1">PR Lifecycle Funnel</h3>
        <p className="text-xs text-slate-400">Flow from creation to outcome</p>
      </div>

      <div className="space-y-3">
        {data.map((item, index) => {
          const width = (item.count / maxCount) * 100;
          const stageColor = STAGE_COLORS[item.stage] || 'bg-slate-500/20 border-slate-400/40 text-slate-300';

          return (
            <div key={item.stage} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 capitalize">{item.stage}</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">{item.count.toLocaleString()}</span>
                  <span className="text-cyan-400 font-medium">{item.percentage.toFixed(1)}%</span>
                </div>
              </div>
              <div className="relative h-8 rounded-lg bg-slate-900/50 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${width}%` }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className={cn(
                    'h-full rounded-lg border backdrop-blur-sm flex items-center justify-end pr-2',
                    stageColor
                  )}
                >
                  {width > 15 && (
                    <span className="text-xs font-semibold">{item.count.toLocaleString()}</span>
                  )}
                </motion.div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
