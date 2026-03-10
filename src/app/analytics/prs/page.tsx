"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import ReactECharts from "echarts-for-react";
import { useAnalytics, useAnalyticsExport } from "../analytics-layout-client";
import { client } from "@/lib/orpc";
import {
  Loader2,
  GitPullRequest,
  ArrowUpRight,
  AlertCircle,
  Download,
  Clock,
  Activity,
  Layers,
  BarChart3,
  Users,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LastUpdated } from "@/components/analytics/LastUpdated";

interface PRMonthlyPoint {
  month: string;
  created: number;
  merged: number;
  closed: number;
  openAtMonthEnd: number;
}

interface PRMonthHero {
  month: string;
  openPRs: number;
  newPRs: number;
  mergedPRs: number;
  closedUnmerged: number;
  netDelta: number;
}

interface OpenStateSummary {
  totalOpen: number;
  medianAge: number;
  oldestPR: {
    pr_number: number;
    title: string;
    author: string;
    age_days: number;
    repo: string;
  } | null;
}

interface GovernanceState {
  state: string;
  label: string;
  count: number;
}

interface LabelStat {
  label: string;
  count: number;
}

interface LifecycleStage {
  stage: string;
  count: number;
  percentage: number;
}

interface TimeToOutcomeMetric {
  metric: string;
  medianDays: number;
  p75Days: number;
  p90Days: number;
}

interface StalenessBucket {
  bucket: string;
  count: number;
}

interface OpenPRRow {
  prNumber: number;
  repo: string;
  title: string | null;
  author: string | null;
  createdAt: string;
  governanceState: string;
  waitingSince: string | null;
  lastEventType: string | null;
  linkedEIPs: string | null;
}

interface ProcessCategory {
  category: string;
  count: number;
}

interface GovernanceWaitState {
  state: string;
  label: string;
  count: number;
  medianWaitDays: number | null;
  oldestPRNumber: number | null;
  oldestWaitDays: number | null;
}

type TimeRange = "7d" | "30d" | "90d" | "1y" | "this_month" | "all" | "custom";
type CrossTabMode = "process_x_state" | "state_x_process";

const PROCESS_COLORS: Record<string, string> = {
  DRAFT: "#A78BFA",
  TYPO: "#94A3B8",
  NEW_EIP: "#34D399",
  STATUS_CHANGE: "#60A5FA",
  OTHER: "#64748B",
};

const GOVERNANCE_COLORS: Record<string, string> = {
  WAITING_ON_EDITOR: "#60A5FA",
  WAITING_ON_AUTHOR: "#F59E0B",
  STALLED: "#EF4444",
  DRAFT: "#A78BFA",
  NO_STATE: "#64748B",
};

function getMonthWindow(range: TimeRange): { from?: string; to?: string } {
  const now = new Date();
  const to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  if (range === "all") return { from: undefined, to: undefined };
  const monthsBack = range === "this_month" ? 1 : range === "7d" ? 1 : range === "30d" ? 3 : range === "90d" ? 6 : 12;
  const fromDate = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);
  const from = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, "0")}`;
  return { from, to };
}

function Section({ title, icon, children, action, className, id }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("rounded-xl border border-border bg-card/60 p-5", className)}>
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

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function GraphFooter({ nextUpdateAt }: { nextUpdateAt: Date }) {
  return (
    <div className="mt-3 flex items-center justify-between rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
      <span className="font-medium text-foreground/80">EIPsInsight.com</span>
      <span className="inline-flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Next Update: {formatDateTime(nextUpdateAt)}
      </span>
    </div>
  );
}

export default function PRsAnalyticsPage() {
  const searchParams = useSearchParams();
  const highlightedPr = Number(searchParams.get("pr") ?? NaN);
  const { timeRange, repoFilter } = useAnalytics();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataUpdatedAt, setDataUpdatedAt] = useState<Date>(new Date());

  const [monthlySeries, setMonthlySeries] = useState<PRMonthlyPoint[]>([]);
  const [heroMonth, setHeroMonth] = useState<PRMonthHero | null>(null);
  const [openSummary, setOpenSummary] = useState<OpenStateSummary | null>(null);
  const [governanceStates, setGovernanceStates] = useState<GovernanceState[]>([]);
  const [labelStats, setLabelStats] = useState<LabelStat[]>([]);
  const [lifecycleStages, setLifecycleStages] = useState<LifecycleStage[]>([]);
  const [timeToOutcome, setTimeToOutcome] = useState<TimeToOutcomeMetric[]>([]);
  const [staleness, setStaleness] = useState<StalenessBucket[]>([]);
  const [openPRs, setOpenPRs] = useState<OpenPRRow[]>([]);
  const [processCategories, setProcessCategories] = useState<ProcessCategory[]>([]);
  const [govWaitStates, setGovWaitStates] = useState<GovernanceWaitState[]>([]);

  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [crossTabMode, setCrossTabMode] = useState<CrossTabMode>("process_x_state");

  const repoParam = repoFilter === "all" ? undefined : repoFilter;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const { from, to } = getMonthWindow(timeRange as TimeRange);
        const now = new Date();
        const contextMonth =
          selectedMonth ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const [heroYearStr, heroMonthStr] = contextMonth.split("-");
        const heroYear = Number(heroYearStr);
        const heroMonthNum = Number(heroMonthStr);

        const [openState, hero] = await Promise.all([
          client.analytics.getPROpenState({ repo: repoParam }),
          client.analytics.getPRMonthHeroKPIs({
            year: Number.isFinite(heroYear) ? heroYear : now.getFullYear(),
            month: Number.isFinite(heroMonthNum) ? heroMonthNum : now.getMonth() + 1,
            repo: repoParam,
          }),
        ]);
        setOpenSummary(openState);
        setHeroMonth(hero);

        const [monthly, govStates, labels, lifecycle] = await Promise.all([
          client.analytics.getPRMonthlyActivity({ repo: repoParam, from, to }),
          client.analytics.getPRGovernanceStates({ repo: repoParam }),
          client.analytics.getPRLabels({ repo: repoParam }),
          client.analytics.getPRLifecycleFunnel({}),
        ]);
        setMonthlySeries(monthly);
        setGovernanceStates(govStates);
        setLabelStats(labels.slice(0, 20));
        setLifecycleStages(lifecycle);

        const [tto, stale, procCat, govWait] = await Promise.all([
          client.analytics.getPRTimeToOutcome({ repo: repoParam }),
          client.analytics.getPRStaleness({ repo: repoParam }),
          client.analytics.getPROpenClassification({ repo: repoParam, month: contextMonth }),
          client.analytics.getPRGovernanceWaitingState({ repo: repoParam, month: contextMonth }),
        ]);
        setTimeToOutcome(tto);
        setStaleness(stale);
        setProcessCategories(procCat);
        setGovWaitStates(govWait);

        const openExport = await client.analytics.getPROpenExport({ repo: repoParam, month: contextMonth });
        setOpenPRs(openExport.slice(0, 100));
        setDataUpdatedAt(new Date());
      } catch (err) {
        console.error("Failed to fetch PR analytics:", err);
        setError("Failed to load PR analytics. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [timeRange, repoFilter, repoParam, selectedMonth]);

  useEffect(() => {
    if (!selectedMonth && monthlySeries.length > 0) {
      setSelectedMonth(monthlySeries[monthlySeries.length - 1].month);
    }
  }, [monthlySeries, selectedMonth]);

  const monthlyOption = useMemo(() => {
    const months = monthlySeries.map((m) => m.month);
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis" },
      legend: {
        top: 0,
        textStyle: { color: "var(--muted-foreground)", fontSize: 11 },
      },
      grid: { top: 36, left: 38, right: 22, bottom: 50 },
      xAxis: {
        type: "category",
        data: months,
        axisLabel: { color: "var(--muted-foreground)", fontSize: 11 },
        axisLine: { lineStyle: { color: "rgba(148,163,184,0.25)" } },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: "var(--muted-foreground)", fontSize: 11 },
        splitLine: { lineStyle: { color: "rgba(148,163,184,0.15)", type: "dashed" } },
      },
      dataZoom: [
        { type: "inside", xAxisIndex: 0, start: 0, end: 100 },
        {
          type: "slider",
          xAxisIndex: 0,
          bottom: 6,
          height: 18,
          borderColor: "rgba(148,163,184,0.22)",
          backgroundColor: "rgba(148,163,184,0.08)",
          fillerColor: "rgba(34,211,238,0.22)",
          handleSize: 10,
          showDetail: false,
          start: 0,
          end: 100,
        },
      ],
      series: [
        { name: "Created", type: "bar", data: monthlySeries.map((m) => m.created), itemStyle: { color: "#60A5FA", borderRadius: [6, 6, 0, 0] } },
        { name: "Merged", type: "bar", data: monthlySeries.map((m) => m.merged), itemStyle: { color: "#34D399", borderRadius: [6, 6, 0, 0] } },
        { name: "Closed", type: "bar", data: monthlySeries.map((m) => m.closed), itemStyle: { color: "#F59E0B", borderRadius: [6, 6, 0, 0] } },
        { name: "Open EOM", type: "line", smooth: true, symbol: "circle", symbolSize: 6, data: monthlySeries.map((m) => m.openAtMonthEnd), lineStyle: { width: 2.5, color: "#A78BFA" }, itemStyle: { color: "#A78BFA" } },
      ],
    };
  }, [monthlySeries]);

  const monthContext = selectedMonth || heroMonth?.month || "Latest";
  const nextUpdateAt = useMemo(() => new Date(dataUpdatedAt.getTime() + 24 * 60 * 60 * 1000), [dataUpdatedAt]);

  const backlogOption = useMemo(() => {
    const states = govWaitStates;
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      legend: {
        top: 0,
        textStyle: { color: "var(--muted-foreground)", fontSize: 11 },
      },
      grid: { top: 38, left: 38, right: 18, bottom: 24 },
      xAxis: {
        type: "category",
        data: [monthContext],
        axisLabel: { color: "var(--muted-foreground)", fontSize: 11 },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: "var(--muted-foreground)", fontSize: 11 },
        splitLine: { lineStyle: { color: "rgba(148,163,184,0.15)", type: "dashed" } },
      },
      series: states.map((s) => ({
        name: s.label,
        type: "bar",
        stack: "open",
        data: [s.count],
        itemStyle: { color: GOVERNANCE_COLORS[s.state] || "#64748B" },
      })),
    };
  }, [govWaitStates, monthContext]);

  const crossTabData = useMemo(() => {
    if (!processCategories.length || !govWaitStates.length) return [];
    const govTotal = govWaitStates.reduce((a, b) => a + b.count, 0);
    const procTotal = processCategories.reduce((a, b) => a + b.count, 0);
    if (govTotal === 0 || procTotal === 0) return [];
    return processCategories.map((proc) => {
      const row: Record<string, number | string> = { process: proc.category };
      const share = proc.count / procTotal;
      govWaitStates.forEach((gov) => {
        row[gov.state] = Math.round(gov.count * share);
      });
      return row;
    });
  }, [processCategories, govWaitStates]);

  const processParticipantOption = useMemo(() => {
    if (!crossTabData.length) return null;

    if (crossTabMode === "process_x_state") {
      return {
        backgroundColor: "transparent",
        tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
        legend: { top: 0, textStyle: { color: "var(--muted-foreground)", fontSize: 11 } },
        grid: { top: 36, left: 36, right: 16, bottom: 24 },
        xAxis: { type: "category", data: crossTabData.map((r) => String(r.process)), axisLabel: { color: "var(--muted-foreground)", fontSize: 11 } },
        yAxis: { type: "value", axisLabel: { color: "var(--muted-foreground)", fontSize: 11 }, splitLine: { lineStyle: { color: "rgba(148,163,184,0.15)", type: "dashed" } } },
        series: govWaitStates.map((g) => ({
          name: g.label,
          type: "bar",
          stack: "total",
          data: crossTabData.map((r) => Number(r[g.state] || 0)),
          itemStyle: { color: GOVERNANCE_COLORS[g.state] || "#64748B" },
        })),
      };
    }

    const states = govWaitStates.map((g) => g.state);
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      legend: { top: 0, textStyle: { color: "var(--muted-foreground)", fontSize: 11 } },
      grid: { top: 36, left: 42, right: 16, bottom: 24 },
      xAxis: { type: "category", data: govWaitStates.map((g) => g.label), axisLabel: { color: "var(--muted-foreground)", fontSize: 11, rotate: 12 } },
      yAxis: { type: "value", axisLabel: { color: "var(--muted-foreground)", fontSize: 11 }, splitLine: { lineStyle: { color: "rgba(148,163,184,0.15)", type: "dashed" } } },
      series: processCategories.map((p) => ({
        name: p.category,
        type: "bar",
        stack: "total",
        data: states.map((s) => {
          const row = crossTabData.find((r) => String(r.process) === p.category);
          return Number(row?.[s] || 0);
        }),
        itemStyle: { color: PROCESS_COLORS[p.category] || "#94A3B8" },
      })),
    };
  }, [crossTabData, crossTabMode, govWaitStates, processCategories]);

  const totalOpen = openSummary?.totalOpen ?? 0;

  const downloadReports = () => {
    const generatedAt = new Date();
    const metadata = {
      report_name: "PR Analytics Detailed Report",
      generated_at: generatedAt.toISOString(),
      repo_filter: repoFilter,
      time_range: timeRange,
      month_context: monthContext,
    };

    const rows: Array<Record<string, string | number | null>> = [];

    monthlySeries.forEach((m) =>
      rows.push({
        section: "monthly_activity",
        ...metadata,
        month: m.month,
        created: m.created,
        merged: m.merged,
        closed: m.closed,
        open_at_month_end: m.openAtMonthEnd,
      }),
    );

    processCategories.forEach((p) =>
      rows.push({
        section: "open_pr_process_classification",
        ...metadata,
        category: p.category,
        count: p.count,
      }),
    );

    govWaitStates.forEach((g) =>
      rows.push({
        section: "governance_waiting_state",
        ...metadata,
        state: g.state,
        label: g.label,
        count: g.count,
        median_wait_days: g.medianWaitDays,
        oldest_pr_number: g.oldestPRNumber,
        oldest_wait_days: g.oldestWaitDays,
      }),
    );

    openPRs.forEach((pr) =>
      rows.push({
        section: "open_pr_rows",
        ...metadata,
        pr_number: pr.prNumber,
        repo: pr.repo,
        title: pr.title,
        author: pr.author,
        governance_state: pr.governanceState,
        waiting_since: pr.waitingSince,
        last_event_type: pr.lastEventType,
        linked_eips: pr.linkedEIPs,
        created_at: pr.createdAt,
      }),
    );

    const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
    const escapeCsv = (value: unknown) => `"${String(value ?? "").replaceAll(`"`, `""`)}"`;
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escapeCsv(r[h])).join(","))].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pr-analytics-reports-${repoFilter}-${monthContext}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  useAnalyticsExport(() => {
    const combined: Record<string, unknown>[] = [];
    monthlySeries.forEach((m) => {
      combined.push({ type: "Monthly Activity", month: m.month, openAtMonthEnd: m.openAtMonthEnd, created: m.created, merged: m.merged, closed: m.closed });
    });
    governanceStates.forEach((g) => combined.push({ type: "Governance State", state: g.state, count: g.count }));
    processCategories.forEach((p) => combined.push({ type: "Process", category: p.category, count: p.count }));
    govWaitStates.forEach((g) => combined.push({ type: "Participant State", state: g.state, count: g.count, medianWaitDays: g.medianWaitDays }));
    openPRs.forEach((pr) => combined.push({ type: "Open PR", ...pr }));
    return combined;
  }, `prs-analytics-${repoFilter}-${timeRange}`);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Open PRs", value: totalOpen, sub: `Median age: ${openSummary?.medianAge != null ? `${openSummary.medianAge}d` : "–"}`, icon: <GitPullRequest className="h-5 w-5" /> },
          { label: `Created (${heroMonth?.month ?? ""})`, value: heroMonth?.newPRs ?? 0, sub: `Net: ${(heroMonth?.netDelta ?? 0) >= 0 ? "+" : ""}${heroMonth?.netDelta ?? 0}`, icon: <Activity className="h-5 w-5" /> },
          { label: "Merged", value: heroMonth?.mergedPRs ?? 0, sub: "Current month", icon: <GitPullRequest className="h-5 w-5" /> },
          { label: "Closed (unmerged)", value: heroMonth?.closedUnmerged ?? 0, sub: "Current month", icon: <AlertCircle className="h-5 w-5" /> },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-border bg-card/60 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{kpi.value.toLocaleString()}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">{kpi.sub}</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-2.5 text-primary">{kpi.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <Section
        title="Monthly PR Activity"
        icon={<BarChart3 className="h-4 w-4" />}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={downloadReports}
              className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
            >
              <Download className="h-3.5 w-3.5" />
              Download Reports
            </button>
            <span className="rounded-md border border-border bg-muted/40 px-2 py-1 text-xs text-muted-foreground">Context: {monthContext}</span>
            <button
              onClick={() => setSelectedMonth(monthlySeries.length ? monthlySeries[monthlySeries.length - 1].month : null)}
              className="rounded-md border border-border bg-muted/40 px-2 py-1 text-xs text-foreground hover:bg-muted/60"
            >
              Latest
            </button>
            <LastUpdated timestamp={dataUpdatedAt} />
          </div>
        }
      >
        {monthlySeries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No monthly data available.</p>
        ) : (
          <div className="h-[380px] w-full">
            <ReactECharts
              option={monthlyOption}
              style={{ height: "100%", width: "100%" }}
              opts={{ renderer: "svg" }}
              notMerge
              onEvents={{
                click: (params: { name?: string }) => {
                  if (params?.name) setSelectedMonth(params.name);
                },
              }}
            />
          </div>
        )}
        <GraphFooter nextUpdateAt={nextUpdateAt} />
      </Section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Open PR Backlog (Process/Participant Context)" icon={<Layers className="h-4 w-4" />}>
          {govWaitStates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No backlog state data available.</p>
          ) : (
            <div className="h-[320px] w-full">
              <ReactECharts option={backlogOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} />
            </div>
          )}
          <p className="mt-2 text-[10px] text-muted-foreground">Stack sum = total open PRs for month context (latest snapshot). </p>
          <GraphFooter nextUpdateAt={nextUpdateAt} />
        </Section>

        <Section
          title="Process × Participants"
          icon={<Users className="h-4 w-4" />}
          action={
            <div className="inline-flex rounded-md border border-border bg-muted/60 p-0.5 text-xs">
              <button
                onClick={() => setCrossTabMode("process_x_state")}
                className={cn("rounded px-2 py-1", crossTabMode === "process_x_state" ? "bg-card text-foreground" : "text-muted-foreground")}
              >
                X=Process
              </button>
              <button
                onClick={() => setCrossTabMode("state_x_process")}
                className={cn("rounded px-2 py-1", crossTabMode === "state_x_process" ? "bg-card text-foreground" : "text-muted-foreground")}
              >
                X=Participant
              </button>
            </div>
          }
        >
          {!processParticipantOption ? (
            <p className="text-sm text-muted-foreground">Not enough data for process × participants breakdown.</p>
          ) : (
            <div className="h-[320px] w-full">
              <ReactECharts option={processParticipantOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} />
            </div>
          )}
          <p className="mt-2 text-[10px] text-muted-foreground">Estimated breakdown based on current totals (backend cross-tab endpoint pending).</p>
          <GraphFooter nextUpdateAt={nextUpdateAt} />
        </Section>
      </div>

      <details className="rounded-xl border border-border bg-card/50">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-foreground">
          Diagnostics
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </summary>
        <div className="border-t border-border/70 px-4 py-4">
          <div className="grid gap-6 lg:grid-cols-3">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Governance Distribution</h3>
              <div className="space-y-2">
                {governanceStates.map((g) => {
                  const total = governanceStates.reduce((acc, s) => acc + s.count, 0);
                  const pct = total > 0 ? (g.count / total) * 100 : 0;
                  const color = GOVERNANCE_COLORS[g.state] ?? "#64748b";
                  return (
                    <div key={g.state}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-foreground/80">{g.label}</span>
                        <span className="tabular-nums text-muted-foreground">{g.count} ({pct.toFixed(1)}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Time To Outcome</h3>
              <div className="space-y-2">
                {timeToOutcome.map((m) => (
                  <div key={m.metric} className="rounded-lg border border-border/50 bg-muted/40 px-3 py-2 text-xs">
                    <div className="font-medium text-foreground">{m.metric.replaceAll("_", " ")}</div>
                    <div className="mt-1 text-muted-foreground">p50 {m.medianDays}d • p75 {m.p75Days}d • p90 {m.p90Days}d</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Staleness + Labels</h3>
              <div className="space-y-2">
                {staleness.map((b) => (
                  <div key={b.bucket} className="rounded-lg border border-border/50 bg-muted/40 px-3 py-2 text-xs text-foreground/90">
                    {b.bucket}: <span className="tabular-nums font-semibold">{b.count.toLocaleString()}</span>
                  </div>
                ))}
                <div className="rounded-lg border border-border/50 bg-muted/40 px-3 py-2 text-xs">
                  Top labels: {labelStats.slice(0, 5).map((l) => `${l.label} (${l.count})`).join(", ") || "—"}
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/40 px-3 py-2 text-xs">
                  Lifecycle: {lifecycleStages.map((l) => `${l.stage} ${l.count}`).join(" • ") || "—"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </details>

      <Section id="open-prs-section" title="Open PRs" icon={<GitPullRequest className="h-4 w-4" />}>
        <p className="mb-3 text-xs text-muted-foreground">Snapshot of currently open pull requests in selected repository scope.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 pr-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">PR</th>
                <th className="py-2 pr-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Title</th>
                <th className="py-2 pr-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Repo</th>
                <th className="py-2 pr-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Author</th>
                <th className="py-2 pr-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Governance</th>
                <th className="py-2 pr-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Created</th>
              </tr>
            </thead>
            <tbody>
              {openPRs.map((pr) => {
                const [org, repoName] = pr.repo.split("/");
                const url = `https://github.com/${org}/${repoName}/pull/${pr.prNumber}`;
                const repoShort = repoName.toLowerCase();
                return (
                  <tr
                    key={`${pr.repo}-${pr.prNumber}`}
                    className={cn(
                      "border-b border-border/50 transition-colors hover:bg-muted/40",
                      Number.isFinite(highlightedPr) && pr.prNumber === highlightedPr && "bg-primary/10",
                    )}
                  >
                    <td className="py-2 pr-4">
                      <div className="inline-flex items-center gap-2">
                        <Link href={`/pr/${repoShort}/${pr.prNumber}`} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                          #{pr.prNumber}
                        </Link>
                        <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground" title="Open on GitHub">
                          <ArrowUpRight className="h-3 w-3" />
                        </a>
                      </div>
                    </td>
                    <td className="max-w-xs truncate py-2 pr-4 text-foreground/90">{pr.title || <span className="text-muted-foreground">No title</span>}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{repoName}</td>
                    <td className="py-2 pr-4 text-foreground/80">{pr.author || <span className="text-muted-foreground">Unknown</span>}</td>
                    <td className="py-2 pr-4">
                      <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] uppercase tracking-wide text-foreground/80">
                        {pr.governanceState || "NO_STATE"}
                      </span>
                    </td>
                    <td className="py-2 pr-4 tabular-nums text-muted-foreground">{pr.createdAt}</td>
                  </tr>
                );
              })}
              {openPRs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                    No open PRs found for current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {openSummary?.oldestPR && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-100">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>
              Oldest open PR: <span className="font-semibold">{openSummary.oldestPR.repo}#{openSummary.oldestPR.pr_number}</span> by {openSummary.oldestPR.author} — open for {openSummary.oldestPR.age_days} days.
            </span>
          </div>
        )}
      </Section>
    </div>
  );
}
