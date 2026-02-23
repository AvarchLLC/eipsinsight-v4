'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, ChevronLeft, ChevronRight, Flame, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { client } from '@/lib/orpc';
import Link from 'next/link';

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
  'Draft': 'bg-slate-500/20 text-slate-700 dark:text-slate-300',
  'Review': 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
  'Last Call': 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
  'Final': 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
  'Stagnant': 'bg-orange-500/20 text-orange-700 dark:text-orange-300',
  'Withdrawn': 'bg-red-500/20 text-red-700 dark:text-red-300',
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
          "relative flex-shrink-0 w-72 p-5 rounded-xl",
          "bg-white dark:bg-slate-900/80 shadow-sm dark:shadow-none",
          "border border-slate-200 dark:border-slate-700/40 ring-1 ring-slate-200/40 dark:ring-transparent",
          "hover:border-cyan-300/60 dark:hover:border-cyan-400/40 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-cyan-500/10",
          "transition-all duration-200 cursor-pointer"
        )}
      >
        {/* Trending Badge */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Flame className="h-4 w-4 text-orange-400" />
            <span className="text-xs font-medium text-orange-600 dark:text-orange-300">
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
        <h3 className="dec-title text-sm font-medium tracking-tight text-slate-900 dark:text-white mb-3 line-clamp-2">
          {proposal.title}
        </h3>

        {/* Trending Reason */}
        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/50 mb-3">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            <span className="text-slate-600 dark:text-slate-500">Trending:</span>{' '}
            {proposal.trendingReason}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700/50">
          <span className="text-xs text-slate-600 dark:text-slate-500">
            {proposal.lastActivity
              ? `Last activity: ${new Date(proposal.lastActivity).toLocaleDateString()}`
              : 'Recent activity'}
          </span>
          <ArrowRight className="h-4 w-4 text-slate-500 dark:text-slate-500" />
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
      <section className="relative w-full py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="animate-pulse">
            <div className="h-8 w-56 bg-slate-200 dark:bg-slate-800 rounded mb-6" />
            <div className="flex gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex-shrink-0 w-72 h-48 bg-slate-200 dark:bg-slate-800 rounded-xl" />
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
    <section className="relative w-full py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-400/20">
              <TrendingUp className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <h2 className="dec-title text-xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-2xl">Trending Proposals</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">Most active in the last 7 days</p>
            </div>
          </div>

          <Link
            href="/explore/trending"
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-lg",
              "bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50",
              "text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white",
              "hover:border-cyan-400/40 transition-all"
            )}
          >
            View All
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Carousel */}
        <div className="relative">
          {/* Left scroll button */}
          <button
            onClick={() => scroll('left')}
            className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 z-10",
              "flex h-10 w-10 items-center justify-center rounded-full",
              "bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/50 backdrop-blur-sm",
              "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-cyan-400/50",
              "transition-all duration-200"
            )}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Scrollable container */}
          <div
            ref={scrollContainerRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide px-12 py-2"
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
              "bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/50 backdrop-blur-sm",
              "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-cyan-400/50",
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
