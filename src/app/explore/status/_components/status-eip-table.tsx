'use client';

import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, ExternalLink, Clock } from 'lucide-react';
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

interface StatusEIPTableProps {
  eips: EIP[];
  total: number;
  loading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

const statusColors: Record<string, string> = {
  'Draft': 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  'Review': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'Last Call': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  'Final': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'Stagnant': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  'Withdrawn': 'bg-red-500/20 text-red-300 border-red-500/30',
};

const categoryColors: Record<string, string> = {
  'Core': 'text-cyan-400',
  'Networking': 'text-violet-400',
  'Interface': 'text-pink-400',
  'ERC': 'text-emerald-400',
  'Meta': 'text-amber-400',
  'Informational': 'text-blue-400',
};

function formatDaysInStatus(days: number | null): string {
  if (days === null) return '-';
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  if (days < 30) return `${days} days`;
  if (days < 365) return `${Math.floor(days / 30)} months`;
  return `${Math.floor(days / 365)}+ years`;
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

  if (loading) {
    return (
      <div className="bg-slate-900/50 rounded-xl border border-slate-700/40 overflow-hidden">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-800 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (eips.length === 0) {
    return (
      <div className="bg-slate-900/50 rounded-xl border border-slate-700/40 p-12 text-center">
        <p className="text-slate-400">No EIPs match the current filters</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-slate-900/50 rounded-xl border border-slate-700/40 overflow-hidden"
    >
      {/* Table Header */}
      <div className="px-6 py-4 border-b border-slate-700/40">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            Results ({total.toLocaleString()})
          </h3>
          <span className="text-sm text-slate-400">
            Page {page} of {totalPages}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700/40">
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                EIP #
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Days in Status
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {eips.map((eip, index) => (
              <motion.tr
                key={eip.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.02 }}
                className="hover:bg-slate-800/30 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link
                    href={`/eips/${eip.number}`}
                    className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 font-medium"
                  >
                    EIP-{eip.number}
                    <ExternalLink className="h-3 w-3 opacity-50" />
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-slate-300 line-clamp-1 max-w-xs">
                    {eip.title}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={cn(
                    "text-sm font-medium",
                    categoryColors[eip.category || ''] || 'text-slate-400'
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
                  <span className="text-sm text-slate-400">
                    {formatDaysInStatus(eip.daysInStatus)}
                  </span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-slate-700/40 flex items-center justify-between">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm",
              "border border-slate-700/50 transition-all",
              page === 1
                ? "opacity-50 cursor-not-allowed text-slate-500"
                : "text-slate-300 hover:border-cyan-400/50 hover:text-white"
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
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
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
              "border border-slate-700/50 transition-all",
              page === totalPages
                ? "opacity-50 cursor-not-allowed text-slate-500"
                : "text-slate-300 hover:border-cyan-400/50 hover:text-white"
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
