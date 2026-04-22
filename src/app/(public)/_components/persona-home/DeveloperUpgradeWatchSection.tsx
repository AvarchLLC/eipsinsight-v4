'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import ReactECharts from 'echarts-for-react';
import { ArrowRight, Download, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CopyLinkButton } from '@/components/header';

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
  upgradeTimelineRows: Array<{
    date: string;
    included: string[];
    scheduled: string[];
    considered: string[];
    proposed: string[];
    declined: string[];
  }>;
  upgradeWatchChartOption: unknown;
  latestCounts: Counts;
  onDownloadMetadata: () => void;
  downloadMetadataLoading: boolean;
};

export default function DeveloperUpgradeWatchSection({
  sectionTitleClass,
  sectionSubtitleClass,
  upgradeWatchSlug,
  setUpgradeWatchSlug,
  upgradeOptions,
  upgradeTimelineLoading,
  upgradeTimelineRows,
  upgradeWatchChartOption,
  latestCounts,
  onDownloadMetadata,
  downloadMetadataLoading,
}: DeveloperUpgradeWatchSectionProps) {
  const [showTable, setShowTable] = useState(false);

  const renderEipList = (values: string[]) => {
    if (!values.length) return <span className="text-muted-foreground">-</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {values.map((value) => (
          <span key={value} className="rounded border border-border/70 bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-foreground">
            EIP-{value}
          </span>
        ))}
      </div>
    );
  };

  return (
    <section className="mb-6 border-t border-border/70 pt-6" id="developer-upgrade-watch">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <h2 className={sectionTitleClass}>Upgrade Watch</h2>
            <CopyLinkButton sectionId="developer-upgrade-watch" className="h-8 w-8 rounded-md" />
          </div>
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
            className="inline-flex h-8 items-center justify-center gap-1 whitespace-nowrap rounded-md border border-primary/30 bg-primary/10 px-2.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
          >
            Explore Upgrades
            <ArrowRight className="h-3 w-3" />
          </Link>
          <button
            type="button"
            onClick={() => setShowTable((prev) => !prev)}
            disabled={upgradeTimelineLoading || !upgradeTimelineRows.length}
            className="inline-flex h-8 items-center justify-center whitespace-nowrap rounded-md border border-border bg-muted/40 px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {showTable ? 'Hide Table' : 'Show Table'}
          </button>
          <button
            type="button"
            onClick={onDownloadMetadata}
            disabled={downloadMetadataLoading || upgradeTimelineLoading || !upgradeWatchChartOption}
            className="inline-flex h-8 items-center justify-center gap-1 whitespace-nowrap rounded-md border border-border bg-muted/40 px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download className="h-3 w-3" />
            {downloadMetadataLoading ? 'Downloading...' : 'Download CSV'}
          </button>
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
        {showTable && (
          <div className="mt-3 overflow-x-auto rounded-lg border border-border/70">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-border/70 bg-muted/40 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-2.5 py-2">Date</th>
                  <th className="px-2.5 py-2">Included</th>
                  <th className="px-2.5 py-2">SFI</th>
                  <th className="px-2.5 py-2">CFI</th>
                  <th className="px-2.5 py-2">PFI</th>
                  <th className="px-2.5 py-2">DFI</th>
                </tr>
              </thead>
              <tbody>
                {[...upgradeTimelineRows].reverse().map((row) => (
                  <tr key={`upgrade-watch-row-${row.date}`} className="border-b border-border/60 align-top">
                    <td className="whitespace-nowrap px-2.5 py-2 font-medium text-foreground">{row.date}</td>
                    <td className="px-2.5 py-2">{renderEipList(row.included)}</td>
                    <td className="px-2.5 py-2">{renderEipList(row.scheduled)}</td>
                    <td className="px-2.5 py-2">{renderEipList(row.considered)}</td>
                    <td className="px-2.5 py-2">{renderEipList(row.proposed)}</td>
                    <td className="px-2.5 py-2">{renderEipList(row.declined)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
