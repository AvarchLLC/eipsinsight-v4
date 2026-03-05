'use client';

import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, ExternalLink, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface EIP {
  id: number;
  number: number;
  kind: string;
  title: string;
  type: string | null;
  status: string;
  category: string | null;
  updatedAt: string | null;
  daysInStatus: number | null;
}

interface StatusEIPTableProps {
  eips: EIP[];
  total: number;
  loading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

const statusColors: Record<string, string> = {
  'Draft': 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
  'Review': 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  'Last Call': 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
  'Final': 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  'Stagnant': 'bg-gray-500/15 text-gray-700 dark:text-gray-300 border-gray-500/30',
  'Withdrawn': 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
  'Living': 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
};

const categoryColors: Record<string, string> = {
  'Core': 'text-primary',
  'Networking': 'text-violet-500',
  'Interface': 'text-pink-500',
  'ERC': 'text-emerald-500',
  'Meta': 'text-amber-500',
  'Informational': 'text-blue-500',
};

function formatDaysInStatus(days: number | null): string {
  if (days === null) return '-';
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  if (days < 30) return `${days} days`;
  if (days < 365) return `${Math.floor(days / 30)} months`;
  return `${Math.floor(days / 365)}+ years`;
}

function formatDate(date: string | null): string {
  if (!date) return 'Unknown';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function StatusEIPTable({
  eips,
  total,
  loading,
  page,
  pageSize,
  onPageChange,
}: StatusEIPTableProps) {
  const totalPages = Math.ceil(total / pageSize);
  const proposalHref = (eip: EIP) => eip.kind === 'ERC' ? `/erc/${eip.number}` : eip.kind === 'RIP' ? `/rip/${eip.number}` : `/eip/${eip.number}`;
  const proposalLabel = (eip: EIP) => `${eip.kind}-${eip.number}`;

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card/60 overflow-hidden">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 rounded bg-muted" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (eips.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card/60 p-12 text-center">
        <p className="text-muted-foreground">No EIPs match the current filters</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-xl border border-border bg-card/60 overflow-hidden"
    >
      {/* Table Header */}
      <div className="border-b border-border/70 px-6 py-4">
        <div className="flex items-center justify-between">
          <h3 className="dec-title text-xl font-semibold tracking-tight text-foreground">
            Results ({total.toLocaleString()})
          </h3>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/70">
              <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                EIP #
              </th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Title
              </th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Category
              </th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Days in Status
                </div>
              </th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Last Updated
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {eips.map((eip, index) => (
              <motion.tr
                key={eip.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.02 }}
                className="transition-colors hover:bg-muted/40"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link
                    href={proposalHref(eip)}
                    className="flex items-center gap-2 font-medium text-primary hover:text-primary/80"
                  >
                    {proposalLabel(eip)}
                    <ExternalLink className="h-3 w-3 opacity-50" />
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <span className="line-clamp-1 max-w-xs text-sm text-foreground/90">
                    {eip.title}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={cn(
                    "text-sm font-medium",
                    categoryColors[eip.category || ''] || 'text-muted-foreground'
                  )}>
                    {eip.category || '-'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={cn(
                    "inline-flex px-2.5 py-1 rounded-full text-xs font-medium border",
                    statusColors[eip.status] || statusColors['Draft']
                  )}>
                    {eip.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={cn(
                    "text-sm",
                    (eip.daysInStatus ?? 0) >= 45 ? "text-amber-500 font-medium" : "text-muted-foreground"
                  )}>
                    {formatDaysInStatus(eip.daysInStatus)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-xs text-muted-foreground">{formatDate(eip.updatedAt)}</span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border/70 px-6 py-4">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm",
              "border border-border transition-all",
              page === 1
                ? "opacity-50 cursor-not-allowed text-muted-foreground"
                : "text-foreground hover:border-primary/50 hover:text-primary"
            )}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>

          <div className="flex items-center gap-2">
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }

              return (
                <button
                  key={i}
                  onClick={() => onPageChange(pageNum)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-all",
                    pageNum === page
                      ? "border border-primary/40 bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm",
              "border border-border transition-all",
              page === totalPages
                ? "opacity-50 cursor-not-allowed text-muted-foreground"
                : "text-foreground hover:border-primary/50 hover:text-primary"
            )}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </motion.div>
  );
}
