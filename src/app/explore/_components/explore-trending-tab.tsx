'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import ReactECharts from 'echarts-for-react';
import { Download, Search, X } from 'lucide-react';
import { client } from '@/lib/orpc';
import { LedgerBadge } from '@/components/ledger/badge';
import { SectionHead } from '@/components/ledger/section-head';
import { ChartWatermark } from '@/components/chart-watermark';
import { ChartFooter } from '@/components/chart-footer';
import { chartTooltip } from '@/lib/chart-theme';
import { InlineBrandLoader } from '@/components/inline-brand-loader';
import { toast } from 'sonner';

type RepoFilter = 'all' | 'eips' | 'ercs' | 'rips';
type SortFilter = 'score_desc' | 'recent_desc' | 'delta_desc';

interface TrendingProposalRow {
  eipId: number;
  repo: string;
  number: number;
  title: string;
  status: string;
  kind: string;
  score: number;
  scoreDelta: number;
  trendingReason: string;
  lastActivity: string | null;
}

const WINDOW_OPTIONS = [
  { value: 1, label: '24h' },
  { value: 7, label: '7d' },
  { value: 30, label: '30d' },
  { value: 90, label: '90d' },
] as const;

const REPO_OPTIONS: Array<{ value: RepoFilter; label: string }> = [
  { value: 'all', label: 'All Repos' },
  { value: 'eips', label: 'EIPs' },
  { value: 'ercs', label: 'ERCs' },
  { value: 'rips', label: 'RIPs' },
];

export function ExploreTrendingTab() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [windowDays, setWindowDays] = useState<number>(Number(searchParams.get('window') || 7));
  const [repo, setRepo] = useState<RepoFilter>((searchParams.get('repo') as RepoFilter) || 'all');
  const [status, setStatus] = useState<string>(searchParams.get('status') || 'All');
  const [sort, setSort] = useState<SortFilter>((searchParams.get('sort') as SortFilter) || 'score_desc');
  const [query, setQuery] = useState<string>(searchParams.get('q') || '');
  const [debouncedQuery, setDebouncedQuery] = useState<string>(query);

  const [proposals, setProposals] = useState<TrendingProposalRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 280);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('tab', 'trending');
    if (windowDays !== 7) params.set('window', String(windowDays));
    if (repo !== 'all') params.set('repo', repo);
    if (status !== 'All') params.set('status', status);
    if (sort !== 'score_desc') params.set('sort', sort);
    if (debouncedQuery.trim()) params.set('q', debouncedQuery.trim());
    router.replace(`/explore?${params.toString()}`, { scroll: false });
  }, [windowDays, repo, status, sort, debouncedQuery, router]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    client.explore
      .getTrendingProposals({
        limit: 40,
        windowDays,
        repo,
        status: status === 'All' ? undefined : status,
        sort,
        q: debouncedQuery.trim() || undefined,
      })
      .then((res) => {
        if (!cancelled) setProposals(res as TrendingProposalRow[]);
      })
      .catch((err) => {
        console.error('Failed to load trending proposals:', err);
        if (!cancelled) setProposals([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [windowDays, repo, status, sort, debouncedQuery]);

  const topChartOption = useMemo(() => {
    const top10 = proposals.slice(0, 10).reverse();
    return {
      backgroundColor: 'transparent',
      tooltip: chartTooltip({ trigger: 'axis', axisPointer: { type: 'shadow' } }),
      grid: { top: 12, left: 82, right: 32, bottom: 20 },
      xAxis: {
        type: 'value',
        axisLabel: { color: 'var(--ink-faint)', fontSize: 11 },
        splitLine: { lineStyle: { color: 'var(--border)', type: 'dashed' } },
      },
      yAxis: {
        type: 'category',
        data: top10.map((p) => `${p.repo.toUpperCase().replace(/S$/, '')}-${p.number}`),
        axisLabel: { color: 'var(--ink)', fontSize: 11, fontWeight: 600 },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          name: 'Momentum Score',
          type: 'bar',
          data: top10.map((p) => Number(p.score.toFixed(1))),
          itemStyle: { color: '#10b981', borderRadius: [0, 4, 4, 0] },
          barWidth: 16,
        },
      ],
    };
  }, [proposals]);

  const exportTrendingCSV = () => {
    if (!proposals.length) return toast.error('No trending proposals to export');
    const headers = ['Repo', 'Number', 'Title', 'Status', 'Kind', 'Momentum Score', 'Reason'];
    const rows = proposals.map((p) => [p.repo, String(p.number), p.title, p.status, p.kind, String(p.score), p.trendingReason]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `trending-${windowDays}d.csv`;
    a.click();
    toast.success('Exported trending proposals CSV');
  };

  return (
    <div className="space-y-8">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {WINDOW_OPTIONS.map((w) => (
            <button
              key={w.value}
              type="button"
              data-active={windowDays === w.value}
              onClick={() => setWindowDays(w.value)}
              className="chip font-mono"
            >
              {w.label}
            </button>
          ))}
        </div>

        <div className="hidden h-5 w-px bg-[var(--border)] sm:block" />

        <div className="flex flex-wrap items-center gap-1.5">
          {REPO_OPTIONS.map((r) => (
            <button
              key={r.value}
              type="button"
              data-active={repo === r.value}
              onClick={() => setRepo(r.value)}
              className="chip"
            >
              {r.label}
            </button>
          ))}
        </div>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by status"
          className="h-8 text-xs font-medium"
        >
          {['All', 'Draft', 'Review', 'Last Call', 'Final', 'Living', 'Stagnant', 'Withdrawn'].map((s) => (
            <option key={s} value={s}>
              {s === 'All' ? 'All Statuses' : s}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortFilter)}
          aria-label="Sort by"
          className="h-8 text-xs font-medium"
        >
          <option value="score_desc">Momentum Score</option>
          <option value="recent_desc">Recent Activity</option>
          <option value="delta_desc">Biggest Delta</option>
        </select>

        <div className="relative ml-auto min-w-[180px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ink-faint)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter #, title..."
            className="h-8 w-full rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface-2)] pl-8 pr-7 text-xs text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:border-[var(--ink)] focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] hover:text-[var(--ink)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Top 10 Momentum Chart */}
      {proposals.length > 0 && (
        <section>
          <SectionHead
            index="01"
            eyebrow={`LAST ${windowDays}D`}
            title="Top 10 Momentum Proposals"
          />
          <div className="rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="relative h-[280px] w-full">
              <ReactECharts option={topChartOption} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'svg' }} />
              <ChartWatermark />
            </div>
            <ChartFooter />
          </div>
        </section>
      )}

      {/* Trending Proposals Table */}
      <section className="space-y-4">
        <SectionHead
          index="02"
          eyebrow="RANKING"
          title="Trending Proposals"
          action={
            <button
              type="button"
              onClick={exportTrendingCSV}
              title="Export trending proposals CSV"
              aria-label="Export trending proposals CSV"
              className="btn btn-primary h-8 w-8 shrink-0 p-0"
            >
              <Download className="h-4 w-4" />
            </button>
          }
        />

        <div className="overflow-x-auto rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)]">
          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <InlineBrandLoader size="sm" label="Loading trending proposals..." />
            </div>
          ) : proposals.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--ink-muted)]">
              No trending activity found in this window.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                  <th className="px-4 py-3 text-left eyebrow">Rank</th>
                  <th className="px-4 py-3 text-left eyebrow">Proposal</th>
                  <th className="px-4 py-3 text-left eyebrow">Title</th>
                  <th className="px-4 py-3 text-left eyebrow">Status</th>
                  <th className="px-4 py-3 text-left eyebrow">Reason</th>
                  <th className="px-4 py-3 text-right eyebrow">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {proposals.map((p, idx) => {
                  const slug = p.repo.toLowerCase().includes('erc')
                    ? 'ercs'
                    : p.repo.toLowerCase().includes('rip')
                      ? 'rips'
                      : 'eips';
                  const pfx = slug === 'ercs' ? 'ERC' : slug === 'rips' ? 'RIP' : 'EIP';
                  return (
                    <tr key={`${p.repo}-${p.number}`} className="hover:bg-[var(--surface-2)]">
                      <td className="px-4 py-3 font-mono text-[var(--ink-faint)]">#{idx + 1}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link
                          href={`/standards/${slug}/${p.number}`}
                          className="font-mono font-semibold text-[var(--brand-strong)] hover:underline"
                        >
                          {pfx}-{p.number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 max-w-[340px]">
                        <Link
                          href={`/standards/${slug}/${p.number}`}
                          className="block truncate font-medium text-[var(--ink)] hover:text-[var(--brand-strong)]"
                        >
                          {p.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <LedgerBadge token={p.status} className="text-[10px]">
                          {p.status}
                        </LedgerBadge>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--ink-muted)]">
                        {p.trendingReason || p.kind || '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-[var(--brand-strong)]">
                        {p.score.toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
