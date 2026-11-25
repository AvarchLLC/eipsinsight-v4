'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

type Role = 'EDITOR' | 'REVIEWER' | 'CONTRIBUTOR' | 'AUTHOR' | null;
type RepoFilter = 'all' | 'eips' | 'ercs' | 'rips';
type CategoryFilter = 'all' | 'governance' | 'core' | 'erc' | 'networking' | 'interface' | 'meta' | 'informational';
type TimeRange = '30d' | '90d' | '365d' | 'all';

interface LeaderboardEntry {
  rank: number;
  actor: string;
  totalActions: number;
  totalScore: number;
  prsReviewed: number;
  comments: number;
  prsCreated: number;
  prsMerged: number;
  prsTouched: number;
  avgResponseHours: number | null;
  lastActivity: string | null;
  role: string | null;
}

interface AuthorRow {
  rank: number;
  author: string;
  eipsCreated: number;
  lastCreatedAt: string | null;
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

interface ContributionMixRow {
  metric: string;
  EDITOR: number;
  REVIEWER: number;
  CONTRIBUTOR: number;
  total: number;
}

const REPO_OPTIONS: Array<{ value: RepoFilter; label: string }> = [
  { value: 'all', label: 'All Repos' },
  { value: 'eips', label: 'EIPs' },
  { value: 'ercs', label: 'ERCs' },
  { value: 'rips', label: 'RIPs' },
];

const CATEGORY_OPTIONS: Array<{ value: CategoryFilter; label: string }> = [
  { value: 'all', label: 'All Categories' },
  { value: 'governance', label: 'Governance' },
  { value: 'core', label: 'Core' },
  { value: 'erc', label: 'ERC' },
  { value: 'networking', label: 'Networking' },
  { value: 'interface', label: 'Interface' },
  { value: 'meta', label: 'Meta' },
  { value: 'informational', label: 'Informational' },
];

const TIME_RANGE_OPTIONS: Array<{ value: TimeRange; label: string }> = [
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '365d', label: '1 year' },
  { value: 'all', label: 'All time' },
];

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

export function ExploreRolesTab() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialRoleRaw = (searchParams.get('role') || '').toUpperCase();
  const initialRole: Role =
    initialRoleRaw === 'EDITOR' ||
    initialRoleRaw === 'REVIEWER' ||
    initialRoleRaw === 'CONTRIBUTOR' ||
    initialRoleRaw === 'AUTHOR'
      ? initialRoleRaw
      : null;

  const [selectedRole, setSelectedRole] = useState<Role>(initialRole);
  const [repo, setRepo] = useState<RepoFilter>((searchParams.get('repo') as RepoFilter) || 'all');
  const [category, setCategory] = useState<CategoryFilter>((searchParams.get('category') as CategoryFilter) || 'all');
  const [timeRange, setTimeRange] = useState<TimeRange>((searchParams.get('timeRange') as TimeRange) || '90d');
  const [actorFilter, setActorFilter] = useState<string>('');
  const [debouncedActor, setDebouncedActor] = useState<string>('');

  const [roleCounts, setRoleCounts] = useState({ editors: 0, reviewers: 0, contributors: 0, authors: 0 });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [lbPage, setLbPage] = useState(1);
  const lbPageSize = 15;

  const [authors, setAuthors] = useState<AuthorRow[]>([]);
  const [authorsTotal, setAuthorsTotal] = useState(0);
  const [authorsPage, setAuthorsPage] = useState(1);
  const authorsPageSize = 15;

  const [contributionMix, setContributionMix] = useState<ContributionMixRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedActor, setSelectedActor] = useState<string | null>(null);
  const [breakdownRows, setBreakdownRows] = useState<ActorBreakdownRow[]>([]);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [breakdownPage, setBreakdownPage] = useState(1);
  const breakdownPageSize = 12;
  const breakdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedActor(actorFilter);
      setLbPage(1);
    }, 280);
    return () => clearTimeout(t);
  }, [actorFilter]);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('tab', 'roles');
    if (selectedRole) params.set('role', selectedRole.toLowerCase());
    if (repo !== 'all') params.set('repo', repo);
    if (category !== 'all') params.set('category', category);
    if (timeRange !== '90d') params.set('timeRange', timeRange);
    router.replace(`/explore?${params.toString()}`, { scroll: false });
  }, [selectedRole, repo, category, timeRange, router]);

  useEffect(() => {
    Promise.all([
      client.explore.getRoleCounts({ repo, category, timeRange }),
      client.explore.getRoleAuthorCount({ repo, category, timeRange }),
    ])
      .then(([data, authorsMeta]) => {
        setRoleCounts({
          editors: data.find((r) => r.role === 'EDITOR')?.uniqueActors || 0,
          reviewers: data.find((r) => r.role === 'REVIEWER')?.uniqueActors || 0,
          contributors: data.find((r) => r.role === 'CONTRIBUTOR')?.uniqueActors || 0,
          authors: authorsMeta.count || 0,
        });
      })
      .catch((err) => console.error('Failed to load role counts:', err));
  }, [repo, category, timeRange]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const roleArg = selectedRole && selectedRole !== 'AUTHOR' ? selectedRole : undefined;
    const actorArg = debouncedActor.trim() || undefined;

    Promise.allSettled([
      client.explore.getRoleLeaderboard({ role: roleArg, repo, category, timeRange, actor: actorArg, limit: 100 }),
      client.explore.getRoleAuthors({ repo, category, timeRange, limit: authorsPageSize, offset: (authorsPage - 1) * authorsPageSize }),
      client.explore.getRoleContributionMix({ repo, category, timeRange, actor: actorArg }),
    ])
      .then(([lbRes, auRes, mixRes]) => {
        if (cancelled) return;
        if (lbRes.status === 'fulfilled') setLeaderboard(lbRes.value as LeaderboardEntry[]);
        if (auRes.status === 'fulfilled') {
          const data = auRes.value as { items: AuthorRow[]; total: number };
          setAuthors(data.items);
          setAuthorsTotal(data.total);
        }
        if (mixRes.status === 'fulfilled') setContributionMix(mixRes.value as ContributionMixRow[]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedRole, repo, category, timeRange, debouncedActor, authorsPage]);

  // Load actor breakdown when user clicks a row
  useEffect(() => {
    if (!selectedActor) {
      setBreakdownRows([]);
      return;
    }
    let cancelled = false;
    setBreakdownLoading(true);
    client.explore
      .getRoleActorBreakdown({
        actor: selectedActor,
        repo,
        category,
        timeRange,
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
  }, [selectedActor, repo, category, timeRange]);

  const handleInspectActor = useCallback((actor: string) => {
    setSelectedActor(actor);
    setTimeout(() => {
      breakdownRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 60);
  }, []);

  const mixOption = useMemo(() => {
    return {
      backgroundColor: 'transparent',
      tooltip: chartTooltip({ trigger: 'axis', axisPointer: { type: 'shadow' } }),
      legend: {
        top: 0,
        textStyle: { color: 'var(--ink-muted)', fontSize: 11 },
      },
      grid: { top: 36, left: 48, right: 20, bottom: 24 },
      xAxis: {
        type: 'category',
        data: contributionMix.map((m) => m.metric),
        axisLabel: { color: 'var(--ink)', fontSize: 11, fontWeight: 500 },
        axisLine: { lineStyle: { color: 'var(--border)' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: 'var(--ink-faint)', fontSize: 11 },
        splitLine: { lineStyle: { color: 'var(--border)', type: 'dashed' } },
      },
      series: [
        {
          name: 'Editors',
          type: 'bar',
          stack: 'roles',
          data: contributionMix.map((m) => m.EDITOR),
          itemStyle: { color: '#10b981' },
          barMaxWidth: 36,
        },
        {
          name: 'Reviewers',
          type: 'bar',
          stack: 'roles',
          data: contributionMix.map((m) => m.REVIEWER),
          itemStyle: { color: '#0ea5e9' },
          barMaxWidth: 36,
        },
        {
          name: 'Contributors',
          type: 'bar',
          stack: 'roles',
          data: contributionMix.map((m) => m.CONTRIBUTOR),
          itemStyle: { color: '#64748b', borderRadius: [3, 3, 0, 0] },
          barMaxWidth: 36,
        },
      ],
    };
  }, [contributionMix]);

  const exportLeaderboardCSV = () => {
    if (selectedRole === 'AUTHOR') {
      if (!authors.length) return toast.error('No author rows to export');
      const headers = ['Rank', 'Author', 'Proposals Authored', 'Last Created'];
      const csvRows = authors.map((a) => [String(a.rank), a.author, String(a.eipsCreated), formatDate(a.lastCreatedAt)]);
      const csv = [headers.join(','), ...csvRows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `authors-${timeRange}.csv`;
      a.click();
      return toast.success('Exported authors CSV');
    }

    if (!leaderboard.length) return toast.error('No rows to export');
    const headers = ['Rank', 'Actor', 'Role', 'Total Actions', 'PRs Reviewed', 'Comments', 'PRs Created', 'PRs Merged', 'Last Activity'];
    const csvRows = leaderboard.map((r) => [
      String(r.rank),
      r.actor,
      r.role || 'CONTRIBUTOR',
      String(r.totalActions),
      String(r.prsReviewed),
      String(r.comments),
      String(r.prsCreated),
      String(r.prsMerged),
      formatDate(r.lastActivity),
    ]);
    const csv = [headers.join(','), ...csvRows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `governance-roles-${selectedRole ?? 'all'}-${timeRange}.csv`;
    a.click();
    toast.success('Exported role leaderboard CSV');
  };

  const lbTotalPages = Math.max(1, Math.ceil(leaderboard.length / lbPageSize));
  const pagedLeaderboard = leaderboard.slice((lbPage - 1) * lbPageSize, lbPage * lbPageSize);
  const authorsTotalPages = Math.max(1, Math.ceil(authorsTotal / authorsPageSize));
  const breakdownTotalPages = Math.max(1, Math.ceil(breakdownRows.length / breakdownPageSize));
  const pagedBreakdown = breakdownRows.slice((breakdownPage - 1) * breakdownPageSize, breakdownPage * breakdownPageSize);

  return (
    <div className="space-y-8">
      {/* Ruled Role KPI Strip — clicking selects that role */}
      <div className="grid grid-cols-2 divide-y divide-[var(--border)] border-y border-[var(--border)] bg-[var(--surface)] sm:grid-cols-5 sm:divide-x sm:divide-y-0">
        {[
          { key: null as Role, label: 'All Roles', count: roleCounts.editors + roleCounts.reviewers + roleCounts.contributors },
          { key: 'EDITOR' as Role, label: 'Editors', count: roleCounts.editors },
          { key: 'REVIEWER' as Role, label: 'Reviewers', count: roleCounts.reviewers },
          { key: 'CONTRIBUTOR' as Role, label: 'Contributors', count: roleCounts.contributors },
          { key: 'AUTHOR' as Role, label: 'Authors', count: roleCounts.authors },
        ].map((item) => {
          const active = selectedRole === item.key;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setSelectedRole(item.key);
                setLbPage(1);
                setSelectedActor(null);
              }}
              className={cn(
                'flex flex-col items-start px-5 py-4 text-left transition-colors hover:bg-[var(--surface-2)]',
                active && 'bg-[var(--surface-2)]',
              )}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="eyebrow">{item.label}</span>
                {active && <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand)]" />}
              </div>
              <span className="t-figure mt-2 text-2xl sm:text-3xl">{item.count.toLocaleString()}</span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {REPO_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              data-active={repo === opt.value}
              onClick={() => {
                setRepo(opt.value);
                setLbPage(1);
                setAuthorsPage(1);
              }}
              className="chip"
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="hidden h-5 w-px bg-[var(--border)] sm:block" />

        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value as CategoryFilter);
            setLbPage(1);
            setAuthorsPage(1);
          }}
          aria-label="Filter by category"
          className="h-8 text-xs font-medium"
        >
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>

        <select
          value={timeRange}
          onChange={(e) => {
            setTimeRange(e.target.value as TimeRange);
            setLbPage(1);
            setAuthorsPage(1);
          }}
          aria-label="Time window"
          className="h-8 text-xs font-medium"
        >
          {TIME_RANGE_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        {selectedRole !== 'AUTHOR' && (
          <div className="relative ml-auto min-w-[180px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ink-faint)]" />
            <input
              type="text"
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value)}
              placeholder="Filter GitHub handle..."
              className="h-8 w-full rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface-2)] pl-8 pr-7 text-xs text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:border-[var(--ink)] focus:outline-none"
            />
            {actorFilter && (
              <button
                type="button"
                onClick={() => setActorFilter('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] hover:text-[var(--ink)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Contribution Mix Chart */}
      {selectedRole !== 'AUTHOR' && (
        <section>
          <SectionHead
            index="01"
            eyebrow="CONTRIBUTION MIX"
            title="Governance Actions by Role"
          />
          <div className="rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="relative h-[280px] w-full">
              <ReactECharts option={mixOption} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'svg' }} />
              <ChartWatermark />
            </div>
            <ChartFooter />
          </div>
        </section>
      )}

      {/* Role Leaderboard or Authors Table */}
      <section className="space-y-4">
        <SectionHead
          index={selectedRole === 'AUTHOR' ? '01' : '02'}
          eyebrow="ACCOUNTABILITY"
          title={selectedRole === 'AUTHOR' ? 'Proposal Authors' : 'Governance Contributors'}
          action={
            <button
              type="button"
              onClick={exportLeaderboardCSV}
              title="Export table to CSV"
              aria-label="Export table to CSV"
              className="btn btn-primary h-8 w-8 shrink-0 p-0"
            >
              <Download className="h-4 w-4" />
            </button>
          }
        />

        {selectedRole === 'AUTHOR' ? (
          <>
            <div className="overflow-x-auto rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)]">
              {loading ? (
                <div className="flex min-h-[240px] items-center justify-center">
                  <InlineBrandLoader size="sm" label="Loading authors..." />
                </div>
              ) : authors.length === 0 ? (
                <div className="py-12 text-center text-sm text-[var(--ink-muted)]">No authors found in this window.</div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                      <th className="px-4 py-3 text-left eyebrow">Rank</th>
                      <th className="px-4 py-3 text-left eyebrow">Author</th>
                      <th className="px-4 py-3 text-right eyebrow">Proposals Authored</th>
                      <th className="px-4 py-3 text-right eyebrow">Latest Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {authors.map((a) => (
                      <tr key={a.author} className="hover:bg-[var(--surface-2)]">
                        <td className="px-4 py-3 font-mono text-[var(--ink-faint)]">#{a.rank}</td>
                        <td className="px-4 py-3 font-mono font-semibold text-[var(--ink)]">{a.author}</td>
                        <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-[var(--brand-strong)]">
                          {a.eipsCreated}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-[var(--ink-muted)]">
                          {formatDate(a.lastCreatedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-[var(--border)] pt-4 text-xs text-[var(--ink-muted)]">
              <span className="font-mono">
                Page {authorsPage} / {authorsTotalPages} ({authorsTotal.toLocaleString()} authors)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={authorsPage <= 1}
                  onClick={() => setAuthorsPage((p) => Math.max(1, p - 1))}
                  className="btn h-8 px-2.5 text-xs disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </button>
                <button
                  type="button"
                  disabled={authorsPage >= authorsTotalPages}
                  onClick={() => setAuthorsPage((p) => Math.min(authorsTotalPages, p + 1))}
                  className="btn h-8 px-2.5 text-xs disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="overflow-x-auto rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)]">
              {loading ? (
                <div className="flex min-h-[240px] items-center justify-center">
                  <InlineBrandLoader size="sm" label="Loading contributors..." />
                </div>
              ) : pagedLeaderboard.length === 0 ? (
                <div className="py-12 text-center text-sm text-[var(--ink-muted)]">
                  No contributor activity found for the selected filters.
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                      <th className="px-4 py-3 text-left eyebrow">Rank</th>
                      <th className="px-4 py-3 text-left eyebrow">Contributor</th>
                      <th className="px-4 py-3 text-left eyebrow">Role</th>
                      <th className="px-4 py-3 text-right eyebrow">Actions</th>
                      <th className="px-4 py-3 text-right eyebrow">Reviews</th>
                      <th className="px-4 py-3 text-right eyebrow">Merged</th>
                      <th className="px-4 py-3 text-right eyebrow">Comments</th>
                      <th className="px-4 py-3 text-right eyebrow">Last Active</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {pagedLeaderboard.map((entry) => {
                      const isSelected = selectedActor === entry.actor;
                      const roleToken = (entry.role || 'contributor').toLowerCase();
                      return (
                        <tr
                          key={entry.actor}
                          onClick={() => handleInspectActor(entry.actor)}
                          className={cn(
                            'cursor-pointer transition-colors hover:bg-[var(--surface-2)]',
                            isSelected && 'bg-[var(--surface-2)]',
                          )}
                        >
                          <td className="px-4 py-3 font-mono text-[var(--ink-faint)]">#{entry.rank}</td>
                          <td className="px-4 py-3">
                            <span className="font-mono font-semibold text-[var(--brand-strong)] hover:underline">
                              @{entry.actor}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <LedgerBadge token={roleToken} className="text-[10px]">
                              {entry.role || 'Contributor'}
                            </LedgerBadge>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-[var(--ink)]">
                            {entry.totalActions.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums text-[var(--ink-muted)]">
                            {entry.prsReviewed.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums text-[var(--ink-muted)]">
                            {entry.prsMerged.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums text-[var(--ink-muted)]">
                            {entry.comments.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums text-[var(--ink-muted)]">
                            {formatDate(entry.lastActivity)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-[var(--border)] pt-4 text-xs text-[var(--ink-muted)]">
              <span className="font-mono">
                Click any contributor row to inspect their exact PR actions · Page {lbPage} / {lbTotalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={lbPage <= 1}
                  onClick={() => setLbPage((p) => Math.max(1, p - 1))}
                  className="btn h-8 px-2.5 text-xs disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </button>
                <button
                  type="button"
                  disabled={lbPage >= lbTotalPages}
                  onClick={() => setLbPage((p) => Math.min(lbTotalPages, p + 1))}
                  className="btn h-8 px-2.5 text-xs disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Actor Breakdown Drawer Table (Verifiable Action Log) */}
      {selectedActor && (
        <div ref={breakdownRef} className="space-y-4 border-t border-[var(--border)] pt-6">
          <SectionHead
            index="03"
            eyebrow="VERIFIED ACTION LOG"
            title={`@${selectedActor} — Action Breakdown`}
            action={
              <button
                type="button"
                onClick={() => setSelectedActor(null)}
                className="btn h-8 px-2.5 text-xs"
              >
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
                No individual actions recorded in this window.
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                    <th className="px-4 py-3 text-left eyebrow">PR</th>
                    <th className="px-4 py-3 text-left eyebrow">Repo</th>
                    <th className="px-4 py-3 text-left eyebrow">Role</th>
                    <th className="px-4 py-3 text-left eyebrow">Action</th>
                    <th className="px-4 py-3 text-right eyebrow">When</th>
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
        </div>
      )}
    </div>
  );
}
