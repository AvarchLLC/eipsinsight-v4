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
      <div className="bg-slate-900/50 rounded-xl border border-slate-700/40 p-6">
        <div className="animate-pulse">
          <div className="h-6 w-48 bg-slate-800 rounded mb-4" />
          <div className="h-20 bg-slate-800 rounded" />
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count), 1);
  const barColor = role ? roleColors[role] || 'bg-cyan-400/60' : 'bg-cyan-400/60';

  // Format month labels
  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/50 rounded-xl border border-slate-700/40 p-6"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-slate-400" />
        <h3 className="text-lg font-semibold text-white">
          Activity Trend (Last 6 Months)
        </h3>
      </div>

      {/* Sparkline */}
      {data.length > 0 ? (
        <div className="flex items-end gap-2 h-24">
          {data.map((item, i) => (
            <div key={item.month} className="flex-1 flex flex-col items-center gap-1">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${(item.count / maxCount) * 100}%` }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className={cn(
                  "w-full rounded-t transition-colors",
                  barColor,
                  "hover:opacity-80"
                )}
                style={{ minHeight: item.count > 0 ? '4px' : '2px' }}
              />
              <span className="text-[10px] text-slate-500">
                {formatMonth(item.month)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="h-24 flex items-center justify-center text-slate-500">
          No data available
        </div>
      )}

      {/* Total */}
      <div className="mt-4 pt-4 border-t border-slate-700/40 flex items-center justify-between">
        <span className="text-sm text-slate-400">Total actions</span>
        <span className="text-lg font-bold text-white">
          {data.reduce((sum, d) => sum + d.count, 0).toLocaleString()}
        </span>
      </div>
    </motion.div>
  );
}
