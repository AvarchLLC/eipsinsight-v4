'use client';

import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusFlow {
  status: string;
  count: number;
}

interface StatusFlowGraphProps {
  data: StatusFlow[];
  loading: boolean;
}

const statusColors: Record<string, { bg: string; border: string; text: string; glow: string; bar: string }> = {
  'Draft': { 
    bg: 'bg-slate-100 dark:bg-slate-500/20', 
    border: 'border-slate-400/50 dark:border-slate-400/40', 
    text: 'text-slate-700 dark:text-slate-300',
    glow: 'shadow-slate-500/20',
    bar: 'bg-slate-500/60'
  },
  'Review': { 
    bg: 'bg-blue-100 dark:bg-blue-500/20', 
    border: 'border-blue-400/50 dark:border-blue-400/40', 
    text: 'text-blue-700 dark:text-blue-300',
    glow: 'shadow-blue-500/20',
    bar: 'bg-blue-500/60'
  },
  'Last Call': { 
    bg: 'bg-amber-100 dark:bg-amber-500/20', 
    border: 'border-amber-400/50 dark:border-amber-400/40', 
    text: 'text-amber-800 dark:text-amber-300',
    glow: 'shadow-amber-500/20',
    bar: 'bg-amber-500/60'
  },
  'Final': { 
    bg: 'bg-emerald-100 dark:bg-emerald-500/20', 
    border: 'border-emerald-400/50 dark:border-emerald-400/40', 
    text: 'text-emerald-800 dark:text-emerald-300',
    glow: 'shadow-emerald-500/20',
    bar: 'bg-emerald-500/60'
  },
  'Stagnant': { 
    bg: 'bg-orange-100 dark:bg-orange-500/20', 
    border: 'border-orange-400/50 dark:border-orange-400/40', 
    text: 'text-orange-800 dark:text-orange-300',
    glow: 'shadow-orange-500/20',
    bar: 'bg-orange-500/60'
  },
  'Withdrawn': { 
    bg: 'bg-red-100 dark:bg-red-500/20', 
    border: 'border-red-400/50 dark:border-red-400/40', 
    text: 'text-red-800 dark:text-red-300',
    glow: 'shadow-red-500/20',
    bar: 'bg-red-500/60'
  },
  'Living': { 
    bg: 'bg-cyan-100 dark:bg-cyan-500/20', 
    border: 'border-cyan-400/50 dark:border-cyan-400/40', 
    text: 'text-cyan-800 dark:text-cyan-300',
    glow: 'shadow-cyan-500/20',
    bar: 'bg-cyan-500/60'
  },
};

// Main flow: Draft → Review → Last Call → Final
// Side exits: Stagnant, Withdrawn, Living (if present)
const mainFlow = ['Draft', 'Review', 'Last Call', 'Final'];
const sideStatuses = ['Stagnant', 'Withdrawn', 'Living'];

export function StatusFlowGraph({ data, loading }: StatusFlowGraphProps) {
  if (loading) {
    return (
      <div className="p-6 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/40">
        <div className="h-24 animate-pulse bg-slate-200 dark:bg-slate-800 rounded" />
      </div>
    );
  }

  const dataMap = new Map(data.map(d => [d.status, d.count]));
  const maxCount = Math.max(...data.map(d => d.count), 1);
  const sideWithCounts = sideStatuses.filter(s => (dataMap.get(s) || 0) > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-4 sm:p-6 rounded-xl",
        "bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/40",
        "backdrop-blur-sm"
      )}
    >
      <h3 className="dec-title text-base sm:text-lg font-semibold text-slate-900 dark:text-white mb-4 sm:mb-6">
        Status Pipeline
      </h3>

      {/* Main Flow */}
      <div className="flex flex-nowrap items-stretch justify-between overflow-x-auto gap-2 sm:gap-0 mb-6 sm:mb-8 pb-2 -mx-1">
        {mainFlow.map((status, index) => {
          const count = dataMap.get(status) || 0;
          const color = statusColors[status];
          const widthPercent = (count / maxCount) * 100;

          return (
            <React.Fragment key={status}>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="flex flex-col items-center"
              >
                {/* Status Box */}
                <div className={cn(
                  "relative px-3 sm:px-4 py-2 sm:py-3 rounded-lg border-2",
                  "flex flex-col items-center min-w-[80px] sm:min-w-[100px]",
                  color.bg,
                  color.border,
                  count > 0 && `shadow-lg ${color.glow}`
                )}>
                  <span className={cn("text-sm font-semibold", color.text)}>
                    {status}
                  </span>
                  <span className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white mt-0.5 sm:mt-1">
                    {count.toLocaleString()}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 mt-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${widthPercent}%` }}
                    transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
                    className={cn("h-full rounded-full", color.bar)}
                  />
                </div>
              </motion.div>

              {/* Arrow between statuses */}
              {index < mainFlow.length - 1 && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 + 0.2 }}
                  className="flex items-center px-2"
                >
                  <div className="w-8 h-0.5 bg-gradient-to-r from-slate-400 to-slate-500 dark:from-slate-600 dark:to-slate-700" />
                  <ArrowRight className="h-5 w-5 text-slate-500" />
                </motion.div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Side Statuses */}
      {sideWithCounts.length > 0 && (
        <div className="flex items-center justify-center gap-6 pt-4 border-t border-slate-200 dark:border-slate-700/40">
          <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Other statuses:
          </span>
          {sideWithCounts.map((status, index) => {
            const count = dataMap.get(status) || 0;
            const color = statusColors[status] ?? statusColors['Stagnant'];

            return (
              <motion.div
                key={status}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg border",
                  color.bg,
                  color.border
                )}
              >
                <span className={cn("text-sm font-medium", color.text)}>
                  {status}
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {count.toLocaleString()}
                </span>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
