'use client';

import Link from 'next/link';
import { Flame, ExternalLink, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TrendingProposalRow {
  eipId: number;
  number: number;
  title: string;
  status: string;
  score: number;
  scoreDelta: number;
  trendingReason: string;
  lastActivity: string | null;
  repo: string;
  kind: 'EIP' | 'ERC' | 'RIP';
  topEvents: Array<{ type: string; count: number }>;
  topLinkedPRs: Array<{ prNumber: number; title: string; state: string }>;
}

interface TrendingListProps {
  proposals: TrendingProposalRow[];
  loading: boolean;
  selectedEipId: number | null;
  onSelect: (proposal: TrendingProposalRow) => void;
  windowLabel: string;
}

const statusClasses: Record<string, string> = {
  Draft: 'border-slate-500/30 bg-slate-500/15 text-slate-300',
  Review: 'border-blue-500/30 bg-blue-500/15 text-blue-300',
  'Last Call': 'border-amber-500/30 bg-amber-500/15 text-amber-300',
  Final: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300',
  Living: 'border-cyan-500/30 bg-cyan-500/15 text-cyan-300',
  Stagnant: 'border-gray-500/30 bg-gray-500/15 text-gray-300',
  Withdrawn: 'border-rose-500/30 bg-rose-500/15 text-rose-300',
};

function formatLastActivity(dateStr: string | null): string {
  if (!dateStr) return 'recent';
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function proposalHref(row: TrendingProposalRow) {
  if (row.kind === 'ERC') return `/erc/${row.number}`;
  if (row.kind === 'RIP') return `/rips/${row.number}`;
  return `/eips/${row.number}`;
}

function timelineHref(row: TrendingProposalRow) {
  return `/timeline?repo=${row.repo}&proposal=${row.kind}-${row.number}`;
}

export function TrendingList({ proposals, loading, selectedEipId, onSelect, windowLabel }: TrendingListProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card/60 p-4">
        <div className="animate-pulse space-y-3">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="h-28 rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card/60 p-10 text-center text-muted-foreground">
        No trending proposals for current filters.
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card/60">
      <div className="border-b border-border px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Trending</p>
        <h2 className="dec-title mt-1 text-xl font-semibold tracking-tight text-foreground">What is trending now</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">Ranked proposals in {windowLabel} with explainable activity drivers.</p>
      </div>
      <div className="space-y-2 p-3">
        {proposals.map((proposal) => {
          const selected = selectedEipId === proposal.eipId;
          return (
            <article
              key={proposal.eipId}
              className={cn(
                'rounded-lg border p-3 transition-colors',
                selected
                  ? 'border-primary/45 bg-primary/10'
                  : 'border-border bg-muted/20 hover:border-primary/35 hover:bg-primary/10'
              )}
            >
              <button
                type="button"
                onClick={() => onSelect(proposal)}
                className="w-full text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-primary">{proposal.kind}-{proposal.number}</span>
                      <span className={cn('rounded-md border px-2 py-0.5 text-[11px] font-medium', statusClasses[proposal.status] || 'border-border bg-muted/50 text-muted-foreground')}>
                        {proposal.status}
                      </span>
                      <span className="rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[11px] uppercase text-muted-foreground">
                        {proposal.repo}
                      </span>
                    </div>
                    <h3 className="mt-1 line-clamp-1 text-sm font-semibold text-foreground">{proposal.title}</h3>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{proposal.trendingReason}</p>
                  </div>

                  <div className="shrink-0 text-right">
                    <div className="inline-flex items-center gap-1 text-sm font-bold text-primary">
                      <Flame className="h-4 w-4" />
                      {proposal.score}
                    </div>
                    <p className={cn('text-xs', proposal.scoreDelta >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                      {proposal.scoreDelta >= 0 ? '+' : ''}{proposal.scoreDelta} delta
                    </p>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatLastActivity(proposal.lastActivity)}
                    </p>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {proposal.topEvents.slice(0, 4).map((event) => (
                    <span key={`${proposal.eipId}-${event.type}`} className="rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                      +{event.count} {event.type}
                    </span>
                  ))}
                </div>
              </button>

              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={proposalHref(proposal)} className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground">
                  Open proposal
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
                <Link href={timelineHref(proposal)} className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground">
                  Timeline
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
                {proposal.topLinkedPRs[0] && (
                  <Link
                    href={`/pr/${proposal.repo}/${proposal.topLinkedPRs[0].prNumber}`}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Open PR #{proposal.topLinkedPRs[0].prNumber}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
