'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Info, GitPullRequest, MessageSquare, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TrendingScoreInfo() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-6 rounded-xl",
        "bg-gradient-to-br from-slate-900/80 to-slate-950/80",
        "border border-slate-700/40 backdrop-blur-sm"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Info className="h-5 w-5 text-cyan-400" />
        <h3 className="text-lg font-semibold text-white">
          How Trending Score Works
        </h3>
      </div>

      {/* Description */}
      <p className="text-sm text-slate-400 mb-6">
        Our trending algorithm identifies proposals with the most activity in the last 7 days,
        based on PR events, comments, and status changes.
      </p>

      {/* Score Breakdown */}
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15">
            <GitPullRequest className="h-4 w-4 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-white">PR Events</span>
              <span className="text-xs text-cyan-400 font-bold">×2</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Reviews, approvals, and changes requested in the last 7 days
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/15">
            <MessageSquare className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-white">Comments</span>
              <span className="text-xs text-violet-400 font-bold">×1</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Total comments on related pull requests
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15">
            <RefreshCw className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-white">Status Change</span>
              <span className="text-xs text-emerald-400 font-bold">+10</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Bonus points if status changed in the last 7 days
            </p>
          </div>
        </div>
      </div>

      {/* Formula */}
      <div className="mt-6 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <span className="text-xs text-slate-500 uppercase tracking-wider">Formula</span>
        <code className="block mt-1 text-sm text-cyan-300 font-mono">
          score = (PR events × 2) + comments + (status change ? 10 : 0)
        </code>
      </div>
    </motion.div>
  );
}
