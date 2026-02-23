'use client';

import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MonthlyData {
  month: string;
  count: number;
}

interface RoleActivitySparklineProps {
  data: MonthlyData[];
  loading: boolean;
  role: string | null;
}

const roleColors: Record<string, string> = {
  'EDITOR': 'bg-cyan-400/60',
  'REVIEWER': 'bg-violet-400/60',
  'CONTRIBUTOR': 'bg-emerald-400/60',
};

export function RoleActivitySparkline({ data, loading, role }: RoleActivitySparklineProps) {
  if (loading) {
    return (
      <div className="h-full min-h-[160px] rounded-xl border border-slate-200 dark:border-slate-700/40 bg-white dark:bg-slate-900/50 p-4">
        <div className="animate-pulse">
          <div className="h-5 w-40 bg-slate-200 dark:bg-slate-800 rounded mb-4" />
          <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded" />
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count), 1);
  const barColor = role ? roleColors[role] || 'bg-cyan-400/60' : 'bg-cyan-400/60';

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full min-h-[160px] flex flex-col rounded-xl border border-slate-200 dark:border-slate-700/40 bg-white dark:bg-slate-900/50 p-4 shadow-sm dark:shadow-none"
    >
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <TrendingUp className="h-4 w-4 text-slate-500 dark:text-slate-400" />
        <h3 className="dec-title text-sm font-semibold text-slate-900 dark:text-white">
          Activity Trend (6mo)
        </h3>
      </div>

      {data.length > 0 ? (
        <div className="flex items-end gap-1.5 h-20 flex-1 min-h-0">
          {data.map((item, i) => (
            <div key={item.month} className="flex-1 flex flex-col items-center gap-1 min-w-0">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${(item.count / maxCount) * 100}%` }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className={cn(
                  "w-full rounded-t transition-colors min-h-[2px]",
                  barColor,
                  "hover:opacity-80"
                )}
              />
              <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate w-full text-center">
                {formatMonth(item.month)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm">
          No data available
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/40 flex items-center justify-between shrink-0">
        <span className="text-xs text-slate-500 dark:text-slate-400">Total actions</span>
        <span className="text-base font-bold text-slate-900 dark:text-white">
          {data.reduce((sum, d) => sum + d.count, 0).toLocaleString()}
        </span>
      </div>
    </motion.div>
  );
}
