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

const eventConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  'APPROVED': { icon: CheckCircle2, color: 'text-emerald-400', label: 'approved' },
  'CHANGES_REQUESTED': { icon: XCircle, color: 'text-orange-400', label: 'requested changes on' },
  'COMMENTED': { icon: MessageSquare, color: 'text-blue-400', label: 'commented on' },
  'REVIEWED': { icon: Eye, color: 'text-violet-400', label: 'reviewed' },
  'MERGED': { icon: GitPullRequest, color: 'text-cyan-400', label: 'merged' },
  'OPENED': { icon: FileEdit, color: 'text-amber-400', label: 'opened' },
  'CLOSED': { icon: XCircle, color: 'text-red-400', label: 'closed' },
};

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

export function RoleActivityTimeline({ events, loading }: RoleActivityTimelineProps) {
  if (loading) {
    return (
      <div className="bg-slate-900/50 rounded-xl border border-slate-700/40 p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-10 w-10 rounded-full bg-slate-800" />
              <div className="flex-1">
                <div className="h-4 w-3/4 bg-slate-800 rounded mb-2" />
                <div className="h-3 w-1/4 bg-slate-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="bg-slate-900/50 rounded-xl border border-slate-700/40 p-12 text-center">
        <p className="text-slate-400">No recent activity</p>
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
      <div className="px-6 py-4 border-b border-slate-700/40 flex items-center gap-2">
        <Clock className="h-5 w-5 text-slate-400" />
        <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
      </div>

      {/* Timeline */}
      <div className="p-6">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-700/50" />

          {/* Events */}
          <div className="space-y-6">
            {events.map((event, index) => {
              const config = eventConfig[event.eventType] || {
                icon: GitPullRequest,
                color: 'text-slate-400',
                label: event.eventType.toLowerCase(),
              };
              const Icon = config.icon;

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative flex gap-4 pl-2"
                >
                  {/* Icon */}
                  <div className={cn(
                    "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    "bg-slate-900 border border-slate-700"
                  )}>
                    <Icon className={cn("h-4 w-4", config.color)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-sm">
                      <Link 
                        href={`https://github.com/${event.actor}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-white hover:text-cyan-400 transition-colors"
                      >
                        {event.actor}
                      </Link>
                      {event.role && (
                        <span className={cn(
                          "mx-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase",
                          event.role === 'EDITOR' && "bg-cyan-500/20 text-cyan-400",
                          event.role === 'REVIEWER' && "bg-violet-500/20 text-violet-400",
                          event.role === 'CONTRIBUTOR' && "bg-emerald-500/20 text-emerald-400"
                        )}>
                          {event.role}
                        </span>
                      )}
                      <span className="text-slate-400"> {config.label} </span>
                      <Link
                        href={getPRLink(event)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 font-medium hover:text-cyan-300 hover:underline transition-colors"
                      >
                        PR #{event.prNumber}
                      </Link>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
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
