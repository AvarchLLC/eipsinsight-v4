'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import ReactECharts from 'echarts-for-react';
import { ChevronLeft, ChevronRight, Download, Search, X } from 'lucide-react';
import { client } from '@/lib/orpc';
import { cn } from '@/lib/utils';
import { LedgerBadge } from '@/components/ledger/badge';
import { SectionHead } from '@/components/ledger/section-head';
import { ChartWatermark } from '@/components/chart-watermark';
import { ChartFooter } from '@/components/chart-footer';
import { chartTooltip } from '@/lib/chart-theme';
import { InlineBrandLoader } from '@/components/inline-brand-loader';
import { toast } from 'sonner';

interface YearOverview {
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

interface YearEIPRow {
  id: number;
  number: number;
  author: string | null;
  title: string;
  type: string | null;
  status: string;
  category: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  metricCount: number;
  metricLatestAt: string | null;
  prNumber: number | null;
  prRepo: string | null;
  prState: string | null;
}

type TableMode = 'new_eips' | 'status_changes' | 'pr_activity';

export function ExploreYearsTab() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const initialYear = Number(searchParams.get('year')) || currentYear;

  const [years, setYears] = useState<YearOverview[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(initialYear);
  const [stats, setStats] = useState<YearStats | null>(null);
  const [chartData, setChartData] = useState<MonthlyData[]>([]);
  const [eips, setEips] = useState<YearEIPRow[]>([]);
  const [totalEips, setTotalEips] = useState(0);
  const [tableMode, setTableMode] = useState<TableMode>('new_eips');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [overviewLoading, setOverviewLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(1);
    }, 280);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Sync URL
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('tab', 'years');
    params.set('year', String(selectedYear));
    router.replace(`/explore?${params.toString()}`, { scroll: false });
  }, [selectedYear, router]);

  useEffect(() => {
    client.explore
      .getYearsOverview({})
      .then((res) => setYears(res as YearOverview[]))
      .catch((err) => console.error('Failed to load years overview:', err))
      .finally(() => setOverviewLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setDataLoading(true);
    Promise.allSettled([
      client.explore.getYearStats({ year: selectedYear }),
      client.explore.getYearActivityChart({ year: selectedYear }),
      client.explore.getEIPsByYear({
        year: selectedYear,
        mode: tableMode,
        q: debouncedQuery.trim() || undefined,
        status: statusFilter || undefined,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
    ])
      .then(([statsRes, chartRes, eipsRes]) => {
        if (cancelled) return;
        if (statsRes.status === 'fulfilled') setStats(statsRes.value as YearStats);
        if (chartRes.status === 'fulfilled') setChartData(chartRes.value as MonthlyData[]);
        if (eipsRes.status === 'fulfilled') {
          setEips(eipsRes.value.items as YearEIPRow[]);
          setTotalEips(eipsRes.value.total);
        }
      })
      .finally(() => {
        if (!cancelled) setDataLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedYear, tableMode, debouncedQuery, statusFilter, page]);

  const yearSummary = years.find((y) => y.year === selectedYear);

  const chartOption = useMemo(() => {
    return {
      backgroundColor: 'transparent',
      tooltip: chartTooltip({ trigger: 'axis' }),
      legend: {
        top: 0,
        textStyle: { color: 'var(--ink-muted)', fontSize: 11 },
      },
      grid: { top: 36, left: 42, right: 20, bottom: 24 },
      xAxis: {
        type: 'category',
        data: chartData.map((d) => d.month),
        axisLabel: { color: 'var(--ink-faint)', fontSize: 11 },
        axisLine: { lineStyle: { color: 'var(--border)' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: 'var(--ink-faint)', fontSize: 11 },
        splitLine: { lineStyle: { color: 'var(--border)', type: 'dashed' } },
      },
      series: [
        {
          name: 'New Proposals',
          type: 'bar',
          data: chartData.map((d) => d.newEIPs),
          itemStyle: { color: '#10b981', borderRadius: [3, 3, 0, 0] },
          barMaxWidth: 20,
        },
        {
          name: 'Status Changes',
          type: 'bar',
          data: chartData.map((d) => d.statusChanges),
          itemStyle: { color: '#f59e0b', borderRadius: [3, 3, 0, 0] },
          barMaxWidth: 20,
        },
        {
          name: 'Proposals Touched',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 5,
          data: chartData.map((d) => d.eipsTouched),
          lineStyle: { width: 2, color: '#6366f1' },
          itemStyle: { color: '#6366f1' },
        },
      ],
    };
  }, [chartData]);

  const exportYearCSV = () => {
    if (!eips.length) {
      toast.error('No rows to export');
      return;
    }
    const headers = ['Year', 'EIP', 'Title', 'Status', 'Category', 'Type', 'PR', 'Activity Count', 'Date'];
    const rows = eips.map((r) => [
      String(selectedYear),
      `EIP-${r.number}`,
      r.title,
      r.status,
      r.category || '',
      r.type || '',
      r.prNumber ? `#${r.prNumber}` : '',
      String(r.metricCount),
      r.metricLatestAt || r.updatedAt || r.createdAt || '',
    ]);
    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eips-${selectedYear}-${tableMode}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${selectedYear} report`);
  };

  const totalPages = Math.max(1, Math.ceil(totalEips / pageSize));
  const sortedYears = useMemo(() => [...years].sort((a, b) => b.year - a.year), [years]);

  return (
    <div className="space-y-8">
      {/* Year selector chips */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] p-3">
        <span className="eyebrow mr-2">Year:</span>
        {overviewLoading ? (
          <span className="text-xs text-[var(--ink-muted)]">Loading years...</span>
        ) : (
          sortedYears.map((y) => (
            <button
              key={y.year}
              type="button"
              data-active={selectedYear === y.year}
              onClick={() => {
                setSelectedYear(y.year);
                setPage(1);
              }}
              className="chip font-mono"
            >
              {y.year}
            </button>
          ))
        )}
      </div>

      {/* Ruled KPI Strip — clicking switches the table mode directly */}
      <div className="grid grid-cols-2 divide-y divide-[var(--border)] border-y border-[var(--border)] bg-[var(--surface)] sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        <button
          type="button"
          onClick={() => {
            setTableMode('new_eips');
            setPage(1);
          }}
          className={cn(
            'flex flex-col items-start px-5 py-4 text-left transition-colors hover:bg-[var(--surface-2)]',
            tableMode === 'new_eips' && 'bg-[var(--surface-2)]',
          )}
        >
          <span className="eyebrow">New Proposals ({selectedYear})</span>
          <span className="t-figure mt-2 text-2xl sm:text-3xl">
            {(yearSummary?.newEIPs ?? stats?.totalNewEIPs ?? 0).toLocaleString()}
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            setTableMode('status_changes');
            setPage(1);
          }}
          className={cn(
            'flex flex-col items-start px-5 py-4 text-left transition-colors hover:bg-[var(--surface-2)]',
            tableMode === 'status_changes' && 'bg-[var(--surface-2)]',
          )}
        >
          <span className="eyebrow">Status Changes</span>
          <span className="t-figure mt-2 text-2xl sm:text-3xl">
            {(yearSummary?.statusChanges ?? 0).toLocaleString()}
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            setTableMode('pr_activity');
            setPage(1);
          }}
          className={cn(
            'flex flex-col items-start px-5 py-4 text-left transition-colors hover:bg-[var(--surface-2)]',
            tableMode === 'pr_activity' && 'bg-[var(--surface-2)]',
          )}
        >
          <span className="eyebrow">Active PRs</span>
          <span className="t-figure mt-2 text-2xl sm:text-3xl">
            {(yearSummary?.activePRs ?? stats?.totalPRs ?? 0).toLocaleString()}
          </span>
        </button>
        <div className="flex flex-col items-start px-5 py-4">
          <span className="eyebrow">Top Category</span>
          <div className="mt-3">
            {stats?.mostActiveCategory ? (
              <LedgerBadge token={stats.mostActiveCategory}>{stats.mostActiveCategory}</LedgerBadge>
            ) : (
              <span className="font-mono text-sm text-[var(--ink-muted)]">—</span>
            )}
          </div>
        </div>
      </div>

      {/* Monthly Chart */}
      <section>
        <SectionHead
          index="01"
          eyebrow={`${selectedYear} TIMELINE`}
          title={`Monthly Activity in ${selectedYear}`}
        />
        <div className="rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] p-5">
          {chartData.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--ink-muted)]">No monthly chart data for {selectedYear}.</div>
          ) : (
            <div className="relative h-[300px] w-full">
              <ReactECharts option={chartOption} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'svg' }} />
              <ChartWatermark />
            </div>
          )}
          <ChartFooter />
        </div>
      </section>

      {/* Year Activity Table */}
      <section className="space-y-4">
        <SectionHead
          index="02"
          eyebrow="WHAT HAPPENED"
          title={`${selectedYear} Activity Log`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              {(['new_eips', 'status_changes', 'pr_activity'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  data-active={tableMode === m}
                  onClick={() => {
                    setTableMode(m);
                    setPage(1);
                  }}
                  className="chip"
                >
                  {m === 'new_eips' ? 'New Proposals' : m === 'status_changes' ? 'Status Changes' : 'PR Activity'}
                </button>
              ))}
              <button
                type="button"
                onClick={exportYearCSV}
                title="Export year rows to CSV"
                aria-label="Export year rows to CSV"
                className="btn btn-primary h-8 w-8 shrink-0 p-0"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          }
        />

        {/* Table filters */}
        <div className="flex flex-wrap items-center gap-3 rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] p-3">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by status"
            className="h-8 text-xs font-medium"
          >
            <option value="">All Statuses</option>
            {['Draft', 'Review', 'Last Call', 'Final', 'Living', 'Stagnant', 'Withdrawn'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <div className="relative ml-auto min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ink-faint)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${selectedYear} proposals...`}
              className="h-8 w-full rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface-2)] pl-8 pr-7 text-xs text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:border-[var(--ink)] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] hover:text-[var(--ink)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)]">
          {dataLoading ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <InlineBrandLoader size="sm" label={`Loading ${selectedYear} activity...`} />
            </div>
          ) : eips.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--ink-muted)]">
              No records found for {selectedYear} with the selected filters.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                  <th className="px-4 py-3 text-left eyebrow">Proposal</th>
                  <th className="px-4 py-3 text-left eyebrow">Title</th>
                  <th className="px-4 py-3 text-left eyebrow">Status</th>
                  <th className="px-4 py-3 text-left eyebrow">Category</th>
                  <th className="px-4 py-3 text-left eyebrow">PR</th>
                  <th className="px-4 py-3 text-right eyebrow">Events</th>
                  <th className="px-4 py-3 text-right eyebrow">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {eips.map((r) => (
                  <tr key={`${r.id}-${r.prNumber ?? 'na'}`} className="transition-colors hover:bg-[var(--surface-2)]">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link
                        href={`/standards/eips/${r.number}`}
                        className="font-mono font-semibold text-[var(--brand-strong)] hover:underline"
                      >
                        EIP-{r.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 max-w-[300px]">
                      <Link
                        href={`/standards/eips/${r.number}`}
                        className="block truncate font-medium text-[var(--ink)] hover:text-[var(--brand-strong)]"
                      >
                        {r.title || 'Untitled'}
                      </Link>
                      {r.author && <p className="mt-0.5 truncate text-[11px] text-[var(--ink-faint)]">{r.author}</p>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <LedgerBadge token={r.status} className="text-[10px]">
                        {r.status}
                      </LedgerBadge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {r.category ? (
                        <LedgerBadge token={r.category} className="text-[10px]">
                          {r.category}
                        </LedgerBadge>
                      ) : (
                        <span className="text-[var(--ink-faint)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono">
                      {r.prNumber ? (
                        <Link href={`/pr/eips/${r.prNumber}`} className="text-[var(--brand-strong)] hover:underline">
                          #{r.prNumber}
                        </Link>
                      ) : (
                        <span className="text-[var(--ink-faint)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-[var(--ink)]">
                      {r.metricCount}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap font-mono tabular-nums text-[var(--ink-muted)]">
                      {(r.metricLatestAt || r.updatedAt || r.createdAt || '').slice(0, 10) || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4 text-xs text-[var(--ink-muted)]">
          <span className="font-mono">
            Showing {eips.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalEips)} of{' '}
            <strong className="text-[var(--ink)]">{totalEips.toLocaleString()}</strong> records
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="btn h-8 px-2.5 text-xs disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </button>
            <span className="font-mono text-xs text-[var(--ink)]">
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="btn h-8 px-2.5 text-xs disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
