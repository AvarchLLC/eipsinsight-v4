'use client';

import React from 'react';
import Link from 'next/link';
import ReactECharts from 'echarts-for-react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type UpgradeOption = {
  slug: string;
  label: string;
};

type Counts = {
  included: number;
  scheduled: number;
  considered: number;
  proposed: number;
  declined: number;
};

type DeveloperUpgradeWatchSectionProps = {
  sectionTitleClass: string;
  sectionSubtitleClass: string;
  upgradeWatchSlug: string;
  setUpgradeWatchSlug: (value: string) => void;
  upgradeOptions: UpgradeOption[];
  upgradeTimelineLoading: boolean;
  upgradeWatchChartOption: unknown;
  latestCounts: Counts;
};

export default function DeveloperUpgradeWatchSection({
  sectionTitleClass,
  sectionSubtitleClass,
  upgradeWatchSlug,
  setUpgradeWatchSlug,
  upgradeOptions,
  upgradeTimelineLoading,
  upgradeWatchChartOption,
  latestCounts,
}: DeveloperUpgradeWatchSectionProps) {
  return (
    <section className="mb-6">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className={sectionTitleClass}>Upgrade Watch</h2>
          <p className={sectionSubtitleClass}>Compact EIP Composition Timeline by upgrade.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={upgradeWatchSlug}
            onChange={(e) => setUpgradeWatchSlug(e.target.value)}
            className="h-8 rounded-md border border-border bg-muted/40 px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            {upgradeOptions.map((opt) => (
              <option key={opt.slug} value={opt.slug}>
                {opt.label}
              </option>
            ))}
          </select>
          <Link
            href="/upgrade"
            className="inline-flex h-8 items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2.5 text-xs font-medium text-primary hover:bg-primary/15"
          >
            Explore Upgrade
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card/60 p-3">
        {upgradeTimelineLoading ? (
          <div className="h-[220px] animate-pulse rounded-lg bg-muted" />
        ) : !upgradeWatchChartOption ? (
          <div className="flex h-[220px] items-center justify-center rounded-lg border border-border/70 bg-muted/30 text-sm text-muted-foreground">
            No timeline data available for this upgrade.
          </div>
        ) : (
          <ReactECharts option={upgradeWatchChartOption as object} style={{ height: '220px', width: '100%' }} opts={{ renderer: 'svg' }} />
        )}
        <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-border/70 pt-2">
          {[
            { key: 'included', label: 'Included', tone: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', count: latestCounts.included },
            { key: 'scheduled', label: 'SFI', tone: 'border-cyan-500/35 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300', count: latestCounts.scheduled },
            { key: 'considered', label: 'CFI', tone: 'border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300', count: latestCounts.considered },
            { key: 'proposed', label: 'PFI', tone: 'border-blue-500/35 bg-blue-500/10 text-blue-700 dark:text-blue-300', count: latestCounts.proposed },
            { key: 'declined', label: 'DFI', tone: 'border-red-500/35 bg-red-500/10 text-red-700 dark:text-red-300', count: latestCounts.declined },
          ].map((chip) => (
            <span key={`upgrade-chip-${chip.key}`} className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold', chip.tone)}>
              {chip.label}: {chip.count}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

