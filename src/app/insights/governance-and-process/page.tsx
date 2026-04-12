"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, Download, Loader2 } from "lucide-react";
import ReactECharts from "echarts-for-react";
import { client } from "@/lib/orpc";
import { PageHeader, SectionSeparator } from "@/components/header";
import { LastUpdated } from "@/components/analytics/LastUpdated";
import { AnalyticsAnnotation } from "@/components/analytics/AnalyticsAnnotation";

const STATE_ORDER = ["STALLED", "WAITING_ON_EDITOR", "WAITING_ON_AUTHOR", "MERGED", "CLOSED"] as const;
const STATE_COLORS: Record<string, string> = {
  WAITING_ON_EDITOR: "#f59e0b",
  WAITING_ON_AUTHOR: "#3b82f6",
  STALLED: "#ef4444",
  MERGED: "#10b981",
  CLOSED: "#64748b",
};

type RepoFilter = "eips" | "ercs" | "rips" | "all";
type TimePreset = "last_week" | "last_month" | "last_year" | "custom";

function csvEscape(v: string | number | null | undefined) {
  const s = String(v ?? "");
  return `"${s.replaceAll('"', '""')}"`;
}

export default function GovernanceProcessPage() {
  const [loading, setLoading] = useState(true);
  const [repoFilter, setRepoFilter] = useState<RepoFilter>("all");
  const [showTrends, setShowTrends] = useState(false);
  const [timePreset, setTimePreset] = useState<TimePreset>("last_month");
  const [customFrom, setCustomFrom] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [customTo, setCustomTo] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const [funnel, setFunnel] = useState({ opened: 0, reviewed: 0, merged: 0, closedUnmerged: 0 });
  const [govStates, setGovStates] = useState<Array<{ state: string; count: number }>>([]);
  const [ttd, setTtd] = useState<Array<{ repo: string; outcome: string; medianDays: number; avgDays: number; count: number }>>([]);
  const [heatmap, setHeatmap] = useState<Array<{ month: string; state: string; count: number }>>([]);
  const [syncMeta, setSyncMeta] = useState<{ lastSyncAt: string | null; nextUpdateAt: string | null } | null>(null);

  const timeBounds = useMemo(() => {
    const now = new Date();
    const end = now.toISOString();
    if (timePreset === "last_week") {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      return { from: start.toISOString(), to: end };
    }
    if (timePreset === "last_month") {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 1);
      return { from: start.toISOString(), to: end };
    }
    if (timePreset === "last_year") {
      const start = new Date(now);
      start.setFullYear(start.getFullYear() - 1);
      return { from: start.toISOString(), to: end };
    }

    const from = customFrom ? new Date(`${customFrom}T00:00:00.000Z`).toISOString() : null;
    const to = customTo ? new Date(`${customTo}T23:59:59.999Z`).toISOString() : null;
    if (from && to && from > to) return { from: to, to: from };
    return { from, to };
  }, [timePreset, customFrom, customTo]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const repo = repoFilter === "all" ? undefined : repoFilter;
        const from = timeBounds.from ?? undefined;
        const to = timeBounds.to ?? undefined;
        const [f, g, t, h, sm] = await Promise.all([
          client.insights.getPRLifecycleFunnel({ repo, from, to }),
          client.insights.getGovernanceStatesOverTime({ repo, from, to }),
          client.insights.getTimeToDecision({ repo, from, to }),
          client.insights.getBottleneckHeatmap({ repo, from, to }),
          client.insights.getSyncMeta(),
        ]);
        setFunnel(f);
        setGovStates(g);
        setTtd(t);
        setHeatmap(h);
        setSyncMeta(sm);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [repoFilter, timeBounds]);

  const stateMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of govStates) map.set(s.state, s.count);
    return map;
  }, [govStates]);

  const activePipeline = useMemo(
    () => (stateMap.get("WAITING_ON_EDITOR") || 0) + (stateMap.get("WAITING_ON_AUTHOR") || 0) + (stateMap.get("STALLED") || 0),
    [stateMap]
  );

  const mergedRate = useMemo(() => {
    if (funnel.opened <= 0) return 0;
    return Math.round((funnel.merged / funnel.opened) * 100);
  }, [funnel]);

  const medianDecisionDays = useMemo(() => {
    const decisionRows = ttd.filter((r) => r.outcome === "merged" || r.outcome === "closed");
    const total = decisionRows.reduce((sum, r) => sum + r.count, 0);
    if (total <= 0) return 0;
    const weighted = decisionRows.reduce((sum, r) => sum + r.medianDays * r.count, 0);
    return Number((weighted / total).toFixed(1));
  }, [ttd]);

  const stalledCount = stateMap.get("STALLED") || 0;

  const heatmapByMonth = useMemo(() => {
    const byMonth: Record<string, Record<string, number>> = {};
    for (const h of heatmap) {
      if (!byMonth[h.month]) byMonth[h.month] = {};
      byMonth[h.month][h.state] = h.count;
    }
    return Object.entries(byMonth)
      .map(([month, states]) => ({ month, ...states }))
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [heatmap]);

  const backlogDelta = useMemo(() => {
    if (heatmapByMonth.length < 2) return null;
    const calc = (row: Record<string, number | string>) =>
      Number(row["WAITING_ON_EDITOR"] || 0) + Number(row["WAITING_ON_AUTHOR"] || 0) + Number(row["STALLED"] || 0);
    const current = calc(heatmapByMonth[0] as Record<string, number | string>);
    const previous = calc(heatmapByMonth[1] as Record<string, number | string>);
    if (previous <= 0) return { direction: current > 0 ? "up" : "flat", pct: current > 0 ? 100 : 0 };
    const pct = Math.round(((current - previous) / previous) * 100);
    return { direction: pct > 0 ? "up" : pct < 0 ? "down" : "flat", pct };
  }, [heatmapByMonth]);

  const flowStages = useMemo(() => {
    const stages = [
      { label: "Opened", count: funnel.opened },
      { label: "Reviewed", count: funnel.reviewed },
      { label: "Merged", count: funnel.merged },
      { label: "Closed", count: funnel.closedUnmerged },
    ];
    const max = Math.max(1, ...stages.map((s) => s.count));
    return stages.map((s, idx) => {
      const baseline = idx === 0 ? stages[0].count : stages[idx - 1].count;
      const conversionPct = baseline > 0 ? Math.round((s.count / baseline) * 100) : 0;
      return { ...s, widthPct: Math.max(8, Math.round((s.count / max) * 100)), conversionPct };
    });
  }, [funnel]);

  const stateSegments = useMemo(() => {
    const total = STATE_ORDER.reduce((sum, state) => sum + (stateMap.get(state) || 0), 0);
    return STATE_ORDER.map((state) => {
      const count = stateMap.get(state) || 0;
      const pct = total > 0 ? (count / total) * 100 : 0;
      return { state, count, pct };
    });
  }, [stateMap]);

  const governanceStateOption = useMemo(() => ({
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(15,23,42,0.96)",
      borderColor: "rgba(148,163,184,0.25)",
      textStyle: { color: "#e2e8f0", fontSize: 12 },
    },
    grid: { left: 0, right: 8, top: 6, bottom: 6, containLabel: true },
    xAxis: {
      type: "value",
      axisLabel: { color: "#94a3b8", fontSize: 10 },
      splitLine: { lineStyle: { color: "#1f2937", type: "dashed" } },
    },
    yAxis: {
      type: "category",
      data: stateSegments.map((s) => s.state.replace(/_/g, " ")),
      axisLine: { lineStyle: { color: "#334155" } },
      axisTick: { show: false },
      axisLabel: { show: false },
    },
    series: [
      {
        name: "Count",
        type: "bar",
        barWidth: 14,
        data: stateSegments.map((s) => ({
          value: s.count,
          itemStyle: { color: STATE_COLORS[s.state] || "#64748b" },
          label: `${Math.round(s.pct)}%`,
        })),
        label: {
          show: true,
          position: "right",
          color: "#cbd5e1",
          fontSize: 10,
          formatter: (p: { data: { value: number; label?: string } }) => `${p.data.value} (${p.data.label || "0%"})`,
        },
      },
    ],
  }), [stateSegments]);

  const decisionRows = useMemo(() => {
    const byRepo = new Map<string, { mergedMedian: number | null; mergedCount: number; closedMedian: number | null; closedCount: number; total: number }>();
    for (const row of ttd) {
      const repo = row.repo?.toUpperCase?.() || "UNKNOWN";
      if (!byRepo.has(repo)) {
        byRepo.set(repo, { mergedMedian: null, mergedCount: 0, closedMedian: null, closedCount: 0, total: 0 });
      }
      const ref = byRepo.get(repo)!;
      if (row.outcome === "merged") {
        ref.mergedMedian = row.medianDays;
        ref.mergedCount = row.count;
      } else {
        ref.closedMedian = row.medianDays;
        ref.closedCount = row.count;
      }
      ref.total += row.count;
    }
    return Array.from(byRepo.entries())
      .map(([repo, v]) => ({ repo, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [ttd]);

  const heatmapWindow = useMemo(() => heatmapByMonth, [heatmapByMonth]);

  const exportGovernanceCsv = (detailed: boolean) => {
    const lines: string[] = [];
    lines.push("section,metric,value");
    lines.push(["meta", "repo_filter", repoFilter].map(csvEscape).join(","));
    lines.push(["meta", "time_preset", timePreset].map(csvEscape).join(","));
    lines.push(["meta", "custom_from", customFrom || ""].map(csvEscape).join(","));
    lines.push(["meta", "custom_to", customTo || ""].map(csvEscape).join(","));
    lines.push(["kpi", "open_pipeline", activePipeline].map(csvEscape).join(","));
    lines.push(["kpi", "merged_rate_pct", mergedRate].map(csvEscape).join(","));
    lines.push(["kpi", "median_decision_days", medianDecisionDays].map(csvEscape).join(","));
    lines.push(["kpi", "stalled", stalledCount].map(csvEscape).join(","));
    lines.push("");

    lines.push("flow_stage,count,conversion_pct");
    for (const stage of flowStages) {
      lines.push([stage.label, stage.count, stage.conversionPct].map(csvEscape).join(","));
    }
    lines.push("");

    lines.push("governance_state,count,pct");
    for (const s of stateSegments) {
      lines.push([s.state, s.count, Number(s.pct.toFixed(1))].map(csvEscape).join(","));
    }
    lines.push("");

    lines.push("repo,merged_median_days,merged_count,closed_median_days,closed_count,total");
    for (const r of decisionRows) {
      lines.push([r.repo, r.mergedMedian, r.mergedCount, r.closedMedian, r.closedCount, r.total].map(csvEscape).join(","));
    }

    if (detailed) {
      lines.push("");
      lines.push("month,state,count");
      for (const row of heatmapWindow) {
        for (const state of STATE_ORDER) {
          const val = Number((row as Record<string, number | string>)[state] || 0);
          lines.push([row.month, state, val].map(csvEscape).join(","));
        }
      }
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `governance-insights-${repoFilter}-${detailed ? "detailed" : "summary"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatFooterTime = (iso: string | null | undefined) => {
    if (!iso) return "TBD";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "TBD";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const time = d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return `${day}-${month}-${year} ${time}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        eyebrow="Insights"
        indicator={{ icon: "activity", label: "Governance", pulse: activePipeline > 0 }}
        title="Governance & Process Insights"
        description="A compact governance health report: process flow, blockers, and decision speed."
        sectionId="governance-process-insights"
      />
      <SectionSeparator />

      <div className="w-full space-y-4 px-4 pb-10 sm:px-6 lg:px-8 xl:px-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/insights" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Insights
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={repoFilter}
              onChange={(e) => setRepoFilter(e.target.value as RepoFilter)}
              className="h-8 rounded-md border border-border bg-muted/60 px-3 text-sm text-foreground"
            >
              <option value="all">All Repos</option>
              <option value="eips">EIPs</option>
              <option value="ercs">ERCs</option>
              <option value="rips">RIPs</option>
            </select>
            <div className="inline-flex items-center rounded-md border border-border bg-muted/50 p-0.5 text-xs">
              {[
                ["last_week", "Last Week"],
                ["last_month", "Last Month"],
                ["last_year", "Last Year"],
                ["custom", "Custom"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTimePreset(key as TimePreset)}
                  className={`rounded px-2 py-1 ${timePreset === key ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {timePreset === "custom" && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="h-9 rounded-md border border-border bg-muted/60 px-2 text-xs text-foreground"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="h-9 rounded-md border border-border bg-muted/60 px-2 text-xs text-foreground"
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => exportGovernanceCsv(true)}
              className="inline-flex h-9 items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-3 text-xs text-primary hover:bg-primary/15"
            >
              <Download className="h-3.5 w-3.5" />
              Download Reports
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-border bg-card/60">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {syncMeta?.lastSyncAt && (
              <div className="flex justify-end">
                <LastUpdated timestamp={syncMeta.lastSyncAt} />
              </div>
            )}
            <div className="rounded-lg border border-border/60 bg-muted/40 px-4 py-2.5">
              <div className="flex items-start gap-2.5">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-primary" />
                <p className="text-sm text-foreground">
                  Governance health is {backlogDelta?.direction === "up" ? "under pressure" : "stable"}.
                  {" "}
                  {backlogDelta
                    ? `Backlog ${backlogDelta.direction === "up" ? "increased" : backlogDelta.direction === "down" ? "decreased" : "is flat"} ${Math.abs(backlogDelta.pct)}% vs previous month.`
                    : "Backlog trend data is limited for month-over-month comparison."}
                </p>
              </div>
            </div>

            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Open Pipeline", value: activePipeline.toLocaleString() },
                { label: "Merged Rate", value: `${mergedRate}%` },
                { label: "Median Decision", value: `${medianDecisionDays || 0}d` },
                { label: "Stalled", value: stalledCount.toLocaleString() },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-xl border border-border/60 bg-card/60 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">{kpi.value}</p>
                </div>
              ))}
            </section>

            <section className="grid items-stretch gap-3 lg:grid-cols-2">
              <div className="h-full min-h-[360px] rounded-xl border border-border/60 bg-card/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Process Flow</p>
                <div className="mt-2.5 space-y-2">
                  {flowStages.map((stage, idx) => (
                    <div key={stage.label} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{idx + 1}. {stage.label}</span>
                        <span className="tabular-nums text-muted-foreground">{stage.count.toLocaleString()}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div className="h-2 rounded-full bg-primary/80" style={{ width: `${stage.widthPct}%` }} />
                      </div>
                      <p className="text-[11px] text-muted-foreground">{stage.conversionPct}% of previous stage</p>
                    </div>
                  ))}
                </div>
                {stalledCount > 0 ? (
                  <div className="mt-2.5 inline-flex items-center rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-300">
                    Bottleneck: {stalledCount.toLocaleString()} stalled PRs
                  </div>
                ) : (
                  <div className="mt-2.5 inline-flex items-center rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground">
                    No stalled PRs detected
                  </div>
                )}
              </div>

              <div className="h-full min-h-[360px] rounded-xl border border-border/60 bg-card/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current Governance State</p>
                <div className="mt-2 h-[160px]">
                  <ReactECharts option={governanceStateOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} />
                </div>
                <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {stateSegments.map((s) => (
                    <div key={s.state} className="flex items-center gap-1.5 text-xs">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATE_COLORS[s.state] || "#64748b" }} />
                      <span className="text-muted-foreground">{s.state.replace(/_/g, " ")}</span>
                      <span className="ml-auto tabular-nums text-foreground">{s.count}</span>
                      <span className="tabular-nums text-muted-foreground/80">({Math.round(s.pct)}%)</span>
                    </div>
                  ))}
                </div>
                <AnalyticsAnnotation>
                  Governance states indicate current PR status—tracking proposals awaiting editor review, author updates, or in stalled condition.
                </AnalyticsAnnotation>
                <div className="mt-2.5 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/90">EIPsInsight.com</span>
                  <span className="mx-1.5">•</span>
                  <span>Next Update: {formatFooterTime(syncMeta?.nextUpdateAt)}</span>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-border/60 bg-card/60">
              <div className="border-b border-border px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Decision Speed</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/70">
                      <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Repo</th>
                      <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Merged Median</th>
                      <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Closed Median</th>
                      <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {decisionRows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">No decision-speed data.</td>
                      </tr>
                    ) : decisionRows.map((r) => (
                      <tr key={r.repo} className="border-b border-border/60 last:border-0">
                        <td className="px-4 py-2 text-foreground">{r.repo}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{r.mergedMedian != null ? `${r.mergedMedian}d` : "—"} <span className="text-[10px]">({r.mergedCount})</span></td>
                        <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{r.closedMedian != null ? `${r.closedMedian}d` : "—"} <span className="text-[10px]">({r.closedCount})</span></td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-foreground">{r.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-xl border border-border/60 bg-card/60">
              <button
                type="button"
                onClick={() => setShowTrends((p) => !p)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent Governance Trends</span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showTrends ? "rotate-180" : ""}`} />
              </button>
              {showTrends && (
                <div className="border-t border-border px-4 pb-4 pt-3">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border/70">
                          <th className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Month</th>
                          {STATE_ORDER.map((s) => (
                            <th key={s} className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                              {s.replace(/_/g, " ")}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {heatmapWindow.map((row) => (
                          <tr key={row.month} className="border-b border-border/60 last:border-0">
                            <td className="px-2 py-2 text-foreground">{row.month}</td>
                            {STATE_ORDER.map((state) => {
                              const val = Number((row as Record<string, number | string>)[state] || 0);
                              return (
                                <td key={state} className="px-2 py-2 text-center">
                                  <span className="inline-flex min-w-[26px] items-center justify-center rounded px-1.5 py-0.5 tabular-nums text-foreground/90" style={{ backgroundColor: `${STATE_COLORS[state]}33` }}>
                                    {val}
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
