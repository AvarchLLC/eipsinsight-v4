'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUpDown, Clock3, ExternalLink, Filter, GitFork, GitPullRequest, Search, Sparkles, Star, Eye } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { client } from '@/lib/orpc';
import { CopyLinkButton } from '@/components/header';
import { LastUpdated } from '@/components/analytics/LastUpdated';
import { cn } from '@/lib/utils';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type DetailDimension = 'status' | 'category' | 'repo';
type SortOption = 'updated_desc' | 'updated_asc' | 'days_desc' | 'days_asc' | 'number_asc';

type DetailOverview = {
  valid: boolean;
  dimension: DetailDimension;
  slug: string;
  label: string;
  total: number;
  recentChanges30d: number;
  lastUpdated: string | null;
};

type DetailTimeline = {
  valid: boolean;
  dimension: DetailDimension;
  slug: string;
  label: string;
  months: string[];
  statusSeries: Array<{ month: string; status: string; count: number }>;
  totals: Array<{ month: string; count: number; touched: number }>;
  updatedAt: string | null;
};

type DetailProposals = {
  valid: boolean;
  dimension: DetailDimension;
  slug: string;
  label: string;
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
  rows: Array<{
    id: number;
    number: number;
    title: string;
    author: string | null;
    status: string;
    category: string | null;
    type: string | null;
    repo: string;
    kind: 'EIP' | 'ERC' | 'RIP';
    updatedAt: string | null;
    daysInStatus: number | null;
  }>;
};

type ReviewRow = {
  prNumber: string;
  title: string;
  reviewer: string;
  submittedAt: string;
  repoShort: string;
};

type RepoGithubStats = {
  valid: boolean;
  repo: string;
  githubRepo: string | null;
  stars: number | null;
  forks: number | null;
  watchlist: number | null;
  openIssues: number;
  openPRs: number;
  totalOpen: number;
  updatedAt: string | null;
};

const statusOrder = ['Draft', 'Review', 'Last Call', 'Final', 'Living', 'Stagnant', 'Withdrawn', 'Unknown'];
const statusColors: Record<string, string> = {
  Draft: '#64748b',
  Review: '#3b82f6',
  'Last Call': '#f59e0b',
  Final: '#10b981',
  Living: '#06b6d4',
  Stagnant: '#f97316',
  Withdrawn: '#ef4444',
  Unknown: '#94a3b8',
};

const badgeColors: Record<string, string> = {
  Draft: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
  Review: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
  'Last Call': 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  Final: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  Living: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
  Stagnant: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
  Withdrawn: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
  Unknown: 'bg-muted text-muted-foreground border-border',
};

function toMonthLabel(month: string) {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatMetric(value: number | null) {
  return value == null ? '—' : value.toLocaleString();
}

function repoLabel(repo: string) {
  if (repo === 'eips') return 'EIPs';
  if (repo === 'ercs') return 'ERCs';
  if (repo === 'rips') return 'RIPs';
  return repo.toUpperCase();
}

function repoToGithub(repo: string) {
  if (repo === 'ercs') return 'ethereum/ERCs';
  if (repo === 'rips') return 'ethereum/RIPs';
  return 'ethereum/EIPs';
}

function proposalHref(row: DetailProposals['rows'][number]) {
  if (row.kind === 'ERC') return `/erc/${row.number}`;
  if (row.kind === 'RIP') return `/rip/${row.number}`;
  return `/eip/${row.number}`;
}

function headerTitle(dimension: DetailDimension, label: string) {
  if (dimension === 'status') return `Status: ${label}`;
  if (dimension === 'category') return `Category: ${label}`;
  return `Repository: ${label}`;
}

function toRepoFilterForReviews(dimension: DetailDimension, slug: string): 'eips' | 'ercs' | 'rips' | undefined {
  if (dimension !== 'repo') return undefined;
  const normalized = slug.toLowerCase();
  if (normalized === 'eips' || normalized === 'ercs' || normalized === 'rips') return normalized;
  return undefined;
}

function toSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export default function ExploreDetailPage({
  params,
}: {
  params: Promise<{ dimension: string; slug: string }>;
}) {
  const resolvedParams = React.use(params);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dimension = (resolvedParams.dimension || '').toLowerCase() as DetailDimension;
  const slug = decodeURIComponent(resolvedParams.slug || '');
  const validDimension = dimension === 'status' || dimension === 'category' || dimension === 'repo';

  const [overview, setOverview] = useState<DetailOverview | null>(null);
  const [timeline, setTimeline] = useState<DetailTimeline | null>(null);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [repoStats, setRepoStats] = useState<RepoGithubStats | null>(null);
  const [table, setTable] = useState<DetailProposals | null>(null);
  const [statusOptions, setStatusOptions] = useState<Array<{ status: string; count: number }>>([]);
  const [categoryOptions, setCategoryOptions] = useState<Array<{ category: string; count: number }>>([]);

  const [q, setQ] = useState(() => searchParams.get('q') ?? '');
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') ?? '');
  const [categoryFilter, setCategoryFilter] = useState(() => searchParams.get('category') ?? '');
  const [sort, setSort] = useState<SortOption>(() => {
    const value = searchParams.get('sort');
    return value === 'updated_asc' || value === 'days_desc' || value === 'days_asc' || value === 'number_asc'
      ? value
      : 'updated_desc';
  });
  const [page, setPage] = useState(() => {
    const raw = Number(searchParams.get('page') ?? '1');
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1;
  });
  const [windowMonths, setWindowMonths] = useState<6 | 12 | 24>(() => {
    const raw = Number(searchParams.get('months') ?? '12');
    return raw === 6 || raw === 24 ? raw : 12;
  });

  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingTimeline, setLoadingTimeline] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [loadingRepoStats, setLoadingRepoStats] = useState(false);
  const [loadingTable, setLoadingTable] = useState(true);

  const fromMonth = useMemo(() => {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (windowMonths - 1), 1));
    return `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`;
  }, [windowMonths]);

  const toMonth = useMemo(() => {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    setPage(1);
  }, [q, statusFilter, categoryFilter, sort]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (statusFilter) params.set('status', statusFilter);
    if (categoryFilter) params.set('category', categoryFilter);
    if (sort !== 'updated_desc') params.set('sort', sort);
    if (page > 1) params.set('page', String(page));
    if (windowMonths !== 12) params.set('months', String(windowMonths));
    const next = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(next, { scroll: false });
  }, [q, statusFilter, categoryFilter, sort, page, windowMonths, pathname, router]);

  useEffect(() => {
    if (!validDimension) return;
    let cancelled = false;
    (async () => {
      setLoadingOverview(true);
      try {
        const data = await client.explore.getDetailOverview({ dimension, slug });
        if (!cancelled) setOverview(data as DetailOverview);
      } catch (err) {
        console.error('Failed to load detail overview:', err);
      } finally {
        if (!cancelled) setLoadingOverview(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dimension, slug, validDimension]);

  useEffect(() => {
    if (!validDimension || dimension !== 'repo') {
      setRepoStats(null);
      setLoadingRepoStats(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingRepoStats(true);
      try {
        const data = await client.explore.getDetailRepoGithubStats({ slug });
        if (!cancelled) setRepoStats(data as RepoGithubStats);
      } catch (err) {
        console.error('Failed to load repo GitHub stats:', err);
      } finally {
        if (!cancelled) setLoadingRepoStats(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dimension, slug, validDimension]);

  useEffect(() => {
    if (!validDimension) return;
    let cancelled = false;
    (async () => {
      setLoadingTimeline(true);
      try {
        const data = await client.explore.getDetailTimeline({ dimension, slug, fromMonth, toMonth });
        if (!cancelled) setTimeline(data as DetailTimeline);
      } catch (err) {
        console.error('Failed to load detail timeline:', err);
      } finally {
        if (!cancelled) setLoadingTimeline(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dimension, slug, fromMonth, toMonth, validDimension]);

  useEffect(() => {
    if (!validDimension) return;
    let cancelled = false;
    (async () => {
      setLoadingReviews(true);
      try {
        const data = await client.analytics.getEditorReviewsLast24h({
          repo: toRepoFilterForReviews(dimension, slug),
          limit: 12,
        });
        if (!cancelled) setReviews(data as ReviewRow[]);
      } catch (err) {
        console.error('Failed to load 24h editor reviews:', err);
      } finally {
        if (!cancelled) setLoadingReviews(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dimension, slug, validDimension]);

  useEffect(() => {
    if (!validDimension) return;
    let cancelled = false;
    (async () => {
      setLoadingTable(true);
      try {
        const data = await client.explore.getDetailProposals({
          dimension,
          slug,
          q: q.trim() || undefined,
          status: statusFilter || undefined,
          category: categoryFilter || undefined,
          sort,
          page,
          pageSize: 20,
        });
        if (!cancelled) setTable(data as DetailProposals);
      } catch (err) {
        console.error('Failed to load detail proposals:', err);
      } finally {
        if (!cancelled) setLoadingTable(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dimension, slug, q, statusFilter, categoryFilter, sort, page, validDimension]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [statuses, categories] = await Promise.all([
          client.explore.getStatusCounts({}),
          client.explore.getCategoryCounts({}),
        ]);
        if (!cancelled) {
          setStatusOptions(statuses as Array<{ status: string; count: number }>);
          setCategoryOptions(categories as Array<{ category: string; count: number }>);
        }
      } catch (err) {
        console.error('Failed to load detail filter options:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const timelineOption = useMemo(() => {
    if (!timeline || !timeline.valid || timeline.months.length === 0) return null;
    const months = timeline.months;
    const orderedStatuses = Array.from(
      new Set(
        timeline.statusSeries
          .map((row) => row.status)
          .sort((a, b) => (statusOrder.indexOf(a) === -1 ? 999 : statusOrder.indexOf(a)) - (statusOrder.indexOf(b) === -1 ? 999 : statusOrder.indexOf(b)))
      )
    );
    const statusMap = new Map<string, Map<string, number>>();
    orderedStatuses.forEach((status) => statusMap.set(status, new Map()));
    for (const row of timeline.statusSeries) {
      statusMap.get(row.status)?.set(row.month, row.count);
    }
    const totalMap = new Map(timeline.totals.map((row) => [row.month, row.count]));

    return {
      grid: { left: 40, right: 16, top: 40, bottom: 28 },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: {
        top: 0,
        itemWidth: 10,
        itemHeight: 10,
      },
      xAxis: {
        type: 'category',
        data: months.map(toMonthLabel),
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        splitLine: { lineStyle: { type: 'dashed' } },
      },
      series: [
        ...orderedStatuses.map((status) => ({
          name: status,
          type: 'bar',
          stack: 'status',
          data: months.map((month) => statusMap.get(status)?.get(month) ?? 0),
          itemStyle: { color: statusColors[status] || statusColors.Unknown },
        })),
        {
          name: 'Total',
          type: 'line',
          smooth: true,
          symbolSize: 6,
          data: months.map((month) => totalMap.get(month) ?? 0),
          lineStyle: { width: 2, color: '#22d3ee' },
          itemStyle: { color: '#22d3ee' },
        },
      ],
    };
  }, [timeline]);

  if (!validDimension) {
    return (
      <div className="mx-auto w-full px-3 py-10 sm:px-4 lg:px-5 xl:px-6">
        <div className="rounded-xl border border-border bg-card/60 p-6 text-center">
          <p className="text-lg font-semibold text-foreground">Unsupported detail dimension.</p>
          <p className="mt-1 text-sm text-muted-foreground">Use status, category, or repo detail routes.</p>
          <Link href="/explore" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            Back to Explore <ArrowLeft className="h-3 w-3" />
          </Link>
        </div>
      </div>
    );
  }

  const title = overview?.label ? headerTitle(dimension, overview.label) : headerTitle(dimension, slug);

  if (!loadingOverview && overview && !overview.valid) {
    return (
      <div className="mx-auto w-full px-3 py-10 sm:px-4 lg:px-5 xl:px-6">
        <div className="rounded-xl border border-border bg-card/60 p-6 text-center">
          <p className="text-lg font-semibold text-foreground">Bucket not found for this drilldown.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try another status, category, or repository from Explore.
          </p>
          <Link href="/explore" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            Back to Explore <ArrowLeft className="h-3 w-3" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-background">
      <section id="explore-detail-header" className="w-full pt-5 pb-4">
        <div className="mx-auto w-full px-3 sm:px-4 lg:px-5 xl:px-6">
          <Link href="/explore" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Explore
          </Link>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="dec-title persona-title text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Detailed drilldown for this {dimension} bucket with trends, 24h reviews, and proposal-level rows.
              </p>
              {dimension === 'category' && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Type is grouped under Category in v4.
                </p>
              )}
            </div>
            <CopyLinkButton sectionId="explore-detail-header" className="h-8 w-8 rounded-md" />
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-card/60 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Total proposals</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{loadingOverview ? '—' : (overview?.total ?? 0).toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-border bg-card/60 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Status changes (30d)</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{loadingOverview ? '—' : (overview?.recentChanges30d ?? 0).toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-border bg-card/60 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Last updated</p>
              <p className="mt-1 text-sm font-medium text-foreground">{formatDate(overview?.lastUpdated ?? null)}</p>
              {overview?.lastUpdated ? (
                <LastUpdated timestamp={overview.lastUpdated} prefix="Updated" className="mt-1 bg-muted/40 text-xs" />
              ) : null}
            </div>
          </div>

          {dimension === 'repo' ? (
            <div className="mt-3 rounded-2xl border border-border/80 bg-gradient-to-br from-card/90 via-card/75 to-muted/30 p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold tracking-tight text-foreground">
                  GitHub Stats — {overview?.label ?? slug}
                </p>
                {repoStats?.githubRepo ? (
                  <a
                    href={`https://github.com/${repoStats.githubRepo}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs text-primary transition hover:bg-primary/15"
                  >
                    Open repository <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-border/80 bg-gradient-to-br from-sky-500/[0.08] to-sky-500/[0.02] px-3.5 py-3">
                  <p className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <GitFork className="h-3.5 w-3.5 text-sky-500" />
                    Forks
                  </p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                    {loadingRepoStats ? '—' : formatMetric(repoStats?.forks ?? null)}
                  </p>
                </div>
                <div className="rounded-xl border border-border/80 bg-gradient-to-br from-cyan-500/[0.08] to-cyan-500/[0.02] px-3.5 py-3">
                  <p className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <Eye className="h-3.5 w-3.5 text-cyan-500" />
                    Watchlist
                  </p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                    {loadingRepoStats ? '—' : formatMetric(repoStats?.watchlist ?? null)}
                  </p>
                </div>
                <div className="rounded-xl border border-border/80 bg-gradient-to-br from-amber-500/[0.10] to-amber-500/[0.03] px-3.5 py-3">
                  <p className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <Star className="h-3.5 w-3.5 text-amber-500" />
                    Stars
                  </p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                    {loadingRepoStats ? '—' : formatMetric(repoStats?.stars ?? null)}
                  </p>
                </div>
                <div className="rounded-xl border border-border/80 bg-gradient-to-br from-emerald-500/[0.10] to-emerald-500/[0.03] px-3.5 py-3">
                  <p className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <GitPullRequest className="h-3.5 w-3.5 text-emerald-500" />
                    Open Issues & PR
                  </p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                    {loadingRepoStats ? '—' : (repoStats?.totalOpen ?? 0).toLocaleString()}
                  </p>
                  {!loadingRepoStats && repoStats ? (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {repoStats.openIssues.toLocaleString()} issues · {repoStats.openPRs.toLocaleString()} PRs
                    </p>
                  ) : null}
                </div>
              </div>
              {repoStats?.updatedAt ? (
                <div className="mt-3 border-t border-border/70 pt-3">
                  <LastUpdated timestamp={repoStats.updatedAt} prefix="Stats updated" className="bg-muted/40 text-xs" />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <hr className="border-border/70" />

      <section id="explore-detail-timeline" className="w-full py-5">
        <div className="mx-auto w-full px-3 sm:px-4 lg:px-5 xl:px-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="dec-title text-2xl font-semibold tracking-tight text-foreground">Over Time</h2>
              <p className="text-sm text-muted-foreground">Proposal movement and status mix over time.</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Window</label>
              <select
                value={windowMonths}
                onChange={(e) => setWindowMonths(Number(e.target.value) as 6 | 12 | 24)}
                className="h-8 rounded-md border border-border bg-card/60 px-2.5 text-xs text-foreground"
              >
                <option value={6}>6 months</option>
                <option value={12}>12 months</option>
                <option value={24}>24 months</option>
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card/60 p-3">
            {loadingTimeline ? (
              <div className="h-[320px] animate-pulse rounded-lg bg-muted" />
            ) : !timelineOption ? (
              <div className="flex h-[320px] items-center justify-center rounded-lg border border-border/70 bg-muted/30 text-sm text-muted-foreground">
                No timeline data for this bucket.
              </div>
            ) : (
              <ReactECharts option={timelineOption as object} style={{ height: 320, width: '100%' }} opts={{ renderer: 'svg' }} />
            )}
            {timeline?.updatedAt ? (
              <div className="mt-3 border-t border-border/70 pt-3">
                <LastUpdated timestamp={timeline.updatedAt} prefix="Updated" showAbsolute className="bg-muted/40 text-xs" />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <hr className="border-border/70" />

      <section id="explore-detail-editor-reviews-24h" className="w-full py-5">
        <div className="mx-auto w-full px-3 sm:px-4 lg:px-5 xl:px-6">
          <div className="mb-3">
            <h2 className="dec-title text-2xl font-semibold tracking-tight text-foreground">Editor Reviews (Last 24 Hours)</h2>
            <p className="text-sm text-muted-foreground">Recent review actions by editors across open review activity.</p>
          </div>

          <div className="rounded-xl border border-border bg-card/60 p-3">
            {loadingReviews ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={`reviews-skeleton-${i}`} className="h-14 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : reviews.length === 0 ? (
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-8 text-center text-sm text-muted-foreground">
                No editor reviews found in the last 24 hours.
              </div>
            ) : (
              <div className="space-y-2">
                {reviews.map((row, idx) => (
                  <a
                    key={`review-row-${row.repoShort}-${row.prNumber}-${idx}`}
                    href={`/pr/${repoToGithub(row.repoShort)}/${row.prNumber}`}
                    className="block rounded-lg border border-border bg-card/70 px-3 py-2.5 transition hover:border-primary/35 hover:bg-primary/[0.04]"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{row.reviewer}</p>
                      <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground">
                        {repoLabel(row.repoShort)} PR #{row.prNumber}
                      </span>
                    </div>
                    <p className="line-clamp-1 text-sm text-muted-foreground">{row.title || `PR #${row.prNumber}`}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(row.submittedAt)}</p>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <hr className="border-border/70" />

      <section id="explore-detail-proposals-table" className="w-full py-5">
        <div className="mx-auto w-full px-3 sm:px-4 lg:px-5 xl:px-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="dec-title text-2xl font-semibold tracking-tight text-foreground">Detailed Proposals</h2>
              <p className="text-sm text-muted-foreground">Search, filter, and inspect proposal rows in this bucket.</p>
            </div>
            <div className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
              {(table?.total ?? 0).toLocaleString()} rows
            </div>
          </div>

          <div className="mb-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <label className="sm:col-span-2">
              <span className="mb-1 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Search className="h-3 w-3" />
                Search
              </span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Title / number / author"
                className="h-9 w-full rounded-md border border-border bg-card/60 px-3 text-sm text-foreground"
              />
            </label>

            <label>
              <span className="mb-1 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Filter className="h-3 w-3" />
                Status
              </span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 w-full rounded-md border border-border bg-card/60 px-3 text-sm text-foreground">
                <option value="">All statuses</option>
                {statusOptions.map((opt) => (
                  <option key={`status-opt-${opt.status}`} value={opt.status}>
                    {opt.status}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-1 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                Category
              </span>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="h-9 w-full rounded-md border border-border bg-card/60 px-3 text-sm text-foreground">
                <option value="">All categories</option>
                {categoryOptions.map((opt) => (
                  <option key={`category-opt-${opt.category}`} value={opt.category}>
                    {opt.category}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-1 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <ArrowUpDown className="h-3 w-3" />
                Sort
              </span>
              <select value={sort} onChange={(e) => setSort(e.target.value as SortOption)} className="h-9 w-full rounded-md border border-border bg-card/60 px-3 text-sm text-foreground">
                <option value="updated_desc">Updated ↓</option>
                <option value="updated_asc">Updated ↑</option>
                <option value="days_desc">Days in status ↓</option>
                <option value="days_asc">Days in status ↑</option>
                <option value="number_asc">Number ↑</option>
              </select>
            </label>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card/60">
            <div className="hidden md:block">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border/70 bg-muted/40 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2.5">Proposal</th>
                    <th className="px-3 py-2.5">Title</th>
                    <th className="px-3 py-2.5">Repo</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Category</th>
                    <th className="px-3 py-2.5">Updated</th>
                    <th className="px-3 py-2.5">Days</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingTable ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={`detail-table-skeleton-${i}`} className="border-b border-border/60">
                        <td colSpan={7} className="px-3 py-2.5">
                          <div className="h-4 animate-pulse rounded bg-muted" />
                        </td>
                      </tr>
                    ))
                  ) : table?.rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">
                        No proposals found for this bucket.
                      </td>
                    </tr>
                  ) : (
                    table?.rows.map((row) => (
                      <tr key={`detail-row-${row.id}`} className="border-b border-border/60 transition-colors hover:bg-muted/40">
                        <td className="px-3 py-2.5">
                          <Link href={proposalHref(row)} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                            {row.kind}-{row.number}
                            <ExternalLink className="h-3 w-3 opacity-70" />
                          </Link>
                        </td>
                        <td className="max-w-[420px] truncate px-3 py-2.5 text-foreground">{row.title}</td>
                        <td className="px-3 py-2.5">
                          <Link href={`/explore/details/repo/${toSlug(row.repo)}`} className="text-muted-foreground hover:text-foreground hover:underline">
                            {repoLabel(row.repo)}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5">
                          <Link
                            href={`/explore/details/status/${toSlug(row.status)}`}
                            className={cn('inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium', badgeColors[row.status] || badgeColors.Unknown)}
                          >
                            {row.status}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5">
                          {row.category ? (
                            <Link
                              href={`/explore/details/category/${toSlug(row.category)}`}
                              className="text-muted-foreground hover:text-foreground hover:underline"
                            >
                              {row.category}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">{formatDate(row.updatedAt)}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="h-3.5 w-3.5" />
                            {row.daysInStatus == null ? '—' : `${row.daysInStatus}d`}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="space-y-2 p-2 md:hidden">
              {loadingTable ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={`mobile-detail-skeleton-${i}`} className="h-20 animate-pulse rounded-lg bg-muted" />
                ))
              ) : table?.rows.length === 0 ? (
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-7 text-center text-sm text-muted-foreground">
                  No proposals found for this bucket.
                </div>
              ) : (
                table?.rows.map((row) => (
                  <div key={`mobile-detail-${row.id}`} className="rounded-lg border border-border bg-card/70 p-2.5">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <Link href={proposalHref(row)} className="text-sm font-semibold text-primary hover:underline">
                        {row.kind}-{row.number}
                      </Link>
                      <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-[10px]', badgeColors[row.status] || badgeColors.Unknown)}>
                        {row.status}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-sm text-foreground">{row.title}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {repoLabel(row.repo)} • {row.category || '—'} • {row.daysInStatus == null ? '—' : `${row.daysInStatus}d`}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between border-t border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <span>
                Page {table?.page ?? page} / {table?.totalPages ?? 1}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={(table?.page ?? page) <= 1}
                  className="rounded-md border border-border bg-muted/60 px-2 py-1 disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(table?.totalPages ?? 1, prev + 1))}
                  disabled={(table?.page ?? page) >= (table?.totalPages ?? 1)}
                  className="rounded-md border border-border bg-muted/60 px-2 py-1 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
