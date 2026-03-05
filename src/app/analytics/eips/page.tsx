"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ReactECharts from "echarts-for-react";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Download,
  FileText,
  Layers,
  Loader2,
  Pause,
  Timer,
  TrendingUp,
  XCircle,
} from "lucide-react";

import { client } from "@/lib/orpc";
import { cn } from "@/lib/utils";
import { useAnalytics, useAnalyticsExport } from "../analytics-layout-client";

const STATUS_COLORS: Record<string, string> = {
  Draft: "#22D3EE",
  Review: "#60A5FA",
  "Last Call": "#FBBF24",
  Final: "#34D399",
  Living: "#A78BFA",
  Stagnant: "#64748B",
  Withdrawn: "#EF4444",
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
const STATUS_RANK: Record<string, number> = STATUS_ORDER.reduce((acc, s, i) => {
  acc[s] = i;
  return acc;
}, {} as Record<string, number>);

function Section({
  title,
  icon,
  children,
  action,
  className,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-border bg-card/60 p-5", className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-primary">{icon}</span>
          <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
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

function CSVBtn({ onClick, label = "Download CSV" }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-primary/25 bg-primary/10 px-3 text-sm text-primary transition-colors hover:border-primary/40 hover:bg-primary/15"
    >
      <Download className="h-4 w-4" />
      {label}
    </button>
  );
}

function formatFooterDate(value: Date | null): string {
  if (!value) return "—";
  const dd = String(value.getDate()).padStart(2, "0");
  const mm = String(value.getMonth() + 1).padStart(2, "0");
  const yyyy = value.getFullYear();
  const hh = value.toLocaleString("en-US", { hour: "2-digit", hour12: true }).slice(0, 2);
  const min = value.toLocaleString("en-US", { minute: "2-digit" });
  const ap = value.toLocaleString("en-US", { hour: "2-digit", hour12: true }).slice(-2).toUpperCase();
  return `${dd}-${mm}-${yyyy} ${hh}:${min} ${ap}`;
}

function ChartFooter({ nextUpdateAt }: { nextUpdateAt: Date | null }) {
  return (
    <div className="mt-3 border-t border-border/70 pt-2.5">
      <div className="flex items-center justify-between gap-3 rounded-md bg-muted/30 px-2.5 py-1.5 text-xs text-muted-foreground">
        <span className="font-medium text-foreground/90">EIPsInsight.com</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-primary/70" />
          Next Update: {formatFooterDate(nextUpdateAt)}
        </span>
      </div>
    </div>
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
  const repoParam = repoFilter === "all" ? undefined : repoFilter;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState<{ total?: number } | null>(null);
  const [crossTab, setCrossTab] = useState<CrossTabRow[]>([]);
  const [statusDist, setStatusDist] = useState<Array<{ status: string; count: number }>>([]);
  const [catBreakdown, setCatBreakdown] = useState<Array<{ category: string; count: number }>>([]);
  const [transitions, setTransitions] = useState<Array<{ from: string; to: string; value: number }>>([]);
  const [throughput, setThroughput] = useState<Array<Record<string, unknown>>>([]);
  const [funnel, setFunnel] = useState<Array<{ stage: string; count: number }>>([]);
  const [velocity, setVelocity] = useState<{
    transitions?: Array<{ from: string; to: string; medianDays?: number | null; count?: number }>;
    draftToFinalMedian?: number;
  } | null>(null);
  const [recentChanges, setRecentChanges] = useState<RecentChangeRow[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [kRes, ctRes, sdRes, cbRes] = await Promise.all([
          client.standards.getKPIs({ repo: repoParam }),
          client.standards.getCategoryStatusCrosstab(),
          client.standards.getStatusDistribution({ repo: repoParam }),
          client.standards.getCategoryBreakdown({ repo: repoParam }),
        ]);
        setKpis(kRes);
        setCrossTab(ctRes as CrossTabRow[]);

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
            months:
              timeRange === "7d"
                ? 3
                : timeRange === "30d"
                  ? 6
                  : timeRange === "90d"
                    ? 12
                    : timeRange === "1y"
                      ? 24
                      : 60,
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
  }, [repoParam, timeRange]);

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

  const narrative = useMemo(() => {
    if (total === 0) return "No governance records available for the selected filter.";
    const biggest = [...statusDist].sort((a, b) => b.count - a.count)[0];
    const draftToFinal = velocity?.draftToFinalMedian;
    const speedCopy = draftToFinal
      ? `Median draft-to-final is ${draftToFinal} days.`
      : "Median decision speed is still being computed.";
    return `${biggest?.status || "Draft"} is the largest bucket (${biggest?.count?.toLocaleString() || 0}). Active pipeline is ${activeCount.toLocaleString()}, with ${stagnantCount.toLocaleString()} stalled proposals (${stagnantRate.toFixed(1)}%). ${speedCopy}`;
  }, [activeCount, stagnantCount, stagnantRate, statusDist, total, velocity?.draftToFinalMedian]);

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
      tooltip: { trigger: "item", confine: true },
      series: [
        {
          type: "sankey",
          nodeAlign: "justify",
          layoutIterations: 64,
          emphasis: { focus: "adjacency" },
          lineStyle: { color: "gradient", curveness: 0.5, opacity: 0.55 },
          itemStyle: { borderWidth: 0 },
          label: { color: "var(--muted-foreground)", fontSize: 11, fontWeight: 500 },
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
      grid: { top: 14, left: 92, right: 36, bottom: 14, containLabel: false },
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      xAxis: {
        type: "value",
        axisLabel: { color: "var(--muted-foreground)", fontSize: 11 },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: "rgba(148,163,184,0.16)", type: "dashed" } },
      },
      yAxis: {
        type: "category",
        data: ordered.map((d) => d.status),
        inverse: true,
        axisLabel: { color: "var(--foreground)", fontSize: 12, fontWeight: 500 },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          type: "bar",
          showBackground: true,
          backgroundStyle: { color: "rgba(148,163,184,0.08)", borderRadius: 8 },
          data: ordered.map((d) => ({
            value: d.value,
            itemStyle: {
              color: STATUS_COLORS[d.status] || "#64748b",
              borderRadius: 8,
              shadowBlur: 8,
              shadowColor: `${STATUS_COLORS[d.status] || "#64748b"}40`,
            },
          })),
          label: {
            show: true,
            position: "right",
            color: "var(--foreground)",
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
    const rows = catBreakdown
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count)
      .map((c) => ({ name: c.category, value: c.count, itemStyle: { color: CAT_COLORS[c.category] || "#64748b" } }));
    const pctMap = new Map(rows.map((r) => [r.name, total > 0 ? ((r.value / total) * 100).toFixed(1) : "0.0"]));
    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
        confine: true,
        formatter: (p: { name: string; value: number; percent: number }) => `${p.name}: ${p.value.toLocaleString()} (${p.percent}%)`,
      },
      legend: {
        type: "scroll",
        orient: "vertical",
        right: 8,
        top: "center",
        itemWidth: 10,
        itemHeight: 10,
        itemGap: 12,
        textStyle: { color: "var(--foreground)", fontSize: 12, fontWeight: 500 },
        formatter: (name: string) => `${name}  ${pctMap.get(name)}%`,
      },
      series: [
        {
          type: "pie",
          radius: ["56%", "76%"],
          center: ["34%", "50%"],
          avoidLabelOverlap: true,
          label: { show: false },
          itemStyle: { borderColor: "rgba(2,6,23,0.55)", borderWidth: 2 },
          data: rows,
        },
      ],
      graphic: [
        {
          type: "group",
          left: "34%",
          top: "50%",
          children: [
            {
              type: "text",
              style: {
                x: 0,
                y: -10,
                text: total.toLocaleString(),
                fill: "var(--foreground)",
                fontSize: 34,
                fontWeight: 700,
                textAlign: "center",
                textVerticalAlign: "middle",
              },
            },
            {
              type: "text",
              style: {
                x: 0,
                y: 34,
                text: "Total Proposals",
                fill: "var(--muted-foreground)",
                fontSize: 12,
                fontWeight: 500,
                textAlign: "center",
                textVerticalAlign: "middle",
              },
            },
          ],
        },
      ],
    };
  }, [catBreakdown, total]);

  const throughputOption = useMemo(() => {
    const months = throughput.map((row) => String(row.month || ""));
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis" },
      legend: {
        top: 0,
        textStyle: { color: "var(--muted-foreground)", fontSize: 11 },
      },
      grid: { top: 34, left: 42, right: 20, bottom: 26 },
      xAxis: {
        type: "category",
        data: months,
        axisLabel: { color: "var(--muted-foreground)", fontSize: 11 },
        axisLine: { lineStyle: { color: "rgba(148,163,184,0.25)" } },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: "var(--muted-foreground)", fontSize: 11 },
        splitLine: { lineStyle: { color: "rgba(148,163,184,0.18)" } },
      },
      series: [
        { name: "Draft", type: "line", smooth: true, symbol: "none", data: throughput.map((r) => Number(r.draft || 0)), lineStyle: { width: 2, color: STATUS_COLORS.Draft }, areaStyle: { color: `${STATUS_COLORS.Draft}1A` } },
        { name: "Review", type: "line", smooth: true, symbol: "none", data: throughput.map((r) => Number(r.review || 0)), lineStyle: { width: 2, color: STATUS_COLORS.Review }, areaStyle: { color: `${STATUS_COLORS.Review}1A` } },
        { name: "Last Call", type: "line", smooth: true, symbol: "none", data: throughput.map((r) => Number(r.lastCall || 0)), lineStyle: { width: 2, color: STATUS_COLORS["Last Call"] }, areaStyle: { color: `${STATUS_COLORS["Last Call"]}1A` } },
        { name: "Final", type: "line", smooth: true, symbol: "none", data: throughput.map((r) => Number(r.final || 0)), lineStyle: { width: 2, color: STATUS_COLORS.Final }, areaStyle: { color: `${STATUS_COLORS.Final}1A` } },
      ],
    };
  }, [throughput]);

  const matrixData = useMemo(() => {
    const categories = Array.from(new Set(crossTab.map((r) => r.category))).filter(Boolean).sort();
    const heat = categories.flatMap((cat, y) =>
      STATUS_ORDER.map((status, x) => {
        const value = crossTab
          .filter((r) => r.category === cat && r.status === status)
          .reduce((sum, r) => sum + r.count, 0);
        return [x, y, value];
      }),
    );
    const maxValue = Math.max(...heat.map((v) => Number(v[2])), 0);
    return { categories, heat, maxValue };
  }, [crossTab]);

  const matrixOption = useMemo(() => {
    return {
      backgroundColor: "transparent",
      tooltip: {
        position: "top",
        confine: true,
        formatter: (p: { data: [number, number, number] }) => {
          const [x, y, value] = p.data;
          return `${matrixData.categories[y]} × ${STATUS_ORDER[x]}: <b>${Number(value).toLocaleString()}</b>`;
        },
      },
      grid: { top: 12, left: 110, right: 24, bottom: 30 },
      xAxis: {
        type: "category",
        data: STATUS_ORDER,
        axisLabel: { color: "var(--muted-foreground)", fontSize: 11, interval: 0 },
        splitArea: { show: false },
      },
      yAxis: {
        type: "category",
        data: matrixData.categories,
        axisLabel: { color: "var(--muted-foreground)", fontSize: 11 },
      },
      visualMap: {
        min: 0,
        max: matrixData.maxValue || 1,
        calculable: false,
        orient: "horizontal",
        left: "center",
        bottom: 0,
        textStyle: { color: "var(--muted-foreground)", fontSize: 10 },
        inRange: { color: ["#0f172a", "#1d4ed8", "#22d3ee"] },
      },
      series: [
        {
          type: "heatmap",
          data: matrixData.heat,
          label: {
            show: true,
            fontSize: 10,
            color: "var(--foreground)",
            formatter: (p: { data: [number, number, number] }) => {
              const v = Number(p.data[2]);
              return v > 0 ? String(v) : "";
            },
          },
          emphasis: {
            itemStyle: {
              borderColor: "rgba(255,255,255,0.5)",
              borderWidth: 1,
            },
          },
        },
      ],
    };
  }, [matrixData]);

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

  const exportCrossTab = useCallback(() => {
    const categories = matrixData.categories;
    const rows = categories.map((cat) => {
      const counts = STATUS_ORDER.map((status) => {
        return crossTab
          .filter((r) => r.category === cat && r.status === status)
          .reduce((sum, r) => sum + r.count, 0);
      });
      return {
        category: cat,
        draft: counts[0],
        review: counts[1],
        last_call: counts[2],
        final: counts[3],
        living: counts[4],
        stagnant: counts[5],
        withdrawn: counts[6],
        total: counts.reduce((a, b) => a + b, 0),
      };
    });
    downloadObjectCSV(withMeta("category_status_heatmap", rows), `eips-category-status-${new Date().toISOString().slice(0, 10)}.csv`);
  }, [crossTab, matrixData.categories, withMeta]);

  const exportPipelineCSV = useCallback(() => {
    const rows = STATUS_ORDER.map((status) => ({
      status,
      count: statusCountMap[status] || 0,
      share_percent: total > 0 ? (((statusCountMap[status] || 0) / total) * 100).toFixed(2) : "0.00",
    }));
    downloadObjectCSV(withMeta("pipeline_status", rows), `eips-pipeline-status-${new Date().toISOString().slice(0, 10)}.csv`);
  }, [statusCountMap, total, withMeta]);

  const exportCompositionCSV = useCallback(() => {
    const rows = catBreakdown.map((c) => ({
      category: c.category,
      count: c.count,
      share_percent: total > 0 ? ((c.count / total) * 100).toFixed(2) : "0.00",
      color: CAT_COLORS[c.category] || "",
    }));
    downloadObjectCSV(withMeta("proposal_composition", rows), `eips-proposal-composition-${new Date().toISOString().slice(0, 10)}.csv`);
  }, [catBreakdown, total, withMeta]);

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

  const exportTransitionCSV = useCallback(() => {
    const rows = transitionFlows.map((t) => ({
      from_status: t.from,
      to_status: t.to,
      transition_count: t.value,
      flow_direction: "forward_only_for_sankey",
    }));
    downloadObjectCSV(withMeta("status_transition_flow", rows), `eips-transition-flow-${new Date().toISOString().slice(0, 10)}.csv`);
  }, [transitionFlows, withMeta]);

  const exportThroughputCSV = useCallback(() => {
    const rows = throughput.map((r) => ({
      month: String(r.month || ""),
      draft: Number(r.draft || 0),
      review: Number(r.review || 0),
      last_call: Number(r.lastCall || 0),
      final: Number(r.final || 0),
      total_changes:
        Number(r.draft || 0) + Number(r.review || 0) + Number(r.lastCall || 0) + Number(r.final || 0),
    }));
    downloadObjectCSV(withMeta("monthly_throughput", rows), `eips-monthly-throughput-${new Date().toISOString().slice(0, 10)}.csv`);
  }, [throughput, withMeta]);

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Section title="Governance Health" icon={<Activity className="h-4 w-4" />}>
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{narrative}</p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total Proposals</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">{total.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Active Pipeline</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">{activeCount.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Finalization Rate</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">{finalizationRate.toFixed(1)}%</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Median Time To Final</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
              {velocity?.draftToFinalMedian ? `${velocity.draftToFinalMedian}d` : "—"}
            </p>
          </div>
        </div>
      </Section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section
          title="Pipeline Status"
          icon={<TrendingUp className="h-4 w-4" />}
          action={<CSVBtn onClick={exportPipelineCSV} label="Detailed CSV" />}
        >
          <div className="h-[320px] w-full">
            <ReactECharts option={pipelineOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
            <div className="rounded-md border border-border px-2 py-1">Draft backlog: {(statusCountMap.Draft || 0).toLocaleString()}</div>
            <div className="rounded-md border border-border px-2 py-1">Review backlog: {(statusCountMap.Review || 0).toLocaleString()}</div>
            <div className="rounded-md border border-border px-2 py-1">Stagnant: {stagnantRate.toFixed(1)}%</div>
            <div className="rounded-md border border-border px-2 py-1">Finalized: {finalizedCount.toLocaleString()}</div>
          </div>
          <ChartFooter nextUpdateAt={nextUpdateAt} />
        </Section>

        <Section
          title="Proposal Composition"
          icon={<Layers className="h-4 w-4" />}
          action={<CSVBtn onClick={exportCompositionCSV} label="Detailed CSV" />}
        >
          <div className="h-[320px] w-full">
            <ReactECharts option={categoryDonutOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} />
          </div>
          <ChartFooter nextUpdateAt={nextUpdateAt} />
        </Section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section
          title="Lifecycle Conversion"
          icon={<ArrowRight className="h-4 w-4" />}
          action={<CSVBtn onClick={exportLifecycleCSV} label="Detailed CSV" />}
        >
          <div className="space-y-2">
            {conversionRows.map((row, i) => (
              <div key={row.stage} className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{i + 1}. {row.stage}</span>
                  <span className="tabular-nums text-foreground/90">{row.count.toLocaleString()}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.max(3, Math.min(100, row.conversion))}%`, backgroundColor: STATUS_COLORS[row.stage] || "#64748b" }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{row.conversion.toFixed(1)}% of previous stage</p>
              </div>
            ))}
          </div>
          <ChartFooter nextUpdateAt={nextUpdateAt} />
        </Section>

        <Section
          title="Decision Speed"
          icon={<Timer className="h-4 w-4" />}
          action={<CSVBtn onClick={exportDecisionSpeedCSV} label="Detailed CSV" />}
        >
          {!velocity?.transitions?.length ? (
            <p className="text-sm text-muted-foreground">No velocity data available.</p>
          ) : (
            <div className="space-y-2">
              {velocity.transitions.map((t) => {
                const color = STATUS_COLORS[t.to] || "#64748b";
                return (
                  <div key={`${t.from}-${t.to}`} className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-foreground">
                        <span className="text-muted-foreground">{t.from}</span>
                        <ArrowRight className="mx-1 inline h-3 w-3 text-muted-foreground" />
                        <span style={{ color }}>{t.to}</span>
                      </p>
                      <p className="text-sm font-semibold tabular-nums text-foreground">{t.medianDays != null ? `${t.medianDays}d` : "—"}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{(t.count || 0).toLocaleString()} transitions in selected range</p>
                  </div>
                );
              })}
            </div>
          )}
          <ChartFooter nextUpdateAt={nextUpdateAt} />
        </Section>
      </div>

      <Section
        title="Status Transition Flow"
        icon={<ArrowRight className="h-4 w-4" />}
        action={<CSVBtn onClick={exportTransitionCSV} label="Detailed CSV" />}
      >
        {transitionFlows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transition data available.</p>
        ) : (
          <div className="h-[360px] w-full">
            <ReactECharts option={sankeyOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} />
          </div>
        )}
        <ChartFooter nextUpdateAt={nextUpdateAt} />
      </Section>

      <Section
        title="Monthly Governance Throughput"
        icon={<Activity className="h-4 w-4" />}
        action={<CSVBtn onClick={exportThroughputCSV} label="Detailed CSV" />}
      >
        {throughput.length === 0 ? (
          <p className="text-sm text-muted-foreground">No monthly throughput available.</p>
        ) : (
          <div className="h-[340px] w-full">
            <ReactECharts option={throughputOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} />
          </div>
        )}
        <ChartFooter nextUpdateAt={nextUpdateAt} />
      </Section>

      <Section
        title="Category × Status Heatmap"
        icon={<Layers className="h-4 w-4" />}
        action={<CSVBtn onClick={exportCrossTab} label="Detailed CSV" />}
      >
        {matrixData.categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">No category/status matrix data available.</p>
        ) : (
          <div className="h-[420px] w-full">
            <ReactECharts option={matrixOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} />
          </div>
        )}
        <ChartFooter nextUpdateAt={nextUpdateAt} />
      </Section>

      <Section title="Recent Governance Activity" icon={<Activity className="h-4 w-4" />}>
        {recentChanges.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent changes.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card/40">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/70">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Proposal</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Category</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Transition</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Actor</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">PR</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">When</th>
                </tr>
              </thead>
              <tbody>
                {recentChanges.slice(0, 15).map((row, idx) => {
                  const to = row.to || "Draft";
                  const color = STATUS_COLORS[to] || "#64748b";
                  const repo = String(row.repository || "").toLowerCase();
                  const repoPath = repo.includes("erc") ? "ercs" : repo.includes("rip") ? "rips" : "eips";
                  const eipNo = row.eip ? String(row.eip) : "";
                  const pfx = (row.eip_type || (repoPath === "ercs" ? "ERC" : repoPath === "rips" ? "RIP" : "EIP")).toUpperCase();
                  return (
                    <tr key={`${row.eip || "na"}-${idx}`} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm text-foreground">
                        {eipNo ? (
                          <Link href={`/standards/${repoPath}/${eipNo}`} className="text-primary hover:text-primary/80">
                            {pfx}-{eipNo}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                        <p className="max-w-[260px] truncate text-xs text-muted-foreground">{row.title || "Untitled"}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{row.category || "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium"
                          style={{ backgroundColor: `${color}1A`, borderColor: `${color}40`, color }}
                        >
                          {row.from || "Unknown"} → {row.to || "Unknown"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{row.actor || "—"}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {row.pr_number ? (
                          <Link href={`/pr/${repoPath}/${row.pr_number}`} className="text-primary hover:text-primary/80">
                            #{row.pr_number}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums text-muted-foreground">
                        {row.days === 0 ? "today" : row.days === 1 ? "1d ago" : `${row.days || 0}d ago`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/explore/status" className="rounded-lg border border-border bg-card/60 p-3 text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10">
          Browse Status Explorer
        </Link>
        <Link href="/explore/trending" className="rounded-lg border border-border bg-card/60 p-3 text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10">
          Open Trending Proposals
        </Link>
        <Link href="/explore/years" className="rounded-lg border border-border bg-card/60 p-3 text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10">
          Explore Yearly Patterns
        </Link>
        <Link href="/insights/governance-and-process" className="rounded-lg border border-border bg-card/60 p-3 text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10">
          View Governance Process Insights
        </Link>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        <p className="inline-flex items-center gap-1.5">
          <Pause className="h-3.5 w-3.5" />
          Stagnant proposals: <span className="font-semibold text-foreground">{stagnantCount.toLocaleString()}</span>
        </p>
        <p className="mt-1 inline-flex items-center gap-1.5">
          <CheckCircle className="h-3.5 w-3.5" />
          Final + Living: <span className="font-semibold text-foreground">{finalizedCount.toLocaleString()}</span>
        </p>
        <p className="mt-1 inline-flex items-center gap-1.5">
          <XCircle className="h-3.5 w-3.5" />
          Withdrawn: <span className="font-semibold text-foreground">{(statusCountMap.Withdrawn || 0).toLocaleString()}</span>
        </p>
        <p className="mt-1 inline-flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          Draft backlog: <span className="font-semibold text-foreground">{(statusCountMap.Draft || 0).toLocaleString()}</span>
        </p>
      </div>
    </div>
  );
}
