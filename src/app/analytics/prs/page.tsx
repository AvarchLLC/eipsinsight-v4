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
  lastReviewAt: string | null;
  lastActivityAt: string | null;
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

interface OpenIssueRow {
  issueNumber: number;
  repo: string;
  title: string | null;
  author: string | null;
  createdAt: string;
  state: string;
  updatedAt: string | null;
  linkedEIPs: string | null;
  labels: string[];
  numComments: number;
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
  const [mergedPRs, setMergedPRs] = useState<OpenPRRow[]>([]);
  const [closedPRs, setClosedPRs] = useState<OpenPRRow[]>([]);
  const [openIssues, setOpenIssues] = useState<OpenIssueRow[]>([]);
  const [backlogTab, setBacklogTab] = useState<"prs" | "issues">("prs");
  const [prCurrentPage, setPrCurrentPage] = useState(1);
  const [issuesCurrentPage, setIssuesCurrentPage] = useState(1);
  const [prSearchFilter, setPrSearchFilter] = useState<string>("");
  const [issuesSearchFilter, setIssuesSearchFilter] = useState<string>("");
  const [prStateFilter, setPrStateFilter] = useState<"all" | "open" | "created" | "merged" | "closed">("all");
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

  // Filtering and search logic
  const filteredPRs = useMemo(() => {
    let result: OpenPRRow[] = [];

    // Start with correct dataset based on state filter
    if (prStateFilter === "open") {
      result = openPRs;
    } else if (prStateFilter === "created") {
      result = openPRs;
      // Filter by context month
      const contextMonthStr = selectedMonth || heroMonth?.month;
      if (contextMonthStr) {
        result = result.filter((pr) => pr.createdAt.includes(contextMonthStr));
      }
    } else if (prStateFilter === "merged") {
      result = mergedPRs;
    } else if (prStateFilter === "closed") {
      result = closedPRs;
    } else {
      result = openPRs;
    }

    // Apply search filter
    if (prSearchFilter.trim()) {
      const query = prSearchFilter.toLowerCase();
      result = result.filter(
        (pr) =>
          pr.prNumber.toString().includes(query) ||
          (pr.title && pr.title.toLowerCase().includes(query)) ||
          pr.repo.toLowerCase().includes(query) ||
          (pr.author && pr.author.toLowerCase().includes(query))
      );
    }

    return result;
  }, [openPRs, mergedPRs, closedPRs, prStateFilter, prSearchFilter, selectedMonth, heroMonth?.month]);

  const filteredIssues = useMemo(() => {
    let result = openIssues;

    // Apply search filter
    if (issuesSearchFilter.trim()) {
      const query = issuesSearchFilter.toLowerCase();
      result = result.filter(
        (issue) =>
          issue.issueNumber.toString().includes(query) ||
          (issue.title && issue.title.toLowerCase().includes(query)) ||
          issue.repo.toLowerCase().includes(query) ||
          (issue.author && issue.author.toLowerCase().includes(query))
      );
    }

    return result;
  }, [openIssues, issuesSearchFilter]);

  // Pagination
  const PAGE_SIZE = 20;
  const prTotalPages = Math.ceil(filteredPRs.length / PAGE_SIZE);
  const prPageIssuesTotal = Math.ceil(openIssues.length / PAGE_SIZE);
  
  const paginatedPRs = filteredPRs.slice(
    (prCurrentPage - 1) * PAGE_SIZE,
    prCurrentPage * PAGE_SIZE
  );
  
  const paginatedIssues = filteredIssues.slice(
    (issuesCurrentPage - 1) * PAGE_SIZE,
    issuesCurrentPage * PAGE_SIZE
  );

  const issuesTotalPages = Math.ceil(filteredIssues.length / PAGE_SIZE);

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

        const [openExport, mergedExport, closedExport, issueExport] = await Promise.all([
          client.analytics.getPROpenExport({ repo: repoParam, month: contextMonth }),
          client.analytics.getPRMergedExport({ repo: repoParam, month: contextMonth }),
          client.analytics.getPRClosedExport({ repo: repoParam, month: contextMonth }),
          client.analytics.getIssueOpenExport({ repo: repoParam, month: contextMonth }),
        ]);
        setOpenPRs(openExport);
        setMergedPRs(mergedExport);
        setClosedPRs(closedExport);
        setOpenIssues(issueExport);
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

  // Reset pagination when data is fetched
  useEffect(() => {
    setPrCurrentPage(1);
    setIssuesCurrentPage(1);
  }, [openPRs, mergedPRs, closedPRs, openIssues]);

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
        grid: { top: 38, left: 38, right: 18, bottom: 52 },
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
          {
            type: "slider",
            show: true,
            realtime: true,
            height: 22,
            bottom: 4,
            borderColor: "rgba(148,163,184,0.15)",
            backgroundColor: "rgba(148,163,184,0.03)",
            fillerColor: "rgba(34,211,238,0.12)",
            handleIcon: "M10.7,11.9v-1.3H9.3v1.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4v1.3h1.3v-1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7V23h6.6V24.4z M13.3,19.6H6.7v-1.4h6.6V19.6z",
            handleSize: "110%",
            handleStyle: {
              color: "var(--background)",
              borderColor: "rgba(34,211,238,0.5)",
              borderWidth: 1.5,
              shadowBlur: 3,
              shadowColor: "rgba(0, 0, 0, 0.2)",
              shadowOffsetX: 1,
              shadowOffsetY: 1
            },
            showDetail: true,
            start: 40,
            end: 100,
            textStyle: { 
              color: "var(--muted-foreground)", 
              fontSize: 10,
              fontFamily: "inherit",
              fontWeight: 505
            },
            dataBackground: {
              areaStyle: { color: "rgba(34,211,238,0.03)" },
              lineStyle: { color: "rgba(34,211,238,0.1)" }
            },
            selectedDataBackground: {
              areaStyle: { color: "rgba(34,211,238,0.08)" },
              lineStyle: { color: "rgba(34,211,238,0.3)" }
            }
          },
          {
            type: "inside",
            realtime: true,
            start: 40,
            end: 100
          }
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
    
    // Ultra-aggressive filtering: only allow exactly these 3 states
    const filteredGovWait = govWaitStatesByMonth.map(m => ({
      ...m,
      rows: m.rows
        .filter(r => VALID_GOV_STATES.includes(r.state))
        .map(r => ({ ...r, state: r.state as typeof VALID_GOV_STATES[number] }))
    }));
    
    // Build series for only the 3 valid states, no others
    const validSeries = VALID_GOV_STATES.map((state) => {
      const hasData = filteredGovWait.some((m) => m.rows.some((r) => r.state === state && r.count > 0));
      const data = months.map((month) => {
        const row = filteredGovWait.find((d) => d.month === month);
        const value = row?.rows.find((r) => r.state === state)?.count ?? 0;
        return Math.max(0, Number(value));
      });
      return {
        name: state,
        type: "bar",
        stack: "open",
        data: data,
        itemStyle: { color: GOVERNANCE_COLORS[state] || "#64748B" },
        show: hasData,
      };
    }).filter(s => s.show);
    
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      legend: {
        top: 0,
        textStyle: { color: "var(--muted-foreground)", fontSize: 11 },
        data: validSeries.map(s => s.name),
      },
      grid: { top: 38, left: 38, right: 18, bottom: 52 },
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
        {
          type: "slider",
          show: true,
          realtime: true,
          height: 22,
          bottom: 4,
          borderColor: "rgba(148,163,184,0.15)",
          backgroundColor: "rgba(148,163,184,0.03)",
          fillerColor: "rgba(34,211,238,0.12)",
          handleIcon: "M10.7,11.9v-1.3H9.3v1.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4v1.3h1.3v-1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7V23h6.6V24.4z M13.3,19.6H6.7v-1.4h6.6V19.6z",
          handleSize: "110%",
          handleStyle: {
            color: "var(--background)",
            borderColor: "rgba(34,211,238,0.5)",
            borderWidth: 1.5,
            shadowBlur: 3,
            shadowColor: "rgba(0, 0, 0, 0.2)",
            shadowOffsetX: 1,
            shadowOffsetY: 1
          },
          showDetail: true,
          start: 40,
          end: 100,
          textStyle: { 
            color: "var(--muted-foreground)", 
            fontSize: 10,
            fontFamily: "inherit",
            fontWeight: 505
          },
          dataBackground: {
            areaStyle: { color: "rgba(34,211,238,0.03)" },
            lineStyle: { color: "rgba(34,211,238,0.1)" }
          },
          selectedDataBackground: {
            areaStyle: { color: "rgba(34,211,238,0.08)" },
            lineStyle: { color: "rgba(34,211,238,0.3)" }
          }
        },
        {
          type: "inside",
          realtime: true,
          start: 40,
          end: 100
        }
      ],
      series: validSeries.map(({ show, ...s }) => s),
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
      pr_link: `https://github.com/${pr.repo}/pull/${pr.prNumber}`,
      repo: pr.repo,
      title: pr.title,
      author: pr.author,
      process_type: pr.processType,
      governance_state: pr.governanceState,
      labels: pr.labels.join("; "),
      linked_eips: pr.linkedEIPs,
      created_at: pr.createdAt,
      last_review_date: pr.lastReviewAt ?? "Never",
      last_activity_date: pr.lastActivityAt ?? pr.createdAt,
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

  const downloadOpenIssuesDetailedCSV = useCallback(() => {
    const generatedAt = new Date().toISOString();
    const rows: Array<Record<string, string | number | null>> = openIssues.map((issue) => ({
      issue_number: issue.issueNumber,
      repo: issue.repo,
      title: issue.title,
      author: issue.author,
      state: issue.state,
      labels: issue.labels.join("; "),
      linked_eips: issue.linkedEIPs,
      created_at: issue.createdAt,
      updated_at: issue.updatedAt,
      num_comments: issue.numComments,
      month_context: monthContext,
      repo_filter: repoFilter,
      generated_at: generatedAt,
    }));
    downloadObjectRowsCsv(
      rows,
      `eip-open-issues-detailed-${repoFilter}-${monthContext}-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  }, [downloadObjectRowsCsv, monthContext, openIssues, repoFilter, timeRange]);

  const downloadCategoryBreakdownDetailedCSV = useCallback(() => {
    const generatedAt = new Date().toISOString();
    const rows = openPRs.map((pr) => ({
      process_category: pr.processType,
      waiting_state: pr.governanceState,
      pr_number: pr.prNumber,
      pr_link: `https://github.com/${pr.repo}/pull/${pr.prNumber}`,
      title: pr.title,
      author: pr.author,
      open_date: pr.createdAt,
      last_review_date: pr.lastReviewAt ?? "Never",
      last_activity_date: pr.lastActivityAt ?? pr.createdAt,
      labels: pr.labels.join("; "),
      month_context: monthContext,
      generated_at: generatedAt,
    }));
    downloadObjectRowsCsv(
      rows,
      `pr-category-breakdown-prs-${repoFilter}-${monthContext}-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  }, [downloadObjectRowsCsv, monthContext, openPRs, repoFilter]);

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
          { label: "Open PRs", value: totalOpen, sub: `Median age: ${openSummary?.medianAge != null ? `${openSummary.medianAge}d` : "–"}`, icon: <GitPullRequest className="h-5 w-5" />, filter: "open" as const },
          { label: `Created (${heroMonth?.month ?? ""})`, value: heroMonth?.newPRs ?? 0, sub: `Net: ${(heroMonth?.netDelta ?? 0) >= 0 ? "+" : ""}${heroMonth?.netDelta ?? 0}`, icon: <Activity className="h-5 w-5" />, filter: "created" as const },
          { label: "Merged", value: heroMonth?.mergedPRs ?? 0, sub: "Current month", icon: <GitPullRequest className="h-5 w-5" />, filter: "merged" as const },
          { label: "Closed (unmerged)", value: heroMonth?.closedUnmerged ?? 0, sub: "Current month", icon: <AlertCircle className="h-5 w-5" />, filter: "closed" as const },
        ].map((kpi) => (
          <button
            key={kpi.label}
            onClick={() => {
              setPrStateFilter(kpi.filter);
              setPrCurrentPage(1);
              setPrSearchFilter("");
              // Scroll to table
              setTimeout(() => {
                document.getElementById("open-prs-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 100);
            }}
            className={cn(
              "rounded-xl border bg-card/60 p-4 text-left transition-all hover:border-primary/50 hover:bg-card/80",
              prStateFilter === kpi.filter ? "border-primary bg-primary/5" : "border-border"
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{kpi.value.toLocaleString()}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">{kpi.sub}</p>
              </div>
              <div className={cn("rounded-lg p-2.5", prStateFilter === kpi.filter ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary")}>{kpi.icon}</div>
            </div>
          </button>
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

      <Section
        id="pr-eip-open"
        title="EIP Open PRs"
        icon={<Layers className="h-4 w-4" />}
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
            <div className="relative h-[320px] w-full">
              <ReactECharts option={backlogOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="select-none text-sm font-medium tracking-[0.06em] text-foreground/12 dark:text-foreground/16 sm:text-base">
                  EIPsInsight.com
                </span>
              </div>
            </div>
          )}
        <p className="mt-2 text-[10px] text-muted-foreground">Each column is one month; stacked segments sum to the total open PR backlog in that month.</p>
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
        title={backlogTab === "prs" ? "Open PRs" : "Open Issues"}
        icon={<GitPullRequest className="h-4 w-4" />}
        action={
          <button
            onClick={backlogTab === "prs" ? downloadOpenPRsDetailedCSV : downloadOpenIssuesDetailedCSV}
            className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
          >
            <Download className="h-3.5 w-3.5" />
            Download CSV
          </button>
        }
      >
        {/* Tab Switcher */}
        <div className="mb-4 flex gap-2 border-b border-border">
          <button
            onClick={() => {
              setBacklogTab("prs");
              setPrStateFilter("all");
              setPrSearchFilter("");
              setPrCurrentPage(1);
            }}
            className={cn(
              "px-3 py-2 text-xs font-medium transition-colors border-b-2",
              backlogTab === "prs"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Pull Requests ({openPRs.length})
          </button>
          <button
            onClick={() => setBacklogTab("issues")}
            className={cn(
              "px-3 py-2 text-xs font-medium transition-colors border-b-2",
              backlogTab === "issues"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Issues ({openIssues.length})
          </button>
        </div>

        <p className="mb-3 text-xs text-muted-foreground">
          {backlogTab === "prs" 
            ? "Snapshot of currently open pull requests in selected repository scope."
            : "Snapshot of currently open issues in selected repository scope."}
        </p>

        {/* Open PRs Table */}
        {backlogTab === "prs" && (
          <div>
            {/* State Filter Tabs */}
            <div className="mb-4 border-b border-border">
              <div className="flex gap-1">
                {[
                  { label: "Open", filter: "open" as const, count: totalOpen },
                  { label: `Created (${heroMonth?.month ?? ""})`, filter: "created" as const, count: heroMonth?.newPRs ?? 0 },
                  { label: "Merged", filter: "merged" as const, count: heroMonth?.mergedPRs ?? 0 },
                  { label: "Closed", filter: "closed" as const, count: heroMonth?.closedUnmerged ?? 0 },
                ].map((tab) => (
                  <button
                    key={tab.filter}
                    onClick={() => {
                      setPrStateFilter(tab.filter);
                      setPrCurrentPage(1);
                      setPrSearchFilter("");
                    }}
                    className={cn(
                      "px-3 py-2 text-xs font-medium transition-colors border-b-2 whitespace-nowrap",
                      prStateFilter === tab.filter
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>
            </div>

            {/* Search and Filter */}
            <div className="mb-3 flex items-center gap-2">
              <input
                type="text"
                placeholder="Search by PR #, title, repo, or author..."
                value={prSearchFilter}
                onChange={(e) => {
                  setPrSearchFilter(e.target.value);
                  setPrCurrentPage(1);
                }}
                className="h-8 flex-1 rounded-md border border-border bg-muted/40 px-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              />
              {(prStateFilter !== "all" || prSearchFilter) && (
                <button
                  onClick={() => {
                    setPrStateFilter("all");
                    setPrSearchFilter("");
                    setPrCurrentPage(1);
                  }}
                  className="rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted/60"
                >
                  Clear filter
                </button>
              )}
            </div>
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
                  {paginatedPRs.map((pr) => {
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
                  {filteredPRs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                        No open PRs found for current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination Controls */}
            {filteredPRs.length > PAGE_SIZE && (
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Showing {filteredPRs.length === 0 ? 0 : (prCurrentPage - 1) * PAGE_SIZE + 1}–{Math.min(prCurrentPage * PAGE_SIZE, filteredPRs.length)} of {filteredPRs.length}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPrCurrentPage(Math.max(1, prCurrentPage - 1))}
                    disabled={prCurrentPage === 1}
                    className="rounded-md border border-border bg-muted/40 px-2 py-1 text-xs text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/60"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-muted-foreground">
                    {prCurrentPage} / {prTotalPages}
                  </span>
                  <button
                    onClick={() => setPrCurrentPage(Math.min(prTotalPages, prCurrentPage + 1))}
                    disabled={prCurrentPage === prTotalPages}
                    className="rounded-md border border-border bg-muted/40 px-2 py-1 text-xs text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/60"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Open Issues Table */}
        {backlogTab === "issues" && (
          <div>
            {/* Search */}
            <div className="mb-3 flex items-center gap-2">
              <input
                type="text"
                placeholder="Search by issue #, title, repo, or author..."
                value={issuesSearchFilter}
                onChange={(e) => {
                  setIssuesSearchFilter(e.target.value);
                  setIssuesCurrentPage(1);
                }}
                className="h-8 flex-1 rounded-md border border-border bg-muted/40 px-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              />
              {issuesSearchFilter && (
                <button
                  onClick={() => {
                    setIssuesSearchFilter("");
                    setIssuesCurrentPage(1);
                  }}
                  className="rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted/60"
                >
                  Clear search
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2 pr-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Issue</th>
                    <th className="py-2 pr-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Title</th>
                    <th className="py-2 pr-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Repo</th>
                    <th className="py-2 pr-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Author</th>
                    <th className="py-2 pr-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Comments</th>
                    <th className="py-2 pr-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedIssues.map((issue) => {
                    const [org, repoName] = issue.repo.split("/");
                    const url = `https://github.com/${org}/${repoName}/issues/${issue.issueNumber}`;
                    const repoShort = repoName.toLowerCase();
                    return (
                      <tr key={`${issue.repo}-${issue.issueNumber}`} className="border-b border-border/50 transition-colors hover:bg-muted/40">
                        <td className="py-2 pr-4">
                          <div className="inline-flex items-center gap-2">
                            <Link href={`/issue/${repoShort}/${issue.issueNumber}`} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                              #{issue.issueNumber}
                            </Link>
                            <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground" title="Open on GitHub">
                              <ArrowUpRight className="h-3 w-3" />
                            </a>
                          </div>
                        </td>
                        <td className="max-w-xs truncate py-2 pr-4 text-foreground/90">{issue.title || <span className="text-muted-foreground">No title</span>}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{repoName}</td>
                        <td className="py-2 pr-4 text-foreground/80">{issue.author || <span className="text-muted-foreground">Unknown</span>}</td>
                        <td className="py-2 pr-4 tabular-nums text-muted-foreground">{issue.numComments}</td>
                        <td className="py-2 pr-4 tabular-nums text-muted-foreground">{issue.createdAt}</td>
                      </tr>
                    );
                  })}
                  {filteredIssues.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                        No open issues found for current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination Controls */}
            {filteredIssues.length > PAGE_SIZE && (
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Showing {filteredIssues.length === 0 ? 0 : (issuesCurrentPage - 1) * PAGE_SIZE + 1}–{Math.min(issuesCurrentPage * PAGE_SIZE, filteredIssues.length)} of {filteredIssues.length}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIssuesCurrentPage(Math.max(1, issuesCurrentPage - 1))}
                    disabled={issuesCurrentPage === 1}
                    className="rounded-md border border-border bg-muted/40 px-2 py-1 text-xs text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/60"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-muted-foreground">
                    {issuesCurrentPage} / {issuesTotalPages}
                  </span>
                  <button
                    onClick={() => setIssuesCurrentPage(Math.min(issuesTotalPages, issuesCurrentPage + 1))}
                    disabled={issuesCurrentPage === issuesTotalPages}
                    className="rounded-md border border-border bg-muted/40 px-2 py-1 text-xs text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/60"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {backlogTab === "prs" && openSummary?.oldestPR && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-100">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>
              Oldest open PR: <span className="font-semibold">{openSummary.oldestPR.repo}#{openSummary.oldestPR.pr_number}</span> by {openSummary.oldestPR.author} - open for {openSummary.oldestPR.age_days} days.
            </span>
          </div>
        )}
      </Section>
    </div>
  );
}
