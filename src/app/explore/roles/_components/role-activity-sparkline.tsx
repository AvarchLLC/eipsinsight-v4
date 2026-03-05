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
  timeRange?: string;
}

const roleColors: Record<string, string> = {
  'EDITOR': 'bg-primary/80',
  'REVIEWER': 'bg-primary/80',
  'CONTRIBUTOR': 'bg-primary/80',
};

export function RoleActivitySparkline({ data, loading, role, timeRange }: RoleActivitySparklineProps) {
  if (loading) {
    return (
      <div className="h-full min-h-[160px] rounded-xl border border-border bg-card/60 p-4">
        <div className="animate-pulse">
          <div className="mb-4 h-5 w-40 rounded bg-muted" />
          <div className="h-20 rounded bg-muted" />
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count), 1);
  const barColor = role ? roleColors[role] || 'bg-primary/80' : 'bg-primary/80';

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex h-full min-h-[160px] flex-col rounded-xl border border-border bg-card/60 p-4"
    >
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Activity</p>
          <h3 className="dec-title text-sm font-semibold text-foreground">Monthly activity pattern</h3>
        </div>
      </div>
      <p className="mb-2 text-xs text-muted-foreground">
        Actions by selected role{timeRange ? ` (${timeRange})` : ''}. Bars include zero-activity months for continuity.
      </p>

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
              <span className="w-full truncate text-center text-[10px] text-muted-foreground">
                {formatMonth(item.month)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          No data available
        </div>
      )}

      <div className="mt-3 flex shrink-0 items-center justify-between border-t border-border pt-3">
        <span className="text-xs text-muted-foreground">Total actions</span>
        <span className="text-base font-bold text-foreground">
          {data.reduce((sum, d) => sum + d.count, 0).toLocaleString()}
        </span>
      </div>
    </motion.div>
  );
}
