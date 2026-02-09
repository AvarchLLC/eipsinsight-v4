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

const rankIcons: Record<number, { icon: React.ElementType; color: string }> = {
  1: { icon: Trophy, color: 'text-amber-400' },
  2: { icon: Medal, color: 'text-slate-300' },
  3: { icon: Award, color: 'text-orange-400' },
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
                  PRs Touched
                </div>
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <div className="flex items-center justify-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  Actions
                </div>
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <div className="flex items-center justify-center gap-1">
                  <Trophy className="h-3 w-3" />
                  Score
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
                  key={`${entry.actor}-${index}`}
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
                    <Link
                      href={`https://github.com/${entry.actor}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 group"
                    >
                      {/* Avatar */}
                      <img
                        src={`https://github.com/${entry.actor}.png?size=64`}
                        alt={entry.actor}
                        className="h-8 w-8 rounded-full border border-slate-700 group-hover:border-cyan-500/50 transition-colors"
                        onError={(e) => {
                          // Fallback to placeholder on error
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect fill="%231e293b" width="32" height="32" rx="16"/><text x="16" y="20" text-anchor="middle" fill="white" font-size="14">${entry.actor.charAt(0).toUpperCase()}</text></svg>`;
                        }}
                      />
                      <div>
                        <span className="font-medium text-white group-hover:text-cyan-400 transition-colors">
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
                    </Link>
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
                    <span className="font-semibold text-amber-400">
                      {entry.totalScore.toLocaleString()}
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
