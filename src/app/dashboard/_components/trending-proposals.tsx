'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, ExternalLink, MessageSquare, Clock, Eye, Heart, Tag } from 'lucide-react';
import { client } from '@/lib/orpc';
import { InfiniteSlider } from '@/components/ui/infinite-slider';
import { ProgressiveBlur } from '@/components/ui/progressive-blur';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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

export default function TrendingProposals() {
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

  const typeColors = {
    EIP: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    ERC: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/20',
    RIP: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/20',
  };

  const statusColors: Record<string, string> = {
    'Draft': 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/20',
    'Review': 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/20',
    'Last Call': 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20',
    'Final': 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    'Withdrawn': 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/20',
    'Stagnant': 'bg-slate-500/15 text-slate-600 dark:text-slate-500 border-slate-500/20',
  };

  const formatTimeAgo = (dateString: string) => {
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
  };

  return (
    <section id="trending-proposals" className="relative w-full pt-2 pb-4">
      <header className="mb-4">
        <h2 className="dec-title text-xl font-semibold tracking-tight text-slate-800 dark:text-slate-200 sm:text-2xl">
          Trending Proposals
        </h2>
        <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-500">
          Most impactful proposals shaping Ethereum today
        </p>
      </header>
      <div className="relative w-full">
        {loading ? (
          <div className="flex gap-3 py-8">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-[170px] w-[300px] shrink-0 animate-pulse rounded-lg border border-slate-200 dark:border-slate-700/30 bg-slate-100 dark:bg-slate-900/40 backdrop-blur-sm"
              >
                <div className="p-3.5">
                  <div className="mb-2 h-4 w-20 rounded bg-slate-800/50" />
                  <div className="mb-2 h-4 w-full rounded bg-slate-800/50" />
                  <div className="mb-2 flex gap-1.5">
                    <div className="h-3 w-14 rounded bg-slate-800/50" />
                    <div className="h-3 w-16 rounded bg-slate-800/50" />
                  </div>
                  <div className="mb-2.5 flex gap-2">
                    <div className="h-2.5 w-10 rounded bg-slate-800/50" />
                    <div className="h-2.5 w-8 rounded bg-slate-800/50" />
                  </div>
                  <div className="mt-auto flex items-center gap-2 border-t border-slate-700/30 pt-2.5">
                    <div className="h-7 w-7 rounded-full bg-slate-800/50" />
                    <div className="h-2.5 w-20 rounded bg-slate-800/50" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : proposals.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-slate-400">No active proposal discussions at the moment.</p>
          </div>
        ) : (
          <div className="relative py-8">
            <div className="overflow-visible">
              <InfiniteSlider
                speed={40}
                speedOnHover={15}
                gap={12}
                className="w-full"
              >
              {proposals.map((proposal) => {
                const authorInitials = proposal.author 
                  ? proposal.author.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                  : proposal.authorUsername
                  ? proposal.authorUsername.slice(0, 2).toUpperCase()
                  : '??';
                const authorName = proposal.author || proposal.authorUsername || 'Unknown Author';

                return (
                  <motion.a
                    key={`${proposal.proposalType}-${proposal.proposalNumber}`}
                    href={proposal.url}
                    target={proposal.destination === 'magicians' ? '_blank' : '_self'}
                    rel={proposal.destination === 'magicians' ? 'noopener noreferrer' : undefined}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className="group relative flex h-[170px] w-[300px] shrink-0 flex-col rounded-lg border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/80 p-3.5 backdrop-blur-md transition-all duration-300 hover:border-slate-300 dark:hover:border-cyan-400/60 hover:shadow-xl dark:hover:shadow-cyan-500/15 shadow-sm"
                  >
                    {/* Header: Badge + Status */}
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${typeColors[proposal.proposalType]}`}
                      >
                        {proposal.proposalType}-{proposal.proposalNumber}
                      </span>
                      {proposal.status && (
                        <span
                          className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-semibold ${
                            statusColors[proposal.status] || statusColors['Draft']
                          }`}
                        >
                          {proposal.status}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="mb-1.5 line-clamp-2 text-sm font-bold leading-tight text-slate-800 dark:text-slate-100 transition-colors group-hover:text-slate-900 dark:group-hover:text-white">
                      {proposal.title}
                    </h3>

                    {/* Tags + Category */}
                    <div className="mb-1.5 flex items-center gap-2 flex-wrap">
                      {proposal.tags && proposal.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {proposal.tags.slice(0, 2).map((tag, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-0.5 rounded bg-slate-200 dark:bg-slate-800/70 px-1.5 py-0.5 text-[9px] font-medium text-slate-600 dark:text-slate-400"
                            >
                              <Tag className="h-2 w-2" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {proposal.category && (
                        <span className="rounded bg-slate-200 dark:bg-slate-800/70 px-1.5 py-0.5 text-[9px] font-medium text-slate-700 dark:text-slate-300">
                          {proposal.category}
                        </span>
                      )}
                    </div>

                    {/* Stats: Views, Likes, Replies */}
                    <div className="mb-2 flex items-center gap-2.5 text-[10px] text-slate-400">
                      {proposal.views !== undefined && (
                        <div className="flex items-center gap-1">
                          <Eye className="h-2.5 w-2.5" />
                          <span className="font-medium">{proposal.views}</span>
                        </div>
                      )}
                      {proposal.likes !== undefined && proposal.likes > 0 && (
                        <div className="flex items-center gap-1 text-rose-400">
                          <Heart className="h-2.5 w-2.5 fill-rose-400/30" />
                          <span className="font-medium">{proposal.likes}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-slate-600 dark:text-cyan-400">
                        <MessageSquare className="h-2.5 w-2.5" />
                        <span className="font-medium">{proposal.replies}</span>
                      </div>
                    </div>

                    {/* Author + Time + CTA */}
                    <div className="mt-auto flex items-center justify-between border-t border-slate-200 dark:border-slate-700/40 pt-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7 border border-slate-200 dark:border-slate-700/60">
                          <AvatarImage src={proposal.authorAvatar} alt={authorName} />
                          <AvatarFallback className="bg-gradient-to-br from-slate-300 to-slate-400 dark:from-cyan-500/25 dark:to-emerald-500/25 text-[10px] font-bold text-slate-700 dark:text-cyan-200">
                            {authorInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">{authorName}</span>
                          <div className="flex items-center gap-1 text-[9px] text-slate-500">
                            <Clock className="h-2 w-2" />
                            <span>{formatTimeAgo(proposal.lastActivityAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 rounded bg-slate-200 dark:bg-cyan-500/10 px-2 py-1 text-[10px] font-semibold text-slate-700 dark:text-cyan-400 transition-colors group-hover:bg-slate-300 dark:group-hover:bg-cyan-500/20 group-hover:text-slate-900 dark:group-hover:text-cyan-300">
                        {proposal.destination === 'internal' ? (
                          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                        ) : (
                          <ExternalLink className="h-3 w-3" />
                        )}
                      </div>
                    </div>

                    {/* Hover glow effect */}
                    <div className="absolute inset-0 -z-10 rounded-lg bg-gradient-to-br from-cyan-500/0 via-cyan-500/0 to-emerald-500/0 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-15" />
                  </motion.a>
                );
              })}
              </InfiniteSlider>
            </div>

            {/* Progressive blur edges */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-white dark:from-slate-950/30 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white dark:from-slate-950/30 to-transparent" />
            <ProgressiveBlur
              className="pointer-events-none absolute left-0 top-0 h-full w-24"
              direction="left"
              blurIntensity={2}
            />
            <ProgressiveBlur
              className="pointer-events-none absolute right-0 top-0 h-full w-24"
              direction="right"
              blurIntensity={2}
            />
          </div>
        )}
      </div>
    </section>
  );
}
