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
import { SectionSeparator } from '@/components/header';

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
    <div className="bg-background relative w-full overflow-hidden min-h-screen">
      {/* Background gradient */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(251,146,60,0.08),_transparent_50%)]" />
      </div>

      {/* Header */}
      <section className="relative w-full pt-8 pb-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Back link */}
          <Link
            href="/explore"
            className={cn(
              "inline-flex items-center gap-2 mb-6",
              "text-sm text-slate-400 hover:text-white transition-colors"
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Explore
          </Link>

          {/* Page Title */}
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-orange-500/15 border border-orange-400/30">
              <TrendingUp className="h-7 w-7 text-orange-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                Trending Proposals
              </h1>
              <p className="text-slate-400">
                Discover the most active EIPs over the last 7 days
              </p>
            </div>
          </div>
        </div>
      </section>

      <SectionSeparator />

      {/* Main Content */}
      <section className="relative w-full py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main List (2/3 width) */}
            <div className="lg:col-span-2">
              <TrendingList proposals={proposals} loading={proposalsLoading} />
            </div>

            {/* Sidebar (1/3 width) */}
            <div className="space-y-6">
              <TrendingScoreInfo />
            </div>
          </div>
        </div>
      </section>

      <SectionSeparator />

      {/* Heatmap Section */}
      <section className="relative w-full py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <TrendingHeatmap data={heatmapData} loading={heatmapLoading} />
        </div>
      </section>

      {/* Bottom spacing */}
      <div className="h-16" />
    </div>
  );
}
