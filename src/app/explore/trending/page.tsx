'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { client } from '@/lib/orpc';
import Link from 'next/link';
import { TrendingScoreInfo } from './_components/trending-score-info';
import { TrendingList } from './_components/trending-list';
import { TrendingHeatmap } from './_components/trending-heatmap';

interface TrendingProposal {
  eipId: number;
  number: number;
  title: string;
  status: string;
  score: number;
  trendingReason: string;
  lastActivity: string | null;
}

interface HeatmapRow {
  eipNumber: number;
  title: string;
  totalActivity: number;
  dailyActivity: Array<{ date: string; value: number }>;
}

export default function TrendingPage() {
  const [proposals, setProposals] = useState<TrendingProposal[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapRow[]>([]);
  const [proposalsLoading, setProposalsLoading] = useState(true);
  const [heatmapLoading, setHeatmapLoading] = useState(true);

  // Fetch trending proposals
  useEffect(() => {
    async function fetchTrending() {
      try {
        const data = await client.explore.getTrendingProposals({ limit: 30 });
        setProposals(data);
      } catch (err) {
        console.error('Failed to fetch trending proposals:', err);
      } finally {
        setProposalsLoading(false);
      }
    }
    fetchTrending();
  }, []);

  // Fetch heatmap data
  useEffect(() => {
    async function fetchHeatmap() {
      try {
        const data = await client.explore.getTrendingHeatmap({ topN: 10 });
        setHeatmapData(data);
      } catch (err) {
        console.error('Failed to fetch heatmap data:', err);
      } finally {
        setHeatmapLoading(false);
      }
    }
    fetchHeatmap();
  }, []);

  return (
    <div className="bg-background relative w-full min-h-screen">
      {/* Background gradient */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(251,146,60,0.06),_transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(251,146,60,0.08),_transparent_50%)]" />
      </div>

      {/* Header */}
      <section className="relative w-full pt-4 pb-2">
        <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-6 xl:px-8">
          <Link
            href="/explore"
            className={cn(
              "inline-flex items-center gap-2 mb-3",
              "text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Explore
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/15 border border-orange-400/30 dark:border-orange-400/30">
              <TrendingUp className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h1 className="dec-title text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                Trending Proposals
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Discover the most active EIPs over the last 7 days
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="relative w-full py-4 pb-6">
        <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-6 xl:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Main List (2/3 width) */}
            <div className="lg:col-span-2">
              <TrendingList proposals={proposals} loading={proposalsLoading} />
            </div>

            {/* Sidebar (1/3 width) */}
            <div>
              <TrendingScoreInfo />
            </div>
          </div>
        </div>
      </section>

      {/* Heatmap Section */}
      <section className="relative w-full py-4 pb-8">
        <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-6 xl:px-8">
          <TrendingHeatmap data={heatmapData} loading={heatmapLoading} />
        </div>
      </section>
    </div>
  );
}
