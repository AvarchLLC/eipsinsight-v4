'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Activity,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowUpDown,
  Bell,
  Boxes,
  CheckCircle2,
  Code,
  Cpu,
  Download,
  Eye,
  FileText,
  GitBranch,
  GitPullRequest,
  Layers,
  Network,
  Pause,
  Trophy,
  XCircle,
  Zap,
} from 'lucide-react';
import { client } from '@/lib/orpc';
import ReactECharts from 'echarts-for-react';
import { CopyLinkButton } from '@/components/header';
import { EIPsPageHeader } from './_components/eips-page-header';
import HomeFAQs from './_components/home-faqs';
import SocialCommunityUpdates from './_components/social-community-updates';

const FEB_2026 = '2026-02';

type Dimension = 'status' | 'category' | 'repo';
type SortBy = 'github' | 'eip' | 'title' | 'author' | 'type' | 'category' | 'status' | 'updated_at';
type SortDir = 'asc' | 'desc';

type ColumnSearch = {
  github: string;
  eip: string;
  title: string;
  author: string;
  type: string;
  status: string;
  category: string;
  updatedAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-slate-500',
  Review: 'bg-amber-500',
  'Last Call': 'bg-orange-500',
  Final: 'bg-emerald-500',
  Living: 'bg-cyan-500',
  Stagnant: 'bg-gray-500',
  Withdrawn: 'bg-red-500',
  Unknown: 'bg-slate-400',
  EIPs: 'bg-cyan-500',
  ERCs: 'bg-emerald-500',
  RIPs: 'bg-violet-500',
};

const STATUS_PIE_COLORS: Record<string, string> = {
  Draft: '#64748b',
  Review: '#f59e0b',
  'Last Call': '#f97316',
  Final: '#10b981',
  Living: '#22d3ee',
  Stagnant: '#6b7280',
  Withdrawn: '#ef4444',
  Unknown: '#94a3b8',
};

const BADGE_COLORS: Record<string, string> = {
  Draft: 'bg-slate-500/20 text-muted-foreground border-slate-500/30',
  Review: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30',
  'Last Call': 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30',
  Final: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  Living: 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
  Stagnant: 'bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30',
  Withdrawn: 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30',
  Unknown: 'bg-slate-500/20 text-muted-foreground border-slate-500/30',
};

const ACTIVITY_CARD_TINT: Record<string, string> = {
  Final: 'bg-card/60 border-border',
  Review: 'bg-card/60 border-border',
  'Last Call': 'bg-card/60 border-border',
  Draft: 'bg-card/60 border-border',
  Living: 'bg-card/60 border-border',
  Stagnant: 'bg-card/60 border-border',
  Withdrawn: 'bg-card/60 border-border',
  Unknown: 'bg-card/60 border-border',
};

const statusIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Draft: FileText,
  Review: Eye,
  'Last Call': Bell,
  Final: CheckCircle2,
  Living: Zap,
  Stagnant: Pause,
  Withdrawn: XCircle,
  Unknown: Layers,
};

const categoryIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Core: Cpu,
  Networking: Network,
  Interface: Code,
  ERC: Boxes,
  RIP: GitBranch,
  RRC: GitBranch,
  Meta: Layers,
  Informational: FileText,
  Other: Layers,
};

const repoIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  EIPs: FileText,
  ERCs: Boxes,
  RIPs: GitBranch,
};

type BucketTheme = {
  border: string;
  surface: string;
  title: string;
  iconWrap: string;
  icon: string;
};

const DEFAULT_BUCKET_THEME: BucketTheme = {
  border: 'border-border',
  surface: 'bg-card/60',
  title: 'text-foreground',
  iconWrap: 'bg-muted/60',
  icon: 'text-muted-foreground',
};

const BUCKET_THEME_BY_STATUS: Record<string, BucketTheme> = {
  Draft: { border: 'border-primary/25', surface: 'bg-primary/5', title: 'text-foreground', iconWrap: 'bg-primary/10', icon: 'text-primary' },
  Review: { border: 'border-primary/25', surface: 'bg-primary/5', title: 'text-foreground', iconWrap: 'bg-primary/10', icon: 'text-primary' },
  'Last Call': { border: 'border-primary/25', surface: 'bg-primary/5', title: 'text-foreground', iconWrap: 'bg-primary/10', icon: 'text-primary' },
  Final: { border: 'border-primary/25', surface: 'bg-primary/5', title: 'text-foreground', iconWrap: 'bg-primary/10', icon: 'text-primary' },
  Stagnant: { border: 'border-primary/25', surface: 'bg-primary/5', title: 'text-foreground', iconWrap: 'bg-primary/10', icon: 'text-primary' },
  Withdrawn: { border: 'border-primary/25', surface: 'bg-primary/5', title: 'text-foreground', iconWrap: 'bg-primary/10', icon: 'text-primary' },
};

function monthLabel(monthYear: string) {
  const [y, m] = monthYear.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function proposalUrl(repo: string, kind: string, number: number) {
  if (kind === 'ERC' || repo.toLowerCase().includes('erc')) return `/erc/${number}`;
  if (kind === 'RIP' || repo.toLowerCase().includes('rip')) return `/rip/${number}`;
  return `/eip/${number}`;
}

function githubProposalUrl(kind: string, number: number) {
  const k = kind.toUpperCase();
  if (k === 'ERC') {
    return `https://github.com/ethereum/ERCs/blob/master/ERCS/erc-${number}.md`;
  }
  if (k === 'RIP') {
    return `https://github.com/ethereum/RIPs/blob/master/RIPS/rip-${number}.md`;
  }
  return `https://github.com/ethereum/EIPs/blob/master/EIPS/eip-${number}.md`;
}

function githubRepoLabel(repo: string, kind: string) {
  const repoLower = repo.toLowerCase();
  const kindUpper = kind.toUpperCase();
  if (kindUpper === 'RIP' || repoLower.includes('/rips')) return '/RIPs';
  if (kindUpper === 'ERC' || repoLower.includes('/ercs')) return '/ERCs';
  return '/EIPs';
}

function peopleUrl(actor: string) {
  return `/people/${encodeURIComponent(actor)}`;
}

function extractGithubUsername(author: string): string | null {
  const raw = author.trim();
  if (!raw) return null;

  // github.com/<username>
  const githubUrl = raw.match(/github\.com\/([A-Za-z0-9-]{1,39})/i);
  if (githubUrl?.[1]) return githubUrl[1];

  // @<username>
  const atHandle = raw.match(/@([A-Za-z0-9-]{1,39})/);
  if (atHandle?.[1]) return atHandle[1];

  // (<username>) pattern, common in author fields
  const paren = raw.match(/\(([A-Za-z0-9-]{1,39})\)/);
  if (paren?.[1]) return paren[1];

  return null;
}

function parseAuthorTokens(author: string): Array<{ label: string; username: string | null }> {
  return author
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((label) => ({ label, username: extractGithubUsername(label) }));
}

function editorAvatar(actor: string) {
  return `https://avatars.githubusercontent.com/${encodeURIComponent(actor)}?s=96&d=identicon`;
}

function activityAvatar(actor: string) {
  return `https://avatars.githubusercontent.com/${encodeURIComponent(actor || 'system')}?s=80&d=identicon`;
}

function githubRepoFromShort(repoShort: string) {
  const key = (repoShort || '').toLowerCase();
  if (key === 'ercs') return 'ethereum/ERCs';
  if (key === 'rips') return 'ethereum/RIPs';
  return 'ethereum/EIPs';
}

function formatEditorAction(eventType: string) {
  const raw = (eventType || '').toLowerCase();
  if (!raw) return 'activity';
  const map: Record<string, string> = {
    reviewed: 'reviewed',
    commented: 'commented',
    issue_comment: 'commented',
    labeled: 'labeled',
    unlabeled: 'removed label',
    synchronize: 'pushed updates',
    edited: 'edited',
    reopened: 'reopened',
    closed: 'closed',
    opened: 'opened',
    merged: 'merged',
  };
  return map[raw] || raw.replace(/_/g, ' ');
}

function getBucketTheme(dimension: Dimension, bucket: string): BucketTheme {
  if (dimension === 'status') return BUCKET_THEME_BY_STATUS[bucket] || DEFAULT_BUCKET_THEME;
  if (dimension === 'repo') {
    if (bucket === 'RIPs') return { border: 'border-primary/25', surface: 'bg-primary/5', title: 'text-foreground', iconWrap: 'bg-primary/10', icon: 'text-primary' };
    if (bucket === 'ERCs') return { border: 'border-primary/25', surface: 'bg-primary/5', title: 'text-foreground', iconWrap: 'bg-primary/10', icon: 'text-primary' };
    if (bucket === 'EIPs') return { border: 'border-primary/25', surface: 'bg-primary/5', title: 'text-foreground', iconWrap: 'bg-primary/10', icon: 'text-primary' };
  }
  return DEFAULT_BUCKET_THEME;
}

export default function EIPsHomePage() {
  const [dimension, setDimension] = useState<Dimension>('status');
  const [sortBy, setSortBy] = useState<SortBy>('updated_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [activeBucket, setActiveBucket] = useState<string | null>(null);
  const [columnSearch, setColumnSearch] = useState<ColumnSearch>({
    github: '',
    eip: '',
    title: '',
    author: '',
    type: '',
    status: '',
    category: '',
    updatedAt: '',
  });

  const [distribution, setDistribution] = useState<Array<{ bucket: string; count: number }>>([]);
  const [faqCategoryBreakdown, setFaqCategoryBreakdown] = useState<Array<{ category: string; count: number }>>([]);
  const [faqStatusDist, setFaqStatusDist] = useState<Array<{ status: string; count: number }>>([]);
  const [tableData, setTableData] = useState<{
    total: number;
      totalPages: number;
      rows: Array<{
        number: number;
        title: string | null;
        author: string | null;
        type: string;
        status: string;
        category: string;
        repo: string;
        kind: string;
        updatedAt: string;
    }>;
  } | null>(null);
  const [febDelta, setFebDelta] = useState<Array<{ status: string; count: number }>>([]);
  const [febEditors, setFebEditors] = useState<Array<{ actor: string; totalActions: number; prsTouched: number }>>([]);
  const [recentChanges, setRecentChanges] = useState<Array<{
    eip: string;
    eip_type: string;
    title: string;
    from: string;
    to: string;
    days: number;
    actor: string;
    repository: string;
    changed_at: Date;
  }> | null>(null);
  const [recentEditorActivities, setRecentEditorActivities] = useState<Array<{
    prNumber: string;
    title: string;
    editor: string;
    eventType: string;
    actedAt: string;
    repoShort: string;
    eventUrl?: string | null;
  }>>([]);
  const [openActivities, setOpenActivities] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadingLeaderboard, setDownloadingLeaderboard] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [dimension, activeBucket, sortBy, sortDir, columnSearch]);

  useEffect(() => {
    setActiveBucket(null);
  }, [dimension]);

  useEffect(() => {
    (async () => {
      try {
        const [categoryRes, statusRes] = await Promise.all([
          client.standards.getCategoryBreakdown({}),
          client.standards.getStatusDistribution({}),
        ]);

        const statusMap = new Map<string, number>();
        statusRes.forEach((r: { status: string; count: number }) => {
          statusMap.set(r.status, (statusMap.get(r.status) || 0) + r.count);
        });

        setFaqCategoryBreakdown(categoryRes);
        setFaqStatusDist(Array.from(statusMap.entries()).map(([status, count]) => ({ status, count })));
      } catch (err) {
        console.error('Failed to load FAQ reference data:', err);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [distRes, tableRes, deltaRes, editorRes, recentRes, editorActivityRes] = await Promise.all([
          client.standards.getUnifiedDistribution({ dimension }),
          client.standards.getUnifiedProposals({
            page,
            pageSize: 10,
            sortBy,
            sortDir,
            dimension,
            bucket: activeBucket ?? undefined,
            columnSearch: {
              github: columnSearch.github || undefined,
              eip: columnSearch.eip || undefined,
              title: columnSearch.title || undefined,
              author: columnSearch.author || undefined,
              type: columnSearch.type || undefined,
              status: columnSearch.status || undefined,
              category: columnSearch.category || undefined,
              updatedAt: columnSearch.updatedAt || undefined,
            },
          }),
          client.standards.getMonthlyDelta({ monthYear: FEB_2026 }),
          client.analytics.getMonthlyEditorLeaderboard({ monthYear: FEB_2026, limit: 10 }),
          client.analytics.getRecentChanges({ limit: 8 }),
          client.analytics.getRecentEditorActivity({ limit: 5, onlyOpenPRs: true }),
        ]);

        setDistribution(distRes);
        setTableData({ total: tableRes.total, totalPages: tableRes.totalPages, rows: tableRes.rows });
        setFebDelta(deltaRes);
        setFebEditors(editorRes);
        setRecentChanges(recentRes as typeof recentChanges);
        setRecentEditorActivities(editorActivityRes);
      } catch (err) {
        console.error('Failed to load homepage data:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [dimension, page, sortBy, sortDir, activeBucket, columnSearch]);

  const totalCount = useMemo(
    () => distribution.reduce((acc, row) => acc + row.count, 0),
    [distribution]
  );

  const maxCardCount = useMemo(
    () => Math.max(1, ...distribution.map((d) => d.count)),
    [distribution]
  );

  const maxInsight = useMemo(
    () => Math.max(1, ...febDelta.map((d) => d.count)),
    [febDelta]
  );
  const febInsightPieData = useMemo(
    () => febDelta.filter((d) => d.count > 0).map((d) => ({
      name: d.status,
      value: d.count,
      fill: STATUS_PIE_COLORS[d.status] || STATUS_PIE_COLORS.Unknown,
    })),
    [febDelta]
  );
  const febInsightTotal = useMemo(
    () => febDelta.reduce((sum, d) => sum + d.count, 0),
    [febDelta]
  );
  const febInsightDonutOption = useMemo(() => ({
    tooltip: {
      trigger: 'item',
      formatter: (params: { name: string; value: number; percent: number }) =>
        `${params.name}<br/>${params.value} (${params.percent}%)`,
      backgroundColor: 'rgba(15,23,42,0.9)',
      borderColor: 'rgba(148,163,184,0.2)',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
    },
    legend: { show: false },
    series: [
      {
        type: 'pie',
        radius: ['52%', '78%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        minAngle: 3,
        itemStyle: {
          borderRadius: 4,
          borderWidth: 1,
          borderColor: 'rgba(15,23,42,0.12)',
        },
        label: { show: false },
        labelLine: { show: false },
        data: febInsightPieData.map((d) => ({
          name: d.name,
          value: d.value,
          itemStyle: { color: d.fill },
        })),
      },
    ],
  }), [febInsightPieData]);

  const maxEditor = useMemo(
    () => Math.max(1, ...febEditors.map((e) => e.prsTouched)),
    [febEditors]
  );
  const showDistributionSkeleton = loading && distribution.length === 0;
  const showTableSkeleton = loading && !tableData;
  const showInsightSkeleton = loading && febDelta.length === 0;
  const showEditorSkeleton = loading && febEditors.length === 0;

  const toggleSort = (field: SortBy) => {
    if (sortBy === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(field);
    setSortDir('desc');
  };

  const handleColumnSearch = (key: keyof ColumnSearch, value: string) => {
    setColumnSearch((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setActiveBucket(null);
    setColumnSearch({
      github: '',
      eip: '',
      title: '',
      author: '',
      type: '',
      status: '',
      category: '',
      updatedAt: '',
    });
  };

  const downloadDetailedCSV = async () => {
    try {
      setDownloading(true);
      const res = await client.standards.exportUnifiedDetailedCSV({
        dimension,
        bucket: activeBucket ?? undefined,
        search: undefined,
      });

      const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export CSV:', err);
    } finally {
      setDownloading(false);
    }
  };

  const downloadLeaderboardDetailedCSV = async () => {
    try {
      setDownloadingLeaderboard(true);
      const res = await client.analytics.exportMonthlyEditorLeaderboardDetailedCSV({
        monthYear: FEB_2026,
        limit: 10,
      });
      const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export editor leaderboard CSV:', err);
    } finally {
      setDownloadingLeaderboard(false);
    }
  };

  const sectionTitleClass =
    'dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl';
  const sectionSubtitleClass =
    'mt-1 text-sm leading-relaxed text-muted-foreground';
  const panelTitleClass =
    'text-base font-semibold tracking-tight text-foreground sm:text-lg';

  return (
    <div className="w-full px-3 py-6 sm:px-6 lg:px-8 xl:px-12">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-6">
        <EIPsPageHeader />
      </motion.div>

      <hr className="mb-6 border-border" />

      <div className="mb-3 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start">
            <h2 className={sectionTitleClass}>
              Browse by Status, Category, and Repository
            </h2>
          </div>
          <div className="overflow-x-auto pb-1">
            <motion.div
              layout
              className="inline-flex min-w-max items-center rounded-xl border border-border bg-muted/60 p-1 shadow-sm"
            >
              <button
                onClick={() => setDimension('status')}
                className={`relative inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition ${dimension === 'status' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Activity className="h-4 w-4" /> Status
                {dimension === 'status' && (
                  <motion.span
                    layoutId="dimension-pill"
                    className="absolute inset-0 -z-10 rounded-lg bg-primary/15 ring-1 ring-primary/40"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
              <button
                onClick={() => setDimension('category')}
                className={`relative inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition ${dimension === 'category' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Layers className="h-4 w-4" /> Category
                {dimension === 'category' && (
                  <motion.span
                    layoutId="dimension-pill"
                    className="absolute inset-0 -z-10 rounded-lg bg-primary/15 ring-1 ring-primary/40"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
              <button
                onClick={() => setDimension('repo')}
                className={`relative inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition ${dimension === 'repo' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <GitBranch className="h-4 w-4" /> Repo
                {dimension === 'repo' && (
                  <motion.span
                    layoutId="dimension-pill"
                    className="absolute inset-0 -z-10 rounded-lg bg-primary/15 ring-1 ring-primary/40"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-1 gap-2 min-[520px]:grid-cols-2 lg:grid-cols-4">
        {showDistributionSkeleton ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div
              key={`dist-skeleton-${i}`}
              className="rounded-xl border border-border bg-card/60 p-3"
            >
              <div className="mb-2 h-7 w-7 animate-pulse rounded-lg bg-muted" />
              <div className="mb-1 h-3 w-24 animate-pulse rounded bg-muted" />
              <div className="mb-2 h-7 w-16 animate-pulse rounded bg-muted" />
              <div className="h-1.5 w-full animate-pulse rounded-full bg-muted" />
            </div>
          ))
        ) : (
          <>
        <motion.button
          whileHover={{ y: -1 }}
          onClick={() => setActiveBucket(null)}
          className={`rounded-xl border px-3 py-2 text-left transition ${activeBucket === null ? 'border-primary/60 bg-primary/10 shadow-[0_0_0_1px_rgb(var(--persona-accent-rgb)/0.16)]' : 'border-border bg-card/60 hover:border-primary/40'}`}
        >
          <div className="mb-1 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Layers className="h-3 w-3" />
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total</p>
          <p className="mt-0.5 text-lg font-semibold leading-none text-foreground sm:text-xl">{totalCount.toLocaleString()}</p>
        </motion.button>

        {distribution.map((row) => {
          const pct = totalCount > 0 ? Math.round((row.count / totalCount) * 100) : 0;
          const selected = activeBucket === row.bucket;
          const barColor = STATUS_COLORS[row.bucket] || 'bg-cyan-500';
          const theme = getBucketTheme(dimension, row.bucket);
          const StatusIcon = statusIconMap[row.bucket] ?? Layers;
          const CategoryIcon = categoryIconMap[row.bucket] ?? Layers;
          const RepoIcon = repoIconMap[row.bucket] ?? Layers;
          const Icon = dimension === 'status' ? StatusIcon : dimension === 'category' ? CategoryIcon : RepoIcon;

          return (
            <motion.button
              key={row.bucket}
              whileHover={{ y: -1 }}
              onClick={() => setActiveBucket((prev) => (prev === row.bucket ? null : row.bucket))}
              className={`rounded-xl border px-3 py-2 text-left transition ${selected ? 'border-primary/60 shadow-[0_0_0_1px_rgb(var(--persona-accent-rgb)/0.16)]' : 'hover:border-primary/40'} ${theme.border} ${theme.surface}`}
            >
              <div className={`mb-1.5 inline-flex h-7 w-7 items-center justify-center rounded-lg ${theme.iconWrap}`}>
                <Icon className={`h-3.5 w-3.5 ${theme.icon}`} />
              </div>
              <div className="mb-0.5 flex items-center justify-between gap-2">
                <p className={`truncate text-[13px] font-medium leading-tight ${theme.title}`}>{row.bucket}</p>
                <span className="text-[10px] text-muted-foreground">{pct}%</span>
              </div>
              <p className="text-xl font-semibold leading-none tracking-tight text-foreground sm:text-2xl">{row.count.toLocaleString()}</p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted/80">
                <div className={`h-full ${barColor}`} style={{ width: `${Math.max(8, (row.count / maxCardCount) * 100)}%` }} />
              </div>
            </motion.button>
          );
        })}
          </>
        )}
      </div>

      <div className="mb-6 overflow-hidden rounded-xl border border-border bg-card/60">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-border/70 bg-muted/40 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {[
                  ['github', 'GitHub'],
                  ['eip', 'EIP'],
                  ['title', 'Title'],
                  ['author', 'Author'],
                  ['type', 'Type'],
                  ['category', 'Category'],
                  ['status', 'Status'],
                ].map(([key, label]) => (
                  <th key={key} className="px-2 py-2">
                    <button onClick={() => toggleSort(key as SortBy)} className="inline-flex items-center gap-1 hover:text-foreground">
                      {label}
                      {sortBy === key ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3" />}
                    </button>
                  </th>
                ))}
              </tr>
              <tr className="border-b border-border/60 bg-muted/40">
                <th className="px-2 py-2"><input value={columnSearch.github} onChange={(e) => handleColumnSearch('github', e.target.value)} placeholder="/EIPs" className="h-8 w-full rounded-md border border-border bg-muted/60 px-2 text-xs text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30" /></th>
                <th className="px-2 py-2"><input value={columnSearch.eip} onChange={(e) => handleColumnSearch('eip', e.target.value)} placeholder="EIP-1559 / 1559" className="h-8 w-full rounded-md border border-border bg-muted/60 px-2 text-xs text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30" /></th>
                <th className="px-2 py-2"><input value={columnSearch.title} onChange={(e) => handleColumnSearch('title', e.target.value)} placeholder="Title" className="h-8 w-full rounded-md border border-border bg-muted/60 px-2 text-xs text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30" /></th>
                <th className="px-2 py-2"><input value={columnSearch.author} onChange={(e) => handleColumnSearch('author', e.target.value)} placeholder="Author" className="h-8 w-full rounded-md border border-border bg-muted/60 px-2 text-xs text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30" /></th>
                <th className="px-2 py-2"><input value={columnSearch.type} onChange={(e) => handleColumnSearch('type', e.target.value)} placeholder="Type" className="h-8 w-full rounded-md border border-border bg-muted/60 px-2 text-xs text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30" /></th>
                <th className="px-2 py-2"><input value={columnSearch.category} onChange={(e) => handleColumnSearch('category', e.target.value)} placeholder="Category" className="h-8 w-full rounded-md border border-border bg-muted/60 px-2 text-xs text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30" /></th>
                <th className="px-2 py-2"><input value={columnSearch.status} onChange={(e) => handleColumnSearch('status', e.target.value)} placeholder="Status" className="h-8 w-full rounded-md border border-border bg-muted/60 px-2 text-xs text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30" /></th>
              </tr>
            </thead>
            <tbody>
              {showTableSkeleton ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td colSpan={7} className="px-2 py-3">
                      <div className="h-5 animate-pulse rounded bg-muted" />
                    </td>
                  </tr>
                ))
              ) : (
                (tableData?.rows || []).map((row) => (
                  <tr key={`${row.repo}-${row.kind}-${row.number}`} className="border-b border-border/60 text-foreground hover:bg-muted/40">
                    <td className="px-2 py-2">
                      <a
                        href={githubProposalUrl(row.kind, row.number)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {githubRepoLabel(row.repo, row.kind)}
                      </a>
                    </td>
                    <td className="px-2 py-2 font-medium text-primary">
                      <Link href={proposalUrl(row.repo, row.kind, row.number)} className="hover:underline">{row.kind}-{row.number}</Link>
                    </td>
                    <td className="max-w-[420px] px-2 py-2 text-foreground">{row.title || `${row.kind}-${row.number}`}</td>
                    <td className="px-2 py-2 text-muted-foreground">
                      {(() => {
                        const author = row.author?.trim() || '';
                        if (!author) return '-';
                        const tokens = parseAuthorTokens(author);
                        return (
                          <>
                            {tokens.map((token, idx) => (
                              <React.Fragment key={`${token.label}-${idx}`}>
                                {idx > 0 ? ', ' : ''}
                                {token.username ? (
                                  <Link href={peopleUrl(token.username)} className="text-primary hover:underline">
                                    {token.label}
                                  </Link>
                                ) : (
                                  token.label
                                )}
                              </React.Fragment>
                            ))}
                          </>
                        );
                      })()}
                    </td>
                    <td className="px-2 py-2 text-muted-foreground">{row.type || '-'}</td>
                    <td className="px-2 py-2">{row.category}</td>
                    <td className="px-2 py-2"><span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] ${BADGE_COLORS[row.status] || BADGE_COLORS.Unknown}`}>{row.status}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <span>{tableData?.total.toLocaleString() || 0} results</span>
          <div className="flex items-center gap-2">
            <button
              onClick={clearFilters}
              className="rounded-md border border-border bg-muted/60 px-2 py-1 text-muted-foreground hover:border-primary/40 hover:text-primary"
            >
              Reset Filters
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md border border-border bg-muted/60 px-2 py-1 disabled:opacity-40"
            >
              Prev
            </button>
            <span>Page {page} / {tableData?.totalPages || 1}</span>
            <button
              onClick={() => setPage((p) => Math.min(tableData?.totalPages || 1, p + 1))}
              disabled={page >= (tableData?.totalPages || 1)}
              className="rounded-md border border-border bg-muted/60 px-2 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card/60 p-4 shadow-sm">
          <div className="mb-3 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <h3 className={panelTitleClass}>{monthLabel(FEB_2026)} Insight (Status Changes)</h3>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Monthly status transition distribution and totals.
              </p>
            </div>
            <button
              onClick={downloadDetailedCSV}
              disabled={downloading}
              className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/15 disabled:opacity-60"
            >
              <Download className="h-3.5 w-3.5" /> {downloading ? 'Exporting...' : 'Detailed CSV'}
            </button>
          </div>

          <div className="grid items-center gap-4 md:grid-cols-[220px_1fr]">
            <div className="h-[180px] w-full sm:h-[220px]">
              {showInsightSkeleton ? (
                <div className="h-full w-full animate-pulse rounded-full bg-muted" />
              ) : (
                <>
                  <ReactECharts
                    option={febInsightDonutOption}
                    style={{ height: '100%', width: '100%' }}
                    opts={{ renderer: 'svg' }}
                  />
                  <p className="mt-1 text-center text-xs text-muted-foreground">
                    Total changes: <span className="font-semibold text-foreground">{febInsightTotal}</span>
                  </p>
                </>
              )}
            </div>
            <div className="space-y-2">
              {showInsightSkeleton
                ? Array.from({ length: 5 }).map((_, i) => (
                    <div key={`insight-skeleton-${i}`} className="rounded-lg bg-muted/40 p-2.5 ring-1 ring-border">
                      <div className="mb-1 h-4 w-28 animate-pulse rounded bg-muted" />
                      <div className="h-1.5 animate-pulse rounded-full bg-muted" />
                    </div>
                  ))
                : febDelta.map((row) => (
                    <div key={row.status} className="rounded-lg bg-muted/40 p-2.5 ring-1 ring-border">
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-foreground">{row.status}</span>
                        <span className="font-semibold text-primary">{row.count}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted/80">
                        <div className={`h-full ${STATUS_COLORS[row.status] || 'bg-cyan-500'}`} style={{ width: `${Math.max(8, (row.count / maxInsight) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card/60 p-4 shadow-sm">
          <div className="mb-3 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                <h3 className={panelTitleClass}>Editor Leaderboard ({monthLabel(FEB_2026)})</h3>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Ranked by PRs touched and editorial actions in the month.
              </p>
            </div>
            <button
              onClick={downloadLeaderboardDetailedCSV}
              disabled={downloadingLeaderboard}
              className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/15 disabled:opacity-60"
            >
              <Download className="h-3.5 w-3.5" /> {downloadingLeaderboard ? 'Exporting...' : 'Detailed CSV'}
            </button>
          </div>

          <div className="space-y-2">
            {showEditorSkeleton
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={`editor-skeleton-${i}`} className="rounded-lg p-2.5 ring-1 ring-border">
                    <div className="mb-2 flex items-center gap-2">
                      <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
                      <div className="flex-1">
                        <div className="mb-1 h-3 w-24 animate-pulse rounded bg-muted" />
                        <div className="h-3 w-36 animate-pulse rounded bg-muted" />
                      </div>
                    </div>
                    <div className="h-1.5 animate-pulse rounded-full bg-muted" />
                  </div>
                ))
              : febEditors.map((row, idx) => (
                  <div key={row.actor} className={`rounded-lg p-2.5 ring-1 ${idx === 0 ? 'bg-primary/10 ring-primary/30' : 'bg-muted/40 ring-border'}`}>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="h-8 w-8 overflow-hidden rounded-full ring-1 ring-border">
                          <Image src={editorAvatar(row.actor)} alt={row.actor} width={32} height={32} className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">#{idx + 1} {row.actor}</p>
                          <p className="text-xs text-muted-foreground">{row.totalActions} actions across {row.prsTouched} PRs</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-primary">{row.prsTouched}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted/80">
                      <div className="h-full bg-primary" style={{ width: `${Math.max(8, (row.prsTouched / maxEditor) * 100)}%` }} />
                    </div>
                  </div>
                ))}
          </div>
        </div>
      </div>

      <hr className="my-6 border-border" />

      <section className="mb-6 w-full" id="recent-governance-activity">
        <div className="mb-4 flex flex-col items-start gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className={sectionTitleClass}>
              Recent Governance Activity
            </h2>
            <p className={sectionSubtitleClass}>
              Latest status transitions with actor context, proposal links, and lifecycle details.
            </p>
          </div>
          <CopyLinkButton sectionId="recent-governance-activity" className="h-8 w-8 rounded-md" />
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div>
            {!recentChanges ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-5 animate-pulse rounded bg-muted" />)}
              </div>
            ) : recentChanges.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent status changes.</p>
            ) : (
              <div className="space-y-2">
                {recentChanges.map((change) => {
                  const id = `${change.eip_type}-${change.eip}-${change.changed_at}`;
                  const isOpen = Boolean(openActivities[id]);
                  return (
                    <div key={id} className={`overflow-hidden rounded-lg border ${ACTIVITY_CARD_TINT[change.to] || ACTIVITY_CARD_TINT.Unknown}`}>
                      <button
                        type="button"
                        onClick={() => setOpenActivities((prev) => ({ ...prev, [id]: !prev[id] }))}
                        className="flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-muted/50 sm:items-center"
                      >
                        <div className="h-8 w-8 overflow-hidden rounded-full ring-1 ring-border">
                          <Image src={activityAvatar(change.actor)} alt={change.actor || 'system'} width={32} height={32} className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-medium text-foreground">{change.actor || 'system'}</span>
                            <span className={`h-2 w-2 rounded-full ${STATUS_COLORS[change.to] || 'bg-cyan-500'}`} />
                            <span className="rounded-full bg-muted/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                              {change.from ? `${change.from} -> ${change.to}` : `to ${change.to}`}
                            </span>
                          </div>
                          <p className="truncate text-sm text-muted-foreground">
                            {change.eip_type}-{change.eip}: {change.title || 'Untitled proposal'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs tabular-nums text-muted-foreground">
                          <span>{change.days === 0 ? 'today' : `${change.days}d ago`}</span>
                          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden border-t border-border px-3 py-2"
                          >
                            <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                              <div>Repository: <span className="font-medium text-foreground">{change.repository || 'Unknown'}</span></div>
                              <div>Status: <span className="font-medium text-foreground">{change.from || 'Unknown'} {'->'} {change.to}</span></div>
                              <div>Proposal: <span className="font-medium text-foreground">{change.eip_type}-{change.eip}</span></div>
                              <div>
                                Open:&nbsp;
                                <Link href={`/${change.eip_type === 'RIP' ? 'rip' : change.eip_type === 'ERC' ? 'erc' : 'eip'}/${change.eip}`} className="font-medium text-primary hover:underline">
                                  view proposal
                                </Link>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="rounded-xl border border-border bg-card/60 p-3 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Latest Editor Activity (Open PRs)</h3>
              <span className="rounded-full bg-muted/70 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {recentEditorActivities.length}
              </span>
            </div>
            <div className="space-y-2">
              {loading && recentEditorActivities.length === 0 ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={`review-skeleton-${i}`} className="rounded-lg border border-border p-2">
                    <div className="mb-1 h-3 w-24 animate-pulse rounded bg-muted" />
                    <div className="mb-1 h-3 w-full animate-pulse rounded bg-muted" />
                    <div className="h-2 w-20 animate-pulse rounded bg-muted" />
                  </div>
                ))
              ) : recentEditorActivities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No editor activity found for open PRs.</p>
              ) : (
                recentEditorActivities.slice(0, 5).map((item, idx) => (
                  <a
                    key={`${item.editor}-${item.prNumber}-${idx}`}
                    href={item.eventUrl || `/pr/${githubRepoFromShort(item.repoShort)}/${item.prNumber}`}
                    target={item.eventUrl ? "_blank" : undefined}
                    rel={item.eventUrl ? "noopener noreferrer" : undefined}
                    className="block rounded-lg border border-slate-200/80 bg-slate-50/70 p-2.5 transition hover:border-primary/50 hover:bg-slate-50 dark:border-slate-700/50 dark:bg-slate-900/60 dark:hover:bg-slate-900/75"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <div className="h-7 w-7 overflow-hidden rounded-full ring-1 ring-border">
                        <Image src={editorAvatar(item.editor)} alt={item.editor} width={28} height={28} className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-foreground">{item.editor}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatEditorAction(item.eventType)} · {new Date(item.actedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {item.title || `PR #${item.prNumber}`}
                    </p>
                    <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-muted/70 px-2 py-0.5 text-[10px] text-muted-foreground">
                      <GitPullRequest className="h-3 w-3" />
                      {item.repoShort.toUpperCase()} PR #{item.prNumber}
                    </div>
                  </a>
                ))
              )}
            </div>
          </aside>
        </div>
      </section>

      <hr className="my-6 border-border" />

      <section className="mb-6">
        <SocialCommunityUpdates />
      </section>

      <hr className="my-6 border-border" />

      <section>
        <HomeFAQs categoryBreakdown={faqCategoryBreakdown} statusDist={faqStatusDist} />
      </section>
    </div>
  );
}
