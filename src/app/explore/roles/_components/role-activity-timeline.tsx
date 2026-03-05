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
  'APPROVED': { icon: CheckCircle2, color: 'text-primary', label: 'approved' },
  'CHANGES_REQUESTED': { icon: XCircle, color: 'text-amber-500', label: 'requested changes on' },
  'COMMENTED': { icon: MessageSquare, color: 'text-primary', label: 'commented on' },
  'REVIEWED': { icon: Eye, color: 'text-primary', label: 'reviewed' },
  'MERGED': { icon: GitPullRequest, color: 'text-emerald-500', label: 'merged' },
  'OPENED': { icon: FileEdit, color: 'text-primary', label: 'opened' },
  'CLOSED': { icon: XCircle, color: 'text-rose-500', label: 'closed' },
};

export function RoleActivityTimeline({ events, loading }: RoleActivityTimelineProps) {
  if (loading) {
    return (
      <div className="h-full min-h-0 rounded-xl border border-border bg-card/60 p-4">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="h-8 w-8 shrink-0 rounded-full bg-muted" />
              <div className="flex-1">
                <div className="mb-2 h-4 w-3/4 rounded bg-muted" />
                <div className="h-3 w-1/4 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center rounded-xl border border-border bg-card/60 p-6">
        <p className="text-sm text-muted-foreground">No timeline events in this filter range. Try widening repo/category/time window.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card/60"
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <h3 className="dec-title text-sm font-semibold text-foreground">Recent Activity</h3>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 scrollbar-thin">
        <div className="relative">
          <div className="absolute bottom-0 left-4 top-0 w-px bg-border/70" />

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
                    "border border-border bg-muted/60"
                  )}>
                    <Icon className={cn("h-3.5 w-3.5", config.color)} />
                  </div>

                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-xs leading-snug">
                      <Link 
                        href={`/people/${encodeURIComponent(event.actor)}`}
                        className="font-medium text-foreground transition-colors hover:text-primary"
                      >
                        {event.actor}
                      </Link>
                      {event.role && (
                        <span className={cn(
                          "mx-1 rounded-md border border-primary/25 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase text-primary"
                        )}>
                          {event.role}
                        </span>
                      )}
                      <span className="text-muted-foreground"> {config.label} </span>
                      <Link
                        href={getPRLink(event)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-primary transition-colors hover:underline"
                      >
                        PR #{event.prNumber}
                      </Link>
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
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
