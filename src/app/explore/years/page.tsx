'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Calendar, ArrowLeft, Sparkles, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { client } from '@/lib/orpc';
import Link from 'next/link';
import { YearTimeline } from './_components/year-timeline';
import { YearOverviewPanel } from './_components/year-overview-panel';
import { YearActivityChart } from './_components/year-activity-chart';
import { YearEIPTable } from './_components/year-eip-table';
import { SectionSeparator } from '@/components/header';

interface YearData {
  year: number;
  newEIPs: number;
  statusChanges: number;
  activePRs: number;
}

interface YearStats {
  totalNewEIPs: number;
  mostCommonStatus: string | null;
  mostActiveCategory: string | null;
  totalPRs: number;
}

interface MonthlyData {
  month: string;
  eipsTouched: number;
  newEIPs: number;
  statusChanges: number;
}

interface EIP {
  id: number;
  number: number;
  title: string;
  type: string | null;
  status: string;
  category: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface AISummaryResponse {
  summary: string;
  source: "cohere" | "fallback";
}

function getDelta(current: number, previous?: number): { value: number; pct: number } | null {
  if (previous == null || previous <= 0) return null;
  const value = current - previous;
  return { value, pct: (value / previous) * 100 };
}

function toDeltaLabel(delta: { value: number; pct: number } | null): string {
  if (!delta) return 'No baseline';
  return `${delta.value >= 0 ? '↑' : '↓'} ${Math.abs(delta.pct).toFixed(1)}% vs previous year`;
}

function getYearCharacter(params: {
  totalNewEIPs: number;
  statusChanges: number;
  totalPRs: number;
}): string {
  const { totalNewEIPs, statusChanges, totalPRs } = params;
  if (totalNewEIPs === 0) return 'Low Activity Year';
  const churnRatio = statusChanges / Math.max(totalNewEIPs, 1);
  const prRatio = totalPRs / Math.max(totalNewEIPs, 1);

  if (churnRatio > 9) return 'Governance Cleanup Year';
  if (prRatio > 5.5) return 'Debate Heavy Year';
  if (totalNewEIPs > 220) return 'Expansion Phase';
  if (statusChanges > 1200) return 'Transition Heavy Year';
  return 'Steady Governance Year';
}

function YearsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const yearParam = searchParams.get('year');
  const currentYear = new Date().getFullYear();
  const initialYear = yearParam ? parseInt(yearParam) : currentYear;

  const [years, setYears] = useState<YearData[]>([]);
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [stats, setStats] = useState<YearStats | null>(null);
  const [chartData, setChartData] = useState<MonthlyData[]>([]);
  const [eips, setEips] = useState<EIP[]>([]);
  const [totalEips, setTotalEips] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(true);
  const [aiNarrative, setAiNarrative] = useState<string | null>(null);
  const [aiNarrativeSource, setAiNarrativeSource] = useState<"cohere" | "fallback" | null>(null);

  const pageSize = 20;
  const isCurrentYear = selectedYear === currentYear;

  const selectedYearData = years.find((item) => item.year === selectedYear) ?? null;
  const previousYearData = years.find((item) => item.year === selectedYear - 1) ?? null;
  const peakMonth = chartData.length
    ? chartData.reduce((peak, item) => (item.eipsTouched > peak.eipsTouched ? item : peak), chartData[0])
    : null;
  const statusPeakMonth = chartData.length
    ? chartData.reduce((peak, item) => (item.statusChanges > peak.statusChanges ? item : peak), chartData[0])
    : null;
  const newEipsDelta = getDelta(selectedYearData?.newEIPs ?? 0, previousYearData?.newEIPs);
  const statusDelta = getDelta(selectedYearData?.statusChanges ?? 0, previousYearData?.statusChanges);
  const prsDelta = getDelta(selectedYearData?.activePRs ?? 0, previousYearData?.activePRs);
  const yearCharacter = getYearCharacter({
    totalNewEIPs: selectedYearData?.newEIPs ?? stats?.totalNewEIPs ?? 0,
    statusChanges: selectedYearData?.statusChanges ?? 0,
    totalPRs: selectedYearData?.activePRs ?? stats?.totalPRs ?? 0,
  });

  useEffect(() => {
    if (!selectedYearData) return;

    const controller = new AbortController();
    const loadSummary = async () => {
      try {
        const response = await fetch('/api/year-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            year: selectedYear,
            isCurrentYear,
            metrics: {
              newEIPs: selectedYearData.newEIPs,
              statusChanges: selectedYearData.statusChanges,
              prs: selectedYearData.activePRs,
            },
            deltas: {
              newEIPsPct: newEipsDelta?.pct ?? null,
              statusChangesPct: statusDelta?.pct ?? null,
              prsPct: prsDelta?.pct ?? null,
            },
            peaks: {
              throughputMonth: peakMonth?.month ?? null,
              governanceChurnMonth: statusPeakMonth?.month ?? null,
            },
          }),
          signal: controller.signal,
        });

        if (!response.ok) return;
        const data = (await response.json()) as AISummaryResponse;
        setAiNarrative(data.summary);
        setAiNarrativeSource(data.source);
      } catch {
        // Keep deterministic narrative fallback already rendered in UI.
      }
    };

    void loadSummary();
    return () => controller.abort();
  }, [
    selectedYear,
    isCurrentYear,
    selectedYearData,
    newEipsDelta?.pct,
    statusDelta?.pct,
    prsDelta?.pct,
    peakMonth?.month,
    statusPeakMonth?.month,
  ]);

  // Fetch years overview (runs once)
  useEffect(() => {
    client.explore.getYearsOverview({})
      .then(data => setYears(data))
      .catch(err => console.error('Failed to fetch years:', err))
      .finally(() => setLoading(false));
  }, []);

  // Fetch stats, chart, and table in parallel when year changes
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setStatsLoading(true);
        setChartLoading(true);
        setTableLoading(true);
      }
    });

    Promise.allSettled([
      client.explore.getYearStats({ year: selectedYear }),
      client.explore.getYearActivityChart({ year: selectedYear }),
      client.explore.getEIPsByYear({ year: selectedYear, limit: pageSize, offset: (page - 1) * pageSize }),
    ]).then(([statsRes, chartRes, eipsRes]) => {
      if (cancelled) return;
      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (chartRes.status === 'fulfilled') setChartData(chartRes.value);
      if (eipsRes.status === 'fulfilled') {
        setEips(eipsRes.value.items);
        setTotalEips(eipsRes.value.total);
      }
    }).finally(() => {
      if (!cancelled) {
        setStatsLoading(false);
        setChartLoading(false);
        setTableLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [selectedYear, page]);

  const handleYearSelect = (year: number) => {
    setSelectedYear(year);
    setPage(1);
    router.push(`/explore/years?year=${year}`, { scroll: false });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  return (
    <div className="bg-background relative w-full overflow-hidden min-h-screen">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(var(--persona-accent-rgb),0.12),transparent_50%)]" />
      </div>

      <section className="relative w-full pt-8 pb-4">
        <div className="mx-auto w-full px-3 sm:px-4 lg:px-5 xl:px-6">
          <Link
            href="/explore"
            className={cn(
              "inline-flex items-center gap-2 mb-6",
              "text-sm text-muted-foreground hover:text-foreground transition-colors"
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Explore
          </Link>

          <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
              <Calendar className="h-3.5 w-3.5" />
              Explore
            </div>
            <h1 className="dec-title persona-title mt-3 text-balance text-3xl font-semibold tracking-tight leading-[1.1] sm:text-4xl">
              Yearly Governance Intelligence
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Interpretable annual activity for Ethereum proposals. Powered by <span className="text-foreground/80">EIPsInsight</span>.
            </p>
          </motion.header>
        </div>
      </section>

      <section className="relative w-full py-4">
        <div className="mx-auto w-full px-3 sm:px-4 lg:px-5 xl:px-6">
          {!loading && years.length > 0 && (
            <YearTimeline
              years={years}
              selectedYear={selectedYear}
              onYearSelect={handleYearSelect}
            />
          )}
        </div>
      </section>

      <SectionSeparator />

      <section className="relative w-full py-8">
        <div className="mx-auto w-full px-3 sm:px-4 lg:px-5 xl:px-6">
          <div className="mb-4 rounded-xl border border-border bg-card/60 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                  {selectedYear} Narrative Summary
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {aiNarrative ?? (isCurrentYear ? (
                    <>
                      {selectedYear} is a <span className="text-foreground">live year-to-date snapshot</span>.
                      {' '}Metrics are still collecting, so trends are directional.
                    </>
                  ) : (
                    <>
                      {selectedYear} was a <span className="text-foreground">{yearCharacter}</span>.
                      {peakMonth ? ` Peak monthly throughput appeared in ${peakMonth.month}.` : ''}
                      {statusPeakMonth ? ` Governance churn peaked in ${statusPeakMonth.month}.` : ''}
                    </>
                  ))}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                {aiNarrativeSource === "cohere"
                  ? "AI Insight (Cohere)"
                  : isCurrentYear
                    ? 'Live YTD (Still Collecting)'
                    : yearCharacter}
              </span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-muted/40 p-2.5 text-xs text-muted-foreground">
                New EIPs: <span className="font-medium text-foreground">{selectedYearData?.newEIPs.toLocaleString() ?? 0}</span>
                <span className="ml-2 text-primary">
                  {isCurrentYear ? `${toDeltaLabel(newEipsDelta)} (directional)` : toDeltaLabel(newEipsDelta)}
                </span>
              </div>
              <div className="rounded-lg border border-border bg-muted/40 p-2.5 text-xs text-muted-foreground">
                PR Activity: <span className="font-medium text-foreground">{selectedYearData?.activePRs.toLocaleString() ?? 0}</span>
                <span className="ml-2 text-primary">
                  {isCurrentYear ? `${toDeltaLabel(prsDelta)} (directional)` : toDeltaLabel(prsDelta)}
                </span>
              </div>
              <div className="rounded-lg border border-border bg-muted/40 p-2.5 text-xs text-muted-foreground">
                Status Changes: <span className="font-medium text-foreground">{selectedYearData?.statusChanges.toLocaleString() ?? 0}</span>
                <span className="ml-2 text-primary">
                  {isCurrentYear ? `${toDeltaLabel(statusDelta)} (directional)` : toDeltaLabel(statusDelta)}
                </span>
              </div>
            </div>
          </div>

          <h3 className="dec-title mb-4 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {selectedYear} Overview
          </h3>
          <YearOverviewPanel
            isCurrentYear={isCurrentYear}
            stats={stats}
            selectedYearData={selectedYearData}
            previousYearData={previousYearData}
            loading={statsLoading}
          />
        </div>
      </section>

      <SectionSeparator />

      <section className="relative w-full py-8">
        <div className="mx-auto w-full px-3 sm:px-4 lg:px-5 xl:px-6">
          <YearActivityChart
            data={chartData}
            year={selectedYear}
            loading={chartLoading}
          />
        </div>
      </section>

      <SectionSeparator />

      <section className="relative w-full py-8">
        <div className="mx-auto w-full px-3 sm:px-4 lg:px-5 xl:px-6">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            Move from macro trends to proposal-level evidence.
          </div>
          <YearEIPTable
            eips={eips}
            total={totalEips}
            loading={tableLoading}
            page={page}
            pageSize={pageSize}
            onPageChange={handlePageChange}
          />
        </div>
      </section>

      {/* Bottom spacing */}
      <div className="h-16" />
    </div>
  );
}

export default function YearsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    }>
      <YearsPageContent />
    </Suspense>
  );
}
