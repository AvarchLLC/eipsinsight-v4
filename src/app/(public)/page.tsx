'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { client } from '@/lib/orpc';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import {
  ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight,
  Download, Loader2, FileText, Layers, Info, Code, FileCode2,
  Cpu, Network, Boxes, Eye, Bell, CheckCircle2, Zap, Pause,
  XCircle, GitCommitHorizontal, LayoutGrid, BarChart3,
} from 'lucide-react';

// ────────────────────────────────────────────────────────────────
// TYPES & CONSTANTS
// ────────────────────────────────────────────────────────────────

type ViewMode = 'type' | 'status';

interface TabDef {
  id: string;
  label: string;
  filter?: { category?: string[]; type?: string[]; status?: string[] };
  isRip?: boolean;
  description: string;
  icon: React.ReactNode;
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
  Draft: 'bg-slate-500/20 text-slate-300 border-slate-500/30', Review: 'bg-amber-500/20 text-amber-200 border-amber-500/30',
  'Last Call': 'bg-orange-500/20 text-orange-200 border-orange-500/30', Final: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  Stagnant: 'bg-gray-500/20 text-gray-400 border-gray-500/30', Withdrawn: 'bg-red-500/20 text-red-300 border-red-500/30',
  Living: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
};
const STATUS_DOT_COLORS: Record<string, string> = {
  Draft: 'bg-slate-400', Review: 'bg-amber-400', 'Last Call': 'bg-orange-400', Final: 'bg-emerald-400',
  Stagnant: 'bg-gray-500', Withdrawn: 'bg-red-400', Living: 'bg-cyan-400',
};
const STATUS_TEXT_COLORS: Record<string, string> = {
  Draft: 'text-slate-300', Review: 'text-amber-300', 'Last Call': 'text-orange-300',
  Final: 'text-emerald-400', Living: 'text-cyan-300', Stagnant: 'text-gray-400', Withdrawn: 'text-red-300',
};
const MATRIX_STATUS_ORDER = ['Draft', 'Review', 'Last Call', 'Final', 'Living', 'Stagnant', 'Withdrawn'];

const STATUS_TERMS = [
  { name: 'Idea', description: 'An idea that is pre-draft. This is not tracked within the EIP Repository.', color: 'text-purple-300' },
  { name: 'Draft', description: 'The first formally tracked stage of an EIP in development.', color: 'text-slate-300' },
  { name: 'Review', description: 'An EIP Author marks an EIP as ready for and requesting Peer Review.', color: 'text-amber-300' },
  { name: 'Last Call', description: 'The final review window for an EIP before moving to Final, typically 14 days.', color: 'text-orange-300' },
  { name: 'Final', description: 'The final standard. Should only be updated to correct errata.', color: 'text-emerald-300' },
  { name: 'Stagnant', description: 'Inactive for 6 months or greater. Can be resurrected by moving back to Draft.', color: 'text-gray-400' },
  { name: 'Withdrawn', description: 'Author has withdrawn the proposal. This state has finality.', color: 'text-red-300' },
  { name: 'Living', description: 'Continually updated and not designed to reach finality. Notably EIP-1.', color: 'text-cyan-300' },
];

const TYPE_INFO = [
  { name: 'Standards Track', description: 'Changes affecting most or all Ethereum implementations.', subcategories: [
    { name: 'Core', description: 'Consensus fork improvements and core dev discussions.' },
    { name: 'Networking', description: 'devp2p and Light Ethereum Subprotocol.' },
    { name: 'Interface', description: 'Client API/RPC specifications and standards.' },
    { name: 'ERC', description: 'Application-level standards: tokens, registries, account abstraction.' },
  ] },
  { name: 'Meta', description: 'Process proposals for areas other than the protocol itself.' },
  { name: 'Informational', description: 'General guidelines or information for the community.' },
];

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
  if (current !== column) return <ArrowUpDown className="ml-1 inline h-3 w-3 text-slate-700" />;
  return dir === 'asc' ? <ArrowUp className="ml-1 inline h-3 w-3 text-cyan-400" /> : <ArrowDown className="ml-1 inline h-3 w-3 text-cyan-400" />;
}

function TableSkeleton({ cols = 6 }: { cols?: number }) {
  return (
    <div className="space-y-1.5">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className={`h-7 animate-pulse rounded bg-slate-800/40 ${j === 1 ? 'flex-1' : 'w-20'}`} />
          ))}
        </div>
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

  const isRipMode = activeTab === 'rips';
  const currentTabs = viewMode === 'type' ? TYPE_TABS : STATUS_TABS;
  const activeTabDef = currentTabs.find((t) => t.id === activeTab);
  const totalRows = isRipMode ? (ripData?.total || 0) : (eipData?.total || 0);
  const totalPages = isRipMode ? (ripData?.totalPages || 1) : (eipData?.totalPages || 1);

  // ─── Effects ────────────────────────────────────────────────
  useEffect(() => { setPage(1); setColumnSearch({}); }, [activeTab]);
  useEffect(() => {
    if (activeTab !== 'rips') setActiveTab('all');
    setPage(1); setColumnSearch({});
  }, [viewMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isRipMode && !(RIP_SORT_FIELDS as readonly string[]).includes(sortBy)) setSortBy('number');
    else if (!isRipMode && !(EIP_SORT_FIELDS as readonly string[]).includes(sortBy)) setSortBy('number');
  }, [isRipMode, sortBy]);

  // Fetch overview
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

  // Fetch table
  useEffect(() => {
    (async () => {
      setTableLoading(true);
      try {
        if (isRipMode) {
          const sb = (RIP_SORT_FIELDS as readonly string[]).includes(sortBy) ? (sortBy as RipSortField) : 'number';
          setRipData(await client.standards.getRIPsTable({ sortBy: sb, sortDir, page, pageSize: 50 }));
        } else {
          const tab = currentTabs.find((t) => t.id === activeTab);
          const sb = (EIP_SORT_FIELDS as readonly string[]).includes(sortBy) ? (sortBy as EipSortField) : 'number';
          const f: { sortBy: EipSortField; sortDir: 'asc' | 'desc'; page: number; pageSize: number; category?: string[]; type?: string[]; status?: string[] } =
            { sortBy: sb, sortDir, page, pageSize: 50 };
          if (tab?.filter) { if (tab.filter.category) f.category = tab.filter.category; if (tab.filter.type) f.type = tab.filter.type; if (tab.filter.status) f.status = tab.filter.status; }
          setEipData(await client.standards.getTable(f));
        }
      } catch (err) { console.error('Failed to load table:', err); }
      finally { setTableLoading(false); }
    })();
  }, [activeTab, sortBy, sortDir, page, isRipMode, currentTabs, viewMode]);

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

  const handleExportCSV = useCallback(async () => {
    setExporting(true);
    try {
      if (isRipMode) { const r = await client.standards.exportCSV({ repo: 'rips' }); downloadCSV(r.csv, r.filename); }
      else {
        const tab = currentTabs.find((t) => t.id === activeTab);
        const f: { category?: string[]; type?: string[]; status?: string[] } = {};
        if (tab?.filter) { if (tab.filter.category) f.category = tab.filter.category; if (tab.filter.type) f.type = tab.filter.type; if (tab.filter.status) f.status = tab.filter.status; }
        const r = await client.standards.exportCSV(f); downloadCSV(r.csv, r.filename);
      }
    } catch (err) { console.error('CSV export failed:', err); }
    finally { setExporting(false); }
  }, [activeTab, isRipMode, currentTabs]);

  // ─── Computed ──────────────────────────────────────────────
  const standardsTrackTotal = useMemo(() => categoryBreakdown.filter((c) => ['core', 'networking', 'interface', 'erc'].includes(c.category.toLowerCase())).reduce((s, c) => s + c.count, 0), [categoryBreakdown]);
  const getCatCount = useCallback((name: string) => categoryBreakdown.find((c) => c.category.toLowerCase() === name.toLowerCase())?.count || 0, [categoryBreakdown]);

  // Matrix: uses getStatusMatrix (groups by category logic: EIPs vs ERCs)
  const matrixData = useMemo(() => {
    const groups = [...new Set(matrixRaw.map((d) => d.group))].sort();
    return {
      groups,
      rows: MATRIX_STATUS_ORDER.map((status) => {
        const cells: Record<string, number> = {};
        let total = 0;
        groups.forEach((g) => {
          const match = matrixRaw.find((d) => d.status === status && d.group === g);
          const c = match?.count || 0;
          cells[g] = c; total += c;
        });
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

  // ─── Render ────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen">
      {/* Subtle background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.04),transparent_60%)]" />

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* ─── 1. Header ──────────────────────────────────── */}
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6"
        >
          <h1 className="dec-title bg-linear-to-br from-emerald-300 via-slate-100 to-cyan-200 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
            Ethereum Improvement Proposals
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-400">
            Real-time analytics on proposal lifecycle, categories, and governance activity.
            Powered by{' '}
            <span className="text-slate-300">EIPsInsight</span>.
          </p>
        </motion.header>

        {/* ─── 2. Global Metrics Bar ──────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="mb-6 overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-900/50"
        >
          <div className="grid min-w-max grid-flow-col divide-x divide-slate-800/80">
            <MetricCell label="Total" value={kpis?.total || 0} color="text-white" />
            {statusSummary.map((s) => (
              <MetricCell
                key={s.status} label={s.status} value={s.count}
                color={STATUS_TEXT_COLORS[s.status] || 'text-slate-300'}
                onClick={() => { setViewMode('status'); setActiveTab(STATUS_TABS.find((t) => t.filter?.status?.[0] === s.status)?.id || 'all'); }}
              />
            ))}
            <MetricCell label="RIPs" value={ripKpis?.total || 0} color="text-violet-300" onClick={() => setActiveTab('rips')} />
            <MetricCell label={`New ${new Date().getFullYear()}`} value={kpis?.newThisYear || 0} color="text-emerald-300" />
          </div>
        </motion.div>

        {/* ─── 3. Matrix + Category Breakdown ─────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="mb-6 grid gap-4 lg:grid-cols-5"
        >
          {/* Status × EIPs/ERCs Matrix */}
          <div className="lg:col-span-3 overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-900/50">
            <div className="px-4 py-2.5 border-b border-slate-800/60">
              <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Status Distribution</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800/50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Status</th>
                  {matrixData.groups.map((g) => (
                    <th key={g} className="px-4 py-2 text-right text-xs font-medium text-slate-500">{g}</th>
                  ))}
                  <th className="px-4 py-2 text-right text-xs font-semibold text-slate-400">Total</th>
                </tr>
              </thead>
              <tbody>
                {matrixData.rows.map((row) => (
                  <tr key={row.status} className="border-b border-slate-800/30 transition-colors hover:bg-slate-800/20">
                    <td className="px-4 py-2">
                      <button
                        onClick={() => { setViewMode('status'); setActiveTab(STATUS_TABS.find((t) => t.filter?.status?.[0] === row.status)?.id || 'all'); }}
                        className="flex items-center gap-2 transition-colors hover:text-white"
                      >
                        <span className={`h-2 w-2 rounded-full ${STATUS_DOT_COLORS[row.status] || 'bg-slate-500'}`} />
                        <span className={`text-sm ${STATUS_TEXT_COLORS[row.status] || 'text-slate-300'}`}>{row.status}</span>
                      </button>
                    </td>
                    {matrixData.groups.map((g) => (
                      <td key={g} className="px-4 py-2 text-right text-sm tabular-nums text-slate-400">
                        {row.cells[g] ? row.cells[g].toLocaleString() : <span className="text-slate-700">—</span>}
                      </td>
                    ))}
                    <td className="px-4 py-2 text-right text-sm tabular-nums font-medium text-slate-200">{row.total.toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="bg-slate-800/20">
                  <td className="px-4 py-2 text-sm font-medium text-slate-400">Total</td>
                  {matrixData.groups.map((g) => {
                    const col = matrixData.rows.reduce((s, r) => s + (r.cells[g] || 0), 0);
                    return <td key={g} className="px-4 py-2 text-right text-sm tabular-nums font-medium text-slate-300">{col.toLocaleString()}</td>;
                  })}
                  <td className="px-4 py-2 text-right text-sm tabular-nums font-bold text-white">{matrixGrandTotal.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Category Breakdown */}
          <div className="lg:col-span-2 rounded-xl border border-slate-800/80 bg-slate-900/50 p-4">
            <div className="mb-3">
              <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Category Breakdown</span>
            </div>
            <div className="space-y-1">
              <div className="mb-3">
                <div className="flex items-center justify-between px-1 py-1">
                  <span className="text-sm font-medium text-slate-200">Standards Track</span>
                  <span className="text-sm tabular-nums font-semibold text-slate-200">{standardsTrackTotal.toLocaleString()}</span>
                </div>
                <div className="ml-2 space-y-px">
                  {['Core', 'Networking', 'Interface', 'ERC'].map((cat) => (
                    <button key={cat} onClick={() => { setViewMode('type'); setActiveTab(cat.toLowerCase()); }}
                      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-slate-800/60">
                      <span className="text-slate-400">{cat}</span>
                      <span className="tabular-nums text-slate-300">{getCatCount(cat).toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              </div>
              {['Meta', 'Informational'].map((cat) => (
                <button key={cat} onClick={() => { setViewMode('type'); setActiveTab(cat.toLowerCase()); }}
                  className="flex w-full items-center justify-between rounded-md px-1 py-1.5 text-sm transition-colors hover:bg-slate-800/60">
                  <span className="font-medium text-slate-200">{cat}</span>
                  <span className="tabular-nums font-semibold text-slate-200">{getCatCount(cat).toLocaleString()}</span>
                </button>
              ))}
              <button onClick={() => setActiveTab('rips')}
                className="flex w-full items-center justify-between rounded-md px-1 py-1.5 text-sm transition-colors hover:bg-violet-500/10">
                <span className="font-medium text-violet-300">RIPs</span>
                <span className="tabular-nums font-semibold text-violet-200">{(ripKpis?.total || 0).toLocaleString()}</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* ─── 4. View Switch + Tabs ──────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
          className="mb-4"
        >
          <div className="mb-2.5 flex items-center justify-between">
            <div className="inline-flex items-center rounded-lg border border-slate-800/80 bg-slate-900/60 p-0.5">
              <button onClick={() => setViewMode('type')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${viewMode === 'type' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                <LayoutGrid className="h-3 w-3" /> By Category
              </button>
              <button onClick={() => setViewMode('status')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${viewMode === 'status' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                <BarChart3 className="h-3 w-3" /> By Lifecycle
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs tabular-nums text-slate-500">
                {hasColumnFilter ? `${filteredCount} of ${pageRowCount}` : `${totalRows.toLocaleString()} ${isRipMode ? 'RIPs' : 'proposals'}`}
              </span>
              {hasColumnFilter && <button onClick={() => setColumnSearch({})} className="text-xs text-slate-600 underline hover:text-slate-400">Clear</button>}
              <button onClick={handleExportCSV} disabled={exporting}
                className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/50 px-2.5 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:border-slate-700 hover:text-slate-300 disabled:opacity-40">
                {exporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />} CSV
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={viewMode} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
              className="flex items-center gap-1 overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-900/40 p-1.5 scrollbar-thin">
              {currentTabs.map((tab) => {
                const count = getTabCount(tab.id, currentTabs);
                const isActive = activeTab === tab.id;
                const isRip = tab.isRip;
                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`group flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                      isActive ? (isRip ? 'bg-violet-500/15 text-violet-200' : 'bg-slate-800 text-white shadow-sm') :
                      (isRip ? 'text-violet-400/50 hover:text-violet-300' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200')
                    }`}>
                    <span className={isActive ? (isRip ? 'text-violet-400' : 'text-cyan-400') : 'text-slate-600 group-hover:text-slate-400'}>{tab.icon}</span>
                    {tab.label}
                    {count > 0 && (
                      <span className={`text-xs tabular-nums ${isActive ? (isRip ? 'text-violet-300/70' : 'text-slate-400') : 'text-slate-600'}`}>
                        {count.toLocaleString()}
                      </span>
                    )}
                  </button>
                );
              })}
            </motion.div>
          </AnimatePresence>
          {activeTabDef?.description && <p className="mt-2 text-xs text-slate-500">{activeTabDef.description}</p>}
        </motion.div>

        {/* ─── 5. Main Table ──────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2 }}
          className="mb-8 overflow-hidden rounded-xl border border-slate-800/80 bg-slate-900/30"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800/80">
                  {columns.map((col) => (
                    <th key={col.key} className={`px-4 py-2 text-left ${col.w}`}>
                      <div className="flex cursor-pointer select-none items-center text-xs font-semibold tracking-wider text-slate-500 uppercase hover:text-slate-300" onClick={() => handleSort(col.key)}>
                        {col.label}<SortIcon column={col.key} current={sortBy} dir={sortDir} />
                      </div>
                      <input type="text" value={columnSearch[col.key] || ''}
                        onChange={(e) => setColumnSearch((p) => ({ ...p, [col.key]: e.target.value }))}
                        onClick={(e) => e.stopPropagation()} placeholder="Filter..."
                        className="mt-1 w-full rounded border border-slate-800/50 bg-transparent px-2 py-0.5 text-xs font-normal normal-case tracking-normal text-slate-400 placeholder-slate-700 outline-none focus:border-slate-700 focus:text-slate-200" />
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
                    <tr key={`rip-${row.number}`} className="border-b border-slate-800/20 transition-colors hover:bg-slate-800/20">
                      <td className="px-4 py-2"><Link href={`/rip/${row.number}`} className="font-mono text-sm font-semibold text-violet-400 hover:text-violet-300">RIP-{row.number}</Link></td>
                      <td className="px-4 py-2"><Link href={`/rip/${row.number}`} className="line-clamp-1 text-sm text-slate-300 hover:text-white">{row.title || 'Untitled'}</Link></td>
                      <td className="px-4 py-2 text-sm text-slate-500">{row.author ? row.author.split(',')[0].trim().replace(/^"|"$/g, '') : '—'}</td>
                      <td className="px-4 py-2"><StatusBadge status={row.status || 'Draft'} /></td>
                      <td className="px-4 py-2 tabular-nums text-sm text-slate-500">{row.createdAt || '—'}</td>
                      <td className="px-4 py-2 tabular-nums text-sm text-slate-500">{row.lastCommit || '—'}</td>
                      <td className="px-4 py-2 tabular-nums text-sm text-slate-400">{row.commits}</td>
                    </tr>
                  ))
                ) : (
                  !filteredEipRows.length ? (
                    <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-slate-600">No proposals match your filters.</td></tr>
                  ) : filteredEipRows.map((row) => {
                    const url = getProposalUrl(row.repo, row.number);
                    return (
                      <tr key={`${row.repo}-${row.number}`} className="border-b border-slate-800/20 transition-colors hover:bg-slate-800/20">
                        <td className="px-4 py-2"><Link href={url} className="font-mono text-sm font-semibold text-cyan-400 hover:text-cyan-300">{getProposalPrefix(row.repo)}-{row.number}</Link></td>
                        <td className="px-4 py-2"><Link href={url} className="line-clamp-1 text-sm text-slate-300 hover:text-white">{row.title || 'Untitled'}</Link></td>
                        <td className="px-4 py-2 text-sm text-slate-500">{row.author ? row.author.split(',')[0].trim().replace(/^"|"$/g, '') : '—'}</td>
                        <td className="px-4 py-2 text-sm text-slate-500">{row.type || '—'}</td>
                        <td className="px-4 py-2 text-sm text-slate-500">{row.category || '—'}</td>
                        <td className="px-4 py-2"><StatusBadge status={row.status} /></td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-800/60 px-4 py-2.5">
              <span className="text-xs tabular-nums text-slate-600">Page {page} of {totalPages}</span>
              <div className="flex items-center gap-0.5">
                <PgBtn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}><ChevronLeft className="h-3.5 w-3.5" /></PgBtn>
                {pageRange[0] > 1 && <><PgBtn onClick={() => setPage(1)}>1</PgBtn>{pageRange[0] > 2 && <span className="px-1 text-xs text-slate-700">…</span>}</>}
                {pageRange.map((p) => <PgBtn key={p} onClick={() => setPage(p)} active={p === page}>{p}</PgBtn>)}
                {pageRange[pageRange.length - 1] < totalPages && <>{pageRange[pageRange.length - 1] < totalPages - 1 && <span className="px-1 text-xs text-slate-700">…</span>}<PgBtn onClick={() => setPage(totalPages)}>{totalPages}</PgBtn></>}
                <PgBtn onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}><ChevronRight className="h-3.5 w-3.5" /></PgBtn>
              </div>
            </div>
          )}
        </motion.div>

        {/* ─── 6. Reference Panels ────────────────────────── */}
        <div className="space-y-4 mb-8">
          <RefPanel title="EIP Types">
            {TYPE_INFO.map((type) => (
              <div key={type.name} className="mb-3 last:mb-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-200">{type.name}</span>
                  <span className="text-xs tabular-nums text-slate-500">({type.name === 'Standards Track' ? standardsTrackTotal.toLocaleString() : getCatCount(type.name).toLocaleString()})</span>
                </div>
                <p className="mt-0.5 text-sm text-slate-500">{type.description}</p>
                {'subcategories' in type && type.subcategories && (
                  <div className="mt-2 ml-4 space-y-1">
                    {type.subcategories.map((sub) => (
                      <div key={sub.name} className="text-sm">
                        <span className="font-medium text-slate-400">{sub.name}</span>
                        <span className="ml-1 text-xs tabular-nums text-slate-600">({getCatCount(sub.name)})</span>
                        <span className="ml-1.5 text-slate-500">— {sub.description}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </RefPanel>

          <RefPanel title="Status Terms">
            <div className="space-y-2">
              {STATUS_TERMS.map((term) => (
                <div key={term.name} className="flex gap-2.5">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${STATUS_DOT_COLORS[term.name] || 'bg-purple-400'}`} />
                  <div>
                    <span className={`text-sm font-semibold ${term.color}`}>{term.name}</span>
                    {term.name !== 'Idea' && <span className="ml-1.5 text-xs tabular-nums text-slate-600">({(statusDist.find((d) => d.status === term.name)?.count || 0).toLocaleString()})</span>}
                    <p className="text-sm text-slate-500">{term.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </RefPanel>

          <RefPanel title="Contributing">
            <p className="text-sm leading-relaxed text-slate-400">
              First review <Link href="/eip/1" className="text-cyan-400 hover:text-cyan-300">EIP-1</Link>.
              Then clone the repository and add your EIP. There is a{' '}
              <a href="https://github.com/ethereum/EIPs/blob/master/eip-template.md?plain=1" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300">template EIP here</a>.
              Then submit a Pull Request to Ethereum&apos;s{' '}
              <a href="https://github.com/ethereum/EIPs" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300">EIPs repository</a>.
            </p>
          </RefPanel>
        </div>

        <p className="text-center text-xs text-slate-600">
          Data sourced from live GitHub repositories and indexed by EIPsInsight.
        </p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// SMALL COMPONENTS & UTILS
// ────────────────────────────────────────────────────────────────

function MetricCell({ label, value, color, onClick }: { label: string; value: number | string; color: string; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick} className={`flex flex-col items-center gap-0.5 px-4 py-2.5 ${onClick ? 'cursor-pointer transition-colors hover:bg-slate-800/40' : ''}`}>
      <span className={`text-base font-bold tabular-nums ${color}`}>{typeof value === 'number' ? value.toLocaleString() : value}</span>
      <span className="text-[10px] font-medium tracking-wider text-slate-500 uppercase">{label}</span>
    </Tag>
  );
}

function PgBtn({ children, onClick, disabled, active }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; active?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`flex h-7 min-w-[28px] items-center justify-center rounded-md text-xs font-medium transition-colors ${
        active ? 'border border-cyan-500/30 bg-cyan-500/10 text-cyan-300' : 'text-slate-500 hover:text-white disabled:opacity-20'
      }`}>{children}</button>
  );
}

function RefPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-xl border border-slate-800/80 bg-slate-900/30">
      <summary className="flex cursor-pointer items-center justify-between px-5 py-3 text-sm font-semibold text-slate-200 hover:text-white">
        {title}
        <span className="text-xs text-slate-600 transition-transform group-open:rotate-180">&#9660;</span>
      </summary>
      <div className="border-t border-slate-800/60 px-5 py-4">{children}</div>
    </details>
  );
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
