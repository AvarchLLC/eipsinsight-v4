'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Calendar, ArrowLeft } from 'lucide-react';
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

  const pageSize = 20;

  // Fetch years overview (runs once)
  useEffect(() => {
    client.explore.getYearsOverview({})
      .then(data => setYears(data))
      .catch(err => console.error('Failed to fetch years:', err))
      .finally(() => setLoading(false));
  }, []);

  // Fetch stats, chart, and table in parallel when year changes
  useEffect(() => {
    setStatsLoading(true);
    setChartLoading(true);
    setTableLoading(true);

    Promise.allSettled([
      client.explore.getYearStats({ year: selectedYear }),
      client.explore.getYearActivityChart({ year: selectedYear }),
      client.explore.getEIPsByYear({ year: selectedYear, limit: pageSize, offset: (page - 1) * pageSize }),
    ]).then(([statsRes, chartRes, eipsRes]) => {
      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (chartRes.status === 'fulfilled') setChartData(chartRes.value);
      if (eipsRes.status === 'fulfilled') {
        setEips(eipsRes.value.items);
        setTotalEips(eipsRes.value.total);
      }
    }).finally(() => {
      setStatsLoading(false);
      setChartLoading(false);
      setTableLoading(false);
    });
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
      {/* Background gradient */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(34,211,238,0.08),_transparent_50%)]" />
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
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-400/30">
              <Calendar className="h-7 w-7 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                Browse by Year
              </h1>
              <p className="text-slate-400">
                Explore EIP activity and proposals from {selectedYear}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Year Timeline */}
      <section className="relative w-full py-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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

      {/* Year Overview Panel */}
      <section className="relative w-full py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            {selectedYear} Overview
          </h2>
          <YearOverviewPanel
            year={selectedYear}
            stats={stats}
            loading={statsLoading}
          />
        </div>
      </section>

      <SectionSeparator />

      {/* Activity Chart */}
      <section className="relative w-full py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <YearActivityChart
            data={chartData}
            year={selectedYear}
            loading={chartLoading}
          />
        </div>
      </section>

      <SectionSeparator />

      {/* EIP Table */}
      <section className="relative w-full py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    }>
      <YearsPageContent />
    </Suspense>
  );
}
