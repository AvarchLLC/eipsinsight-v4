'use client';

import React from 'react';
import { motion } from 'motion/react';
import { FileText, GitPullRequest, Shuffle, TrendingUp, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

interface YearStats {
  totalNewEIPs: number;
  mostCommonStatus: string | null;
  mostActiveCategory: string | null;
  totalPRs: number;
}

interface YearOverviewPanelProps {
  isCurrentYear?: boolean;
  stats: YearStats | null;
  selectedYearData?: {
    newEIPs: number;
    statusChanges: number;
    activePRs: number;
  } | null;
  previousYearData?: {
    newEIPs: number;
    statusChanges: number;
    activePRs: number;
  } | null;
  loading: boolean;
}

const statCards = [
  {
    key: 'newEIPs',
    label: 'New EIPs',
    icon: FileText,
    tone: 'text-primary',
  },
  {
    key: 'statusChanges',
    label: 'Status Changes',
    icon: Shuffle,
    tone: 'text-primary',
  },
  {
    key: 'activePRs',
    label: 'PR Activity',
    icon: GitPullRequest,
    tone: 'text-primary',
  },
  {
    key: 'mostCommonStatus',
    label: 'Most Common Status',
    icon: TrendingUp,
    tone: 'text-foreground',
  },
  {
    key: 'mostActiveCategory',
    label: 'Most Active Category',
    icon: Layers,
    tone: 'text-foreground',
  },
];

function getDelta(current: number, previous?: number): { value: number; percentage: number } | null {
  if (previous == null || previous <= 0) return null;
  const value = current - previous;
  return {
    value,
    percentage: (value / previous) * 100,
  };
}

function formatDelta(delta: ReturnType<typeof getDelta>): string {
  if (!delta) return 'No baseline';
  const arrow = delta.value >= 0 ? '↑' : '↓';
  return `${arrow} ${Math.abs(delta.percentage).toFixed(1)}% vs previous year`;
}

export function YearOverviewPanel({
  isCurrentYear = false,
  stats,
  selectedYearData,
  previousYearData,
  loading,
}: YearOverviewPanelProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const valueByKey = {
    newEIPs: selectedYearData?.newEIPs ?? stats?.totalNewEIPs ?? 0,
    statusChanges: selectedYearData?.statusChanges ?? 0,
    activePRs: selectedYearData?.activePRs ?? stats?.totalPRs ?? 0,
    mostCommonStatus: stats?.mostCommonStatus ?? 'N/A',
    mostActiveCategory: stats?.mostActiveCategory ?? 'N/A',
  } as const;

  const deltaByKey = {
    newEIPs: getDelta(valueByKey.newEIPs, previousYearData?.newEIPs),
    statusChanges: getDelta(valueByKey.statusChanges, previousYearData?.statusChanges),
    activePRs: getDelta(valueByKey.activePRs, previousYearData?.activePRs),
  } as const;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
      {statCards.map((card, index) => {
        const Icon = card.icon;
        const value = valueByKey[card.key as keyof typeof valueByKey];
        const displayValue = typeof value === 'number' ? value.toLocaleString() : value || 'N/A';
        const delta =
          card.key === 'newEIPs' || card.key === 'statusChanges' || card.key === 'activePRs'
            ? deltaByKey[card.key as keyof typeof deltaByKey]
            : null;

        return (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className={cn(
              "relative p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm",
              "ring-1 ring-border/50"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/10"
              )}>
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{card.label}</span>
            </div>
            <p className={cn(
              "dec-title text-2xl font-semibold tracking-tight",
              card.tone
            )}>
              {displayValue}
            </p>
            {delta && (
              <p className={cn(
                "mt-1 text-xs",
                delta.value >= 0 ? "text-emerald-400" : "text-amber-400"
              )}>
                {isCurrentYear
                  ? `${delta.value >= 0 ? '↑' : '↓'} ${Math.abs(delta.percentage).toFixed(1)}% vs last full year (directional)`
                  : formatDelta(delta)}
              </p>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
