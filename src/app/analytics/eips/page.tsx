"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ReactECharts from "echarts-for-react";
import { useTheme } from "next-themes";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Download,
  Eye,
  FileText,
  GitFork,
  GitPullRequest,
  Layers,
  Loader2,
  Pause,
  Star,
  Tag,
  TrendingUp,
  XCircle,
} from "lucide-react";

import { client } from "@/lib/orpc";
import { cn } from "@/lib/utils";
import { useAnalytics, useAnalyticsExport } from "../analytics-layout-client";
import { toast } from "sonner";
import { InlineBrandLoader } from "@/components/inline-brand-loader";
import { chartTooltip } from "@/lib/chart-theme";
import { ChartWatermark } from "@/components/chart-watermark";
import { ChartFooter } from "@/components/chart-footer";
import { SectionHead } from "@/components/ledger/section-head";
import { LedgerBadge } from "@/components/ledger/badge";

/* Ledger-aligned semantic palette (docs/DESIGN.md §2) */
const STATUS_COLORS: Record<string, string> = {
  Draft: "#64748b",
  Review: "#f59e0b",
  "Last Call": "#f97316",
  Final: "#10b981",
  Living: "#14b8a6",
  Stagnant: "#e11d48",
  Withdrawn: "#ef4444",
};

const CAT_COLORS: Record<string, string> = {
  Core: "#6366f1",
  ERC: "#10b981",
  Networking: "#0ea5e9",
  Interface: "#06b6d4",
  Meta: "#8b5cf6",
  Informational: "#64748b",
  RIP: "#eab308",
  RIPs: "#eab308",
};

const TYPE_COLORS: Record<string, string> = {
  "Standards Track": "#10b981",
  Meta: "#8b5cf6",
  Informational: "#0ea5e9",
  Unknown: "#64748b",
};

const STATUS_ORDER = ["Draft", "Review", "Last Call", "Final", "Living", "Stagnant", "Withdrawn"];
const STATUS_RANK: Record<string, number> = STATUS_ORDER.reduce((acc, s, i) => {
  acc[s] = i;
  return acc;
}, {} as Record<string, number>);

function ChartPanel({
  title,
  eyebrow,
  children,
  action,
  className,
  subtitle,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  subtitle?: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] p-5", className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] pb-3">
        <div>
          {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
          <h3 className="t-h3">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-[var(--ink-muted)]">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function downloadCSV(headers: string[], rows: string[][], filename: string) {
  const csv = [
    headers.join(","),
    ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  toast.success("Report downloaded", {
    description: filename,
  });
}

function downloadObjectCSV(rows: Array<Record<string, unknown>>, filename: string) {
  if (!rows.length) return;
  const headers = Array.from(
    rows.reduce((acc, row) => {
      Object.keys(row).forEach((k) => acc.add(k));
      return acc;
    }, new Set<string>()),
  );
  const dataRows = rows.map((row) => headers.map((h) => String(row[h] ?? "")));
  downloadCSV(headers, dataRows, filename);
}

function CSVBtn({
  onClick,
  label = "Export CSV",
  loading = false,
}: {
  onClick: () => void;
  label?: string;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      title={loading ? "Exporting..." : label}
      aria-label={loading ? "Exporting..." : label}
      className="btn btn-primary h-8 w-8 shrink-0 p-0 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
    </button>
  );
}

type CrossTabRow = { category: string; status: string; repo: string; count: number };
type RecentChangeRow = {
  from?: string;
  to?: string;
  eip?: string;
  eip_type?: string;
  title?: string;
  days?: number;
  repository?: string;
  category?: string;
  actor?: string;
  pr_number?: number;
  changed_at?: string | Date;
};

export default function EIPsAnalyticsPage() {
  const { timeRange, repoFilter } = useAnalytics();
  const { resolvedTheme } = useTheme();
  const repoParam = repoFilter === "all" ? undefined : repoFilter;
  const throughputMonths =
    timeRange === "7d" || timeRange === "15d"
      ? 3
      : timeRange === "30d"
        ? 6
        : timeRange === "90d"
          ? 12
          : timeRange === "1y"
            ? 24
            : 60;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState<{ total?: number } | null>(null);
  const [crossTab, setCrossTab] = useState<CrossTabRow[]>([]);
  const [statusDist, setStatusDist] = useState<Array<{ status: string; count: number }>>([]);
  const [catBreakdown, setCatBreakdown] = useState<Array<{ category: string; count: number }>>([]);
  const [typeBreakdown, setTypeBreakdown] = useState<Array<{ type: string; count: number }>>([]);
  const [githubStats, setGithubStats] = useState<{ stars: number; forks: number; watchers: number; openIssues: number; openPRs: number } | null>(null);
  // Which distribution dimension the consolidated tab row is showing.
  const [dimTab, setDimTab] = useState<"category" | "status" | "type">("category");
  const [transitions, setTransitions] = useState<Array<{ from: string; to: string; value: number }>>([]);
  const [throughput, setThroughput] = useState<Array<Record<string, unknown>>>([]);
  const [funnel, setFunnel] = useState<Array<{ stage: string; count: number }>>([]);
  const [velocity, setVelocity] = useState<{
    transitions?: Array<{ from: string; to: string; medianDays?: number | null; count?: number }>;
    draftToFinalMedian?: number;
  } | null>(null);
  const [recentChanges, setRecentChanges] = useState<RecentChangeRow[]>([]);
  const [recentStatusFilter, setRecentStatusFilter] = useState<string>("all");
  const [exportingPipeline, setExportingPipeline] = useState(false);
  const [exportingComposition, setExportingComposition] = useState(false);
  const [exportingTransition, setExportingTransition] = useState(false);
  const [exportingThroughput, setExportingThroughput] = useState(false);
  const [exportingHeatmap, setExportingHeatmap] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [kRes, ctRes, sdRes, cbRes, tbRes] = await Promise.all([
          client.standards.getKPIs({ repo: repoParam }),
          client.standards.getCategoryStatusCrosstab(),
          client.standards.getStatusDistribution({ repo: repoParam }),
          client.standards.getCategoryBreakdown({ repo: repoParam }),
          client.standards.getTypeBreakdown({ repo: repoParam }),
        ]);
        setKpis(kRes);
        setCrossTab(ctRes as CrossTabRow[]);
        setTypeBreakdown(tbRes as Array<{ type: string; count: number }>);

        // GitHub repo stats (v3 parity). For "all", sum across the three repos.
        const ghSlugs = repoParam ? [repoParam] : ["eips", "ercs", "rips"];
        Promise.all(ghSlugs.map((slug) => client.explore.getDetailRepoGithubStats({ slug }).catch(() => null)))
          .then((list) => {
            const acc = { stars: 0, forks: 0, watchers: 0, openIssues: 0, openPRs: 0 };
            for (const g of list) {
              if (!g) continue;
              acc.stars += g.stars ?? 0;
              acc.forks += g.forks ?? 0;
              acc.watchers += g.watchlist ?? 0;
              acc.openIssues += g.openIssues ?? 0;
              acc.openPRs += g.openPRs ?? 0;
            }
            setGithubStats(acc);
          })
          .catch(() => setGithubStats(null));

        const sMap = new Map<string, number>();
        (sdRes as Array<{ status: string; count: number }>).forEach((r) => {
          sMap.set(r.status, (sMap.get(r.status) || 0) + r.count);
        });
        setStatusDist(
          Array.from(sMap.entries())
            .map(([status, count]) => ({ status, count }))
            .sort((a, b) => b.count - a.count),
        );
        setCatBreakdown(cbRes as Array<{ category: string; count: number }>);

        const [trRes, tpRes, fnRes, velRes, rcRes] = await Promise.all([
          client.analytics.getEIPStatusTransitions({ repo: repoParam }),
          client.analytics.getEIPThroughput({
            repo: repoParam,
            months: throughputMonths,
          }),
          client.analytics.getLifecycleData({ repo: repoParam }),
          client.analytics.getDecisionVelocity({ repo: repoParam }),
          client.analytics.getRecentChanges({ repo: repoParam, limit: 20 }),
        ]);

        setTransitions(trRes as Array<{ from: string; to: string; value: number }>);
        setThroughput(tpRes as Array<Record<string, unknown>>);
        setFunnel(fnRes as Array<{ stage: string; count: number }>);
        setVelocity(velRes);
        setRecentChanges(rcRes as RecentChangeRow[]);
      } catch (err) {
        console.error("Analytics fetch error:", err);
        setError("Failed to load EIP analytics. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, [repoParam, timeRange, throughputMonths]);

  useAnalyticsExport(() => {
    const rows: Record<string, unknown>[] = [];
    statusDist.forEach((item) => rows.push({ type: "status", ...item }));
    catBreakdown.forEach((item) => rows.push({ type: "category", ...item }));
    crossTab.forEach((item) => rows.push({ type: "matrix", ...item }));
    return rows;
  }, `analytics-eips-${repoFilter}`);

  const total = kpis?.total || 0;

  const statusCountMap = useMemo(() => {
    const m: Record<string, number> = {};
    statusDist.forEach((s) => {
      m[s.status] = (m[s.status] || 0) + s.count;
    });
    return m;
  }, [statusDist]);

  const activeCount = (statusCountMap.Draft || 0) + (statusCountMap.Review || 0) + (statusCountMap["Last Call"] || 0);
  const finalizedCount = (statusCountMap.Final || 0) + (statusCountMap.Living || 0);
  const stagnantCount = statusCountMap.Stagnant || 0;
  const finalizationRate = total > 0 ? (finalizedCount / total) * 100 : 0;
  const stagnantRate = total > 0 ? (stagnantCount / total) * 100 : 0;
  const generatedAt = useMemo(() => new Date(), []);
  const lastUpdatedAt = useMemo(() => {
    if (!recentChanges.length) return null;
    const times = recentChanges
      .map((r) => (r.changed_at ? new Date(r.changed_at) : null))
      .filter((d): d is Date => !!d && !Number.isNaN(d.getTime()));
    if (!times.length) return null;
    return new Date(Math.max(...times.map((d) => d.getTime())));
  }, [recentChanges]);
  const nextUpdateAt = useMemo(() => {
    if (!lastUpdatedAt) return new Date(Date.now() + 24 * 60 * 60 * 1000);
    return new Date(lastUpdatedAt.getTime() + 24 * 60 * 60 * 1000);
  }, [lastUpdatedAt]);

  const healthBreakdown = useMemo(() => {
    const biggest = [...statusDist].sort((a, b) => b.count - a.count)[0];
    const pipelineShare = total > 0 ? (activeCount / total) * 100 : 0;
    const stalledVsPipeline = activeCount > 0 ? (stagnantCount / activeCount) * 100 : 0;
    const biggestShare = total > 0 && biggest ? (biggest.count / total) * 100 : 0;

    const latest = throughput[throughput.length - 1];
    const prev = throughput[throughput.length - 2];
    const latestVolume = latest
      ? Number(latest.draft || 0) + Number(latest.review || 0) + Number(latest.lastCall || 0) + Number(latest.final || 0)
      : 0;
    const prevVolume = prev
      ? Number(prev.draft || 0) + Number(prev.review || 0) + Number(prev.lastCall || 0) + Number(prev.final || 0)
      : 0;
    const volumeDeltaPct = prevVolume > 0 ? ((latestVolume - prevVolume) / prevVolume) * 100 : null;

    return {
      biggestStatus: biggest?.status || "Draft",
      biggestCount: biggest?.count || 0,
      biggestShare,
      pipelineShare,
      stalledVsPipeline,
      latestVolume,
      volumeDeltaPct,
    };
  }, [activeCount, stagnantCount, statusDist, throughput, total]);

  const transitionFlows = useMemo(() => {
    return transitions
      .filter((t) => {
        if (!(t.value > 0 && t.from && t.to)) return false;
        const fromRank = STATUS_RANK[t.from];
        const toRank = STATUS_RANK[t.to];
        if (fromRank == null || toRank == null) return false;
        return toRank > fromRank;
      })
      .sort((a, b) => b.value - a.value);
  }, [transitions]);

  const sankeyOption = useMemo(() => {
    const nodes = STATUS_ORDER.map((s) => ({ name: s, itemStyle: { color: STATUS_COLORS[s] || "#64748b" } }));
    return {
      backgroundColor: "transparent",
      tooltip: chartTooltip({ trigger: "item", confine: true }),
      series: [
        {
          type: "sankey",
          nodeAlign: "justify",
          layoutIterations: 64,
          emphasis: { focus: "adjacency" },
          lineStyle: { color: "gradient", curveness: 0.5, opacity: 0.5 },
          itemStyle: { borderWidth: 0 },
          label: { color: "var(--ink-muted)", fontSize: 11, fontWeight: 500 },
          data: nodes,
          links: transitionFlows.map((f) => ({ source: f.from, target: f.to, value: f.value })),
        },
      ],
    };
  }, [transitionFlows]);

  const pipelineOption = useMemo(() => {
    const ordered = STATUS_ORDER.map((status) => ({ status, value: statusCountMap[status] || 0 }));
    return {
      backgroundColor: "transparent",
      grid: { top: 14, left: 92, right: 44, bottom: 14, containLabel: false },
      tooltip: chartTooltip({ trigger: "axis", axisPointer: { type: "shadow" } }),
      xAxis: {
        type: "value",
        axisLabel: { color: "var(--ink-faint)", fontSize: 11 },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: "var(--border)", type: "dashed" } },
      },
      yAxis: {
        type: "category",
        data: ordered.map((d) => d.status),
        inverse: true,
        axisLabel: { color: "var(--ink)", fontSize: 12, fontWeight: 500 },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          type: "bar",
          showBackground: true,
          backgroundStyle: { color: "var(--surface-2)", borderRadius: 4 },
          data: ordered.map((d) => ({
            value: d.value,
            itemStyle: {
              color: STATUS_COLORS[d.status] || "#64748b",
              borderRadius: 4,
            },
          })),
          label: {
            show: true,
            position: "right",
            color: "var(--ink)",
            fontWeight: 600,
            formatter: ({ value }: { value: number }) => Number(value || 0).toLocaleString(),
          },
          emphasis: { focus: "series" },
          barWidth: 18,
        },
      ],
    };
  }, [statusCountMap]);

  const categoryDonutOption = useMemo(() => {
    const isDark = resolvedTheme === "dark";
    const rows = catBreakdown
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count)
      .map((c) => ({ name: c.category, value: c.count, itemStyle: { color: CAT_COLORS[c.category] || "#64748b" } }));
    const pctMap = new Map(rows.map((r) => [r.name, total > 0 ? ((r.value / total) * 100).toFixed(1) : "0.0"]));
    return {
      backgroundColor: "transparent",
      graphic: [],
      title: [
        {
          text: total.toLocaleString(),
          subtext: "Total Proposals",
          left: "34%",
          top: "43%",
          textAlign: "center",
          textStyle: {
            color: "var(--ink)",
            fontFamily: "var(--font-advercase), Georgia, serif",
            fontSize: 32,
            fontWeight: 700,
          },
          subtextStyle: {
            color: "var(--ink-faint)",
            fontSize: 11,
            fontWeight: 500,
          },
        },
      ],
      tooltip: chartTooltip({
        trigger: "item",
        confine: true,
        formatter: (p: { name: string; value: number; percent: number }) => `${p.name}: ${p.value.toLocaleString()} (${p.percent}%)`,
      }),
      legend: {
        type: "scroll",
        orient: "vertical",
        right: 8,
        top: "center",
        itemWidth: 10,
        itemHeight: 10,
        itemGap: 12,
        textStyle: { color: "var(--ink)", fontSize: 12, fontWeight: 500 },
        formatter: (name: string) => `${name}  ${pctMap.get(name)}%`,
      },
      series: [
        {
          type: "pie",
          radius: ["56%", "76%"],
          center: ["34%", "50%"],
          avoidLabelOverlap: true,
          label: { show: false },
          itemStyle: { borderColor: isDark ? "#1a1f1d" : "#ffffff", borderWidth: 2 },
          data: rows,
        },
      ],
    };
  }, [catBreakdown, total, resolvedTheme]);

  const typeTotal = useMemo(() => typeBreakdown.reduce((s, t) => s + t.count, 0), [typeBreakdown]);
  const typeDonutOption = useMemo(() => {
    const isDark = resolvedTheme === "dark";
    const rows = typeBreakdown
      .filter((t) => t.count > 0)
      .sort((a, b) => b.count - a.count)
      .map((t) => ({ name: t.type, value: t.count, itemStyle: { color: TYPE_COLORS[t.type] || "#64748b" } }));
    const pctMap = new Map(rows.map((r) => [r.name, typeTotal > 0 ? ((r.value / typeTotal) * 100).toFixed(1) : "0.0"]));
    return {
      backgroundColor: "transparent",
      graphic: [],
      title: [
        {
          text: typeTotal.toLocaleString(),
          subtext: "Total Proposals",
          left: "34%",
          top: "43%",
          textAlign: "center",
          textStyle: {
            color: "var(--ink)",
            fontFamily: "var(--font-advercase), Georgia, serif",
            fontSize: 32,
            fontWeight: 700,
          },
          subtextStyle: { color: "var(--ink-faint)", fontSize: 11, fontWeight: 500 },
        },
      ],
      tooltip: chartTooltip({
        trigger: "item",
        confine: true,
        formatter: (p: { name: string; value: number; percent: number }) => `${p.name}: ${p.value.toLocaleString()} (${p.percent}%)`,
      }),
      legend: {
        type: "scroll",
        orient: "vertical",
        right: 8,
        top: "center",
        itemWidth: 10,
        itemHeight: 10,
        itemGap: 12,
        textStyle: { color: "var(--ink)", fontSize: 12, fontWeight: 500 },
        formatter: (name: string) => `${name}  ${pctMap.get(name)}%`,
      },
      series: [
        {
          type: "pie",
          radius: ["56%", "76%"],
          center: ["34%", "50%"],
          avoidLabelOverlap: true,
          label: { show: false },
          itemStyle: { borderColor: isDark ? "#1a1f1d" : "#ffffff", borderWidth: 2 },
          data: rows,
        },
      ],
    };
  }, [typeBreakdown, typeTotal, resolvedTheme]);

  const throughputOption = useMemo(() => {
    const months = throughput.map((row) => String(row.month || ""));
    return {
      backgroundColor: "transparent",
      tooltip: chartTooltip({ trigger: "axis" }),
      legend: {
        top: 0,
        textStyle: { color: "var(--ink-muted)", fontSize: 11 },
      },
      grid: { top: 34, left: 42, right: 20, bottom: 26 },
      xAxis: {
        type: "category",
        data: months,
        axisLabel: { color: "var(--ink-faint)", fontSize: 11 },
        axisLine: { lineStyle: { color: "var(--border)" } },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: "var(--ink-faint)", fontSize: 11 },
        splitLine: { lineStyle: { color: "var(--border)", type: "dashed" } },
      },
      dataZoom: [
        {
          type: "inside",
          xAxisIndex: 0,
          filterMode: "none",
          start: 0,
          end: 100,
        },
        {
          type: "slider",
          xAxisIndex: 0,
          height: 16,
          bottom: 0,
          borderColor: "var(--border)",
          backgroundColor: "var(--surface-2)",
          fillerColor: "rgba(16, 185, 129, 0.2)",
          handleSize: 10,
          handleStyle: {
            color: "#10b981",
            borderColor: "#10b981",
          },
          moveHandleSize: 0,
          showDetail: false,
          start: 0,
          end: 100,
        },
      ],
      series: [
        { name: "Draft", type: "line", smooth: true, symbol: "none", data: throughput.map((r) => Number(r.draft || 0)), lineStyle: { width: 2, color: STATUS_COLORS.Draft }, areaStyle: { color: `${STATUS_COLORS.Draft}1A` } },
        { name: "Review", type: "line", smooth: true, symbol: "none", data: throughput.map((r) => Number(r.review || 0)), lineStyle: { width: 2, color: STATUS_COLORS.Review }, areaStyle: { color: `${STATUS_COLORS.Review}1A` } },
        { name: "Last Call", type: "line", smooth: true, symbol: "none", data: throughput.map((r) => Number(r.lastCall || 0)), lineStyle: { width: 2, color: STATUS_COLORS["Last Call"] }, areaStyle: { color: `${STATUS_COLORS["Last Call"]}1A` } },
        { name: "Final", type: "line", smooth: true, symbol: "none", data: throughput.map((r) => Number(r.final || 0)), lineStyle: { width: 2.5, color: STATUS_COLORS.Final }, areaStyle: { color: `${STATUS_COLORS.Final}24` } },
      ],
    };
  }, [throughput]);

  const matrixData = useMemo(() => {
    const filteredCrossTab =
      repoFilter === "all"
        ? crossTab
        : crossTab.filter((row) =>
            repoFilter === "eips"
              ? row.repo === "EIPs"
              : repoFilter === "ercs"
                ? row.repo === "ERCs"
                : row.repo === "RIPs",
          );
    const categories = Array.from(new Set(filteredCrossTab.map((r) => r.category))).filter(Boolean).sort();
    const heat = categories.flatMap((cat, y) =>
      STATUS_ORDER.map((status, x) => {
        const value = filteredCrossTab
          .filter((r) => r.category === cat && r.status === status)
          .reduce((sum, r) => sum + r.count, 0);
        return [x, y, value];
      }),
    );
    const maxValue = Math.max(...heat.map((v) => Number(v[2])), 0);
    return { categories, heat, maxValue };
  }, [crossTab, repoFilter]);

  const matrixOption = useMemo(() => {
    const isDark = resolvedTheme === "dark";
    const visualRamp = isDark
      ? ["#1e2623", "#1b3b2f", "#047857", "#10b981", "#34d399"]
      : ["#f1f5f3", "#d1fae5", "#6ee7b7", "#10b981", "#047857"];
    return {
      backgroundColor: "transparent",
      tooltip: chartTooltip({
        position: "top",
        confine: true,
        formatter: (p: { data: [number, number, number] }) => {
          const [x, y, value] = p.data;
          return `${matrixData.categories[y]} × ${STATUS_ORDER[x]}: <b>${Number(value).toLocaleString()}</b>`;
        },
      }),
      grid: { top: 12, left: 110, right: 24, bottom: 32 },
      xAxis: {
        type: "category",
        data: STATUS_ORDER,
        axisLabel: { color: "var(--ink-muted)", fontSize: 11, interval: 0, fontWeight: 600 },
        axisLine: { lineStyle: { color: "var(--border)" } },
        axisTick: { show: false },
        splitArea: { show: false },
      },
      yAxis: {
        type: "category",
        data: matrixData.categories,
        axisLabel: { color: "var(--ink)", fontSize: 11, fontWeight: 500 },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      visualMap: {
        min: 0,
        max: matrixData.maxValue || 1,
        calculable: false,
        orient: "horizontal",
        left: "center",
        bottom: 0,
        textStyle: { color: "var(--ink-faint)", fontSize: 10 },
        inRange: { color: visualRamp },
      },
      series: [
        {
          type: "heatmap",
          data: matrixData.heat,
          itemStyle: {
            borderColor: isDark ? "#1a1f1d" : "#ffffff",
            borderWidth: 1.5,
            borderRadius: 3,
          },
          label: {
            show: true,
            fontSize: 10,
            rich: {
              hi: { color: isDark ? "#052e16" : "#ffffff", fontWeight: 700 },
              lo: { color: isDark ? "#94a3b8" : "#475569", fontWeight: 500 },
            },
            formatter: (p: { data: [number, number, number] }) => {
              const v = Number(p.data[2]);
              if (v <= 0) return "";
              return v >= (matrixData.maxValue || 1) * 0.45 ? `{hi|${v}}` : `{lo|${v}}`;
            },
          },
          emphasis: {
            itemStyle: {
              borderColor: "var(--ink)",
              borderWidth: 1.5,
            },
          },
        },
      ],
    };
  }, [matrixData, resolvedTheme]);

  const conversionRows = useMemo(() => {
    const stageMap = new Map<string, number>();
    funnel.forEach((f) => stageMap.set(f.stage, f.count));
    const order = ["Draft", "Review", "Last Call", "Final"];
    return order.map((stage, idx) => {
      const current = stageMap.get(stage) || 0;
      const prev = idx === 0 ? current : stageMap.get(order[idx - 1]) || 0;
      const conversion = idx === 0 ? 100 : prev > 0 ? (current / prev) * 100 : 0;
      return { stage, count: current, conversion };
    });
  }, [funnel]);

  const withMeta = useCallback(
    (section: string, rows: Array<Record<string, unknown>>) =>
      rows.map((row) => ({
        report_section: section,
        source: "EIPsInsight.com",
        generated_at: generatedAt.toISOString(),
        repo_filter: repoFilter,
        time_range: timeRange,
        last_updated_at: lastUpdatedAt ? lastUpdatedAt.toISOString() : "",
        next_update_at: nextUpdateAt ? nextUpdateAt.toISOString() : "",
        ...row,
      })),
    [generatedAt, lastUpdatedAt, nextUpdateAt, repoFilter, timeRange],
  );

  const getRepoSearchFilter = useCallback(() => {
    if (repoFilter === "eips") return "ethereum/EIPs";
    if (repoFilter === "ercs") return "ethereum/ERCs";
    if (repoFilter === "rips") return "ethereum/RIPs";
    return undefined;
  }, [repoFilter]);

  const downloadRawCSV = useCallback((csv: string, filename: string) => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Report downloaded", { description: filename });
  }, []);

  const exportCrossTab = useCallback(async () => {
    try {
      setExportingHeatmap(true);
      const lifecycleDetailed = await client.analytics.getLifecycleDetailed({ repo: repoParam });

      const summaryRows = matrixData.categories.flatMap((category) =>
        STATUS_ORDER.map((status) => {
          const count = crossTab
            .filter((r) => {
              const repoMatch =
                repoFilter === "all"
                  ? true
                  : repoFilter === "eips"
                    ? r.repo === "EIPs"
                    : repoFilter === "ercs"
                      ? r.repo === "ERCs"
                      : r.repo === "RIPs";
              return repoMatch && r.category === category && r.status === status;
            })
            .reduce((sum, r) => sum + r.count, 0);
          return {
            record_type: "summary",
            category,
            status,
            count,
            metric_definition: "Number of proposals in this Category × Status cell",
          };
        }),
      );

      const detailRows = (lifecycleDetailed as Array<{
        eip_number: number;
        type: string;
        title: string;
        status: string;
        category: string | null;
        repository: string;
        created_at: string | Date;
      }>).map((row) => ({
        record_type: "detail",
        proposal_number: row.eip_number,
        proposal_type: row.type ?? "EIP",
        title: row.title ?? "",
        status: row.status ?? "",
        category: row.category ?? "",
        repository: row.repository ?? "",
        created_at_utc: row.created_at ? new Date(row.created_at).toISOString() : "",
        metric_definition: "Proposal-level row used to build Category × Status heatmap counts",
      }));

      downloadObjectCSV(
        withMeta("category_status_heatmap", [...summaryRows, ...detailRows]),
        `eips-category-status-detailed-${new Date().toISOString().slice(0, 10)}.csv`,
      );
    } catch (err) {
      console.error("Heatmap export failed:", err);
      toast.error("Failed to export Category × Status Heatmap report");
    } finally {
      setExportingHeatmap(false);
    }
  }, [crossTab, matrixData.categories, repoFilter, repoParam, withMeta]);

  const exportPipelineCSV = useCallback(async () => {
    try {
      setExportingPipeline(true);
      const repoSearch = getRepoSearchFilter();
      const result = await client.standards.exportUnifiedDetailedCSV({
        dimension: "status",
        columnSearch: {
          github: repoSearch,
        },
      });
      downloadRawCSV(result.csv, result.filename.replace("unified-standards-status", "eips-pipeline-status-detailed"));
    } catch (err) {
      console.error("Pipeline export failed:", err);
      toast.error("Failed to export Pipeline Status report");
    } finally {
      setExportingPipeline(false);
    }
  }, [downloadRawCSV, getRepoSearchFilter]);

  const exportCompositionCSV = useCallback(async () => {
    try {
      setExportingComposition(true);
      const repoSearch = getRepoSearchFilter();
      const result = await client.standards.exportUnifiedDetailedCSV({
        dimension: "category",
        columnSearch: {
          github: repoSearch,
        },
      });
      downloadRawCSV(result.csv, result.filename.replace("unified-standards-category", "eips-proposal-composition-detailed"));
    } catch (err) {
      console.error("Composition export failed:", err);
      toast.error("Failed to export Proposal Composition report");
    } finally {
      setExportingComposition(false);
    }
  }, [downloadRawCSV, getRepoSearchFilter]);

  const exportLifecycleCSV = useCallback(() => {
    const rows = conversionRows.map((r) => ({
      stage: r.stage,
      count: r.count,
      conversion_from_previous_percent: r.conversion.toFixed(2),
    }));
    downloadObjectCSV(withMeta("lifecycle_conversion", rows), `eips-lifecycle-conversion-${new Date().toISOString().slice(0, 10)}.csv`);
  }, [conversionRows, withMeta]);

  const exportDecisionSpeedCSV = useCallback(() => {
    const rows = (velocity?.transitions || []).map((t) => ({
      from_status: t.from,
      to_status: t.to,
      median_days: t.medianDays ?? "",
      transitions_count: t.count ?? 0,
    }));
    downloadObjectCSV(withMeta("decision_speed", rows), `eips-decision-speed-${new Date().toISOString().slice(0, 10)}.csv`);
  }, [velocity?.transitions, withMeta]);

  const exportTransitionCSV = useCallback(async () => {
    try {
      setExportingTransition(true);
      const result = await client.analytics.exportEIPStatusTransitionsDetailedCSV({
        repo: repoParam,
      });
      downloadRawCSV(
        result.csv,
        result.filename.replace("eip-status-transitions-detailed", "eips-transition-flow-detailed"),
      );
    } catch (err) {
      console.error("Transition export failed:", err);
      toast.error("Failed to export Status Transition Flow report");
    } finally {
      setExportingTransition(false);
    }
  }, [downloadRawCSV, repoParam]);

  const exportThroughputCSV = useCallback(async () => {
    try {
      setExportingThroughput(true);
      const result = await client.analytics.exportEIPThroughputDetailedCSV({
        repo: repoParam,
        months: throughputMonths,
      });
      downloadRawCSV(
        result.csv,
        result.filename.replace("eip-throughput-detailed", "eips-monthly-throughput-detailed"),
      );
    } catch (err) {
      console.error("Throughput export failed:", err);
      toast.error("Failed to export Monthly Governance Throughput report");
    } finally {
      setExportingThroughput(false);
    }
  }, [downloadRawCSV, repoParam, throughputMonths]);

  const filteredRecentChanges = useMemo(() => {
    if (recentStatusFilter === "all") return recentChanges;
    return recentChanges.filter(
      (r) => (r.to || "").toLowerCase() === recentStatusFilter.toLowerCase(),
    );
  }, [recentChanges, recentStatusFilter]);

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <InlineBrandLoader size="md" label="Loading analytics..." />
      </div>
    );
  }

  const repoLabel =
    repoFilter === "all"
      ? "All repositories"
      : repoFilter === "eips"
        ? "ethereum/EIPs"
        : repoFilter === "ercs"
          ? "ethereum/ERCs"
          : "ethereum/RIPs";

  return (
    <div className="space-y-12 py-4">
      {error && (
        <div className="flex items-start gap-2 rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--ink)]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#ef4444]" />
          <span>{error}</span>
        </div>
      )}

      {/* Headline ruled KPI strip (unboxed Ledger plate) */}
      <div>
        <div className="grid grid-cols-2 divide-y divide-[var(--border)] border-y border-[var(--border)] bg-[var(--surface)] md:grid-cols-4 md:divide-x md:divide-y-0">
          <div className="px-5 py-5">
            <p className="eyebrow">Total Proposals</p>
            <p className="t-figure mt-2">{total.toLocaleString()}</p>
            <p className="mt-1.5 text-xs text-[var(--ink-muted)]">EIPs, ERCs &amp; RIPs tracked</p>
          </div>
          <div className="px-5 py-5">
            <p className="eyebrow">In Pipeline</p>
            <p className="t-figure mt-2">{activeCount.toLocaleString()}</p>
            <p className="mt-1.5 text-xs text-[var(--ink-muted)]">
              {healthBreakdown.pipelineShare.toFixed(1)}% active · Draft, Review, Last Call
            </p>
          </div>
          <div className="px-5 py-5">
            <p className="eyebrow">Finalized</p>
            <p className="t-figure mt-2">{finalizedCount.toLocaleString()}</p>
            <p className="mt-1.5 text-xs text-[var(--ink-muted)]">
              {finalizationRate.toFixed(1)}% finalization rate
            </p>
          </div>
          <div className="px-5 py-5">
            <p className="eyebrow">Median Draft → Final</p>
            <p className="t-figure mt-2">
              {velocity?.draftToFinalMedian ? `${velocity.draftToFinalMedian}d` : "—"}
            </p>
            <p className="mt-1.5 text-xs text-[var(--ink-muted)]">
              {stagnantCount.toLocaleString()} stagnant ({stagnantRate.toFixed(1)}%)
            </p>
          </div>
        </div>

        {/* Context & Quick Status Navigation Strip */}
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2.5 border-b border-[var(--border)] px-1 py-3 text-xs text-[var(--ink-muted)]">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="font-mono text-[11px] font-semibold text-[var(--ink)]">{repoLabel}</span>
            <span className="text-[var(--border-strong)]">·</span>
            <span>
              Snapshot:{" "}
              <span className="font-mono text-[var(--ink)]">
                {(lastUpdatedAt ?? generatedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </span>
            <span className="text-[var(--border-strong)]">·</span>
            <span>
              This month:{" "}
              <span className="font-mono font-semibold text-[var(--ink)]">
                {healthBreakdown.latestVolume.toLocaleString()}
              </span>{" "}
              changes
              {healthBreakdown.volumeDeltaPct != null && (
                <span
                  className={cn(
                    "ml-1 font-mono font-medium",
                    healthBreakdown.volumeDeltaPct >= 0 ? "text-[#10b981]" : "text-[#f97316]",
                  )}
                >
                  ({healthBreakdown.volumeDeltaPct >= 0 ? "+" : ""}
                  {healthBreakdown.volumeDeltaPct.toFixed(1)}%)
                </span>
              )}
            </span>
          </div>

          {githubStats && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px]">
              <span className="inline-flex items-center gap-1" title="GitHub stars">
                <Star className="h-3 w-3 text-[var(--ink-faint)]" />
                <span className="font-semibold text-[var(--ink)] tabular-nums">{githubStats.stars.toLocaleString()}</span>
              </span>
              <span className="inline-flex items-center gap-1" title="Forks">
                <GitFork className="h-3 w-3 text-[var(--ink-faint)]" />
                <span className="font-semibold text-[var(--ink)] tabular-nums">{githubStats.forks.toLocaleString()}</span>
              </span>
              <span className="inline-flex items-center gap-1" title="Watchers">
                <Eye className="h-3 w-3 text-[var(--ink-faint)]" />
                <span className="font-semibold text-[var(--ink)] tabular-nums">{githubStats.watchers.toLocaleString()}</span>
              </span>
              <span className="inline-flex items-center gap-1" title="Open issues">
                <AlertCircle className="h-3 w-3 text-[var(--ink-faint)]" />
                <span className="font-semibold text-[var(--ink)] tabular-nums">{githubStats.openIssues.toLocaleString()}</span>
              </span>
              <span className="inline-flex items-center gap-1" title="Open PRs">
                <GitPullRequest className="h-3 w-3 text-[var(--ink-faint)]" />
                <span className="font-semibold text-[var(--ink)] tabular-nums">{githubStats.openPRs.toLocaleString()}</span>
              </span>
            </div>
          )}
        </div>

        {/* Direct status jump strip */}
        <div className="flex flex-wrap items-center gap-2 pt-3">
          <span className="eyebrow mr-1">Jump to status:</span>
          {STATUS_ORDER.map((status) => {
            const count = statusCountMap[status] || 0;
            if (count === 0) return null;
            return (
              <Link
                key={status}
                href={`/standards?status=${encodeURIComponent(status)}`}
                className="inline-flex items-center gap-1.5 rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs transition-colors hover:border-[var(--ink)]"
              >
                <LedgerBadge token={status}>{status}</LedgerBadge>
                <span className="font-mono text-[11px] font-semibold tabular-nums text-[var(--ink)]">
                  {count.toLocaleString()}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Section 01: Portfolio Composition & Status Matrix */}
      <section>
        <SectionHead
          index="01"
          eyebrow="PORTFOLIO DISTRIBUTION"
          title="Composition & Status Matrix"
          description="Explore how Ethereum standards break down by category, lifecycle status, and specification type."
          action={
            <div className="flex items-center gap-2">
              <label htmlFor="eips-dim-select" className="eyebrow shrink-0">
                View:
              </label>
              <select
                id="eips-dim-select"
                value={dimTab}
                onChange={(e) => setDimTab(e.target.value as "category" | "status" | "type")}
                className="h-8 text-xs font-medium"
              >
                <option value="category">By Category</option>
                <option value="status">By Status</option>
                <option value="type">By Type</option>
              </select>
            </div>
          }
        />

        {dimTab === "category" && (
          <div className="grid gap-5 xl:grid-cols-2">
            <ChartPanel
              eyebrow="BREAKDOWN"
              title="Proposal Composition by Category"
              action={<CSVBtn onClick={exportCompositionCSV} loading={exportingComposition} />}
            >
              <div className="relative h-[320px] w-full">
                <ReactECharts option={categoryDonutOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} notMerge />
                <ChartWatermark />
              </div>
              <ChartFooter nextUpdateAt={nextUpdateAt} />
            </ChartPanel>
            <ChartPanel
              eyebrow="CROSS-TABULATION"
              title="Category × Status Heatmap"
              action={<CSVBtn onClick={exportCrossTab} loading={exportingHeatmap} />}
            >
              {matrixData.categories.length === 0 ? (
                <p className="py-12 text-center text-sm text-[var(--ink-muted)]">No category/status matrix data available.</p>
              ) : (
                <div className="relative h-[400px] w-full">
                  <ReactECharts option={matrixOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} />
                  <ChartWatermark />
                </div>
              )}
              <ChartFooter nextUpdateAt={nextUpdateAt} />
            </ChartPanel>
          </div>
        )}

        {dimTab === "status" && (
          <div className="grid gap-5 xl:grid-cols-2">
            <ChartPanel
              eyebrow="BACKLOG & FINALITY"
              title="Pipeline Status"
              action={<CSVBtn onClick={exportPipelineCSV} loading={exportingPipeline} />}
            >
              <div className="relative h-[320px] w-full">
                <ReactECharts option={pipelineOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} />
                <ChartWatermark />
              </div>
              <ChartFooter nextUpdateAt={nextUpdateAt} />
            </ChartPanel>
            <ChartPanel
              eyebrow="FLOW"
              title="Status Transition Flow"
              action={<CSVBtn onClick={exportTransitionCSV} loading={exportingTransition} />}
            >
              {transitionFlows.length === 0 ? (
                <p className="py-12 text-center text-sm text-[var(--ink-muted)]">No transition data available.</p>
              ) : (
                <div className="relative h-[340px] w-full">
                  <ReactECharts option={sankeyOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} />
                  <ChartWatermark />
                </div>
              )}
              <ChartFooter nextUpdateAt={nextUpdateAt} />
            </ChartPanel>
          </div>
        )}

        {dimTab === "type" && (
          <ChartPanel eyebrow="SPECIFICATION TYPE" title="Proposal Composition by Type">
            {typeBreakdown.length === 0 ? (
              <p className="py-12 text-center text-sm text-[var(--ink-muted)]">No type data available.</p>
            ) : (
              <div className="relative h-[340px] w-full">
                <ReactECharts option={typeDonutOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} notMerge />
                <ChartWatermark />
              </div>
            )}
            <ChartFooter nextUpdateAt={nextUpdateAt} />
          </ChartPanel>
        )}
      </section>

      {/* Section 02: Lifecycle Conversion & Decision Velocity */}
      <section>
        <SectionHead
          index="02"
          eyebrow="LIFECYCLE & VELOCITY"
          title="Stage Conversion & Decision Speed"
          description="How proposals progress through the standards track and the median time spent between governance milestones."
          action={
            <div className="flex flex-wrap items-center gap-2">
              <CSVBtn onClick={exportLifecycleCSV} label="Funnel CSV" />
              <CSVBtn onClick={exportDecisionSpeedCSV} label="Velocity CSV" />
            </div>
          }
        />

        <div className="grid gap-5 lg:grid-cols-12">
          {/* Funnel Conversion Strip (7 cols) */}
          <div className="lg:col-span-7">
            <div className="grid grid-cols-2 divide-y divide-[var(--border)] rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] sm:grid-cols-4 sm:divide-x sm:divide-y-0">
              {conversionRows.map((row, idx) => (
                <div key={row.stage} className="flex flex-col justify-between p-4">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <LedgerBadge token={row.stage}>{row.stage}</LedgerBadge>
                      <span className="font-mono text-[10px] text-[var(--ink-faint)]">0{idx + 1}</span>
                    </div>
                    <p className="t-figure mt-3 text-2xl sm:text-3xl">{row.count.toLocaleString()}</p>
                  </div>
                  <div className="mt-3 border-t border-[var(--border)] pt-2">
                    <p className="font-mono text-[11px] text-[var(--ink-muted)]">
                      {idx === 0 ? "Entry stage (100%)" : `${row.conversion.toFixed(1)}% from ${conversionRows[idx - 1].stage}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Decision Velocity Table (5 cols) */}
          <div className="lg:col-span-5">
            <div className="overflow-hidden rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                    <th className="px-4 py-2.5 text-left eyebrow">Transition</th>
                    <th className="px-4 py-2.5 text-right eyebrow">Median Days</th>
                    <th className="px-4 py-2.5 text-right eyebrow">Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {(velocity?.transitions || []).slice(0, 5).map((t, i) => (
                    <tr key={`${t.from}-${t.to}-${i}`} className="hover:bg-[var(--surface-2)]">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <LedgerBadge token={t.from} className="text-[10px]">{t.from}</LedgerBadge>
                          <ArrowRight className="h-3 w-3 text-[var(--ink-faint)]" />
                          <LedgerBadge token={t.to} className="text-[10px]">{t.to}</LedgerBadge>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums text-[var(--ink)]">
                        {t.medianDays != null ? `${t.medianDays}d` : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-[var(--ink-muted)]">
                        {(t.count ?? 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {(!velocity?.transitions || velocity.transitions.length === 0) && (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-[var(--ink-muted)]">
                        No transition velocity data available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Section 03: Monthly Governance Throughput */}
      <section>
        <SectionHead
          index="03"
          eyebrow="THROUGHPUT"
          title="Monthly Governance Throughput"
          description="Monthly status transitions across Draft, Review, Last Call, and Final over time."
          action={<CSVBtn onClick={exportThroughputCSV} loading={exportingThroughput} />}
        />
        <ChartPanel eyebrow="HISTORICAL VOLUME" title="Status Transitions per Month">
          {throughput.length === 0 ? (
            <p className="py-12 text-center text-sm text-[var(--ink-muted)]">No monthly throughput available.</p>
          ) : (
            <div className="relative h-[340px] w-full">
              <ReactECharts option={throughputOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} />
              <ChartWatermark />
            </div>
          )}
          <ChartFooter nextUpdateAt={nextUpdateAt} />
        </ChartPanel>
      </section>

      {/* Section 04: Recent Governance Activity */}
      <section>
        <SectionHead
          index="04"
          eyebrow="RECENT MOVEMENTS"
          title="Recent Governance Activity"
          description="Latest status transitions across tracked proposals."
          action={
            <div className="flex flex-wrap items-center gap-1.5">
              {(["all", "Final", "Last Call", "Review", "Draft", "Stagnant", "Withdrawn"] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  data-active={recentStatusFilter === status}
                  onClick={() => setRecentStatusFilter(status)}
                  className="chip"
                >
                  {status === "all" ? "All" : status}
                </button>
              ))}
            </div>
          }
        />

        {filteredRecentChanges.length === 0 ? (
          <div className="card-quiet px-5 py-8 text-center text-sm text-[var(--ink-muted)]">
            No recent transitions match the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                  <th className="px-4 py-3 text-left eyebrow">Proposal</th>
                  <th className="px-4 py-3 text-left eyebrow">Category</th>
                  <th className="px-4 py-3 text-left eyebrow">Transition</th>
                  <th className="px-4 py-3 text-left eyebrow">Actor</th>
                  <th className="px-4 py-3 text-left eyebrow">PR</th>
                  <th className="px-4 py-3 text-right eyebrow">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredRecentChanges.slice(0, 15).map((row, idx) => {
                  const from = row.from || "Unknown";
                  const to = row.to || "Draft";
                  const repo = String(row.repository || "").toLowerCase();
                  const repoPath = repo.includes("erc") ? "ercs" : repo.includes("rip") ? "rips" : "eips";
                  const eipNo = row.eip ? String(row.eip) : "";
                  const pfx = (row.eip_type || (repoPath === "ercs" ? "ERC" : repoPath === "rips" ? "RIP" : "EIP")).toUpperCase();
                  return (
                    <tr key={`${row.eip || "na"}-${idx}`} className="transition-colors hover:bg-[var(--surface-2)]">
                      <td className="px-4 py-3 text-sm text-[var(--ink)]">
                        {eipNo ? (
                          <Link
                            href={`/standards/${repoPath}/${eipNo}`}
                            className="font-mono font-semibold text-[var(--brand-strong)] hover:underline"
                          >
                            {pfx}-{eipNo}
                          </Link>
                        ) : (
                          <span className="text-[var(--ink-faint)]">—</span>
                        )}
                        <p className="mt-0.5 max-w-[280px] truncate text-xs text-[var(--ink-muted)]">
                          {row.title || "Untitled"}
                        </p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[var(--ink-muted)]">
                        {row.category || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <LedgerBadge token={from} className="text-[10px]">{from}</LedgerBadge>
                          <ArrowRight className="h-3 w-3 shrink-0 text-[var(--ink-faint)]" />
                          <LedgerBadge token={to} className="text-[10px]">{to}</LedgerBadge>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[var(--ink-muted)]">
                        {row.actor || "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {row.pr_number ? (
                          <Link
                            href={`/pr/${repoPath}/${row.pr_number}`}
                            className="text-[var(--brand-strong)] hover:underline"
                          >
                            #{row.pr_number}
                          </Link>
                        ) : (
                          <span className="text-[var(--ink-faint)]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-[var(--ink-muted)]">
                        {row.days === 0 ? "today" : row.days === 1 ? "1d ago" : `${row.days || 0}d ago`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Explore Further: clean ruled tiles */}
      <section>
        <SectionHead
          index="05"
          eyebrow="EXPLORE FURTHER"
          title="Related Views"
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/explore/status" className="tile flex items-center justify-between px-4 py-3.5">
            <div>
              <p className="eyebrow">Explorer</p>
              <p className="mt-0.5 text-sm font-medium text-[var(--ink)]">Status Explorer</p>
            </div>
            <ArrowRight className="tile-arrow h-4 w-4 text-[var(--ink-faint)]" />
          </Link>
          <Link href="/explore/trending" className="tile flex items-center justify-between px-4 py-3.5">
            <div>
              <p className="eyebrow">Momentum</p>
              <p className="mt-0.5 text-sm font-medium text-[var(--ink)]">Trending Proposals</p>
            </div>
            <ArrowRight className="tile-arrow h-4 w-4 text-[var(--ink-faint)]" />
          </Link>
          <Link href="/explore/years" className="tile flex items-center justify-between px-4 py-3.5">
            <div>
              <p className="eyebrow">History</p>
              <p className="mt-0.5 text-sm font-medium text-[var(--ink)]">Yearly Patterns</p>
            </div>
            <ArrowRight className="tile-arrow h-4 w-4 text-[var(--ink-faint)]" />
          </Link>
          <Link href="/insights" className="tile flex items-center justify-between px-4 py-3.5">
            <div>
              <p className="eyebrow">Editorial</p>
              <p className="mt-0.5 text-sm font-medium text-[var(--ink)]">Monthly Insights</p>
            </div>
            <ArrowRight className="tile-arrow h-4 w-4 text-[var(--ink-faint)]" />
          </Link>
        </div>
      </section>
    </div>
  );
}
