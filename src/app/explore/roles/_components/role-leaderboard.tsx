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
  prsTouched: number;
  avgResponseHours: number | null;
  lastActivity: string | null;
  role: string | null;
}

interface RoleLeaderboardProps {
  entries: LeaderboardEntry[];
  loading: boolean;
  title?: string;
  subtitle?: string;
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

export function RoleLeaderboard({
  entries,
  loading,
  title = 'Top participants',
  subtitle = 'Ranked by total actions in selected filters',
}: RoleLeaderboardProps) {
  if (loading) {
    return (
      <div className="h-full overflow-hidden rounded-xl border border-border bg-card/60">
        <div className="p-4">
          <div className="animate-pulse space-y-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-muted" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-border bg-card/60 p-12">
        <p className="text-muted-foreground">No people found for current filters.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card/60"
    >
      {/* Header */}
      <div className="shrink-0 border-b border-border px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">People</p>
        <h3 className="dec-title mt-1 text-xl font-semibold tracking-tight text-foreground">{title}</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 max-h-[420px] overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm">
            <tr className="border-b border-border/70">
              <th className="w-12 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                #
              </th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Person
              </th>
              <th className="w-16 px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <div className="flex items-center justify-center gap-1">
                  <GitPullRequest className="h-3 w-3" />
                  Touched
                </div>
              </th>
              <th className="w-16 px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <div className="flex items-center justify-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  Actions
                </div>
              </th>
              <th className="w-16 px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <div className="flex items-center justify-center gap-1">
                  <Trophy className="h-3 w-3" />
                  Score
                </div>
              </th>
              <th className="w-20 px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Last Active
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
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
                    isTop3 && "bg-primary/5",
                    "hover:bg-muted/40"
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
                        <span className="text-sm font-semibold text-muted-foreground">
                          {entry.rank}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-0">
                    <Link
                      href={`/people/${encodeURIComponent(entry.actor)}`}
                      className="flex items-center gap-3 group h-14"
                    >
                      <img
                        src={`https://github.com/${entry.actor}.png?size=64`}
                        alt={entry.actor}
                        className="h-8 w-8 shrink-0 rounded-full border-2 border-border transition-colors group-hover:border-primary/40"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect fill="%2364748b" width="32" height="32" rx="16"/><text x="16" y="20" text-anchor="middle" fill="white" font-size="14" font-weight="600">${entry.actor.charAt(0).toUpperCase()}</text></svg>`;
                        }}
                      />
                        <div className="min-w-0">
                        <span className="block truncate font-medium text-foreground transition-colors group-hover:text-primary">
                          {entry.actor}
                        </span>
                        {entry.role && (
                          <span className={cn(
                            "mt-0.5 inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase",
                            "border-primary/25 bg-primary/10 text-primary"
                          )}>
                            {entry.role}
                          </span>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-3 py-0 text-center align-middle">
                    <span className="font-semibold text-foreground">
                      {entry.prsTouched.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-3 py-0 text-center align-middle">
                    <span className="font-semibold text-foreground">
                      {entry.comments.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-3 py-0 text-center align-middle">
                    <span className="font-bold text-primary">
                      {entry.totalScore.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-3 py-0 text-center align-middle">
                    <span className="text-xs text-muted-foreground">
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
