'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, Filter, X } from 'lucide-react';
import { motion } from 'motion/react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { client } from '@/lib/orpc';
import { RoleTabSwitcher } from './_components/role-tab-switcher';
import { RoleLeaderboard } from './_components/role-leaderboard';
import { RoleActivityTimeline } from './_components/role-activity-timeline';
import { RoleAuthorsTable } from './_components/role-authors-table';
import { ExploreTabsHeader } from '../_components/explore-tabs-header';

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

interface ActivityEvent {
  id: string;
  actor: string;
  role: string | null;
  eventType: string;
  prNumber: number;
  createdAt: string;
  githubId: string | null;
  repoName: string;
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

interface AuthorsResponse {
  items: AuthorRow[];
  total: number;
  hasMore: boolean;
}

const REPO_OPTIONS: Array<{ value: RepoFilter; label: string }> = [
  { value: 'all', label: 'All repos' },
  { value: 'eips', label: 'EIPs' },
  { value: 'ercs', label: 'ERCs' },
  { value: 'rips', label: 'RIPs' },
];

const CATEGORY_OPTIONS: Array<{ value: CategoryFilter; label: string }> = [
  { value: 'all', label: 'All categories' },
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
  { value: '365d', label: '365 days' },
  { value: 'all', label: 'All time' },
];

const ROLE_COLORS: Record<string, string> = {
  EDITOR: '#2dd4bf',
  REVIEWER: '#60a5fa',
  CONTRIBUTOR: '#fbbf24',
};

function titleCase(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((token) => token[0]?.toUpperCase() + token.slice(1))
    .join(' ');
}

function formatHoursToLabel(hours: number | null): string {
  if (hours == null || Number.isNaN(hours)) return '—';
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

function formatBreakdownTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function RolesPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialRoleParam = searchParams.get('role')?.toUpperCase();
  const initialRole: Role = initialRoleParam === 'EDITOR' || initialRoleParam === 'REVIEWER' || initialRoleParam === 'CONTRIBUTOR' || initialRoleParam === 'AUTHOR'
    ? initialRoleParam
    : null;

  const initialRepo = (searchParams.get('repo')?.toLowerCase() as RepoFilter) || 'all';
  const initialCategory = (searchParams.get('category')?.toLowerCase() as CategoryFilter) || 'all';
  const initialTimeRange = (searchParams.get('timeRange')?.toLowerCase() as TimeRange) || '90d';
  const initialActor = searchParams.get('actor');

  const [selectedRole, setSelectedRole] = useState<Role>(initialRole);
  const [repo, setRepo] = useState<RepoFilter>(REPO_OPTIONS.some((opt) => opt.value === initialRepo) ? initialRepo : 'all');
  const [category, setCategory] = useState<CategoryFilter>(CATEGORY_OPTIONS.some((opt) => opt.value === initialCategory) ? initialCategory : 'all');
  const [timeRange, setTimeRange] = useState<TimeRange>(TIME_RANGE_OPTIONS.some((opt) => opt.value === initialTimeRange) ? initialTimeRange : '90d');
  const [selectedActor, setSelectedActor] = useState<string | null>(initialActor || null);

  const [roleCounts, setRoleCounts] = useState({ editors: 0, reviewers: 0, contributors: 0, authors: 0 });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [timeline, setTimeline] = useState<ActivityEvent[]>([]);
  const [authors, setAuthors] = useState<AuthorRow[]>([]);
  const [authorsTotal, setAuthorsTotal] = useState(0);
  const [authorsPage, setAuthorsPage] = useState(1);

  const [countsLoading, setCountsLoading] = useState(true);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [authorsLoading, setAuthorsLoading] = useState(true);
  const [timelineFallbackUsed, setTimelineFallbackUsed] = useState(false);
  const [breakdownTarget, setBreakdownTarget] = useState<{ actor: string; metric: 'prsTouched' | 'totalActions' | 'totalScore' } | null>(null);
  const [breakdownRows, setBreakdownRows] = useState<ActorBreakdownRow[]>([]);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [breakdownPage, setBreakdownPage] = useState(1);
  const [contributionMix, setContributionMix] = useState<ContributionMixRow[]>([
    { metric: 'Reviews', EDITOR: 0, REVIEWER: 0, CONTRIBUTOR: 0, total: 0 },
    { metric: 'Comments', EDITOR: 0, REVIEWER: 0, CONTRIBUTOR: 0, total: 0 },
    { metric: 'PR Created', EDITOR: 0, REVIEWER: 0, CONTRIBUTOR: 0, total: 0 },
    { metric: 'PR Merged', EDITOR: 0, REVIEWER: 0, CONTRIBUTOR: 0, total: 0 },
  ]);
  const breakdownSectionRef = useRef<HTMLDivElement | null>(null);

  const syncUrl = useCallback(
    (
      nextRole: Role,
      nextRepo: RepoFilter,
      nextCategory: CategoryFilter,
      nextTimeRange: TimeRange,
      nextActor: string | null
    ) => {
      const params = new URLSearchParams();
      if (nextRole) params.set('role', nextRole.toLowerCase());
      if (nextRepo !== 'all') params.set('repo', nextRepo);
      if (nextCategory !== 'all') params.set('category', nextCategory);
      if (nextTimeRange !== '90d') params.set('timeRange', nextTimeRange);
      if (nextActor) params.set('actor', nextActor);
      const query = params.toString();
      router.replace(query ? `/explore/roles?${query}` : '/explore/roles', { scroll: false });
    },
    [router]
  );

  useEffect(() => {
    syncUrl(selectedRole, repo, category, timeRange, selectedActor);
  }, [selectedRole, repo, category, timeRange, selectedActor, syncUrl]);

  useEffect(() => {
    queueMicrotask(() => setCountsLoading(true));
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
      .catch((error) => console.error('Failed to fetch role counts:', error))
      .finally(() => setCountsLoading(false));
  }, [repo, category, timeRange]);

  useEffect(() => {
    queueMicrotask(() => setAuthorsPage(1));
  }, [repo, category, timeRange]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setLeaderboardLoading(true);
        setTimelineLoading(true);
        setAuthorsLoading(true);
      }
    });

    const roleArg = selectedRole && selectedRole !== 'AUTHOR' ? selectedRole : undefined;
    const actorArg = selectedActor || undefined;

    Promise.allSettled([
      client.explore.getRoleLeaderboard({ role: roleArg, repo, category, timeRange, actor: actorArg, limit: 40 }),
      client.explore.getRoleActivityTimeline({ role: roleArg, repo, category, timeRange, actor: actorArg, limit: 100 }),
      client.explore.getRoleAuthors({ repo, category, timeRange, limit: 10, offset: (authorsPage - 1) * 10 }),
      client.explore.getRoleContributionMix({ repo, category, timeRange, actor: actorArg }),
    ]).then(async ([lb, tl, au, mix]) => {
      if (cancelled) return;
      if (lb.status === 'fulfilled') setLeaderboard(lb.value as LeaderboardEntry[]);
      if (tl.status === 'fulfilled') {
        const events = tl.value;
        if (events.length === 0 && timeRange !== 'all') {
          const fallbackEvents = await client.explore.getRoleActivityTimeline({
            role: roleArg,
            repo,
            category,
            timeRange: 'all',
            actor: actorArg,
            limit: 100,
          });
          if (fallbackEvents.length > 0) {
            setTimeline(fallbackEvents);
            setTimelineFallbackUsed(true);
          } else if (actorArg) {
            const widened = await client.explore.getRoleActivityTimeline({
              role: roleArg,
              repo,
              category,
              timeRange: 'all',
              limit: 100,
            });
            setTimeline(widened);
            setTimelineFallbackUsed(widened.length > 0);
          } else {
            setTimeline(fallbackEvents);
            setTimelineFallbackUsed(false);
          }
        } else {
          setTimeline(events);
          setTimelineFallbackUsed(false);
        }
      } else {
        console.error('Failed to fetch role timeline:', tl.reason);
        try {
          const recovery = await client.explore.getRoleActivityTimeline({
            role: roleArg,
            repo,
            category,
            timeRange: 'all',
            limit: 100,
          });
          setTimeline(recovery);
          setTimelineFallbackUsed(recovery.length > 0);
        } catch (err) {
          console.error('Timeline recovery fetch failed:', err);
          setTimeline([]);
          setTimelineFallbackUsed(false);
        }
      }
      if (au.status === 'fulfilled') {
        const data = au.value as AuthorsResponse;
        setAuthors(data.items);
        setAuthorsTotal(data.total);
      }
      if (mix.status === 'fulfilled') {
        setContributionMix(mix.value as ContributionMixRow[]);
      }
    }).finally(() => {
      if (!cancelled) {
        setLeaderboardLoading(false);
        setTimelineLoading(false);
        setAuthorsLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [selectedRole, repo, category, timeRange, selectedActor, authorsPage]);

  const activeFilters = useMemo(() => {
    const chips: Array<{ id: string; label: string; onRemove: () => void }> = [];
    if (selectedRole) {
      chips.push({
        id: 'role',
        label: `Role: ${titleCase(selectedRole)}`,
        onRemove: () => setSelectedRole(null),
      });
    }
    if (repo !== 'all') {
      chips.push({
        id: 'repo',
        label: `Repo: ${repo.toUpperCase()}`,
        onRemove: () => setRepo('all'),
      });
    }
    if (category !== 'all') {
      chips.push({
        id: 'category',
        label: `Category: ${titleCase(category)}`,
        onRemove: () => setCategory('all'),
      });
    }
    if (timeRange !== '90d') {
      chips.push({
        id: 'time',
        label: `Time: ${TIME_RANGE_OPTIONS.find((option) => option.value === timeRange)?.label ?? timeRange}`,
        onRemove: () => setTimeRange('90d'),
      });
    }
    if (selectedActor) {
      chips.push({
        id: 'actor',
        label: `Actor: @${selectedActor}`,
        onRemove: () => setSelectedActor(null),
      });
    }
    return chips;
  }, [selectedRole, repo, category, timeRange, selectedActor]);

  const selectedTimeLabel = useMemo(
    () => TIME_RANGE_OPTIONS.find((option) => option.value === timeRange)?.label ?? timeRange,
    [timeRange]
  );

  const isEditorsView = selectedRole === 'EDITOR';
  const isAuthorsView = selectedRole === 'AUTHOR';

  const leaderboardTitle = selectedRole === 'REVIEWER'
    ? 'Top reviewers'
    : selectedRole === 'CONTRIBUTOR'
      ? 'Top contributors'
      : 'Top participants';

  const leaderboardSubtitle = selectedRole === 'REVIEWER'
    ? 'Who is reviewing most in selected scope, and what type of review work they are doing.'
    : selectedRole === 'CONTRIBUTOR'
      ? 'Who is creating and driving proposal work across repos and categories.'
      : selectedRole === 'EDITOR'
        ? 'Who is coordinating and unblocking proposal flow across standards categories.'
        : 'Blended activity across editor, reviewer, and contributor actions.';

  const scopedActiveParticipants = useMemo(() => {
    if (selectedRole === 'AUTHOR') return roleCounts.authors;
    if (selectedRole === 'EDITOR') return roleCounts.editors;
    if (selectedRole === 'REVIEWER') return roleCounts.reviewers;
    if (selectedRole === 'CONTRIBUTOR') return roleCounts.contributors;
    return roleCounts.editors + roleCounts.reviewers + roleCounts.contributors;
  }, [roleCounts, selectedRole]);

  const insightStats = useMemo(() => {
    const actionTotals = leaderboard.reduce(
      (acc, item) => {
        acc.reviews += item.prsReviewed;
        acc.comments += item.comments;
        acc.created += item.prsCreated;
        acc.merged += item.prsMerged;
        acc.totalActions += item.totalActions;
        return acc;
      },
      { reviews: 0, comments: 0, created: 0, merged: 0, totalActions: 0 }
    );

    const dominantAction = [
      { key: 'reviews', label: 'Review-heavy', value: actionTotals.reviews },
      { key: 'comments', label: 'Comment-heavy', value: actionTotals.comments },
      { key: 'created', label: 'Creation-heavy', value: actionTotals.created },
      { key: 'merged', label: 'Merge-heavy', value: actionTotals.merged },
    ].sort((a, b) => b.value - a.value)[0];

    const top3Share = actionTotals.totalActions > 0
      ? (leaderboard.slice(0, 3).reduce((sum, row) => sum + row.totalActions, 0) / actionTotals.totalActions) * 100
      : 0;

    const responseValues = leaderboard
      .map((row) => row.avgResponseHours)
      .filter((value): value is number => value != null && Number.isFinite(value));
    const avgResponseHours = responseValues.length > 0
      ? responseValues.reduce((sum, value) => sum + value, 0) / responseValues.length
      : null;

    const repoCounts = timeline.reduce<Record<string, number>>((acc, event) => {
      const repoName = (event.repoName || 'EIPs').toUpperCase();
      acc[repoName] = (acc[repoName] || 0) + 1;
      return acc;
    }, {});
    const topRepoEntry = Object.entries(repoCounts).sort((a, b) => b[1] - a[1])[0];

    return {
      actionTotals,
      dominantAction: dominantAction?.label ?? 'Balanced',
      top3Share,
      avgResponseHours,
      topRepo: topRepoEntry?.[0] ?? '—',
      topRepoEvents: topRepoEntry?.[1] ?? 0,
    };
  }, [leaderboard, timeline]);

  const breakdownMetricLabel = useMemo(() => {
    if (!breakdownTarget) return '';
    if (breakdownTarget.metric === 'prsTouched') return 'PRs touched';
    if (breakdownTarget.metric === 'totalActions') return 'Actions';
    return 'Score';
  }, [breakdownTarget]);

  const downloadBreakdownReport = useCallback(() => {
    if (!breakdownTarget || breakdownRows.length === 0) return;
    const header = ['Actor', 'Metric', 'Action', 'PR', 'Repository', 'Role', 'Occurred At'];
    const rows = breakdownRows.map((row) => [
      row.actor,
      breakdownMetricLabel,
      row.actionType,
      row.prNumber,
      row.repoName,
      row.role,
      row.occurredAt,
    ]);
    const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const csv = [header.map(escape).join(','), ...rows.map((row) => row.map(escape).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roles-breakdown-${breakdownTarget.actor}-${breakdownTarget.metric}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [breakdownMetricLabel, breakdownRows, breakdownTarget]);

  useEffect(() => {
    let cancelled = false;
    async function loadBreakdown() {
      if (!breakdownTarget) {
        setBreakdownRows([]);
        return;
      }
      setBreakdownLoading(true);
      try {
        const rows = await client.explore.getRoleActorBreakdown({
          actor: breakdownTarget.actor,
          repo,
          category,
          timeRange,
          limit: 300,
        });
        if (!cancelled) {
          setBreakdownRows(rows as ActorBreakdownRow[]);
          setBreakdownPage(1);
        }
      } catch (error) {
        if (!cancelled) setBreakdownRows([]);
        console.error('Failed to load role actor breakdown', error);
      } finally {
        if (!cancelled) setBreakdownLoading(false);
      }
    }
    void loadBreakdown();
    return () => {
      cancelled = true;
    };
  }, [breakdownTarget, repo, category, timeRange]);

  const breakdownPageSize = 10;
  const breakdownTotalPages = Math.max(1, Math.ceil(breakdownRows.length / breakdownPageSize));
  const breakdownPageRows = useMemo(
    () => breakdownRows.slice((breakdownPage - 1) * breakdownPageSize, breakdownPage * breakdownPageSize),
    [breakdownPage, breakdownRows]
  );

  const handleMetricClick = useCallback((payload: { actor: string; metric: 'prsTouched' | 'totalActions' | 'totalScore' }) => {
    setBreakdownTarget(payload);
    setTimeout(() => {
      breakdownSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  }, []);

  return (
    <div className="relative min-h-screen w-full bg-background">
      <ExploreTabsHeader />
      <section className="w-full pb-2 pt-2">
        <div className="mx-auto w-full px-3 sm:px-4 lg:px-5 xl:px-6">

          {!countsLoading && (
            <RoleTabSwitcher
              selectedRole={selectedRole}
              onRoleChange={setSelectedRole}
              counts={roleCounts}
            />
          )}
        </div>
      </section>

      <section className="w-full pb-6">
        <div className="mx-auto w-full px-3 sm:px-4 lg:px-5 xl:px-6">
          <div className="rounded-xl border border-border bg-card/60 p-3">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Repo</span>
                <select
                  value={repo}
                  onChange={(event) => setRepo(event.target.value as RepoFilter)}
                  className="h-9 w-full rounded-md border border-border bg-muted/40 px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  {REPO_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Category</span>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value as CategoryFilter)}
                  className="h-9 w-full rounded-md border border-border bg-muted/40 px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Time window</span>
                <select
                  value={timeRange}
                  onChange={(event) => setTimeRange(event.target.value as TimeRange)}
                  className="h-9 w-full rounded-md border border-border bg-muted/40 px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  {TIME_RANGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <div className="flex items-end justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole(null);
                    setRepo('all');
                    setCategory('all');
                    setTimeRange('90d');
                    setSelectedActor(null);
                  }}
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:border-primary/35 hover:text-foreground"
                >
                  <Filter className="h-4 w-4" />
                  Reset filters
                </button>
              </div>
            </div>

            {activeFilters.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {activeFilters.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={chip.onRemove}
                    className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-xs text-primary"
                  >
                    {chip.label}
                    <X className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-xl border border-border bg-card/60 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Active participants</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{scopedActiveParticipants.toLocaleString()}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">In current scope ({selectedTimeLabel.toLowerCase()})</p>
            </article>
            <article className="rounded-xl border border-border bg-card/60 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Work concentration</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{insightStats.top3Share.toFixed(0)}%</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Top 3 participants share of actions</p>
            </article>
            <article className="rounded-xl border border-border bg-card/60 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Dominant work type</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{insightStats.dominantAction}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Based on review/comment/create/merge mix</p>
            </article>
            <article className="rounded-xl border border-border bg-card/60 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Avg response</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{formatHoursToLabel(insightStats.avgResponseHours)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">First-response signal for scoped participants</p>
            </article>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card/60 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Contribution mix</p>
              <h3 className="dec-title mt-1 text-lg font-semibold tracking-tight text-foreground">What kind of work is happening</h3>
              <div className="mt-3 h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={contributionMix} layout="vertical" barSize={18} margin={{ top: 8, right: 14, left: 4, bottom: 8 }}>
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#33415566" />
                    <XAxis
                      type="number"
                      tickFormatter={(value) => Number(value).toLocaleString()}
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="metric"
                      tick={{ fontSize: 12, fill: '#e2e8f0' }}
                      width={90}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted) / 0.28)' }}
                      labelStyle={{ color: '#f8fafc', fontWeight: 600 }}
                      contentStyle={{
                        backgroundColor: '#0b1220',
                        borderColor: '#334155',
                        borderRadius: 10,
                        color: '#e2e8f0',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
                      }}
                      formatter={(_, name, item) => {
                        const rawValue = Number(item?.payload?.[String(name)] ?? 0);
                        const total = Number(item?.payload?.total ?? 0);
                        const pct = total > 0 ? ((rawValue / total) * 100).toFixed(1) : '0.0';
                        return [`${rawValue.toLocaleString()} (${pct}%)`, titleCase(String(name))];
                      }}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: 6 }}
                      formatter={(value) => <span className="text-xs text-slate-300">{titleCase(String(value))}</span>}
                    />
                    <Bar dataKey="EDITOR" stackId="role" fill={ROLE_COLORS.EDITOR} radius={[4, 0, 0, 4]} />
                    <Bar dataKey="REVIEWER" stackId="role" fill={ROLE_COLORS.REVIEWER} />
                    <Bar dataKey="CONTRIBUTOR" stackId="role" fill={ROLE_COLORS.CONTRIBUTOR} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="space-y-2 rounded-xl border border-border bg-card/60 p-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Contribution flow</p>
                <h3 className="dec-title text-lg font-semibold tracking-tight text-foreground">
                  How activity evolved ({selectedTimeLabel})
                </h3>
                {timelineFallbackUsed && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    No events in selected window, showing latest all-time timeline instead.
                  </p>
                )}
              </div>
              <div className="h-[340px] overflow-hidden">
                <RoleActivityTimeline events={timeline} loading={timelineLoading} />
              </div>
            </div>
          </div>

          {isAuthorsView ? (
            <div className="mt-4">
              <RoleAuthorsTable
                rows={authors}
                total={authorsTotal}
                page={authorsPage}
                pageSize={10}
                onPageChange={setAuthorsPage}
                loading={authorsLoading}
              />
            </div>
          ) : (
            <div className="mt-4">
              <div className="space-y-3">
                {isEditorsView ? (
                  <div className="min-h-[420px]">
                    <RoleLeaderboard
                      entries={leaderboard}
                      loading={leaderboardLoading}
                      title="Top editors"
                      subtitle="Editorial coordination and review impact in the selected scope."
                      onMetricClick={handleMetricClick}
                    />
                  </div>
                ) : (
                  <div className="min-h-[420px]">
                    <RoleLeaderboard
                      entries={leaderboard}
                      loading={leaderboardLoading}
                      title={leaderboardTitle}
                      subtitle={leaderboardSubtitle}
                      onMetricClick={handleMetricClick}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {breakdownTarget && (
            <div ref={breakdownSectionRef} className="mt-4 rounded-xl border border-border bg-card/60">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Breakdown</p>
                  <h3 className="dec-title mt-1 text-xl font-semibold tracking-tight text-foreground">
                    @{breakdownTarget.actor} · {breakdownMetricLabel}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={downloadBreakdownReport}
                  className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Reports
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-border/70 bg-card/70">
                    <tr>
                      <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Occurred At</th>
                      <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Action</th>
                      <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">PR</th>
                      <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Repo</th>
                      <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {breakdownLoading ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">Loading breakdown…</td>
                      </tr>
                    ) : breakdownRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No breakdown entries in this filter scope.</td>
                      </tr>
                    ) : (
                      breakdownPageRows.map((row) => (
                        <tr key={row.id} className="hover:bg-muted/40">
                          <td className="px-4 py-2.5 text-sm text-muted-foreground">{formatBreakdownTime(row.occurredAt)}</td>
                          <td className="px-4 py-2.5 text-sm text-foreground">{row.actionType}</td>
                          <td className="px-4 py-2.5 text-sm text-foreground">
                            <Link href={`/pr/${row.repoName.split('/').at(-1)?.toLowerCase() ?? 'eips'}/${row.prNumber}`} className="text-primary hover:underline">
                              PR #{row.prNumber}
                            </Link>
                          </td>
                          <td className="px-4 py-2.5 text-sm text-muted-foreground">{row.repoName}</td>
                          <td className="px-4 py-2.5 text-sm text-muted-foreground">{row.role}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {!breakdownLoading && breakdownRows.length > 0 && (
                <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
                  <span className="text-muted-foreground">
                    Showing {Math.min((breakdownPage - 1) * breakdownPageSize + 1, breakdownRows.length)}-{Math.min(breakdownPage * breakdownPageSize, breakdownRows.length)} of {breakdownRows.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={breakdownPage <= 1}
                      onClick={() => setBreakdownPage((prev) => Math.max(1, prev - 1))}
                      className="rounded-md border border-border bg-muted/40 px-2 py-1 text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <span className="text-muted-foreground">Page {breakdownPage} / {breakdownTotalPages}</span>
                    <button
                      type="button"
                      disabled={breakdownPage >= breakdownTotalPages}
                      onClick={() => setBreakdownPage((prev) => Math.min(breakdownTotalPages, prev + 1))}
                      className="rounded-md border border-border bg-muted/40 px-2 py-1 text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </section>
    </div>
  );
}

export default function RolesPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading...</div>}>
      <RolesPageContent />
    </Suspense>
  );
}
