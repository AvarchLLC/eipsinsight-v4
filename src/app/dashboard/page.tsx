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
import ProtocolBento from '@/app/landing/_components/protocol-bento';
import GovernanceOverTime from '@/app/landing/_components/governance-over-time';
import TrendingProposals from '@/app/landing/_components/trending-proposals';

// ────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────

type CrossTabRow = { category: string; status: string; repo: string; count: number };
type KPI = { total: number; draft: number; review: number; lastCall: number; final: number; stagnant: number; withdrawn: number; living: number; newThisYear: number };
type StatusRow = { status: string; count: number };
type CategoryRow = { category: string; count: number };
type FunnelRow = { status: string; count: number };
type RepoRow = { repo: string; proposals: number; activePRs: number; finals: number };
type DeltaRow = { status: string; count: number };
type UpgradeRow = { name: string; slug: string; total: number; finalized: number; inReview: number; draft: number; lastCall: number };
type VelocityData = { transitions: { from: string; to: string; medianDays: number | null; count: number }[]; draftToFinalMedian: number };

const STATUSES = ['Draft', 'Review', 'Last Call', 'Final', 'Living', 'Stagnant', 'Withdrawn'];
const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-slate-500/20 text-slate-300', Review: 'bg-amber-500/20 text-amber-300',
  'Last Call': 'bg-orange-500/20 text-orange-300', Final: 'bg-emerald-500/20 text-emerald-300',
  Living: 'bg-cyan-500/20 text-cyan-300', Stagnant: 'bg-gray-500/20 text-gray-400',
  Withdrawn: 'bg-red-500/20 text-red-300',
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
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/50 bg-slate-800/50 px-2.5 py-1 text-[10px] font-medium text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-200">
      <Download className="h-3 w-3" /> {label}
    </button>
  );
}

function DashCard({ title, icon, action, children, className = '' }: {
  title: string; icon: React.ReactNode; action?: React.ReactNode;
  children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn('rounded-xl border border-slate-800/60 bg-slate-900/40 p-5', className)}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400/70">{icon}</span>
          <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 rounded bg-slate-800/50 animate-pulse" style={{ width: `${60 + ((i * 17) % 35)}%` }} />
      ))}
    </div>
  );
}

function StatCard({ label, value, sub, color = 'text-white' }: { label: string; value: number | string; sub?: string; color?: string }) {
  return (
    <div className="rounded-lg border border-slate-800/50 bg-slate-800/30 px-4 py-3 text-center">
      <div className={cn('text-2xl tabular-nums font-bold', color)}>{typeof value === 'number' ? value.toLocaleString() : value}</div>
      <div className="text-[11px] text-slate-500 font-medium">{label}</div>
      {sub && <div className="text-[10px] text-slate-600">{sub}</div>}
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

  // ── Fetch all data ──
  useEffect(() => {
    (async () => {
      try {
        const [kRes, ctRes, sdRes, cbRes, fRes, rdRes, mdRes, upRes, vRes, ripRes] = await Promise.all([
          client.standards.getKPIs({}),
          client.standards.getCategoryStatusCrosstab(),
          client.standards.getStatusDistribution({}),
          client.standards.getCategoryBreakdown({}),
          client.explore.getStatusFlow(),
          client.standards.getRepoDistribution(),
          client.standards.getMonthlyDelta(),
          client.standards.getUpgradeImpact(),
          client.analytics.getDecisionVelocity({}),
          client.standards.getRIPKPIs(),
        ]);
        setKpis(kRes);
        setCrossTab(ctRes);
        const sMap = new Map<string, number>();
        sdRes.forEach((r: StatusRow) => sMap.set(r.status, (sMap.get(r.status) || 0) + r.count));
        setStatusDist(Array.from(sMap.entries()).map(([status, count]) => ({ status, count })));
        setCatBreakdown(cbRes);
        setFunnel(fRes);
        setRepoDist(rdRes);
        setMonthlyDelta(mdRes);
        setUpgrades(upRes);
        setVelocity(vRes);
        setRipKpis({ total: ripRes.total, active: ripRes.active });
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
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="border-b border-slate-800/50 bg-slate-900/30 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6 lg:px-8">
          <h1 className="dec-title bg-linear-to-br from-emerald-300 via-slate-100 to-cyan-200 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
            Governance Dashboard
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-400">
            Comprehensive breakdown of all Ethereum proposals. Every category, status, and combination — with full CSV exports.
          </p>
        </div>
      </motion.div>

      <div className="container mx-auto px-4 py-6 lg:px-8 space-y-6">

        {/* ── KPI Summary ── */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }}>
          {loading ? <Skeleton rows={2} /> : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-9">
              <StatCard label="Total" value={kpis!.total} color="text-white" />
              <StatCard label="Draft" value={kpis!.draft} color="text-slate-300" />
              <StatCard label="Review" value={kpis!.review} color="text-amber-300" />
              <StatCard label="Last Call" value={kpis!.lastCall} color="text-orange-300" />
              <StatCard label="Final" value={kpis!.final} color="text-emerald-300" />
              <StatCard label="Living" value={kpis!.living} color="text-cyan-300" />
              <StatCard label="Stagnant" value={kpis!.stagnant} color="text-gray-400" />
              <StatCard label="Withdrawn" value={kpis!.withdrawn} color="text-red-300" />
              <StatCard label="RIPs" value={ripKpis?.total ?? 0} color="text-violet-300" />
            </div>
          )}
        </motion.div>

        {/* ── Protocol Bento (from Landing) ── */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.08 }}
          className="rounded-2xl border border-slate-800/50 overflow-hidden">
          <ProtocolBento />
        </motion.div>

        {/* ── Category × Status Cross-Tab Matrix ── */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}>
          <DashCard title="Category × Status Matrix" icon={<Layers className="h-4 w-4" />}
            action={<div className="flex gap-2"><CSVBtn onClick={exportCrossTab} label="Matrix CSV" /><CSVBtn onClick={exportFullRaw} label="Full Raw CSV" /></div>}>
            {!matrixData ? <Skeleton rows={8} /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-800/50">
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase">Category</th>
                      {STATUSES.map(s => (
                        <th key={s} className="px-3 py-2 text-right text-[10px] font-semibold text-slate-500 uppercase">{s}</th>
                      ))}
                      <th className="px-3 py-2 text-right text-[10px] font-bold text-slate-400 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map(cat => (
                      <tr key={cat} className="border-b border-slate-800/30 hover:bg-slate-800/20 transition-colors">
                        <td className="px-3 py-2 font-medium text-slate-200">{cat}</td>
                        {STATUSES.map(s => {
                          const val = matrixData.matrix[cat]?.[s] || 0;
                          return (
                            <td key={s} className="px-3 py-2 text-right tabular-nums">
                              {val > 0 ? (
                                <span className={cn('inline-block rounded px-1.5 py-0.5 text-[10px] font-medium', STATUS_COLORS[s] || 'text-slate-400')}>
                                  {val.toLocaleString()}
                                </span>
                              ) : <span className="text-slate-700">—</span>}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-right tabular-nums font-bold text-slate-200">{(matrixData.catTotals[cat] || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                    {/* Totals row */}
                    <tr className="border-t-2 border-slate-700/50 bg-slate-800/20">
                      <td className="px-3 py-2 font-bold text-slate-300">Total</td>
                      {STATUSES.map(s => (
                        <td key={s} className="px-3 py-2 text-right tabular-nums font-bold text-slate-300">{(matrixData.statusTotals[s] || 0).toLocaleString()}</td>
                      ))}
                      <td className="px-3 py-2 text-right tabular-nums font-bold text-white">{matrixData.grandTotal.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </DashCard>
        </motion.div>

        {/* ── Repo × Status Breakdown ── */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.12 }}>
          <DashCard title="Repository × Status Breakdown" icon={<Package className="h-4 w-4" />}
            action={<CSVBtn onClick={exportRepoBreakdown} label="Repo CSV" />}>
            {!repoBreakdown ? <Skeleton rows={3} /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-800/50">
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase">Repo</th>
                      {STATUSES.map(s => <th key={s} className="px-3 py-2 text-right text-[10px] font-semibold text-slate-500 uppercase">{s}</th>)}
                      <th className="px-3 py-2 text-right text-[10px] font-bold text-slate-400 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repoBreakdown.map(r => (
                      <tr key={r.repo} className="border-b border-slate-800/30 hover:bg-slate-800/20 transition-colors">
                        <td className="px-3 py-2 font-medium text-slate-200">{r.repo}</td>
                        {STATUSES.map(s => {
                          const val = r.byStatus[s] || 0;
                          return (
                            <td key={s} className="px-3 py-2 text-right tabular-nums">
                              {val > 0 ? <span className={cn('inline-block rounded px-1.5 py-0.5 text-[10px] font-medium', STATUS_COLORS[s])}>{val.toLocaleString()}</span>
                                : <span className="text-slate-700">—</span>}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-right tabular-nums font-bold text-slate-200">{r.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DashCard>
        </motion.div>

        {/* ── Category & Status Breakdown Side by Side ── */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.14 }}
          className="grid gap-4 lg:grid-cols-2">
          {/* By Category */}
          <DashCard title="By Category" icon={<BarChart3 className="h-4 w-4" />}
            action={<CSVBtn onClick={exportCatBreakdown} />}>
            {!catBreakdown ? <Skeleton rows={6} /> : (
              <div className="space-y-1.5">
                {catBreakdown.sort((a, b) => b.count - a.count).map(c => {
                  const pct = kpis ? (c.count / kpis.total * 100) : 0;
                  return (
                    <div key={c.category} className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-800/20">
                      <span className="w-28 shrink-0 text-sm text-slate-300 truncate">{c.category}</span>
                      <div className="relative flex-1 h-5 rounded bg-slate-800/50 overflow-hidden">
                        <div className="absolute inset-y-0 left-0 rounded bg-cyan-500/25" style={{ width: `${pct}%` }} />
                        <span className="relative z-10 px-2 text-[10px] tabular-nums font-medium text-slate-300 leading-5">{c.count.toLocaleString()}</span>
                      </div>
                      <span className="w-12 text-right text-[10px] tabular-nums text-slate-600">{pct.toFixed(1)}%</span>
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
                    <div key={s.status} className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-800/20">
                      <span className="w-24 shrink-0 text-sm text-slate-300">{s.status}</span>
                      <div className="relative flex-1 h-5 rounded bg-slate-800/50 overflow-hidden">
                        <div className={cn('absolute inset-y-0 left-0 rounded', STATUS_COLORS[s.status]?.split(' ')[0] || 'bg-slate-500/30')}
                          style={{ width: `${pct}%` }} />
                        <span className="relative z-10 px-2 text-[10px] tabular-nums font-medium text-slate-300 leading-5">{s.count.toLocaleString()}</span>
                      </div>
                      <span className="w-12 text-right text-[10px] tabular-nums text-slate-600">{pct.toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </DashCard>
        </motion.div>

        {/* ── Lifecycle Funnel + Governance Velocity ── */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.16 }}
          className="grid gap-4 lg:grid-cols-2">
          {/* Funnel */}
          <DashCard title="Lifecycle Funnel" icon={<ArrowRight className="h-4 w-4" />}>
            {!funnel ? <Skeleton rows={4} /> : (
              <div className="space-y-3">
                {funnel.filter(f => f.count > 0).map((f, i, arr) => {
                  const maxCount = Math.max(...arr.map(a => a.count));
                  const pct = maxCount > 0 ? (f.count / maxCount * 100) : 0;
                  return (
                    <div key={f.status} className="flex items-center gap-3">
                      <span className="w-20 shrink-0 text-right text-xs text-slate-500">{f.status}</span>
                      <div className="relative flex-1 h-7 rounded-lg bg-slate-800/50 overflow-hidden">
                        <div className={cn('absolute inset-y-0 left-0 rounded-lg transition-all', STATUS_COLORS[f.status]?.split(' ')[0] || 'bg-cyan-500/20')}
                          style={{ width: `${pct}%` }} />
                        <span className="relative z-10 flex h-full items-center px-3 text-xs tabular-nums font-bold text-slate-200">{f.count.toLocaleString()}</span>
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
                  <div key={`${t.from}-${t.to}`} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-800/20">
                    <span className="text-sm text-slate-400">{t.from} <ArrowRight className="mx-1 inline h-3 w-3 text-slate-600" /> {t.to}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm tabular-nums font-medium text-slate-200">{t.medianDays != null ? `${t.medianDays}d` : '—'}</span>
                      <span className="text-xs tabular-nums text-slate-600">({t.count})</span>
                    </div>
                  </div>
                ))}
                {velocity.draftToFinalMedian > 0 && (
                  <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-emerald-300">Draft → Final (end-to-end)</span>
                    <span className="text-sm tabular-nums font-bold text-emerald-400">{velocity.draftToFinalMedian}d median</span>
                  </div>
                )}
              </div>
            )}
          </DashCard>
        </motion.div>

        {/* ── Upgrade Impact + Monthly Delta ── */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.18 }}
          className="grid gap-4 lg:grid-cols-2">
          {/* Upgrades */}
          <DashCard title="Upgrade Impact" icon={<TrendingUp className="h-4 w-4" />}
            action={<CSVBtn onClick={exportUpgrades} />}>
            {!upgrades ? <Skeleton rows={4} /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-800/50">
                      <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-slate-500">Upgrade</th>
                      <th className="px-2 py-1.5 text-right text-[10px] font-semibold text-slate-500">Final</th>
                      <th className="px-2 py-1.5 text-right text-[10px] font-semibold text-slate-500">Review</th>
                      <th className="px-2 py-1.5 text-right text-[10px] font-semibold text-slate-500">LC</th>
                      <th className="px-2 py-1.5 text-right text-[10px] font-semibold text-slate-500">Draft</th>
                      <th className="px-2 py-1.5 text-right text-[10px] font-bold text-slate-400">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upgrades.map(u => (
                      <tr key={u.slug} className="border-b border-slate-800/30 hover:bg-slate-800/20">
                        <td className="px-2 py-1.5"><Link href={`/upgrade/${u.slug}`} className="font-medium text-cyan-300 hover:text-cyan-200">{u.name}</Link></td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-emerald-300">{u.finalized || '—'}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-amber-300">{u.inReview || '—'}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-orange-300">{u.lastCall || '—'}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-slate-400">{u.draft || '—'}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums font-bold text-slate-200">{u.total}</td>
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
                  <div key={d.status} className="rounded-lg bg-slate-800/30 border border-slate-800/50 px-4 py-3">
                    <div className="text-2xl tabular-nums font-bold text-slate-200">{d.count}</div>
                    <div className="text-[11px] text-slate-500">{d.status}</div>
                  </div>
                ))}
              </div>
            )}
          </DashCard>
        </motion.div>

        {/* ── Governance Over Time (from Landing) ── */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.2 }}
          className="rounded-2xl border border-slate-800/50 overflow-hidden">
          <GovernanceOverTime />
        </motion.div>

        {/* ── Repo Distribution (detailed) ── */}
        {repoDist && repoDist.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.22 }}>
            <DashCard title="Repository Distribution (Active PRs)" icon={<FileText className="h-4 w-4" />}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-800/50">
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase">Repository</th>
                      <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-500 uppercase">Proposals</th>
                      <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-500 uppercase">Active PRs</th>
                      <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-500 uppercase">Finals</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repoDist.map(r => (
                      <tr key={r.repo} className="border-b border-slate-800/30 hover:bg-slate-800/20 transition-colors">
                        <td className="px-3 py-2 font-medium text-slate-200">{r.repo}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-300">{r.proposals.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-cyan-300">{r.activePRs.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-emerald-300">{r.finals.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DashCard>
          </motion.div>
        )}

        {/* ── Trending Proposals (from Landing) ── */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.24 }}
          className="rounded-2xl border border-slate-800/50 overflow-hidden">
          <TrendingProposals />
        </motion.div>

        {/* ── Export Hub ── */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.26 }}>
          <DashCard title="Export Hub" icon={<Download className="h-4 w-4" />}>
            <p className="mb-4 text-xs text-slate-500">Download any breakdown as CSV. All data from the current snapshot.</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <ExportCard label="Category × Status Matrix" desc="Full cross-tab of all categories and statuses" onClick={exportCrossTab} disabled={!matrixData} />
              <ExportCard label="Full Raw Breakdown" desc="Category, status, repo — every row" onClick={exportFullRaw} disabled={!crossTab} />
              <ExportCard label="Repo × Status" desc="Repository breakdown by status" onClick={exportRepoBreakdown} disabled={!repoBreakdown} />
              <ExportCard label="Category Totals" desc="Total proposals per category" onClick={exportCatBreakdown} disabled={!catBreakdown} />
              <ExportCard label="Status Distribution" desc="Total proposals per status" onClick={exportStatusDist} disabled={!statusDist} />
              <ExportCard label="Upgrade Impact" desc="Proposals per upgrade by status" onClick={exportUpgrades} disabled={!upgrades} />
              <ExportCard label={`${monthLabel} Delta`} desc="Status changes this month" onClick={exportMonthlyDelta} disabled={!monthlyDelta} />
            </div>
          </DashCard>
        </motion.div>

      </div>
    </div>
  );
}

function ExportCard({ label, desc, onClick, disabled }: { label: string; desc: string; onClick: () => void; disabled: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={cn(
        'flex flex-col items-start rounded-xl border p-4 text-left transition-all',
        disabled
          ? 'border-slate-800/30 bg-slate-900/20 opacity-40 cursor-not-allowed'
          : 'border-slate-700/50 bg-slate-800/30 hover:border-cyan-500/30 hover:bg-slate-800/50 hover:shadow-[0_0_12px_rgba(34,211,238,0.08)]',
      )}>
      <Download className={cn('h-4 w-4 mb-2', disabled ? 'text-slate-600' : 'text-cyan-400')} />
      <span className="text-xs font-semibold text-slate-200">{label}</span>
      <span className="mt-0.5 text-[10px] text-slate-500 leading-tight">{desc}</span>
    </button>
  );
}
