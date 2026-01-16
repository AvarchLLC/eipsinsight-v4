'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { PageHeader, SectionSeparator } from '@/components/header';
import { client } from '@/lib/orpc';
import { Loader2 } from 'lucide-react';
import { PRVolumeChart } from './_components/pr-volume-chart';
import { PROpenStateSnapshot } from './_components/pr-open-state-snapshot';
import { PRLifecycleFunnel } from './_components/pr-lifecycle-funnel';
import { PRTimeToOutcome } from './_components/pr-time-to-outcome';
import { PRStalenessSection } from './_components/pr-staleness-section';

type RepoFilter = 'eips' | 'ercs' | 'rips' | undefined;

export default function PRAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<RepoFilter>('eips');
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [openState, setOpenState] = useState<any>(null);
  const [governanceStates, setGovernanceStates] = useState<any[]>([]);
  const [labels, setLabels] = useState<any[]>([]);
  const [lifecycleData, setLifecycleData] = useState<any[]>([]);
  const [timeToOutcome, setTimeToOutcome] = useState<any[]>([]);
  const [stalenessData, setStalenessData] = useState<any[]>([]);
  const [highRiskPRs, setHighRiskPRs] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const apiParams = selectedRepo ? { repo: selectedRepo } : {};

        const [
          monthly,
          openStateData,
          governance,
          labelsData,
          lifecycle,
          timeData,
          staleness,
          highRisk,
        ] = await Promise.all([
          client.analytics.getPRMonthlyActivity(apiParams),
          client.analytics.getPROpenState(apiParams),
          client.analytics.getPRGovernanceStates(apiParams),
          client.analytics.getPRLabels(apiParams),
          client.analytics.getPRLifecycleFunnel({}),
          client.analytics.getPRTimeToOutcome(apiParams),
          client.analytics.getPRStaleness(apiParams),
          client.analytics.getPRStaleHighRisk({ days: 30, ...apiParams }),
        ]);

        setMonthlyData(monthly);
        setOpenState(openStateData);
        setGovernanceStates(governance);
        setLabels(labelsData);
        setLifecycleData(lifecycle);
        setTimeToOutcome(timeData);
        setStalenessData(staleness);
        setHighRiskPRs(highRisk);
      } catch (err) {
        console.error('Failed to fetch PR analytics:', err);
        setError('Failed to load PR analytics data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedRepo]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background relative w-full overflow-hidden min-h-screen">
      {/* Seamless Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(52,211,153,0.15),_transparent_50%),_radial-gradient(ellipse_at_bottom_right,_rgba(6,182,212,0.12),_transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(34,211,238,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(34,211,238,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        <div className="absolute top-0 left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-br from-cyan-400/10 via-emerald-400/5 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* Page Header */}
        <PageHeader
          title="PR Analytics"
          description="Governance throughput, review health, and proposal flow across Ethereum repositories."
          sectionId="pr-analytics"
          className="bg-background/80 backdrop-blur-xl"
        />

        {/* Repository Filter */}
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4 pb-2">
          <div className="flex items-center gap-3">
            <label htmlFor="repo-filter" className="text-sm font-medium text-slate-300">
              Repository:
            </label>
            <select
              id="repo-filter"
              value={selectedRepo || 'all'}
              onChange={(e) => setSelectedRepo(e.target.value === 'all' ? undefined : (e.target.value as RepoFilter))}
              className="rounded-lg border border-cyan-400/20 bg-slate-950/50 backdrop-blur-sm px-3 py-1.5 text-sm text-white focus:border-cyan-400/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 transition-all"
            >
              <option value="all">All Repositories</option>
              <option value="eips">EIPs</option>
              <option value="ercs">ERCs</option>
              <option value="rips">RIPs</option>
            </select>
          </div>
        </div>

        <SectionSeparator />

        {/* Section 1: PR Volume Over Time */}
        <section className="relative w-full bg-slate-950/30">
          <PageHeader
            title="PR Volume Over Time"
            description={`Monthly PR activity for ${selectedRepo ? selectedRepo.toUpperCase() : 'all repositories'} since 2015`}
            sectionId="pr-volume"
            className="bg-slate-950/30"
          />
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-6">
            <PRVolumeChart data={monthlyData} />
          </div>
        </section>

        <SectionSeparator />

        {/* Section 2: Current Open PR State */}
        <section className="relative w-full bg-slate-950/30">
          <PageHeader
            title="Current Open PR State"
            description="Snapshot of open PRs and their governance states"
            sectionId="open-state"
            className="bg-slate-950/30"
          />
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-6">
            <PROpenStateSnapshot
              openState={openState}
              governanceStates={governanceStates}
              labels={labels}
            />
          </div>
        </section>

        <SectionSeparator />

        {/* Section 3: PR Lifecycle & Latency */}
        <section className="relative w-full bg-slate-950/30">
          <PageHeader
            title="PR Lifecycle & Latency"
            description="Governance efficiency metrics: lifecycle stages and time-to-outcome"
            sectionId="lifecycle"
            className="bg-slate-950/30"
          />
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PRLifecycleFunnel data={lifecycleData} />
              <PRTimeToOutcome data={timeToOutcome} />
            </div>
          </div>
        </section>

        <SectionSeparator />

        {/* Section 4: Staleness & Risk */}
        <section className="relative w-full bg-slate-950/30">
          <PageHeader
            title="Staleness & Risk"
            description="Identify PRs that may be abandoned or require attention"
            sectionId="staleness"
            className="bg-slate-950/30"
          />
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-6">
            <PRStalenessSection
              stalenessData={stalenessData}
              highRiskPRs={highRiskPRs}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
