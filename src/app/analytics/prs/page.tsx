"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  Activity,
  Layers,
  BarChart3,
  Users,
  ChevronDown,
  CircleHelp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CopyLinkButton } from "@/components/header";
import { LastUpdated } from "@/components/analytics/LastUpdated";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InlineBrandLoader } from "@/components/inline-brand-loader";

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
  labels: string[];
  processType: string;
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
type OpenPRDistributionMode = "process" | "participants";

const PROCESS_COLORS: Record<string, string> = {
  "PR DRAFT": "#A78BFA",
  Typo: "#94A3B8",
  "New EIP": "#34D399",
  "Status Change": "#60A5FA",
  Website: "#8B5CF6",
  Tooling: "#F97316",
  "EIP-1": "#3B82F6",
  "Content Edit": "#64748B",
  Misc: "#71717A",
};

const GOVERNANCE_COLORS: Record<string, string> = {
  "Waiting on Editor": "#60A5FA",
  "Waiting on Author": "#F59E0B",
  AWAITED: "#A78BFA",
  Uncategorized: "#64748B",
};

function getMonthWindow(
  range: TimeRange,
  customFromMonth?: string,
  customToMonth?: string,
): { from?: string; to?: string } {
  const now = new Date();
  const to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  if (range === "all") return { from: undefined, to: undefined };
  if (range === "custom") {
    return {
      from: customFromMonth || undefined,
      to: customToMonth || undefined,
    };
  }
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
        <div className="flex items-center gap-2">
          <span className="text-primary">{icon}</span>
          <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">{title}</h2>
          {id && (
            <CopyLinkButton sectionId={id} className="h-7 w-7 rounded-md border border-border bg-muted/60 hover:border-primary/40 hover:bg-primary/10" />
          )}
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
  const { timeRange, repoFilter, customFromMonth, customToMonth } = useAnalytics();

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
  const [crossTabRaw, setCrossTabRaw] = useState<Array<{ processType: string; govState: string; count: number }>>([]);
  const [processCategoriesByMonth, setProcessCategoriesByMonth] = useState<Array<{ month: string; rows: ProcessCategory[] }>>([]);
  const [govWaitStatesByMonth, setGovWaitStatesByMonth] = useState<Array<{ month: string; rows: GovernanceWaitState[] }>>([]);

  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [trendFromMonth, setTrendFromMonth] = useState<string | null>(null);
  const [trendToMonth, setTrendToMonth] = useState<string | null>(null);
  const [exportingReports, setExportingReports] = useState(false);
  const [crossTabMode, setCrossTabMode] = useState<CrossTabMode>("process_x_state");
  const [openPRDistributionMode, setOpenPRDistributionMode] = useState<OpenPRDistributionMode>("process");
  const awaitedHelpText =
    "Awaited means the PR is in Draft state.";

  const repoParam = repoFilter === "all" ? undefined : repoFilter;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const { from, to } = getMonthWindow(timeRange as TimeRange, customFromMonth, customToMonth);
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

        const monthBuckets = monthly.map((m) => m.month);

        const trendFrom = monthBuckets[0];
        const trendTo = monthBuckets[monthBuckets.length - 1];

        const [tto, stale, procCat, govWait, processTimeline, participantTimeline, crossTab] = await Promise.all([
          client.analytics.getPRTimeToOutcome({ repo: repoParam }),
          client.analytics.getPRStaleness({ repo: repoParam }),
          client.analytics.getPROpenClassification({ repo: repoParam, month: contextMonth }),
          client.analytics.getPRGovernanceWaitingState({ repo: repoParam, month: contextMonth }),
          client.analytics.getPROpenClassificationTimeline({ repo: repoParam, from: trendFrom, to: trendTo }),
          client.analytics.getPRGovernanceWaitingStateTimeline({ repo: repoParam, from: trendFrom, to: trendTo }),
          client.analytics.getPRProcessParticipantCrossTab({ repo: repoParam, month: contextMonth }),
        ]);
        setTimeToOutcome(tto);
        setStaleness(stale);
        setProcessCategories(procCat);
        setGovWaitStates(govWait);
        setProcessCategoriesByMonth(processTimeline);
        setGovWaitStatesByMonth(participantTimeline);
        setCrossTabRaw(crossTab);

        const openExport = await client.analytics.getPROpenExport({ repo: repoParam, month: contextMonth });
        setOpenPRs(openExport);
        setDataUpdatedAt(new Date());
      } catch (err) {
        console.error("Failed to fetch PR analytics:", err);
        setError("Failed to load PR analytics. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [timeRange, repoFilter, repoParam, selectedMonth, customFromMonth, customToMonth]);

  useEffect(() => {
    if (!selectedMonth && monthlySeries.length > 0) {
      setSelectedMonth(monthlySeries[monthlySeries.length - 1].month);
    }
  }, [monthlySeries, selectedMonth]);

  useEffect(() => {
    if (monthlySeries.length === 0) {
      setTrendFromMonth(null);
      setTrendToMonth(null);
      return;
    }
    const first = monthlySeries[0].month;
    const last = monthlySeries[monthlySeries.length - 1].month;
    setTrendFromMonth((prev) => prev ?? first);
    setTrendToMonth((prev) => prev ?? last);
  }, [monthlySeries]);

  const rangeMonths = useMemo(() => {
    if (!monthlySeries.length) return [];
    const from = trendFromMonth ?? monthlySeries[0].month;
    const to = trendToMonth ?? monthlySeries[monthlySeries.length - 1].month;
    return monthlySeries.filter((row) => row.month >= from && row.month <= to);
  }, [monthlySeries, trendFromMonth, trendToMonth]);

  const monthlyOption = useMemo(() => {
    const months = rangeMonths.map((m) => m.month);
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
        { name: "Created", type: "bar", data: rangeMonths.map((m) => m.created), itemStyle: { color: "#60A5FA", borderRadius: [6, 6, 0, 0] } },
        { name: "Merged", type: "bar", data: rangeMonths.map((m) => m.merged), itemStyle: { color: "#34D399", borderRadius: [6, 6, 0, 0] } },
        { name: "Closed", type: "bar", data: rangeMonths.map((m) => m.closed), itemStyle: { color: "#F59E0B", borderRadius: [6, 6, 0, 0] } },
        { name: "Open EOM", type: "line", smooth: true, symbol: "circle", symbolSize: 6, data: rangeMonths.map((m) => m.openAtMonthEnd), lineStyle: { width: 2.5, color: "#A78BFA" }, itemStyle: { color: "#A78BFA" } },
      ],
    };
  }, [rangeMonths]);

  const monthContext = selectedMonth || heroMonth?.month || "Latest";
  const nextUpdateAt = useMemo(() => new Date(dataUpdatedAt.getTime() + 24 * 60 * 60 * 1000), [dataUpdatedAt]);

  const backlogOption = useMemo(() => {
    const months = monthlySeries.map((m) => m.month);
    if (months.length === 0) return null;

    if (openPRDistributionMode === "process") {
      const categories = Array.from(
        new Set(processCategoriesByMonth.flatMap((m) => m.rows.map((r) => r.category))),
      );
      return {
        backgroundColor: "transparent",
        tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
        legend: {
          top: 0,
          textStyle: { color: "var(--muted-foreground)", fontSize: 11 },
        },
        grid: { top: 38, left: 38, right: 18, bottom: 46 },
        xAxis: {
          type: "category",
          data: months,
          axisLabel: { color: "var(--muted-foreground)", fontSize: 11 },
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
            height: 16,
            borderColor: "rgba(148,163,184,0.22)",
            backgroundColor: "rgba(148,163,184,0.08)",
            fillerColor: "rgba(34,211,238,0.22)",
            handleSize: 9,
            showDetail: false,
            start: 0,
            end: 100,
          },
        ],
        series: categories.map((category) => ({
          name: category,
          type: "bar",
          stack: "open",
          data: months.map((month) => {
            const row = processCategoriesByMonth.find((d) => d.month === month);
            return row?.rows.find((r) => r.category === category)?.count ?? 0;
          }),
          itemStyle: { color: PROCESS_COLORS[category] || "#94A3B8" },
        })),
      };
    }

    const VALID_GOV_STATES = ["Waiting on Editor", "Waiting on Author", "AWAITED"];
    const filteredGovWait = govWaitStatesByMonth.map(m => ({
      ...m,
      rows: m.rows.filter(r => VALID_GOV_STATES.includes(r.state))
    }));
    const states = VALID_GOV_STATES.filter((s) =>
      filteredGovWait.some((m) => m.rows.some((r) => r.state === s && r.count > 0))
    );
    const validSeries = states.map((state) => {
      const data = months.map((month) => {
        const row = filteredGovWait.find((d) => d.month === month);
        const value = row?.rows.find((r) => r.state === state)?.count ?? 0;
        return Math.max(0, value);
      });
      return {
        name: state,
        type: "bar",
        stack: "open",
        data: data,
        itemStyle: { color: GOVERNANCE_COLORS[state] || "#64748B" },
      };
    });
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      legend: {
        top: 0,
        textStyle: { color: "var(--muted-foreground)", fontSize: 11 },
        data: validSeries.map(s => s.name),
      },
      grid: { top: 38, left: 38, right: 18, bottom: 46 },
      xAxis: {
        type: "category",
        data: months,
        axisLabel: { color: "var(--muted-foreground)", fontSize: 11 },
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
          height: 16,
          borderColor: "rgba(148,163,184,0.22)",
          backgroundColor: "rgba(148,163,184,0.08)",
          fillerColor: "rgba(34,211,238,0.22)",
          handleSize: 9,
          showDetail: false,
          start: 0,
          end: 100,
        },
      ],
      series: validSeries,
    };
  }, [govWaitStatesByMonth, monthlySeries, openPRDistributionMode, processCategoriesByMonth]);

  const labelDistributionOption = useMemo(() => {
    const topLabels = labelStats.slice(0, 12);
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      grid: { top: 20, left: 36, right: 16, bottom: 70 },
      xAxis: {
        type: "category",
        data: topLabels.map((l) => l.label),
        axisLabel: { color: "var(--muted-foreground)", fontSize: 11, rotate: 28 },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: "var(--muted-foreground)", fontSize: 11 },
        splitLine: { lineStyle: { color: "rgba(148,163,184,0.15)", type: "dashed" } },
      },
      series: [
        {
          type: "bar",
          data: topLabels.map((l) => l.count),
          itemStyle: { color: "#60A5FA", borderRadius: [6, 6, 0, 0] },
        },
      ],
    };
  }, [labelStats]);

  const crossTabData = useMemo(() => {
    if (!crossTabRaw.length) return [];
    const processTypes = Array.from(new Set(crossTabRaw.map((r) => r.processType)));
    return processTypes.map((proc) => {
      const row: Record<string, number | string> = { process: proc };
      crossTabRaw.filter((r) => r.processType === proc).forEach((r) => {
        row[r.govState] = r.count;
      });
      return row;
    });
  }, [crossTabRaw]);

  const processParticipantOption = useMemo(() => {
    if (!crossTabData.length) return null;

    const govStates = Array.from(new Set(crossTabRaw.map((r) => r.govState)));
    const processTypes = crossTabData.map((r) => String(r.process));

    if (crossTabMode === "process_x_state") {
      return {
        backgroundColor: "transparent",
        tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
        legend: { top: 0, textStyle: { color: "var(--muted-foreground)", fontSize: 11 } },
        grid: { top: 36, left: 36, right: 16, bottom: 24 },
        xAxis: { type: "category", data: processTypes, axisLabel: { color: "var(--muted-foreground)", fontSize: 11 } },
        yAxis: { type: "value", axisLabel: { color: "var(--muted-foreground)", fontSize: 11 }, splitLine: { lineStyle: { color: "rgba(148,163,184,0.15)", type: "dashed" } } },
        series: govStates.map((state) => ({
          name: state,
          type: "bar",
          stack: "total",
          data: crossTabData.map((r) => Number(r[state] || 0)),
          itemStyle: { color: GOVERNANCE_COLORS[state] || "#64748B" },
        })),
      };
    }

    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      legend: { top: 0, textStyle: { color: "var(--muted-foreground)", fontSize: 11 } },
      grid: { top: 36, left: 42, right: 16, bottom: 24 },
      xAxis: { type: "category", data: govStates, axisLabel: { color: "var(--muted-foreground)", fontSize: 11, rotate: 12 } },
      yAxis: { type: "value", axisLabel: { color: "var(--muted-foreground)", fontSize: 11 }, splitLine: { lineStyle: { color: "rgba(148,163,184,0.15)", type: "dashed" } } },
      series: processTypes.map((proc) => ({
        name: proc,
        type: "bar",
        stack: "total",
        data: govStates.map((s) => {
          const row = crossTabData.find((r) => String(r.process) === proc);
          return Number(row?.[s] || 0);
        }),
        itemStyle: { color: PROCESS_COLORS[proc] || "#94A3B8" },
      })),
    };
  }, [crossTabData, crossTabMode, crossTabRaw]);

  const totalOpen = openSummary?.totalOpen ?? 0;

  const downloadObjectRowsCsv = useCallback(
    (rows: Array<Record<string, string | number | null>>, filename: string) => {
      if (!rows.length) return;
      const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
      const escapeCsv = (value: unknown) => `"${String(value ?? "").replaceAll(`"`, `""`)}"`;
      const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escapeCsv(r[h])).join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
    [],
  );

  const downloadOpenPRsDetailedCSV = useCallback(() => {
    const generatedAt = new Date().toISOString();
    const rows: Array<Record<string, string | number | null>> = openPRs.map((pr) => ({
      pr_number: pr.prNumber,
      repo: pr.repo,
      title: pr.title,
      author: pr.author,
      process_type: pr.processType,
      governance_state: pr.governanceState,
      labels: pr.labels.join("; "),
      linked_eips: pr.linkedEIPs,
      created_at: pr.createdAt,
      waiting_since: pr.waitingSince,
      last_event_type: pr.lastEventType,
      month_context: monthContext,
      repo_filter: repoFilter,
      generated_at: generatedAt,
    }));
    downloadObjectRowsCsv(
      rows,
      `eip-open-prs-detailed-${repoFilter}-${monthContext}-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  }, [downloadObjectRowsCsv, monthContext, openPRs, repoFilter, timeRange]);

  const downloadCategoryBreakdownDetailedCSV = useCallback(() => {
    const generatedAt = new Date().toISOString();
    const summaryProcessRows: Array<Record<string, string | number | null>> = processCategories.map((row) => ({
      report_section: "category_breakdown_process_summary",
      generated_at: generatedAt,
      repo_filter: repoFilter,
      time_range: timeRange,
      month_context: monthContext,
      process_category: row.category,
      count: row.count,
      metric_definition: "Open PR count by process category for selected context month",
    }));
    const summaryStateRows: Array<Record<string, string | number | null>> = govWaitStates.map((row) => ({
      report_section: "category_breakdown_participant_summary",
      generated_at: generatedAt,
      repo_filter: repoFilter,
      time_range: timeRange,
      month_context: monthContext,
      participant_state: row.state,
      participant_label: row.label,
      count: row.count,
      median_wait_days: row.medianWaitDays,
      oldest_pr_number: row.oldestPRNumber,
      oldest_wait_days: row.oldestWaitDays,
      metric_definition: "Open PR count by participant/governance waiting state for selected context month",
    }));
    const matrixRows: Array<Record<string, string | number | null>> = crossTabData.flatMap((row) =>
      govWaitStates.map((state) => ({
        report_section: "category_breakdown_estimated_matrix",
        generated_at: generatedAt,
        repo_filter: repoFilter,
        time_range: timeRange,
        month_context: monthContext,
        process_category: String(row.process),
        participant_state: state.state,
        participant_label: state.label,
        estimated_count: Number(row[state.state] || 0),
        metric_definition: "Estimated cross-tab cell derived from process and participant totals (backend exact cross-tab pending)",
      })),
    );
    downloadObjectRowsCsv(
      [...summaryProcessRows, ...summaryStateRows, ...matrixRows],
      `category-breakdown-detailed-${repoFilter}-${monthContext}-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  }, [crossTabData, downloadObjectRowsCsv, govWaitStates, monthContext, processCategories, repoFilter, timeRange]);

  const downloadReports = async () => {
    try {
      setExportingReports(true);
      const result = await client.analytics.exportPRAnalyticsDetailedCSV({
        repo: repoParam,
        fromMonth: trendFromMonth ?? undefined,
        toMonth: trendToMonth ?? undefined,
        contextMonth: selectedMonth ?? undefined,
      });
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export PR analytics detailed report:", err);
      setError("Failed to export PR report. Please try again.");
    } finally {
      setExportingReports(false);
    }
  };

  useAnalyticsExport(() => {
    const combined: Record<string, unknown>[] = [];
    monthlySeries.forEach((m) => {
      combined.push({ type: "Monthly Activity", month: m.month, openAtMonthEnd: m.openAtMonthEnd, created: m.created, merged: m.merged, closed: m.closed });
    });
    const validGovernanceStates = governanceStates.filter(g => ["Waiting on Editor", "Waiting on Author", "AWAITED"].includes(g.state));
    validGovernanceStates.forEach((g) => combined.push({ type: "Governance State", state: g.state, count: g.count }));
    processCategories.forEach((p) => combined.push({ type: "Process", category: p.category, count: p.count }));
    govWaitStates.forEach((g) => combined.push({ type: "Participant State", state: g.state, count: g.count, medianWaitDays: g.medianWaitDays }));
    openPRs.forEach((pr) => combined.push({ type: "Open PR", ...pr }));
    return combined;
  }, `prs-analytics-${repoFilter}-${timeRange}`);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <InlineBrandLoader size="md" label="Loading analytics..." />
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
        id="pr-trend"
        title="Open PR trend by month"
        icon={<BarChart3 className="h-4 w-4" />}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={downloadReports}
              disabled={exportingReports}
              className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
            >
              {exportingReports ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {exportingReports ? "Exporting..." : "Download Reports"}
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
        {monthlySeries.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">Range:</span>
            <select
              value={trendFromMonth ?? ""}
              onChange={(e) => {
                const nextFrom = e.target.value;
                setTrendFromMonth(nextFrom);
                if (trendToMonth && nextFrom > trendToMonth) setTrendToMonth(nextFrom);
              }}
              className="h-8 rounded-md border border-border bg-muted/40 px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              {monthlySeries.map((m) => (
                <option key={`from-${m.month}`} value={m.month}>
                  {m.month}
                </option>
              ))}
            </select>
            <span className="text-muted-foreground">to</span>
            <select
              value={trendToMonth ?? ""}
              onChange={(e) => {
                const nextTo = e.target.value;
                setTrendToMonth(nextTo);
                if (trendFromMonth && nextTo < trendFromMonth) setTrendFromMonth(nextTo);
              }}
              className="h-8 rounded-md border border-border bg-muted/40 px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              {monthlySeries.map((m) => (
                <option key={`to-${m.month}`} value={m.month}>
                  {m.month}
                </option>
              ))}
            </select>
            <span className="text-muted-foreground">Context month:</span>
            <select
              value={selectedMonth ?? ""}
              onChange={(e) => setSelectedMonth(e.target.value || null)}
              className="h-8 rounded-md border border-border bg-muted/40 px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              {monthlySeries.map((m) => (
                <option key={`ctx-${m.month}`} value={m.month}>
                  {m.month}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                setTrendFromMonth(monthlySeries[0]?.month ?? null);
                setTrendToMonth(monthlySeries[monthlySeries.length - 1]?.month ?? null);
              }}
              className="rounded-md border border-border bg-muted/40 px-2 py-1 text-xs text-foreground hover:bg-muted/60"
            >
              Full Range
            </button>
          </div>
        )}
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

      <Section id="pr-label-distribution" title="Label distribution" icon={<BarChart3 className="h-4 w-4" />}>
        {labelStats.length === 0 ? (
          <p className="text-sm text-muted-foreground">No label data available.</p>
        ) : (
          <div className="h-[320px] w-full">
            <ReactECharts option={labelDistributionOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} />
          </div>
        )}
        <GraphFooter nextUpdateAt={nextUpdateAt} />
      </Section>

      <Section id="pr-eip-open" title="EIP Open PRs" icon={<Layers className="h-4 w-4" />}>
        <p className="mb-3 text-xs text-muted-foreground">
          Open PRs by Process type (Typo, NEW EIP, PR DRAFT) or by Participants status (Waiting on Editor, Awaited). Sum of bars = total open PRs for that month.
        </p>
        <div className="mb-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span>Need help with</span>
          <span className="font-medium text-foreground/90">Awaited</span>
          <TooltipProvider delayDuration={120}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="What Awaited means"
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                >
                  <CircleHelp className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                {awaitedHelpText}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="mb-3 inline-flex rounded-md border border-border bg-muted/60 p-0.5 text-xs">
          <button
            onClick={() => setOpenPRDistributionMode("process")}
            className={cn("rounded px-2 py-1", openPRDistributionMode === "process" ? "bg-card text-foreground" : "text-muted-foreground")}
          >
            By Process
          </button>
          <button
            onClick={() => setOpenPRDistributionMode("participants")}
            className={cn("rounded px-2 py-1", openPRDistributionMode === "participants" ? "bg-card text-foreground" : "text-muted-foreground")}
          >
            By Participants
          </button>
        </div>
          {!backlogOption ? (
            <p className="text-sm text-muted-foreground">No backlog state data available.</p>
          ) : (
            <div className="h-[320px] w-full">
              <ReactECharts option={backlogOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} />
            </div>
          )}
        <p className="mt-2 text-[10px] text-muted-foreground">Each column is one month; stacked segments sum to the total open PR backlog in that month.</p>
        <GraphFooter nextUpdateAt={nextUpdateAt} />
      </Section>

      <Section
        id="pr-category-breakdown"
        title="Category breakdown"
        icon={<Users className="h-4 w-4" />}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={downloadCategoryBreakdownDetailedCSV}
              className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
            >
              <Download className="h-3.5 w-3.5" />
              Download CSV
            </button>
            <div className="inline-flex rounded-md border border-border bg-muted/60 p-0.5 text-xs">
              <button
                onClick={() => setCrossTabMode("process_x_state")}
                className={cn("rounded px-2 py-1", crossTabMode === "process_x_state" ? "bg-card text-foreground" : "text-muted-foreground")}
              >
                X: Process
              </button>
              <button
                onClick={() => setCrossTabMode("state_x_process")}
                className={cn("rounded px-2 py-1", crossTabMode === "state_x_process" ? "bg-card text-foreground" : "text-muted-foreground")}
              >
                X: Participants
              </button>
            </div>
          </div>
        }
      >
        <p className="mb-1 text-xs font-semibold text-foreground">Process × Participants</p>
        <p className="mb-3 text-xs text-muted-foreground">
          X: Process. Open PRs by Process type and Participants status for {monthContext}. Choose Process or Participants on the X-axis (the other is stacked). Sum of segments = total open PRs in that month context.
        </p>
        <div className="mb-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span>Status note:</span>
          <span className="font-medium text-foreground/90">Awaited</span>
          <TooltipProvider delayDuration={120}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="What Awaited means"
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                >
                  <CircleHelp className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                {awaitedHelpText}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
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

      <details className="rounded-xl border border-border bg-card/50">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-foreground">
          Supporting metrics
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </summary>
        <div className="border-t border-border/70 px-4 py-4">
          <div className="grid gap-6 lg:grid-cols-3">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Participant status mix</h3>
              <div className="space-y-2">
                {governanceStates
                  .filter(g => ["Waiting on Editor", "Waiting on Author", "AWAITED"].includes(g.state))
                  .map((g) => {
                  const filteredStates = governanceStates.filter(s => ["Waiting on Editor", "Waiting on Author", "AWAITED"].includes(s.state));
                  const total = filteredStates.reduce((acc, s) => acc + s.count, 0);
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
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Decision speed</h3>
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
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Labels and staleness</h3>
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

      <Section
        id="open-prs-section"
        title="Open PRs"
        icon={<GitPullRequest className="h-4 w-4" />}
        action={
          <button
            onClick={downloadOpenPRsDetailedCSV}
            className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
          >
            <Download className="h-3.5 w-3.5" />
            Download CSV
          </button>
        }
      >
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
