'use client';

import React from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { 
  CheckCircle2, 
  XCircle, 
  MessageSquare, 
  GitPullRequest,
  Eye,
  FileEdit,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityEvent {
  id: string;
  actor: string;
  role: string | null;
  eventType: string;
  prNumber: number;
  createdAt: string;
  githubId: string | null;
  repoName: string;
}

interface RoleActivityTimelineProps {
  events: ActivityEvent[];
  loading: boolean;
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getPRLink(event: ActivityEvent): string {
  const repoPath = event.repoName || 'ethereum/EIPs';
  const baseUrl = `https://github.com/${repoPath}/pull/${event.prNumber}`;
  
  // If we have a github_id, we can link directly to the specific activity
  // GitHub IDs for reviews/comments can be used as anchors
  if (event.githubId) {
    // For reviews, the anchor is #pullrequestreview-{id}
    // For comments, the anchor is #issuecomment-{id} or #discussion_r{id}
    if (event.eventType === 'APPROVED' || event.eventType === 'CHANGES_REQUESTED' || event.eventType === 'REVIEWED') {
      return `${baseUrl}#pullrequestreview-${event.githubId}`;
    }
    if (event.eventType === 'COMMENTED') {
      // Could be issue comment or review comment
      return `${baseUrl}#issuecomment-${event.githubId}`;
    }
  }
  
  // For other events, link to the appropriate tab
  if (event.eventType === 'MERGED' || event.eventType === 'CLOSED' || event.eventType === 'OPENED') {
    return baseUrl;
  }
  
  // Default: link to the files changed tab for commits
  return baseUrl;
}

const eventConfigLight: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  'APPROVED': { icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', label: 'approved' },
  'CHANGES_REQUESTED': { icon: XCircle, color: 'text-orange-600 dark:text-orange-400', label: 'requested changes on' },
  'COMMENTED': { icon: MessageSquare, color: 'text-blue-600 dark:text-blue-400', label: 'commented on' },
  'REVIEWED': { icon: Eye, color: 'text-violet-600 dark:text-violet-400', label: 'reviewed' },
  'MERGED': { icon: GitPullRequest, color: 'text-cyan-600 dark:text-cyan-400', label: 'merged' },
  'OPENED': { icon: FileEdit, color: 'text-amber-600 dark:text-amber-400', label: 'opened' },
  'CLOSED': { icon: XCircle, color: 'text-red-600 dark:text-red-400', label: 'closed' },
};

export function RoleActivityTimeline({ events, loading }: RoleActivityTimelineProps) {
  if (loading) {
    return (
      <div className="h-full min-h-0 rounded-xl border border-slate-200 dark:border-slate-700/40 bg-white dark:bg-slate-900/50 p-4">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
              <div className="flex-1">
                <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded mb-2" />
                <div className="h-3 w-1/4 bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="h-full min-h-0 rounded-xl border border-slate-200 dark:border-slate-700/40 bg-white dark:bg-slate-900/50 p-6 flex items-center justify-center">
        <p className="text-slate-500 dark:text-slate-400 text-sm">No recent activity</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full min-h-0 flex flex-col rounded-xl border border-slate-200 dark:border-slate-700/40 bg-white dark:bg-slate-900/50 overflow-hidden shadow-sm dark:shadow-none"
    >
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700/40 flex items-center gap-2 shrink-0">
        <Clock className="h-4 w-4 text-slate-500 dark:text-slate-400" />
        <h3 className="dec-title text-sm font-semibold text-slate-900 dark:text-white">Recent Activity</h3>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 scrollbar-thin">
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700/50" />

          <div className="space-y-4">
            {events.map((event, index) => {
              const config = eventConfigLight[event.eventType] || {
                icon: GitPullRequest,
                color: 'text-slate-500 dark:text-slate-400',
                label: event.eventType.toLowerCase(),
              };
              const Icon = config.icon;

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="relative flex gap-3 pl-1"
                >
                  <div className={cn(
                    "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                    "bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  )}>
                    <Icon className={cn("h-3.5 w-3.5", config.color)} />
                  </div>

                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-xs leading-snug">
                      <Link 
                        href={`https://github.com/${event.actor}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-slate-900 dark:text-white hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                      >
                        {event.actor}
                      </Link>
                      {event.role && (
                        <span className={cn(
                          "mx-1 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase",
                          event.role === 'EDITOR' && "bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400",
                          event.role === 'REVIEWER' && "bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400",
                          event.role === 'CONTRIBUTOR' && "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                        )}>
                          {event.role}
                        </span>
                      )}
                      <span className="text-slate-500 dark:text-slate-400"> {config.label} </span>
                      <Link
                        href={getPRLink(event)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-violet-600 dark:text-cyan-400 font-medium hover:underline transition-colors"
                      >
                        PR #{event.prNumber}
                      </Link>
                    </p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                      {formatTimeAgo(event.createdAt)}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
