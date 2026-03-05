'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface EIP {
  id: number;
  number: number;
  title: string;
  type: string | null;
  status: string;
  category: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface YearEIPTableProps {
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
};

const typeColors: Record<string, string> = {
  'Standards Track': 'text-primary',
  'Meta': 'text-violet-500',
  'Informational': 'text-amber-500',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function YearEIPTable({
  eips,
  total,
  loading,
  page,
  pageSize,
  onPageChange,
}: YearEIPTableProps) {
  const totalPages = Math.ceil(total / pageSize);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card/60 overflow-hidden">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl border border-border bg-card/60 overflow-hidden"
    >
      {/* Table Header */}
      <div className="px-6 py-4 border-b border-border/70">
        <div className="flex items-center justify-between">
          <h3 className="dec-title text-xl font-semibold tracking-tight text-foreground">
            EIPs ({total.toLocaleString()})
          </h3>
          <span className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} of {total}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/70">
              <th className="px-6 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                EIP #
              </th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Updated
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
                className="hover:bg-muted/40 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link
                    href={`/eips/${eip.number}`}
                    className="flex items-center gap-2 text-primary hover:text-primary/80 font-medium"
                  >
                    EIP-{eip.number}
                    <ExternalLink className="h-3 w-3 opacity-50" />
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-foreground/90 line-clamp-1 max-w-xs">
                    {eip.title}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={cn(
                    "text-sm",
                    typeColors[eip.type || ''] || 'text-muted-foreground'
                  )}>
                    {eip.type || '-'}
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
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {formatDate(eip.createdAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {formatDate(eip.updatedAt)}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-border/70 flex items-center justify-between">
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
                      ? "bg-primary/15 text-primary border border-primary/40"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
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
