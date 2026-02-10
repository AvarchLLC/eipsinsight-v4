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
  'Draft': { border: 'border-slate-400/30', bg: 'bg-slate-500/10', text: 'text-slate-300', icon: 'text-slate-400' },
  'Review': { border: 'border-blue-400/30', bg: 'bg-blue-500/10', text: 'text-blue-300', icon: 'text-blue-400' },
  'Last Call': { border: 'border-amber-400/30', bg: 'bg-amber-500/10', text: 'text-amber-300', icon: 'text-amber-400' },
  'Final': { border: 'border-emerald-400/30', bg: 'bg-emerald-500/10', text: 'text-emerald-300', icon: 'text-emerald-400' },
  'Stagnant': { border: 'border-orange-400/30', bg: 'bg-orange-500/10', text: 'text-orange-300', icon: 'text-orange-400' },
  'Withdrawn': { border: 'border-red-400/30', bg: 'bg-red-500/10', text: 'text-red-300', icon: 'text-red-400' },
};

const categoryColors: Record<string, string> = {
  'Core': 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30',
  'Networking': 'bg-violet-500/20 text-violet-300 border-violet-400/30',
  'Interface': 'bg-pink-500/20 text-pink-300 border-pink-400/30',
  'ERC': 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
  'Meta': 'bg-amber-500/20 text-amber-300 border-amber-400/30',
  'Informational': 'bg-blue-500/20 text-blue-300 border-blue-400/30',
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

export function StatusCategoryGrid() {
  const [statusCounts, setStatusCounts] = useState<StatusCount[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<CategoryCount[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statusData, categoryData] = await Promise.all([
          client.explore.getStatusCounts({}),
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
  }, []);

  const orderedStatuses = ['Draft', 'Review', 'Last Call', 'Final', 'Stagnant', 'Withdrawn'];

  if (loading) {
    return (
      <section className="relative w-full py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 w-64 bg-slate-800 rounded mb-6" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-32 bg-slate-800 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative w-full py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-400/20">
            <Layers className="h-5 w-5 text-emerald-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">Browse by Status & Category</h2>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium border transition-all",
              selectedCategory === null
                ? "bg-white/10 text-white border-white/20"
                : "bg-transparent text-slate-400 border-slate-700/50 hover:border-slate-600"
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
                  ? categoryColors[cat.category] || 'bg-slate-500/20 text-slate-300 border-slate-400/30'
                  : "bg-transparent text-slate-400 border-slate-700/50 hover:border-slate-600"
              )}
            >
              {cat.category} ({cat.count})
            </button>
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
                href={`/explore/status?status=${status.toLowerCase().replace(' ', '-')}${selectedCategory ? `&category=${selectedCategory}` : ''}`}
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  whileHover={{ scale: 1.02, y: -4 }}
                  className={cn(
                    "relative p-4 rounded-xl border cursor-pointer",
                    "bg-slate-900/50 backdrop-blur-sm",
                    "hover:shadow-lg transition-all duration-200",
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
                  <h3 className={cn("text-sm font-semibold mb-1", colors.text)}>
                    {status}
                  </h3>

                  {/* Count */}
                  <p className="text-2xl font-bold text-white mb-1">
                    {count.toLocaleString()}
                  </p>

                  {/* Last updated */}
                  <p className="text-xs text-slate-500">
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
