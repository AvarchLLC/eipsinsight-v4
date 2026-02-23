'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Clock, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface EIP {
  id: number;
  number: number;
  title: string;
  type: string | null;
  status: string;
  category: string | null;
  updatedAt: string | null;
  daysInStatus: number | null;
}

interface StatusCardGridProps {
  eips: EIP[];
  loading: boolean;
}

const statusColors: Record<string, { bg: string; border: string; text: string }> = {
  'Draft': { bg: 'bg-slate-100 dark:bg-slate-500/10', border: 'border-slate-400/40 dark:border-slate-500/30', text: 'text-slate-700 dark:text-slate-300' },
  'Review': { bg: 'bg-blue-100 dark:bg-blue-500/10', border: 'border-blue-400/40 dark:border-blue-500/30', text: 'text-blue-700 dark:text-blue-300' },
  'Last Call': { bg: 'bg-amber-100 dark:bg-amber-500/10', border: 'border-amber-400/40 dark:border-amber-500/30', text: 'text-amber-800 dark:text-amber-300' },
  'Final': { bg: 'bg-emerald-100 dark:bg-emerald-500/10', border: 'border-emerald-400/40 dark:border-emerald-500/30', text: 'text-emerald-800 dark:text-emerald-300' },
  'Stagnant': { bg: 'bg-orange-100 dark:bg-orange-500/10', border: 'border-orange-400/40 dark:border-orange-500/30', text: 'text-orange-800 dark:text-orange-300' },
  'Withdrawn': { bg: 'bg-red-100 dark:bg-red-500/10', border: 'border-red-400/40 dark:border-red-500/30', text: 'text-red-800 dark:text-red-300' },
  'Living': { bg: 'bg-cyan-100 dark:bg-cyan-500/10', border: 'border-cyan-400/40 dark:border-cyan-500/30', text: 'text-cyan-800 dark:text-cyan-300' },
};

const categoryColors: Record<string, string> = {
  'Core': 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-400/40 dark:border-cyan-400/30',
  'Networking': 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 border-violet-400/40 dark:border-violet-400/30',
  'Interface': 'bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-400/40 dark:border-pink-400/30',
  'ERC': 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-400/40 dark:border-emerald-400/30',
  'Meta': 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-400/40 dark:border-amber-400/30',
  'Informational': 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-400/40 dark:border-blue-400/30',
};

function formatDaysInStatus(days: number | null): string {
  if (days === null) return 'Unknown';
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  if (days < 30) return `${days} days`;
  if (days < 365) return `${Math.floor(days / 30)} months`;
  return `${Math.floor(days / 365)}+ years`;
}

export function StatusCardGrid({ eips, loading }: StatusCardGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-40 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (eips.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700/40 p-12 text-center">
        <p className="text-slate-600 dark:text-slate-400">No EIPs match the current filters</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {eips.map((eip, index) => {
        const statusColor = statusColors[eip.status] || statusColors['Draft'];
        const catColor = categoryColors[eip.category || ''] || 'bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-400/40 dark:border-slate-500/30';

        return (
          <Link key={eip.id} href={`/eips/${eip.number}`}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.02 }}
              whileHover={{ scale: 1.02, y: -4 }}
              className={cn(
                "relative p-4 rounded-xl cursor-pointer",
                "bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-transparent backdrop-blur-sm",
                "hover:shadow-lg transition-all duration-200",
                statusColor.border
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <span className="text-lg font-bold text-cyan-600 dark:text-cyan-400">
                  EIP-{eip.number}
                </span>
                <ArrowRight className="h-4 w-4 text-slate-500" />
              </div>

              {/* Title */}
              <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-3 line-clamp-2">
                {eip.title}
              </h3>

              {/* Category Badge */}
              {eip.category && (
                <span className={cn(
                  "inline-flex px-2 py-0.5 rounded-full text-xs font-medium border mb-3",
                  catColor
                )}>
                  {eip.category}
                </span>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700/50">
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-medium",
                  statusColor.bg,
                  statusColor.text
                )}>
                  {eip.status}
                </span>
                <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-500">
                  <Clock className="h-3 w-3" />
                  {formatDaysInStatus(eip.daysInStatus)}
                </div>
              </div>
            </motion.div>
          </Link>
        );
      })}
    </div>
  );
}
