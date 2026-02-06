'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Flame, ArrowRight, TrendingUp, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface TrendingProposal {
  eipId: number;
  number: number;
  title: string;
  status: string;
  score: number;
  trendingReason: string;
  lastActivity: string | null;
}

interface TrendingListProps {
  proposals: TrendingProposal[];
  loading: boolean;
}

const statusColors: Record<string, string> = {
  'Draft': 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  'Review': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'Last Call': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  'Final': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'Stagnant': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  'Withdrawn': 'bg-red-500/20 text-red-300 border-red-500/30',
};

function formatLastActivity(dateStr: string | null): string {
  if (!dateStr) return 'Recent';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getScoreColor(score: number): string {
  if (score >= 20) return 'text-orange-400';
  if (score >= 10) return 'text-amber-400';
  return 'text-slate-400';
}

export function TrendingList({ proposals, loading }: TrendingListProps) {
  if (loading) {
    return (
      <div className="bg-slate-900/50 rounded-xl border border-slate-700/40 overflow-hidden">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-20 bg-slate-800 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <div className="bg-slate-900/50 rounded-xl border border-slate-700/40 p-12 text-center">
        <p className="text-slate-400">No trending proposals at the moment</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-slate-900/50 rounded-xl border border-slate-700/40 overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-700/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-orange-400" />
          <h3 className="text-lg font-semibold text-white">
            Trending Proposals ({proposals.length})
          </h3>
        </div>
        <span className="text-xs text-slate-500">Last 7 days</span>
      </div>

      {/* List */}
      <div className="divide-y divide-slate-700/30">
        {proposals.map((proposal, index) => (
          <Link key={proposal.eipId} href={`/eips/${proposal.number}`}>
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className={cn(
                "px-6 py-4 hover:bg-slate-800/30 transition-colors cursor-pointer",
                "flex items-center gap-4"
              )}
            >
              {/* Rank / Score */}
              <div className="flex flex-col items-center w-16 shrink-0">
                <div className="flex items-center gap-1">
                  <Flame className={cn("h-4 w-4", getScoreColor(proposal.score))} />
                  <span className={cn("font-bold", getScoreColor(proposal.score))}>
                    {proposal.score}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 uppercase">Score</span>
              </div>

              {/* EIP Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-cyan-400">
                    EIP-{proposal.number}
                  </span>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-medium border",
                    statusColors[proposal.status] || statusColors['Draft']
                  )}>
                    {proposal.status}
                  </span>
                </div>
                <h4 className="text-sm text-white line-clamp-1 mb-1">
                  {proposal.title}
                </h4>
                <p className="text-xs text-slate-500">
                  {proposal.trendingReason}
                </p>
              </div>

              {/* Last Activity */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Clock className="h-3 w-3" />
                  {formatLastActivity(proposal.lastActivity)}
                </div>
                <ArrowRight className="h-4 w-4 text-slate-500" />
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
