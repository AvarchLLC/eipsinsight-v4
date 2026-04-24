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
import { CopyLinkButton } from '@/components/header';
import { LastUpdated } from '@/components/analytics/LastUpdated';
import { InlineBrandLoader } from '@/components/inline-brand-loader';
import { EIPsPageHeader } from './_components/eips-page-header';
import HomeFAQs from './_components/home-faqs';
import SocialCommunityUpdates from './_components/social-community-updates';
import TrendingProposals from '@/app/dashboard/_components/trending-proposals';
import GovernanceOverTime from '@/app/dashboard/_components/governance-over-time';
import EditorHomeDashboard from './_components/persona-home/EditorHomeDashboard';
import DeveloperHomeDashboard from './_components/persona-home/DeveloperHomeDashboard';
import BuilderHomeDashboard from './_components/persona-home/BuilderHomeDashboard';
import NewcomerHomeDashboard from './_components/persona-home/NewcomerHomeDashboard';
import DeveloperUpgradeWatchSection from './_components/persona-home/DeveloperUpgradeWatchSection';
import EditorReviewQueueSection from './_components/persona-home/EditorReviewQueueSection';
import EditorCategoryBreakdownSection from './_components/persona-home/EditorCategoryBreakdownSection';
import { useSession } from '@/hooks/useSession';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { ASSOCIATE_EIP_EDITORS, CANONICAL_EIP_EDITORS } from '@/data/eip-contributor-roles';
import { getUpgradeTimelineData } from '@/data/upgrade-timelines';
import { useEffectivePersona, useIsHydrated } from '@/stores/personaStore';

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

type HomePersona = 'developer' | 'editor' | 'builder' | 'newcomer';

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

const STATUS_PIE_COLORS: Record<string, string> = {
  Draft: '#64748b',
  Review: '#eab308',
  'Last Call': '#15803d',
  Final: '#3b82f6',
  Living: '#22d3ee',
  Stagnant: '#ef4444',
  Withdrawn: '#dc2626',
  Unknown: '#94a3b8',
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

const PERSONA_HOME_PLANS: Record<HomePersona, {
  title: string;
  description: string;
  goal: string;
  tools: Array<{
    key: string;
    title: string;
    href: string;
    cta: string;
    icon: React.ComponentType<{ className?: string }>;
    blurb: string;
  }>;
}> = {
  developer: {
    title: 'Developer Home',
    description: 'See what is changing, what is active, and where to dive deeper next.',
    goal: 'Quickly understand ongoing protocol changes and identify actionable items.',
    tools: [
      { key: 'upgrade', title: 'Upgrade Watch', href: '/upgrade', cta: 'Explore Upgrades', icon: Zap, blurb: 'Protocol changes and rollout context.' },
      { key: 'trending', title: 'Trending Proposals', href: '/explore/trending', cta: 'Explore Trending', icon: Activity, blurb: 'Most active standards this week.' },
      { key: 'browse', title: 'Browse by Filters', href: '/explore', cta: 'Explore Browse', icon: Filter, blurb: 'Filter by status, category, and repo.' },
      { key: 'board', title: 'Editing Board Snapshot', href: '/tools/board', cta: 'Explore Board', icon: GitPullRequest, blurb: 'Jump into active proposal queue.' },
      { key: 'timeline', title: 'Timeline Snapshot', href: '/tools/timeline', cta: 'Explore Timeline', icon: GitBranch, blurb: 'Recent lifecycle and PR movement.' },
      { key: 'governance', title: 'Recent Governance Activity', href: '/analytics/prs', cta: 'Explore PR Analytics', icon: ArrowUpDown, blurb: 'Latest governance signals and PR activity.' },
    ],
  },
  editor: {
    title: 'Editor Home',
    description: 'Stay on top of review queue, editorial workload, and proposal progression.',
    goal: 'Efficiently manage review workload and track proposal progression.',
    tools: [
      { key: 'pr-analytics', title: 'PR Analytics', href: '/analytics/prs', cta: 'Explore PR Analytics', icon: ArrowUpDown, blurb: 'PR flow, velocity, and waiting states.' },
      { key: 'editing-board', title: 'Editing Board', href: '/tools/board?status=Waiting+on+Editor&page=1', cta: 'Explore Board', icon: GitPullRequest, blurb: 'Direct waiting-on-editor view.' },
      { key: 'editor-leaderboard', title: 'Editor Leaderboard', href: '/analytics/editors', cta: 'Explore Leaderboard', icon: Trophy, blurb: 'Monthly editorial activity snapshot.' },
    ],
  },
  builder: {
    title: 'Builder Home',
    description: 'Discover active standards quickly and jump into contribution workflows.',
    goal: 'Discover active standards and contribute quickly.',
    tools: [
      { key: 'trending', title: 'Trending Proposals', href: '/explore/trending', cta: 'Explore Trending', icon: Activity, blurb: 'Find active standards quickly.' },
      { key: 'erc-focus', title: 'ERC-focused Browse', href: '/explore?repo=ercs', cta: 'Explore ERCs', icon: Boxes, blurb: 'ERC-focused exploration and filtering.' },
      { key: 'eip-builder', title: 'EIP Builder', href: '/tools/eip-builder', cta: 'Explore EIP Builder', icon: Code, blurb: 'Primary drafting and validation workflow.' },
      { key: 'resources', title: 'Practical Docs/Resources', href: '/resources/docs', cta: 'Explore Resources', icon: BookOpen, blurb: 'Guides, references, and examples.' },
      { key: 'contributors', title: 'Recent Activity Snapshot', href: '/analytics/contributors', cta: 'Explore Contributors', icon: Activity, blurb: 'Latest contributor movement and momentum.' },
    ],
  },
  newcomer: {
    title: 'Newcomer Home',
    description: 'Start with clear context, then explore proposals and tools at your pace.',
    goal: 'Make Ethereum standards approachable and easy to get started with.',
    tools: [
      { key: 'learn', title: 'Learning Resources First', href: '/resources', cta: 'Explore Resources', icon: BookOpen, blurb: 'Primary entry point for beginners.' },
      { key: 'trending', title: 'Simple Trending Proposals', href: '/explore/trending', cta: 'Explore Trending', icon: Activity, blurb: 'Simple view of current activity.' },
      { key: 'upgrade', title: 'Simplified Upgrade Watch', href: '/upgrade', cta: 'Explore Upgrades', icon: Zap, blurb: 'Simplified network-upgrade summary.' },
      { key: 'tools', title: 'Beginner Tool Access', href: '/tools', cta: 'Explore Tools', icon: Wrench, blurb: 'Board, timeline, dependencies, and builder.' },
      { key: 'faq', title: 'FAQ / Reference', href: '/resources/faq', cta: 'Explore FAQ', icon: BookOpen, blurb: 'Core terms and quick answers.' },
    ],
  },
};

const PERSONA_LABELS: Record<HomePersona, string> = {
  developer: 'Developer',
  editor: 'Editor',
  builder: 'Builder',
  newcomer: 'Newcomer',
};

const PERSONA_SECTION_VISIBILITY: Record<
  HomePersona,
  {
    quickAccess: boolean;
    upgradeWatch: boolean;
    trending: boolean;
    reviewQueue: boolean;
    categoryBreakdown: boolean;
    browse: boolean;
    governanceOverTime: boolean;
    board: boolean;
    monthly: boolean;
    governance: boolean;
    social: boolean;
    reference: boolean;
  }
> = {
  developer: {
    quickAccess: true,
    upgradeWatch: true,
    trending: true,
    reviewQueue: false,
    categoryBreakdown: false,
    browse: true,
    governanceOverTime: true,
    board: true,
    monthly: false,
    governance: true,
    social: false,
    reference: false,
  },
  editor: {
    quickAccess: true,
    upgradeWatch: false,
    trending: false,
    reviewQueue: true,
    categoryBreakdown: true,
    browse: true,
    governanceOverTime: false,
    board: false,
    monthly: true,
    governance: true,
    social: true,
    reference: false,
  },
  builder: {
    quickAccess: false,
    upgradeWatch: false,
    trending: true,
    reviewQueue: false,
    categoryBreakdown: false,
    browse: true,
    governanceOverTime: true,
    board: true,
    monthly: false,
    governance: true,
    social: true,
    reference: false,
  },
  newcomer: {
    quickAccess: false,
    upgradeWatch: true,
    trending: true,
    reviewQueue: false,
    categoryBreakdown: false,
    browse: false,
    governanceOverTime: false,
    board: true,
    monthly: false,
    governance: false,
    social: false,
    reference: false,
  },
};

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
  const personaFromStore = useEffectivePersona();
  const personaHydrated = useIsHydrated();
  const activePersona: HomePersona = (personaHydrated ? personaFromStore : 'developer') as HomePersona;
  const isDark = resolvedTheme === 'dark';
  const [dimension, setDimension] = useState<Dimension>('status');
  const [sortBy, setSortBy] = useState<SortBy>('updated_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [activeBucket, setActiveBucket] = useState<string | null>(null);
  const [showNewUserGuide, setShowNewUserGuide] = useState(false);
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
  const [openActivities, setOpenActivities] = useState<Record<string, boolean>>({});
  const [distributionLoading, setDistributionLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(true);
  const [widgetsLoading, setWidgetsLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadingLeaderboard, setDownloadingLeaderboard] = useState(false);
  const [monthlyDeltaUpdatedAt, setMonthlyDeltaUpdatedAt] = useState<string | null>(null);
  const [monthlyLeaderboardUpdatedAt, setMonthlyLeaderboardUpdatedAt] = useState<string | null>(null);
  const [showProposalTable, setShowProposalTable] = useState(true);
  const [showPersonaWorkspace, setShowPersonaWorkspace] = useState(true);
  const [editorRepoFilter, setEditorRepoFilter] = useState<EditorRepoFilter>('');
  const [developerRepoFilter, setDeveloperRepoFilter] = useState<DeveloperRepoFilter>('');
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
    setShowProposalTable(activePersona !== 'editor');
  }, [activePersona]);

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
    setShowPersonaWorkspace(true);
  }, [activePersona]);

  useEffect(() => {
    const { fromInput, toInput } = monthRange(currentMonthYear);
    setEditorContribFrom(fromInput);
    setEditorContribTo(toInput);
    if (editorContribWindow === 'month') {
    }
  }, [currentMonthYear, editorContribWindow]);

  useEffect(() => {
    if (activePersona !== 'builder') return;
    setDimension('repo');
    setActiveBucket('ERCs');
    setPage(1);
  }, [activePersona]);

  useEffect(() => {
    let cancelled = false;
    if (activePersona !== 'newcomer') {
      setNewcomerTrendingRows([]);
      return;
    }
    (async () => {
      setNewcomerTrendingLoading(true);
      try {
        const data = await client.governanceTimeline.getTrendingProposals({ limit: 6 });
        if (!cancelled) {
          setNewcomerTrendingRows((data || []) as NewcomerTrendingProposal[]);
        }
      } catch (err) {
        console.error('Failed to load newcomer trending proposals:', err);
        if (!cancelled) setNewcomerTrendingRows([]);
      } finally {
        if (!cancelled) setNewcomerTrendingLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activePersona]);

  useEffect(() => {
    let cancelled = false;
    if (activePersona !== 'editor') {
      setBoardPreviewRows([]);
      setBoardProcessStats([]);
      setBoardPreviewTotal(0);
      setBoardPreviewTotalPages(1);
      setProcessBreakdownRows([]);
      setParticipantBreakdownRows([]);
      return;
    }
    (async () => {
      setBoardPreviewLoading(true);
      try {
        const [data, statsData, classificationData, waitingData] = await Promise.all([
          client.tools.getOpenPRBoard({
            repo: editorRepoFilter || undefined,
            govState: ['Waiting on Editor'],
            processType: selectedBoardProcesses.length ? selectedBoardProcesses : undefined,
            page: editorQueuePage,
            pageSize: 6,
          }),
          client.tools.getOpenPRBoardStats({
            repo: editorRepoFilter || undefined,
            govState: ['Waiting on Editor'],
          }),
          client.analytics.getPROpenClassification({
            repo: editorRepoFilter || undefined,
            month: currentMonthYear,
          }),
          client.analytics.getPRGovernanceWaitingState({
            repo: editorRepoFilter || undefined,
            month: currentMonthYear,
          }),
        ]);
        if (!cancelled) {
          setBoardPreviewRows(data.rows ?? []);
          setBoardProcessStats((statsData?.processTypes ?? []).map((row) => ({
            type: row.type,
            count: Number(row.count ?? 0),
          })));
          setBoardPreviewTotal(Number(data.total ?? 0));
          setBoardPreviewTotalPages(Math.max(1, Number(data.totalPages ?? 1)));
          setProcessBreakdownRows(
            (classificationData ?? []).map((row) => ({
              category: row.category,
              count: Number(row.count ?? 0),
            })),
          );
          setParticipantBreakdownRows(
            (waitingData ?? []).map((row) => ({
              label: row.label,
              count: Number(row.count ?? 0),
            })),
          );
        }
      } catch (err) {
        console.error('Failed to load board preview:', err);
      } finally {
        if (!cancelled) setBoardPreviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activePersona, currentMonthYear, editorRepoFilter, editorQueuePage, selectedBoardProcesses]);

  useEffect(() => {
    let cancelled = false;
    if (activePersona !== 'developer') {
      setDeveloperBoardRows([]);
      setDeveloperBoardTotal(0);
      setDeveloperBoardTotalPages(1);
      return;
    }

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
  }, [activePersona, developerRepoFilter, developerBoardPage]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedColumnSearch(columnSearch);
    }, 250);
    return () => window.clearTimeout(t);
  }, [columnSearch]);

  useEffect(() => {
    if (sessionLoading) return;
    if (session) {
      setShowNewUserGuide(false);
      return;
    }
    const dismissed = window.localStorage.getItem('eipsinsight_home_start_here_dismissed') === '1';
    setShowNewUserGuide(!dismissed);
  }, [session, sessionLoading]);

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
          const distRes = await client.standards.getUnifiedDistribution({ dimension: dimension as 'status' | 'category' | 'repo' });
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
  }, [dimension]);

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
  }, [dimension, page, sortBy, sortDir, activeBucket, debouncedColumnSearch]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setWidgetsLoading(true);
      try {
        const [deltaRes, editorRes, recentRes, editorActivityRes] = await Promise.all([
          client.standards.getMonthlyDelta({ monthYear: currentMonthYear }),
          client.analytics.getMonthlyEditorLeaderboard({ monthYear: currentMonthYear, limit: 50 }),
          client.analytics.getRecentChanges({ limit: 8 }),
          client.analytics.getRecentEditorActivity({ limit: 40, onlyOpenPRs: false }),
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

  useEffect(() => {
    let cancelled = false;
    if (activePersona !== 'editor') {
      setEditorContributionRows([]);
      setEditorRepoDistributionRows([]);
      return;
    }

    (async () => {
      setEditorContribLoading(true);
      try {
        let from: string | undefined;
        let to: string | undefined;

        if (editorContribWindow === 'month') {
          const range = monthRange(currentMonthYear);
          from = range.fromQuery;
          to = range.toQuery;
        } else if (editorContribWindow === 'custom') {
          from = dayStartIso(editorContribFrom) ?? undefined;
          to = dayEndIso(editorContribTo) ?? undefined;
        }

        const [leaders, repoDistribution] = await Promise.all([
          client.analytics.getEditorsLeaderboard({
            limit: 12,
            from,
            to,
          }),
          client.analytics.getEditorsRepoDistribution({
            from,
            to,
          }),
        ]);

        if (cancelled) return;

        setEditorContributionRows(
          leaders.map((row) => ({
            actor: row.actor,
            totalActions: row.totalActions,
            prsTouched: row.prsTouched,
            reviews: row.reviews,
            comments: row.comments,
          })),
        );
        setEditorRepoDistributionRows(
          repoDistribution.map((row) => ({
            actor: row.actor,
            repo: row.repo,
            count: row.count,
            pct: row.pct,
          })),
        );
      } catch (err) {
        console.error('Failed to load editor contribution snapshot:', err);
        if (!cancelled) {
          setEditorContributionRows([]);
          setEditorRepoDistributionRows([]);
        }
      } finally {
        if (!cancelled) setEditorContribLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activePersona, currentMonthYear, editorContribWindow, editorContribFrom, editorContribTo]);

  const totalCount = useMemo(
    () => distribution.reduce((acc, row) => acc + row.count, 0),
    [distribution]
  );

  const maxCardCount = useMemo(
    () => Math.max(1, ...distribution.map((d) => d.count)),
    [distribution]
  );

  const febInsightPieData = useMemo(
    () => febDelta.filter((d) => d.count > 0).map((d) => ({
      name: d.status,
      value: d.count,
      fill: STATUS_PIE_COLORS[d.status] || STATUS_PIE_COLORS.Unknown,
    })),
    [febDelta]
  );
  const monthlyEditorRows = useMemo(
    () => febEditors.slice(0, 10),
    [febEditors]
  );
  const monthlyInsightTotal = useMemo(
    () => febInsightPieData.reduce((sum, item) => sum + item.value, 0),
    [febInsightPieData]
  );
  const febInsightDonutOption = useMemo(() => ({
    tooltip: {
      trigger: 'item',
      formatter: (params: { name: string; value: number; percent: number }) =>
        `${params.name}<br/>${params.value} (${params.percent}%)`,
      backgroundColor: isDark ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.98)',
      borderColor: isDark ? 'rgba(148,163,184,0.2)' : 'rgba(148,163,184,0.35)',
      textStyle: { color: isDark ? '#e2e8f0' : '#0f172a', fontSize: 12 },
    },
    legend: {
      show: true,
      orient: 'vertical',
      right: 8,
      top: 'middle',
      itemWidth: 10,
      itemHeight: 10,
      icon: 'circle',
      textStyle: {
        color: isDark ? '#cbd5e1' : '#475569',
        fontSize: 11,
      },
      formatter: (name: string) => {
        const item = febInsightPieData.find((d) => d.name === name);
        return `${name} (${item?.value ?? 0})`;
      },
    },
    graphic: [
      {
        type: 'text',
        left: '36%',
        top: '45%',
        style: {
          text: monthlyInsightTotal.toLocaleString(),
          fill: isDark ? '#f8fafc' : '#0f172a',
          fontSize: 22,
          fontWeight: 700,
          textAlign: 'center',
        },
      },
      {
        type: 'text',
        left: '36%',
        top: '53%',
        style: {
          text: 'Total',
          fill: isDark ? '#94a3b8' : '#64748b',
          fontSize: 11,
          fontWeight: 600,
          textAlign: 'center',
        },
      },
    ],
    series: [
      {
        type: 'pie',
        radius: ['52%', '80%'],
        center: ['36%', '50%'],
        avoidLabelOverlap: false,
        minAngle: 3,
        itemStyle: {
          borderRadius: 4,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(15,23,42,0.12)' : 'rgba(148,163,184,0.22)',
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
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: isDark ? 'rgba(15,23,42,0.94)' : 'rgba(255,255,255,0.98)',
        borderColor: isDark ? 'rgba(148,163,184,0.25)' : 'rgba(148,163,184,0.35)',
        textStyle: { color: isDark ? '#e2e8f0' : '#0f172a', fontSize: 12 },
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
      },
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
      if (activePersona === 'editor' && editorContribWindow !== 'month') {
        const from = editorContribWindow === 'custom' ? dayStartIso(editorContribFrom) ?? undefined : undefined;
        const to = editorContribWindow === 'custom' ? dayEndIso(editorContribTo) ?? undefined : undefined;
        const res = await client.analytics.getEditorsLeaderboardExport({
          from,
          to,
          detailsOnly: true,
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
      } else {
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
      }
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
      const latestIncluded = latestUpgradeSnapshot?.included.length ?? 0;
      const latestScheduled = latestUpgradeSnapshot?.scheduled.length ?? 0;
      const latestConsidered = latestUpgradeSnapshot?.considered.length ?? 0;
      const latestProposed = latestUpgradeSnapshot?.proposed.length ?? 0;
      const latestDeclined = latestUpgradeSnapshot?.declined.length ?? 0;
      const latestTotal = latestIncluded + latestScheduled + latestConsidered + latestProposed + latestDeclined;
      const header = [
        'upgrade_slug',
        'upgrade_label',
        'date',
        'total_count',
        `included_eips (${latestIncluded})`,
        `scheduled_eips (${latestScheduled})`,
        `considered_eips (${latestConsidered})`,
        `proposed_eips (${latestProposed})`,
        `declined_eips (${latestDeclined})`,
        `all_eips (${latestTotal})`,
      ];
      const rows = [...upgradeTimelineRows]
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((row) => {
        const toEipCode = (value: string) => {
          const normalized = String(value ?? '').trim().replace(/^EIP[-\s]*/i, '');
          return normalized ? `EIP-${normalized}` : '';
        };
        const sortEips = (values: string[]) =>
          [...values]
            .map(toEipCode)
            .filter(Boolean)
            .sort((a, b) => Number(a.replace('EIP-', '')) - Number(b.replace('EIP-', '')));

        const included = sortEips(row.included ?? []);
        const scheduled = sortEips(row.scheduled ?? []);
        const considered = sortEips(row.considered ?? []);
        const proposed = sortEips(row.proposed ?? []);
        const declined = sortEips(row.declined ?? []);
        const total = included.length + scheduled.length + considered.length + proposed.length + declined.length;
        const all = [...included, ...scheduled, ...considered, ...proposed, ...declined]
          .filter(Boolean)
          .sort((a, b) => Number(a.replace('EIP-', '')) - Number(b.replace('EIP-', '')));
        const withCount = (values: string[]) => (values.length ? `${values.join(' | ')} (${values.length})` : '(0)');
        return [
          upgradeWatchSlug,
          selectedUpgradeLabel,
          row.date,
          total,
          withCount(included),
          withCount(scheduled),
          withCount(considered),
          withCount(proposed),
          withCount(declined),
          withCount(all),
        ];
      });

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
  const personaPlan = PERSONA_HOME_PLANS[activePersona];
  const visibleSections = PERSONA_SECTION_VISIBILITY[activePersona];
  const sectionOrder = useMemo(() => {
    if (activePersona === 'editor') {
      return { upgradeWatch: 0, trending: 0, reviewQueue: 2, categoryBreakdown: 3, browse: 4, governanceOverTime: 0, board: 0, monthly: 5, governance: 6, social: 7, learning: 8 };
    }
    if (activePersona === 'developer') {
      return { upgradeWatch: 1, trending: 2, reviewQueue: 0, categoryBreakdown: 0, browse: 3, governanceOverTime: 4, board: 5, monthly: 0, governance: 6, social: 0, learning: 0 };
    }
    if (activePersona === 'builder') {
      return { upgradeWatch: 0, trending: 1, reviewQueue: 0, categoryBreakdown: 0, browse: 2, governanceOverTime: 4, board: 3, monthly: 0, governance: 5, social: 6, learning: 0 };
    }
    return { upgradeWatch: 3, trending: 2, reviewQueue: 0, categoryBreakdown: 0, browse: 0, governanceOverTime: 0, board: 4, monthly: 0, governance: 0, social: 0, learning: 1 };
  }, [activePersona]);
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
        axisPointer: { type: 'shadow' },
        backgroundColor: isDark ? '#020617' : '#ffffff',
        borderColor: isDark ? '#1f2937' : '#e2e8f0',
        textStyle: { color: isDark ? '#e5e7eb' : '#0f172a' },
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
      grid: { left: 36, right: 10, top: 24, bottom: 56 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.98)',
        borderColor: isDark ? 'rgba(148,163,184,0.2)' : 'rgba(148,163,184,0.35)',
      },
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
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: 0,
          filterMode: 'none',
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
          moveOnMouseWheel: true,
          preventDefaultMouseMove: false,
        },
        {
          type: 'slider',
          xAxisIndex: 0,
          filterMode: 'none',
          height: 16,
          bottom: 8,
          borderColor: isDark ? 'rgba(148,163,184,0.2)' : 'rgba(148,163,184,0.35)',
          backgroundColor: isDark ? 'rgba(15,23,42,0.5)' : 'rgba(241,245,249,0.7)',
          fillerColor: isDark ? 'rgba(59,130,246,0.28)' : 'rgba(59,130,246,0.2)',
          handleStyle: {
            color: isDark ? '#334155' : '#cbd5e1',
            borderColor: isDark ? '#64748b' : '#94a3b8',
          },
          textStyle: { color: isDark ? '#94a3b8' : '#64748b', fontSize: 10 },
        },
      ],
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
    if (activePersona !== 'developer' && activePersona !== 'newcomer') {
      setUpgradeTimelineRows([]);
      return;
    }

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
  }, [activePersona, upgradeWatchSlug]);
  useEffect(() => {
    if (activePersona === 'editor') {
      setShowProposalTable(false);
    }
  }, [activePersona]);
  const isTableFiltered = hasColumnFilters || activeBucket !== null;
  const dismissNewUserGuide = () => {
    window.localStorage.setItem('eipsinsight_home_start_here_dismissed', '1');
    setShowNewUserGuide(false);
  };
  const togglePersonaWorkspace = () => {
    setShowPersonaWorkspace((prev) => !prev);
  };
  const PersonaDashboardComponent =
    activePersona === 'editor'
      ? EditorHomeDashboard
      : activePersona === 'developer'
        ? DeveloperHomeDashboard
        : activePersona === 'builder'
          ? BuilderHomeDashboard
          : NewcomerHomeDashboard;

  return (
    <div className="w-full overflow-x-clip px-2.5 py-6 sm:px-4 sm:py-7 lg:px-5 xl:px-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-6">
        <EIPsPageHeader />
      </motion.div>

      <hr className="mb-6 border-border/70" />

      {showNewUserGuide && activePersona === 'newcomer' && (
        <section className="mb-6 rounded-xl border border-primary/25 bg-primary/5 p-3 sm:p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Start Here</p>
              <p className="mt-1 text-sm text-foreground">
                New to EIPsInsight? Start with these quick paths.
              </p>
              <div className="mt-1 hidden items-center gap-1 text-xs text-primary sm:inline-flex">
                Explore <ArrowRight className="h-3 w-3" /> Analytics <ArrowRight className="h-3 w-3" /> Resources
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
                {ENTRY_PATHS.map((item) => (
                  <a
                    key={item.title}
                    href={item.href}
                    target={item.external ? '_blank' : undefined}
                    rel={item.external ? 'noreferrer' : undefined}
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground/85 hover:border-primary/30 hover:text-foreground sm:w-auto sm:justify-start sm:px-2.5"
                  >
                    {item.title}
                  </a>
                ))}
              </div>
            </div>
            <button
              onClick={dismissNewUserGuide}
              className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-background px-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Dismiss
            </button>
          </div>
        </section>
      )}

      {visibleSections.quickAccess && (
        <section className="mb-6" id="persona-home-workspace">
          <div className="rounded-xl border border-border/70 bg-card/60 p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                  {PERSONA_LABELS[activePersona]} Quick Access
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{personaPlan.goal}</p>
              </div>
              <div className="inline-flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={togglePersonaWorkspace}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-background/80 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:border-primary/30 hover:text-foreground"
                >
                  {showPersonaWorkspace ? 'Close' : 'Show'}
                  <ChevronDown className={cn('h-3 w-3 transition-transform', showPersonaWorkspace && 'rotate-180')} />
                </button>
                <Link
                  href="/p"
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-background/80 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:border-primary/30 hover:text-foreground"
                >
                  Persona
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
            {showPersonaWorkspace && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {personaPlan.tools.map((tool) => {
                    const Icon = tool.icon;
                    return (
                      <Link
                        key={tool.key}
                        href={tool.href}
                        className="group rounded-lg border border-border bg-card/60 px-3 py-3 transition hover:border-primary/40 hover:bg-primary/[0.05]"
                      >
                        <div className="mb-1.5 inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <p className="text-sm font-semibold text-foreground">{tool.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{tool.blurb}</p>
                        <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
                          {tool.cta}
                          <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
            )}
          </div>
        </section>
      )}
      <PersonaDashboardComponent>
      {activePersona === 'editor' && (
        <section className="mb-6 border-t border-border/70 pt-6" id="editor-contributions-overview">
          <div className="mb-4 flex flex-col items-start gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                <h2 className={sectionTitleClass}>Editors - {editorContributionWindowLabel}</h2>
                <CopyLinkButton sectionId="editor-contributions-overview" tooltipLabel="Copy link" />
              </div>
              <p className={sectionSubtitleClass}>
                Contribution ranking with action coverage and repository breakdown.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={editorContribWindow}
                onChange={(e) => setEditorContribWindow(e.target.value as EditorContributionWindow)}
                className="h-8 rounded-md border border-border bg-muted/40 px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <option value="month">This Month</option>
                <option value="all">All-Time</option>
                <option value="custom">Custom Range</option>
              </select>
              {editorContribWindow === 'month' && (
                <select
                  value={currentMonthYear}
                  onChange={(e) => setCurrentMonthYear(e.target.value)}
                  className="h-8 rounded-md border border-border bg-muted/40 px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  {monthYearOptions.map((opt) => (
                    <option key={`editor-contrib-month-${opt.value}`} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={downloadLeaderboardDetailedCSV}
                disabled={downloadingLeaderboard}
                aria-label="Download editor leaderboard CSV"
                title="Download editor leaderboard CSV"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-primary/40 bg-primary/10 text-primary hover:bg-primary/15 disabled:opacity-60"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
              <Link
                href="/analytics/editors"
                className="inline-flex h-8 items-center justify-center gap-1 whitespace-nowrap rounded-md border border-primary/30 bg-primary/10 px-2.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
              >
                Explore Editor Analytics
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {editorContribWindow === 'custom' && (
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <input
                type="date"
                value={editorContribFrom}
                onChange={(e) => setEditorContribFrom(e.target.value)}
                className="h-8 rounded-md border border-border bg-muted/40 px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <input
                type="date"
                value={editorContribTo}
                onChange={(e) => setEditorContribTo(e.target.value)}
                className="h-8 rounded-md border border-border bg-muted/40 px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            </div>
          )}

          <div className="rounded-xl border border-border/70 bg-card/60 p-4 shadow-sm">
            {editorContribLoading ? (
              <div className="h-[300px] animate-pulse rounded-lg bg-muted/50" />
            ) : editorContributionRows.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center rounded-lg border border-border/60 bg-background/40 text-sm text-muted-foreground">
                No editor contribution data for this range.
              </div>
            ) : (
              <div className="h-[300px]">
                <ReactECharts option={editorRepoBreakdownOption} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'svg' }} />
              </div>
            )}
          </div>

        </section>
      )}
      {activePersona === 'developer' && visibleSections.upgradeWatch && (
        <DeveloperUpgradeWatchSection
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
      )}
      {activePersona === 'newcomer' && (
        <section
          style={{ order: sectionOrder.learning }}
          className="mb-6"
          id="newcomer-learning-resources"
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <h2 className={sectionTitleClass}>Learning Resources</h2>
                <CopyLinkButton sectionId="newcomer-learning-resources" tooltipLabel="Copy link" />
              </div>
              <p className={sectionSubtitleClass}>Start here to understand Ethereum standards without the noise.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[
              { title: 'Resource Hub', href: '/resources', desc: 'Beginner-friendly entry point for standards learning.', icon: BookOpen },
              { title: 'Documentation', href: '/resources/docs', desc: 'Core docs and practical explainers for proposals.', icon: FileText },
              { title: 'FAQ / Reference', href: '/resources/faq', desc: 'Fast answers to common terminology and workflows.', icon: Info },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={`newcomer-learn-${item.title}`}
                  href={item.href}
                  className="group rounded-lg border border-border bg-card/60 px-3 py-3 transition hover:border-primary/40 hover:bg-primary/[0.05]"
                >
                  <div className="mb-1.5 inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{item.desc}</p>
                </Link>
              );
            })}
          </div>
          <div className="mt-4 flex justify-center">
            <Link
              href="/resources"
              className="inline-flex h-8 items-center justify-center gap-1 whitespace-nowrap rounded-md border border-primary/30 bg-primary/10 px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
            >
              Explore Resources
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </section>
      )}
      {(activePersona === 'developer' || activePersona === 'builder') && visibleSections.trending && (
        <section
          style={{ order: sectionOrder.trending }}
          className="mb-6 border-t border-border/70 pt-6"
          id={activePersona === 'builder' ? 'builder-trending-proposals' : 'developer-trending-proposals'}
        >
          <TrendingProposals />
          <div className="mt-4 flex justify-center">
            <Link
              href="/explore/trending"
              className="inline-flex h-8 items-center justify-center gap-1 whitespace-nowrap rounded-md border border-primary/30 bg-primary/10 px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
            >
              Explore Trending
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </section>
      )}
      
      {activePersona === 'newcomer' && visibleSections.trending && (
        <hr className="mb-6 border-border/70" />
      )}
      {activePersona === 'newcomer' && visibleSections.trending && (
        <section
          style={{ order: sectionOrder.trending }}
          className="mb-6 border-t border-border/70 pt-6"
          id="newcomer-trending-proposals"
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2">
                <Flame className="h-5 w-5 text-primary" />
                <h2 className={sectionTitleClass}>Trending Proposals</h2>
                <CopyLinkButton sectionId="newcomer-trending-proposals" tooltipLabel="Copy link" />
              </div>
              <p className={sectionSubtitleClass}>A simple snapshot of proposals with active discussions.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {newcomerTrendingLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={`newcomer-trending-skeleton-${i}`} className="h-24 animate-pulse rounded-lg border border-border bg-muted/40" />
              ))
            ) : newcomerTrendingRows.length === 0 ? (
              <div className="col-span-full rounded-lg border border-border bg-muted/30 px-3 py-8 text-center text-sm text-muted-foreground">
                No trending proposals available right now.
              </div>
            ) : (
              newcomerTrendingRows.slice(0, 6).map((item) => (
                <a
                  key={`newcomer-trending-${item.proposalType}-${item.proposalNumber}`}
                  href={item.url}
                  target={item.destination === 'magicians' ? '_blank' : undefined}
                  rel={item.destination === 'magicians' ? 'noopener noreferrer' : undefined}
                  className="rounded-lg border border-border bg-card/60 px-3 py-3 transition hover:border-primary/40 hover:bg-primary/[0.05]"
                >
                  <div className="mb-1 inline-flex rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    {item.proposalType}-{item.proposalNumber}
                  </div>
                  <p className="line-clamp-2 text-sm font-medium text-foreground">{item.title}</p>
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <MessageSquare className="h-3 w-3" />
                    {item.replies} replies
                  </div>
                </a>
              ))
            )}
          </div>
          <div className="mt-4 flex justify-center">
            <Link
              href="/explore/trending"
              className="inline-flex h-8 items-center justify-center gap-1 whitespace-nowrap rounded-md border border-primary/30 bg-primary/10 px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
            >
              Explore Trending
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </section>
      )}
      {activePersona === 'newcomer' && visibleSections.upgradeWatch && (
        <section
          style={{ order: sectionOrder.upgradeWatch }}
          className="mb-6 border-t border-border/70 pt-6"
          id="newcomer-upgrade-watch"
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <h2 className={sectionTitleClass}>Upgrade Watch</h2>
                <CopyLinkButton sectionId="newcomer-upgrade-watch" tooltipLabel="Copy link" />
              </div>
              <p className={sectionSubtitleClass}>Simplified snapshot of where proposal discussions stand for upgrades.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {[
              { key: 'included', label: 'Included', tone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
              { key: 'scheduled', label: 'Scheduled', tone: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300' },
              { key: 'considered', label: 'Considered', tone: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300' },
              { key: 'proposed', label: 'Proposed', tone: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300' },
              { key: 'declined', label: 'Declined', tone: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300' },
            ].map((metric) => (
              <div key={`newcomer-upgrade-${metric.key}`} className={cn('rounded-lg border px-3 py-3 shadow-sm', metric.tone)}>
                <p className="text-[11px] font-medium uppercase tracking-wide">{metric.label}</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">
                  {(latestUpgradeSnapshot?.[metric.key as keyof UpgradeTimelineRow] as string[] | undefined)?.length ?? 0}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Showing latest snapshot for <span className="font-medium text-foreground">Glamsterdam</span>.
          </p>
          <div className="mt-4 flex justify-center">
            <Link
              href="/upgrade"
              className="inline-flex h-8 items-center justify-center gap-1 whitespace-nowrap rounded-md border border-primary/30 bg-primary/10 px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
            >
              Explore Upgrades
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </section>
      )}
      {activePersona === 'developer' && visibleSections.governanceOverTime && (
        <section
          style={{ order: sectionOrder.governanceOverTime }}
          className="mb-6 border-t border-border/70 pt-6"
          id="developer-governance-over-time"
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <h2 className={sectionTitleClass}>Governance Over Time</h2>
                <CopyLinkButton sectionId="developer-governance-over-time" tooltipLabel="Copy link" />
              </div>
              <p className={sectionSubtitleClass}>Track proposal lifecycle movement across the network timeline.</p>
            </div>
          </div>
          <GovernanceOverTime />
          <div className="mt-4 flex justify-center">
            <Link
              href="/dashboard"
              className="inline-flex h-8 items-center justify-center gap-1 whitespace-nowrap rounded-md border border-primary/30 bg-primary/10 px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
            >
              Explore Governance
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </section>
      )}
      {activePersona === 'builder' && visibleSections.governanceOverTime && (
        <section
          style={{ order: sectionOrder.governanceOverTime }}
          className="mb-6 border-t border-border/70 pt-6"
          id="builder-eip-builder-focus"
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2">
                <Code className="h-5 w-5 text-primary" />
                <h2 className={sectionTitleClass}>EIP Builder</h2>
                <CopyLinkButton sectionId="builder-eip-builder-focus" tooltipLabel="Copy link" />
              </div>
              <p className={sectionSubtitleClass}>Primary workspace to draft, validate, and structure standards.</p>
            </div>
          </div>
          <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 shadow-sm">
            <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary">
              <Code className="h-4 w-4" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Build proposals faster with guided drafting</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Start new standards, validate formatting early, and keep contribution quality high before opening PRs.
            </p>
          </div>
          <div className="mt-4 flex justify-center">
            <Link
              href="/tools/eip-builder"
              className="inline-flex h-8 items-center justify-center gap-1 whitespace-nowrap rounded-md border border-primary/30 bg-primary/10 px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
            >
              Explore EIP Builder
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </section>
      )}
      {activePersona === 'developer' && visibleSections.board && (
        <section
          style={{ order: sectionOrder.board }}
          className="mb-6 border-t border-border/70 pt-6"
          id="developer-board-snapshot"
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <h2 className={sectionTitleClass}>Board</h2>
                <CopyLinkButton sectionId="developer-board-snapshot" tooltipLabel="Copy link" />
              </div>
              <p className={sectionSubtitleClass}>
                Compact open PR snapshot from the{' '}
                <Link href="/tools/board" className="text-primary underline-offset-2 hover:underline">
                  Editing Board
                </Link>
                .
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                aria-label="Board repository filter"
                value={developerRepoFilter}
                onChange={(e) => setDeveloperRepoFilter(e.target.value as DeveloperRepoFilter)}
                className="h-8 rounded-md border border-border bg-muted/40 px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <option value="">All Repos</option>
                <option value="eips">EIPs</option>
                <option value="ercs">ERCs</option>
                <option value="rips">RIPs</option>
              </select>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-border/70 bg-card/60 shadow-sm">
            <div className="hidden md:block">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b border-border/70 bg-muted/40 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="w-20 px-3 py-2">PR</th>
                    <th className="px-3 py-2">Title</th>
                    <th className="w-28 px-3 py-2">Author</th>
                    <th className="w-20 px-3 py-2">Wait</th>
                    <th className="w-28 px-3 py-2">Process</th>
                    <th className="w-36 px-3 py-2">Status</th>
                    <th className="w-16 px-3 py-2 text-center">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {developerBoardLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={`dev-board-skeleton-${i}`} className="border-b border-border/60">
                        <td colSpan={7} className="px-3 py-2.5">
                          <div className="h-4 animate-pulse rounded bg-muted" />
                        </td>
                      </tr>
                    ))
                  ) : developerBoardRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">
                        No open PR rows found for this filter.
                      </td>
                    </tr>
                  ) : (
                    developerBoardRows.map((row) => {
                      const p = waitPriority(row.waitDays);
                      const stateTone = DEV_BOARD_GOVSTATE_BADGES[row.govState] || DEV_BOARD_GOVSTATE_BADGES.Uncategorized;
                      return (
                      <tr key={`dev-board-${row.repoShort}-${row.prNumber}`} className="border-b border-border/60 transition-colors hover:bg-muted/40">
                        <td className="px-3 py-2 font-mono font-semibold text-primary">#{row.prNumber}</td>
                        <td className="px-3 py-2">
                          <p className="truncate leading-snug text-foreground">{row.title || `PR #${row.prNumber}`}</p>
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
                        <td className="px-3 py-2 text-center">
                          <a
                            href={`https://github.com/${row.repo}/pull/${row.prNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] text-primary transition-colors hover:bg-primary/15"
                          >
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
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
          <div className="mt-4 flex justify-center">
            <Link
              href="/tools/board"
              className="inline-flex h-8 items-center justify-center gap-1 whitespace-nowrap rounded-md border border-primary/30 bg-primary/10 px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
            >
              Explore Board
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </section>
      )}
      {activePersona === 'builder' && visibleSections.board && (
        <section
          style={{ order: sectionOrder.board }}
          className="mb-6 border-t border-border/70 pt-6"
          id="builder-tool-shortcuts"
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2">
                <Wrench className="h-5 w-5 text-primary" />
                <h2 className={sectionTitleClass}>Tool Shortcuts</h2>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <p className={sectionSubtitleClass}>Jump directly into core contribution tools.</p>
                <CopyLinkButton sectionId="builder-tool-shortcuts" tooltipLabel="Copy link" />
              </div>
              <p className={sectionSubtitleClass}>Jump directly into core contribution tools.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { title: 'Editing Board', href: '/tools/board', blurb: 'Track active PR queues.', icon: GitPullRequest },
              { title: 'Timeline', href: '/tools/timeline', blurb: 'Proposal lifecycle flow.', icon: GitBranch },
              { title: 'Dependencies', href: '/tools/dependencies', blurb: 'Inter-proposal links.', icon: Network },
              { title: 'EIP Builder', href: '/tools/eip-builder', blurb: 'Draft with validation.', icon: Code },
            ].map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={`builder-tool-${tool.title}`}
                  href={tool.href}
                  className="group rounded-lg border border-border bg-card/60 px-3 py-3 transition hover:border-primary/40 hover:bg-primary/[0.05]"
                >
                  <div className="mb-1.5 inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{tool.title}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{tool.blurb}</p>
                </Link>
              );
            })}
          </div>
          <div className="mt-3 flex justify-center">
            <Link
              href="/tools"
              className="inline-flex h-8 items-center justify-center gap-1 whitespace-nowrap rounded-md border border-primary/30 bg-primary/10 px-2.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
            >
              Explore Tools
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </section>
      )}
      {activePersona === 'newcomer' && visibleSections.board && (
        <section
          style={{ order: sectionOrder.board }}
          className="mb-6 border-t border-border/70 pt-6"
          id="newcomer-tools-shortcuts"
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2">
                <Wrench className="h-5 w-5 text-primary" />
                <h2 className={sectionTitleClass}>Beginner-Friendly Tool Shortcuts</h2>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <p className={sectionSubtitleClass}>Start with the essential tools for exploration and contribution.</p>
                <CopyLinkButton sectionId="newcomer-tools-shortcuts" tooltipLabel="Copy link" />
              </div>
              <p className={sectionSubtitleClass}>Start with the essential tools for exploration and contribution.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { title: 'Tools Home', href: '/tools', blurb: 'See all available standards tools.', icon: Wrench },
              { title: 'Editing Board', href: '/tools/board', blurb: 'Understand current PR flow.', icon: GitPullRequest },
              { title: 'Timeline', href: '/tools/timeline', blurb: 'See proposal lifecycle changes.', icon: GitBranch },
              { title: 'Dependencies', href: '/tools/dependencies', blurb: 'Explore proposal relationships.', icon: Network },
            ].map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={`newcomer-tool-${tool.title}`}
                  href={tool.href}
                  className="rounded-lg border border-border bg-card/60 px-3 py-3 transition hover:border-primary/40 hover:bg-primary/[0.05]"
                >
                  <div className="mb-1.5 inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{tool.title}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{tool.blurb}</p>
                </Link>
              );
            })}
          </div>
          <div className="mt-3 flex justify-center">
            <Link
              href="/tools"
              className="inline-flex h-8 items-center justify-center gap-1 whitespace-nowrap rounded-md border border-primary/30 bg-primary/10 px-2.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
            >
              Explore Tools
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </section>
      )}
      {activePersona === 'editor' && visibleSections.reviewQueue && (
        <EditorReviewQueueSection
          sectionTitleClass={sectionTitleClass}
          sectionSubtitleClass={sectionSubtitleClass}
          editorRepoFilter={editorRepoFilter}
          setEditorRepoFilter={setEditorRepoFilter}
          orderedBoardProcessTypes={orderedBoardProcessTypes}
          boardProcessStats={boardProcessStats}
          selectedBoardProcesses={selectedBoardProcesses}
          setSelectedBoardProcesses={setSelectedBoardProcesses}
          boardPreviewLoading={boardPreviewLoading}
          boardPreviewRows={boardPreviewRows}
          boardPreviewTotal={boardPreviewTotal}
          editorQueuePage={editorQueuePage}
          boardPreviewTotalPages={boardPreviewTotalPages}
          setEditorQueuePage={setEditorQueuePage}
          boardProcessBadgeMap={BOARD_PROCESS_BADGES}
          githubRepoFromShort={githubRepoFromShort}
        />
      )}
      {activePersona === 'editor' && visibleSections.categoryBreakdown && (
        <EditorCategoryBreakdownSection
          sectionTitleClass={sectionTitleClass}
          sectionSubtitleClass={sectionSubtitleClass}
          monthLabelText={monthLabel(currentMonthYear)}
          currentMonthYear={currentMonthYear}
          setCurrentMonthYear={setCurrentMonthYear}
          monthYearOptions={monthYearOptions}
          editorRepoFilter={editorRepoFilter}
          setEditorRepoFilter={setEditorRepoFilter}
          boardPreviewLoading={boardPreviewLoading}
          categoryBreakdownChartOption={categoryBreakdownChartOption}
          participantCount={paginatedParticipantRows.length}
          editorCategoryPage={editorCategoryPage}
          editorCategoryTotalPages={editorCategoryTotalPages}
          setEditorCategoryPage={setEditorCategoryPage}
        />
      )}
      {visibleSections.browse && (
      <div
        style={activePersona === 'editor' ? undefined : { order: sectionOrder.browse }}
        className={cn('mb-6', activePersona === 'editor' && 'border-t border-border/70 pt-6')}
        id={activePersona === 'builder' ? 'builder-browse-snapshot' : 'editor-browse-snapshot'}
      >
      <div className="mb-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start">
            <div>
              <div className="inline-flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                <h2 className={sectionTitleClass}>
                  Browse by Status, Category, Repository & Stages
                </h2>
                <CopyLinkButton
                  sectionId={activePersona === 'builder' ? 'builder-browse-snapshot' : 'editor-browse-snapshot'}
                  tooltipLabel="Copy link"
                  className="h-8 w-8 rounded-md"
                />
              </div>
              <p className={sectionSubtitleClass}>
                {activePersona === 'builder'
                  ? 'ERC-focused browse view with quick status/category/repository checks.'
                  : 'Explore a compact snapshot here, then jump to full explorer tools.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(() => {
              const BrowseIcon =
                dimension === 'status'
                  ? Activity
                  : dimension === 'category'
                    ? Layers
                    : dimension === 'repo'
                      ? GitBranch
                      : Package;
              return (
                <span className="relative inline-flex">
                  <BrowseIcon className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-primary" />
                  <select
                    aria-label="Browse dimension"
                    value={dimension}
                    onChange={(e) => {
                      setActiveBucket(null);
                      setPage(1);
                      setDimension(e.target.value as Dimension);
                    }}
                    className="h-8 rounded-md border border-border bg-card/70 pr-8 pl-7 text-xs font-medium text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  >
                    <option value="status">Status</option>
                    <option value="category">Category</option>
                    <option value="repo">Repo</option>
                    {activePersona !== 'builder' && <option value="stages">Stages</option>}
                  </select>
                </span>
              );
            })()}
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 min-[520px]:grid-cols-2 lg:grid-cols-4">
        {(dimension === 'stages' ? stagesDistributionLoading : showDistributionSkeleton) ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={`dist-skeleton-${i}`}
              className="rounded-xl border border-border/70 bg-card/60 p-3 shadow-sm"
            >
              <div className="mb-2 h-7 w-7 animate-pulse rounded-lg bg-muted" />
              <div className="mb-1 h-3 w-24 animate-pulse rounded bg-muted" />
              <div className="mb-2 h-7 w-16 animate-pulse rounded bg-muted" />
              <div className="h-1.5 w-full animate-pulse rounded-full bg-muted" />
            </div>
          ))
        ) : (
          <>
        <button
          type="button"
          onClick={() => setActiveBucket(null)}
          className={cn(
            'group relative overflow-hidden rounded-xl border px-3 py-3 text-left transition hover:-translate-y-px active:translate-y-0 motion-reduce:transform-none shadow-sm',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35',
            activeBucket === null
              ? cn(
                  'persona-drift-glow border-primary/50 bg-primary/10',
                  'shadow-[0_0_0_1px_rgb(var(--persona-accent-rgb)/0.24),0_10px_28px_rgb(var(--persona-accent-rgb)/0.10)]',
                  'ring-1 ring-primary/40',
                  'before:pointer-events-none before:absolute before:inset-0 before:rounded-xl before:bg-[radial-gradient(420px_circle_at_30%_10%,rgba(var(--persona-accent-rgb),0.20),transparent_60%)]',
                )
              : 'border-border/70 bg-card/60 hover:border-primary/40 hover:bg-primary/[0.05]',
          )}
        >
          <div className="relative z-10">
          <div
            className={cn(
              'mb-1 inline-flex h-7 w-7 items-center justify-center rounded-lg',
              activeBucket === null ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary',
            )}
          >
            <Layers className="h-3 w-3" />
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total</p>
          <p className="mt-1 text-2xl font-semibold leading-none text-foreground sm:text-3xl">{dimension === 'stages' ? stagesDistribution.reduce((s, r) => s + r.count, 0).toLocaleString() : totalCount.toLocaleString()}</p>
          </div>
        </button>

        {(dimension === 'stages' ? stagesDistribution : distribution).map((row) => {
          const isStages = dimension === 'stages';
          const totalForDimension = isStages ? stagesDistribution.reduce((s, r) => s + r.count, 0) : totalCount;
          const maxForDimension = isStages ? Math.max(1, ...stagesDistribution.map((r) => r.count)) : maxCardCount;
          const pct = totalForDimension > 0 ? Math.round((row.count / totalForDimension) * 100) : 0;
          const selected = activeBucket === row.bucket;
          const barColor = selected ? (isStages ? (STAGE_COLORS[row.bucket] || 'bg-cyan-500') : (STATUS_COLORS[row.bucket] || 'bg-cyan-500')) : 'bg-muted-foreground/40';
          const theme = getBucketTheme(dimension, row.bucket);
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
                'group relative overflow-hidden rounded-xl border px-3 py-2 text-left transition hover:-translate-y-px active:translate-y-0 motion-reduce:transform-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35',
                selected
                  ? cn(
                      theme.border, theme.surface,
                      'shadow-[0_0_0_1px_rgb(var(--persona-accent-rgb)/0.12),0_6px_16px_rgb(var(--persona-accent-rgb)/0.06)]',
                      'ring-1 ring-primary/30',
                    )
                  : 'border-border bg-card/60 hover:border-primary/30',
              )}
            >
              <div className="relative z-10">
              <div
                className={cn(
                  'mb-1.5 inline-flex h-7 w-7 items-center justify-center rounded-lg transition-colors',
                  selected ? theme.iconWrap : 'bg-muted/60',
                )}
              >
                <Icon className={cn('h-3.5 w-3.5', selected ? theme.icon : 'text-muted-foreground')} />
              </div>
              <div className="mb-0.5 flex items-center justify-between gap-2">
                <p
                  className={cn(
                    'truncate text-[13px] font-medium leading-tight',
                    selected ? theme.title : 'text-muted-foreground',
                  )}
                >
                  {displayLabel}
                </p>
                <span className="text-[10px] text-muted-foreground">{pct}%</span>
              </div>
              <p className="text-xl font-semibold leading-none tracking-tight text-foreground sm:text-2xl">{row.count.toLocaleString()}</p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted/80">
                <div className={`h-full ${barColor}`} style={{ width: `${Math.max(8, (row.count / maxForDimension) * 100)}%` }} />
              </div>
              </div>
            </button>
          );
        })}
          </>
        )}
      </div>

      {/* Stages context note */}
      {dimension === 'stages' && !stagesDistributionLoading && stagesDistribution.length > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3.5 py-2 text-xs text-muted-foreground">
          <Package className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span>
            Showing EIP inclusion stages across all active network upgrades including{' '}
            <Link href="/upgrade/glamsterdam" className="font-semibold text-primary hover:underline">
              Glamsterdam
            </Link>
            {' & '}
            <Link href="/upgrade/hegota" className="font-semibold text-primary hover:underline">
              Hegota
            </Link>
            .{' '}
            <Link href="/upgrade" className="text-primary hover:underline">
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
            transition={{ duration: 0.25 }}
            className="mb-3 overflow-hidden"
          >
            <div className="rounded-xl border border-border bg-card/60 px-3.5 py-2.5">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Filter className="h-3.5 w-3.5" />
                  <span>Filter <span className="font-semibold text-foreground">{activeBucket}</span> by Status</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSubFilter(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                  aria-label="Hide sub-filter"
                >
                  ×
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveStatusFilter(null)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                    activeStatusFilter === null
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-border bg-muted/50 text-muted-foreground hover:border-primary/30 hover:text-foreground',
                  )}
                >
                  All ({statusSubDist.reduce((s, r) => s + r.count, 0).toLocaleString()})
                </button>
                {statusSubDist.map((row) => {
                  const active = activeStatusFilter === row.status;
                  const dotColor = STATUS_COLORS[row.status] || 'bg-muted-foreground';
                  return (
                    <button
                      key={row.status}
                      type="button"
                      onClick={() => setActiveStatusFilter(active ? null : row.status)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                        active
                          ? (BADGE_COLORS[row.status] || 'border-primary/40 bg-primary/10 text-primary')
                          : 'border-border bg-muted/50 text-muted-foreground hover:border-primary/30 hover:text-foreground',
                      )}
                    >
                      <span className={cn('h-1.5 w-1.5 rounded-full', dotColor)} />
                      {row.status} ({row.count.toLocaleString()})
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
            transition={{ duration: 0.25 }}
            className="mb-3 overflow-hidden"
          >
            <div className="rounded-xl border border-border bg-card/60 px-3.5 py-2.5">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Filter className="h-3.5 w-3.5" />
                  <span>Filter <span className="font-semibold text-foreground">{activeBucket}</span> by Category</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSubFilter(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                  aria-label="Hide sub-filter"
                >
                  ×
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveCategoryFilter(null)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                    activeCategoryFilter === null
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-border bg-muted/50 text-muted-foreground hover:border-primary/30 hover:text-foreground',
                  )}
                >
                  All ({categorySubDist.reduce((s, r) => s + r.count, 0).toLocaleString()})
                </button>
                {categorySubDist.map((row) => {
                  const active = activeCategoryFilter === row.category;
                  const theme = BUCKET_THEME_BY_CATEGORY[row.category];
                  return (
                    <button
                      key={row.category}
                      type="button"
                      onClick={() => setActiveCategoryFilter(active ? null : row.category)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                        active
                          ? cn(theme?.border || 'border-primary/40', theme?.surface || 'bg-primary/10', 'text-foreground')
                          : 'border-border bg-muted/50 text-muted-foreground hover:border-primary/30 hover:text-foreground',
                      )}
                    >
                      <span className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        active ? (theme?.icon?.replace('text-', 'bg-').split(' ')[0] || 'bg-primary') : 'bg-muted-foreground/60',
                      )} />
                      {row.category} ({row.count.toLocaleString()})
                    </button>
                  );
                })}
              </div>
              {categorySubDistLoading && (
                <div className="mt-1.5 text-[10px] text-muted-foreground">Loading…</div>
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
            transition={{ duration: 0.25 }}
            className="mb-3 overflow-hidden"
          >
            <div className="rounded-xl border border-border bg-card/60 px-3.5 py-2.5">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Filter className="h-3.5 w-3.5" />
                  <span>Filter <span className="font-semibold text-foreground">{STAGE_FULL_LABELS[activeBucket] || activeBucket}</span> by Status</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSubFilter(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                  aria-label="Hide sub-filter"
                >
                  ×
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveStatusFilter(null)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                    activeStatusFilter === null
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-border bg-muted/50 text-muted-foreground hover:border-primary/30 hover:text-foreground',
                  )}
                >
                  All ({stageStatusSubDist.reduce((s, r) => s + r.count, 0).toLocaleString()})
                </button>
                {stageStatusSubDist.map((row) => {
                  const active = activeStatusFilter === row.status;
                  const dotColor = STATUS_COLORS[row.status] || 'bg-muted-foreground';
                  return (
                    <button
                      key={row.status}
                      type="button"
                      onClick={() => setActiveStatusFilter(active ? null : row.status)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                        active
                          ? (BADGE_COLORS[row.status] || 'border-primary/40 bg-primary/10 text-primary')
                          : 'border-border bg-muted/50 text-muted-foreground hover:border-primary/30 hover:text-foreground',
                      )}
                    >
                      <span className={cn('h-1.5 w-1.5 rounded-full', dotColor)} />
                      {row.status} ({row.count.toLocaleString()})
                    </button>
                  );
                })}
              </div>
              {stageStatusSubDistLoading && (
                <div className="mt-1.5 text-[10px] text-muted-foreground">Loading…</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          Proposal table view{activePersona === 'editor' ? ' (hidden by default for editor workflow)' : ''}
        </p>
        <button
          type="button"
          onClick={() => setShowProposalTable((prev) => !prev)}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground hover:border-primary/30 hover:text-primary"
        >
          {showProposalTable ? 'Hide table' : 'Show table'}
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showProposalTable && 'rotate-180')} />
        </button>
      </div>

      <div className="mb-6 overflow-hidden rounded-xl border border-border bg-card/60">
        <div className="flex flex-col items-start justify-between gap-2 border-b border-border/70 bg-muted/40 px-4 py-3 text-xs sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">
            {isTableFiltered ? 'Filtered proposals' : 'Total proposals'}:{' '}
            <span className="font-semibold text-foreground">{tableData?.total.toLocaleString() || 0}</span>
            </span>
            {activeBucket && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {dimension}: <span className="text-foreground">{activeBucket}</span>
                <button
                  type="button"
                  onClick={() => setActiveBucket(null)}
                  className="ml-1 rounded-full px-1 text-muted-foreground hover:text-foreground"
                  aria-label="Clear active bucket"
                >
                  ×
                </button>
              </span>
            )}
            {tableLoading && (
              <span className="inline-flex items-center rounded-full border border-border bg-muted/60 px-2.5 py-1">
                <InlineBrandLoader
                  size="sm"
                  label="Updating…"
                  className="flex-row gap-2 [&>span]:text-[10px] [&>span]:font-semibold [&>span]:uppercase [&>span]:tracking-wider"
                />
              </span>
            )}
          </div>
          <button
            onClick={downloadDetailedCSV}
            disabled={downloading}
            className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/15 disabled:opacity-60"
          >
            <Download className="h-3.5 w-3.5" />
            {downloading ? 'Exporting...' : (isTableFiltered ? 'Download Filtered CSV' : 'Download CSV')}
          </button>
        </div>
        {showProposalTable ? (
          <>
        <div className="relative hidden overflow-x-auto md:block" aria-busy={tableLoading}>
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
                  ...(dimension === 'stages' ? [['updated_at', 'Upgrade']] : []),
                ].map(([key, label]) => (
                  <th key={key} className="px-4 py-3">
                    <button onClick={() => toggleSort(key as SortBy)} className="inline-flex items-center gap-1 hover:text-foreground">
                      {label}
                      {sortBy === key ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3" />}
                    </button>
                  </th>
                ))}
              </tr>
              <tr className="border-b border-border/60 bg-muted/40">
                <th className="px-4 py-3"><input value={columnSearch.github} onChange={(e) => handleColumnSearch('github', e.target.value)} placeholder="/EIPs" className="h-9 w-full rounded-md border border-border bg-muted/60 px-3 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30" /></th>
                <th className="px-4 py-3"><input value={eipDisplayValue} onChange={(e) => handleColumnSearch('eip', e.target.value)} placeholder="/EIP-1559" className="h-9 w-full rounded-md border border-border bg-muted/60 px-3 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30" /></th>
                <th className="px-4 py-3"><input value={columnSearch.title} onChange={(e) => handleColumnSearch('title', e.target.value)} placeholder="Title" className="h-9 w-full rounded-md border border-border bg-muted/60 px-3 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30" /></th>
                <th className="px-4 py-3"><input value={columnSearch.author} onChange={(e) => handleColumnSearch('author', e.target.value)} placeholder="Author" className="h-9 w-full rounded-md border border-border bg-muted/60 px-3 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30" /></th>
                <th className="px-4 py-3"><input value={columnSearch.type} onChange={(e) => handleColumnSearch('type', e.target.value)} placeholder="Type" className="h-9 w-full rounded-md border border-border bg-muted/60 px-3 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30" /></th>
                <th className="px-4 py-3"><input value={columnSearch.category} onChange={(e) => handleColumnSearch('category', e.target.value)} placeholder="Category" className="h-9 w-full rounded-md border border-border bg-muted/60 px-3 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30" /></th>
                <th className="px-4 py-3"><input value={columnSearch.status} onChange={(e) => handleColumnSearch('status', e.target.value)} placeholder="Status" className="h-9 w-full rounded-md border border-border bg-muted/60 px-3 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30" /></th>
                {dimension === 'stages' && <th className="px-4 py-3"><input value={columnSearch.upgrade} onChange={(e) => handleColumnSearch('upgrade', e.target.value)} placeholder="Upgrade" className="h-9 w-full rounded-md border border-border bg-muted/60 px-3 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30" /></th>}
              </tr>
            </thead>
            <tbody>
              {showTableSkeleton ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td colSpan={dimension === 'stages' ? 8 : 7} className="px-2 py-3">
                      <div className="h-5 animate-pulse rounded bg-muted" />
                    </td>
                  </tr>
                ))
              ) : (
                (tableData?.rows || []).map((row) => (
                  <tr key={`${row.repo}-${row.kind}-${row.number}`} className="border-b border-border/60 text-foreground hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <a
                        href={githubProposalUrl(row.kind, row.number)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {githubRepoLabel(row.repo, row.kind)}
                      </a>
                    </td>
                    <td className="px-4 py-3 font-medium text-primary">
                      <Link href={proposalUrl(row.repo, row.kind, row.number)} className="hover:underline">{row.kind}-{row.number}</Link>
                    </td>
                    <td className="max-w-[420px] px-4 py-3 text-foreground">{row.title || `${row.kind}-${row.number}`}</td>
                    <td className="px-4 py-3 text-muted-foreground">
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
                    <td className="px-4 py-3 text-muted-foreground">{row.type || '-'}</td>
                    <td className="px-4 py-3">{row.category}</td>
                    <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] ${BADGE_COLORS[row.status] || BADGE_COLORS.Unknown}`}>{row.status}</span></td>
                    {dimension === 'stages' && (
                      <td className="px-4 py-3">
                        {(row as typeof row & { upgradeName?: string | null }).upgradeName ? (
                          <Link
                            href={`/upgrade/${(row as typeof row & { upgradeName?: string | null }).upgradeName!.toLowerCase()}`}
                            className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-primary hover:underline"
                          >
                            <Package className="h-3 w-3" />
                            {(row as typeof row & { upgradeName?: string | null }).upgradeName}
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">–</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {tableLoading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/55 backdrop-blur-[2px]">
              <InlineBrandLoader size="md" label="Updating table…" className="flex-row gap-3" />
            </div>
          )}
        </div>

        <div className="relative space-y-2 p-2 md:hidden" aria-busy={tableLoading}>
          {showTableSkeleton ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={`mobile-row-skeleton-${i}`} className="rounded-lg border border-border bg-muted/40 p-3">
                <div className="mb-2 h-4 w-28 animate-pulse rounded bg-muted" />
                <div className="mb-1.5 h-3 w-full animate-pulse rounded bg-muted" />
                <div className="mb-1.5 h-3 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
              </div>
            ))
          ) : (
            (tableData?.rows || []).map((row) => (
              <div key={`mobile-${row.repo}-${row.kind}-${row.number}`} className="rounded-lg border border-border bg-card/70 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Link href={proposalUrl(row.repo, row.kind, row.number)} className="text-sm font-semibold text-primary hover:underline">
                    {row.kind}-{row.number}
                  </Link>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] ${BADGE_COLORS[row.status] || BADGE_COLORS.Unknown}`}>
                    {row.status}
                  </span>
                </div>
                <p className="mb-1 line-clamp-2 text-sm text-foreground">{row.title || `${row.kind}-${row.number}`}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>{row.type || '-'}</span>
                  <span>{row.category}</span>
                  <a
                    href={githubProposalUrl(row.kind, row.number)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {githubRepoLabel(row.repo, row.kind)}
                  </a>
                </div>
              </div>
            ))
          )}

          {tableLoading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-background/55 backdrop-blur-[2px]">
              <InlineBrandLoader size="md" label="Updating table…" className="flex-row gap-3" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>{isTableFiltered ? 'Filtered results' : 'Results'}: {tableData?.total.toLocaleString() || 0}</span>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
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
          </>
        ) : (
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              Proposal table is hidden for faster scanning. Click <span className="font-medium text-foreground">Show table</span> when you need detailed rows.
            </p>
          </div>
        )}
      </div>
      <div className="mt-3 flex justify-center">
        <Link
          href="/explore"
          className="inline-flex h-8 items-center justify-center gap-1 whitespace-nowrap rounded-md border border-primary/30 bg-primary/10 px-2.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
        >
          Explore Browse
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      </div>
      )}
      {visibleSections.reference && (
        <section
          className={cn('mb-6', activePersona === 'editor' && 'border-t border-border/70 pt-6')}
          style={activePersona === 'editor' ? { order: 99 } : { order: sectionOrder.learning }}
          id="home-reference"
        >
          {activePersona === 'editor' && (
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <div className="inline-flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h2 className={sectionTitleClass}>Reference</h2>
                  <CopyLinkButton sectionId="home-reference" tooltipLabel="Copy link" />
                </div>
                <p className={sectionSubtitleClass}>Key FAQs and guidance for standards workflow.</p>
              </div>
            </div>
          )}
          <HomeFAQs categoryBreakdown={faqCategoryBreakdown} statusDist={faqStatusDist} />
          {activePersona === 'editor' && (
            <div className="mt-3 flex justify-center">
              <Link
                href="/resources/faq"
                className="inline-flex h-8 items-center justify-center gap-1 whitespace-nowrap rounded-md border border-primary/30 bg-primary/10 px-2.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
              >
                Explore FAQ
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </section>
      )}
      {visibleSections.monthly && (
      <div
        style={activePersona === 'editor' ? undefined : { order: sectionOrder.monthly }}
        className={cn(activePersona === 'editor' && 'mb-6 border-t border-border/70 pt-6')}
        id="editor-monthly-insight"
      >
      {activePersona !== 'editor' && visibleSections.monthly && <hr className="my-6 border-border" />}

      {activePersona === 'editor' && (
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <h2 className={sectionTitleClass}>Monthly Insight & Editor Leaderboard</h2>
              <CopyLinkButton sectionId="editor-monthly-insight" tooltipLabel="Copy link" />
            </div>
            <p className={sectionSubtitleClass}>Monthly status distribution and editor activity snapshot.</p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="homepage-month-select-editor" className="text-xs font-medium text-muted-foreground">
              Month
            </label>
            <select
              id="homepage-month-select-editor"
              value={currentMonthYear}
              onChange={(e) => setCurrentMonthYear(e.target.value)}
              className="h-8 rounded-md border border-border bg-muted/40 px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              {monthYearOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {activePersona !== 'editor' && (
      <div className="mb-3 flex items-center justify-end gap-2">
        <label htmlFor="homepage-month-select-default" className="text-xs font-medium text-muted-foreground">
          Month
        </label>
        <select
          id="homepage-month-select-default"
          value={currentMonthYear}
          onChange={(e) => setCurrentMonthYear(e.target.value)}
          className="h-8 rounded-md border border-border bg-muted/40 px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          {monthYearOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <div
          className={cn(
            'self-start rounded-xl border border-border bg-card/60 p-4 shadow-sm flex flex-col',
            activePersona === 'editor' ? 'h-[460px] sm:h-[500px]' : 'h-[560px] sm:h-[620px]',
          )}
        >
          <div className="mb-3 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <h3 className={panelTitleClass}>{monthLabel(currentMonthYear)} Insight (Status Changes)</h3>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Monthly status distribution.
              </p>
            </div>
            <div className="inline-flex items-center gap-2">
              <Link
                href={`/insights/year-month-analysis?month=${currentMonthYear}`}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:underline"
              >
                Explore Month Analysis
                <ArrowRight className="h-3 w-3" />
              </Link>
              <button
                onClick={downloadMonthlyInsightCSV}
                disabled={downloading}
                aria-label="Download status changes CSV"
                title="Download status changes CSV"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-muted/40 text-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary disabled:opacity-60"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="relative mt-2 min-h-0 flex-1">
            <div className="h-full w-full">
              {showInsightSkeleton ? (
                <div className="h-full w-full animate-pulse rounded-xl bg-muted" />
              ) : febDelta.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                  <Activity className="h-8 w-8 text-muted-foreground/35" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">No status changes yet</p>
                    <p className="mt-1 text-xs text-muted-foreground/70">
                      We&apos;ll populate this chart when transitions start in {monthLabel(currentMonthYear)}.
                    </p>
                  </div>
                </div>
              ) : (
                <ReactECharts
                  option={febInsightDonutOption}
                  style={{ height: '100%', width: '100%' }}
                  opts={{ renderer: 'svg' }}
                />
              )}
            </div>
            {!showInsightSkeleton && febDelta.length > 0 && (
              <div className="pointer-events-none absolute bottom-3 right-3 rounded-md border border-border/70 bg-background/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80 backdrop-blur-sm">
                EIPsInsight.com
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/70 pt-3">
            {monthlyDeltaUpdatedAt ? (
              <LastUpdated
                timestamp={monthlyDeltaUpdatedAt}
                prefix="Updated"
                showAbsolute
                className="bg-muted/40 text-xs"
              />
            ) : (
              <span className="rounded-md bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
                No status changes recorded for this period
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              Monthly activity snapshot
            </span>
          </div>
        </div>

        <div
          className={cn(
            'rounded-xl border border-border bg-card/60 p-4 shadow-sm flex flex-col',
            activePersona === 'editor' ? 'h-[460px] sm:h-[500px]' : 'h-[560px] sm:h-[620px]',
          )}
        >
          <>
              <div className="mb-3 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-primary" />
                    <h3 className={panelTitleClass}>Editor Leaderboard ({monthLabel(currentMonthYear)})</h3>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Ranked by editor actions this month (open + closed PRs).
                  </p>
                </div>
                <div className="inline-flex items-center gap-2">
                  <Link
                    href="/analytics/editors"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:underline"
                  >
                    Explore Editor Leaderboard
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                  <button
                    onClick={downloadLeaderboardDetailedCSV}
                    disabled={downloadingLeaderboard}
                    aria-label="Download editor leaderboard CSV"
                    title="Download editor leaderboard CSV"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-primary/40 bg-primary/10 text-primary hover:bg-primary/15 disabled:opacity-60"
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

              <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/70 pt-3">
                {monthlyLeaderboardUpdatedAt ? (
                  <LastUpdated
                    timestamp={monthlyLeaderboardUpdatedAt}
                    prefix="Updated"
                    showAbsolute
                    className="bg-muted/40 text-xs"
                  />
                ) : (
                  <span className="rounded-md bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
                    No editor activity recorded for this period
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  Monthly editor activity snapshot
                </span>
              </div>
          </>
        </div>
      </div>

      {activePersona === 'editor' && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link
            href="/insights/year-month-analysis"
            className="inline-flex h-8 items-center justify-center gap-1 whitespace-nowrap rounded-md border border-primary/30 bg-primary/10 px-2.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
          >
            Explore Month Analysis
            <ArrowRight className="h-3 w-3" />
          </Link>
          <Link
            href="/analytics/editors"
            className="inline-flex h-8 items-center justify-center gap-1 whitespace-nowrap rounded-md border border-primary/30 bg-primary/10 px-2.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
          >
            Explore Editor Leaderboard
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      </div>
      )}
      {visibleSections.governance && (
      <div
        style={activePersona === 'editor' ? undefined : { order: sectionOrder.governance }}
        className={cn(activePersona === 'editor' && 'border-t border-border/70 pt-6')}
      >
      {activePersona !== 'editor' && visibleSections.governance && <hr className="my-6 border-border" />}

      <section className="mb-6 w-full" id="recent-governance-activity">
        <div className="mb-4 flex flex-col items-start gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <h2 className={sectionTitleClass}>
                {(activePersona === 'developer' || activePersona === 'builder') ? 'Recent Activity' : 'Recent Governance Activity'}
              </h2>
              <CopyLinkButton sectionId="recent-governance-activity" tooltipLabel="Copy link" />
            </div>
            <p className={sectionSubtitleClass}>
              {(activePersona === 'developer' || activePersona === 'builder')
                ? 'Latest governance and PR movement with actor context and proposal links.'
                : 'Latest status transitions with actor context, proposal links, and lifecycle details.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/analytics/prs"
              className="inline-flex h-8 items-center justify-center gap-1 whitespace-nowrap rounded-md border border-primary/30 bg-primary/10 px-2.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
            >
              Explore PR Analytics
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
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

          <aside className="self-start rounded-xl border border-border bg-card/60 p-3 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Latest Editor Activity</h3>
              <span className="rounded-full bg-muted/70 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {recentEditorActivities.length}
              </span>
            </div>
            <p className="mb-2 text-[11px] text-muted-foreground">Ranked by editor actions this month (open + closed PRs).</p>
            <div className="space-y-2">
              {widgetsLoading && recentEditorActivities.length === 0 ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={`review-skeleton-${i}`} className="rounded-lg border border-border p-2">
                    <div className="mb-1 h-3 w-24 animate-pulse rounded bg-muted" />
                    <div className="mb-1 h-3 w-full animate-pulse rounded bg-muted" />
                    <div className="h-2 w-20 animate-pulse rounded bg-muted" />
                  </div>
                ))
              ) : recentEditorActivities.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No editor activities found for this month.
                </p>
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
                        <p className="truncate text-xs font-medium text-foreground">#{idx + 1} {item.editor}</p>
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

      </div>
      )}
      {visibleSections.social && activePersona === 'editor' && (
      <section
        style={activePersona === 'editor' ? undefined : { order: sectionOrder.social }}
        className={cn(activePersona === 'editor' && 'border-t border-border/70 pt-6')}
      >
        <SocialCommunityUpdates
          showCommunityResources={activePersona !== 'editor'}
          sectionTitleClass={sectionTitleClass}
          sectionSubtitleClass={sectionSubtitleClass}
        />
      </section>
      )}
      {visibleSections.social && activePersona === 'builder' && (
        <section
          style={{ order: sectionOrder.social }}
          className="mb-2 border-t border-border/70 pt-6"
          id="builder-practical-resources"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                <h2 className={sectionTitleClass}>Practical Resources</h2>
                <CopyLinkButton sectionId="builder-practical-resources" tooltipLabel="Copy link" />
              </div>
              <p className={sectionSubtitleClass}>Documentation and references to contribute effectively.</p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {[
              { title: 'Docs', href: '/resources/docs', desc: 'Standards workflow guides and references.' },
              { title: 'Resources', href: '/resources', desc: 'Knowledge hub for contributors and builders.' },
              { title: 'FAQ', href: '/resources/faq', desc: 'Quick answers to common standards questions.' },
            ].map((item) => (
              <Link
                key={`builder-resource-${item.title}`}
                href={item.href}
                className="rounded-lg border border-border bg-card/60 px-3 py-3 transition hover:border-primary/35 hover:bg-primary/[0.04]"
              >
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{item.desc}</p>
              </Link>
            ))}
          </div>
          <div className="mt-3 flex justify-center">
            <Link
              href="/resources/docs"
              className="inline-flex h-8 items-center justify-center gap-1 whitespace-nowrap rounded-md border border-primary/30 bg-primary/10 px-2.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
            >
              Explore Resources
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </section>
      )}
      </PersonaDashboardComponent>
    </div>
  );
}
