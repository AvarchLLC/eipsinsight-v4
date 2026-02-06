'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { PageHeader, SectionSeparator } from '@/components/header';
import { ZoomableTimeline } from '@/app/upgrade/_components/zoomable-timeline';
import { UpgradeStatsCards } from '@/app/upgrade/_components/upgrade-stats-cards';
import { CollapsibleHeader } from '@/app/upgrade/_components/collapsible-header';
import { NetworkUpgradesChart } from '@/app/upgrade/_components/network-upgrades-chart';
import { HorizontalUpgradeTimeline } from '@/app/upgrade/_components/horizontal-upgrade-timeline';
import { UpgradeTimelineChart } from '@/app/upgrade/_components/upgrade-timeline-chart';
import { PersonaHighlights } from '@/app/upgrade/_components/persona-highlights';
import { client } from '@/lib/orpc';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Loader2 } from 'lucide-react';

interface Upgrade {
  id: number;
  slug: string;
  name: string;
  meta_eip: number | null;
  created_at: string | null;
  stats: {
    totalEIPs: number;
    executionLayer: number;
    consensusLayer: number;
    coreEIPs: number;
  };
}

export default function UpgradePage() {
  const [upgrades, setUpgrades] = useState<Upgrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [glamsterdamTimeline, setGlamsterdamTimeline] = useState<Array<{
    date: string;
    included: string[];
    scheduled: string[];
    declined: string[];
    considered: string[];
    proposed: string[];
  }>>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const [upgradesData, timelineData] = await Promise.all([
          client.upgrades.listUpgrades({}),
          client.upgrades.getUpgradeTimeline({ slug: 'glamsterdam' }).catch(() => []),
        ]);
        
        setUpgrades(upgradesData);
        setGlamsterdamTimeline(timelineData);
      } catch (err) {
        console.error('Failed to fetch upgrade data:', err);
        setError('Failed to load upgrade data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="container mx-auto px-4 py-16">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <p className="text-red-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background relative w-full overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(52,211,153,0.18),_transparent_60%)]" />
        <div className="absolute top-0 left-1/2 -z-10 h-[900px] w-[900px] -translate-x-1/2 rounded-full bg-cyan-300/10 blur-3xl" />
      </div>

      {/* Collapsible Header */}
      <CollapsibleHeader />

      {/* Persona-specific Highlights */}
      <PersonaHighlights className="bg-slate-950/30" />

      <SectionSeparator />

      {/* Stats & Flowchart Section */}
      <section className="relative w-full bg-slate-950/30">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 pb-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Stats Cards */}
            <div className="flex h-full">
              <div className="w-full h-full min-h-[350px] sm:min-h-[380px] lg:min-h-[420px] flex items-stretch">
                <UpgradeStatsCards />
              </div>
            </div>

            {/* Right: EIP Inclusion Flowchart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className={cn(
                "relative rounded-xl border border-cyan-400/20",
                "bg-slate-950/50 backdrop-blur-sm overflow-hidden",
                "hover:border-cyan-400/30 hover:shadow-lg hover:shadow-cyan-500/10",
                "transition-all duration-200",
                "h-full min-h-[350px] sm:min-h-[380px] lg:min-h-[420px]"
              )}
            >
              <div className="relative w-full h-full flex items-center justify-center">
                <Image
                  src="/upgrade/eip-incl.png"
                  alt="EIP Inclusion Process Flowchart"
                  fill
                  className="object-cover"
                  draggable={false}
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <SectionSeparator />

      {/* Timeline Section */}
      <section className="relative w-full bg-slate-950/30">
        <PageHeader
          title="Ethereum Upgrade Timeline"
          description="Visual timeline of all network upgrades from Frontier to present"
          sectionId="timeline"
          className="bg-slate-950/30"
        />
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-6">
          <ZoomableTimeline
            imagePath="/upgrade/ethupgradetimeline.png"
            alt="Ethereum Network Upgrade Timeline"
          />
        </div>
      </section>

      <SectionSeparator />

      {/* Network Upgrades Chart Section */}
      <section className="relative w-full bg-slate-950/30">
        <PageHeader
          title="Network Upgrade Timeline"
          description="Interactive timeline showing all Ethereum network upgrades and their EIP implementations"
          sectionId="network-upgrades-chart"
          className="bg-slate-950/30"
        />
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-6">
          <NetworkUpgradesChart />
        </div>
      </section>

      <SectionSeparator />

      {/* Upgrades List / Roadmap Section */}
      <section className="relative w-full bg-slate-950/30">
        <PageHeader
          title="Network Upgrade Roadmap"
          description="High‑level view of recent and upcoming coordinated Ethereum network upgrades."
          sectionId="upgrades"
          className="bg-slate-950/30"
        />
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-6">
          <div className="mb-6">
            <HorizontalUpgradeTimeline />
          </div>

          {/* Glamsterdam Timeline Chart */}
          {glamsterdamTimeline.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-6"
            >
              <UpgradeTimelineChart data={glamsterdamTimeline} upgradeName="Glamsterdam" />
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}
