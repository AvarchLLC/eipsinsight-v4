'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import {
  Activity,
  ChevronDown,
  ChevronRight,
  Github,
  ExternalLink,
  GitPullRequest,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStatusTrack, getStageTrack, LifecycleTrack } from '@/components/enterprise-eip-brief';
import { normalizeUpgradeBucket, stageAbbreviation, stageBadgeClass } from '@/lib/upgrade-stages';

interface StatusEvent {
  from: string | null;
  to: string;
  changed_at: string;
  commit_sha?: string;
}

interface StageEvent {
  upgrade_id: number | null;
  upgrade: string;
  slug: string;
  bucket: string;
  commit_sha: string | null;
  commit_date: string | null;
}

interface UpgradeInclusion {
  upgrade_id: number;
  name: string;
  slug: string;
  bucket: string;
  commit_date: string | null;
  layer?: string | null;
}

interface GovernanceState {
  pr_number: number | null;
  pr_url: string | null;
  current_pr_state: string | null;
  waiting_on: string | null;
  days_since_last_action: number | null;
  review_velocity: number | null;
}

interface ProposalLike {
  number: number;
  status: string;
  type?: string | null;
  category?: string | null;
  title?: string;
  authors?: string[];
  created?: string | null;
  repo?: string;
}

interface ProposalTimelineProps {
  proposal: ProposalLike;
  statusEvents: StatusEvent[];
  stageEvents: StageEvent[];
  upgrades: UpgradeInclusion[];
  governanceState: GovernanceState | null;
  repoPath: string; // "EIPs" | "ERCs" | "RIPs"
  normalizedRepo: string; // "eip" | "erc" | "rip"
}

// Status → dot + badge colors (matches the original Lifecycle Timeline).
const STATUS_STYLE: Record<string, { dot: string; badge: string }> = {
  draft: { dot: 'bg-cyan-500', badge: 'border-cyan-400/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-200' },
  review: { dot: 'bg-blue-500', badge: 'border-blue-400/40 bg-blue-500/10 text-blue-700 dark:text-blue-200' },
  'last call': { dot: 'bg-amber-500', badge: 'border-amber-400/40 bg-amber-500/10 text-amber-700 dark:text-amber-200' },
  final: { dot: 'bg-emerald-500', badge: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200' },
  living: { dot: 'bg-cyan-500', badge: 'border-cyan-400/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-200' },
  stagnant: { dot: 'bg-slate-500', badge: 'border-slate-400/30 bg-slate-500/10 text-slate-700 dark:text-slate-300' },
  withdrawn: { dot: 'bg-red-500', badge: 'border-red-400/40 bg-red-500/10 text-red-700 dark:text-red-200' },
};
const statusStyle = (s: string | null | undefined) =>
  STATUS_STYLE[(s ?? '').toLowerCase()] ?? { dot: 'bg-slate-500', badge: 'border-slate-400/30 bg-slate-500/10 text-slate-700 dark:text-slate-300' };

const STAGE_DOT: Record<string, string> = {
  proposed: 'bg-slate-400',
  considered: 'bg-blue-500',
  scheduled: 'bg-amber-500',
  included: 'bg-emerald-500',
  declined: 'bg-red-500',
};

function durationBetween(prev: string | null, current: string): string | null {
  if (!prev) return null;
  const days = Math.floor((new Date(current).getTime() - new Date(prev).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return null;
  return `${days} day${days !== 1 ? 's' : ''}`;
}

function formatWaitingOn(state: string | null): string {
  if (!state) return '';
  return state
    .replace(/WAITING_ON_/g, 'Waiting on ')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

const fmtDate = (d: string) => {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }) + ' UTC';
};

const fmtUtcDateTime = (d: string) => {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return (
    dt.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    }) + ' UTC'
  );
};

/** Shared horizontal timeline shell — the original Lifecycle Timeline look. */
function HorizontalTimeline({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-x-auto pb-2 pt-1">
      <div className="absolute left-6 right-6 top-4 h-px bg-border/80" />
      <div className="relative flex min-w-max items-start gap-4 pr-4">{children}</div>
    </div>
  );
}

function TimelineNode({ dot, isLatest, isLast, children }: { dot: string; isLatest?: boolean; isLast?: boolean; children: React.ReactNode }) {
  return (
    <div className="w-[250px] shrink-0">
      <div className="mb-3 flex items-center gap-2">
        <span className={cn('h-3 w-3 rounded-full ring-2 ring-background', dot, isLatest && 'shadow-md shadow-primary/30')} />
        {!isLast && <div className="h-px flex-1 bg-border/70" />}
      </div>
      <div className={cn('rounded-lg border p-3.5', isLatest ? 'border-primary/30 bg-primary/5' : 'border-border/70 bg-muted/30')}>{children}</div>
    </div>
  );
}

/** A collapsible track: overview stepper always visible, detail revealed on expand. */
function CollapsibleTrack({
  open,
  onToggle,
  detailLabel,
  stepper,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  detailLabel: string;
  stepper: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="px-1 py-1">
      {stepper}
      <div className="mt-1 px-4">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          {open ? 'Hide' : 'Show'} {detailLabel}
        </button>
        {open && <div className="mt-2 mb-1">{children}</div>}
      </div>
    </div>
  );
}

export function ProposalTimeline({
  proposal,
  statusEvents,
  stageEvents,
  upgrades,
  governanceState,
  repoPath,
  normalizedRepo,
}: ProposalTimelineProps) {
  const stageTrack = getStageTrack(upgrades as never);

  const hasPr = !!governanceState?.pr_number;
  const stageDetailCount = stageEvents.length || upgrades.length;
  const [openStage, setOpenStage] = useState(false);
  const [openPr, setOpenPr] = useState(false);

  const allOpen = openStage && (hasPr ? openPr : true);
  const toggleAll = () => {
    const next = !allOpen;
    setOpenStage(next);
    if (hasPr) setOpenPr(next);
  };

  return (
    <motion.div
      id="lifecycle"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="scroll-mt-28 overflow-hidden rounded-xl border border-border bg-card/60"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-muted/30 px-5 py-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lifecycle &amp; Upgrade Timeline</h3>
        </div>
        <div className="flex items-center gap-2">
          {governanceState?.days_since_last_action != null && (
            <span className="hidden text-[10px] font-medium text-muted-foreground sm:inline">
              Last activity {governanceState.days_since_last_action === 0 ? 'today' : `${governanceState.days_since_last_action}d ago`}
            </span>
          )}
          <button
            type="button"
            onClick={toggleAll}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-card/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {allOpen ? 'Collapse all' : 'Expand all'}
          </button>
          <Link
            href={`/timeline?repo=${normalizedRepo}s&number=${proposal.number}`}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-card/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Full timeline
            <ExternalLink className="h-3 w-3 opacity-60" />
          </Link>
        </div>
      </div>

      <div className="divide-y divide-border/50 p-3">
        {/* Proposal or EIP Status track — main uncollapsed view showing actual status event nodes */}
        <div className="px-5 py-4">
          <div className="mb-4 flex flex-wrap items-baseline gap-x-2">
            <p className="text-xs font-bold text-foreground">Proposal or EIP Status</p>
            <p className="text-[10px] text-muted-foreground">
              — historical status transitions recorded from the specification repository
            </p>
          </div>
          {statusEvents.length > 0 ? (
            <HorizontalTimeline>
              {statusEvents.map((event, index) => {
                const prev = index > 0 ? statusEvents[index - 1] : null;
                const duration = durationBetween(prev?.changed_at ?? null, event.changed_at);
                const commitUrl =
                  event.commit_sha && event.commit_sha.trim() !== ''
                    ? `https://github.com/ethereum/${repoPath}/commit/${event.commit_sha}`
                    : null;
                const isLatest = index === statusEvents.length - 1;
                return (
                  <TimelineNode
                    key={`${event.changed_at}-${event.to}-${index}`}
                    dot={statusStyle(event.to).dot}
                    isLatest={isLatest}
                    isLast={index === statusEvents.length - 1}
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          'rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase',
                          statusStyle(event.to).badge
                        )}
                      >
                        {event.to}
                      </span>
                    </div>
                    <div className="mt-2 text-[11px] text-muted-foreground">
                      {fmtUtcDateTime(event.changed_at)}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                      {duration && prev && <span>{duration} in {prev.to}</span>}
                      {commitUrl && (
                        <a
                          href={commitUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:text-primary/80"
                        >
                          <Github className="h-3 w-3" /> {event.commit_sha!.slice(0, 8)}
                        </a>
                      )}
                    </div>
                  </TimelineNode>
                );
              })}
            </HorizontalTimeline>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 p-3">
              <span
                className={cn(
                  'rounded border px-2 py-0.5 text-xs font-semibold uppercase',
                  statusStyle(proposal.status).badge
                )}
              >
                {proposal.status}
              </span>
              <span className="text-xs text-muted-foreground">
                Current recorded proposal status.
              </span>
            </div>
          )}
        </div>

        {/* Upgrade stage track — historical bucket journey across forks (only shown if assigned to a stage/fork) */}
        {(stageEvents.length > 0 || upgrades.length > 0) && (
          <CollapsibleTrack
            open={openStage}
            onToggle={() => setOpenStage((o) => !o)}
            detailLabel={`stage history (${stageDetailCount})`}
            stepper={<LifecycleTrack title="Upgrade stage" subtitle="inclusion in a network fork — independent of EIP status" steps={stageTrack} />}
          >
            {stageEvents.length > 0 ? (
              <HorizontalTimeline>
                {stageEvents.map((event, index) => {
                  const nb = normalizeUpgradeBucket(event.bucket);
                  const commitUrl = event.commit_sha ? `https://github.com/ethereum/${repoPath}/commit/${event.commit_sha}` : null;
                  const isLatest = index === stageEvents.length - 1;
                  return (
                    <TimelineNode key={`${event.commit_date}-${event.bucket}-${index}`} dot={STAGE_DOT[event.bucket] ?? 'bg-slate-400'} isLatest={isLatest} isLast={index === stageEvents.length - 1}>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-semibold text-foreground">{event.upgrade || 'Upgrade'}</span>
                        <span className={cn('rounded-full border px-1.5 py-px text-[10px] font-medium', stageBadgeClass(nb))}>
                          {(nb && stageAbbreviation(nb)) || event.bucket}
                        </span>
                      </div>
                      <div className="mt-2 text-[11px] text-muted-foreground">{event.commit_date ? fmtDate(event.commit_date) : 'date unknown'}</div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px]">
                        {event.slug && (
                          <Link href={`/upgrade/${event.slug}`} className="inline-flex items-center gap-1 text-primary hover:text-primary/80">
                            View <ArrowRight className="h-3 w-3" />
                          </Link>
                        )}
                        {commitUrl && (
                          <a href={commitUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
                            <Github className="h-3 w-3" /> {event.commit_sha!.slice(0, 8)}
                          </a>
                        )}
                      </div>
                    </TimelineNode>
                  );
                })}
              </HorizontalTimeline>
            ) : (
              <div className="space-y-2">
                {upgrades.map((upgrade) => {
                  const nb = normalizeUpgradeBucket(upgrade.bucket);
                  return (
                    <div key={upgrade.slug || upgrade.upgrade_id} className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 p-2.5">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-xs font-semibold text-foreground">{upgrade.name}</p>
                          <span className={cn('inline-flex rounded-full border px-1.5 py-px text-[10px] font-medium', stageBadgeClass(nb))}>
                            {(nb && stageAbbreviation(nb)) || upgrade.bucket}
                          </span>
                        </div>
                        {upgrade.commit_date && <p className="mt-0.5 text-[11px] text-muted-foreground">{fmtDate(upgrade.commit_date)}</p>}
                      </div>
                      {upgrade.slug && (
                        <Link href={`/upgrade/${upgrade.slug}`} className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10">
                          View <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CollapsibleTrack>
        )}

        {/* Editorial PR & review */}
        {hasPr && (
          <div className="px-1 py-2">
            <div className="px-4">
              <button
                type="button"
                onClick={() => setOpenPr((o) => !o)}
                aria-expanded={openPr}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted"
              >
                {openPr ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                <GitPullRequest className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-foreground">Editorial PR &amp; review</span>
                <span className={cn('ml-auto inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium', governanceState!.current_pr_state === 'open' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : governanceState!.current_pr_state === 'merged' ? 'border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300' : 'border-slate-500/20 bg-slate-500/10 text-muted-foreground')}>
                  PR {governanceState!.current_pr_state || 'unknown'}
                </span>
              </button>
              {openPr && (
                <div className="mt-2 grid grid-cols-1 gap-3 px-2 sm:grid-cols-3">
                  <div>
                    <p className="mb-0.5 text-[11px] font-medium text-muted-foreground">Active pull request</p>
                    {governanceState!.pr_url ? (
                      <a href={governanceState!.pr_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
                        <Github className="h-4 w-4 shrink-0" /> PR #{governanceState!.pr_number}
                        <ExternalLink className="h-3 w-3 opacity-60" />
                      </a>
                    ) : (
                      <p className="text-sm font-semibold text-foreground">#{governanceState!.pr_number}</p>
                    )}
                  </div>
                  {governanceState!.waiting_on && (
                    <div>
                      <p className="mb-0.5 text-[11px] font-medium text-muted-foreground">Review stage / waiting on</p>
                      <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatWaitingOn(governanceState!.waiting_on)}</p>
                    </div>
                  )}
                  {governanceState!.days_since_last_action != null && (
                    <div>
                      <p className="mb-0.5 text-[11px] font-medium text-muted-foreground">Last queue update</p>
                      <p className="text-sm font-semibold text-foreground">
                        {governanceState!.days_since_last_action === 0 ? 'Updated today' : `${governanceState!.days_since_last_action} day${governanceState!.days_since_last_action !== 1 ? 's' : ''} ago`}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
