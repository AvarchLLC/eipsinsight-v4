'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  FileEdit, 
  Search, 
  Clock, 
  CheckCircle2, 
  Pause, 
  XCircle,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { client } from '@/lib/orpc';
import Link from 'next/link';

interface StatusCount {
  status: string;
  count: number;
  lastUpdated: string | null;
}

interface CategoryCount {
  category: string;
  count: number;
}

const statusIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'Draft': FileEdit,
  'Review': Search,
  'Last Call': Clock,
  'Final': CheckCircle2,
  'Stagnant': Pause,
  'Withdrawn': XCircle,
};

const statusColors: Record<string, { border: string; bg: string; text: string; icon: string }> = {
  Draft: { border: 'border-slate-400/35', bg: 'bg-slate-500/15', text: 'text-slate-300', icon: 'text-slate-300' },
  Review: { border: 'border-blue-400/35', bg: 'bg-blue-500/15', text: 'text-blue-300', icon: 'text-blue-300' },
  'Last Call': { border: 'border-amber-400/35', bg: 'bg-amber-500/15', text: 'text-amber-300', icon: 'text-amber-300' },
  Final: { border: 'border-emerald-400/35', bg: 'bg-emerald-500/15', text: 'text-emerald-300', icon: 'text-emerald-300' },
  Stagnant: { border: 'border-orange-400/35', bg: 'bg-orange-500/15', text: 'text-orange-300', icon: 'text-orange-300' },
  Withdrawn: { border: 'border-red-400/35', bg: 'bg-red-500/15', text: 'text-red-300', icon: 'text-red-300' },
};

const categoryColors: Record<string, string> = {
  'Core': 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-400/40 dark:border-cyan-400/30',
  'Networking': 'bg-violet-500/20 text-violet-700 dark:text-violet-300 border-violet-400/40 dark:border-violet-400/30',
  'Interface': 'bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-400/40 dark:border-pink-400/30',
  'ERC': 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-400/40 dark:border-emerald-400/30',
  'Meta': 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-400/40 dark:border-amber-400/30',
  'Informational': 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-400/40 dark:border-blue-400/30',
};

function formatLastUpdated(dateStr: string | null): string {
  if (!dateStr) return 'Unknown';
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

function toSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function StatusCategoryGrid() {
  const [statusCounts, setStatusCounts] = useState<StatusCount[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<CategoryCount[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const selectedCategoryKey = selectedCategory ?? 'all';

  useEffect(() => {
    async function fetchData() {
      try {
        const [statusData, categoryData] = await Promise.all([
          client.explore.getStatusCounts({ category: selectedCategoryKey === 'all' ? undefined : selectedCategoryKey }),
          client.explore.getCategoryCounts({}),
        ]);
        setStatusCounts(statusData);
        setCategoryCounts(categoryData);
      } catch (err) {
        console.error('Failed to fetch status/category data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [selectedCategoryKey]);

  const orderedStatuses = ['Draft', 'Review', 'Last Call', 'Final', 'Stagnant', 'Withdrawn'];

  if (loading) {
    return (
      <section className="relative w-full py-8">
        <div className="mx-auto w-full px-3 sm:px-4 lg:px-5 xl:px-6">
          <div className="animate-pulse">
            <div className="mb-6 h-8 w-64 rounded bg-muted/60" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-32 rounded-xl bg-muted/50" />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative w-full py-8">
        <div className="mx-auto w-full px-3 sm:px-4 lg:px-5 xl:px-6">
        {/* Section Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-lg border border-primary/30 bg-primary/10 p-2">
            <Layers className="h-5 w-5 text-primary" />
          </div>
          <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Browse by Status & Category</h2>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium border transition-all",
              selectedCategory === null
                ? "bg-primary/10 text-primary border-primary/35"
                : "bg-transparent text-muted-foreground border-border hover:border-primary/35 hover:text-foreground"
            )}
          >
            All
          </button>
          {categoryCounts.map((cat) => (
            <button
              key={cat.category}
              onClick={() => setSelectedCategory(cat.category)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium border transition-all",
                selectedCategory === cat.category
                  ? categoryColors[cat.category] || 'bg-muted/40 text-foreground border-border'
                  : "bg-transparent text-muted-foreground border-border hover:border-primary/35 hover:text-foreground"
              )}
            >
              {cat.category} ({cat.count})
            </button>
          ))}
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2">
          {categoryCounts.map((cat) => (
            <Link
              key={`category-drilldown-${cat.category}`}
              href={`/explore/details/category/${toSlug(cat.category)}`}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-all",
                "border-border bg-card/70 text-muted-foreground hover:border-primary/35 hover:text-foreground"
              )}
            >
              {cat.category}
              <span className="text-[11px] opacity-75">({cat.count})</span>
            </Link>
          ))}
        </div>

        {/* Status Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {orderedStatuses.map((status, index) => {
            const statusData = statusCounts.find(s => s.status === status);
            const Icon = statusIcons[status] || FileEdit;
            const colors = statusColors[status] || statusColors['Draft'];
            const count = statusData?.count || 0;

            return (
              <Link
                key={status}
                href={`/explore/details/status/${toSlug(status)}${selectedCategory ? `?category=${encodeURIComponent(selectedCategory)}` : ''}`}
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  whileHover={{ scale: 1.02, y: -4 }}
                  className={cn(
                    "relative p-4 rounded-xl border cursor-pointer",
                    "bg-card shadow-sm",
                    "hover:shadow-lg hover:shadow-primary/10",
                    "ring-1 ring-border/60",
                    "transition-all duration-200",
                    colors.border
                  )}
                >
                  {/* Icon */}
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg mb-3",
                    colors.bg
                  )}>
                    <Icon className={cn("h-5 w-5", colors.icon)} />
                  </div>

                  {/* Status name */}
                  <h3 className={cn("dec-title text-sm font-semibold tracking-tight mb-1", colors.text)}>
                    {status}
                  </h3>

                  {/* Count */}
                  <p className="dec-title mb-1 text-2xl font-bold tracking-tight text-foreground">
                    {count.toLocaleString()}
                  </p>

                  {/* Last updated */}
                  <p className="text-xs text-muted-foreground">
                    Updated: {formatLastUpdated(statusData?.lastUpdated || null)}
                  </p>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
