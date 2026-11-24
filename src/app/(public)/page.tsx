'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  Bell,
  BookOpen,
  Boxes,
  CheckCircle2,
  Code,
  Cpu,
  Download,
  Eye,
  Flame,
  Info,
  ExternalLink,
  FileText,
  Filter,
  Gavel,
  GitBranch,
  GitPullRequest,
  Layers,
  Network,
  Package,
  Pause,
  Trophy,
  Minus,
  MessageSquare,
  XCircle,
  Wrench,
  Zap,
} from 'lucide-react';
import { client } from '@/lib/orpc';
import ReactECharts from 'echarts-for-react';
import { ChartWatermark } from '@/components/chart-watermark';
import { ChartFooter } from '@/components/chart-footer';
import { CopyLinkButton } from '@/components/header';
import { LastUpdated } from '@/components/analytics/LastUpdated';
import { InlineBrandLoader } from '@/components/inline-brand-loader';
import { SectionHead } from '@/components/ledger/section-head';
import { LedgerBadge } from '@/components/ledger/badge';
import { HomeHeroSection } from './_components/home-hero-section';
import dynamic from 'next/dynamic';
import SocialCommunityUpdates from './_components/social-community-updates';
import { TestimonialsSection } from '@/components/testimonials-section';
import TrendingProposals from '@/app/dashboard/_components/trending-proposals';
import GovernanceOverTime from '@/app/dashboard/_components/governance-over-time';

const UpgradeWatchSection = dynamic(() => import('./_components/UpgradeWatchSection'), {
  loading: () => <div className="py-12"><InlineBrandLoader size="md" label="Loading upgrade watch…" /></div>,
});
import { WeeklyRecapSection } from './_components/WeeklyRecapSection';
import { HomeProtocolCalls } from './_components/home-protocol-calls';
import { useSession } from '@/hooks/useSession';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { ASSOCIATE_EIP_EDITORS, CANONICAL_EIP_EDITORS } from '@/data/eip-contributor-roles';
import { getUpgradeTimelineData } from '@/data/upgrade-timelines';
import { chartTooltip, chartTooltipRow, chartTooltipTitle, CHART_TOOLTIP_BORDER } from '@/lib/chart-theme';

type Dimension = 'status' | 'category' | 'repo' | 'stages';
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
  upgrade: string;
};

type HomepageEditorRow = {
  actor: string;
  totalActions: number;
  prsTouched: number;
};

type EditorContributionWindow = 'month' | 'all' | 'custom';

type EditorContributionRow = {
  actor: string;
  totalActions: number;
  prsTouched: number;
  reviews: number;
  comments: number;
};

type BoardPreviewRow = {
  prNumber: number;
  title: string | null;
  author: string | null;
  createdAt: string;
  labels: string[];
  repo: string;
  repoShort: string;
  govState: string;
  waitDays: number;
  processType: string;
};

type ProcessBreakdownRow = {
  category: string;
  count: number;
};

type BoardProcessStat = {
  type: string;
  count: number;
};

type ParticipantBreakdownRow = {
  label: string;
  count: number;
};

type UpgradeTimelineRow = {
  date: string;
  included: string[];
  scheduled: string[];
  declined: string[];
  considered: string[];
  proposed: string[];
};

function normalizeUpgradeEipIds(values: string[]): string[] {
  return values
    .map((value) => String(value).replace(/^EIP-/i, '').trim())
    .filter((value) => value.length > 0);
}

function normalizeUpgradeTimelineRows(rows: UpgradeTimelineRow[]): UpgradeTimelineRow[] {
  return [...rows]
    .map((row) => ({
      date: row.date,
      included: normalizeUpgradeEipIds(row.included),
      scheduled: normalizeUpgradeEipIds(row.scheduled),
      declined: normalizeUpgradeEipIds(row.declined),
      considered: normalizeUpgradeEipIds(row.considered),
      proposed: normalizeUpgradeEipIds(row.proposed),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

type NewcomerTrendingProposal = {
  proposalNumber: number;
  proposalType: 'EIP' | 'ERC' | 'RIP';
  title: string;
  status?: string;
  category?: string;
  replies: number;
  destination: 'internal' | 'magicians';
  url: string;
};

type EditorRepoFilter = '' | 'eips' | 'ercs' | 'rips';
type DeveloperRepoFilter = '' | 'eips' | 'ercs' | 'rips';

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-slate-500',
  Review: 'bg-yellow-500',
  'Last Call': 'bg-green-700',
  Final: 'bg-blue-500',
  Living: 'bg-cyan-500',
  Stagnant: 'bg-red-500',
  Withdrawn: 'bg-red-600',
  Unknown: 'bg-slate-400',
  EIPs: 'bg-cyan-500',
  ERCs: 'bg-emerald-500',
  RIPs: 'bg-violet-500',
};

const BOARD_PROCESS_ORDER = ['Status Change', 'New EIP', 'PR DRAFT', 'Typo', 'Website', 'EIP-1', 'Tooling', 'Content Edit', 'Misc'];
const DEV_BOARD_GOVSTATE_BADGES: Record<string, string> = {
  'Waiting on Editor': 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
  'Waiting on Author': 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
  AWAITED: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30',
  Uncategorized: 'bg-muted text-muted-foreground border-border',
};

const BOARD_PROCESS_BADGES: Record<string, string> = {
  Typo: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20',
  'New EIP': 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  Website: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/20',
  'EIP-1': 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/20',
  Tooling: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/20',
  'Status Change': 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/20',
  'PR DRAFT': 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/20',
  'Content Edit': 'bg-muted text-muted-foreground border-border',
  Misc: 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/20',
};

const STATUS_COLORS_DARK: Record<string, string> = {
  Final: '#10b981',
  'Last Call': '#f97316',
  Review: '#f59e0b',
  Draft: '#64748b',
  Living: '#06b6d4',
  Stagnant: '#6b7280',
  Withdrawn: '#ef4444',
  Unknown: '#94a3b8',
};

const STATUS_COLORS_LIGHT: Record<string, string> = {
  Final: '#059669',
  'Last Call': '#ea580c',
  Review: '#d97706',
  Draft: '#475569',
  Living: '#0891b2',
  Stagnant: '#64748b',
  Withdrawn: '#dc2626',
  Unknown: '#64748b',
};

const PROCESS_STACK_COLORS: Record<string, string> = {
  'Status Change': '#34d399',
  'New EIP': '#60a5fa',
  'PR DRAFT': '#f59e0b',
  Typo: '#f97316',
  Website: '#a78bfa',
  'EIP-1': '#22d3ee',
  Tooling: '#fb7185',
  'Content Edit': '#94a3b8',
  Misc: '#64748b',
};

const BADGE_COLORS: Record<string, string> = {
  Draft: 'bg-slate-500/20 text-muted-foreground border-slate-500/30',
  Review: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30',
  'Last Call': 'bg-green-700/20 text-green-800 dark:text-green-300 border-green-700/30',
  Final: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30',
  Living: 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
  Stagnant: 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30',
  Withdrawn: 'bg-red-600/20 text-red-700 dark:text-red-300 border-red-600/30',
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

const STAGE_COLORS: Record<string, string> = {
  included: 'bg-emerald-500',
  scheduled: 'bg-cyan-500',
  considered: 'bg-amber-500',
  proposed: 'bg-blue-500',
  declined: 'bg-red-500',
};

const STAGE_LABELS: Record<string, string> = {
  included: 'Included',
  scheduled: 'SFI',
  considered: 'CFI',
  proposed: 'PFI',
  declined: 'DFI',
};

const STAGE_FULL_LABELS: Record<string, string> = {
  included: 'Included',
  scheduled: 'Scheduled for Inclusion',
  considered: 'Considered for Inclusion',
  proposed: 'Proposed for Inclusion',
  declined: 'Declined for Inclusion',
};

const stageIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  included: CheckCircle2,
  scheduled: Zap,
  considered: Eye,
  proposed: FileText,
  declined: XCircle,
};

const STAGE_BADGE_COLORS: Record<string, string> = {
  included: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  scheduled: 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
  considered: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30',
  proposed: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30',
  declined: 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30',
};

const BUCKET_THEME_BY_STAGE: Record<string, BucketTheme> = {
  included: { border: 'border-emerald-500/30', surface: 'bg-emerald-500/[0.07]', title: 'text-foreground', iconWrap: 'bg-emerald-500/15', icon: 'text-emerald-700 dark:text-emerald-300' },
  scheduled: { border: 'border-cyan-500/30', surface: 'bg-cyan-500/[0.07]', title: 'text-foreground', iconWrap: 'bg-cyan-500/15', icon: 'text-cyan-700 dark:text-cyan-300' },
  considered: { border: 'border-amber-500/30', surface: 'bg-amber-500/[0.07]', title: 'text-foreground', iconWrap: 'bg-amber-500/15', icon: 'text-amber-700 dark:text-amber-300' },
  proposed: { border: 'border-blue-500/30', surface: 'bg-blue-500/[0.07]', title: 'text-foreground', iconWrap: 'bg-blue-500/15', icon: 'text-blue-700 dark:text-blue-300' },
  declined: { border: 'border-red-500/30', surface: 'bg-red-500/[0.07]', title: 'text-foreground', iconWrap: 'bg-red-500/15', icon: 'text-red-700 dark:text-red-300' },
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
  Draft: { border: 'border-slate-400/30', surface: 'bg-slate-500/[0.07]', title: 'text-foreground', iconWrap: 'bg-slate-500/15', icon: 'text-slate-600 dark:text-slate-300' },
  Review: { border: 'border-yellow-500/30', surface: 'bg-yellow-500/[0.07]', title: 'text-foreground', iconWrap: 'bg-yellow-500/15', icon: 'text-yellow-700 dark:text-yellow-300' },
  'Last Call': { border: 'border-green-700/30', surface: 'bg-green-700/[0.07]', title: 'text-foreground', iconWrap: 'bg-green-700/15', icon: 'text-green-800 dark:text-green-300' },
  Final: { border: 'border-blue-500/30', surface: 'bg-blue-500/[0.07]', title: 'text-foreground', iconWrap: 'bg-blue-500/15', icon: 'text-blue-700 dark:text-blue-300' },
  Stagnant: { border: 'border-red-500/30', surface: 'bg-red-500/[0.07]', title: 'text-foreground', iconWrap: 'bg-red-500/15', icon: 'text-red-700 dark:text-red-300' },
  Withdrawn: { border: 'border-red-600/30', surface: 'bg-red-600/[0.07]', title: 'text-foreground', iconWrap: 'bg-red-600/15', icon: 'text-red-700 dark:text-red-300' },
  Living: { border: 'border-cyan-500/30', surface: 'bg-cyan-500/[0.07]', title: 'text-foreground', iconWrap: 'bg-cyan-500/15', icon: 'text-cyan-700 dark:text-cyan-300' },
  Unknown: { border: 'border-slate-400/25', surface: 'bg-slate-500/[0.06]', title: 'text-foreground', iconWrap: 'bg-slate-500/12', icon: 'text-slate-600 dark:text-slate-400' },
};

const BUCKET_THEME_BY_CATEGORY: Record<string, BucketTheme> = {
  Core: { border: 'border-orange-500/28', surface: 'bg-orange-500/[0.06]', title: 'text-foreground', iconWrap: 'bg-orange-500/14', icon: 'text-orange-700 dark:text-orange-300' },
  Networking: { border: 'border-sky-500/28', surface: 'bg-sky-500/[0.06]', title: 'text-foreground', iconWrap: 'bg-sky-500/14', icon: 'text-sky-700 dark:text-sky-300' },
  Interface: { border: 'border-violet-500/28', surface: 'bg-violet-500/[0.06]', title: 'text-foreground', iconWrap: 'bg-violet-500/14', icon: 'text-violet-700 dark:text-violet-300' },
  ERC: { border: 'border-emerald-500/28', surface: 'bg-emerald-500/[0.06]', title: 'text-foreground', iconWrap: 'bg-emerald-500/14', icon: 'text-emerald-700 dark:text-emerald-300' },
  RIP: { border: 'border-indigo-500/28', surface: 'bg-indigo-500/[0.06]', title: 'text-foreground', iconWrap: 'bg-indigo-500/14', icon: 'text-indigo-700 dark:text-indigo-300' },
  RRC: { border: 'border-indigo-500/28', surface: 'bg-indigo-500/[0.06]', title: 'text-foreground', iconWrap: 'bg-indigo-500/14', icon: 'text-indigo-700 dark:text-indigo-300' },
  Meta: { border: 'border-fuchsia-500/28', surface: 'bg-fuchsia-500/[0.06]', title: 'text-foreground', iconWrap: 'bg-fuchsia-500/14', icon: 'text-fuchsia-700 dark:text-fuchsia-300' },
  Informational: { border: 'border-teal-500/28', surface: 'bg-teal-500/[0.06]', title: 'text-foreground', iconWrap: 'bg-teal-500/14', icon: 'text-teal-700 dark:text-teal-300' },
  Other: { border: 'border-slate-400/25', surface: 'bg-slate-500/[0.06]', title: 'text-foreground', iconWrap: 'bg-slate-500/12', icon: 'text-slate-600 dark:text-slate-400' },
};

const ENTRY_PATHS = [
  {
    title: 'Browse',
    description: 'Scan EIPs, ERCs, and RIPs by status, category, and repository.',
    href: '/explore',
    cta: 'Browse proposals',
    icon: BookOpen,
  },
  {
    title: 'Analyze',
    description: 'Use live analytics to monitor activity, editorial load, and proposal velocity.',
    href: '/analytics',
    cta: 'Open analytics',
    icon: Activity,
  },
  {
    title: 'Contribute',
    description: 'Join the project with docs, UX, and analytics contributions.',
    href: 'https://github.com/AvarchLLC/eipsinsight-v4/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22',
    cta: 'Good first issues',
    icon: GitPullRequest,
    external: true,
  },
];


/** Section title that links to its full page, with a hover arrow. Replaces the old
 *  "Explore X" footer buttons — the header itself is now the way in. */
/**
 * Section title that doubles as a link to the section's full page.
 *
 * Renders a real <h2> because the sidebar scroll spy labels each section from
 * its first descendant h1/h2/h3 — without one, it reaches into nested
 * components and mislabels the section with some inner card's heading.
 * `display: contents` keeps the heading out of the layout, so the link renders
 * exactly as it did when this was a bare <a>.
 */
function SectionTitleLink({ href, className, children }: { href: string; className: string; children: React.ReactNode }) {
  return (
    <h2 className="contents">
      <Link href={href} className={cn(className, 'group inline-flex items-center gap-1 transition-colors hover:text-primary')}>
        {children}
        <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
      </Link>
    </h2>
  );
}


function monthLabel(monthYear: string) {
  const [y, m] = monthYear.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function monthRange(monthYear: string) {
  const [year, month] = monthYear.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  const toInput = (date: Date) => date.toISOString().slice(0, 10);
  return {
    fromInput: toInput(start),
    toInput: toInput(end),
    fromQuery: start.toISOString(),
    toQuery: end.toISOString(),
  };
}

function dayStartIso(dateInput: string) {
  const date = new Date(`${dateInput}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function dayEndIso(dateInput: string) {
  const date = new Date(`${dateInput}T23:59:59.999Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
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
  return `/user/${encodeURIComponent(actor)}`;
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

function fmtWaitCompact(days: number) {
  if (days >= 7) {
    const w = Math.floor(days / 7);
    return `${w}w`;
  }
  return `${days}d`;
}

function fmtBoardDate(d: string) {
  return new Date(`${d}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function waitPriority(days: number) {
  if (days > 28) return { color: 'text-red-600 dark:text-red-400', Icon: Flame };
  if (days > 7) return { color: 'text-amber-600 dark:text-amber-400', Icon: AlertTriangle };
  return { color: 'text-emerald-600 dark:text-emerald-400', Icon: Minus };
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

function getDimensionColor(dimension: Dimension, bucket: string, isDark: boolean): string {
  if (dimension === 'status') {
    const map = isDark ? STATUS_COLORS_DARK : STATUS_COLORS_LIGHT;
    return map[bucket] || (isDark ? '#94a3b8' : '#64748b');
  }
  if (dimension === 'category') {
    const darkMap: Record<string, string> = {
      Core: '#10b981',
      ERC: '#06b6d4',
      Networking: '#3b82f6',
      Interface: '#8b5cf6',
      Meta: '#ec4899',
      Informational: '#94a3b8',
      RIP: '#f97316',
    };
    const lightMap: Record<string, string> = {
      Core: '#059669',
      ERC: '#0891b2',
      Networking: '#2563eb',
      Interface: '#7c3aed',
      Meta: '#db2777',
      Informational: '#475569',
      RIP: '#ea580c',
    };
    return (isDark ? darkMap : lightMap)[bucket] || (isDark ? '#94a3b8' : '#64748b');
  }
  if (dimension === 'repo') {
    if (bucket === 'ERCs') return isDark ? '#10b981' : '#059669';
    if (bucket === 'EIPs') return isDark ? '#06b6d4' : '#0891b2';
    if (bucket === 'RIPs') return isDark ? '#f97316' : '#ea580c';
    return isDark ? '#94a3b8' : '#64748b';
  }
  if (dimension === 'stages') {
    if (bucket.includes('Included')) return isDark ? '#10b981' : '#059669';
    if (bucket.includes('Scheduled') || bucket.includes('SFI')) return isDark ? '#06b6d4' : '#0891b2';
    if (bucket.includes('Considered') || bucket.includes('PFI')) return isDark ? '#3b82f6' : '#2563eb';
    if (bucket.includes('Candidate') || bucket.includes('CFI')) return isDark ? '#f59e0b' : '#d97706';
    if (bucket.includes('Declined') || bucket.includes('DFI')) return isDark ? '#ef4444' : '#dc2626';
    return isDark ? '#94a3b8' : '#64748b';
  }
  return isDark ? '#94a3b8' : '#64748b';
}

function getBucketTheme(dimension: Dimension, bucket: string): BucketTheme {
  if (dimension === 'status') return BUCKET_THEME_BY_STATUS[bucket] || BUCKET_THEME_BY_STATUS.Unknown || DEFAULT_BUCKET_THEME;
  if (dimension === 'category') return BUCKET_THEME_BY_CATEGORY[bucket] || DEFAULT_BUCKET_THEME;
  if (dimension === 'stages') return BUCKET_THEME_BY_STAGE[bucket] || DEFAULT_BUCKET_THEME;
  if (dimension === 'repo') {
    if (bucket === 'RIPs') return { border: 'border-violet-500/28', surface: 'bg-violet-500/[0.06]', title: 'text-foreground', iconWrap: 'bg-violet-500/14', icon: 'text-violet-700 dark:text-violet-300' };
    if (bucket === 'ERCs') return { border: 'border-emerald-500/28', surface: 'bg-emerald-500/[0.06]', title: 'text-foreground', iconWrap: 'bg-emerald-500/14', icon: 'text-emerald-700 dark:text-emerald-300' };
    if (bucket === 'EIPs') return { border: 'border-cyan-500/28', surface: 'bg-cyan-500/[0.06]', title: 'text-foreground', iconWrap: 'bg-cyan-500/14', icon: 'text-cyan-700 dark:text-cyan-300' };
  }
  return DEFAULT_BUCKET_THEME;
}

export default function EIPsHomePage() {
  const { data: session, loading: sessionLoading } = useSession();
  const { resolvedTheme } = useTheme();

  const isDark = resolvedTheme === 'dark';
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
    upgrade: '',
  });
  const [debouncedColumnSearch, setDebouncedColumnSearch] = useState<ColumnSearch>(columnSearch);
  const [autoGithubFilter, setAutoGithubFilter] = useState(false);
  const [eipDisplayValue, setEipDisplayValue] = useState('');
  const [activeStatusFilter, setActiveStatusFilter] = useState<string | null>(null);
  const [statusSubDist, setStatusSubDist] = useState<Array<{ status: string; count: number }>>([]);
  const [statusSubDistLoading, setStatusSubDistLoading] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);
  const [categorySubDist, setCategorySubDist] = useState<Array<{ category: string; count: number }>>([]);
  const [categorySubDistLoading, setCategorySubDistLoading] = useState(false);
  const [stageStatusSubDist, setStageStatusSubDist] = useState<Array<{ status: string; count: number }>>([]);
  const [stageStatusSubDistLoading, setStageStatusSubDistLoading] = useState(false);
  const [stagesDistribution, setStagesDistribution] = useState<Array<{ bucket: string; count: number }>>([]);
  const [stagesDistributionLoading, setStagesDistributionLoading] = useState(false);
  const [showSubFilter, setShowSubFilter] = useState(true);

  const [distribution, setDistribution] = useState<Array<{ bucket: string; count: number }>>([]);
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
  const [insightView, setInsightView] = useState<'donut' | 'bars'>('donut');
  const [febEditors, setFebEditors] = useState<HomepageEditorRow[]>([]);
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
  const [allRecentActivity, setAllRecentActivity] = useState<Array<{
    kind: 'status_change' | 'pr_event';
    occurredAt: Date;
    eip: string;
    eipType: string;
    title: string;
    fromStatus: string | null;
    toStatus: string | null;
    actor: string;
    repository: string;
    prNumber: string | null;
    eventType: string | null;
    eventUrl: string | null;
    days: number;
  }>>([]);
  const [activityFilter, setActivityFilter] = useState<'all' | 'status_changes'>('all');
  const [openActivities, setOpenActivities] = useState<Record<string, boolean>>({});
  const [distributionLoading, setDistributionLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(true);
  const [widgetsLoading, setWidgetsLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadingLeaderboard, setDownloadingLeaderboard] = useState(false);
  const [monthlyDeltaUpdatedAt, setMonthlyDeltaUpdatedAt] = useState<string | null>(null);
  const [monthlyLeaderboardUpdatedAt, setMonthlyLeaderboardUpdatedAt] = useState<string | null>(null);
  // RIPs are a separate track — opt-in so status/category counts are not skewed.
  const [includeRips, setIncludeRips] = useState(false);
  const [showProposalTable, setShowProposalTable] = useState(false);
  const [editorRepoFilter, setEditorRepoFilter] = useState<EditorRepoFilter>('');
  const [developerRepoFilter, setDeveloperRepoFilter] = useState<DeveloperRepoFilter>('eips');
  const [selectedBoardProcesses, setSelectedBoardProcesses] = useState<string[]>([]);
  const [editorQueuePage, setEditorQueuePage] = useState(1);
  const [developerBoardPage, setDeveloperBoardPage] = useState(1);
  const [editorCategoryPage, setEditorCategoryPage] = useState(1);
  const [boardPreviewRows, setBoardPreviewRows] = useState<BoardPreviewRow[]>([]);
  const [boardProcessStats, setBoardProcessStats] = useState<BoardProcessStat[]>([]);
  const [boardPreviewTotal, setBoardPreviewTotal] = useState(0);
  const [boardPreviewTotalPages, setBoardPreviewTotalPages] = useState(1);
  const [developerBoardRows, setDeveloperBoardRows] = useState<BoardPreviewRow[]>([]);
  const [developerBoardTotal, setDeveloperBoardTotal] = useState(0);
  const [developerBoardTotalPages, setDeveloperBoardTotalPages] = useState(1);
  const [processBreakdownRows, setProcessBreakdownRows] = useState<ProcessBreakdownRow[]>([]);
  const [participantBreakdownRows, setParticipantBreakdownRows] = useState<ParticipantBreakdownRow[]>([]);
  const [boardPreviewLoading, setBoardPreviewLoading] = useState(false);
  const [developerBoardLoading, setDeveloperBoardLoading] = useState(false);
  const [upgradeWatchSlug, setUpgradeWatchSlug] = useState('glamsterdam');
  const [upgradeTimelineRows, setUpgradeTimelineRows] = useState<UpgradeTimelineRow[]>([]);
  const [upgradeTimelineLoading, setUpgradeTimelineLoading] = useState(false);
  const [upgradeMetadataDownloading, setUpgradeMetadataDownloading] = useState(false);
  const [newcomerTrendingRows, setNewcomerTrendingRows] = useState<NewcomerTrendingProposal[]>([]);
  const [newcomerTrendingLoading, setNewcomerTrendingLoading] = useState(false);
  const defaultMonthYear = useMemo(() => {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  }, []);
  const [currentMonthYear, setCurrentMonthYear] = useState(defaultMonthYear);
  const [editorContribWindow, setEditorContribWindow] = useState<EditorContributionWindow>('all');
  const [editorContribFrom, setEditorContribFrom] = useState(monthRange(defaultMonthYear).fromInput);
  const [editorContribTo, setEditorContribTo] = useState(monthRange(defaultMonthYear).toInput);
  const [editorContributionRows, setEditorContributionRows] = useState<EditorContributionRow[]>([]);
  const [editorRepoDistributionRows, setEditorRepoDistributionRows] = useState<
    Array<{ actor: string; repo: string; count: number; pct: number }>
  >([]);
  const [editorContribLoading, setEditorContribLoading] = useState(false);
  const monthYearOptions = useMemo(() => {
    const options: Array<{ value: string; label: string }> = [];
    const cursor = new Date();
    cursor.setUTCDate(1);
    cursor.setUTCHours(0, 0, 0, 0);
    for (let i = 0; i < 18; i += 1) {
      const y = cursor.getUTCFullYear();
      const m = cursor.getUTCMonth() + 1;
      const value = `${y}-${String(m).padStart(2, '0')}`;
      options.push({ value, label: monthLabel(value) });
      cursor.setUTCMonth(cursor.getUTCMonth() - 1);
    }
    return options;
  }, []);

  useEffect(() => {
    setPage(1);
  }, [dimension, activeBucket, sortBy, sortDir, columnSearch]);


  useEffect(() => {
    setEditorQueuePage(1);
    setEditorCategoryPage(1);
    setSelectedBoardProcesses([]);
  }, [editorRepoFilter]);

  useEffect(() => {
    setDeveloperBoardPage(1);
  }, [developerRepoFilter]);

  useEffect(() => {
    setEditorQueuePage(1);
  }, [selectedBoardProcesses]);


  useEffect(() => {
    const { fromInput, toInput } = monthRange(currentMonthYear);
    setEditorContribFrom(fromInput);
    setEditorContribTo(toInput);
    if (editorContribWindow === 'month') {
    }
  }, [currentMonthYear, editorContribWindow]);




  useEffect(() => {
    let cancelled = false;

    (async () => {
      setDeveloperBoardLoading(true);
      try {
        const data = await client.tools.getOpenPRBoard({
          repo: developerRepoFilter || undefined,
          page: developerBoardPage,
          pageSize: 6,
        });
        if (!cancelled) {
          setDeveloperBoardRows(data.rows ?? []);
          setDeveloperBoardTotal(Number(data.total ?? 0));
          setDeveloperBoardTotalPages(Math.max(1, Number(data.totalPages ?? 1)));
        }
      } catch (err) {
        console.error('Failed to load developer board preview:', err);
      } finally {
        if (!cancelled) setDeveloperBoardLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [developerRepoFilter, developerBoardPage]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedColumnSearch(columnSearch);
    }, 250);
    return () => window.clearTimeout(t);
  }, [columnSearch]);


  // Clear sub-filters when dimension or bucket changes
  useEffect(() => {
    setActiveStatusFilter(null);
    setStatusSubDist([]);
    setActiveCategoryFilter(null);
    setCategorySubDist([]);
    setStageStatusSubDist([]);
    setShowSubFilter(true);
  }, [dimension, activeBucket]);

  // Apply activeStatusFilter to columnSearch.status (for category/repo/stages tabs)
  useEffect(() => {
    if (activeStatusFilter) {
      setColumnSearch((prev) => ({ ...prev, status: activeStatusFilter }));
    } else if (dimension === 'category' || dimension === 'repo' || dimension === 'stages') {
      setColumnSearch((prev) => ({ ...prev, status: '' }));
    }
  }, [activeStatusFilter, dimension]);

  // Apply activeCategoryFilter to columnSearch.category (for status tab)
  useEffect(() => {
    if (activeCategoryFilter) {
      setColumnSearch((prev) => ({ ...prev, category: activeCategoryFilter }));
    } else if (dimension === 'status') {
      setColumnSearch((prev) => ({ ...prev, category: '' }));
    }
  }, [activeCategoryFilter, dimension]);

  useEffect(() => {
    let cancelled = false;
    if (dimension === 'stages') {
      // Fetch stages distribution
      (async () => {
        setStagesDistributionLoading(true);
        try {
          const res = await client.standards.getStagesDistribution({});
          if (!cancelled) setStagesDistribution(res);
        } catch (err) {
          console.error('Failed to load stages distribution:', err);
        } finally {
          if (!cancelled) setStagesDistributionLoading(false);
        }
      })();
    } else {
      // Fetch regular distribution
      (async () => {
        setDistributionLoading(true);
        try {
          const distRes = await client.standards.getUnifiedDistribution({ dimension: dimension as 'status' | 'category' | 'repo', includeRips });
          if (!cancelled) setDistribution(distRes);
        } catch (err) {
          console.error('Failed to load homepage distribution:', err);
        } finally {
          if (!cancelled) setDistributionLoading(false);
        }
      })();
    }
    return () => {
      cancelled = true;
    };
  }, [dimension, includeRips]);

  // Fetch status sub-distribution when category/repo bucket is selected
  useEffect(() => {
    if ((dimension !== 'category' && dimension !== 'repo') || !activeBucket) {
      setStatusSubDist([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setStatusSubDistLoading(true);
      try {
        const res = await client.standards.getStatusSubDistribution({
          dimension: dimension as 'category' | 'repo',
          bucket: activeBucket,
        });
        if (!cancelled) setStatusSubDist(res);
      } catch (err) {
        console.error('Failed to load status sub-distribution:', err);
      } finally {
        if (!cancelled) setStatusSubDistLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [dimension, activeBucket]);

  // Fetch category sub-distribution when status bucket is selected
  useEffect(() => {
    if (dimension !== 'status' || !activeBucket) {
      setCategorySubDist([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setCategorySubDistLoading(true);
      try {
        const res = await client.standards.getCategorySubDistribution({
          status: activeBucket,
        });
        if (!cancelled) setCategorySubDist(res);
      } catch (err) {
        console.error('Failed to load category sub-distribution:', err);
      } finally {
        if (!cancelled) setCategorySubDistLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [dimension, activeBucket]);

  // Fetch status sub-distribution when stages bucket is selected
  useEffect(() => {
    if (dimension !== 'stages' || !activeBucket) {
      setStageStatusSubDist([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setStageStatusSubDistLoading(true);
      try {
        const res = await client.standards.getStageStatusSubDistribution({
          stage: activeBucket,
        });
        if (!cancelled) setStageStatusSubDist(res);
      } catch (err) {
        console.error('Failed to load stage status sub-distribution:', err);
      } finally {
        if (!cancelled) setStageStatusSubDistLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [dimension, activeBucket]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setTableLoading(true);
      try {
        if (dimension === 'stages') {
          // Use stages-specific endpoint
          const tableRes = await client.standards.getStageProposals({
            stage: activeBucket ?? undefined,
            page,
            pageSize: 10,
            sortBy: sortBy === 'github' ? 'eip' : sortBy,
            sortDir,
            columnSearch: {
              eip: debouncedColumnSearch.eip || undefined,
              github: debouncedColumnSearch.github || undefined,
              title: debouncedColumnSearch.title || undefined,
              author: debouncedColumnSearch.author || undefined,
              type: debouncedColumnSearch.type || undefined,
              status: debouncedColumnSearch.status || undefined,
              category: debouncedColumnSearch.category || undefined,
              updatedAt: debouncedColumnSearch.updatedAt || undefined,
              upgrade: debouncedColumnSearch.upgrade || undefined,
            },
          });
          if (!cancelled) {
            setTableData({ total: tableRes.total, totalPages: tableRes.totalPages, rows: tableRes.rows });
          }
        } else {
          // Use regular unified endpoint
          const tableRes = await client.standards.getUnifiedProposals({
            page,
            pageSize: 10,
            sortBy,
            sortDir,
            dimension: dimension as 'status' | 'category' | 'repo',
            bucket: activeBucket ?? undefined,
            includeRips,
            columnSearch: {
              github: debouncedColumnSearch.github || undefined,
              eip: debouncedColumnSearch.eip || undefined,
              title: debouncedColumnSearch.title || undefined,
              author: debouncedColumnSearch.author || undefined,
              type: debouncedColumnSearch.type || undefined,
              status: debouncedColumnSearch.status || undefined,
              category: debouncedColumnSearch.category || undefined,
              updatedAt: debouncedColumnSearch.updatedAt || undefined,
            },
          });
          if (!cancelled) {
            setTableData({ total: tableRes.total, totalPages: tableRes.totalPages, rows: tableRes.rows });
          }
        }
      } catch (err) {
        console.error('Failed to load homepage proposals table:', err);
      } finally {
        if (!cancelled) setTableLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dimension, page, sortBy, sortDir, activeBucket, debouncedColumnSearch, includeRips]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setWidgetsLoading(true);
      try {
        const [deltaRes, editorRes, recentRes, editorActivityRes, allActivityRes] = await Promise.all([
          client.standards.getMonthlyDelta({ monthYear: currentMonthYear }),
          client.analytics.getMonthlyEditorLeaderboard({ monthYear: currentMonthYear, limit: 50 }),
          client.analytics.getRecentChanges({ limit: 8 }),
          client.analytics.getRecentEditorActivity({ limit: 40, onlyOpenPRs: false }),
          client.analytics.getAllRecentActivity({ limit: 20 }),
        ]);
        if (!cancelled) {
          setFebDelta(deltaRes.items);
          setMonthlyDeltaUpdatedAt(deltaRes.updatedAt);
          const canonicalEditors = CANONICAL_EIP_EDITORS.filter(
            (editor) => !ASSOCIATE_EIP_EDITORS.includes(editor.toLowerCase() as typeof ASSOCIATE_EIP_EDITORS[number])
          );
          const byActor = new Map<string, HomepageEditorRow>();
          editorRes.items.forEach((item) => {
            const key = item.actor.toLowerCase();
            if (ASSOCIATE_EIP_EDITORS.includes(key as typeof ASSOCIATE_EIP_EDITORS[number])) return;
            byActor.set(key, {
              actor: item.actor,
              totalActions: item.totalActions,
              prsTouched: item.prsTouched,
            });
          });
          const merged = canonicalEditors.map((editor) => byActor.get(editor.toLowerCase()) ?? {
            actor: editor,
            totalActions: 0,
            prsTouched: 0,
          });
          merged.sort((a, b) => b.totalActions - a.totalActions || b.prsTouched - a.prsTouched || a.actor.localeCompare(b.actor));
          setFebEditors(merged);
          setMonthlyLeaderboardUpdatedAt(editorRes.updatedAt);
          setRecentChanges(recentRes as typeof recentChanges);
          setAllRecentActivity(allActivityRes as typeof allRecentActivity);
          const leaderboardEditorSet = new Set(merged.map((row) => row.actor.toLowerCase()));
          const matchedActivities = editorActivityRes.filter((item) =>
            leaderboardEditorSet.has(item.editor.toLowerCase())
          );
          setRecentEditorActivities(matchedActivities.slice(0, 8));
        }
      } catch (err) {
        console.error('Failed to load homepage widgets:', err);
      } finally {
        if (!cancelled) setWidgetsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentMonthYear]);


  const totalCount = useMemo(
    () => distribution.reduce((acc, row) => acc + row.count, 0),
    [distribution]
  );

  const maxCardCount = useMemo(
    () => Math.max(1, ...distribution.map((d) => d.count)),
    [distribution]
  );

  const febInsightPieData = useMemo(() => {
    const colorMap = isDark ? STATUS_COLORS_DARK : STATUS_COLORS_LIGHT;
    return febDelta
      .filter((d) => d.count > 0)
      .map((d) => ({
        name: d.status,
        value: d.count,
        fill: colorMap[d.status] || colorMap.Unknown,
      }))
      .sort((a, b) => b.value - a.value);
  }, [febDelta, isDark]);

  const monthlyEditorRows = useMemo(
    () => febEditors.slice(0, 10),
    [febEditors]
  );
  const monthlyInsightTotal = useMemo(
    () => febInsightPieData.reduce((sum, item) => sum + item.value, 0),
    [febInsightPieData]
  );
  const febInsightDonutOption = useMemo(() => ({
    tooltip: chartTooltip({
      trigger: 'item',
      formatter: (params: { name: string; value: number; percent: number; color?: string }) =>
        `<div style="font-weight:600;margin-bottom:4px;display:flex;align-items:center;gap:6px">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${params.color || '#94a3b8'}"></span>
          ${params.name}
        </div>
        <div style="display:flex;justify-content:space-between;gap:16px;font-size:12px">
          <span>Movements</span>
          <span style="font-weight:700">${params.value} (${params.percent}%)</span>
        </div>`,
    }),
    legend: { show: false },
    series: [
      {
        type: 'pie',
        radius: ['62%', '82%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: false,
        minAngle: 4,
        itemStyle: {
          borderRadius: 6,
          borderWidth: isDark ? 2 : 1.5,
          borderColor: isDark ? '#121316' : '#ffffff',
        },
        label: {
          show: true,
          position: 'center',
          formatter: () => `{total|${monthlyInsightTotal.toLocaleString()}}\n{label|Total}`,
          rich: {
            total: {
              fontSize: 24,
              fontWeight: 700,
              color: isDark ? '#f8fafc' : '#0f172a',
              lineHeight: 28,
              fontFamily: 'var(--font-plus-jakarta)',
            },
            label: {
              fontSize: 11,
              fontWeight: 600,
              color: isDark ? '#94a3b8' : '#64748b',
              lineHeight: 18,
              fontFamily: 'var(--font-plus-jakarta)',
            },
          },
        },
        emphasis: {
          scale: true,
          scaleSize: 6,
          label: {
            show: true,
            formatter: (params: { name: string; value: number }) =>
              `{name|${params.name}}\n{val|${params.value}}`,
            rich: {
              name: {
                fontSize: 11,
                fontWeight: 600,
                color: isDark ? '#94a3b8' : '#64748b',
                lineHeight: 16,
                fontFamily: 'var(--font-plus-jakarta)',
              },
              val: {
                fontSize: 22,
                fontWeight: 700,
                color: isDark ? '#f8fafc' : '#0f172a',
                lineHeight: 26,
                fontFamily: 'var(--font-plus-jakarta)',
              },
            },
          },
        },
        data: febInsightPieData.map((d) => ({
          name: d.name,
          value: d.value,
          itemStyle: { color: d.fill },
        })),
      },
    ],
  }), [febInsightPieData, isDark, monthlyInsightTotal]);

  const maxEditor = useMemo(
    () => Math.max(1, ...monthlyEditorRows.map((e) => e.totalActions)),
    [monthlyEditorRows]
  );
  const editorContributionWindowLabel = useMemo(() => {
    if (editorContribWindow === 'all') return 'All-Time Contributions';
    if (editorContribWindow === 'custom') {
      return `${editorContribFrom || 'Start'} → ${editorContribTo || 'Now'}`;
    }
    return monthLabel(currentMonthYear);
  }, [editorContribWindow, editorContribFrom, editorContribTo, currentMonthYear]);
  const editorRepoBreakdownOption = useMemo(() => {
    const topActors = editorContributionRows.slice(0, 8).map((row) => row.actor);
    const repoAliases = (repo: string) => {
      const short = repo.includes('/') ? repo.split('/').pop() || repo : repo;
      return short.toLowerCase();
    };
    const bucketed = new Map<string, { eips: number; ercs: number; rips: number }>();
    topActors.forEach((actor) => {
      bucketed.set(actor, { eips: 0, ercs: 0, rips: 0 });
    });
    editorRepoDistributionRows.forEach((row) => {
      const actor = topActors.find((name) => name.toLowerCase() === row.actor.toLowerCase());
      if (!actor) return;
      const bucket = bucketed.get(actor);
      if (!bucket) return;
      const repo = repoAliases(row.repo);
      if (repo === 'eips') bucket.eips += row.count;
      else if (repo === 'ercs') bucket.ercs += row.count;
      else if (repo === 'rips') bucket.rips += row.count;
    });
    const eipsSeries = topActors.map((actor) => bucketed.get(actor)?.eips ?? 0);
    const ercsSeries = topActors.map((actor) => bucketed.get(actor)?.ercs ?? 0);
    const ripsSeries = topActors.map((actor) => bucketed.get(actor)?.rips ?? 0);
    const totals = topActors.map((actor) => {
      const b = bucketed.get(actor);
      return (b?.eips ?? 0) + (b?.ercs ?? 0) + (b?.rips ?? 0);
    });

    return {
      tooltip: chartTooltip({
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: Array<{ seriesName: string; value: number; marker: string; axisValue: string }>) => {
          if (!params?.length) return '';
          const actor = params[0]?.axisValue ?? '';
          const avatar = editorAvatar(actor);
          const lines = params
            .filter((entry) => ['EIPs', 'ERCs', 'RIPs'].includes(entry.seriesName))
            .map((entry) => `${entry.marker} ${entry.seriesName}: ${Number(entry.value ?? 0).toLocaleString()}`);
          const total = params
            .filter((entry) => ['EIPs', 'ERCs', 'RIPs'].includes(entry.seriesName))
            .reduce((sum, entry) => sum + Number(entry.value ?? 0), 0);
          const header = `
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
              <img src="${avatar}" alt="${actor}" width="22" height="22" style="width:22px;height:22px;border-radius:999px;border:1px solid rgba(148,163,184,0.35);" />
              <strong>${actor}</strong>
            </div>
          `;
          return [header, ...lines, `<strong>Total: ${total.toLocaleString()}</strong>`].join('<br/>');
        },
      }),
      legend: {
        top: 0,
        textStyle: { color: isDark ? '#cbd5e1' : '#475569', fontSize: 11 },
      },
      grid: { left: 70, right: 10, top: 28, bottom: 12, containLabel: true },
      xAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: isDark ? 'rgba(148,163,184,0.14)' : 'rgba(148,163,184,0.24)' } },
        axisLabel: { color: isDark ? '#94a3b8' : '#64748b', fontSize: 11 },
      },
      yAxis: {
        type: 'category',
        data: topActors,
        inverse: true,
        axisLabel: { color: isDark ? '#cbd5e1' : '#334155', fontSize: 11 },
        axisTick: { show: false },
      },
      series: [
        { name: 'EIPs', type: 'bar', stack: 'repo', data: eipsSeries, itemStyle: { color: '#10b981' }, barMaxWidth: 12 },
        { name: 'ERCs', type: 'bar', stack: 'repo', data: ercsSeries, itemStyle: { color: '#60a5fa' }, barMaxWidth: 12 },
        { name: 'RIPs', type: 'bar', stack: 'repo', data: ripsSeries, itemStyle: { color: '#a78bfa' }, barMaxWidth: 12 },
        {
          type: 'scatter',
          symbolSize: 1,
          silent: true,
          data: topActors.map((actor, index) => [totals[index], actor]),
          tooltip: { show: false },
          label: {
            show: true,
            position: 'right',
            offset: [4, 0],
            color: isDark ? '#e2e8f0' : '#0f172a',
            fontSize: 11,
            formatter: (params: { value: [number, string] }) => Number(params.value?.[0] ?? 0).toLocaleString(),
          },
          itemStyle: { color: 'transparent' },
          emphasis: { disabled: true },
        },
      ],
    };
  }, [editorContributionRows, editorRepoDistributionRows, isDark]);
  const showDistributionSkeleton = distributionLoading && distribution.length === 0;
  const showTableSkeleton = tableLoading && !tableData;
  const showInsightSkeleton = widgetsLoading && febDelta.length === 0;
  const showEditorSkeleton = widgetsLoading && febEditors.length === 0;

  const toggleSort = (field: SortBy) => {
    if (sortBy === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(field);
    setSortDir('desc');
  };

  const inferGithubFilterFromProposalId = (raw: string): string | null => {
    const match = raw.trim().match(/^(eip|erc|rip|rrc)[-\s]*\d+$/i);
    if (!match) return null;
    const prefix = match[1].toUpperCase();
    if (prefix === 'EIP') return '/EIPs';
    if (prefix === 'ERC') return '/ERCs';
    return '/RIPs';
  };

  const stripEipPrefix = (raw: string): string => {
    // Strip prefixes like "EIP-", "EIP ", "ERC-", "RIP-" etc. to get just the number
    const match = raw.trim().match(/^(?:eip|erc|rip|rrc)[-\s]*(.+)$/i);
    return match ? match[1].trim() : raw.trim();
  };

  const handleColumnSearch = (key: keyof ColumnSearch, value: string) => {
    if (key === 'github') {
      setAutoGithubFilter(false);
      setColumnSearch((prev) => ({ ...prev, [key]: value }));
      return;
    }

    if (key === 'eip') {
      setEipDisplayValue(value);
      const inferredGithub = inferGithubFilterFromProposalId(value);
      const strippedNumber = stripEipPrefix(value);
      setColumnSearch((prev) => {
        const next: ColumnSearch = { ...prev, eip: strippedNumber };
        if (inferredGithub) {
          next.github = inferredGithub;
          setAutoGithubFilter(true);
        } else if (!value.trim() && autoGithubFilter) {
          next.github = '';
          setAutoGithubFilter(false);
        }
        return next;
      });
      return;
    }

    setColumnSearch((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setActiveBucket(null);
    setEipDisplayValue('');
    setColumnSearch({
      github: '',
      eip: '',
      title: '',
      author: '',
      type: '',
      status: '',
      category: '',
      updatedAt: '',
      upgrade: '',
    });
    setAutoGithubFilter(false);
    setActiveStatusFilter(null);
    setActiveCategoryFilter(null);
  };

  const downloadDetailedCSV = async () => {
    try {
      setDownloading(true);
      const csvDimension = dimension === 'stages' ? 'status' : dimension;
      const res = await client.standards.exportUnifiedDetailedCSV({
        dimension: csvDimension,
        bucket: activeBucket ?? undefined,
        includeRips,
        search: undefined,
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

  const downloadMonthlyInsightCSV = async () => {
    try {
      setDownloading(true);
      const res = await client.standards.exportMonthlyDeltaDetailedCSV({
        monthYear: currentMonthYear,
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
      console.error('Failed to export monthly delta CSV:', err);
    } finally {
      setDownloading(false);
    }
  };

  const downloadLeaderboardDetailedCSV = async () => {
    try {
      setDownloadingLeaderboard(true);
      const res = await client.analytics.exportMonthlyEditorLeaderboardDetailedCSV({
        monthYear: currentMonthYear,
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
  const csvEscape = (value: string | number): string => {
    const raw = String(value ?? '');
    if (/[",\n]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
    return raw;
  };
  const downloadUpgradeMetadataCSV = async () => {
    if (!upgradeTimelineRows.length) return;
    try {
      setUpgradeMetadataDownloading(true);
      const selectedUpgradeLabel = upgradeOptions.find((opt) => opt.slug === upgradeWatchSlug)?.label ?? upgradeWatchSlug;
      const categoryColumns = ['Core', 'Networking', 'Informational', 'Meta'] as const;
      const stageRows = [
        { key: 'scheduled', label: 'SFI' },
        { key: 'considered', label: 'CFI' },
        { key: 'proposed', label: 'PFI' },
      ] as const;

      const normalizeCategory = (value: string | null | undefined): (typeof categoryColumns)[number] | null => {
        const normalized = String(value ?? '').trim().toLowerCase();
        if (!normalized) return null;
        if (normalized === 'core') return 'Core';
        if (normalized === 'networking') return 'Networking';
        if (normalized === 'informational') return 'Informational';
        if (normalized === 'meta') return 'Meta';
        return null;
      };

      const parseEipNumber = (value: string): number | null => {
        const normalized = String(value ?? '').trim().replace(/^EIP[-\s]*/i, '');
        const number = Number(normalized);
        return Number.isFinite(number) ? number : null;
      };

      const rowsByMonth = new Map<string, UpgradeTimelineRow>();
      [...upgradeTimelineRows]
        .sort((a, b) => a.date.localeCompare(b.date))
        .forEach((row) => {
          const month = row.date.slice(0, 7);
          rowsByMonth.set(month, row);
        });

      const monthRows = Array.from(rowsByMonth.entries()).sort((a, b) => b[0].localeCompare(a[0]));
      const numbersToResolve = new Set<number>();
      monthRows.forEach(([, row]) => {
        stageRows.forEach((stage) => {
          (row[stage.key] ?? []).forEach((value) => {
            const number = parseEipNumber(value);
            if (number !== null) numbersToResolve.add(number);
          });
        });
      });

      const proposalMeta = new Map<number, { prefix: 'EIP' | 'RIP'; path: string; category: (typeof categoryColumns)[number] | null }>();
      await Promise.all(
        Array.from(numbersToResolve).map(async (number) => {
          try {
            const proposal = await client.proposals.getProposal({ repo: 'eip', number });
            proposalMeta.set(number, {
              prefix: 'EIP',
              path: `/eip/${number}`,
              category: normalizeCategory((proposal as { category?: string | null }).category),
            });
            return;
          } catch {
            // Fallback to RIP if number is not available in EIP repo.
          }

          try {
            const proposal = await client.proposals.getProposal({ repo: 'rip', number });
            proposalMeta.set(number, {
              prefix: 'RIP',
              path: `/rip/${number}`,
              category: normalizeCategory((proposal as { category?: string | null }).category),
            });
          } catch {
            proposalMeta.set(number, {
              prefix: 'EIP',
              path: `/eip/${number}`,
              category: null,
            });
          }
        }),
      );

      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const header = [
        'upgrade_slug',
        'upgrade_label',
        'month',
        'status',
        'core',
        'networking',
        'informational',
        'meta',
        'total_count',
      ];

      const rows = monthRows.flatMap(([month, row]) =>
        stageRows.map((stage) => {
          const byCategory: Record<(typeof categoryColumns)[number], string[]> = {
            Core: [],
            Networking: [],
            Informational: [],
            Meta: [],
          };

          (row[stage.key] ?? []).forEach((value) => {
            const number = parseEipNumber(value);
            if (number === null) return;
            const meta = proposalMeta.get(number);
            const category = meta?.category;
            if (!category) return;
            const prefix = meta?.prefix ?? 'EIP';
            const path = meta?.path ?? `/eip/${number}`;
            byCategory[category].push(`${prefix}-${number} (${origin}${path})`);
          });

          categoryColumns.forEach((category) => {
            byCategory[category].sort((a, b) => {
              const numA = Number(a.match(/-(\d+)/)?.[1] ?? 0);
              const numB = Number(b.match(/-(\d+)/)?.[1] ?? 0);
              return numA - numB;
            });
          });

          const total = categoryColumns.reduce((sum, category) => sum + byCategory[category].length, 0);

          return [
            upgradeWatchSlug,
            selectedUpgradeLabel,
            month,
            stage.label,
            byCategory.Core.length ? `${byCategory.Core.join(' | ')} (${byCategory.Core.length})` : '(0)',
            byCategory.Networking.length ? `${byCategory.Networking.join(' | ')} (${byCategory.Networking.length})` : '(0)',
            byCategory.Informational.length ? `${byCategory.Informational.join(' | ')} (${byCategory.Informational.length})` : '(0)',
            byCategory.Meta.length ? `${byCategory.Meta.join(' | ')} (${byCategory.Meta.length})` : '(0)',
            total,
          ];
        }),
      );

      const csv = [header, ...rows]
        .map((line) => line.map((v) => csvEscape(v as string | number)).join(','))
        .join('\n');

      const stamp = new Date().toISOString().slice(0, 10);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `upgrade-watch-metadata-${upgradeWatchSlug}-${stamp}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export upgrade watch metadata CSV:', err);
    } finally {
      setUpgradeMetadataDownloading(false);
    }
  };

  const sectionTitleClass =
    'dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl';
  const sectionSubtitleClass =
    'mt-1 text-sm leading-relaxed text-muted-foreground';
  const panelTitleClass =
    'text-base font-semibold tracking-tight text-foreground sm:text-lg';
  const normalizedProcessRows = useMemo(
    () => processBreakdownRows.filter((row) => row.count > 0),
    [processBreakdownRows],
  );
  const normalizedParticipantRows = useMemo(
    () => participantBreakdownRows.filter((row) => row.count > 0),
    [participantBreakdownRows],
  );
  const orderedBoardProcessTypes = useMemo(() => {
    const all = (boardProcessStats ?? []).map((item) => item.type);
    const sorted = BOARD_PROCESS_ORDER.filter((type) => all.includes(type));
    const rest = all.filter((type) => !BOARD_PROCESS_ORDER.includes(type));
    return [...sorted, ...rest];
  }, [boardProcessStats]);
  const editorCategoryPageSize = 6;
  const editorCategoryTotalPages = useMemo(
    () => Math.max(1, Math.ceil(normalizedParticipantRows.length / editorCategoryPageSize)),
    [normalizedParticipantRows.length],
  );
  const paginatedParticipantRows = useMemo(() => {
    const start = (editorCategoryPage - 1) * editorCategoryPageSize;
    return normalizedParticipantRows.slice(start, start + editorCategoryPageSize);
  }, [normalizedParticipantRows, editorCategoryPage]);
  const stackedCrossTabRows = useMemo(() => {
    if (!normalizedProcessRows.length || !paginatedParticipantRows.length) return [];
    const procTotal = normalizedProcessRows.reduce((sum, row) => sum + row.count, 0);
    if (procTotal === 0) return [];
    return paginatedParticipantRows.map((participant) => {
      const row: Record<string, number | string> = { participant: participant.label };
      normalizedProcessRows.forEach((processRow) => {
        const share = processRow.count / procTotal;
        row[processRow.category] = Math.round(participant.count * share);
      });
      return row;
    });
  }, [normalizedProcessRows, paginatedParticipantRows]);
  const categoryBreakdownChartOption = useMemo(() => {
    if (!stackedCrossTabRows.length) return null;
    const participants = stackedCrossTabRows.map((row) => String(row.participant));
    return {
      animationDuration: 450,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'line',
          lineStyle: {
            color: isDark ? 'rgba(148, 163, 184, 0.4)' : 'rgba(100, 116, 139, 0.4)',
            type: 'dashed',
            width: 1.5,
          },
        },
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)',
        borderColor: isDark ? 'rgba(148, 163, 184, 0.3)' : 'rgba(148, 163, 184, 0.4)',
        borderWidth: 1,
        padding: [10, 14],
        textStyle: { color: isDark ? '#f8fafc' : '#0f172a', fontSize: 12 },
        extraCssText:
          'border-style: dotted !important; box-shadow: 0 12px 32px rgba(0,0,0,0.35); border-radius: 12px; backdrop-filter: blur(16px); min-width: 170px;',
        formatter: (params: unknown) => {
          const items = Array.isArray(params) ? (params as any[]) : [];
          if (!items.length) return '';
          const name = items[0].axisValue;
          let html = `<div style="font-weight:700;font-size:12px;margin-bottom:6px;color:${isDark ? '#f8fafc' : '#0f172a'}">${name}</div>`;
          let total = 0;
          for (const item of items) {
            const val = item.value || 0;
            if (val === 0) continue;
            total += val;
            html += `<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;font-size:11px;margin-top:4px"><span style="display:inline-flex;align-items:center;gap:6px"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:${item.color}"></span><span style="color:${isDark ? '#cbd5e1' : '#475569'}">${item.seriesName}</span></span><span style="font-weight:700;color:${isDark ? '#f8fafc' : '#0f172a'}">${val}</span></div>`;
          }
          html += `<div style="margin-top:8px;padding-top:6px;border-top:1px dashed ${isDark ? 'rgba(148,163,184,0.25)' : 'rgba(148,163,184,0.35)'};display:flex;align-items:center;justify-content:space-between;font-size:11px"><span style="color:${isDark ? '#94a3b8' : '#64748b'};font-weight:600">Total PRs</span><span style="font-weight:800;color:${isDark ? '#f8fafc' : '#0f172a'}">${total}</span></div>`;
          return html;
        },
      },
      legend: {
        top: 0,
        textStyle: { color: isDark ? '#94a3b8' : '#64748b', fontSize: 11 },
      },
      grid: { top: 34, left: 56, right: 16, bottom: 24 },
      xAxis: {
        type: 'category',
        data: participants,
        axisLabel: { color: isDark ? '#94a3b8' : '#64748b', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { color: isDark ? '#94a3b8' : '#64748b' },
        splitLine: { lineStyle: { color: isDark ? 'rgba(148,163,184,0.14)' : 'rgba(148,163,184,0.2)', type: 'dashed' } },
      },
      series: normalizedProcessRows.map((processRow) => ({
        name: processRow.category,
        type: 'bar',
        stack: 'total',
        data: stackedCrossTabRows.map((row) => Number(row[processRow.category] || 0)),
        itemStyle: {
          color: PROCESS_STACK_COLORS[processRow.category] || '#94a3b8',
          borderRadius: [2, 2, 0, 0],
        },
      })),
    };
  }, [stackedCrossTabRows, normalizedProcessRows, isDark]);
  const upgradeOptions = useMemo(
    () => [
      { slug: 'glamsterdam', label: 'Glamsterdam' },
      { slug: 'hegota', label: 'Hegota' },
      { slug: 'fusaka', label: 'Fusaka' },
      { slug: 'pectra', label: 'Pectra' },
    ],
    [],
  );
  const latestUpgradeSnapshot = useMemo(
    () => (upgradeTimelineRows.length > 0 ? upgradeTimelineRows[upgradeTimelineRows.length - 1] : null),
    [upgradeTimelineRows],
  );
  const upgradeWatchChartOption = useMemo(() => {
    if (!upgradeTimelineRows.length) return null;

    const timelineDates = upgradeTimelineRows.map((row) => row.date);
    const seriesConfig = [
      { key: 'included', label: 'Included', color: '#10b981' },
      { key: 'scheduled', label: 'SFI', color: '#06b6d4' },
      { key: 'considered', label: 'CFI', color: '#f59e0b' },
      { key: 'proposed', label: 'PFI', color: '#3b82f6' },
      { key: 'declined', label: 'DFI', color: '#ef4444' },
    ] as const;

    return {
      grid: { left: 16, right: 16, top: 32, bottom: 10, containLabel: true },
      tooltip: chartTooltip({
        trigger: 'axis',
        axisPointer: {
          type: 'line',
          lineStyle: { color: 'var(--border)', type: 'dashed', width: 1.5 },
        },
        formatter: (params: unknown) => {
          const items = Array.isArray(params) ? (params as any[]) : [];
          if (!items.length) return '';

          let html = chartTooltipTitle(items[0].axisValue);
          let total = 0;
          for (const item of items) {
            const val = item.value || 0;
            if (val === 0) continue;
            total += val;
            html += chartTooltipRow(item.seriesName, val, item.color);
          }
          html +=
            `<div style="margin-top:8px;padding-top:6px;border-top:1px solid ${CHART_TOOLTIP_BORDER}">` +
            chartTooltipRow('Total EIPs', total) +
            `</div>`;
          return html;
        },
      }, { minWidth: 172 }),
      legend: {
        top: 0,
        right: 0,
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { color: isDark ? '#94a3b8' : '#64748b', fontSize: 10 },
      },
      xAxis: {
        type: 'category',
        data: timelineDates,
        boundaryGap: false,
        axisLabel: {
          color: isDark ? '#94a3b8' : '#64748b',
          fontSize: 10,
          hideOverlap: true,
          rotate: 0,
          interval: (index: number) => index % 2 === 0,
          formatter: (value: string) => value,
        },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { color: isDark ? '#94a3b8' : '#64748b', fontSize: 10 },
        splitLine: { lineStyle: { color: isDark ? 'rgba(148,163,184,0.14)' : 'rgba(148,163,184,0.2)', type: 'dashed' } },
      },
      series: seriesConfig.map((series) => ({
        name: series.label,
        type: 'bar',
        stack: 'total',
        barMaxWidth: 16,
        emphasis: { focus: 'series' },
        itemStyle: { color: series.color, borderRadius: [2, 2, 0, 0] },
        data: upgradeTimelineRows.map((row) => {
          const values = row[series.key] as string[];
          return values.length;
        }),
      })),
    };
  }, [upgradeTimelineRows, isDark]);
  const hasColumnFilters = useMemo(
    () => Object.values(columnSearch).some((value) => value.trim().length > 0),
    [columnSearch]
  );
  useEffect(() => {
    if (editorQueuePage > boardPreviewTotalPages) {
      setEditorQueuePage(boardPreviewTotalPages);
    }
  }, [editorQueuePage, boardPreviewTotalPages]);
  useEffect(() => {
    if (editorCategoryPage > editorCategoryTotalPages) {
      setEditorCategoryPage(editorCategoryTotalPages);
    }
  }, [editorCategoryPage, editorCategoryTotalPages]);
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setUpgradeTimelineLoading(true);
      try {
        const canonicalTimeline = getUpgradeTimelineData(upgradeWatchSlug);
        if (canonicalTimeline && canonicalTimeline.length > 0) {
          if (!cancelled) {
            setUpgradeTimelineRows(
              normalizeUpgradeTimelineRows(
                canonicalTimeline.map((item) => ({
                  date: item.date,
                  included: item.included,
                  scheduled: item.scheduled,
                  declined: item.declined,
                  considered: item.considered,
                  proposed: item.proposed,
                }))
              )
            );
          }
          return;
        }

        const timeline = await client.upgrades.getUpgradeTimeline({ slug: upgradeWatchSlug });
        if (!cancelled) {
          setUpgradeTimelineRows(normalizeUpgradeTimelineRows(timeline as UpgradeTimelineRow[]));
        }
      } catch (err) {
        console.error('Failed to load developer upgrade watch timeline:', err);
        if (!cancelled) setUpgradeTimelineRows([]);
      } finally {
        if (!cancelled) setUpgradeTimelineLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [upgradeWatchSlug]);
  const isTableFiltered = hasColumnFilters || activeBucket !== null;

  return (
    <div data-ledger className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="wrap space-y-16 sm:space-y-20 pt-6 sm:pt-10 pb-4">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <HomeHeroSection />
        </motion.div>

        <UpgradeWatchSection
          sectionTitleClass={sectionTitleClass}
          sectionSubtitleClass={sectionSubtitleClass}
          upgradeWatchSlug={upgradeWatchSlug}
          setUpgradeWatchSlug={setUpgradeWatchSlug}
          upgradeOptions={upgradeOptions}
          upgradeTimelineLoading={upgradeTimelineLoading}
          upgradeTimelineRows={upgradeTimelineRows}
          upgradeWatchChartOption={upgradeWatchChartOption}
          latestCounts={{
            included: latestUpgradeSnapshot?.included.length ?? 0,
            scheduled: latestUpgradeSnapshot?.scheduled.length ?? 0,
            considered: latestUpgradeSnapshot?.considered.length ?? 0,
            proposed: latestUpgradeSnapshot?.proposed.length ?? 0,
            declined: latestUpgradeSnapshot?.declined.length ?? 0,
          }}
          onDownloadMetadata={downloadUpgradeMetadataCSV}
          downloadMetadataLoading={upgradeMetadataDownloading}
        />

        <section className="mb-6 pt-2" id="trending">
          <SectionHead
            index="02"
            eyebrow="Community momentum"
            title="Trending Proposals"
            description="Most discussed proposals shaping Ethereum today."
            action={
              <Link
                href="/explore/trending"
                className="btn btn-outline h-8 px-3 text-xs font-sans font-medium gap-1.5 hover:border-[var(--ink)]"
              >
                <span>Explore Trending</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-[var(--ink-faint)]" />
              </Link>
            }
          />
          <TrendingProposals hideHeader />
        </section>

        <section className="mb-6 pt-2" id="board">
          <SectionHead
            index="03"
            eyebrow="Cross-repository triage"
            title="Editorial PR Queue"
            description="Live queue of open pull requests across all standards repositories (EIPs, ERCs, and RIPs) — triaged by workflow stage and whether the next action is waiting on author revision or editor review."
            action={
              <div className="flex items-center gap-2">
                <select
                  aria-label="Repository filter"
                  value={developerRepoFilter}
                  onChange={(e) => setDeveloperRepoFilter(e.target.value as DeveloperRepoFilter)}
                  className="h-8 rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface)] pl-3 pr-8 text-xs font-sans font-medium text-[var(--ink)] transition-colors hover:border-[var(--ink-muted)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--brand)] cursor-pointer"
                >
                  <option value="eips">EIPs</option>
                  <option value="ercs">ERCs</option>
                  <option value="rips">RIPs</option>
                  <option value="">All Repositories</option>
                </select>
                <Link
                  href="/officehours/board"
                  className="btn btn-outline h-8 px-3 text-xs font-sans font-medium gap-1.5 hover:border-[var(--ink)]"
                >
                  <span>Full Queue</span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-[var(--ink-faint)]" />
                </Link>
              </div>
            }
          />
          <div className="card overflow-hidden">
            <div className="hidden md:block">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b border-border/70 bg-muted/40 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="w-20 px-3 py-2">PR</th>
                    <th className="px-3 py-2">Title</th>
                    <th className="w-28 px-3 py-2">Author</th>
                    <th className="w-24 px-3 py-2">Wait Time</th>
                    <th className="w-28 px-3 py-2">Process</th>
                    <th className="w-40 px-3 py-2">Waiting On</th>
                  </tr>
                </thead>
                <tbody>
                  {developerBoardLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={`dev-board-skeleton-${i}`} className="border-b border-border/60">
                        <td colSpan={6} className="px-3 py-2.5">
                          <div className="h-4 animate-pulse rounded bg-muted" />
                        </td>
                      </tr>
                    ))
                  ) : developerBoardRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">
                        No open PR rows found for this filter.
                      </td>
                    </tr>
                  ) : (
                    developerBoardRows.map((row) => {
                      const p = waitPriority(row.waitDays);
                      const stateTone = DEV_BOARD_GOVSTATE_BADGES[row.govState] || DEV_BOARD_GOVSTATE_BADGES.Uncategorized;
                      return (
                      <tr key={`dev-board-${row.repoShort}-${row.prNumber}`} className="group border-b border-border/60 transition-colors even:bg-muted/20 hover:bg-primary/[0.04]">
                        <td className="px-3 py-2">
                          <a href={`https://github.com/${row.repo}/pull/${row.prNumber}`} target="_blank" rel="noopener noreferrer" className="font-mono font-semibold text-primary underline-offset-2 hover:underline">#{row.prNumber}</a>
                        </td>
                        <td className="max-w-0 px-3 py-2">
                          <a href={`https://github.com/${row.repo}/pull/${row.prNumber}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-foreground transition-colors hover:text-primary" title={row.title || `PR #${row.prNumber}`}>
                            <span className="truncate leading-snug">{row.title || `PR #${row.prNumber}`}</span>
                            <ExternalLink className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-50" />
                          </a>
                          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{fmtBoardDate(row.createdAt)} · {row.repoShort.toUpperCase()}</p>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{row.author || '—'}</td>
                        <td className="px-3 py-2">
                          <span className={cn('inline-flex items-center gap-1 text-[11px] font-medium', p.color)}>
                            <p.Icon className="h-3 w-3" />
                            {fmtWaitCompact(row.waitDays)}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className={cn('whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-medium', BOARD_PROCESS_BADGES[row.processType] || BOARD_PROCESS_BADGES.Misc)}>
                            {row.processType || 'Misc'}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className={cn('whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-medium', stateTone)}>
                            {row.govState || 'Uncategorized'}
                          </span>
                        </td>
                      </tr>
                    )})
                  )}
                </tbody>
              </table>
            </div>
            <div className="space-y-2 p-2 md:hidden">
              {developerBoardLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={`dev-board-mobile-skeleton-${i}`} className="h-16 animate-pulse rounded-lg bg-muted" />
                ))
              ) : developerBoardRows.length === 0 ? (
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-6 text-center text-sm text-muted-foreground">
                  No open PR rows found for this filter.
                </div>
              ) : (
                developerBoardRows.map((row) => (
                  <div key={`dev-board-mobile-${row.repoShort}-${row.prNumber}`} className="rounded-lg border border-border bg-card/70 p-2.5">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <a
                        href={`/pr/${githubRepoFromShort(row.repoShort)}/${row.prNumber}`}
                        className="text-sm font-semibold text-primary hover:underline"
                      >
                        #{row.prNumber}
                      </a>
                      <span className="text-[11px] text-muted-foreground">{row.repoShort.toUpperCase()}</span>
                    </div>
                    <p className="line-clamp-2 text-sm text-foreground">{row.title || `PR #${row.prNumber}`}</p>
                    <div className="mt-1.5 text-[11px] text-muted-foreground">
                      {row.govState || '-'} • {Math.max(0, Number(row.waitDays || 0))}d wait
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex items-center justify-between border-t border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <span>Total Open PRs: {developerBoardTotal.toLocaleString()}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDeveloperBoardPage((prev) => Math.max(1, prev - 1))}
                  disabled={developerBoardPage <= 1}
                  className="rounded-md border border-border bg-muted/60 px-2 py-1 disabled:opacity-40"
                >
                  Prev
                </button>
                <span>Page {developerBoardPage} / {developerBoardTotalPages}</span>
                <button
                  type="button"
                  onClick={() => setDeveloperBoardPage((prev) => Math.min(developerBoardTotalPages, prev + 1))}
                  disabled={developerBoardPage >= developerBoardTotalPages}
                  className="rounded-md border border-border bg-muted/60 px-2 py-1 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </section>

      <section className="mb-6 pt-2" id="over-time">
        <SectionHead
          index="04"
          eyebrow="Historical trajectory"
          title="Governance Over Time"
          description="Track proposal lifecycle movement and volume across the network timeline."
        />
        <GovernanceOverTime />
      </section>

      <section className="pt-2" id="monthly">
        <SectionHead
          index="05"
          eyebrow="Monthly velocity & leadership"
          title="Monthly Standards Snapshot"
          description="Monthly status distribution and editor action leaderboard."
          action={
            <div className="flex items-center gap-2">
              <label htmlFor="homepage-month-select" className="text-xs font-mono text-[var(--ink-faint)]">
                Month
              </label>
              <select
                id="homepage-month-select"
                value={currentMonthYear}
                onChange={(e) => setCurrentMonthYear(e.target.value)}
                className="h-8 rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface)] pl-3 pr-8 text-xs font-sans font-medium text-[var(--ink)] transition-colors hover:border-[var(--ink-muted)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--brand)] cursor-pointer"
              >
                {monthYearOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          }
        />

        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <div
          className={cn(
            'card self-start p-4 flex flex-col',
            'h-[560px] sm:h-[620px]',
          )}
        >
          <div className="mb-3 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2">
                <Activity className="h-4 w-4 text-[var(--brand-strong)]" />
                <h3 className="t-h3 text-sm font-semibold">{monthLabel(currentMonthYear)} Insight</h3>
              </div>
              <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                Monthly status distribution and movements.
              </p>
            </div>
            <div className="inline-flex items-center gap-2">
              {/* View Switcher: Donut vs Bars */}
              <div className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] p-0.5 text-xs font-sans font-medium">
                <button
                  type="button"
                  onClick={() => setInsightView('donut')}
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-xs font-sans font-medium transition-all cursor-pointer',
                    insightView === 'donut'
                      ? 'bg-[var(--ink)] text-[var(--paper)] font-semibold shadow-xs'
                      : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                  )}
                >
                  Donut
                </button>
                <button
                  type="button"
                  onClick={() => setInsightView('bars')}
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-xs font-sans font-medium transition-all cursor-pointer',
                    insightView === 'bars'
                      ? 'bg-[var(--ink)] text-[var(--paper)] font-semibold shadow-xs'
                      : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                  )}
                >
                  Bars
                </button>
              </div>

              <Link
                href={`/insights/${currentMonthYear.split('-')[0]}/${parseInt(currentMonthYear.split('-')[1], 10)}`}
                className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--brand-strong)] hover:underline"
              >
                Analysis
                <ArrowRight className="h-3 w-3" />
              </Link>
              <button
                onClick={downloadMonthlyInsightCSV}
                disabled={downloading}
                aria-label="Download status changes CSV"
                title="Download status changes CSV"
                className="chip cursor-pointer h-7 px-2"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Hero KPI Stat & Multi-segment Proportional Strip */}
          {!showInsightSkeleton && febDelta.length > 0 && (
            <div className="mb-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-2xl font-bold font-mono tracking-tight text-[var(--ink)]">
                    {monthlyInsightTotal.toLocaleString()}
                  </span>
                  <span className="ml-2 text-xs font-sans text-[var(--ink-muted)]">
                    Total Status Movements
                  </span>
                </div>
                <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-0.5 font-mono text-[11px] text-[var(--ink-muted)]">
                  {febInsightPieData.length} {febInsightPieData.length === 1 ? 'status' : 'statuses'} active
                </span>
              </div>

              {/* Multi-segment proportional bar */}
              <div className="mt-2.5 flex h-2 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
                {febInsightPieData.map((d) => (
                  <div
                    key={`strip-${d.name}`}
                    style={{
                      width: `${(d.value / Math.max(1, monthlyInsightTotal)) * 100}%`,
                      backgroundColor: d.fill,
                    }}
                    title={`${d.name}: ${d.value} (${((d.value / Math.max(1, monthlyInsightTotal)) * 100).toFixed(1)}%)`}
                    className="h-full transition-all duration-300 first:rounded-l-full last:rounded-r-full"
                  />
                ))}
              </div>
            </div>
          )}

          <div className="relative mt-1 min-h-0 flex-1">
            {showInsightSkeleton ? (
              <div className="h-full w-full animate-pulse rounded bg-[var(--surface-3)]" />
            ) : febDelta.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <Activity className="h-8 w-8 text-[var(--ink-faint)]" />
                <div>
                  <p className="text-sm font-medium text-[var(--ink-muted)]">No status changes yet</p>
                  <p className="mt-1 text-xs text-[var(--ink-faint)]">
                    We&apos;ll populate this chart when transitions start in {monthLabel(currentMonthYear)}.
                  </p>
                </div>
              </div>
            ) : insightView === 'donut' ? (
              /* Donut View: Centered donut on left, perfectly aligned numbers on right */
              <div className="grid h-full grid-cols-1 items-center gap-3 sm:grid-cols-12">
                <div className="relative h-[220px] sm:h-full sm:col-span-6 flex items-center justify-center">
                  <ReactECharts
                    option={febInsightDonutOption}
                    style={{ height: '100%', width: '100%' }}
                    opts={{ renderer: 'svg' }}
                  />
                </div>

                <div className="sm:col-span-6 flex flex-col justify-center space-y-2 pr-1">
                  <div className="mb-1 flex items-center justify-between border-b border-[var(--border)] pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-faint)]">
                    <span>Status</span>
                    <div className="flex items-center gap-4">
                      <span>Count</span>
                      <span className="w-12 text-right">Share</span>
                    </div>
                  </div>
                  {febInsightPieData.map((item) => {
                    const percent = ((item.value / Math.max(1, monthlyInsightTotal)) * 100).toFixed(1);
                    return (
                      <div
                        key={`legend-${item.name}`}
                        className="group flex items-center justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] p-2 transition-colors hover:border-[var(--ink-muted)] hover:bg-[var(--surface-2)]"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: item.fill }}
                          />
                          <span className="truncate text-xs font-sans font-medium text-[var(--ink)]">
                            {item.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <span className="font-mono text-xs font-semibold tabular-nums text-[var(--ink)]">
                            {item.value}
                          </span>
                          <span className="w-12 text-right font-mono text-xs tabular-nums text-[var(--ink-muted)]">
                            {percent}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <ChartWatermark position="bottom-right" />
              </div>
            ) : (
              /* Bars View: Full-width ranked velocity progress cards */
              <div className="h-full space-y-2 overflow-y-auto pr-1">
                {febInsightPieData.map((item, idx) => {
                  const percent = ((item.value / Math.max(1, monthlyInsightTotal)) * 100).toFixed(1);
                  const maxCount = febInsightPieData[0]?.value || 1;
                  const barWidth = Math.max(6, (item.value / maxCount) * 100);
                  return (
                    <div
                      key={`bar-card-${item.name}`}
                      className={cn(
                        'rounded-lg border px-3 py-2.5 transition-colors',
                        idx === 0
                          ? 'border-[var(--border-strong)] bg-[var(--surface-2)]'
                          : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)]'
                      )}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: item.fill }}
                          />
                          <span className="text-xs font-sans font-semibold text-[var(--ink)]">
                            {item.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono text-xs font-semibold tabular-nums text-[var(--ink)]">
                            {item.value} <span className="text-[10px] font-normal text-[var(--ink-muted)]">movements</span>
                          </span>
                          <span className="font-mono text-xs font-medium tabular-nums text-[var(--ink-muted)]">
                            ({percent}%)
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${barWidth}%`,
                            backgroundColor: item.fill,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
                <ChartWatermark position="bottom-right" />
              </div>
            )}
          </div>

          <ChartFooter nextUpdateAt={monthlyDeltaUpdatedAt} />
        </div>

        <div
          className={cn(
            'card p-4 flex flex-col',
            'h-[560px] sm:h-[620px]',
          )}
        >
          <>
              <div className="mb-3 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-[var(--brand-strong)]" />
                    <h3 className="t-h3 text-sm font-semibold">Editor Leaderboard ({monthLabel(currentMonthYear)})</h3>
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                    Ranked by editor actions this month (open + closed PRs).
                  </p>
                </div>
                <div className="inline-flex items-center gap-2">
                  <Link
                    href="/analytics/editors"
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--brand-strong)] hover:underline"
                  >
                    Full Leaderboard
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                  <button
                    onClick={downloadLeaderboardDetailedCSV}
                    disabled={downloadingLeaderboard}
                    aria-label="Download editor leaderboard CSV"
                    title="Download editor leaderboard CSV"
                    className="chip cursor-pointer h-7 px-2"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-1 pr-2">
                {showEditorSkeleton
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <div key={`editor-skeleton-${i}`} className="rounded-lg border border-border p-2.5">
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
                  : monthlyEditorRows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                      <Trophy className="h-10 w-10 text-muted-foreground/40" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">No editor activity yet</p>
                        <p className="mt-1 text-xs text-muted-foreground/70">
                          Editor actions for {monthLabel(currentMonthYear)} will appear here as PRs are reviewed.
                        </p>
                      </div>
                    </div>
                  )
                  : monthlyEditorRows.map((row, idx) => (
                      <div
                        key={`editor-${row.actor}`}
                        className={`rounded-lg px-2.5 py-2.5 border ${idx === 0 ? 'bg-primary/10 border-primary/30' : 'bg-muted/40 border-border'}`}
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <div className="h-8 w-8 shrink-0 rounded-full bg-background/80 p-[1.5px] ring-1 ring-border">
                              <div className="h-full w-full overflow-hidden rounded-full">
                                <Image
                                  src={editorAvatar(row.actor)}
                                  alt={row.actor}
                                  width={32}
                                  height={32}
                                  className="h-full w-full object-cover object-center"
                                />
                              </div>
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">#{idx + 1} {row.actor}</p>
                              <p className="text-xs text-muted-foreground">{row.totalActions} actions across {row.prsTouched} PRs</p>
                            </div>
                          </div>
                          <span className="ml-2 min-w-[2.5ch] shrink-0 text-right text-sm leading-tight font-semibold tabular-nums text-primary">
                            {row.totalActions}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted/80">
                          <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${row.totalActions > 0 ? Math.max(8, (row.totalActions / maxEditor) * 100) : 0}%` }}
                          />
                        </div>
                      </div>
                    ))}
              </div>

              <ChartFooter nextUpdateAt={monthlyLeaderboardUpdatedAt} />
          </>
        </div>
      </div>
      </section>

      <section className="mb-8 pt-2" id="browse">
        <SectionHead
          index="06"
          eyebrow="Standards taxonomy & explorer"
          title="Browse by Standards Dimension"
          description="Filter proposals across status, category, repository, and hard fork upgrade stages."
          action={
            <div className="flex flex-wrap items-center gap-2">
              {/* Segmented dimension pill toggle: Status | Category | Repo | Stages */}
              <div className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface)] p-1 text-xs font-sans font-medium shadow-xs">
                {(['status', 'category', 'repo', 'stages'] as Dimension[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setActiveBucket(null);
                      setPage(1);
                      setDimension(d);
                    }}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-sans font-medium transition-all duration-150 cursor-pointer',
                      dimension === d
                        ? 'bg-[var(--ink)] text-[var(--paper)] font-semibold shadow-xs'
                        : 'text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)]'
                    )}
                  >
                    {d === 'repo' ? 'Repository' : d === 'stages' ? 'Stages' : d.charAt(0).toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </div>

              {/* Include RIPs toggle */}
              {dimension !== 'repo' && (
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-sans font-medium text-[var(--ink-muted)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)] select-none">
                  <input
                    type="checkbox"
                    checked={includeRips}
                    onChange={(e) => {
                      setActiveBucket(null);
                      setPage(1);
                      setIncludeRips(e.target.checked);
                    }}
                    className="h-3.5 w-3.5 rounded border-[var(--border)] bg-[var(--surface-2)] accent-[var(--brand)] focus:ring-0 cursor-pointer"
                  />
                  <span>Include RIPs</span>
                </label>
              )}

              {/* Full Explorer link button */}
              <Link
                href="/explore"
                className="btn btn-outline h-8 px-3 text-xs font-sans font-medium gap-1.5 hover:border-[var(--ink)]"
              >
                <span>Full Explorer</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-[var(--ink-faint)]" />
              </Link>
            </div>
          }
        />

      <div className="mb-4 grid grid-cols-1 gap-3 min-[520px]:grid-cols-2 lg:grid-cols-4">
        {(dimension === 'stages' ? stagesDistributionLoading : showDistributionSkeleton) ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div
              key={`dist-skeleton-${i}`}
              className="card p-3.5 shadow-none animate-pulse rounded-xl"
            >
              <div className="mb-2 h-7 w-7 rounded-lg bg-[var(--surface-2)]" />
              <div className="mb-1 h-3 w-20 rounded bg-[var(--surface-2)]" />
              <div className="mb-2 h-7 w-16 rounded bg-[var(--surface-2)]" />
              <div className="h-1.5 w-full rounded-full bg-[var(--surface-2)]" />
            </div>
          ))
        ) : (
          <>
        <button
          type="button"
          onClick={() => setActiveBucket(null)}
          className={cn(
            'group relative overflow-hidden rounded-xl border p-3.5 text-left transition-all duration-150 cursor-pointer',
            activeBucket === null
              ? 'border-[var(--brand)] bg-[var(--surface-2)] ring-1 ring-[var(--brand)] shadow-xs'
              : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--ink-muted)] hover:shadow-xs'
          )}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <div
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--brand-muted)] text-[var(--brand-strong)] transition-transform duration-150 group-hover:scale-105"
            >
              <Layers className="h-3.5 w-3.5" />
            </div>
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 font-mono text-[10px] font-medium text-[var(--ink-muted)]">
              100%
            </span>
          </div>
          <p className="truncate text-xs font-sans font-medium text-[var(--ink-muted)] group-hover:text-[var(--ink)] transition-colors">
            All Standards
          </p>
          <p className="mt-1 font-sans text-2xl font-bold tracking-tight text-[var(--ink)] tabular-nums sm:text-3xl">
            {dimension === 'stages'
              ? stagesDistribution.reduce((s, r) => s + r.count, 0).toLocaleString()
              : totalCount.toLocaleString()}
          </p>
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
            <div
              className="h-full rounded-full bg-[var(--brand-strong)] transition-all duration-300"
              style={{ width: '100%' }}
            />
          </div>
        </button>

        {(dimension === 'stages' ? stagesDistribution : distribution).map((row) => {
          const isStages = dimension === 'stages';
          const totalForDimension = isStages ? stagesDistribution.reduce((s, r) => s + r.count, 0) : totalCount;
          const maxForDimension = isStages ? Math.max(1, ...stagesDistribution.map((r) => r.count)) : maxCardCount;
          const pct = totalForDimension > 0 ? Math.round((row.count / totalForDimension) * 100) : 0;
          const selected = activeBucket === row.bucket;
          const color = getDimensionColor(dimension, row.bucket, isDark);
          const StageIcon = stageIconMap[row.bucket] ?? Layers;
          const StatusIcon = statusIconMap[row.bucket] ?? Layers;
          const CategoryIcon = categoryIconMap[row.bucket] ?? Layers;
          const RepoIcon = repoIconMap[row.bucket] ?? Layers;
          const Icon = isStages ? StageIcon : dimension === 'status' ? StatusIcon : dimension === 'category' ? CategoryIcon : RepoIcon;
          const displayLabel = isStages ? (STAGE_FULL_LABELS[row.bucket] || row.bucket) : row.bucket;

          return (
            <button
              type="button"
              key={row.bucket}
              onClick={() => setActiveBucket((prev) => (prev === row.bucket ? null : row.bucket))}
              className={cn(
                'group relative overflow-hidden rounded-xl border p-3.5 text-left transition-all duration-150 cursor-pointer',
                selected
                  ? 'border-[var(--brand)] bg-[var(--surface-2)] ring-1 ring-[var(--brand)] shadow-xs'
                  : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--ink-muted)] hover:shadow-xs'
              )}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg transition-transform duration-150 group-hover:scale-105"
                  style={{
                    backgroundColor: `${color}18`,
                    color: color,
                  }}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 font-mono text-[10px] font-medium text-[var(--ink-muted)] tabular-nums">
                  {pct}%
                </span>
              </div>

              <p className="truncate text-xs font-sans font-medium text-[var(--ink-muted)] group-hover:text-[var(--ink)] transition-colors">
                {displayLabel}
              </p>

              <p className="mt-1 font-sans text-2xl font-bold tracking-tight text-[var(--ink)] tabular-nums sm:text-3xl">
                {row.count.toLocaleString()}
              </p>

              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.max(6, (row.count / maxForDimension) * 100)}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </button>
          );
        })}
          </>
        )}
      </div>

      {/* Stages context note */}
      {dimension === 'stages' && !stagesDistributionLoading && stagesDistribution.length > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2 text-xs text-[var(--ink-muted)]">
          <Package className="h-3.5 w-3.5 shrink-0 text-[var(--brand-strong)]" />
          <span>
            Showing EIP inclusion stages across all active network upgrades including{' '}
            <Link href="/upgrade/glamsterdam" className="font-semibold text-[var(--ink)] hover:underline">
              Glamsterdam
            </Link>
            {' & '}
            <Link href="/upgrade/hegota" className="font-semibold text-[var(--ink)] hover:underline">
              Hegota
            </Link>
            .{' '}
            <Link href="/upgrade" className="text-[var(--brand-strong)] hover:underline">
              View all upgrades →
            </Link>
          </span>
        </div>
      )}

      {/* Sub-filter: status chips when category/repo bucket is selected */}
      <AnimatePresence>
        {(dimension === 'category' || dimension === 'repo') && activeBucket && statusSubDist.length > 0 && showSubFilter && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mb-3 overflow-hidden"
          >
            <div className="card px-3.5 py-2.5">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium text-[var(--ink-muted)]">
                  <Filter className="h-3.5 w-3.5" />
                  <span>Filter <span className="font-semibold text-[var(--ink)]">{activeBucket}</span> by Status</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSubFilter(false)}
                  className="text-xs text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer"
                  aria-label="Hide sub-filter"
                >
                  ×
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveStatusFilter(null)}
                  data-active={activeStatusFilter === null ? 'true' : undefined}
                  className="chip h-7 px-2.5 text-xs cursor-pointer"
                >
                  All ({statusSubDist.reduce((s, r) => s + r.count, 0).toLocaleString()})
                </button>
                {statusSubDist.map((row) => {
                  const active = activeStatusFilter === row.status;
                  return (
                    <button
                      key={row.status}
                      type="button"
                      onClick={() => setActiveStatusFilter(active ? null : row.status)}
                      data-active={active ? 'true' : undefined}
                      className="chip h-7 px-2.5 text-xs cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: `var(--c-${row.status.toLowerCase().replace(/\s+/g, '')}, var(--ink-muted))` }}
                      />
                      <span>{row.status}</span>
                      <span className="font-mono text-[10px] opacity-75">({row.count.toLocaleString()})</span>
                    </button>
                  );
                })}
              </div>
              {statusSubDistLoading && (
                <div className="mt-1.5 text-[10px] text-muted-foreground">Loading…</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sub-filter: category chips when status bucket is selected */}
      <AnimatePresence>
        {dimension === 'status' && activeBucket && categorySubDist.length > 0 && showSubFilter && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mb-3 overflow-hidden"
          >
            <div className="card px-3.5 py-2.5">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium text-[var(--ink-muted)]">
                  <Filter className="h-3.5 w-3.5" />
                  <span>Filter <span className="font-semibold text-[var(--ink)]">{activeBucket}</span> by Category</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSubFilter(false)}
                  className="text-xs text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer"
                  aria-label="Hide sub-filter"
                >
                  ×
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveCategoryFilter(null)}
                  data-active={activeCategoryFilter === null ? 'true' : undefined}
                  className="chip h-7 px-2.5 text-xs cursor-pointer"
                >
                  All ({categorySubDist.reduce((s, r) => s + r.count, 0).toLocaleString()})
                </button>
                {categorySubDist.map((row) => {
                  const active = activeCategoryFilter === row.category;
                  return (
                    <button
                      key={row.category}
                      type="button"
                      onClick={() => setActiveCategoryFilter(active ? null : row.category)}
                      data-active={active ? 'true' : undefined}
                      className="chip h-7 px-2.5 text-xs cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: `var(--c-${row.category.toLowerCase().replace(/\s+/g, '')}, var(--ink-muted))` }}
                      />
                      <span>{row.category}</span>
                      <span className="font-mono text-[10px] opacity-75">({row.count.toLocaleString()})</span>
                    </button>
                  );
                })}
              </div>
              {categorySubDistLoading && (
                <div className="mt-1.5 text-[10px] text-[var(--ink-muted)]">Loading…</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sub-filter: status chips when stages bucket is selected */}
      <AnimatePresence>
        {dimension === 'stages' && activeBucket && stageStatusSubDist.length > 0 && showSubFilter && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mb-3 overflow-hidden"
          >
            <div className="card px-3.5 py-2.5">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium text-[var(--ink-muted)]">
                  <Filter className="h-3.5 w-3.5" />
                  <span>Filter <span className="font-semibold text-[var(--ink)]">{STAGE_FULL_LABELS[activeBucket] || activeBucket}</span> by Status</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSubFilter(false)}
                  className="text-xs text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer"
                  aria-label="Hide sub-filter"
                >
                  ×
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveStatusFilter(null)}
                  data-active={activeStatusFilter === null ? 'true' : undefined}
                  className="chip h-7 px-2.5 text-xs cursor-pointer"
                >
                  All ({stageStatusSubDist.reduce((s, r) => s + r.count, 0).toLocaleString()})
                </button>
                {stageStatusSubDist.map((row) => {
                  const active = activeStatusFilter === row.status;
                  return (
                    <button
                      key={row.status}
                      type="button"
                      onClick={() => setActiveStatusFilter(active ? null : row.status)}
                      data-active={active ? 'true' : undefined}
                      className="chip h-7 px-2.5 text-xs cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: `var(--c-${row.status.toLowerCase().replace(/\s+/g, '')}, var(--ink-muted))` }}
                      />
                      <span>{row.status}</span>
                      <span className="font-mono text-[10px] opacity-75">({row.count.toLocaleString()})</span>
                    </button>
                  );
                })}
              </div>
              {stageStatusSubDistLoading && (
                <div className="mt-1.5 text-[10px] text-[var(--ink-muted)]">Loading…</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Proposal Table Summary Toolbar / Detailed View */}
      <div className="mb-6 card overflow-hidden">
        <div
          className={cn(
            'flex flex-col items-start justify-between gap-3 p-3.5 text-xs font-sans sm:flex-row sm:items-center transition-colors',
            showProposalTable && 'border-b border-[var(--border)] bg-[var(--surface-2)]'
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-[var(--ink-muted)]">
              {isTableFiltered ? 'Filtered proposals' : 'Total indexed proposals'}:
            </span>
            <span className="font-mono font-bold text-[var(--ink)] tabular-nums">
              {tableData?.total.toLocaleString() || 0}
            </span>
            {activeBucket && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-0.5 text-[11px] font-sans font-medium text-[var(--ink)]">
                <span>{dimension === 'stages' ? 'Stage' : dimension.charAt(0).toUpperCase() + dimension.slice(1)}: <strong>{activeBucket}</strong></span>
                <button
                  type="button"
                  onClick={() => setActiveBucket(null)}
                  className="rounded-full text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer"
                  aria-label="Clear active bucket filter"
                >
                  ×
                </button>
              </span>
            )}
            {tableLoading && (
              <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-0.5">
                <InlineBrandLoader
                  size="sm"
                  label="Updating…"
                  className="flex-row gap-1.5 [&>span]:text-[10px] [&>span]:font-semibold [&>span]:uppercase [&>span]:tracking-wider"
                />
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowProposalTable((prev) => !prev)}
              className="btn btn-outline h-8 px-3 text-xs font-sans font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>{showProposalTable ? 'Hide Table' : 'Show Detailed Table'}</span>
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-150', showProposalTable && 'rotate-180')} />
            </button>
            <button
              onClick={downloadDetailedCSV}
              disabled={downloading}
              className="inline-flex h-8 items-center gap-1.5 rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-sans font-medium text-[var(--ink)] hover:border-[var(--ink-muted)] hover:bg-[var(--surface-2)] disabled:opacity-50 cursor-pointer"
              title="Download proposals CSV"
            >
              <Download className="h-3.5 w-3.5 text-[var(--ink-muted)]" />
              <span>{downloading ? 'Exporting...' : (isTableFiltered ? 'Filtered CSV' : 'Export CSV')}</span>
            </button>
          </div>
        </div>

        {showProposalTable && (
          <>
            <div className="relative hidden overflow-x-auto md:block" aria-busy={tableLoading}>
              <table className="min-w-[980px] text-sm font-sans">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-left text-[11px] font-sans font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                    {[
                      ['github', 'GitHub'],
                      ['eip', 'EIP'],
                      ['title', 'Title'],
                      ['author', 'Author'],
                      ['type', 'Type'],
                      ['category', 'Category'],
                      ['status', 'Status'],
                      ...(dimension === 'stages' ? [['updated_at', 'Upgrade']] : []),
                    ].map(([key, label]) => (
                      <th key={key} className="px-4 py-2.5">
                        <button
                          type="button"
                          onClick={() => toggleSort(key as SortBy)}
                          className="inline-flex items-center gap-1 text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
                        >
                          <span>{label}</span>
                          {sortBy === key ? (
                            sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-60" />
                          )}
                        </button>
                      </th>
                    ))}
                  </tr>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                    <th className="px-4 py-2">
                      <input
                        value={columnSearch.github}
                        onChange={(e) => handleColumnSearch('github', e.target.value)}
                        placeholder="/EIPs"
                        className="h-8 w-full rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface)] px-2.5 text-xs font-sans text-[var(--ink)] placeholder:text-[var(--ink-faint)] outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
                      />
                    </th>
                    <th className="px-4 py-2">
                      <input
                        value={eipDisplayValue}
                        onChange={(e) => handleColumnSearch('eip', e.target.value)}
                        placeholder="/EIP-1559"
                        className="h-8 w-full rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface)] px-2.5 text-xs font-sans text-[var(--ink)] placeholder:text-[var(--ink-faint)] outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
                      />
                    </th>
                    <th className="px-4 py-2">
                      <input
                        value={columnSearch.title}
                        onChange={(e) => handleColumnSearch('title', e.target.value)}
                        placeholder="Title"
                        className="h-8 w-full rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface)] px-2.5 text-xs font-sans text-[var(--ink)] placeholder:text-[var(--ink-faint)] outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
                      />
                    </th>
                    <th className="px-4 py-2">
                      <input
                        value={columnSearch.author}
                        onChange={(e) => handleColumnSearch('author', e.target.value)}
                        placeholder="Author"
                        className="h-8 w-full rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface)] px-2.5 text-xs font-sans text-[var(--ink)] placeholder:text-[var(--ink-faint)] outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
                      />
                    </th>
                    <th className="px-4 py-2">
                      <input
                        value={columnSearch.type}
                        onChange={(e) => handleColumnSearch('type', e.target.value)}
                        placeholder="Type"
                        className="h-8 w-full rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface)] px-2.5 text-xs font-sans text-[var(--ink)] placeholder:text-[var(--ink-faint)] outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
                      />
                    </th>
                    <th className="px-4 py-2">
                      <input
                        value={columnSearch.category}
                        onChange={(e) => handleColumnSearch('category', e.target.value)}
                        placeholder="Category"
                        className="h-8 w-full rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface)] px-2.5 text-xs font-sans text-[var(--ink)] placeholder:text-[var(--ink-faint)] outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
                      />
                    </th>
                    <th className="px-4 py-2">
                      <input
                        value={columnSearch.status}
                        onChange={(e) => handleColumnSearch('status', e.target.value)}
                        placeholder="Status"
                        className="h-8 w-full rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface)] px-2.5 text-xs font-sans text-[var(--ink)] placeholder:text-[var(--ink-faint)] outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
                      />
                    </th>
                    {dimension === 'stages' && (
                      <th className="px-4 py-2">
                        <input
                          value={columnSearch.upgrade}
                          onChange={(e) => handleColumnSearch('upgrade', e.target.value)}
                          placeholder="Upgrade"
                          className="h-8 w-full rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface)] px-2.5 text-xs font-sans text-[var(--ink)] placeholder:text-[var(--ink-faint)] outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
                        />
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {showTableSkeleton ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <tr key={i} className="border-b border-[var(--border)]">
                        <td colSpan={dimension === 'stages' ? 8 : 7} className="px-4 py-3">
                          <div className="h-5 animate-pulse rounded bg-[var(--surface-2)]" />
                        </td>
                      </tr>
                    ))
                  ) : (
                    (tableData?.rows || []).map((row) => (
                      <tr
                        key={`${row.repo}-${row.kind}-${row.number}`}
                        className="border-b border-[var(--border)] text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors"
                      >
                        <td className="px-4 py-3">
                          <a
                            href={githubProposalUrl(row.kind, row.number)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-[var(--brand-strong)] hover:underline"
                          >
                            {githubRepoLabel(row.repo, row.kind)}
                          </a>
                        </td>
                        <td className="px-4 py-3 font-mono font-medium text-[var(--ink)]">
                          <Link href={proposalUrl(row.repo, row.kind, row.number)} className="hover:text-[var(--brand-strong)] hover:underline">
                            {row.kind}-{row.number}
                          </Link>
                        </td>
                        <td className="max-w-[420px] px-4 py-3 text-[var(--ink)]">
                          {row.title || `${row.kind}-${row.number}`}
                        </td>
                        <td className="px-4 py-3 text-[var(--ink-muted)]">
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
                                      <Link href={peopleUrl(token.username)} className="text-[var(--brand-strong)] hover:underline">
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
                        <td className="px-4 py-3 text-[var(--ink-muted)]">{row.type || '-'}</td>
                        <td className="px-4 py-3">{row.category}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex rounded-full border px-2 py-0.5 text-[11px] font-sans font-medium',
                              BADGE_COLORS[row.status] || BADGE_COLORS.Unknown
                            )}
                          >
                            {row.status}
                          </span>
                        </td>
                        {dimension === 'stages' && (
                          <td className="px-4 py-3">
                            {(row as typeof row & { upgradeName?: string | null }).upgradeName ? (
                              <Link
                                href={`/upgrade/${(row as typeof row & { upgradeName?: string | null }).upgradeName!.toLowerCase()}`}
                                className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-medium text-[var(--ink)] hover:border-[var(--ink-muted)] hover:underline"
                              >
                                <Package className="h-3 w-3 text-[var(--brand-strong)]" />
                                {(row as typeof row & { upgradeName?: string | null }).upgradeName}
                              </Link>
                            ) : (
                              <span className="text-xs text-[var(--ink-muted)]">–</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {tableLoading && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--paper)]/60 backdrop-blur-[2px]">
                  <InlineBrandLoader size="md" label="Updating table…" className="flex-row gap-3" />
                </div>
              )}
            </div>

            {/* Mobile Cards */}
            <div className="relative space-y-2 p-2 md:hidden" aria-busy={tableLoading}>
              {showTableSkeleton ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={`mobile-row-skeleton-${i}`} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
                    <div className="mb-2 h-4 w-28 animate-pulse rounded bg-[var(--surface-3)]" />
                    <div className="mb-1.5 h-3 w-full animate-pulse rounded bg-[var(--surface-3)]" />
                    <div className="mb-1.5 h-3 w-2/3 animate-pulse rounded bg-[var(--surface-3)]" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--surface-3)]" />
                  </div>
                ))
              ) : (
                (tableData?.rows || []).map((row) => (
                  <div key={`mobile-${row.repo}-${row.kind}-${row.number}`} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <Link href={proposalUrl(row.repo, row.kind, row.number)} className="text-sm font-semibold text-[var(--ink)] hover:text-[var(--brand-strong)] hover:underline">
                        {row.kind}-{row.number}
                      </Link>
                      <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-[11px] font-sans font-medium', BADGE_COLORS[row.status] || BADGE_COLORS.Unknown)}>
                        {row.status}
                      </span>
                    </div>
                    <p className="mb-1 line-clamp-2 text-sm text-[var(--ink)]">{row.title || `${row.kind}-${row.number}`}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--ink-muted)]">
                      <span>{row.type || '-'}</span>
                      <span>{row.category}</span>
                      <a
                        href={githubProposalUrl(row.kind, row.number)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--brand-strong)] hover:underline"
                      >
                        {githubRepoLabel(row.repo, row.kind)}
                      </a>
                    </div>
                  </div>
                ))
              )}

              {tableLoading && (
                <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-[var(--paper)]/60 backdrop-blur-[2px]">
                  <InlineBrandLoader size="md" label="Updating table…" className="flex-row gap-3" />
                </div>
              )}
            </div>

            {/* Pagination Footer */}
            <div className="flex flex-col gap-2 border-t border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5 text-xs font-sans text-[var(--ink-muted)] sm:flex-row sm:items-center sm:justify-between">
              <span>{isTableFiltered ? 'Filtered results' : 'Showing'}: <strong className="font-mono font-bold text-[var(--ink)]">{tableData?.total.toLocaleString() || 0}</strong> proposals</span>
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="btn btn-outline h-7 px-2.5 text-xs font-sans font-medium cursor-pointer"
                >
                  Reset Filters
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="btn btn-outline h-7 px-2.5 text-xs font-sans font-medium disabled:opacity-40 cursor-pointer"
                >
                  Prev
                </button>
                <span>Page <strong className="font-mono text-[var(--ink)]">{page}</strong> of <strong className="font-mono text-[var(--ink)]">{tableData?.totalPages || 1}</strong></span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(tableData?.totalPages || 1, p + 1))}
                  disabled={page >= (tableData?.totalPages || 1)}
                  className="btn btn-outline h-7 px-2.5 text-xs font-sans font-medium disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <ChartFooter nextUpdateAt={null} />
      </section>

      <div id="weekly-recap">
        <WeeklyRecapSection sectionTitleClass={sectionTitleClass} sectionSubtitleClass={sectionSubtitleClass} />
      </div>

      <HomeProtocolCalls sectionTitleClass={sectionTitleClass} sectionSubtitleClass={sectionSubtitleClass} />

      <section className="mb-8 pt-2 scroll-mt-24" id="testimonials">
        <SectionHead
          index="09"
          eyebrow="Ecosystem feedback"
          title="Community Testimonials"
          description="What Ethereum core developers, researchers, and editors say about EIPsInsight."
          action={
            <Link
              href="/testimonials"
              className="btn btn-outline h-8 px-3 text-xs font-sans font-medium inline-flex items-center gap-1.5 hover:border-[var(--ink)] cursor-pointer"
            >
              <span>View All</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-[var(--ink-faint)]" />
            </Link>
          }
        />
        <TestimonialsSection showHeader={false} />
      </section>

      <SocialCommunityUpdates showCommunityResources={true} />
      </div>
    </div>
  );
}
