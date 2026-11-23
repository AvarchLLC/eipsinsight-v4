'use client';

import React from 'react';
import Link from 'next/link';
import ReactECharts from 'echarts-for-react';
import { ArrowUpRight, Download } from 'lucide-react';
import { SectionHead } from '@/components/ledger/section-head';
import { ChartFooter } from '@/components/chart-footer';
import { ChartWatermark } from '@/components/chart-watermark';

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

type UpgradeWatchSectionProps = {
  sectionTitleClass?: string;
  sectionSubtitleClass?: string;
  upgradeWatchSlug: string;
  setUpgradeWatchSlug: (value: string) => void;
  upgradeOptions: UpgradeOption[];
  upgradeTimelineLoading: boolean;
  upgradeTimelineRows?: Array<{
    date: string;
    included: string[];
    scheduled: string[];
    considered: string[];
    proposed: string[];
    declined: string[];
  }>;
  upgradeWatchChartOption: unknown;
  latestCounts?: Counts;
  onDownloadMetadata: () => void;
  downloadMetadataLoading: boolean;
};

export default function UpgradeWatchSection({
  upgradeWatchSlug,
  setUpgradeWatchSlug,
  upgradeOptions,
  upgradeTimelineLoading,
  upgradeWatchChartOption,
  onDownloadMetadata,
  downloadMetadataLoading,
}: UpgradeWatchSectionProps) {
  return (
    <section className="mb-10 pt-2" id="upgrade-watch">
      <SectionHead
        index="01"
        eyebrow="Network hard forks"
        title="Upgrade Watch"
        description="EIP composition timeline by network upgrade — tracking proposed through included standards."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {/* Directory link to the upgrades portal */}
            <Link
              href="/upgrade"
              className="btn btn-outline h-8 px-3 text-xs font-sans font-medium gap-1.5 hover:border-[var(--ink)]"
            >
              <span>Directory</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-[var(--ink-faint)]" />
            </Link>

            {/* Upgrade dropdown selector */}
            <select
              value={upgradeWatchSlug}
              onChange={(e) => setUpgradeWatchSlug(e.target.value)}
              className="h-8 rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface)] pl-3 pr-8 text-xs font-sans font-medium text-[var(--ink)] transition-colors hover:border-[var(--ink-muted)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--brand)] cursor-pointer"
            >
              {upgradeOptions.map((opt) => (
                <option key={opt.slug} value={opt.slug}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Small icon download / export button */}
            <button
              type="button"
              onClick={onDownloadMetadata}
              disabled={downloadMetadataLoading || upgradeTimelineLoading || !upgradeWatchChartOption}
              title={downloadMetadataLoading ? "Exporting CSV…" : "Export CSV Report"}
              aria-label="Export CSV report"
              className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface)] text-[var(--ink-muted)] hover:border-[var(--ink)] hover:text-[var(--ink)] transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
          </div>
        }
      />

      <div className="card p-4">
        {upgradeTimelineLoading ? (
          <div className="h-[280px] animate-pulse rounded bg-[var(--surface-3)]" />
        ) : !upgradeWatchChartOption ? (
          <div className="flex h-[280px] items-center justify-center rounded border border-[var(--border)] bg-[var(--surface-2)] text-sm text-[var(--ink-muted)]">
            No timeline data available for this upgrade.
          </div>
        ) : (
          <div className="relative">
            <ReactECharts
              option={upgradeWatchChartOption as object}
              style={{ height: '280px', width: '100%' }}
              opts={{ renderer: 'svg' }}
            />
            <ChartWatermark position="center" />
          </div>
        )}

        <ChartFooter />
      </div>
    </section>
  );
}
