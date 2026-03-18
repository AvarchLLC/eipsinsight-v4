'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import { ArrowLeft, TrendingUp, Filter, Search, Info, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { client } from '@/lib/orpc';
import { TrendingList, type TrendingProposalRow } from './_components/trending-list';
import { TrendingHeatmap } from './_components/trending-heatmap';

type RepoFilter = 'all' | 'eips' | 'ercs' | 'rips';
type SortFilter = 'score_desc' | 'recent_desc' | 'delta_desc';

interface HeatmapRow {
  eipNumber: number;
  title: string;
  repo: string;
  totalActivity: number;
  dailyActivity: Array<{ date: string; value: number }>;
}

const WINDOW_OPTIONS = [
  { value: 1, label: '24h' },
  { value: 7, label: '7d' },
  { value: 30, label: '30d' },
  { value: 90, label: '90d' },
] as const;

const REPO_OPTIONS: Array<{ value: RepoFilter; label: string }> = [
  { value: 'all', label: 'All repos' },
  { value: 'eips', label: 'EIPs' },
  { value: 'ercs', label: 'ERCs' },
  { value: 'rips', label: 'RIPs' },
];

const SORT_OPTIONS: Array<{ value: SortFilter; label: string }> = [
  { value: 'score_desc', label: 'Trending score' },
  { value: 'recent_desc', label: 'Recent activity' },
  { value: 'delta_desc', label: 'Biggest delta' },
];

const STATUS_OPTIONS = ['All', 'Draft', 'Review', 'Last Call', 'Final', 'Living', 'Stagnant', 'Withdrawn'];

function escapeCsv(value: string | number | null | undefined) {
  const raw = String(value ?? '');
  if (/[",\n]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
}

function TrendingPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [windowDays, setWindowDays] = useState<number>(Number(searchParams.get('window') || 7));
  const [repo, setRepo] = useState<RepoFilter>((searchParams.get('repo') as RepoFilter) || 'all');
  const [status, setStatus] = useState<string>(searchParams.get('status') || 'All');
  const [sort, setSort] = useState<SortFilter>((searchParams.get('sort') as SortFilter) || 'score_desc');
  const [query, setQuery] = useState<string>(searchParams.get('q') || '');
  const [showInfo, setShowInfo] = useState(false);

  const [proposals, setProposals] = useState<TrendingProposalRow[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapRow[]>([]);
  const [proposalsLoading, setProposalsLoading] = useState(true);
  const [heatmapLoading, setHeatmapLoading] = useState(true);
  const [selectedProposalKey, setSelectedProposalKey] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (windowDays !== 7) params.set('window', String(windowDays));
    if (repo !== 'all') params.set('repo', repo);
    if (status !== 'All') params.set('status', status);
    if (sort !== 'score_desc') params.set('sort', sort);
    if (query.trim()) params.set('q', query.trim());
    const q = params.toString();
    router.replace(q ? `/explore/trending?${q}` : '/explore/trending', { scroll: false });
  }, [windowDays, repo, status, sort, query]);

  useEffect(() => {
    Promise.allSettled([
      client.explore.getTrendingProposals({
        limit: 40,
        windowDays,
        repo,
        status: status === 'All' ? undefined : status,
        sort,
        q: query.trim() || undefined,
      }),
      client.explore.getTrendingHeatmap({
        topN: 12,
        windowDays: Math.max(windowDays, 7),
        repo,
      }),
    ]).then(([listRes, heatRes]) => {
      if (listRes.status === 'fulfilled') {
        const rows = listRes.value as TrendingProposalRow[];
        setProposals(rows);
        if (rows.length > 0 && !selectedProposalKey) {
          setSelectedProposalKey(`${rows[0].repo}:${rows[0].number}`);
        }
      }
      if (heatRes.status === 'fulfilled') {
        setHeatmapData(heatRes.value as HeatmapRow[]);
      }
    }).finally(() => {
      setProposalsLoading(false);
      setHeatmapLoading(false);
    });
  }, [windowDays, repo, status, sort, query]);

  const selectedProposal = useMemo(() => {
    if (!selectedProposalKey) return null;
    return proposals.find((p) => `${p.repo}:${p.number}` === selectedProposalKey) ?? null;
  }, [proposals, selectedProposalKey]);

  const windowLabel = WINDOW_OPTIONS.find((option) => option.value === windowDays)?.label ?? `${windowDays}d`;

  const downloadDetailedCsv = () => {
    const heatmapMap = new Map(heatmapData.map((row) => [`${row.repo}:${row.eipNumber}`, row]));
    const headers = [
      'generated_at',
      'window_days',
      'repo_filter',
      'status_filter',
      'sort_filter',
      'query',
      'kind',
      'number',
      'title',
      'status',
      'repo',
      'score',
      'score_delta',
      'trending_reason',
      'last_activity',
      'top_events',
      'linked_pr_numbers',
      'linked_pr_titles',
      'linked_pr_states',
      'matrix_total_activity',
      'matrix_daily_activity',
    ];

    const rows = proposals.map((proposal) => {
      const hm = heatmapMap.get(`${proposal.repo}:${proposal.number}`);
      return [
        new Date().toISOString(),
        windowDays,
        repo,
        status,
        sort,
        query,
        proposal.kind,
        proposal.number,
        proposal.title,
        proposal.status,
        proposal.repo,
        proposal.score,
        proposal.scoreDelta,
        proposal.trendingReason,
        proposal.lastActivity,
        proposal.topEvents.map((e) => `${e.type}:${e.count}`).join('|'),
        proposal.topLinkedPRs.map((pr) => pr.prNumber).join('|'),
        proposal.topLinkedPRs.map((pr) => pr.title).join('|'),
        proposal.topLinkedPRs.map((pr) => pr.state).join('|'),
        hm?.totalActivity ?? 0,
        hm?.dailyActivity.map((d) => `${d.date}:${d.value}`).join('|') ?? '',
      ];
    });

    const csv = [headers.join(','), ...rows.map((row) => row.map(escapeCsv).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trending-detailed-${windowDays}d-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative min-h-screen w-full bg-background">
      <section className="w-full pb-2 pt-4">
        <div className="mx-auto w-full px-3 sm:px-4 lg:px-5 xl:px-6">
          <Link href="/explore" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Explore
          </Link>

          <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="mb-4 mt-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="dec-title persona-title text-balance text-3xl font-semibold tracking-tight leading-[1.1] sm:text-4xl">
                  Explore Trending
                </h1>
                <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  See what is trending, why it is trending, and jump directly into proposals, PRs, and timelines.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowInfo((prev) => !prev)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-muted/60 px-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-foreground"
              >
                <Info className="h-4 w-4" />
                How trending works
                {showInfo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
            {showInfo && (
              <div className="mt-3 rounded-lg border border-border bg-card/60 p-3">
                <p className="text-sm text-muted-foreground">
                  We combine PR activity, discussion, and governance movement in {windowLabel}.
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">PR events <strong className="ml-1 text-primary">×2</strong></div>
                  <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">Comments <strong className="ml-1 text-primary">×1</strong></div>
                  <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">Status changes <strong className="ml-1 text-primary">×3</strong></div>
                </div>
              </div>
            )}
          </motion.header>

          <div className="sticky top-16 z-20 rounded-xl border border-border bg-card/80 p-3 backdrop-blur-xl">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Time window</span>
                <select value={windowDays} onChange={(e) => setWindowDays(Number(e.target.value))} className="h-9 w-full rounded-md border border-border bg-muted/40 px-3 text-sm">
                  {WINDOW_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Repo</span>
                <select value={repo} onChange={(e) => setRepo(e.target.value as RepoFilter)} className="h-9 w-full rounded-md border border-border bg-muted/40 px-3 text-sm">
                  {REPO_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</span>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 w-full rounded-md border border-border bg-muted/40 px-3 text-sm">
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Sort</span>
                <select value={sort} onChange={(e) => setSort(e.target.value as SortFilter)} className="h-9 w-full rounded-md border border-border bg-muted/40 px-3 text-sm">
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 lg:col-span-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Search</span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="EIP number or title"
                    className="h-9 w-full rounded-md border border-border bg-muted/40 pl-9 pr-3 text-sm"
                  />
                </div>
              </label>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{proposals.length} proposals matched</span>
              <button
                type="button"
                onClick={() => {
                  setWindowDays(7);
                  setRepo('all');
                  setStatus('All');
                  setSort('score_desc');
                  setQuery('');
                }}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <Filter className="h-3.5 w-3.5" /> Reset
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full py-4">
        <div className="mx-auto w-full px-3 sm:px-4 lg:px-5 xl:px-6">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Matrix view first for quick pattern scanning.</p>
            <button
              type="button"
              onClick={downloadDetailedCsv}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/35 hover:text-foreground"
            >
              <Download className="h-3.5 w-3.5" />
              Download detailed CSV
            </button>
          </div>
          <TrendingHeatmap
            data={heatmapData}
            loading={heatmapLoading}
            windowLabel={windowLabel}
            selectedProposal={selectedProposalKey}
            onSelectProposal={setSelectedProposalKey}
          />
        </div>
      </section>

      <section className="w-full pb-8">
        <div className="mx-auto w-full px-3 sm:px-4 lg:px-5 xl:px-6">
          <TrendingList
            proposals={proposals}
            loading={proposalsLoading}
            selectedEipId={selectedProposal?.eipId ?? null}
            onSelect={(proposal) => setSelectedProposalKey(`${proposal.repo}:${proposal.number}`)}
            windowLabel={windowLabel}
          />
        </div>
      </section>
    </div>
  );
}

export default function TrendingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
          Loading trending view...
        </div>
      }
    >
      <TrendingPageContent />
    </Suspense>
  );
}
