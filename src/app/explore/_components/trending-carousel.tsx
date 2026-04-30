'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, ChevronLeft, ChevronRight, Flame, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { client } from '@/lib/orpc';
import Link from 'next/link';
import { CopyLinkButton } from '@/components/header';

interface TrendingProposal {
  eipId: number;
  number: number;
  title: string;
  status: string;
  score: number;
  trendingReason: string;
  lastActivity: string | null;
}

const statusColors: Record<string, string> = {
  Draft: 'bg-slate-500/20 text-slate-300',
  Review: 'bg-blue-500/20 text-blue-300',
  'Last Call': 'bg-amber-500/20 text-amber-300',
  Final: 'bg-emerald-500/20 text-emerald-300',
  Stagnant: 'bg-orange-500/20 text-orange-300',
  Withdrawn: 'bg-red-500/20 text-red-300',
};

function TrendingEIPCard({ proposal, index }: { proposal: TrendingProposal; index: number }) {
  const statusColor = statusColors[proposal.status] || statusColors['Draft'];

  return (
    <Link href={`/eips/${proposal.number}`}>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        whileHover={{ scale: 1.02, y: -4 }}
        className={cn(
          "relative flex h-[400px] w-72 flex-shrink-0 flex-col rounded-xl p-5",
          "bg-card shadow-sm",
          "border border-border ring-1 ring-border/50",
          "hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10",
          "transition-all duration-200 cursor-pointer"
        )}
      >
        {/* Trending Badge */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Flame className="h-4 w-4 text-orange-400" />
            <span className="text-xs font-medium text-orange-300">
              Score: {proposal.score}
            </span>
          </div>
          <span className={cn(
            "px-2 py-0.5 rounded-full text-xs font-medium",
            statusColor
          )}>
            {proposal.status}
          </span>
        </div>

        {/* EIP Number */}
        <div className="flex items-baseline gap-2 mb-2">
          <span className="dec-title text-lg font-bold text-cyan-600 dark:text-cyan-400">
            EIP-{proposal.number}
          </span>
        </div>

        {/* Title */}
        <h3 className="dec-title mb-3 min-h-[5rem] line-clamp-3 text-sm font-medium tracking-tight text-foreground">
          {proposal.title}
        </h3>

        {/* Trending Reason */}
        <div className="mb-3 min-h-[4.5rem] rounded-lg bg-muted/50 p-2">
          <p className="line-clamp-2 text-xs text-muted-foreground">
            <span className="text-muted-foreground">Trending:</span>{' '}
            {proposal.trendingReason}
          </p>
        </div>

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between border-t border-border pt-2">
          <span className="text-xs text-muted-foreground">
            {proposal.lastActivity
              ? `Last activity: ${new Date(proposal.lastActivity).toLocaleDateString()}`
              : 'Recent activity'}
          </span>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </motion.div>
    </Link>
  );
}

export function TrendingCarousel() {
  const [trending, setTrending] = useState<TrendingProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchTrending() {
      try {
        const data = await client.explore.getTrendingProposals({ limit: 10 });
        setTrending(data);
      } catch (err) {
        console.error('Failed to fetch trending proposals:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchTrending();
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (loading) {
    return (
      <section id="trending-proposals" className="relative w-full py-8">
        <div className="mx-auto w-full px-3 sm:px-4 lg:px-5 xl:px-6">
          <div className="animate-pulse">
            <div className="mb-6 h-8 w-56 rounded bg-muted/60" />
            <div className="flex gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-48 w-72 flex-shrink-0 rounded-xl bg-muted/50" />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (trending.length === 0) {
    return null;
  }

  return (
    <section id="trending-proposals" className="relative w-full py-6">
      <div className="mx-auto w-full px-3 sm:px-4 lg:px-5 xl:px-6">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-primary/30 bg-primary/10 p-2">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Trending Proposals</h2>
              <p className="text-sm text-muted-foreground">Most active in the last 7 days</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/explore/trending"
              className={cn(
                "flex items-center gap-1.5 rounded-lg border border-border bg-muted/60 px-4 py-2",
                "text-sm text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-foreground transition-all"
              )}
            >
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
            <CopyLinkButton sectionId="trending-proposals" />
          </div>
        </div>

        {/* Carousel */}
        <div className="relative">
          {/* Left scroll button */}
          <button
            onClick={() => scroll('left')}
            className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 z-10",
              "flex h-10 w-10 items-center justify-center rounded-full",
              "bg-background/95 border border-border backdrop-blur-sm",
              "text-muted-foreground hover:text-foreground hover:border-primary/40",
              "transition-all duration-200"
            )}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Scrollable container */}
          <div
            ref={scrollContainerRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide px-12 pb-1 pt-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {trending.map((proposal, index) => (
              <TrendingEIPCard
                key={proposal.eipId}
                proposal={proposal}
                index={index}
              />
            ))}
          </div>

          {/* Right scroll button */}
          <button
            onClick={() => scroll('right')}
            className={cn(
              "absolute right-0 top-1/2 -translate-y-1/2 z-10",
              "flex h-10 w-10 items-center justify-center rounded-full",
              "bg-background/95 border border-border backdrop-blur-sm",
              "text-muted-foreground hover:text-foreground hover:border-primary/40",
              "transition-all duration-200"
            )}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
