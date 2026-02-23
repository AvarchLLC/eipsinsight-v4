'use client';

import React from 'react';
import { motion } from 'motion/react';
import { FileText, GitPullRequest, TrendingUp, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

interface YearStats {
  totalNewEIPs: number;
  mostCommonStatus: string | null;
  mostActiveCategory: string | null;
  totalPRs: number;
}

interface YearOverviewPanelProps {
  year: number;
  stats: YearStats | null;
  loading: boolean;
}

const statCards = [
  {
    key: 'totalNewEIPs',
    label: 'New EIPs',
    icon: FileText,
    color: {
      bg: 'bg-cyan-500/15 dark:bg-cyan-500/10',
      border: 'border-cyan-400/40 dark:border-cyan-400/20',
      icon: 'text-cyan-600 dark:text-cyan-400',
      value: 'text-cyan-700 dark:text-cyan-300',
    },
  },
  {
    key: 'mostCommonStatus',
    label: 'Most Common Status',
    icon: TrendingUp,
    color: {
      bg: 'bg-emerald-500/15 dark:bg-emerald-500/10',
      border: 'border-emerald-400/40 dark:border-emerald-400/20',
      icon: 'text-emerald-600 dark:text-emerald-400',
      value: 'text-emerald-700 dark:text-emerald-300',
    },
  },
  {
    key: 'mostActiveCategory',
    label: 'Most Active Category',
    icon: Layers,
    color: {
      bg: 'bg-violet-500/15 dark:bg-violet-500/10',
      border: 'border-violet-400/40 dark:border-violet-400/20',
      icon: 'text-violet-600 dark:text-violet-400',
      value: 'text-violet-700 dark:text-violet-300',
    },
  },
  {
    key: 'totalPRs',
    label: 'Total PRs',
    icon: GitPullRequest,
    color: {
      bg: 'bg-amber-500/15 dark:bg-amber-500/10',
      border: 'border-amber-400/40 dark:border-amber-400/20',
      icon: 'text-amber-600 dark:text-amber-400',
      value: 'text-amber-700 dark:text-amber-300',
    },
  },
];

export function YearOverviewPanel({ year, stats, loading }: YearOverviewPanelProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((card, index) => {
        const Icon = card.icon;
        const value = stats ? stats[card.key as keyof YearStats] : null;
        const displayValue = typeof value === 'number' ? value.toLocaleString() : value || 'N/A';

        return (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className={cn(
              "relative p-4 rounded-xl border",
              "bg-white dark:bg-slate-900/50 backdrop-blur-sm",
              "shadow-sm dark:shadow-none ring-1 ring-slate-200/50 dark:ring-transparent",
              card.color.border
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg",
                card.color.bg
              )}>
                <Icon className={cn("h-4 w-4", card.color.icon)} />
              </div>
              <span className="text-xs text-slate-600 dark:text-slate-400">{card.label}</span>
            </div>
            <p className={cn(
              "dec-title text-2xl font-bold tracking-tight",
              card.color.value
            )}>
              {displayValue}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}
