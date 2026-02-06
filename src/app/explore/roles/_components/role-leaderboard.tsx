'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Trophy, Medal, Award, Clock, MessageSquare, GitPullRequest } from 'lucide-react';
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

const rankIcons: Record<number, { icon: React.ElementType; color: string }> = {
  1: { icon: Trophy, color: 'text-amber-400' },
  2: { icon: Medal, color: 'text-slate-300' },
  3: { icon: Award, color: 'text-orange-400' },
};

function formatResponseTime(hours: number | null): string {
  if (hours === null) return '-';
  if (hours < 1) return '< 1h';
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

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
      <div className="bg-slate-900/50 rounded-xl border border-slate-700/40 overflow-hidden">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-14 bg-slate-800 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="bg-slate-900/50 rounded-xl border border-slate-700/40 p-12 text-center">
        <p className="text-slate-400">No leaderboard data available</p>
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
      <div className="px-6 py-4 border-b border-slate-700/40">
        <h3 className="text-lg font-semibold text-white">Contributor Leaderboard</h3>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700/40">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider w-16">
                Rank
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Contributor
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <div className="flex items-center justify-center gap-1">
                  <GitPullRequest className="h-3 w-3" />
                  PRs Reviewed
                </div>
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <div className="flex items-center justify-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  Comments
                </div>
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <div className="flex items-center justify-center gap-1">
                  <Clock className="h-3 w-3" />
                  Avg Response
                </div>
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Last Active
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {entries.map((entry, index) => {
              const RankIcon = rankIcons[entry.rank]?.icon;
              const rankColor = rankIcons[entry.rank]?.color || 'text-slate-500';

              return (
                <motion.tr
                  key={entry.actor}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="hover:bg-slate-800/30 transition-colors"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center">
                      {RankIcon ? (
                        <RankIcon className={cn("h-5 w-5", rankColor)} />
                      ) : (
                        <span className="text-sm font-bold text-slate-500">
                          #{entry.rank}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      {/* Avatar placeholder */}
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/30 to-violet-500/30 border border-slate-700">
                        <span className="text-xs font-semibold text-white">
                          {entry.actor.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-white">
                          {entry.actor}
                        </span>
                        {entry.role && (
                          <span className={cn(
                            "ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase",
                            entry.role === 'EDITOR' && "bg-cyan-500/20 text-cyan-400",
                            entry.role === 'REVIEWER' && "bg-violet-500/20 text-violet-400",
                            entry.role === 'CONTRIBUTOR' && "bg-emerald-500/20 text-emerald-400"
                          )}>
                            {entry.role}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="font-semibold text-white">
                      {entry.prsReviewed.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="font-semibold text-white">
                      {entry.comments.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={cn(
                      "text-sm",
                      entry.avgResponseHours && entry.avgResponseHours < 24
                        ? "text-emerald-400"
                        : "text-slate-400"
                    )}>
                      {formatResponseTime(entry.avgResponseHours)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="text-sm text-slate-400">
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
