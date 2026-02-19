'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { client } from '@/lib/orpc';
import { motion } from 'motion/react';
import Link from 'next/link';
import {
  Download, Loader2, Layers, ChevronDown, ChevronUp, BarChart3,
  Activity, TrendingUp, FileText, ArrowRight, Users, Timer, Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ProtocolBento from '@/app/dashboard/_components/protocol-bento';
import GovernanceOverTime from '@/app/dashboard/_components/governance-over-time';
import TrendingProposals from '@/app/dashboard/_components/trending-proposals';
import { DashboardPageHeader } from '@/app/dashboard/_components/dashboard-page-header';

// ────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────

type CrossTabRow = { category: string; status: string; repo: string; count: number };
type KPI = { total: number; inReview: number; finalized: number; newThisYear: number };
type StatusRow = { status: string; count: number };
type CategoryRow = { category: string; count: number };
type FunnelRow = { status: string; count: number };
type RepoRow = { repo: string; proposals: number; activePRs: number; finals: number };
type DeltaRow = { status: string; count: number };
type UpgradeRow = { name: string; slug: string; total: number; finalized: number; inReview: number; draft: number; lastCall: number };
type VelocityData = { transitions: { from: string; to: string; medianDays: number | null; count: number }[]; draftToFinalMedian: number };

const STATUSES = ['Draft', 'Review', 'Last Call', 'Final', 'Living', 'Stagnant', 'Withdrawn'];
const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-slate-500/20 text-slate-600 dark:text-slate-300', Review: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
  'Last Call': 'bg-orange-500/20 text-orange-700 dark:text-orange-300', Final: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
  Living: 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300', Stagnant: 'bg-gray-500/20 text-gray-600 dark:text-gray-400',
  Withdrawn: 'bg-red-500/20 text-red-700 dark:text-red-300',
};
const STATUS_TEXT_COLORS: Record<string, string> = {
  Draft: 'text-slate-600 dark:text-slate-300', Review: 'text-amber-600 dark:text-amber-300', 'Last Call': 'text-orange-600 dark:text-orange-300',
  Final: 'text-emerald-600 dark:text-emerald-300', Living: 'text-cyan-600 dark:text-cyan-300', Stagnant: 'text-gray-600 dark:text-gray-400', Withdrawn: 'text-red-600 dark:text-red-300',
};
const STATUS_DOT_COLORS: Record<string, string> = {
  Draft: 'bg-slate-400', Review: 'bg-amber-400', 'Last Call': 'bg-orange-400', Final: 'bg-emerald-400',
  Stagnant: 'bg-gray-500', Withdrawn: 'bg-red-400', Living: 'bg-cyan-400',
};

// ────────────────────────────────────────────────────────────────
// CSV HELPER
// ────────────────────────────────────────────────────────────────

function downloadCSV(headers: string[], rows: string[][], filename: string) {
  const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ────────────────────────────────────────────────────────────────
// SMALL UI COMPONENTS
// ────────────────────────────────────────────────────────────────

function CSVBtn({ onClick, label = 'CSV' }: { onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 dark:border-slate-700/50 bg-slate-100 dark:bg-slate-800/40 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 transition-colors hover:border-slate-400 dark:hover:border-cyan-500/40 hover:text-slate-800 dark:hover:text-slate-200">
      <Download className="h-3 w-3" /> {label}
    </button>
  );
}

function DashCard({ title, icon, action, children, className = '' }: {
  title: string; icon: React.ReactNode; action?: React.ReactNode;
  children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn(
      'rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/40 overflow-hidden',
      'shadow-md dark:shadow-lg dark:shadow-slate-950/30 transition-all hover:border-slate-300 dark:hover:border-slate-700/80 hover:shadow-lg dark:hover:shadow-xl dark:hover:shadow-slate-950/40',
      className
    )}>
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/20 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-200 dark:bg-cyan-500/10 border border-slate-300 dark:border-cyan-400/20">
            <span className="text-slate-600 dark:text-cyan-400">{icon}</span>
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">{title}</span>
        </div>
        {action}
      </div>
      <div className="p-4 bg-slate-50/50 dark:bg-slate-900/20">{children}</div>
    </div>
  );
}

function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 rounded bg-slate-200 dark:bg-slate-800/50 animate-pulse" style={{ width: `${60 + ((i * 17) % 35)}%` }} />
      ))}
    </div>
  );
}

function MetricCell({ label, value, color, dot }: { label: string; value: number | string; color: string; dot?: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-5 py-4 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/30">
      <span className={cn('text-lg font-bold tabular-nums', color)}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
      <div className="flex items-center gap-1.5">
        {dot && <span className={cn('h-2 w-2 shrink-0 rounded-full', dot)} />}
        <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">{label}</span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// MAIN PAGE
// ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [kpis, setKpis] = useState<KPI | null>(null);
  const [crossTab, setCrossTab] = useState<CrossTabRow[] | null>(null);
  const [statusDist, setStatusDist] = useState<StatusRow[] | null>(null);
  const [catBreakdown, setCatBreakdown] = useState<CategoryRow[] | null>(null);
  const [funnel, setFunnel] = useState<FunnelRow[] | null>(null);
  const [repoDist, setRepoDist] = useState<RepoRow[] | null>(null);
  const [monthlyDelta, setMonthlyDelta] = useState<DeltaRow[] | null>(null);
  const [upgrades, setUpgrades] = useState<UpgradeRow[] | null>(null);
  const [velocity, setVelocity] = useState<VelocityData | null>(null);
  const [ripKpis, setRipKpis] = useState<{ total: number; active: number } | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (key: string) => setCollapsed(p => ({ ...p, [key]: !p[key] }));

  // ── Fetch all data (single batch to reduce DB connections) ──
  useEffect(() => {
    (async () => {
      try {
        const data = await client.dashboard.getDashboardOverview({});
        setKpis(data.kpis);
        setCrossTab(data.categoryStatusCrosstab);
        const sMap = new Map<string, number>();
        data.statusDistribution.forEach((r: StatusRow & { repo?: string }) => sMap.set(r.status, (sMap.get(r.status) || 0) + r.count));
        setStatusDist(Array.from(sMap.entries()).map(([status, count]) => ({ status, count })));
        setCatBreakdown(data.categoryBreakdown);
        setFunnel(data.statusFlow);
        setRepoDist(data.repoDistribution);
        setMonthlyDelta(data.monthlyDelta);
        setUpgrades(data.upgradeImpact);
        setVelocity(data.decisionVelocity);
        setRipKpis(data.ripKpis);
      } catch (err) { console.error('Dashboard fetch error:', err); }
    })();
  }, []);

  // ── Derived data ──
  const categories = useMemo(() => {
    if (!crossTab) return [];
    const set = new Set(crossTab.map(r => r.category));
    return Array.from(set).sort();
  }, [crossTab]);

  const matrixData = useMemo(() => {
    if (!crossTab || categories.length === 0) return null;
    const matrix: Record<string, Record<string, number>> = {};
    const catTotals: Record<string, number> = {};
    const statusTotals: Record<string, number> = {};
    let grandTotal = 0;
    for (const cat of categories) { matrix[cat] = {}; catTotals[cat] = 0; for (const s of STATUSES) matrix[cat][s] = 0; }
    for (const s of STATUSES) statusTotals[s] = 0;
    for (const r of crossTab) {
      if (!matrix[r.category]) { matrix[r.category] = {}; catTotals[r.category] = 0; for (const s of STATUSES) matrix[r.category][s] = 0; }
      matrix[r.category][r.status] = (matrix[r.category][r.status] || 0) + r.count;
      catTotals[r.category] = (catTotals[r.category] || 0) + r.count;
      statusTotals[r.status] = (statusTotals[r.status] || 0) + r.count;
      grandTotal += r.count;
    }
    return { matrix, catTotals, statusTotals, grandTotal };
  }, [crossTab, categories]);

  // repo breakdown from cross tab
  const repoBreakdown = useMemo(() => {
    if (!crossTab) return null;
    const map = new Map<string, { total: number; byStatus: Record<string, number>; byCategory: Record<string, number> }>();
    for (const r of crossTab) {
      if (!map.has(r.repo)) map.set(r.repo, { total: 0, byStatus: {}, byCategory: {} });
      const entry = map.get(r.repo)!;
      entry.total += r.count;
      entry.byStatus[r.status] = (entry.byStatus[r.status] || 0) + r.count;
      entry.byCategory[r.category] = (entry.byCategory[r.category] || 0) + r.count;
    }
    return Array.from(map.entries()).map(([repo, data]) => ({ repo, ...data })).sort((a, b) => b.total - a.total);
  }, [crossTab]);

  const monthLabel = new Date().toLocaleString('en', { month: 'long', year: 'numeric' });
  const loading = !kpis;

  // ── CSV helpers ──
  const exportCrossTab = () => {
    if (!matrixData) return;
    const headers = ['Category', ...STATUSES, 'Total'];
    const rows = categories.map(cat => [cat, ...STATUSES.map(s => String(matrixData.matrix[cat]?.[s] || 0)), String(matrixData.catTotals[cat] || 0)]);
    rows.push(['Total', ...STATUSES.map(s => String(matrixData.statusTotals[s] || 0)), String(matrixData.grandTotal)]);
    downloadCSV(headers, rows, `category-status-matrix-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const exportRepoBreakdown = () => {
    if (!repoBreakdown) return;
    const headers = ['Repo', ...STATUSES, 'Total'];
    const rows = repoBreakdown.map(r => [r.repo, ...STATUSES.map(s => String(r.byStatus[s] || 0)), String(r.total)]);
    downloadCSV(headers, rows, `repo-breakdown-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const exportStatusDist = () => {
    if (!statusDist) return;
    downloadCSV(['Status', 'Count'], statusDist.map(s => [s.status, String(s.count)]), `status-distribution-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const exportCatBreakdown = () => {
    if (!catBreakdown) return;
    downloadCSV(['Category', 'Count'], catBreakdown.map(c => [c.category, String(c.count)]), `category-breakdown-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const exportUpgrades = () => {
    if (!upgrades) return;
    downloadCSV(['Upgrade', 'Total', 'Final', 'Review', 'Last Call', 'Draft'],
      upgrades.map(u => [u.name, String(u.total), String(u.finalized), String(u.inReview), String(u.lastCall), String(u.draft)]),
      `upgrade-impact-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const exportFullRaw = () => {
    if (!crossTab) return;
    downloadCSV(['Category', 'Status', 'Repo', 'Count'], crossTab.map(r => [r.category, r.status, r.repo, String(r.count)]),
      `full-raw-breakdown-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const exportMonthlyDelta = () => {
    if (!monthlyDelta) return;
    downloadCSV(['Status', 'Count'], monthlyDelta.map(d => [d.status, String(d.count)]),
      `monthly-delta-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      {/* Subtle background accent (matches public page) */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(52,211,153,0.03),transparent_70%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(52,211,153,0.05),transparent_70%)]" />
      </div>

      <div className="relative z-10 w-full max-w-full px-4 py-8 sm:px-6 lg:px-8 xl:px-12">
        {/* ─── 1. Header ──────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-6">
          <DashboardPageHeader />
        </motion.div>

        <hr className="border-slate-200 dark:border-slate-800/50 mb-6" />

        {/* ─── 2. KPI Overview Bar ─────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }}
          className="mb-6 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/40 shadow-md dark:shadow-lg dark:shadow-slate-950/50">
          {loading ? (
            <div className="flex items-center gap-6 px-6 py-5">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="h-10 w-20 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800/50" />
              ))}
            </div>
          ) : (
            <div className="grid min-w-max grid-flow-col divide-x divide-slate-200 dark:divide-slate-700/50">
              <MetricCell label="Total" value={kpis!.total} color="text-slate-900 dark:text-white" />
              <MetricCell label="Draft" value={statusDist?.find(s => s.status === 'Draft')?.count ?? 0} color={STATUS_TEXT_COLORS.Draft} dot={STATUS_DOT_COLORS.Draft} />
              <MetricCell label="Review" value={statusDist?.find(s => s.status === 'Review')?.count ?? 0} color={STATUS_TEXT_COLORS.Review} dot={STATUS_DOT_COLORS.Review} />
              <MetricCell label="Last Call" value={statusDist?.find(s => s.status === 'Last Call')?.count ?? 0} color={STATUS_TEXT_COLORS['Last Call']} dot={STATUS_DOT_COLORS['Last Call']} />
              <MetricCell label="Final" value={statusDist?.find(s => s.status === 'Final')?.count ?? 0} color={STATUS_TEXT_COLORS.Final} dot={STATUS_DOT_COLORS.Final} />
              <MetricCell label="Living" value={statusDist?.find(s => s.status === 'Living')?.count ?? 0} color={STATUS_TEXT_COLORS.Living} dot={STATUS_DOT_COLORS.Living} />
              <MetricCell label="Stagnant" value={statusDist?.find(s => s.status === 'Stagnant')?.count ?? 0} color={STATUS_TEXT_COLORS.Stagnant} dot={STATUS_DOT_COLORS.Stagnant} />
              <MetricCell label="Withdrawn" value={statusDist?.find(s => s.status === 'Withdrawn')?.count ?? 0} color={STATUS_TEXT_COLORS.Withdrawn} dot={STATUS_DOT_COLORS.Withdrawn} />
              <MetricCell label="RIPs" value={ripKpis?.total ?? 0} color="text-violet-600 dark:text-violet-300" dot="bg-violet-400" />
            </div>
          )}
        </motion.div>

        <hr className="border-slate-200 dark:border-slate-800/50 mb-6" />

        {/* ─── 3. Protocol Bento ────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.08 }}
          className="mb-6 overflow-hidden">
          <ProtocolBento />
        </motion.div>

        <hr className="border-slate-200 dark:border-slate-800/50 mb-6" />

        {/* ─── 4. Category × Status Matrix ─────────────────── */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}
          className="mb-6">
          <DashCard title="Category × Status Matrix" icon={<Layers className="h-4 w-4" />}
            action={<div className="flex gap-2"><CSVBtn onClick={exportCrossTab} label="Matrix CSV" /><CSVBtn onClick={exportFullRaw} label="Full Raw CSV" /></div>}>
            {!matrixData ? <Skeleton rows={8} /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800/50">
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-600 dark:text-slate-500 uppercase">Category</th>
                      {STATUSES.map(s => (
                      <th key={s} className="px-3 py-2 text-right text-[10px] font-semibold text-slate-600 dark:text-slate-500 uppercase">{s}</th>
                    ))}
                      <th className="px-3 py-2 text-right text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map(cat => (
                      <tr key={cat} className="border-b border-slate-200 dark:border-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">{cat}</td>
                        {STATUSES.map(s => {
                          const val = matrixData.matrix[cat]?.[s] || 0;
                          return (
                            <td key={s} className="px-3 py-2 text-right tabular-nums">
                              {val > 0 ? (
                                <span className={cn('inline-block rounded px-1.5 py-0.5 text-[10px] font-medium', STATUS_COLORS[s] || 'text-slate-400')}>
                                  {val.toLocaleString()}
                                </span>
                              ) : <span className="text-slate-500 dark:text-slate-700">—</span>}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-right tabular-nums font-bold text-slate-800 dark:text-slate-200">{(matrixData.catTotals[cat] || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                    {/* Totals row */}
                    <tr className="border-t-2 border-slate-200 dark:border-slate-700/50 bg-slate-100 dark:bg-slate-800/20">
                      <td className="px-3 py-2 font-bold text-slate-700 dark:text-slate-300">Total</td>
                      {STATUSES.map(s => (
                        <td key={s} className="px-3 py-2 text-right tabular-nums font-bold text-slate-700 dark:text-slate-300">{(matrixData.statusTotals[s] || 0).toLocaleString()}</td>
                      ))}
                      <td className="px-3 py-2 text-right tabular-nums font-bold text-slate-900 dark:text-white">{matrixData.grandTotal.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </DashCard>
        </motion.div>

        <hr className="border-slate-200 dark:border-slate-800/50 mb-6" />

        {/* ─── 5. Repo × Status Breakdown ───────────────────── */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.12 }}
          className="mb-6">
          <DashCard title="Repository × Status Breakdown" icon={<Package className="h-4 w-4" />}
            action={<CSVBtn onClick={exportRepoBreakdown} label="Repo CSV" />}>
            {!repoBreakdown ? <Skeleton rows={3} /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800/50">
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-600 dark:text-slate-500 uppercase">Repo</th>
                      {STATUSES.map(s => <th key={s} className="px-3 py-2 text-right text-[10px] font-semibold text-slate-600 dark:text-slate-500 uppercase">{s}</th>)}
                      <th className="px-3 py-2 text-right text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repoBreakdown.map(r => (
                      <tr key={r.repo} className="border-b border-slate-200 dark:border-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">{r.repo}</td>
                        {STATUSES.map(s => {
                          const val = r.byStatus[s] || 0;
                          return (
                            <td key={s} className="px-3 py-2 text-right tabular-nums">
                              {val > 0 ? <span className={cn('inline-block rounded px-1.5 py-0.5 text-[10px] font-medium', STATUS_COLORS[s])}>{val.toLocaleString()}</span>
                                : <span className="text-slate-500 dark:text-slate-700">—</span>}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-right tabular-nums font-bold text-slate-800 dark:text-slate-200">{r.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            </DashCard>
        </motion.div>

        <hr className="border-slate-200 dark:border-slate-800/50 mb-6" />

        {/* ─── 6. Category & Status Breakdown ───────────────── */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.14 }}
          className="mb-6 grid gap-4 lg:grid-cols-2">
          {/* By Category */}
          <DashCard title="By Category" icon={<BarChart3 className="h-4 w-4" />}
            action={<CSVBtn onClick={exportCatBreakdown} />}>
            {!catBreakdown ? <Skeleton rows={6} /> : (
              <div className="space-y-1.5">
                {catBreakdown.sort((a, b) => b.count - a.count).map(c => {
                  const pct = kpis ? (c.count / kpis.total * 100) : 0;
                  return (
                    <div key={c.category} className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/20">
                      <span className="w-28 shrink-0 text-sm text-slate-700 dark:text-slate-300 truncate">{c.category}</span>
                      <div className="relative flex-1 h-5 rounded bg-slate-200 dark:bg-slate-800/50 overflow-hidden">
                        <div className="absolute inset-y-0 left-0 rounded bg-slate-400 dark:bg-cyan-500/25" style={{ width: `${pct}%` }} />
                        <span className="relative z-10 px-2 text-[10px] tabular-nums font-medium text-slate-700 dark:text-slate-300 leading-5">{c.count.toLocaleString()}</span>
                      </div>
                      <span className="w-12 text-right text-[10px] tabular-nums text-slate-500 dark:text-slate-600">{pct.toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </DashCard>

          {/* By Status */}
          <DashCard title="By Status" icon={<Activity className="h-4 w-4" />}
            action={<CSVBtn onClick={exportStatusDist} />}>
            {!statusDist ? <Skeleton rows={7} /> : (
              <div className="space-y-1.5">
                {statusDist.sort((a, b) => b.count - a.count).map(s => {
                  const pct = kpis ? (s.count / kpis.total * 100) : 0;
                  return (
                    <div key={s.status} className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/20">
                      <span className="w-24 shrink-0 text-sm text-slate-700 dark:text-slate-300">{s.status}</span>
                      <div className="relative flex-1 h-5 rounded bg-slate-200 dark:bg-slate-800/50 overflow-hidden">
                        <div className={cn('absolute inset-y-0 left-0 rounded', STATUS_COLORS[s.status]?.split(' ')[0] || 'bg-slate-500/30')}
                          style={{ width: `${pct}%` }} />
                        <span className="relative z-10 px-2 text-[10px] tabular-nums font-medium text-slate-700 dark:text-slate-300 leading-5">{s.count.toLocaleString()}</span>
                      </div>
                      <span className="w-12 text-right text-[10px] tabular-nums text-slate-500 dark:text-slate-600">{pct.toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </DashCard>
        </motion.div>

        <hr className="border-slate-200 dark:border-slate-800/50 mb-6" />

        {/* ─── 7. Lifecycle Funnel + Governance Velocity ───── */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.16 }}
          className="mb-6 grid gap-4 lg:grid-cols-2">
          {/* Funnel */}
          <DashCard title="Lifecycle Funnel" icon={<ArrowRight className="h-4 w-4" />}>
            {!funnel ? <Skeleton rows={4} /> : (
              <div className="space-y-3">
                {funnel.filter(f => f.count > 0).map((f, i, arr) => {
                  const maxCount = Math.max(...arr.map(a => a.count));
                  const pct = maxCount > 0 ? (f.count / maxCount * 100) : 0;
                  return (
                    <div key={f.status} className="flex items-center gap-3">
                      <span className="w-20 shrink-0 text-right text-xs text-slate-600 dark:text-slate-500">{f.status}</span>
                      <div className="relative flex-1 h-7 rounded-lg bg-slate-200 dark:bg-slate-800/50 overflow-hidden">
                        <div className={cn('absolute inset-y-0 left-0 rounded-lg transition-all', STATUS_COLORS[f.status]?.split(' ')[0] || 'bg-slate-400 dark:bg-cyan-500/20')}
                          style={{ width: `${pct}%` }} />
                        <span className="relative z-10 flex h-full items-center px-3 text-xs tabular-nums font-bold text-slate-800 dark:text-slate-200">{f.count.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </DashCard>

          {/* Velocity */}
          <DashCard title="Governance Velocity" icon={<Timer className="h-4 w-4" />}>
            {!velocity ? <Skeleton rows={4} /> : (
              <div className="space-y-2">
                {velocity.transitions.map(t => (
                  <div key={`${t.from}-${t.to}`} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800/20">
                    <span className="text-sm text-slate-600 dark:text-slate-400">{t.from} <ArrowRight className="mx-1 inline h-3 w-3 text-slate-500 dark:text-slate-600" /> {t.to}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm tabular-nums font-medium text-slate-800 dark:text-slate-200">{t.medianDays != null ? `${t.medianDays}d` : '—'}</span>
                      <span className="text-xs tabular-nums text-slate-500 dark:text-slate-600">({t.count})</span>
                    </div>
                  </div>
                ))}
                {velocity.draftToFinalMedian > 0 && (
                  <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Draft → Final (end-to-end)</span>
                    <span className="text-sm tabular-nums font-bold text-emerald-600 dark:text-emerald-400">{velocity.draftToFinalMedian}d median</span>
                  </div>
                )}
              </div>
            )}
          </DashCard>
        </motion.div>

        <hr className="border-slate-200 dark:border-slate-800/50 mb-6" />

        {/* ─── 8. Upgrade Impact + Monthly Delta ─────────────── */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.18 }}
          className="mb-6 grid gap-4 lg:grid-cols-2">
          {/* Upgrades */}
          <DashCard title="Upgrade Impact" icon={<TrendingUp className="h-4 w-4" />}
            action={<CSVBtn onClick={exportUpgrades} />}>
            {!upgrades ? <Skeleton rows={4} /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800/50">
                      <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-slate-600 dark:text-slate-500">Upgrade</th>
                      <th className="px-2 py-1.5 text-right text-[10px] font-semibold text-slate-600 dark:text-slate-500">Final</th>
                      <th className="px-2 py-1.5 text-right text-[10px] font-semibold text-slate-600 dark:text-slate-500">Review</th>
                      <th className="px-2 py-1.5 text-right text-[10px] font-semibold text-slate-600 dark:text-slate-500">LC</th>
                      <th className="px-2 py-1.5 text-right text-[10px] font-semibold text-slate-600 dark:text-slate-500">Draft</th>
                      <th className="px-2 py-1.5 text-right text-[10px] font-bold text-slate-500 dark:text-slate-400">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upgrades.map(u => (
                      <tr key={u.slug} className="border-b border-slate-200 dark:border-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/20">
                        <td className="px-2 py-1.5"><Link href={`/upgrade/${u.slug}`} className="font-medium text-slate-700 dark:text-cyan-300 hover:text-slate-900 dark:hover:text-cyan-200">{u.name}</Link></td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-emerald-600 dark:text-emerald-300">{u.finalized || '—'}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-amber-600 dark:text-amber-300">{u.inReview || '—'}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-orange-600 dark:text-orange-300">{u.lastCall || '—'}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-slate-600 dark:text-slate-400">{u.draft || '—'}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums font-bold text-slate-800 dark:text-slate-200">{u.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DashCard>

          {/* Monthly Delta */}
          <DashCard title={`${monthLabel} Delta`} icon={<Activity className="h-4 w-4" />}
            action={<CSVBtn onClick={exportMonthlyDelta} />}>
            {!monthlyDelta ? <Skeleton rows={5} /> : monthlyDelta.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-600">No status changes this month yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {monthlyDelta.map(d => (
                  <div key={d.status} className="rounded-md bg-slate-100 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800/30 px-3 py-2">
                    <div className="text-2xl tabular-nums font-bold text-slate-800 dark:text-slate-200">{d.count}</div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-500">{d.status}</div>
                  </div>
                ))}
              </div>
            )}
          </DashCard>
        </motion.div>

        <hr className="border-slate-200 dark:border-slate-800/50 mb-6" />

        {/* ─── 9. Governance Over Time ──────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.2 }}
          className="mb-6 overflow-hidden">
          <GovernanceOverTime />
        </motion.div>

        <hr className="border-slate-200 dark:border-slate-800/50 mb-6" />

        {/* ─── 10. Repo Distribution ────────────────────────── */}
        {repoDist && repoDist.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.22 }}
            className="mb-6">
            <DashCard title="Repository Distribution (Active PRs)" icon={<FileText className="h-4 w-4" />}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800/50">
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-600 dark:text-slate-500 uppercase">Repository</th>
                      <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-600 dark:text-slate-500 uppercase">Proposals</th>
                      <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-600 dark:text-slate-500 uppercase">Active PRs</th>
                      <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-600 dark:text-slate-500 uppercase">Finals</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repoDist.map(r => (
                      <tr key={r.repo} className="border-b border-slate-200 dark:border-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">{r.repo}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-300">{r.proposals.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-amber-600 dark:text-cyan-300">{r.activePRs.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-emerald-600 dark:text-emerald-300">{r.finals.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DashCard>
          </motion.div>
        )}

        {repoDist && repoDist.length > 0 && <hr className="border-slate-200 dark:border-slate-800/50 mb-6" />}

        {/* ─── 11. Trending Proposals ───────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.24 }}
          className="mb-6 overflow-hidden">
          <TrendingProposals />
        </motion.div>

        <hr className="border-slate-200 dark:border-slate-800/50 mb-6" />

        {/* ─── 12. Export Hub ───────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.26 }}>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/40 p-4 shadow-md dark:shadow-lg dark:shadow-slate-950/30">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Download any breakdown as CSV</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <ExportCard label="Category × Status Matrix" desc="Full cross-tab of all categories and statuses" onClick={exportCrossTab} disabled={!matrixData} />
              <ExportCard label="Full Raw Breakdown" desc="Category, status, repo — every row" onClick={exportFullRaw} disabled={!crossTab} />
              <ExportCard label="Repo × Status" desc="Repository breakdown by status" onClick={exportRepoBreakdown} disabled={!repoBreakdown} />
              <ExportCard label="Category Totals" desc="Total proposals per category" onClick={exportCatBreakdown} disabled={!catBreakdown} />
              <ExportCard label="Status Distribution" desc="Total proposals per status" onClick={exportStatusDist} disabled={!statusDist} />
              <ExportCard label="Upgrade Impact" desc="Proposals per upgrade by status" onClick={exportUpgrades} disabled={!upgrades} />
              <ExportCard label={`${monthLabel} Delta`} desc="Status changes this month" onClick={exportMonthlyDelta} disabled={!monthlyDelta} />
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}

function ExportCard({ label, desc, onClick, disabled }: { label: string; desc: string; onClick: () => void; disabled: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={cn(
        'flex flex-col items-start rounded-xl border p-3 text-left transition-all',
        disabled
          ? 'border-slate-200 dark:border-slate-800/40 bg-slate-100 dark:bg-slate-900/20 opacity-50 cursor-not-allowed'
          : 'border-slate-300 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/40 hover:border-slate-400 dark:hover:border-cyan-500/40 hover:bg-slate-100 dark:hover:bg-slate-800/40',
      )}>
      <Download className={cn('h-3.5 w-3.5 mb-1.5 shrink-0', disabled ? 'text-slate-400 dark:text-slate-600' : 'text-slate-600 dark:text-cyan-400')} />
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{label}</span>
      <span className="mt-0.5 text-xs text-slate-600 dark:text-slate-500 leading-tight">{desc}</span>
    </button>
  );
}
