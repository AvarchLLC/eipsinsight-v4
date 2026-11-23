'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, ArrowUpRight, ExternalLink, MessageSquare, Clock, Eye, Heart, Tag } from 'lucide-react';
import Link from 'next/link';
import { client } from '@/lib/orpc';
import { CopyLinkButton } from '@/components/header';
import { InfiniteSlider } from '@/components/ui/infinite-slider';
import { ProgressiveBlur } from '@/components/ui/progressive-blur';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LedgerBadge } from '@/components/ledger/badge';

type TrendingProposal = {
  proposalNumber: number;
  proposalType: 'EIP' | 'ERC' | 'RIP';
  title: string;
  status?: string;
  category?: string;
  author?: string;
  authorAvatar?: string;
  authorUsername?: string;
  replies: number;
  views?: number;
  likes?: number;
  tags?: string[];
  lastActivityAt: string;
  destination: 'internal' | 'magicians';
  url: string;
  magiciansUrl: string;
};

const typeColors = {
  EIP: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  ERC: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/20',
  RIP: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/20',
};

const statusColors: Record<string, string> = {
  Draft: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/20',
  Review: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/20',
  'Last Call': 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20',
  Final: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  Withdrawn: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/20',
  Stagnant: 'bg-slate-500/15 text-slate-600 dark:text-slate-500 border-slate-500/20',
};

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function ProposalCard({ proposal }: { proposal: TrendingProposal }) {
  const authorInitials = proposal.author
    ? proposal.author.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : proposal.authorUsername
    ? proposal.authorUsername.slice(0, 2).toUpperCase()
    : '??';
  const authorName = proposal.author || proposal.authorUsername || 'Unknown Author';

  return (
    <motion.a
      href={proposal.url}
      target={proposal.destination === 'magicians' ? '_blank' : '_self'}
      rel={proposal.destination === 'magicians' ? 'noopener noreferrer' : undefined}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="group relative flex h-[220px] w-[300px] shrink-0 flex-col rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] p-3.5 text-[var(--ink)] transition-colors hover:border-[var(--ink)]"
    >
      {/* Header: Badge + Status */}
      <div className="mb-2 flex items-center gap-2">
        <LedgerBadge
          token={proposal.proposalType}
          label={`${proposal.proposalType}-${proposal.proposalNumber}`}
        />
        {proposal.status && <LedgerBadge token={proposal.status} />}
      </div>

      {/* Title */}
      <h3 className="mb-2 line-clamp-3 min-h-[2.8rem] text-sm font-semibold text-[var(--ink)] transition-colors group-hover:text-[var(--brand-strong)]">
        {proposal.title}
      </h3>

      {/* Tags + Category */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {proposal.tags && proposal.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {proposal.tags.slice(0, 2).map((tag, idx) => {
              // Defensive: upstream (Ethereum Magicians) may return tag objects; never render an object as a child.
              const label = typeof tag === 'string' ? tag : ((tag as { name?: string; slug?: string })?.name ?? (tag as { slug?: string })?.slug ?? '');
              if (!label) return null;
              return (
                <span
                  key={idx}
                  className="inline-flex items-center gap-0.5 rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface-2)] px-1.5 py-0.5 text-[9px] font-mono text-[var(--ink-muted)]"
                >
                  <Tag className="h-2 w-2" />
                  {label}
                </span>
              );
            })}
          </div>
        )}
        {proposal.category && (
          <span className="rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface-2)] px-1.5 py-0.5 text-[9px] font-mono text-[var(--ink-muted)]">
            {proposal.category}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="mb-2 flex items-center gap-2.5 text-[10px] text-[var(--ink-muted)]">
        {proposal.views !== undefined && (
          <div className="flex items-center gap-1 font-mono">
            <Eye className="h-2.5 w-2.5" />
            <span className="font-medium">{proposal.views}</span>
          </div>
        )}
        {proposal.likes !== undefined && proposal.likes > 0 && (
          <div className="flex items-center gap-1 font-mono text-[var(--c-withdrawn)]">
            <Heart className="h-2.5 w-2.5 fill-current opacity-70" />
            <span className="font-medium">{proposal.likes}</span>
          </div>
        )}
        <div className="flex items-center gap-1 font-mono text-[var(--brand-strong)]">
          <MessageSquare className="h-2.5 w-2.5" />
          <span className="font-medium">{proposal.replies}</span>
        </div>
      </div>

      {/* Author + Time + CTA */}
      <div className="mt-auto flex items-center justify-between border-t border-[var(--border)] pt-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar className="h-7 w-7 shrink-0 border border-[var(--border)]">
            <AvatarImage src={proposal.authorAvatar} alt={authorName} />
            <AvatarFallback className="bg-[var(--surface-2)] text-[10px] font-semibold text-[var(--ink)]">
              {authorInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[11px] font-medium text-[var(--ink)]">{authorName}</span>
            <div className="flex items-center gap-1 text-[9px] text-[var(--ink-muted)]">
              <Clock className="h-2 w-2 shrink-0" />
              <span>{formatTimeAgo(proposal.lastActivityAt)}</span>
            </div>
          </div>
        </div>
        <div className="ml-2 flex shrink-0 items-center gap-1 rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface-2)] p-1 text-[var(--ink-muted)] transition-colors group-hover:border-[var(--ink)] group-hover:text-[var(--ink)]">
          {proposal.destination === 'internal' ? (
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          ) : (
            <ExternalLink className="h-3 w-3" />
          )}
        </div>
      </div>
    </motion.a>
  );
}

function SkeletonCard() {
  return (
    <div className="h-[170px] w-[300px] shrink-0 animate-pulse rounded-lg border border-border bg-muted/40">
      <div className="flex flex-col gap-2 p-3.5">
        <div className="h-4 w-20 rounded bg-muted" />
        <div className="h-4 w-full rounded bg-muted" />
        <div className="flex gap-1.5">
          <div className="h-3 w-14 rounded bg-muted" />
          <div className="h-3 w-16 rounded bg-muted" />
        </div>
        <div className="flex gap-2">
          <div className="h-2.5 w-10 rounded bg-muted" />
          <div className="h-2.5 w-8 rounded bg-muted" />
        </div>
        <div className="mt-auto flex items-center gap-2 border-t border-border/30 pt-2.5">
          <div className="h-7 w-7 rounded-full bg-muted" />
          <div className="h-2.5 w-20 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

export default function TrendingProposals({ hideHeader = false }: { hideHeader?: boolean } = {}) {
  const [proposals, setProposals] = useState<TrendingProposal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTrendingProposals() {
      try {
        const data = await client.governanceTimeline.getTrendingProposals({ limit: 6 });
        setProposals(data || []);
      } catch (error) {
        console.error('Failed to fetch trending proposals:', error);
        setProposals([]);
      } finally {
        setLoading(false);
      }
    }
    fetchTrendingProposals();
  }, []);

  return (
    <section id="trending-proposals" className="relative w-full pt-2 pb-4">
      {!hideHeader && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <Link
              href="/explore/trending"
              className="dec-title group inline-flex items-center gap-1 text-xl font-semibold tracking-tight text-foreground transition-colors hover:text-primary sm:text-2xl"
            >
              Trending Proposals
              <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
            </Link>
            <p className="mt-1 text-sm text-muted-foreground">
              Most impactful proposals shaping Ethereum today
            </p>
          </div>
          <CopyLinkButton sectionId="trending-proposals" tooltipLabel="Copy link" className="h-8 w-8 rounded-md" />
        </header>
      )}

      <div className="relative w-full">
        {loading ? (
          <div className="flex gap-3 overflow-hidden py-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : proposals.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-muted-foreground">No active proposal discussions at the moment.</p>
          </div>
        ) : (
          <div className="relative">
            {/*
             * THE FIX: InfiniteSlider has overflow:hidden baked in, which clips
             * cards top and bottom. We escape it with the negative margin trick:
             *
             *   -my-8  pulls the wrapper's edges inward so the parent layout
             *          is unaffected (no extra space created)
             *   py-8   pushes the slider's own content outward past the clipping
             *          boundary so shadows/glows have room to breathe
             *
             * The section itself must NOT have overflow:hidden for this to work.
             * Any ancestor with overflow:hidden will re-clip — check your layout.
             */}
            <div className="py-6">
              <InfiniteSlider speed={40} speedOnHover={15} gap={12} className="w-full">
                {proposals.map((proposal) => (
                  <ProposalCard
                    key={`${proposal.proposalType}-${proposal.proposalNumber}`}
                    proposal={proposal}
                  />
                ))}
              </InfiniteSlider>
            </div>

            {/* Left edge fade */}
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-background to-transparent" />
            {/* Right edge fade */}
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-background to-transparent" />

            <ProgressiveBlur
              className="pointer-events-none absolute left-0 top-0 z-10 h-full w-32"
              direction="left"
              blurIntensity={2}
            />
            <ProgressiveBlur
              className="pointer-events-none absolute right-0 top-0 z-10 h-full w-32"
              direction="right"
              blurIntensity={2}
            />
          </div>
        )}
      </div>
    </section>
  );
}