'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { client } from '@/lib/orpc';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { X } from 'lucide-react';
import {
  ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight,
  Download, Loader2, FileText, Layers, Info, Code, FileCode2,
  Cpu, Network, Boxes, Eye, Bell, CheckCircle2, Zap, Pause,
  XCircle, GitCommitHorizontal, LayoutGrid, BarChart3,
  Activity, TrendingUp, Timer, Users, ArrowRight,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { EIPsPageHeader } from './_components/eips-page-header';
import HomeFAQs from './_components/home-faqs';
import SocialCommunityUpdates from '../landing/_components/social-community-updates';

// ────────────────────────────────────────────────────────────────
// TYPES & CONSTANTS
// ────────────────────────────────────────────────────────────────

type ViewMode = 'type' | 'status';

interface TabDef {
  id: string; label: string;
  filter?: { category?: string[]; type?: string[]; status?: string[] };
  isRip?: boolean; description: string; icon: React.ReactNode;
}

const TYPE_TABS: TabDef[] = [
  { id: 'all', label: 'All', description: 'All Ethereum proposals across every type and category.', icon: <Layers className="h-3.5 w-3.5" /> },
  { id: 'core', label: 'Core', filter: { category: ['Core'] }, description: 'Improvements requiring a consensus fork or relevant to core dev discussions.', icon: <Cpu className="h-3.5 w-3.5" /> },
  { id: 'networking', label: 'Networking', filter: { category: ['Networking'] }, description: 'Improvements around devp2p, Light Ethereum Subprotocol, and network protocol specifications.', icon: <Network className="h-3.5 w-3.5" /> },
  { id: 'interface', label: 'Interface', filter: { category: ['Interface'] }, description: 'Improvements around client API/RPC specifications and language-level standards.', icon: <Code className="h-3.5 w-3.5" /> },
  { id: 'erc', label: 'ERC', filter: { category: ['ERC'] }, description: 'Application-level standards including token standards, name registries, and account abstraction.', icon: <FileCode2 className="h-3.5 w-3.5" /> },
  { id: 'meta', label: 'Meta', filter: { type: ['Meta'] }, description: 'Process proposals that apply to areas other than the Ethereum protocol itself.', icon: <Boxes className="h-3.5 w-3.5" /> },
  { id: 'informational', label: 'Informational', filter: { type: ['Informational'] }, description: 'General guidelines or information for the Ethereum community.', icon: <Info className="h-3.5 w-3.5" /> },
  { id: 'rips', label: 'RIPs', isRip: true, description: 'Rollup Improvement Proposals for the Ethereum rollup ecosystem.', icon: <GitCommitHorizontal className="h-3.5 w-3.5" /> },
];

const STATUS_TABS: TabDef[] = [
  { id: 'all', label: 'All', description: 'All Ethereum proposals across every status.', icon: <Layers className="h-3.5 w-3.5" /> },
  { id: 'draft', label: 'Draft', filter: { status: ['Draft'] }, description: 'The first formally tracked stage of an EIP in development.', icon: <FileText className="h-3.5 w-3.5" /> },
  { id: 'review', label: 'Review', filter: { status: ['Review'] }, description: 'EIPs marked as ready for and requesting Peer Review.', icon: <Eye className="h-3.5 w-3.5" /> },
  { id: 'last-call', label: 'Last Call', filter: { status: ['Last Call'] }, description: 'The final review window for an EIP before moving to Final.', icon: <Bell className="h-3.5 w-3.5" /> },
  { id: 'final', label: 'Final', filter: { status: ['Final'] }, description: 'EIPs that represent the final standard and exist in a state of finality.', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  { id: 'living', label: 'Living', filter: { status: ['Living'] }, description: 'EIPs designed to be continually updated and not reach a state of finality.', icon: <Zap className="h-3.5 w-3.5" /> },
  { id: 'stagnant', label: 'Stagnant', filter: { status: ['Stagnant'] }, description: 'EIPs in Draft or Review that have been inactive for 6 months or greater.', icon: <Pause className="h-3.5 w-3.5" /> },
  { id: 'withdrawn', label: 'Withdrawn', filter: { status: ['Withdrawn'] }, description: 'EIPs whose authors have withdrawn the proposal. This state has finality.', icon: <XCircle className="h-3.5 w-3.5" /> },
  { id: 'rips', label: 'RIPs', isRip: true, description: 'Rollup Improvement Proposals for the Ethereum rollup ecosystem.', icon: <GitCommitHorizontal className="h-3.5 w-3.5" /> },
];

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-slate-500/20 text-slate-600 dark:text-slate-300 border-slate-500/30', Review: 'bg-amber-500/20 text-amber-700 dark:text-amber-200 border-amber-500/30',
  'Last Call': 'bg-orange-500/20 text-orange-700 dark:text-orange-200 border-orange-500/30', Final: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  Stagnant: 'bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-500/30', Withdrawn: 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30',
  Living: 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
};
const STATUS_DOT_COLORS: Record<string, string> = {
  Draft: 'bg-slate-400', Review: 'bg-amber-400', 'Last Call': 'bg-orange-400', Final: 'bg-emerald-400',
  Stagnant: 'bg-gray-500', Withdrawn: 'bg-red-400', Living: 'bg-cyan-400',
};
const STATUS_TEXT_COLORS: Record<string, string> = {
  Draft: 'text-slate-600 dark:text-slate-300', Review: 'text-amber-600 dark:text-amber-300', 'Last Call': 'text-orange-600 dark:text-orange-300',
  Final: 'text-emerald-600 dark:text-emerald-400', Living: 'text-cyan-600 dark:text-cyan-300', Stagnant: 'text-gray-600 dark:text-gray-400', Withdrawn: 'text-red-600 dark:text-red-300',
};
const FUNNEL_COLORS: Record<string, string> = {
  Draft: 'bg-slate-500', Review: 'bg-amber-500', 'Last Call': 'bg-orange-500', Final: 'bg-emerald-500',
  Stagnant: 'bg-gray-600', Withdrawn: 'bg-red-500',
};
// Hex colors for pie chart (matches ui-reference status colors)
const STATUS_PIE_COLORS: Record<string, string> = {
  Draft: '#64748b', Review: '#f59e0b', 'Last Call': '#f97316', Final: '#10b981',
  Living: '#22d3ee', Stagnant: '#6b7280', Withdrawn: '#ef4444',
};
const MATRIX_STATUS_ORDER = ['Draft', 'Review', 'Last Call', 'Final', 'Living', 'Stagnant', 'Withdrawn'];

const EIP_SORT_FIELDS = ['number', 'title', 'status', 'type', 'category', 'created_at', 'updated_at', 'days_in_status', 'linked_prs'] as const;
const RIP_SORT_FIELDS = ['number', 'title', 'status', 'author', 'created_at', 'last_commit', 'commits'] as const;
type EipSortField = (typeof EIP_SORT_FIELDS)[number];
type RipSortField = (typeof RIP_SORT_FIELDS)[number];

// ────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] || 'bg-slate-500/20 text-slate-300 border-slate-500/30';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${c}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT_COLORS[status] || 'bg-slate-400'}`} />
      {status}
    </span>
  );
}

function SortIcon({ column, current, dir }: { column: string; current: string; dir: string }) {
  if (current !== column) return <ArrowUpDown className="ml-1 inline h-3 w-3 text-slate-500 dark:text-slate-700" />;
  return dir === 'asc' ? <ArrowUp className="ml-1 inline h-3 w-3 text-cyan-600 dark:text-cyan-400" /> : <ArrowDown className="ml-1 inline h-3 w-3 text-cyan-600 dark:text-cyan-400" />;
}

function TableSkeleton({ cols = 6 }: { cols?: number }) {
  return (
    <div className="space-y-1.5">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className={`h-7 animate-pulse rounded bg-slate-200 dark:bg-slate-800/40 ${j === 1 ? 'flex-1' : 'w-20'}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

function SectionCard({ title, icon, children, className = '' }: { title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/50 shadow-sm ${className}`}>
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800/60 px-4 py-2.5">
        <span className="text-cyan-600 dark:text-cyan-400/50">{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-500">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function SkeletonPulse({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-5 animate-pulse rounded bg-slate-200 dark:bg-slate-800/40" style={{ width: `${60 + (i * 17 % 40)}%` }} />
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// MAIN PAGE
// ────────────────────────────────────────────────────────────────

export default function EIPsHomePage() {
  const [viewMode, setViewMode] = useState<ViewMode>('type');
  const [activeTab, setActiveTab] = useState('all');
  const [columnSearch, setColumnSearch] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<string>('number');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Core data
  const [eipData, setEipData] = useState<{
    total: number; page: number; pageSize: number; totalPages: number;
    rows: Array<{ repo: string; number: number; title: string | null; author: string | null; status: string; type: string | null; category: string | null; createdAt: string | null; updatedAt: string | null }>;
  } | null>(null);
  const [ripData, setRipData] = useState<{
    total: number; page: number; pageSize: number; totalPages: number;
    rows: Array<{ number: number; title: string | null; status: string | null; author: string | null; createdAt: string | null; lastCommit: string | null; commits: number }>;
  } | null>(null);
  const [tableLoading, setTableLoading] = useState(true);
  const [kpis, setKpis] = useState<{ total: number; inReview: number; finalized: number; newThisYear: number } | null>(null);
  const [ripKpis, setRipKpis] = useState<{ total: number; active: number } | null>(null);
  const [categoryBreakdown, setCategoryBreakdown] = useState<Array<{ category: string; count: number }>>([]);
  const [statusDist, setStatusDist] = useState<Array<{ status: string; count: number }>>([]);
  const [matrixRaw, setMatrixRaw] = useState<Array<{ status: string; group: string; count: number }>>([]);
  const [exporting, setExporting] = useState(false);

  // Insight data (new sections)
  const [recentChanges, setRecentChanges] = useState<Array<{ eip: string; eip_type: string; title: string; from: string; to: string; days: number; statusColor: string; changed_at: Date }> | null>(null);
  const [upgradeImpact, setUpgradeImpact] = useState<Array<{ name: string; slug: string; total: number; finalized: number; inReview: number; draft: number; lastCall: number }> | null>(null);
  const [lifecycleFunnel, setLifecycleFunnel] = useState<Array<{ status: string; count: number }> | null>(null);
  const [repoDist, setRepoDist] = useState<Array<{ repo: string; proposals: number; activePRs: number; finals: number }> | null>(null);
  const [decisionVelocity, setDecisionVelocity] = useState<{ transitions: Array<{ from: string; to: string; medianDays: number | null; count: number }>; draftToFinalMedian: number } | null>(null);
  const [monthlyDelta, setMonthlyDelta] = useState<Array<{ status: string; count: number }> | null>(null);
  const [editors, setEditors] = useState<Array<{ actor: string; totalActions: number; prsTouched: number }> | null>(null);
  const [reviewers, setReviewers] = useState<Array<{ actor: string; totalReviews: number; prsTouched: number; medianResponseDays: number | null }> | null>(null);
  const [govStates, setGovStates] = useState<Array<{ state: string; label: string; count: number; medianWaitDays: number | null }> | null>(null);

  // Overlay filters (set by clicking numbers throughout the page)
  const [overlayFilters, setOverlayFilters] = useState<{ status?: string[]; category?: string[]; label: string } | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const isRipMode = activeTab === 'rips';
  const currentTabs = viewMode === 'type' ? TYPE_TABS : STATUS_TABS;
  const activeTabDef = currentTabs.find((t) => t.id === activeTab);
  const totalRows = isRipMode ? (ripData?.total || 0) : (eipData?.total || 0);
  const totalPages = isRipMode ? (ripData?.totalPages || 1) : (eipData?.totalPages || 1);

  // ─── Effects ────────────────────────────────────────────────
  useEffect(() => { setPage(1); setColumnSearch({}); setOverlayFilters(null); }, [activeTab]);
  useEffect(() => {
    if (activeTab !== 'rips') setActiveTab('all');
    setPage(1); setColumnSearch({}); setOverlayFilters(null);
  }, [viewMode]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isRipMode && !(RIP_SORT_FIELDS as readonly string[]).includes(sortBy)) setSortBy('number');
    else if (!isRipMode && !(EIP_SORT_FIELDS as readonly string[]).includes(sortBy)) setSortBy('number');
  }, [isRipMode, sortBy]);

  // Fetch core overview
  useEffect(() => {
    (async () => {
      try {
        const [kpiRes, catRes, statusRes, ripRes, matrixRes] = await Promise.all([
          client.standards.getKPIs({}),
          client.standards.getCategoryBreakdown({}),
          client.standards.getStatusDistribution({}),
          client.standards.getRIPKPIs(),
          client.standards.getStatusMatrix(),
        ]);
        setKpis(kpiRes);
        setCategoryBreakdown(catRes);
        setRipKpis({ total: ripRes.total, active: ripRes.active });
        setMatrixRaw(matrixRes);
        const statusMap = new Map<string, number>();
        statusRes.forEach((r: { status: string; count: number }) => statusMap.set(r.status, (statusMap.get(r.status) || 0) + r.count));
        setStatusDist(Array.from(statusMap.entries()).map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count));
      } catch (err) { console.error('Failed to load overview data:', err); }
    })();
  }, []);

  // Fetch insight data (non-blocking, loads after core)
  useEffect(() => {
    (async () => {
      try {
        const [rcRes, upRes, lfRes, rdRes, dvRes, mdRes, edRes, rvRes, gsRes] = await Promise.all([
          client.analytics.getRecentChanges({ limit: 12 }),
          client.standards.getUpgradeImpact(),
          client.explore.getStatusFlow(),
          client.standards.getRepoDistribution(),
          client.analytics.getDecisionVelocity({}),
          client.standards.getMonthlyDelta(),
          client.analytics.getMonthlyEditorLeaderboard({ limit: 10 }),
          client.analytics.getReviewersLeaderboard({ limit: 5 }),
          client.analytics.getPRGovernanceWaitingState({}),
        ]);
        setRecentChanges(rcRes as typeof recentChanges);
        setUpgradeImpact(upRes);
        setLifecycleFunnel(lfRes);
        setRepoDist(rdRes);
        setDecisionVelocity(dvRes);
        setMonthlyDelta(mdRes);
        setEditors(edRes);
        setReviewers(rvRes);
        setGovStates(gsRes.map(g => ({ ...g, count: Number(g.count), medianWaitDays: g.medianWaitDays != null ? Number(g.medianWaitDays) : null })));
      } catch (err) { console.error('Failed to load insights:', err); }
    })();
  }, []);

  // Fetch table
  useEffect(() => {
    (async () => {
      setTableLoading(true);
      try {
        if (isRipMode) {
          const sb = (RIP_SORT_FIELDS as readonly string[]).includes(sortBy) ? (sortBy as RipSortField) : 'number';
          setRipData(await client.standards.getRIPsTable({ sortBy: sb, sortDir, page, pageSize: 10 }));
        } else {
          const sb = (EIP_SORT_FIELDS as readonly string[]).includes(sortBy) ? (sortBy as EipSortField) : 'number';
          const f: { sortBy: EipSortField; sortDir: 'asc' | 'desc'; page: number; pageSize: number; category?: string[]; type?: string[]; status?: string[] } =
            { sortBy: sb, sortDir, page, pageSize: 10 };
          if (overlayFilters) {
            if (overlayFilters.status) f.status = overlayFilters.status;
            if (overlayFilters.category) f.category = overlayFilters.category;
          } else {
            const tab = currentTabs.find((t) => t.id === activeTab);
            if (tab?.filter) { if (tab.filter.category) f.category = tab.filter.category; if (tab.filter.type) f.type = tab.filter.type; if (tab.filter.status) f.status = tab.filter.status; }
          }
          setEipData(await client.standards.getTable(f));
        }
      } catch (err) { console.error('Failed to load table:', err); }
      finally { setTableLoading(false); }
    })();
  }, [activeTab, sortBy, sortDir, page, isRipMode, currentTabs, viewMode, overlayFilters]);

  // ─── Column filtering ──────────────────────────────────────
  const filteredEipRows = useMemo(() => {
    if (!eipData?.rows) return [];
    const s = Object.entries(columnSearch).filter(([, v]) => v.trim());
    if (!s.length) return eipData.rows;
    return eipData.rows.filter((r) => s.every(([k, v]) => { const q = v.toLowerCase(); switch (k) {
      case 'number': return String(r.number).includes(q); case 'title': return (r.title || '').toLowerCase().includes(q);
      case 'author': return (r.author || '').toLowerCase().includes(q); case 'type': return (r.type || '').toLowerCase().includes(q);
      case 'category': return (r.category || '').toLowerCase().includes(q); case 'status': return r.status.toLowerCase().includes(q); default: return true;
    } }));
  }, [eipData, columnSearch]);

  const filteredRipRows = useMemo(() => {
    if (!ripData?.rows) return [];
    const s = Object.entries(columnSearch).filter(([, v]) => v.trim());
    if (!s.length) return ripData.rows;
    return ripData.rows.filter((r) => s.every(([k, v]) => { const q = v.toLowerCase(); switch (k) {
      case 'number': return String(r.number).includes(q); case 'title': return (r.title || '').toLowerCase().includes(q);
      case 'author': return (r.author || '').toLowerCase().includes(q); case 'status': return (r.status || '').toLowerCase().includes(q);
      case 'created_at': return (r.createdAt || '').includes(q); case 'last_commit': return (r.lastCommit || '').includes(q);
      case 'commits': return String(r.commits).includes(q); default: return true;
    } }));
  }, [ripData, columnSearch]);

  const hasColumnFilter = Object.values(columnSearch).some((v) => v.trim());
  const filteredCount = isRipMode ? filteredRipRows.length : filteredEipRows.length;
  const pageRowCount = isRipMode ? (ripData?.rows.length || 0) : (eipData?.rows.length || 0);

  // ─── Helpers ────────────────────────────────────────────────
  const getTabCount = useCallback((tabId: string, tabs: TabDef[]) => {
    const tab = tabs.find((t) => t.id === tabId); if (!tab) return 0;
    if (tab.isRip) return ripKpis?.total || 0;
    if (tabId === 'all') return kpis?.total || 0;
    if (tab.filter?.status) return statusDist.find((d) => d.status === tab.filter!.status![0])?.count || 0;
    return categoryBreakdown.find((c) => c.category.toLowerCase() === tab.label.toLowerCase())?.count || 0;
  }, [kpis, categoryBreakdown, statusDist, ripKpis]);

  const handleSort = useCallback((col: string) => {
    if (sortBy === col) setSortDir((p) => p === 'asc' ? 'desc' : 'asc'); else { setSortBy(col); setSortDir('desc'); }
  }, [sortBy]);

  const getProposalUrl = useCallback((repo: string, num: number) => `/${(repo.toLowerCase().split('/').pop() || 'eips').replace(/s$/, '')}/${num}`, []);
  const getProposalPrefix = useCallback((repo: string) => { const s = repo.toLowerCase().split('/').pop() || 'eips'; return s === 'ercs' ? 'ERC' : s === 'rips' ? 'RIP' : 'EIP'; }, []);

  const navigateToTable = useCallback((filters: { status?: string[]; category?: string[] }, label: string) => {
    if (isRipMode) { setActiveTab('all'); }
    setOverlayFilters({ ...filters, label });
    setPage(1);
    setColumnSearch({});
    setTimeout(() => tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }, [isRipMode]);

  const navigateToRipsTable = useCallback(() => {
    setViewMode('type');
    setActiveTab('rips');
    setOverlayFilters(null);
    setPage(1);
    setColumnSearch({});
    setTimeout(() => tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }, []);

  const clearOverlay = useCallback(() => { setOverlayFilters(null); setPage(1); }, []);

  const handleExportCSV = useCallback(async () => {
    setExporting(true);
    try {
      if (isRipMode) { const r = await client.standards.exportCSV({ repo: 'rips' }); downloadCSV(r.csv, r.filename); }
      else {
        const f: { category?: string[]; type?: string[]; status?: string[] } = {};
        if (overlayFilters) {
          if (overlayFilters.status) f.status = overlayFilters.status;
          if (overlayFilters.category) f.category = overlayFilters.category;
        } else {
          const tab = currentTabs.find((t) => t.id === activeTab);
          if (tab?.filter) { if (tab.filter.category) f.category = tab.filter.category; if (tab.filter.type) f.type = tab.filter.type; if (tab.filter.status) f.status = tab.filter.status; }
        }
        const r = await client.standards.exportCSV(f); downloadCSV(r.csv, r.filename);
      }
    } catch (err) { console.error('CSV export failed:', err); }
    finally { setExporting(false); }
  }, [activeTab, isRipMode, currentTabs, overlayFilters]);

  // ─── Computed ──────────────────────────────────────────────
  const standardsTrackTotal = useMemo(() => categoryBreakdown.filter((c) => ['core', 'networking', 'interface', 'erc'].includes(c.category.toLowerCase())).reduce((s, c) => s + c.count, 0), [categoryBreakdown]);
  const getCatCount = useCallback((name: string) => categoryBreakdown.find((c) => c.category.toLowerCase() === name.toLowerCase())?.count || 0, [categoryBreakdown]);

  const matrixData = useMemo(() => {
    const groups = [...new Set(matrixRaw.map((d) => d.group))].sort();
    return {
      groups,
      rows: MATRIX_STATUS_ORDER.map((status) => {
        const cells: Record<string, number> = {};
        let total = 0;
        groups.forEach((g) => { const m = matrixRaw.find((d) => d.status === status && d.group === g); const c = m?.count || 0; cells[g] = c; total += c; });
        return { status, cells, total };
      }).filter((r) => r.total > 0),
    };
  }, [matrixRaw]);
  const matrixGrandTotal = useMemo(() => matrixData.rows.reduce((s, r) => s + r.total, 0), [matrixData]);

  const statusSummary = useMemo(() => MATRIX_STATUS_ORDER.map((s) => ({
    status: s, count: statusDist.find((d) => d.status === s)?.count || 0,
  })).filter((s) => s.count > 0), [statusDist]);

  const pageRange = useMemo(() => {
    const range: number[] = []; const max = 5;
    let start = Math.max(1, page - Math.floor(max / 2));
    const end = Math.min(totalPages, start + max - 1);
    start = Math.max(1, end - max + 1);
    for (let i = start; i <= end; i++) range.push(i);
    return range;
  }, [page, totalPages]);

  const eipCols = [
    { key: 'number', label: '#', w: 'w-20' }, { key: 'title', label: 'Title', w: 'min-w-[240px]' },
    { key: 'author', label: 'Author', w: 'w-36' }, { key: 'type', label: 'Type', w: 'w-28' },
    { key: 'category', label: 'Category', w: 'w-28' }, { key: 'status', label: 'Status', w: 'w-28' },
  ];
  const ripCols = [
    { key: 'number', label: '#', w: 'w-20' }, { key: 'title', label: 'Title', w: 'min-w-[240px]' },
    { key: 'author', label: 'Author', w: 'w-32' }, { key: 'status', label: 'Status', w: 'w-28' },
    { key: 'created_at', label: 'Created', w: 'w-28' }, { key: 'last_commit', label: 'Last Commit', w: 'w-28' },
    { key: 'commits', label: 'Commits', w: 'w-20' },
  ];
  const columns = isRipMode ? ripCols : eipCols;

  const waitingOnEditor = govStates?.find(g => g.state === 'WAITING_ON_EDITOR');

  // ─── Render ────────────────────────────────────────────────
  return (
    <div className="bg-background relative min-h-screen w-full overflow-hidden">
      {/* Subtle background accent */}
        <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(52,211,153,0.03),transparent_70%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(52,211,153,0.05),transparent_70%)]" />
      </div>

      <div className="relative z-10 w-full max-w-full px-4 py-8 sm:px-6 lg:px-8 xl:px-12">

        {/* ─── 1. Header ──────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-6">
          <EIPsPageHeader />
        </motion.div>

        <hr className="border-slate-200 dark:border-slate-800/50 mb-6" />

        {/* ─── 2. Global Metrics Bar ──────────────────────── */}
        <motion.div id="kpi-overview" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }}
          className="mb-6 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/40 shadow-md dark:shadow-lg dark:shadow-slate-950/50">
            <div className="grid min-w-max grid-flow-col divide-x divide-slate-200 dark:divide-slate-700/50">
            <MetricCell label="Total" value={kpis?.total || 0} color="text-slate-900 dark:text-white" onClick={() => { clearOverlay(); tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} />
            {statusSummary.map((s) => (
              <MetricCell key={s.status} label={s.status} value={s.count} color={STATUS_TEXT_COLORS[s.status] || 'text-slate-600 dark:text-slate-300'}
                dot={STATUS_DOT_COLORS[s.status] || 'bg-slate-400'} onClick={() => navigateToTable({ status: [s.status] }, s.status)} />
            ))}
            <MetricCell label="RIPs" value={ripKpis?.total || 0} color="text-violet-600 dark:text-violet-300" dot="bg-violet-400" onClick={() => setActiveTab('rips')} />
            <MetricCell label={`New ${new Date().getFullYear()}`} value={kpis?.newThisYear || 0} color="text-emerald-600 dark:text-emerald-300" dot="bg-emerald-400" />
          </div>
        </motion.div>

        {/* ─── 3. Matrix + Category Breakdown ─────────────── */}
        <motion.div id="status-distribution" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.12 }}
          className="mb-6 grid gap-4 lg:grid-cols-5">
          {/* Status Distribution Matrix */}
          <div className="lg:col-span-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/50 shadow-md dark:shadow-lg">
            <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-800/20">
              <span className="text-xs font-semibold tracking-wider text-slate-600 dark:text-slate-400 uppercase">Status Distribution</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800/50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-500">Status</th>
                  {matrixData.groups.map((g) => <th key={g} className="px-4 py-2 text-right text-xs font-medium text-slate-600 dark:text-slate-500">{g}</th>)}
                  <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 dark:text-slate-400">Total</th>
                </tr>
              </thead>
              <tbody>
                {matrixData.rows.map((row) => (
                  <tr key={row.status} className="border-b border-slate-200 dark:border-slate-800/30 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/20">
                    <td className="px-4 py-2">
                      <button onClick={() => navigateToTable({ status: [row.status] }, row.status)}
                        className="flex items-center gap-2 transition-colors hover:text-slate-900 dark:hover:text-white">
                        <span className={`h-2 w-2 rounded-full ${STATUS_DOT_COLORS[row.status] || 'bg-slate-500'}`} />
                        <span className={`text-sm ${STATUS_TEXT_COLORS[row.status] || 'text-slate-300'}`}>{row.status}</span>
                      </button>
                    </td>
                    {matrixData.groups.map((g) => (
                      <td key={g} className="px-4 py-2 text-right">
                        {row.cells[g] ? (
                          <button onClick={() => navigateToTable(
                            g === 'ERCs' ? { status: [row.status], category: ['ERC'] } : { status: [row.status] },
                            `${row.status} ${g}`
                          )} className="text-sm tabular-nums text-slate-600 dark:text-slate-400 underline decoration-slate-400 dark:decoration-slate-700 underline-offset-2 hover:text-slate-900 dark:hover:text-white hover:decoration-slate-600 dark:hover:decoration-slate-500">
                            {row.cells[g].toLocaleString()}
                          </button>
                        ) : <span className="text-sm text-slate-400 dark:text-slate-700">—</span>}
                      </td>
                    ))}
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => navigateToTable({ status: [row.status] }, `All ${row.status}`)}
                        className="text-sm tabular-nums font-medium text-slate-700 dark:text-slate-200 underline decoration-slate-400 dark:decoration-slate-700 underline-offset-2 hover:text-slate-900 dark:hover:text-white hover:decoration-slate-600 dark:hover:decoration-slate-500">
                        {row.total.toLocaleString()}
                      </button>
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-100 dark:bg-slate-800/20">
                  <td className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400">Total</td>
                  {matrixData.groups.map((g) => {
                    const col = matrixData.rows.reduce((s, r) => s + (r.cells[g] || 0), 0);
                    return (
                      <td key={g} className="px-4 py-2 text-right">
                        <button onClick={() => navigateToTable(
                          g === 'ERCs' ? { category: ['ERC'] } : {},
                          `All ${g}`
                        )} className="text-sm tabular-nums font-medium text-slate-600 dark:text-slate-300 underline decoration-slate-400 dark:decoration-slate-700 underline-offset-2 hover:text-slate-900 dark:hover:text-white hover:decoration-slate-600 dark:hover:decoration-slate-500">
                          {col.toLocaleString()}
                        </button>
                      </td>
                    );
                  })}
                  <td className="px-4 py-2 text-right text-sm tabular-nums font-bold text-slate-900 dark:text-white">{matrixGrandTotal.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Category Breakdown */}
          <div id="category-breakdown" className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/50 p-4 shadow-md dark:shadow-lg">
            <div className="mb-3">
              <span className="text-xs font-semibold tracking-wider text-slate-600 dark:text-slate-400 uppercase">Category Breakdown</span>
            </div>
            <div className="space-y-1">
              <div className="mb-3">
                <div className="flex items-center justify-between px-1 py-1">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">Standards Track</span>
                  <span className="text-sm tabular-nums font-semibold text-slate-700 dark:text-slate-200">{standardsTrackTotal.toLocaleString()}</span>
                </div>
                <div className="ml-2 space-y-px">
                  {['Core', 'Networking', 'Interface', 'ERC'].map((cat) => (
                    <button key={cat} onClick={() => navigateToTable({ category: [cat] }, cat)}
                      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/60">
                      <span className="text-slate-600 dark:text-slate-400">{cat}</span>
                      <span className="tabular-nums text-slate-600 dark:text-slate-300 underline decoration-slate-400 dark:decoration-slate-700 underline-offset-2">{getCatCount(cat).toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              </div>
              {['Meta', 'Informational'].map((cat) => (
                <button key={cat} onClick={() => navigateToTable({ category: [cat] }, cat)}
                  className="flex w-full items-center justify-between rounded-md px-1 py-1.5 text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/60">
                  <span className="font-medium text-slate-800 dark:text-slate-200">{cat}</span>
                  <span className="tabular-nums font-semibold text-slate-700 dark:text-slate-200 underline decoration-slate-400 dark:decoration-slate-700 underline-offset-2">{getCatCount(cat).toLocaleString()}</span>
                </button>
              ))}
              <button onClick={() => setActiveTab('rips')}
                className="flex w-full items-center justify-between rounded-md px-1 py-1.5 text-sm transition-colors hover:bg-violet-500/10">
                <span className="font-medium text-violet-600 dark:text-violet-300">RIPs</span>
                <span className="tabular-nums font-semibold text-violet-600 dark:text-violet-200">{(ripKpis?.total || 0).toLocaleString()}</span>
              </button>
            </div>
          </div>
        </motion.div>

        <hr className="border-slate-200 dark:border-slate-800/50 mb-6" />

        {/* ─── 6. Lifecycle Funnel + Repo Distribution ─────── */}
        <motion.div id="intelligence" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.14 }}
          className="mb-6 grid gap-4 lg:grid-cols-2">
          {/* Lifecycle Funnel (Pie Chart) */}
          <SectionCard title="Lifecycle Funnel" icon={<ArrowRight className="h-3.5 w-3.5" />}>
            {!lifecycleFunnel ? <SkeletonPulse rows={4} /> : (() => {
              const pieData = lifecycleFunnel.filter(f => f.count > 0).map(f => ({
                name: f.status,
                value: f.count,
                fill: STATUS_PIE_COLORS[f.status] || '#64748b',
              }));
              return (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-full max-w-[200px] h-[180px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={1}
                        strokeWidth={0}
                        onClick={(e) => navigateToTable({ status: [e.name] }, e.name)}
                        style={{ cursor: 'pointer' }}
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} fillOpacity={0.9} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  {lifecycleFunnel.filter(f => f.count > 0).map((f) => {
                    const total = lifecycleFunnel!.reduce((s, x) => s + x.count, 0);
                    const pct = total > 0 ? (f.count / total * 100).toFixed(1) : '0';
                    return (
                      <button key={f.status} onClick={() => navigateToTable({ status: [f.status] }, f.status)}
                        className="group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/20">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT_COLORS[f.status] || 'bg-slate-500'}`} />
                        <span className="flex-1 text-left text-xs text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200">{f.status}</span>
                        <span className="text-xs tabular-nums font-medium text-slate-700 dark:text-slate-300">{f.count.toLocaleString()}</span>
                        <span className="text-[10px] tabular-nums text-slate-500 dark:text-slate-600">{pct}%</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              );
            })()}
          </SectionCard>

          {/* Repo Distribution */}
          <SectionCard title="Repository Distribution" icon={<Layers className="h-3.5 w-3.5" />}>
            {!repoDist ? <SkeletonPulse rows={3} /> : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-600 dark:text-slate-500">
                    <th className="pb-2 text-left font-medium">Repository</th>
                    <th className="pb-2 text-right font-medium">Proposals</th>
                    <th className="pb-2 text-right font-medium">Open PRs</th>
                    <th className="pb-2 text-right font-medium">Final</th>
                  </tr>
                </thead>
                <tbody>
                  {repoDist.map((r) => {
                    const isRIPs = r.repo.toLowerCase().includes('rips');
                    const isERCs = r.repo.toLowerCase().includes('ercs');
                    const catFilter = isERCs ? { category: ['ERC'] } : {};
                    const navProposals = () => isRIPs ? navigateToRipsTable() : navigateToTable(catFilter, `${r.repo} proposals`);
                    const navFinals = () => isRIPs ? navigateToRipsTable() : navigateToTable({ ...catFilter, status: ['Final'] }, `${r.repo} Final`);
                    return (
                      <tr key={r.repo} className="border-t border-slate-200 dark:border-slate-800/30">
                        <td className="py-1.5 font-medium text-slate-700 dark:text-slate-300">{r.repo}</td>
                        <td className="py-1.5 text-right">
                          <button onClick={navProposals}
                            className="tabular-nums text-slate-600 dark:text-slate-400 underline decoration-slate-400 dark:decoration-slate-700 underline-offset-2 hover:text-slate-900 dark:hover:text-white">{r.proposals.toLocaleString()}</button>
                        </td>
                        <td className="py-1.5 text-right tabular-nums text-amber-600 dark:text-amber-300">{r.activePRs.toLocaleString()}</td>
                        <td className="py-1.5 text-right">
                          <button onClick={navFinals}
                            className="tabular-nums text-emerald-600 dark:text-emerald-400 underline decoration-slate-400 dark:decoration-slate-700 underline-offset-2 hover:text-slate-900 dark:hover:text-white">{r.finals.toLocaleString()}</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </SectionCard>
        </motion.div>

        <hr className="border-slate-200 dark:border-slate-800/50 mb-6" />

        {/* ─── 7. Governance Efficiency + Monthly Delta ────── */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.16 }}
          className="mb-6 grid gap-4 lg:grid-cols-2">
          {/* Governance Efficiency */}
          <SectionCard title="Governance Efficiency" icon={<Timer className="h-3.5 w-3.5" />}>
            {!decisionVelocity ? <SkeletonPulse rows={4} /> : (
              <div className="space-y-2">
                {decisionVelocity.transitions.map((t) => (
                  <div key={`${t.from}-${t.to}`} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/20">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {t.from} <ArrowRight className="mx-1 inline h-3 w-3 text-slate-500 dark:text-slate-600" /> {t.to}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm tabular-nums font-medium text-slate-800 dark:text-slate-200">{t.medianDays != null ? `${t.medianDays}d` : '—'}</span>
                      <span className="text-xs tabular-nums text-slate-500 dark:text-slate-600">({t.count})</span>
                    </div>
                  </div>
                ))}
                {decisionVelocity.draftToFinalMedian > 0 && (
                  <div className="mt-2 flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Draft to Final (end-to-end)</span>
                    <span className="text-sm tabular-nums font-bold text-emerald-600 dark:text-emerald-400">{decisionVelocity.draftToFinalMedian}d median</span>
                  </div>
                )}
              </div>
            )}
          </SectionCard>

          {/* Monthly Delta */}
          <SectionCard title={`${new Date().toLocaleString('en', { month: 'long' })} Governance Delta`} icon={<Activity className="h-3.5 w-3.5" />}>
            {!monthlyDelta ? <SkeletonPulse rows={5} /> : monthlyDelta.length === 0 ? (
              <p className="text-sm text-slate-600">No status changes this month yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {monthlyDelta.map((d) => (
                  <button key={d.status} onClick={() => navigateToTable({ status: [d.status] }, `${d.status} (this month)`)}
                    className="flex items-center gap-2 rounded-lg bg-slate-100 dark:bg-slate-800/30 px-3 py-2 text-left transition-colors hover:bg-slate-200 dark:hover:bg-slate-800/50">
                    <span className={`h-2 w-2 rounded-full ${STATUS_DOT_COLORS[d.status] || 'bg-slate-500'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-slate-600 dark:text-slate-500">{d.status}</div>
                      <div className="text-lg tabular-nums font-bold text-slate-800 dark:text-slate-200">{d.count}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </SectionCard>
        </motion.div>

        <hr className="border-slate-200 dark:border-slate-800/50 mb-6" />

        {/* ─── 8. View Switch + Tabs ──────────────────────── */}
        <motion.div id="proposals-table" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.18 }} className="mb-4">
          <div className="mb-2.5 flex items-center justify-between">
            <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-800/80 bg-slate-100 dark:bg-slate-900/60 p-0.5">
              <button onClick={() => setViewMode('type')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${viewMode === 'type' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'}`}>
                <LayoutGrid className="h-3 w-3" /> By Category
              </button>
              <button onClick={() => setViewMode('status')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${viewMode === 'status' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'}`}>
                <BarChart3 className="h-3 w-3" /> By Lifecycle
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs tabular-nums text-slate-600 dark:text-slate-500">
                {hasColumnFilter ? `${filteredCount} of ${pageRowCount}` : `${totalRows.toLocaleString()} ${isRipMode ? 'RIPs' : 'proposals'}`}
              </span>
              {hasColumnFilter && <button onClick={() => setColumnSearch({})} className="text-xs text-slate-600 underline hover:text-slate-800 dark:hover:text-slate-400">Clear</button>}
              <button onClick={handleExportCSV} disabled={exporting}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 transition-colors hover:border-slate-400 hover:text-slate-800 dark:hover:border-slate-700 dark:hover:text-slate-300 disabled:opacity-40">
                {exporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />} CSV
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={viewMode} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
              className="flex items-center gap-1 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/40 p-1.5 scrollbar-thin">
              {currentTabs.map((tab) => {
                const count = getTabCount(tab.id, currentTabs);
                const isActive = activeTab === tab.id;
                const isRip = tab.isRip;
                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`group flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                      isActive ? (isRip ? 'bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-200' : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm') :
                      (isRip ? 'text-violet-600 dark:text-violet-400/50 hover:text-violet-700 dark:hover:text-violet-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200')
                    }`}>
                    <span className={isActive ? (isRip ? 'text-violet-400' : 'text-cyan-600 dark:text-cyan-400') : 'text-slate-500 dark:text-slate-600 group-hover:text-slate-700 dark:group-hover:text-slate-400'}>{tab.icon}</span>
                    {tab.label}
                    {count > 0 && (
                      <span className={`text-xs tabular-nums ${isActive ? (isRip ? 'text-violet-600 dark:text-violet-300/70' : 'text-slate-500 dark:text-slate-400') : 'text-slate-500 dark:text-slate-600'}`}>
                        {count.toLocaleString()}
                      </span>
                    )}
                  </button>
                );
              })}
            </motion.div>
          </AnimatePresence>
          {activeTabDef?.description && <p className="mt-2 text-xs text-slate-600 dark:text-slate-500">{activeTabDef.description}</p>}
        </motion.div>

        {/* ─── 9. Main Table ──────────────────────────────── */}
        <div ref={tableRef} />
        {overlayFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="mb-3 flex items-center gap-2 rounded-lg border border-cyan-500/30 dark:border-cyan-500/20 bg-cyan-50 dark:bg-cyan-500/5 px-4 py-2">
            <span className="text-xs text-slate-600 dark:text-slate-400">Showing:</span>
            <span className="rounded-md bg-cyan-100 dark:bg-cyan-500/15 px-2 py-0.5 text-sm font-medium text-cyan-700 dark:text-cyan-300">{overlayFilters.label}</span>
            {overlayFilters.status && <span className="text-xs text-slate-600">status: {overlayFilters.status.join(', ')}</span>}
            {overlayFilters.category && <span className="text-xs text-slate-600">category: {overlayFilters.category.join(', ')}</span>}
            <button onClick={clearOverlay} className="ml-auto flex items-center gap-1 rounded-md px-2 py-0.5 text-xs text-slate-600 dark:text-slate-500 transition-colors hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white">
              <X className="h-3 w-3" /> Clear filter
            </button>
          </motion.div>
        )}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.2 }}
          className="mb-8 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/30 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-800/30">
                  {columns.map((col) => (
                    <th key={col.key} className={`px-4 py-2 text-left ${col.w}`}>
                      <div className="flex cursor-pointer select-none items-center text-xs font-semibold tracking-wider text-slate-600 dark:text-slate-500 uppercase hover:text-slate-900 dark:hover:text-slate-300" onClick={() => handleSort(col.key)}>
                        {col.label}<SortIcon column={col.key} current={sortBy} dir={sortDir} />
                      </div>
                      <input type="text" value={columnSearch[col.key] || ''}
                        onChange={(e) => setColumnSearch((p) => ({ ...p, [col.key]: e.target.value }))}
                        onClick={(e) => e.stopPropagation()} placeholder="Filter..."
                        className="mt-1 w-full rounded border border-slate-200 dark:border-slate-800/50 bg-white dark:bg-transparent px-2 py-0.5 text-xs font-normal normal-case tracking-normal text-slate-700 dark:text-slate-400 placeholder-slate-500 dark:placeholder-slate-700 outline-none focus:border-slate-400 dark:focus:border-slate-700 focus:text-slate-900 dark:focus:text-slate-200" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableLoading ? (
                  <tr><td colSpan={columns.length} className="p-4"><TableSkeleton cols={columns.length} /></td></tr>
                ) : isRipMode ? (
                  !filteredRipRows.length ? (
                    <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-slate-600">No RIPs match your filters.</td></tr>
                  ) : filteredRipRows.map((row) => (
                    <tr key={`rip-${row.number}`} className="border-b border-slate-200 dark:border-slate-800/20 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/20">
                      <td className="px-4 py-2"><Link href={`/rip/${row.number}`} className="font-mono text-sm font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300">RIP-{row.number}</Link></td>
                      <td className="px-4 py-2"><Link href={`/rip/${row.number}`} className="line-clamp-1 text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">{row.title || 'Untitled'}</Link></td>
                      <td className="px-4 py-2 text-sm text-slate-600 dark:text-slate-500">{row.author ? row.author.split(',')[0].trim().replace(/^"|"$/g, '') : '—'}</td>
                      <td className="px-4 py-2"><StatusBadge status={row.status || 'Draft'} /></td>
                      <td className="px-4 py-2 tabular-nums text-sm text-slate-600 dark:text-slate-500">{row.createdAt || '—'}</td>
                      <td className="px-4 py-2 tabular-nums text-sm text-slate-600 dark:text-slate-500">{row.lastCommit || '—'}</td>
                      <td className="px-4 py-2 tabular-nums text-sm text-slate-500 dark:text-slate-400">{row.commits}</td>
                    </tr>
                  ))
                ) : (
                  !filteredEipRows.length ? (
                    <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-slate-600">No proposals match your filters.</td></tr>
                  ) : filteredEipRows.map((row) => {
                    const url = getProposalUrl(row.repo, row.number);
                    return (
                      <tr key={`${row.repo}-${row.number}`} className="border-b border-slate-200 dark:border-slate-800/20 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/20">
                        <td className="px-4 py-2"><Link href={url} className="font-mono text-sm font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300">{getProposalPrefix(row.repo)}-{row.number}</Link></td>
                        <td className="px-4 py-2"><Link href={url} className="line-clamp-1 text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">{row.title || 'Untitled'}</Link></td>
                        <td className="px-4 py-2 text-sm text-slate-600 dark:text-slate-500">{row.author ? row.author.split(',')[0].trim().replace(/^"|"$/g, '') : '—'}</td>
                        <td className="px-4 py-2 text-sm text-slate-600 dark:text-slate-500">{row.type || '—'}</td>
                        <td className="px-4 py-2 text-sm text-slate-600 dark:text-slate-500">{row.category || '—'}</td>
                        <td className="px-4 py-2"><StatusBadge status={row.status} /></td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800/60 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/20">
              <span className="text-xs tabular-nums text-slate-600 dark:text-slate-500">Page {page} of {totalPages}</span>
              <div className="flex items-center gap-0.5">
                <PgBtn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}><ChevronLeft className="h-3.5 w-3.5" /></PgBtn>
                {pageRange[0] > 1 && <><PgBtn onClick={() => setPage(1)}>1</PgBtn>{pageRange[0] > 2 && <span className="px-1 text-xs text-slate-500 dark:text-slate-700">…</span>}</>}
                {pageRange.map((p) => <PgBtn key={p} onClick={() => setPage(p)} active={p === page}>{p}</PgBtn>)}
                {pageRange[pageRange.length - 1] < totalPages && <>{pageRange[pageRange.length - 1] < totalPages - 1 && <span className="px-1 text-xs text-slate-500 dark:text-slate-700">…</span>}<PgBtn onClick={() => setPage(totalPages)}>{totalPages}</PgBtn></>}
                <PgBtn onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}><ChevronRight className="h-3.5 w-3.5" /></PgBtn>
              </div>
            </div>
          )}
        </motion.div>

        <hr className="border-slate-200 dark:border-slate-800/50 my-8" />

        {/* ─── Recent Governance Activity ──────────────────── */}
        <motion.div id="governance-activity" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.22 }} className="mb-6">
          <SectionCard title="Recent Governance Activity" icon={<Activity className="h-3.5 w-3.5" />}>
            {!recentChanges ? <SkeletonPulse rows={5} /> : recentChanges.length === 0 ? (
              <p className="text-sm text-slate-600">No status changes in the last 7 days.</p>
            ) : (
              <div className="space-y-1.5">
                {recentChanges.map((e, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/30">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT_COLORS[e.to] || 'bg-slate-500'}`} />
                    <Link href={`/${e.eip_type === 'RIP' ? 'rip' : e.eip_type === 'ERC' ? 'erc' : 'eip'}/${e.eip}`}
                      className="shrink-0 font-mono text-sm font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300">
                      {e.eip_type}-{e.eip}
                    </Link>
                    <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-500">
                      {e.from ? <><span className="text-slate-500 dark:text-slate-500">{e.from}</span><ArrowRight className="h-3 w-3 text-slate-500 dark:text-slate-700" /></> : 'entered '}
                      <span className={STATUS_TEXT_COLORS[e.to] || 'text-slate-600 dark:text-slate-300'}>{e.to}</span>
                    </span>
                    <span className="ml-auto shrink-0 text-xs tabular-nums text-slate-500 dark:text-slate-600">
                      {e.days === 0 ? 'today' : e.days === 1 ? '1 day ago' : `${e.days}d ago`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </motion.div>

        {/* ─── Upgrade Impact Snapshot ─────────────────────── */}
        <motion.div id="upgrade-impact" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.24 }} className="mb-6">
          <SectionCard title="Upgrade Impact Snapshot" icon={<TrendingUp className="h-3.5 w-3.5" />}>
            {!upgradeImpact ? <SkeletonPulse rows={3} /> : upgradeImpact.length === 0 ? (
              <p className="text-sm text-slate-600">No upgrade data available.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-600 dark:text-slate-500">
                      <th className="pb-2 text-left font-medium">Upgrade</th>
                      <th className="pb-2 text-right font-medium">Final</th>
                      <th className="pb-2 text-right font-medium">Review</th>
                      <th className="pb-2 text-right font-medium">Last Call</th>
                      <th className="pb-2 text-right font-medium">Draft</th>
                      <th className="pb-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upgradeImpact.map((u) => (
                      <tr key={u.slug} className="border-t border-slate-200 dark:border-slate-800/30 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/20">
                        <td className="py-1.5 font-medium text-slate-800 dark:text-slate-200 capitalize">{u.name}</td>
                        {([['finalized', 'Final', 'text-emerald-600 dark:text-emerald-400'], ['inReview', 'Review', 'text-amber-600 dark:text-amber-300'], ['lastCall', 'Last Call', 'text-orange-600 dark:text-orange-300'], ['draft', 'Draft', 'text-slate-600 dark:text-slate-400']] as const).map(([key, status, color]) => (
                          <td key={key} className="py-1.5 text-right">
                            {u[key as keyof typeof u] ? (
                              <button onClick={() => navigateToTable({ status: [status] }, `${u.name} — ${status}`)}
                                className={`tabular-nums ${color} underline decoration-slate-400 dark:decoration-slate-700 underline-offset-2 hover:text-slate-900 dark:hover:text-white`}>
                                {(u[key as keyof typeof u] as number).toLocaleString()}
                              </button>
                            ) : <span className="text-slate-500 dark:text-slate-700">—</span>}
                          </td>
                        ))}
                        <td className="py-1.5 text-right tabular-nums font-medium text-slate-900 dark:text-white">{u.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </motion.div>

        {/* ─── Editor Leaderboard ────────────────────────── */}
        <motion.div id="editors-reviewers" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.22 }} className="mb-8">
          <SectionCard title={`Editor Leaderboard — ${new Date().toLocaleString('en', { month: 'long', year: 'numeric' })}`} icon={<Users className="h-3.5 w-3.5" />}>
            {!editors ? <SkeletonPulse rows={5} /> : editors.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-600">No editor activity this month yet.</p>
            ) : (
              <div className="space-y-5">
                {/* ── Podium: Top 3 ── */}
                {editors.length >= 3 && (
                  <div className="grid grid-cols-3 items-end gap-3">
                    {/* #2 Silver */}
                    <div className="flex flex-col items-center rounded-xl border border-slate-300 dark:border-slate-500/20 bg-slate-100 dark:bg-slate-800/30 p-3 pt-5">
                      <div className="relative">
                        <img src={`https://github.com/${editors[1].actor}.png`} alt={editors[1].actor}
                          onError={(ev) => { (ev.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(editors[1].actor)}&background=94a3b8&color=1e293b&size=80`; }}
                          className="h-14 w-14 rounded-full border-2 border-slate-400/40 object-cover" />
                        <span className="absolute -top-2 -right-2 text-lg">🥈</span>
                      </div>
                      <span className="mt-2 max-w-full truncate text-sm font-semibold text-slate-800 dark:text-slate-200">{editors[1].actor}</span>
                      <span className="text-xs tabular-nums text-slate-600 dark:text-slate-500">{editors[1].prsTouched} PRs handled</span>
                    </div>
                    {/* #1 Gold - Champion */}
                    <div className="flex flex-col items-center rounded-xl border border-amber-400/50 dark:border-amber-500/30 bg-linear-to-b from-amber-100 via-amber-50 to-transparent dark:from-amber-500/10 dark:via-amber-500/5 dark:to-transparent p-3 pt-4 -mt-3">
                      <div className="relative">
                        <img src={`https://github.com/${editors[0].actor}.png`} alt={editors[0].actor}
                          onError={(ev) => { (ev.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(editors[0].actor)}&background=fbbf24&color=78350f&size=80`; }}
                          className="h-16 w-16 rounded-full border-2 border-amber-400/50 ring-4 ring-amber-500/15 object-cover" />
                        <span className="absolute -top-3 -right-3 text-2xl">🥇</span>
                      </div>
                      <span className="mt-2 max-w-full truncate text-sm font-bold text-slate-900 dark:text-white">{editors[0].actor}</span>
                      <span className="text-xs tabular-nums font-medium text-amber-700 dark:text-amber-300">{editors[0].prsTouched} PRs handled</span>
                    </div>
                    {/* #3 Bronze */}
                    <div className="flex flex-col items-center rounded-xl border border-orange-400/40 dark:border-orange-500/20 bg-slate-100 dark:bg-slate-800/30 p-3 pt-5">
                      <div className="relative">
                        <img src={`https://github.com/${editors[2].actor}.png`} alt={editors[2].actor}
                          onError={(ev) => { (ev.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(editors[2].actor)}&background=fb923c&color=431407&size=80`; }}
                          className="h-14 w-14 rounded-full border-2 border-orange-400/40 object-cover" />
                        <span className="absolute -top-2 -right-2 text-lg">🥉</span>
                      </div>
                      <span className="mt-2 max-w-full truncate text-sm font-semibold text-slate-800 dark:text-slate-200">{editors[2].actor}</span>
                      <span className="text-xs tabular-nums text-slate-600 dark:text-slate-500">{editors[2].prsTouched} PRs handled</span>
                    </div>
                  </div>
                )}

                {/* ── Remaining editors ── */}
                {editors.length > 3 && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-900/30 divide-y divide-slate-200 dark:divide-slate-800/40">
                    {editors.slice(3).map((ed, i) => (
                      <div key={ed.actor} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/20">
                        <span className="w-5 text-right text-xs tabular-nums font-semibold text-slate-600">{i + 4}</span>
                        <img src={`https://github.com/${ed.actor}.png`} alt={ed.actor}
                          onError={(ev) => { (ev.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(ed.actor)}&background=94a3b8&color=1e293b&size=48`; }}
                          className="h-8 w-8 rounded-full border border-slate-300 dark:border-slate-700/50 object-cover" />
                        <span className="flex-1 truncate text-sm font-medium text-slate-700 dark:text-slate-300">{ed.actor}</span>
                        <span className="text-xs tabular-nums text-slate-600 dark:text-slate-500">{ed.prsTouched} PRs</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── PR Governance Summary ── */}
                {govStates && govStates.length > 0 && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-900/20 p-4">
                    <h4 className="mb-2 text-[10px] font-semibold tracking-wider text-slate-600 dark:text-slate-500 uppercase">PR Governance Overview</h4>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                      {govStates.map((g) => (
                        <div key={g.state} className="rounded-lg bg-slate-100 dark:bg-slate-800/30 px-3 py-2 text-center">
                          <div className="text-lg tabular-nums font-bold text-slate-800 dark:text-slate-200">{g.count}</div>
                          <div className="text-[10px] text-slate-600 dark:text-slate-500">{g.label}</div>
                          {g.medianWaitDays != null && <div className="text-[10px] tabular-nums text-slate-500 dark:text-slate-600">~{g.medianWaitDays}d wait</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </SectionCard>
        </motion.div>

        <hr className="border-slate-200 dark:border-slate-800/50 my-8" />

        {/* ─── Social & Community Updates ── */}
        <motion.section initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.20 }}>
          <SocialCommunityUpdates />
        </motion.section>

        <hr className="border-slate-200 dark:border-slate-800/50 my-8" />

        {/* ─── 11. Reference (EIP Types, Status Terms, Contributing) ── */}
        <motion.section initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.22 }}>
          <HomeFAQs categoryBreakdown={categoryBreakdown} statusDist={statusDist} />
        </motion.section>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// SMALL COMPONENTS & UTILS
// ────────────────────────────────────────────────────────────────

function MetricCell({ label, value, color, onClick, dot }: { label: string; value: number | string; color: string; onClick?: () => void; dot?: string }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick} className={`flex flex-col items-center gap-1.5 px-5 py-4 ${onClick ? 'cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/40' : ''}`}>
      <span className={`text-lg font-bold tabular-nums ${color}`}>{typeof value === 'number' ? value.toLocaleString() : value}</span>
      <div className="flex items-center gap-1.5">
        {dot && <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />}
        <span className="text-[10px] font-semibold tracking-wider text-slate-500 dark:text-slate-500 uppercase">{label}</span>
      </div>
    </Tag>
  );
}

function PgBtn({ children, onClick, disabled, active }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; active?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`flex h-7 min-w-[28px] items-center justify-center rounded-md text-xs font-medium transition-colors ${
        active ? 'border border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300' : 'text-slate-600 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-20'
      }`}>{children}</button>
  );
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
