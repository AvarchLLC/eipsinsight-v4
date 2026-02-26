"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useAnalytics, useAnalyticsExport } from "../analytics-layout-client";
import { client } from "@/lib/orpc";
import {
  Loader2, TrendingUp, FileText, CheckCircle,
  ArrowRight, Download, Layers, Activity, Timer,
  Cpu, Network, Code, Boxes, Info, GitCommitHorizontal,
  Zap, Eye, Bell, Pause, XCircle,
} from "lucide-react";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, LabelList, Legend, Brush,
} from "recharts";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ─── THEME COLORS (matches governance-over-time.tsx) ─────────────

const STATUS_COLORS: Record<string, string> = {
  Draft: "#22D3EE",
  Review: "#60A5FA",
  "Last Call": "#FBBF24",
  Final: "#34D399",
  Living: "#A78BFA",
  Stagnant: "#64748B",
  Withdrawn: "#94A3B8",
};

const CAT_COLORS: Record<string, string> = {
  Core: "#34D399",
  ERC: "#60A5FA",
  Networking: "#A78BFA",
  Interface: "#FBBF24",
  Meta: "#C084FC",
  Informational: "#94A3B8",
  RIP: "#FB923C",
  RIPs: "#FB923C",
};

const STATUS_ORDER = ["Draft", "Review", "Last Call", "Final", "Living", "Stagnant", "Withdrawn"];

const CAT_ICONS: Record<string, React.ReactNode> = {
  Core: <Cpu className="h-4 w-4" />,
  ERC: <Code className="h-4 w-4" />,
  Networking: <Network className="h-4 w-4" />,
  Interface: <Code className="h-4 w-4" />,
  Meta: <Boxes className="h-4 w-4" />,
  Informational: <Info className="h-4 w-4" />,
  RIPs: <GitCommitHorizontal className="h-4 w-4" />,
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  Draft: <FileText className="h-5 w-5" />,
  Review: <Eye className="h-5 w-5" />,
  "Last Call": <Bell className="h-5 w-5" />,
  Final: <CheckCircle className="h-5 w-5" />,
  Living: <Zap className="h-5 w-5" />,
  Stagnant: <Pause className="h-5 w-5" />,
  Withdrawn: <XCircle className="h-5 w-5" />,
};

const CAT_DESC: Record<string, string> = {
  Core: "Changes to the Ethereum protocol requiring a consensus fork.",
  ERC: "Application-level standards for tokens, accounts, and more.",
  Networking: "Changes to the Ethereum network protocol.",
  Interface: "Client API/RPC specs and language-level standards.",
  Meta: "Process changes outside the protocol itself.",
  Informational: "General guidelines and information.",
  RIPs: "Rollup Improvement Proposals for the rollup ecosystem.",
};

const STATUS_DESC: Record<string, string> = {
  Draft: "Under initial consideration, open for feedback.",
  Review: "Actively discussed and evaluated by the community.",
  "Last Call": "Final review window before moving to Final.",
  Final: "Formally accepted and implemented.",
  Living: "Continuously updated, never reaches finality.",
  Stagnant: "Inactive for 6+ months, not progressing.",
  Withdrawn: "Removed from consideration.",
};

// ─── HELPERS ──────────────────────────────────────────────────────

function Section({ title, icon, children, action, className }: {
  title: string; icon: React.ReactNode; children: React.ReactNode;
  action?: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn(
      "rounded-2xl border p-5",
      "border-slate-200 bg-white shadow-sm dark:border-slate-700/50 dark:bg-slate-900/60",
      className,
    )}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-cyan-600 dark:text-cyan-400">{icon}</span>
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function downloadCSV(headers: string[], rows: string[][], filename: string) {
  const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function CSVBtn({ onClick, label = "CSV" }: { onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700/30 bg-cyan-500/10 dark:bg-cyan-400/5 px-3 py-1 text-[10px] font-medium text-cyan-700 dark:text-cyan-300/80 hover:bg-cyan-500/20 dark:hover:bg-cyan-400/10 hover:text-cyan-800 dark:hover:text-cyan-200 transition-colors">
      <Download className="h-3 w-3" /> {label}
    </button>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────

export default function EIPsAnalyticsPage() {
  const { timeRange, repoFilter } = useAnalytics();
  const repoParam = repoFilter === "all" ? undefined : repoFilter;

  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<{ total?: number } | null>(null);
  const [ripKpis, setRipKpis] = useState<{ total?: number } | null>(null);
  const [crossTab, setCrossTab] = useState<Array<{ category: string; status: string; repo: string; count: number }>>([]);
  const [statusDist, setStatusDist] = useState<Array<{ status: string; count: number }>>([]);
  const [catBreakdown, setCatBreakdown] = useState<Array<{ category: string; count: number }>>([]);
  const [transitions, setTransitions] = useState<Array<{ from: string; to: string; value: number }>>([]);
  const [throughput, setThroughput] = useState<Array<Record<string, unknown>>>([]);
  const [funnel, setFunnel] = useState<Array<{ stage: string; count: number; color: string }>>([]);
  const [velocity, setVelocity] = useState<{
    transitions?: Array<{ from: string; to: string; medianDays?: number | null; count?: number }>;
    draftToFinalMedian?: number;
  } | null>(null);
  const [recentChanges, setRecentChanges] = useState<Array<Record<string, unknown>>>([]);
  const [creationTrends, setCreationTrends] = useState<Array<{ year?: number; repo?: string; count?: number }>>([]);
  const [ripCreationTrends, setRipCreationTrends] = useState<Array<{ year: number; repo: string; count: number }>>([]);
  const [monthlyDelta, setMonthlyDelta] = useState<Array<{ status: string; count: number }>>([]);
  const [selectedCat, setSelectedCat] = useState<string>("Core");
  const [cardsView, setCardsView] = useState<"status" | "category">("status");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [kRes, ripRes, ctRes, sdRes, cbRes] = await Promise.all([
          client.standards.getKPIs({ repo: repoParam }),
          client.standards.getRIPKPIs(),
          client.standards.getCategoryStatusCrosstab(),
          client.standards.getStatusDistribution({ repo: repoParam }),
          client.standards.getCategoryBreakdown({ repo: repoParam }),
        ]);
        setKpis(kRes); setRipKpis(ripRes); setCrossTab(ctRes);
        const sMap = new Map<string, number>();
        sdRes.forEach((r: { status: string; count: number }) => sMap.set(r.status, (sMap.get(r.status) || 0) + r.count));
        setStatusDist(Array.from(sMap.entries()).map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count));
        setCatBreakdown(cbRes);

        const [trRes, tpRes, fnRes, velRes, rcRes, ctTrends, ripTrends, mdRes] = await Promise.all([
          client.analytics.getEIPStatusTransitions({ repo: repoParam }),
          client.analytics.getEIPThroughput({ repo: repoParam, months: timeRange === "7d" ? 3 : timeRange === "30d" ? 6 : timeRange === "90d" ? 12 : timeRange === "1y" ? 24 : 60 }),
          client.analytics.getLifecycleData({ repo: repoParam }),
          client.analytics.getDecisionVelocity({ repo: repoParam }),
          client.analytics.getRecentChanges({ repo: repoParam, limit: 20 }),
          client.standards.getCreationTrends({ repo: repoParam }),
          client.standards.getRIPCreationTrends(),
          client.standards.getMonthlyDelta(),
        ]);
        setTransitions(trRes); setThroughput(tpRes); setFunnel(fnRes);
        setVelocity(velRes); setRecentChanges(rcRes);
        setCreationTrends(ctTrends); setRipCreationTrends(ripTrends); setMonthlyDelta(mdRes);
      } catch (err) { console.error("Analytics fetch error:", err); }
      setLoading(false);
    })();
  }, [timeRange, repoFilter, repoParam]);

  // ── Export Handler ──
  useAnalyticsExport(() => {
    // Combine all analytics data for export
    const exportData: Record<string, unknown>[] = [];

    // Add status distribution
    statusDist.forEach(item => {
      exportData.push({
        type: 'Status Distribution',
        status: item.status,
        count: item.count,
        percentage: total > 0 ? ((item.count / total) * 100).toFixed(2) + '%' : '0%'
      });
    });

    // Add category breakdown
    catBreakdown.forEach(item => {
      exportData.push({
        type: 'Category Breakdown',
        category: item.category,
        count: item.count,
        percentage: total > 0 ? ((item.count / total) * 100).toFixed(2) + '%' : '0%'
      });
    });

    // Add cross-tab data
    crossTab.forEach(item => {
      exportData.push({
        type: 'Category-Status Matrix',
        category: item.category,
        status: item.status,
        repo: item.repo,
        count: item.count
      });
    });

    return exportData;
  }, `eips-analytics-${repoFilter}`);

  // ── Derived ──
  const total = kpis?.total || 0;
  const statusCountMap = useMemo(() => {
    const m: Record<string, number> = {};
    statusDist.forEach(s => { m[s.status] = (m[s.status] || 0) + s.count; });
    return m;
  }, [statusDist]);

  const categories = useMemo(() => {
    const set = new Set(crossTab.map(r => r.category));
    return Array.from(set).filter(c => c).sort();
  }, [crossTab]);

  const catStatusMatrix = useMemo(() => {
    if (!crossTab.length) return null;
    const matrix: Record<string, Record<string, number>> = {};
    const catTotals: Record<string, number> = {};
    const stTotals: Record<string, number> = {};
    let grand = 0;
    for (const r of crossTab) {
      if (!r.category) continue;
      if (!matrix[r.category]) { matrix[r.category] = {}; catTotals[r.category] = 0; }
      matrix[r.category][r.status] = (matrix[r.category][r.status] || 0) + r.count;
      catTotals[r.category] = (catTotals[r.category] || 0) + r.count;
      stTotals[r.status] = (stTotals[r.status] || 0) + r.count;
      grand += r.count;
    }
    return { matrix, catTotals, stTotals, grand };
  }, [crossTab]);

  const catDrillDown = useMemo(() => {
    if (!crossTab.length) return [];
    return STATUS_ORDER.map(s => {
      const val = crossTab.filter(r => r.category === selectedCat && r.status === s).reduce((a, b) => a + b.count, 0);
      return { status: s, count: val, fill: STATUS_COLORS[s] || "#64748b" };
    }).filter(d => d.count > 0);
  }, [crossTab, selectedCat]);

  const catPieData = useMemo(() =>
    catBreakdown.filter(c => c.count > 0).map(c => ({ name: c.category, value: c.count, fill: CAT_COLORS[c.category] || "#64748b" })),
  [catBreakdown]);

  const statusPieData = useMemo(() =>
    statusDist.filter(s => s.count > 0).map(s => ({ name: s.status, value: s.count, fill: STATUS_COLORS[s.status] || "#64748b" })),
  [statusDist]);

  const pivotedTrends = useMemo(() => {
    const yearMap: Record<number, { year: number; eips: number; ercs: number; rips: number }> = {};
    for (const t of creationTrends) {
      const yr = t.year ?? 0;
      if (!yearMap[yr]) yearMap[yr] = { year: yr, eips: 0, ercs: 0, rips: 0 };
      const repo = String(t.repo || "").toLowerCase();
      const cnt = t.count ?? 0;
      if (repo === "eips") yearMap[yr].eips += cnt;
      else if (repo === "ercs") yearMap[yr].ercs += cnt;
      else if (repo === "rips") yearMap[yr].rips += cnt;
      else yearMap[yr].eips += cnt;
    }
    for (const t of ripCreationTrends) {
      const yr = t.year;
      if (!yearMap[yr]) yearMap[yr] = { year: yr, eips: 0, ercs: 0, rips: 0 };
      yearMap[yr].rips += t.count || 0;
    }
    return Object.values(yearMap).sort((a, b) => a.year - b.year);
  }, [creationTrends, ripCreationTrends]);

  const transitionFlows = useMemo(() => {
    const paths = [
      { from: "Draft", to: "Review" }, { from: "Review", to: "Last Call" },
      { from: "Last Call", to: "Final" }, { from: "Draft", to: "Stagnant" },
      { from: "Draft", to: "Withdrawn" }, { from: "Review", to: "Final" },
      { from: "Stagnant", to: "Draft" },
    ];
    return paths.map(p => {
      const t = transitions.find(tr => tr.from === p.from && tr.to === p.to);
      return { ...p, value: t?.value || 0, label: `${p.from} → ${p.to}` };
    }).filter(t => t.value > 0).sort((a, b) => b.value - a.value);
  }, [transitions]);

  const monthLabel = new Date().toLocaleString("en", { month: "long", year: "numeric" });

  const exportCrossTab = useCallback(() => {
    if (!catStatusMatrix) return;
    const cats = Object.keys(catStatusMatrix.matrix);
    const headers = ["Category", ...STATUS_ORDER, "Total"];
    const rows = cats.map(c => [c, ...STATUS_ORDER.map(s => String(catStatusMatrix.matrix[c]?.[s] || 0)), String(catStatusMatrix.catTotals[c] || 0)]);
    downloadCSV(headers, rows, `category-status-${new Date().toISOString().slice(0, 10)}.csv`);
  }, [catStatusMatrix]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-600 dark:text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ────── 1. STATUS / CATEGORY CARDS (toggle) ────── */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {cardsView === "status" ? "Status" : "Category"} — [{total.toLocaleString()}]
          </span>
          <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 p-0.5">
              <button
                onClick={() => setCardsView("status")}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                  cardsView === "status"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                Status
              </button>
              <button
                onClick={() => setCardsView("category")}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                  cardsView === "category"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                Category
              </button>
            </div>
        </div>
        {cardsView === "status" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7">
          {STATUS_ORDER.map(status => {
            const count = statusCountMap[status] || 0;
            const pct = total > 0 ? (count / total * 100).toFixed(1) : "0.0";
            const color = STATUS_COLORS[status];
            return (
              <Link key={status} href={`/explore/status?status=${encodeURIComponent(status)}`}
                className={cn(
                  "group rounded-xl border p-4 transition-all hover:scale-[1.02] active:scale-[0.98]",
                  "border-slate-200 bg-white dark:border-slate-700/50 dark:bg-slate-900/60",
                  "hover:border-slate-300 dark:hover:border-slate-600/50 hover:shadow-md dark:hover:shadow-lg",
                )}>
                <div className="flex items-center gap-2 mb-2">
                  <span style={{ color }} className="opacity-70 group-hover:opacity-100 transition-opacity">
                    {STATUS_ICONS[status]}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{status}</span>
                </div>
                <div className="text-2xl tabular-nums font-bold text-slate-800 dark:text-slate-100">{count.toLocaleString()}</div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full bg-slate-200 dark:bg-slate-800/60 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, parseFloat(pct))}%`, backgroundColor: color, boxShadow: `0 0 6px ${color}40` }} />
                  </div>
                  <span className="text-[10px] tabular-nums font-medium" style={{ color }}>{pct}%</span>
                </div>
                <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-600 leading-snug">{STATUS_DESC[status]}</p>
              </Link>
            );
          })}
        </div>
        ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7">
          {([
            { key: "Core", count: catBreakdown.find(c => c.category === "Core")?.count || 0 },
            { key: "ERC", count: catBreakdown.find(c => c.category === "ERC")?.count || 0 },
            { key: "Networking", count: catBreakdown.find(c => c.category === "Networking")?.count || 0 },
            { key: "Interface", count: catBreakdown.find(c => c.category === "Interface")?.count || 0 },
            { key: "Meta", count: catBreakdown.find(c => c.category === "Meta")?.count || 0 },
            { key: "Informational", count: catBreakdown.find(c => c.category === "Informational")?.count || 0 },
            { key: "RIPs", count: ripKpis?.total || 0 },
          ]).map(c => {
            const pct = total > 0 ? (c.count / total * 100).toFixed(1) : "0.0";
            const color = CAT_COLORS[c.key];
            const href = c.key === "RIPs" ? "/standards?tab=rips" : `/explore/status?category=${encodeURIComponent(c.key)}`;
            return (
              <Link key={c.key} href={href}
                className={cn(
                  "group rounded-xl border p-4 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer",
                  selectedCat === c.key
                    ? "border-cyan-500/40 bg-cyan-500/10 dark:border-cyan-500/40 dark:bg-cyan-500/10"
                    : "border-slate-200 bg-white dark:border-slate-700/50 dark:bg-slate-900/60",
                  "hover:border-slate-300 dark:hover:border-slate-600/50 hover:shadow-md dark:hover:shadow-lg",
                )}
                onClick={(e) => { e.preventDefault(); setSelectedCat(c.key); }}
                onDoubleClick={() => { window.location.href = href; }}>
                <div className="flex items-center gap-2 mb-2">
                  <span style={{ color }} className="opacity-70 group-hover:opacity-100 transition-opacity">
                    {CAT_ICONS[c.key]}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{c.key}</span>
                </div>
                <div className="text-2xl tabular-nums font-bold text-slate-800 dark:text-slate-100">{c.count.toLocaleString()}</div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full bg-slate-200 dark:bg-slate-800/60 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, parseFloat(pct))}%`, backgroundColor: color, boxShadow: `0 0 6px ${color}40` }} />
                  </div>
                  <span className="text-[10px] tabular-nums font-medium" style={{ color }}>{pct}%</span>
                </div>
                <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-600 leading-snug">{CAT_DESC[c.key]}</p>
              </Link>
            );
          })}
        </div>
        )}
      </div>

      {/* ────── 2. COMPOSITION CHARTS (side by side) ────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Category Composition" icon={<Layers className="h-4 w-4" />}>
          <div className="flex flex-col items-center gap-4 md:flex-row">
            <ChartContainer config={{ value: { label: "Count" } }} className="h-[260px] w-full max-w-[300px]">
              <PieChart>
                <Pie data={catPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={40} strokeWidth={0}>
                  {catPieData.map((e, i) => <Cell key={i} fill={e.fill} fillOpacity={0.75} />)}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => { const v = typeof value === "number" ? value : Number(value) || 0; return <span className="text-foreground">{v.toLocaleString()} ({total > 0 ? (v / total * 100).toFixed(1) : 0}%)</span>; }} />} />
              </PieChart>
            </ChartContainer>
            <div className="flex-1 space-y-1 w-full">
              {catBreakdown.sort((a, b) => b.count - a.count).map(c => (
                <div key={c.category} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/20 text-sm transition-colors">
                  <span className="h-2 w-2 rounded-sm shrink-0" style={{ background: CAT_COLORS[c.category] || "#64748b", boxShadow: `0 0 4px ${CAT_COLORS[c.category]}30` }} />
                  <span className="flex-1 text-slate-600 dark:text-slate-300 text-xs">{c.category}</span>
                  <span className="tabular-nums font-semibold text-slate-700 dark:text-slate-200 text-xs">{c.count.toLocaleString()}</span>
                  <span className="tabular-nums text-[10px] text-slate-500 w-10 text-right">{total > 0 ? (c.count / total * 100).toFixed(1) : 0}%</span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Status Composition" icon={<Activity className="h-4 w-4" />}>
          <div className="flex flex-col items-center gap-4 md:flex-row">
            <ChartContainer config={{ value: { label: "Count" } }} className="h-[260px] w-full max-w-[300px]">
              <PieChart>
                <Pie data={statusPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={40} strokeWidth={0}>
                  {statusPieData.map((e, i) => <Cell key={i} fill={e.fill} fillOpacity={0.75} />)}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => { const v = typeof value === "number" ? value : Number(value) || 0; return <span className="text-foreground">{v.toLocaleString()} ({total > 0 ? (v / total * 100).toFixed(1) : 0}%)</span>; }} />} />
              </PieChart>
            </ChartContainer>
            <div className="flex-1 space-y-1 w-full">
              {statusDist.map(s => (
                <div key={s.status} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/20 text-sm transition-colors">
                  <span className="h-2 w-2 rounded-sm shrink-0" style={{ background: STATUS_COLORS[s.status] || "#64748b", boxShadow: `0 0 4px ${STATUS_COLORS[s.status]}30` }} />
                  <span className="flex-1 text-slate-600 dark:text-slate-300 text-xs">{s.status}</span>
                  <span className="tabular-nums font-semibold text-slate-700 dark:text-slate-200 text-xs">{s.count.toLocaleString()}</span>
                  <span className="tabular-nums text-[10px] text-slate-500 w-10 text-right">{total > 0 ? (s.count / total * 100).toFixed(1) : 0}%</span>
                </div>
              ))}
            </div>
          </div>
        </Section>
      </div>

      {/* ────── 4. STATUS TRANSITION FLOW ────── */}
      <Section title="Status Transition Flow" icon={<ArrowRight className="h-4 w-4" />}>
        {transitionFlows.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-600">No transition data available.</p>
        ) : (
          <div className="space-y-2">
            {transitionFlows.map((flow, i) => {
              const maxVal = Math.max(...transitionFlows.map(f => f.value), 1);
              const color = STATUS_COLORS[flow.to] || "#60a5fa";
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-40 shrink-0 text-right">
                    <span className="text-xs text-slate-500">{flow.from}</span>
                    <ArrowRight className="mx-1 inline h-3 w-3 text-slate-500 dark:text-slate-600" />
                    <span className="text-xs font-medium" style={{ color }}>{flow.to}</span>
                  </div>
                  <div className="relative flex-1 h-7 rounded-lg bg-slate-100 dark:bg-slate-800/40 overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-lg transition-all duration-500"
                      style={{ width: `${(flow.value / maxVal) * 100}%`, background: `linear-gradient(90deg, ${color}60, ${color}30)`, boxShadow: `inset 0 0 12px ${color}20` }}
                    />
                    <span className="relative z-10 flex h-full items-center px-3 text-[11px] tabular-nums font-bold text-slate-800 dark:text-slate-100">
                      {flow.value.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* ────── 5. LIFECYCLE FUNNEL + GOVERNANCE VELOCITY ────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Lifecycle Funnel" icon={<TrendingUp className="h-4 w-4" />}>
          <ChartContainer config={{ count: { label: "Count", color: "#22c55e" } }} className="h-[260px] w-full">
            <BarChart data={funnel.filter(f => f.count > 0)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
              <XAxis type="number" stroke="#94a3b8" fontSize={11} />
              <YAxis dataKey="stage" type="category" stroke="#94a3b8" width={75} fontSize={11} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {funnel.filter(f => f.count > 0).map((entry, index) => (
                  <Cell key={index} fill={STATUS_COLORS[entry.stage] || entry.color} fillOpacity={0.7} />
                ))}
                <LabelList dataKey="count" position="right" fill="#64748b" fontSize={11} />
              </Bar>
            </BarChart>
          </ChartContainer>
        </Section>

        <Section title="Governance Velocity" icon={<Timer className="h-4 w-4" />}>
          {!velocity ? (
            <div className="space-y-2 py-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-4 rounded bg-slate-200 dark:bg-slate-800/30 animate-pulse" style={{ width: `${60 + ((i * 17) % 35)}%` }} />)}</div>
          ) : (
            <div className="space-y-1.5">
              {velocity.transitions?.map((t: { from: string; to: string; medianDays?: number | null; count?: number }) => {
                const color = STATUS_COLORS[t.to] || "#60a5fa";
                return (
                  <div key={`${t.from}-${t.to}`} className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-800/15 transition-colors">
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <span>{t.from}</span>
                      <ArrowRight className="h-3 w-3 text-slate-500 dark:text-slate-600" />
                      <span style={{ color }}>{t.to}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm tabular-nums font-semibold text-slate-700 dark:text-slate-200">
                        {t.medianDays != null ? `${t.medianDays}d` : "—"}
                      </span>
                      <span className="text-[10px] tabular-nums text-slate-500 dark:text-slate-600">({t.count} transitions)</span>
                    </div>
                  </div>
                );
              })}
              {(velocity.draftToFinalMedian ?? 0) > 0 && (
                <div className="mt-3 rounded-lg border border-emerald-500/15 bg-emerald-500/10 dark:bg-emerald-500/5 px-4 py-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300/80">Draft → Final (end-to-end)</span>
                  <span className="text-sm tabular-nums font-bold text-emerald-600 dark:text-emerald-400">{velocity.draftToFinalMedian}d median</span>
                </div>
              )}
            </div>
          )}
        </Section>
      </div>

      {/* ────── 6. CATEGORY × STATUS MATRIX ────── */}
      <Section title="Category × Status Cross-Tab" icon={<Layers className="h-4 w-4" />}
        action={<CSVBtn onClick={exportCrossTab} label="Export CSV" />}>
        {!catStatusMatrix ? (
          <div className="space-y-2 py-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-4 rounded bg-slate-200 dark:bg-slate-800/30 animate-pulse" style={{ width: `${60 + ((i * 17) % 35)}%` }} />)}</div>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800/30">
                  <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Category</th>
                  {STATUS_ORDER.map(s => (
                    <th key={s} className="px-2 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider" style={{ color: `${STATUS_COLORS[s]}90` }}>{s}</th>
                  ))}
                  <th className="px-3 py-2.5 text-right text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Total</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">%</th>
                </tr>
              </thead>
              <tbody>
                {categories.map(cat => (
                  <tr key={cat} className="border-b border-slate-100 dark:border-slate-800/15 hover:bg-slate-50 dark:hover:bg-slate-800/10 transition-colors">
                    <td className="px-3 py-2 font-medium text-slate-700 dark:text-slate-200 text-xs">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: CAT_COLORS[cat] }} />
                        {cat}
                      </span>
                    </td>
                    {STATUS_ORDER.map(s => {
                      const val = catStatusMatrix.matrix[cat]?.[s] || 0;
                      return (
                        <td key={s} className="px-2 py-2 text-right tabular-nums">
                          {val > 0 ? (
                            <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-medium"
                              style={{ background: `${STATUS_COLORS[s]}15`, color: STATUS_COLORS[s] }}>
                              {val.toLocaleString()}
                            </span>
                          ) : <span className="text-slate-400 dark:text-slate-800">—</span>}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-right tabular-nums font-bold text-slate-700 dark:text-slate-200 text-xs">{(catStatusMatrix.catTotals[cat] || 0).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-[10px] text-slate-500">{catStatusMatrix.grand > 0 ? ((catStatusMatrix.catTotals[cat] || 0) / catStatusMatrix.grand * 100).toFixed(1) : 0}%</td>
                  </tr>
                ))}
                <tr className="border-t border-slate-200 dark:border-slate-700/30 bg-slate-50 dark:bg-slate-800/10">
                  <td className="px-3 py-2.5 font-bold text-slate-600 dark:text-slate-300 text-xs">Total</td>
                  {STATUS_ORDER.map(s => (
                    <td key={s} className="px-2 py-2.5 text-right tabular-nums font-bold text-xs" style={{ color: STATUS_COLORS[s] }}>
                      {(catStatusMatrix.stTotals[s] || 0).toLocaleString()}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-right tabular-nums font-bold text-slate-800 dark:text-slate-100 text-xs">{catStatusMatrix.grand.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-[10px] text-slate-500">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* ────── 7. CATEGORY DEEP DIVE ────── */}
      <Section
        title={`Select Category to View Dashboard — ${selectedCat}`}
        icon={CAT_ICONS[selectedCat] || <Layers className="h-4 w-4" />}
        action={
          <select value={selectedCat} onChange={e => setSelectedCat(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-700/30 bg-white dark:bg-slate-800/40 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-cyan-500/30 transition-colors">
            {[...categories, "RIPs"].filter((v, i, a) => a.indexOf(v) === i).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        }>
        <div className="grid gap-5 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <ChartContainer config={{ count: { label: "Count" } }} className="h-[240px] w-full">
              <BarChart data={catDrillDown}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                <XAxis dataKey="status" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {catDrillDown.map((entry, i) => <Cell key={i} fill={entry.fill} fillOpacity={0.7} />)}
                  <LabelList dataKey="count" position="top" fill="#64748b" fontSize={11} />
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        </div>
      </Section>

      {/* ────── 8. DISTRIBUTION OVER YEARS ────── */}
      <Section title="Distribution Over Year (by Repository)" icon={<Activity className="h-4 w-4" />}>
        {pivotedTrends.length === 0 ? (
          <div className="space-y-2 py-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-4 rounded bg-slate-200 dark:bg-slate-800/30 animate-pulse" style={{ width: `${60 + ((i * 17) % 35)}%` }} />)}</div>
        ) : (
          <ChartContainer config={{
            eips: { label: "EIPs", color: "#34D399" },
            ercs: { label: "ERCs", color: "#60A5FA" },
            rips: { label: "RIPs", color: "#FB923C" },
          }} className="h-[320px] w-full">
            <BarChart data={pivotedTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
              <XAxis dataKey="year" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="eips" name="EIPs" stackId="a" fill="#34D399" fillOpacity={0.6} />
              <Bar dataKey="ercs" name="ERCs" stackId="a" fill="#60A5FA" fillOpacity={0.6} />
              <Bar dataKey="rips" name="RIPs" stackId="a" fill="#FB923C" fillOpacity={0.6} />
            </BarChart>
          </ChartContainer>
        )}
      </Section>

      {/* ────── 9. MONTHLY THROUGHPUT ────── */}
      <Section title="Monthly Throughput" icon={<Activity className="h-4 w-4" />}>
        {throughput.length === 0 ? (
          <div className="space-y-2 py-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-4 rounded bg-slate-200 dark:bg-slate-800/30 animate-pulse" style={{ width: `${60 + ((i * 17) % 35)}%` }} />)}</div>
        ) : (
          <ChartContainer config={{
            draft: { label: "Draft", color: STATUS_COLORS.Draft },
            review: { label: "Review", color: STATUS_COLORS.Review },
            lastCall: { label: "Last Call", color: STATUS_COLORS["Last Call"] },
            final: { label: "Final", color: STATUS_COLORS.Final },
          }} className="h-[340px] w-full">
            <AreaChart data={throughput}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" className="stroke-slate-200 dark:stroke-slate-700/50" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="draft" stroke={STATUS_COLORS.Draft} fill={`${STATUS_COLORS.Draft}20`} strokeWidth={2} />
              <Area type="monotone" dataKey="review" stroke={STATUS_COLORS.Review} fill={`${STATUS_COLORS.Review}20`} strokeWidth={2} />
              <Area type="monotone" dataKey="lastCall" stroke={STATUS_COLORS["Last Call"]} fill={`${STATUS_COLORS["Last Call"]}20`} strokeWidth={2} />
              <Area type="monotone" dataKey="final" stroke={STATUS_COLORS.Final} fill={`${STATUS_COLORS.Final}20`} strokeWidth={2} />
              <Brush dataKey="month" height={36} stroke="#94a3b8" fill="rgba(148,163,184,0.08)" travellerWidth={8} />
            </AreaChart>
          </ChartContainer>
        )}
      </Section>

      {/* ────── 10. GOVERNANCE DELTA THIS MONTH ────── */}
      <Section title={`${monthLabel} — Governance Delta`} icon={<Activity className="h-4 w-4" />}>
        {monthlyDelta.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-600">No changes this month.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {monthlyDelta.map(d => {
              const color = STATUS_COLORS[d.status] || "#64748b";
              return (
                <div key={d.status} className="rounded-lg border border-slate-200 dark:border-slate-800/20 bg-slate-50 dark:bg-slate-800/15 px-4 py-3 text-center">
                  <div className="text-2xl tabular-nums font-bold" style={{ color }}>{d.count}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 font-medium">{d.status}</div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* ────── 11. RECENT GOVERNANCE ACTIVITY ────── */}
      <Section title="Recent Governance Activity" icon={<Activity className="h-4 w-4" />}>
        {recentChanges.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-600">No recent changes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800/30">
                  <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">#</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Title</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Transition</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">When</th>
                </tr>
              </thead>
              <tbody>
                {recentChanges.slice(0, 15).map((c, i) => {
                  const item = c as { to?: string; from?: string; eip?: string; eip_type?: string; title?: string; days?: number; repository?: string };
                  const color = STATUS_COLORS[item.to ?? ""] || "#64748b";
                  const repo = String(item.repository ?? "").toLowerCase();
                  const repoPath = repo.includes("ercs") ? "ercs" : repo.includes("rips") ? "rips" : "eips";
                  return (
                    <tr key={i} className="border-b border-slate-100 dark:border-slate-800/10 hover:bg-slate-50 dark:hover:bg-slate-800/10 transition-colors">
                      <td className="px-3 py-2.5">
                        <Link href={`/standards/${repoPath}/${item.eip}`} className="text-cyan-600 dark:text-cyan-400/80 hover:text-cyan-700 dark:hover:text-cyan-300 font-medium transition-colors">
                          {item.eip_type}-{item.eip}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 max-w-xs truncate">{item.title}</td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium border"
                          style={{ background: `${color}10`, color, borderColor: `${color}20` }}>
                          {item.from} → {item.to}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-500 tabular-nums">
                        {item.days === 0 ? "today" : item.days === 1 ? "1d ago" : `${item.days ?? 0}d ago`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}
