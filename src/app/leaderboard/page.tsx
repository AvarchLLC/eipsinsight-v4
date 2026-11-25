'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import ReactECharts from 'echarts-for-react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Info,
  Search,
  X,
} from 'lucide-react';
import { client } from '@/lib/orpc';
import { cn } from '@/lib/utils';
import { PageHead } from '@/components/ledger/page-head';
import { SectionHead } from '@/components/ledger/section-head';
import { LedgerBadge } from '@/components/ledger/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChartWatermark } from '@/components/chart-watermark';
import { ChartFooter } from '@/components/chart-footer';
import { chartTooltip } from '@/lib/chart-theme';
import { InlineBrandLoader } from '@/components/inline-brand-loader';
import { toast } from 'sonner';

type DatePreset = 'this_year' | '30d' | '90d' | 'all' | 'custom';
type RoleFilter = 'ALL' | 'EDITOR' | 'REVIEWER' | 'CONTRIBUTOR';
type RepoFilter = 'all' | 'eips' | 'ercs' | 'rips';
type SortBy = 'score' | 'actions' | 'reviews' | 'merged' | 'created' | 'comments' | 'prs_touched' | 'recent';
type SortDir = 'asc' | 'desc';

interface LeaderboardItem {
  rank: number;
  actor: string;
  role: string;
  totalScore: number;
  totalActions: number;
  prsTouched: number;
  prsReviewed: number;
  prsMerged: number;
  prsCreated: number;
  comments: number;
  lastActivity: string | null;
}

interface LeaderboardSummary {
  totalContributors: number;
  totalActions: number;
  totalReviews: number;
  totalMerged: number;
  totalCreated: number;
  totalComments: number;
}

interface ActorBreakdownRow {
  id: string;
  actor: string;
  role: string;
  actionType: string;
  prNumber: number;
  occurredAt: string;
  repoName: string;
}

const PRESET_OPTIONS: Array<{ value: DatePreset; label: string }> = [
  { value: 'this_year', label: 'This Year' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: 'all', label: 'All Time' },
  { value: 'custom', label: 'Custom' },
];

const ROLE_OPTIONS: Array<{ value: RoleFilter; label: string }> = [
  { value: 'ALL', label: 'All Roles' },
  { value: 'EDITOR', label: 'Editors' },
  { value: 'REVIEWER', label: 'Reviewers' },
  { value: 'CONTRIBUTOR', label: 'Contributors' },
];

const REPO_OPTIONS: Array<{ value: RepoFilter; label: string }> = [
  { value: 'all', label: 'All Repos' },
  { value: 'eips', label: 'EIPs' },
  { value: 'ercs', label: 'ERCs' },
  { value: 'rips', label: 'RIPs' },
];

const SORT_LABELS: Record<SortBy, string> = {
  score: 'Score',
  actions: 'Total Actions',
  reviews: 'PRs Reviewed',
  merged: 'PRs Merged',
  created: 'PRs Created',
  comments: 'Comments',
  prs_touched: 'PRs Touched',
  recent: 'Last Active',
};

function computeDatesForPreset(preset: DatePreset, customFrom: string, customTo: string): { from?: string; to?: string } {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  if (preset === 'this_year') {
    return { from: `${now.getFullYear()}-01-01`, to: today };
  }
  if (preset === '30d') {
    const d = new Date(now.getTime() - 30 * 86400000);
    return { from: d.toISOString().slice(0, 10), to: today };
  }
  if (preset === '90d') {
    const d = new Date(now.getTime() - 90 * 86400000);
    return { from: d.toISOString().slice(0, 10), to: today };
  }
  if (preset === 'custom') {
    return {
      from: customFrom || undefined,
      to: customTo || undefined,
    };
  }
  return { from: undefined, to: undefined };
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toISOString().slice(0, 10);
}

function repoSlugFromName(repoName: string): string {
  const lower = (repoName || '').toLowerCase();
  if (lower.includes('erc')) return 'ercs';
  if (lower.includes('rip')) return 'rips';
  return 'eips';
}

function initials(handle: string): string {
  return handle.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() || '??';
}

function scoreFormulaTitle(item: LeaderboardItem): string {
  return `Score ${item.totalScore} = ${item.prsTouched} PRs touched + (${item.prsReviewed} reviews × 2) + (${item.prsMerged} merged × 3) + ${item.prsCreated} created`;
}

function LeaderboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const todayStr = new Date().toISOString().slice(0, 10);

  const [preset, setPreset] = useState<DatePreset>(
    (searchParams.get('preset') as DatePreset) || 'this_year',
  );
  const [customFrom, setCustomFrom] = useState<string>(
    searchParams.get('from') || `${currentYear}-01-01`,
  );
  const [customTo, setCustomTo] = useState<string>(
    searchParams.get('to') || todayStr,
  );
  const [role, setRole] = useState<RoleFilter>(
    ((searchParams.get('role') || 'ALL').toUpperCase() as RoleFilter) || 'ALL',
  );
  const [repo, setRepo] = useState<RepoFilter>(
    (searchParams.get('repo') as RepoFilter) || 'all',
  );
  const [sortBy, setSortBy] = useState<SortBy>(
    (searchParams.get('sortBy') as SortBy) || 'score',
  );
  const [sortDir, setSortDir] = useState<SortDir>(
    (searchParams.get('sortDir') as SortDir) || 'desc',
  );
  const [searchInput, setSearchInput] = useState<string>(searchParams.get('q') || '');
  const [debouncedSearch, setDebouncedSearch] = useState<string>(searchInput);
  const [page, setPage] = useState<number>(1);
  const pageSize = 25;

  const [items, setItems] = useState<LeaderboardItem[]>([]);
  const [summary, setSummary] = useState<LeaderboardSummary>({
    totalContributors: 0,
    totalActions: 0,
    totalReviews: 0,
    totalMerged: 0,
    totalCreated: 0,
    totalComments: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);

  const [selectedActor, setSelectedActor] = useState<string | null>(null);
  const [breakdownRows, setBreakdownRows] = useState<ActorBreakdownRow[]>([]);
  const [breakdownLoading, setBreakdownLoading] = useState<boolean>(false);
  const [breakdownPage, setBreakdownPage] = useState<number>(1);
  const breakdownPageSize = 12;
  const breakdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 280);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Sync URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (preset !== 'this_year') params.set('preset', preset);
    if (preset === 'custom') {
      if (customFrom) params.set('from', customFrom);
      if (customTo) params.set('to', customTo);
    }
    if (role !== 'ALL') params.set('role', role.toLowerCase());
    if (repo !== 'all') params.set('repo', repo);
    if (sortBy !== 'score') params.set('sortBy', sortBy);
    if (sortDir !== 'desc') params.set('sortDir', sortDir);
    if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim());
    const qs = params.toString();
    router.replace(qs ? `/leaderboard?${qs}` : '/leaderboard', { scroll: false });
  }, [preset, customFrom, customTo, role, repo, sortBy, sortDir, debouncedSearch, router]);

  const { from, to } = useMemo(
    () => computeDatesForPreset(preset, customFrom, customTo),
    [preset, customFrom, customTo],
  );

  // Fetch leaderboard
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    client.explore
      .getLeaderboard({
        role,
        repo,
        from,
        to,
        sortBy,
        sortDir,
        search: debouncedSearch.trim() || undefined,
        limit: 200,
      })
      .then((res) => {
        if (cancelled) return;
        setItems(res.items as LeaderboardItem[]);
        setSummary(res.summary as LeaderboardSummary);
        setPage(1);
      })
      .catch((err) => {
        console.error('Failed to load leaderboard:', err);
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [role, repo, from, to, sortBy, sortDir, debouncedSearch]);

  // Fetch actor breakdown when clicked
  useEffect(() => {
    if (!selectedActor) {
      setBreakdownRows([]);
      return;
    }
    let cancelled = false;
    setBreakdownLoading(true);
    const mappedRange =
      preset === '30d' ? '30d' : preset === '90d' ? '90d' : preset === 'this_year' ? '365d' : 'all';
    client.explore
      .getRoleActorBreakdown({
        actor: selectedActor,
        repo,
        category: 'all',
        timeRange: mappedRange,
        limit: 200,
      })
      .then((rows) => {
        if (!cancelled) {
          setBreakdownRows(rows as ActorBreakdownRow[]);
          setBreakdownPage(1);
        }
      })
      .catch((err) => {
        console.error('Failed to load actor breakdown:', err);
        if (!cancelled) setBreakdownRows([]);
      })
      .finally(() => {
        if (!cancelled) setBreakdownLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedActor, repo, preset]);

  const handleSort = useCallback(
    (col: SortBy) => {
      if (sortBy === col) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortBy(col);
        setSortDir('desc');
      }
    },
    [sortBy],
  );

  const handleInspectActor = useCallback((actor: string) => {
    setSelectedActor(actor);
    setTimeout(() => {
      breakdownRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 60);
  }, []);

  const topChartOption = useMemo(() => {
    const top10 = items.slice(0, 10).reverse();
    const metricValue = (item: LeaderboardItem) => {
      switch (sortBy) {
        case 'actions':
          return item.totalActions;
        case 'reviews':
          return item.prsReviewed;
        case 'merged':
          return item.prsMerged;
        case 'created':
          return item.prsCreated;
        case 'comments':
          return item.comments;
        case 'prs_touched':
          return item.prsTouched;
        default:
          return item.totalScore;
      }
    };

    const colorForRole = (r: string) => {
      if (r === 'EDITOR') return '#10b981';
      if (r === 'REVIEWER') return '#0ea5e9';
      return '#64748b';
    };

    return {
      backgroundColor: 'transparent',
      tooltip: chartTooltip({ trigger: 'axis', axisPointer: { type: 'shadow' } }),
      grid: { top: 12, left: 118, right: 36, bottom: 20 },
      xAxis: {
        type: 'value',
        axisLabel: { color: 'var(--ink-faint)', fontSize: 11 },
        splitLine: { lineStyle: { color: 'var(--border)', type: 'dashed' } },
      },
      yAxis: {
        type: 'category',
        data: top10.map((i) => `@${i.actor}`),
        axisLabel: { color: 'var(--ink)', fontSize: 11, fontWeight: 600 },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          name: SORT_LABELS[sortBy === 'recent' ? 'score' : sortBy],
          type: 'bar',
          data: top10.map((i) => ({
            value: metricValue(i),
            itemStyle: {
              color: colorForRole(i.role),
              borderRadius: [0, 4, 4, 0],
            },
          })),
          barWidth: 16,
          label: {
            show: true,
            position: 'right',
            color: 'var(--ink)',
            fontSize: 11,
            fontWeight: 600,
          },
        },
      ],
    };
  }, [items, sortBy]);

  const exportCSV = () => {
    if (!items.length) return toast.error('No contributors to export');
    const headers = [
      'Rank',
      'Actor',
      'Role',
      'Score',
      'Total Actions',
      'PRs Touched',
      'PRs Reviewed',
      'PRs Merged',
      'PRs Created',
      'Comments',
      'Last Active',
    ];
    const rows = items.map((i) => [
      String(i.rank),
      i.actor,
      i.role,
      String(i.totalScore),
      String(i.totalActions),
      String(i.prsTouched),
      String(i.prsReviewed),
      String(i.prsMerged),
      String(i.prsCreated),
      String(i.comments),
      formatDate(i.lastActivity),
    ]);
    const csv = [
      headers.join(','),
      ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `leaderboard-${preset}-${role.toLowerCase()}.csv`;
    a.click();
    toast.success('Exported leaderboard CSV');
  };

  const SortIcon = ({ col }: { col: SortBy }) => {
    if (sortBy !== col) return <ArrowUpDown className="h-3 w-3 text-[var(--ink-faint)]" />;
    return sortDir === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-[var(--brand-strong)]" />
    ) : (
      <ArrowDown className="h-3 w-3 text-[var(--brand-strong)]" />
    );
  };

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const pagedItems = items.slice((page - 1) * pageSize, page * pageSize);
  const breakdownTotalPages = Math.max(1, Math.ceil(breakdownRows.length / breakdownPageSize));
  const pagedBreakdown = breakdownRows.slice(
    (breakdownPage - 1) * breakdownPageSize,
    breakdownPage * breakdownPageSize,
  );

  return (
    <div data-ledger className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <PageHead
        eyebrow="GOVERNANCE RANKINGS"
        title="Contributor Leaderboard"
        lead="Ranked Ethereum standards contributors with custom date windows, role filters, and score/action sorting."
      >
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[11px] text-[var(--ink-muted)]">
          <span>
            <strong className="text-[var(--ink)]">{summary.totalContributors.toLocaleString()}</strong> contributors
          </span>
          <span className="text-[var(--border-strong)]">·</span>
          <span>
            <strong className="text-[var(--ink)]">{summary.totalActions.toLocaleString()}</strong> actions
          </span>
          <span className="text-[var(--border-strong)]">·</span>
          <span>
            Window: <strong className="text-[var(--ink)]">{from || '2015-01-01'}</strong> →{' '}
            <strong className="text-[var(--ink)]">{to || todayStr}</strong>
          </span>
          <span
            className="inline-flex items-center gap-1 text-[var(--brand-strong)] cursor-help"
            title="Score = PRs Touched + (Reviews × 2) + (PRs Merged × 3) + PRs Created"
          >
            <Info className="h-3.5 w-3.5" />
            Score formula
          </span>
        </div>
      </PageHead>

      <main className="wrap space-y-8 py-6">
        {/* Compact Control Bar: Search first + Date Presets + Role + Repo + Sort + Export */}
        <div className="space-y-3 rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] p-3.5">
          <div className="flex flex-wrap items-center gap-3">
            {/* Prominent Search */}
            <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ink-faint)]" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search contributor @handle..."
                className="h-8 w-full rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface-2)] pl-8 pr-7 text-xs text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:border-[var(--ink)] focus:outline-none"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] hover:text-[var(--ink)]"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Time Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              {PRESET_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  data-active={preset === p.value}
                  onClick={() => setPreset(p.value)}
                  className="chip"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {preset === 'custom' && (
              <div className="flex flex-wrap items-center gap-1.5">
                <input
                  type="date"
                  value={customFrom}
                  max={customTo || undefined}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  aria-label="From date"
                  className="h-8 rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface-2)] px-2 font-mono text-xs text-[var(--ink)]"
                />
                <span className="text-xs text-[var(--ink-faint)]">→</span>
                <input
                  type="date"
                  value={customTo}
                  min={customFrom || undefined}
                  onChange={(e) => setCustomTo(e.target.value)}
                  aria-label="To date"
                  className="h-8 rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface-2)] px-2 font-mono text-xs text-[var(--ink)]"
                />
              </div>
            )}

            <button
              type="button"
              onClick={exportCSV}
              title="Export leaderboard to CSV"
              aria-label="Export leaderboard to CSV"
              className="btn btn-primary ml-auto h-8 w-8 shrink-0 p-0"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-2.5">
            {/* Role Filter */}
            <div className="flex flex-wrap items-center gap-1.5">
              {ROLE_OPTIONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  data-active={role === r.value}
                  onClick={() => setRole(r.value)}
                  className="chip"
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="hidden h-5 w-px bg-[var(--border)] md:block" />

            {/* Repo Filter */}
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

            {/* Sort By */}
            <div className="ml-auto flex items-center gap-2">
              <label htmlFor="lb-sort" className="eyebrow">
                Sort:
              </label>
              <select
                id="lb-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="h-8 text-xs font-medium"
              >
                {Object.entries(SORT_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Immediate Leaderboard Table */}
        <section className="space-y-4">
          <div className="overflow-x-auto rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)]">
            {loading ? (
              <div className="flex min-h-[280px] items-center justify-center">
                <InlineBrandLoader size="sm" label="Loading leaderboard..." />
              </div>
            ) : pagedItems.length === 0 ? (
              <div className="py-12 text-center text-sm text-[var(--ink-muted)]">
                No contributors found for the selected filters.
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                    <th className="px-4 py-3 text-left eyebrow">Rank</th>
                    <th className="px-4 py-3 text-left eyebrow">Contributor</th>
                    <th className="px-4 py-3 text-left eyebrow">Role</th>
                    <th className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleSort('score')}
                        title="Score = PRs Touched + (Reviews × 2) + (Merged × 3) + Created"
                        className="inline-flex items-center gap-1 eyebrow hover:text-[var(--ink)]"
                      >
                        Score <SortIcon col="score" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleSort('actions')}
                        className="inline-flex items-center gap-1 eyebrow hover:text-[var(--ink)]"
                      >
                        Actions <SortIcon col="actions" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleSort('reviews')}
                        className="inline-flex items-center gap-1 eyebrow hover:text-[var(--ink)]"
                      >
                        Reviews <SortIcon col="reviews" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleSort('merged')}
                        className="inline-flex items-center gap-1 eyebrow hover:text-[var(--ink)]"
                      >
                        Merged <SortIcon col="merged" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleSort('created')}
                        className="inline-flex items-center gap-1 eyebrow hover:text-[var(--ink)]"
                      >
                        Created <SortIcon col="created" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleSort('comments')}
                        className="inline-flex items-center gap-1 eyebrow hover:text-[var(--ink)]"
                      >
                        Comments <SortIcon col="comments" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleSort('prs_touched')}
                        className="inline-flex items-center gap-1 eyebrow hover:text-[var(--ink)]"
                      >
                        PRs <SortIcon col="prs_touched" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleSort('recent')}
                        className="inline-flex items-center gap-1 eyebrow hover:text-[var(--ink)]"
                      >
                        Last Active <SortIcon col="recent" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {pagedItems.map((item) => {
                    const isSelected = selectedActor === item.actor;
                    return (
                      <tr
                        key={item.actor}
                        onClick={() => handleInspectActor(item.actor)}
                        className={cn(
                          'cursor-pointer transition-colors hover:bg-[var(--surface-2)]',
                          isSelected && 'bg-[var(--surface-2)]',
                        )}
                      >
                        <td className="px-4 py-2.5 font-mono font-semibold">
                          <span
                            className={cn(
                              item.rank === 1 && 'text-[#eab308]',
                              item.rank === 2 && 'text-[#94a3b8]',
                              item.rank === 3 && 'text-[#d97706]',
                              item.rank > 3 && 'text-[var(--ink-faint)]',
                            )}
                          >
                            #{item.rank}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-7 w-7 border border-[var(--border)]">
                              <AvatarImage
                                src={`https://github.com/${encodeURIComponent(item.actor)}.png?size=64`}
                                alt={item.actor}
                              />
                              <AvatarFallback className="bg-[var(--surface-2)] font-mono text-[10px] font-semibold text-[var(--ink-muted)]">
                                {initials(item.actor)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-mono font-semibold text-[var(--brand-strong)]">
                              @{item.actor}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <LedgerBadge token={item.role} className="text-[10px]">
                            {item.role}
                          </LedgerBadge>
                        </td>
                        <td
                          className="px-4 py-2.5 text-right font-mono font-bold tabular-nums text-[var(--ink)] cursor-help"
                          title={scoreFormulaTitle(item)}
                        >
                          {item.totalScore.toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums text-[var(--ink)]">
                          {item.totalActions.toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums text-[var(--ink-muted)]">
                          {item.prsReviewed.toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums text-[var(--ink-muted)]">
                          {item.prsMerged.toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums text-[var(--ink-muted)]">
                          {item.prsCreated.toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums text-[var(--ink-muted)]">
                          {item.comments.toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums text-[var(--ink-muted)]">
                          {item.prsTouched.toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums text-[var(--ink-muted)]">
                          {formatDate(item.lastActivity)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4 text-xs text-[var(--ink-muted)]">
            <span className="font-mono">
              Click any row to verify PR actions · Hover any score for its formula · Page {page} / {totalPages}
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

        {/* Verified Action Log for selected contributor */}
        {selectedActor && (
          <section ref={breakdownRef} className="space-y-4 border-t border-[var(--border)] pt-6">
            <SectionHead
              index="01"
              eyebrow="VERIFIED ACTION LOG"
              title={`@${selectedActor} — Action Breakdown`}
              action={
                <button type="button" onClick={() => setSelectedActor(null)} className="btn h-8 px-2.5 text-xs">
                  <X className="h-3.5 w-3.5" />
                  Close
                </button>
              }
            />

            <div className="overflow-x-auto rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)]">
              {breakdownLoading ? (
                <div className="flex min-h-[180px] items-center justify-center">
                  <InlineBrandLoader size="sm" label={`Loading @${selectedActor} actions...`} />
                </div>
              ) : pagedBreakdown.length === 0 ? (
                <div className="py-10 text-center text-sm text-[var(--ink-muted)]">
                  No individual actions found for @{selectedActor}.
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                      <th className="px-4 py-3 text-left eyebrow">PR</th>
                      <th className="px-4 py-3 text-left eyebrow">Repo</th>
                      <th className="px-4 py-3 text-left eyebrow">Role</th>
                      <th className="px-4 py-3 text-left eyebrow">Action</th>
                      <th className="px-4 py-3 text-right eyebrow">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {pagedBreakdown.map((row) => (
                      <tr key={row.id} className="hover:bg-[var(--surface-2)]">
                        <td className="px-4 py-2.5 font-mono">
                          <Link
                            href={`/pr/${repoSlugFromName(row.repoName)}/${row.prNumber}`}
                            className="font-semibold text-[var(--brand-strong)] hover:underline"
                          >
                            #{row.prNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-[var(--ink-muted)]">{row.repoName}</td>
                        <td className="px-4 py-2.5">
                          <LedgerBadge token={row.role} className="text-[10px]">
                            {row.role}
                          </LedgerBadge>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-[var(--ink)]">{row.actionType}</td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums text-[var(--ink-muted)]">
                          {formatDate(row.occurredAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {breakdownTotalPages > 1 && (
              <div className="flex items-center justify-between text-xs text-[var(--ink-muted)]">
                <span className="font-mono">
                  Page {breakdownPage} / {breakdownTotalPages} ({breakdownRows.length} actions)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={breakdownPage <= 1}
                    onClick={() => setBreakdownPage((p) => Math.max(1, p - 1))}
                    className="btn h-8 px-2.5 text-xs disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={breakdownPage >= breakdownTotalPages}
                    onClick={() => setBreakdownPage((p) => Math.min(breakdownTotalPages, p + 1))}
                    className="btn h-8 px-2.5 text-xs disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Top 10 Visual Chart below the table */}
        {items.length > 0 && (
          <section>
            <SectionHead
              index={selectedActor ? '02' : '01'}
              eyebrow={`TOP 10 BY ${SORT_LABELS[sortBy].toUpperCase()}`}
              title="Leading Contributors"
            />
            <div className="rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] p-5">
              <div className="relative h-[300px] w-full">
                <ReactECharts option={topChartOption} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'svg' }} />
                <ChartWatermark />
              </div>
              <ChartFooter />
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense
      fallback={
        <div data-ledger className="flex min-h-screen items-center justify-center bg-[var(--paper)] text-[var(--ink)]">
          <InlineBrandLoader size="md" label="Loading Leaderboard..." />
        </div>
      }
    >
      <LeaderboardContent />
    </Suspense>
  );
}
