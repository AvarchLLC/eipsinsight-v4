'use client';

import React from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { Trophy, Medal, Award, MessageSquare, GitPullRequest } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeaderboardEntry {
  rank: number;
  actor: string;
  totalScore: number;
  prsReviewed: number;
  comments: number;
  prsCreated: number;
  prsMerged: number;
  avgResponseHours: number | null;
  lastActivity: string | null;
  role: string | null;
}

interface RoleLeaderboardProps {
  entries: LeaderboardEntry[];
  loading: boolean;
}

const rankIcons: Record<number, { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  1: { icon: Trophy, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-500/20' },
  2: { icon: Medal, color: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-slate-500/20' },
  3: { icon: Award, color: 'text-amber-700 dark:text-orange-400', bg: 'bg-amber-50 dark:bg-orange-500/20' },
};

function formatLastActivity(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

export function RoleLeaderboard({ entries, loading }: RoleLeaderboardProps) {
  if (loading) {
    return (
      <div className="h-full rounded-xl border border-slate-200 dark:border-slate-700/40 bg-white dark:bg-slate-900/50 overflow-hidden">
        <div className="p-4">
          <div className="animate-pulse space-y-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="h-full rounded-xl border border-slate-200 dark:border-slate-700/40 bg-white dark:bg-slate-900/50 p-12 flex items-center justify-center">
        <p className="text-slate-500 dark:text-slate-400">No leaderboard data available</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col rounded-xl border border-slate-200 dark:border-slate-700/40 bg-white dark:bg-slate-900/50 overflow-hidden shadow-sm dark:shadow-none"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700/40 shrink-0">
        <h3 className="dec-title text-base font-semibold text-slate-900 dark:text-white">
          Leaderboard
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Ranked by contribution score
        </p>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 max-h-[420px] overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-white dark:bg-slate-900/95 backdrop-blur-sm z-10">
            <tr className="border-b border-slate-200 dark:border-slate-700/40">
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-12">
                #
              </th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Contributor
              </th>
              <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-16">
                <div className="flex items-center justify-center gap-1">
                  <GitPullRequest className="h-3 w-3" />
                  PRs
                </div>
              </th>
              <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-16">
                <div className="flex items-center justify-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  Actions
                </div>
              </th>
              <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-16">
                <div className="flex items-center justify-center gap-1">
                  <Trophy className="h-3 w-3" />
                  Score
                </div>
              </th>
              <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-20">
                Last Active
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/30">
            {entries.map((entry, index) => {
              const rankConfig = rankIcons[entry.rank];
              const RankIcon = rankConfig?.icon;
              const isTop3 = entry.rank <= 3;

              return (
                <motion.tr
                  key={`${entry.actor}-${index}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={cn(
                    "h-14 transition-colors",
                    isTop3 && "bg-slate-50/80 dark:bg-slate-800/20",
                    "hover:bg-slate-50 dark:hover:bg-slate-800/30"
                  )}
                >
                  <td className="px-3 py-0">
                    <div className="flex items-center justify-center h-14">
                      {RankIcon ? (
                        <div className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg",
                          rankConfig.bg
                        )}>
                          <RankIcon className={cn("h-4 w-4", rankConfig.color)} />
                        </div>
                      ) : (
                        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                          {entry.rank}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-0">
                    <Link
                      href={`https://github.com/${entry.actor}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 group h-14"
                    >
                      <img
                        src={`https://github.com/${entry.actor}.png?size=64`}
                        alt={entry.actor}
                        className="h-8 w-8 rounded-full border-2 border-slate-200 dark:border-slate-700 group-hover:border-violet-400/50 dark:group-hover:border-violet-400/50 transition-colors shrink-0"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect fill="%2364748b" width="32" height="32" rx="16"/><text x="16" y="20" text-anchor="middle" fill="white" font-size="14" font-weight="600">${entry.actor.charAt(0).toUpperCase()}</text></svg>`;
                        }}
                      />
                      <div className="min-w-0">
                        <span className="font-medium text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors block truncate">
                          {entry.actor}
                        </span>
                        {entry.role && (
                          <span className={cn(
                            "inline-flex mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase",
                            entry.role === 'EDITOR' && "bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400",
                            entry.role === 'REVIEWER' && "bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400",
                            entry.role === 'CONTRIBUTOR' && "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                          )}>
                            {entry.role}
                          </span>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-3 py-0 text-center align-middle">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {entry.prsReviewed.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-3 py-0 text-center align-middle">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {entry.comments.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-3 py-0 text-center align-middle">
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      {entry.totalScore.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-3 py-0 text-center align-middle">
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      {formatLastActivity(entry.lastActivity)}
                    </span>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
