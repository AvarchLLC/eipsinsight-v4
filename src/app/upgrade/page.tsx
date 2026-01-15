'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { PageHeader, SectionSeparator } from '@/components/header';
import { ZoomableTimeline } from '@/app/upgrade/_components/zoomable-timeline';
import { UpgradeStatsCards } from '@/app/upgrade/_components/upgrade-stats-cards';
import { CollapsibleHeader } from '@/app/upgrade/_components/collapsible-header';
import { NetworkUpgradesChart } from '@/app/upgrade/_components/network-upgrades-chart';
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

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const upgradesData = await client.upgrades.listUpgrades({});
        setUpgrades(upgradesData);
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


        
      <SectionSeparator />
      

      {/* Stats & Flowchart Section */}
      <section className="relative w-full bg-slate-950/30">
      <div className='pb-5'>  </div>
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-6">
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
        <div className="container mx-auto max-w-7xl px-1 sm:px-2 lg:px-3 pb-3">
          <NetworkUpgradesChart />
        </div>
      </section>

      <SectionSeparator />

      {/* Upgrades List Section */}
      {upgrades.length > 0 && (
        <>
          <section className="relative w-full bg-slate-950/30">
            <PageHeader
              title="All Network Upgrades"
              description="Browse individual upgrade details, EIP composition, and governance history"
              sectionId="upgrades"
              className="bg-slate-950/30"
            />
            <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upgrades.map((upgrade, index) => (
                  <motion.div
                    key={upgrade.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Link href={`/upgrade/${upgrade.slug}`}>
                      <div
                        className={cn(
                          "group relative p-6 rounded-xl border border-cyan-400/20",
                          "bg-gradient-to-br from-slate-900/80 to-slate-950/80 backdrop-blur-sm",
                          "hover:border-cyan-400/40 hover:shadow-xl hover:shadow-cyan-500/10",
                          "transition-all duration-200 cursor-pointer"
                        )}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <h3 className="text-xl font-bold text-white group-hover:text-cyan-300 transition-colors">
                            {upgrade.name}
                          </h3>
                          <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                        </div>
                        {upgrade.meta_eip && (
                          <p className="text-sm text-slate-400 mb-3">
                            Meta EIP: {upgrade.meta_eip}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span>{upgrade.stats.totalEIPs} EIPs</span>
                          {upgrade.created_at && (
                            <span>
                              {new Date(upgrade.created_at).getFullYear()}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
