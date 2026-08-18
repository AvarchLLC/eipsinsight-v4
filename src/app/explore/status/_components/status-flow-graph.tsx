'use client';

import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, FileEdit, Search, Clock, Pause, XCircle, Sparkles, Layers, BarChart3, FilterX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InlineBrandLoader } from '@/components/inline-brand-loader';

interface StatusFlow {
  status: string;
  count: number;
}

interface CategoryCount {
  category: string;
  count: number;
}

interface StatusFlowGraphProps {
  data: StatusFlow[];
  categoriesData?: CategoryCount[];
  loading: boolean;
  selectedStatus?: string | null;
  selectedCategories?: string[];
  onSelectStatus?: (status: string | null) => void;
  onSelectCategory?: (category: string) => void;
}

const statusConfig: Record<string, { bg: string; border: string; text: string; bar: string; icon: React.ComponentType<{ className?: string }> }> = {
  'Draft': { 
    bg: 'bg-slate-500/10 hover:bg-slate-500/15', 
    border: 'border-slate-400/30', 
    text: 'text-slate-700 dark:text-slate-300',
    bar: 'bg-slate-500',
    icon: FileEdit
  },
  'Review': { 
    bg: 'bg-blue-500/10 hover:bg-blue-500/15', 
    border: 'border-blue-400/30', 
    text: 'text-blue-700 dark:text-blue-300',
    bar: 'bg-blue-500',
    icon: Search
  },
  'Last Call': { 
    bg: 'bg-amber-500/10 hover:bg-amber-500/15', 
    border: 'border-amber-400/30', 
    text: 'text-amber-700 dark:text-amber-300',
    bar: 'bg-amber-500',
    icon: Clock
  },
  'Final': { 
    bg: 'bg-emerald-500/10 hover:bg-emerald-500/15', 
    border: 'border-emerald-400/30', 
    text: 'text-emerald-700 dark:text-emerald-300',
    bar: 'bg-emerald-500',
    icon: CheckCircle2
  },
  'Stagnant': { 
    bg: 'bg-orange-500/10 hover:bg-orange-500/15', 
    border: 'border-orange-400/30', 
    text: 'text-orange-700 dark:text-orange-300',
    bar: 'bg-orange-500',
    icon: Pause
  },
  'Withdrawn': { 
    bg: 'bg-red-500/10 hover:bg-red-500/15', 
    border: 'border-red-400/30', 
    text: 'text-red-700 dark:text-red-300',
    bar: 'bg-red-500',
    icon: XCircle
  },
  'Living': { 
    bg: 'bg-cyan-500/10 hover:bg-cyan-500/15', 
    border: 'border-cyan-400/30', 
    text: 'text-cyan-700 dark:text-cyan-300',
    bar: 'bg-cyan-500',
    icon: Sparkles
  },
};

const categoryBadgeColors: Record<string, string> = {
  'Core': 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/25',
  'Networking': 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/25',
  'Interface': 'bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/25',
  'ERC': 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
  'Meta': 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25',
  'Informational': 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25',
};

const mainFlow = ['Draft', 'Review', 'Last Call', 'Final'];
const sideStatuses = ['Stagnant', 'Withdrawn', 'Living'];

export function StatusFlowGraph({
  data,
  categoriesData = [],
  loading,
  selectedStatus,
  selectedCategories = [],
  onSelectStatus,
  onSelectCategory,
}: StatusFlowGraphProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-border/80 bg-card/60 p-6 backdrop-blur-sm">
        <div className="flex h-32 items-center justify-center">
          <InlineBrandLoader label="Loading pipeline..." size="sm" />
        </div>
      </div>
    );
  }

  const dataMap = new Map(data.map(d => [d.status, d.count]));
  const totalCount = data.reduce((acc, item) => acc + item.count, 0);
  const maxCount = Math.max(...data.map(d => d.count), 1);
  const sideWithCounts = sideStatuses.filter(s => (dataMap.get(s) || 0) > 0);
  const totalCategoriesCount = categoriesData.reduce((acc, cat) => acc + cat.count, 0);

  const hasSelection = selectedStatus || selectedCategories.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Pipeline Stages Card */}
      <div className="rounded-2xl border border-border/70 bg-card/60 p-5 shadow-xs backdrop-blur-md">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
              <Layers className="h-4 w-4" />
            </div>
            <h3 className="dec-title text-base font-semibold tracking-tight text-foreground">
              Status Pipeline
            </h3>
          </div>

          {hasSelection && (
            <button
              type="button"
              onClick={() => onSelectStatus?.(null)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-muted/30 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all cursor-pointer"
            >
              <FilterX className="h-3.5 w-3.5" />
              Clear selection
            </button>
          )}
        </div>

        {/* Main Flow Stages */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {mainFlow.map((status, index) => {
            const count = dataMap.get(status) || 0;
            const config = statusConfig[status] || statusConfig['Draft'];
            const Icon = config.icon;
            const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
            const widthPercent = (count / maxCount) * 100;
            const isSelected = selectedStatus === status;

            return (
              <motion.button
                key={status}
                type="button"
                onClick={() => onSelectStatus?.(isSelected ? null : status)}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.04 }}
                className={cn(
                  "relative text-left rounded-xl p-3.5 border transition-all duration-200 cursor-pointer overflow-hidden",
                  config.bg,
                  config.border,
                  isSelected
                    ? "ring-2 ring-primary border-primary bg-primary/15 shadow-sm"
                    : "hover:border-primary/40"
                )}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider", config.text)}>
                    <Icon className="h-3.5 w-3.5" />
                    {status}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground bg-background/60 px-1.5 py-0.5 rounded-md border border-border/40">
                    {percentage}%
                  </span>
                </div>

                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-2xl font-bold tracking-tight text-foreground">
                    {count.toLocaleString()}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${widthPercent}%` }}
                    transition={{ duration: 0.4, delay: index * 0.08 }}
                    className={cn("h-full rounded-full transition-all", config.bar)}
                  />
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Side States */}
        {sideWithCounts.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border/50">
            <span className="text-xs font-medium text-muted-foreground mr-1">
              Other states:
            </span>
            {sideWithCounts.map((status) => {
              const count = dataMap.get(status) || 0;
              const config = statusConfig[status] || statusConfig['Stagnant'];
              const isSelected = selectedStatus === status;

              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => onSelectStatus?.(isSelected ? null : status)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all cursor-pointer",
                    config.bg,
                    config.border,
                    isSelected ? "ring-2 ring-primary border-primary bg-primary/15 font-semibold" : "hover:border-primary/40"
                  )}
                >
                  <span className={cn(config.text)}>{status}</span>
                  <span className="rounded-md bg-background/80 px-1.5 py-0.2 text-[11px] font-bold text-foreground border border-border/40">
                    {count.toLocaleString()}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Category Breakdown Bar */}
      {categoriesData.length > 0 && (
        <div className="rounded-2xl border border-border/70 bg-card/60 p-4 shadow-xs backdrop-blur-md">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Category Breakdown
              </h4>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {categoriesData.map((cat) => {
              const isSelected = selectedCategories.includes(cat.category);
              const percentage = totalCategoriesCount > 0 ? ((cat.count / totalCategoriesCount) * 100).toFixed(1) : '0';
              const colorStyle = categoryBadgeColors[cat.category] || 'bg-muted/40 text-muted-foreground border-border';

              return (
                <button
                  key={cat.category}
                  type="button"
                  onClick={() => onSelectCategory?.(cat.category)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all cursor-pointer",
                    isSelected
                      ? "ring-2 ring-primary border-primary bg-primary/15 font-semibold text-primary shadow-xs"
                      : `${colorStyle} hover:border-primary/40`
                  )}
                >
                  <span>{cat.category}</span>
                  <span className="rounded-md bg-background/80 px-1.5 py-0.2 text-[11px] font-bold border border-border/40 text-foreground">
                    {cat.count.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {percentage}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
