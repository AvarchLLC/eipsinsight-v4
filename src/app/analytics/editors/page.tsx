"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useAnalytics, useAnalyticsExport } from "../analytics-layout-client";
import { client } from "@/lib/orpc";
import { CANONICAL_EIP_EDITORS } from "@/data/eip-contributor-roles";
import { 
  Loader2, 
  UserCheck, 
  Clock, 
  FileText, 
  Download, 
  AlertCircle, 
  ChevronDown,
  BarChart3,
  TrendingUp,
  Users,
  Grid3x3,
  Activity,
  Zap,
  LineChart,
  List,
  BarChart4,
  Filter,
  X
} from "lucide-react";
import { AnalyticsAnnotation } from "@/components/analytics/AnalyticsAnnotation";
import ReactECharts from "echarts-for-react";
import { LastUpdated } from "@/components/analytics/LastUpdated";
import { CopyLinkButton } from "@/components/header";
import { InlineBrandLoader } from "@/components/inline-brand-loader";

interface EditorLeaderboardRow {
  actor: string;
  totalActions: number;
  prsTouched: number;
  reviews: number;
  comments: number;
  medianResponseDays: number | null;
  updatedAt?: string | null;
}

interface CategoryCoverage {
  category: string;
  actors: string[];
}

interface RepoDistribution {
  actor: string;
  repo: string;
  count: number;
  pct: number;
}

interface MonthlyTrendPoint {
  month: string;
  [actor: string]: string | number;
}

interface DailyActivityStackedRow {
  date: string;
  actor: string;
  count: number;
}

interface EditorActionDetailRow {
  actor: string;
  eventType: string;
  actedAt: string;
  prNumber: number;
  repoShort: string;
  title: string;
  eventUrl: string | null;
}

const categoryColors: Record<string, string> = {
  core: "#34d399",
  erc: "#60a5fa",
  networking: "#a78bfa",
  interface: "#f472b6",
  meta: "#fbbf24",
  informational: "#94a3b8",
  governance: "#ef4444",
};

const repoColors: Record<string, string> = {
  "ethereum/EIPs": "#22d3ee",
  "ethereum/ERCs": "#60a5fa",
  "ethereum/RIPs": "#94a3b8",
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const OFFICIAL_EDITOR_HANDLES: string[] = Array.from(CANONICAL_EIP_EDITORS);

function getGitHubAvatarUrl(handle: string): string {
  return `https://github.com/${handle}.png?size=80`;
}

function getTimeWindow(timeRange: string): { from: string | undefined; to: string | undefined } {
  const now = new Date();
  const to = now.toISOString().split('T')[0];
  
  if (timeRange === "all") {
    return { from: undefined, to: undefined };
  }

  let from: Date;
  switch (timeRange) {
    case "this_month":
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "7d":
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "90d":
      from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "1y":
      from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      from = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  
  return { from: from.toISOString().split('T')[0], to };
}

function getMonthWindow(year: number, month: number): { from: string; to: string } {
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 0));
  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  };
}

// TEMPORARY: normalize spike months to prevent visual distortion in the trend charts.
// Months "2022-08" and "2026-02" had anomalously high counts; capped at 65 per actor.
// REVERT: remove this function and its call sites in setMonthlyTrend / setMonthlyReviewedTrend.
const TEMP_NORMALIZE_MONTHS: Record<string, number> = { "2022-08": 65, "2026-02": 65 };
function normalizeTrendSpikes(data: MonthlyTrendPoint[]): MonthlyTrendPoint[] {
  return data.map((point) => {
    const cap = TEMP_NORMALIZE_MONTHS[point.month];
    if (!cap) return point;
    const normalized: MonthlyTrendPoint = { month: point.month };
    for (const key of Object.keys(point)) {
      if (key === "month") continue;
      const val = Number(point[key] || 0);
      normalized[key] = val > cap ? cap : val;
    }
    return normalized;
  });
}

function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(","), ...rows.map((row) => row.map(escape).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function EditorsAnalyticsPage() {
  const { timeRange, repoFilter } = useAnalytics();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataUpdatedAt, setDataUpdatedAt] = useState<Date>(new Date());
  
  const [leaderboard, setLeaderboard] = useState<EditorLeaderboardRow[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrendPoint[]>([]);
  const [monthlyReviewedTrend, setMonthlyReviewedTrend] = useState<MonthlyTrendPoint[]>([]);
  const [categoryCoverage, setCategoryCoverage] = useState<CategoryCoverage[]>([]);
  const [repoDistribution, setRepoDistribution] = useState<RepoDistribution[]>([]);
  const [dailyActivityStacked, setDailyActivityStacked] = useState<DailyActivityStackedRow[]>([]);
  const [editorActionDetails, setEditorActionDetails] = useState<EditorActionDetailRow[]>([]);
  const [membershipTier, setMembershipTier] = useState<string>('free');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [leaderboardMode, setLeaderboardMode] = useState<"all" | "monthly" | "range">("range");
  const [leaderboardYear, setLeaderboardYear] = useState<number>(() => new Date().getUTCFullYear());
  const [leaderboardMonth, setLeaderboardMonth] = useState<number>(() => new Date().getUTCMonth() + 1);
  const [downloadingEditor, setDownloadingEditor] = useState<string | null>(null);
  const [activityRepoFilter, setActivityRepoFilter] = useState<string>("all");
  const [activityEditorFilter, setActivityEditorFilter] = useState<string>("all");
  const [activityActionFilter, setActivityActionFilter] = useState<string>("all");
  const [visibleActivityCount, setVisibleActivityCount] = useState<number>(20);
  const [expandedActivityKeys, setExpandedActivityKeys] = useState<Record<string, boolean>>({});
  const [leaderboardHeroView, setLeaderboardHeroView] = useState<"chart" | "list">("chart");
  const [trendPrimaryMetric, setTrendPrimaryMetric] = useState<"actions" | "reviews">("actions");

  const repoParam = repoFilter === "all" ? undefined : repoFilter;
  const { from, to } = getTimeWindow(timeRange);
  const [exporting, setExporting] = useState(false);
  const isPaidMember = true;
  const leaderboardWindow = useMemo(
    () => (
      leaderboardMode === "monthly"
        ? getMonthWindow(leaderboardYear, leaderboardMonth)
        : leaderboardMode === "range"
          ? { from, to }
          : { from: undefined, to: undefined }
    ),
    [leaderboardMode, leaderboardYear, leaderboardMonth, from, to]
  );
  const leaderboardLabel = useMemo(() => {
    if (leaderboardMode === "all") {
      return "All-Time Activity";
    }
    if (leaderboardMode === "monthly") {
      return `${MONTH_NAMES[leaderboardMonth - 1]} ${leaderboardYear}`;
    }
    if (!leaderboardWindow.from && !leaderboardWindow.to) return "All-Time Contributions";
    return "Selected Dashboard Range";
  }, [leaderboardMode, leaderboardMonth, leaderboardYear, leaderboardWindow.from, leaderboardWindow.to]);
  const currentYear = new Date().getUTCFullYear();
  const yearOptions = useMemo(() => {
    return Array.from({ length: 8 }, (_, idx) => currentYear - idx);
  }, [currentYear]);

  const downloadLeaderboardCSV = useCallback(async () => {
    if (!isPaidMember) {
      setShowUpgradeModal(true);
      return;
    }

    setExporting(true);
    try {
      const exportResult = leaderboardMode === "monthly"
        ? await client.analytics.exportMonthlyEditorLeaderboardDetailedCSV({
            repo: repoParam,
            monthYear: `${leaderboardYear}-${String(leaderboardMonth).padStart(2, "0")}`,
            limit: 30,
          })
        : await client.analytics.getEditorsLeaderboardExport({
            repo: repoParam,
            from,
            to,
          });
      const { csv, filename } = exportResult;
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("CSV export failed:", err);
      setError("CSV export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }, [repoParam, from, to, isPaidMember, leaderboardMode, leaderboardMonth, leaderboardYear]);

  const downloadEditorReport = useCallback(async (actor: string) => {
    if (!isPaidMember) {
      setShowUpgradeModal(true);
      return;
    }
    setDownloadingEditor(actor);
    try {
      const exportResult = leaderboardMode === "monthly"
        ? await client.analytics.exportMonthlyEditorLeaderboardDetailedCSV({
            repo: repoParam,
            monthYear: `${leaderboardYear}-${String(leaderboardMonth).padStart(2, "0")}`,
            limit: 30,
            actor,
          })
        : await client.analytics.getEditorsLeaderboardExport({
            repo: repoParam,
            from,
            to,
            actor,
          });

      const { csv, filename } = exportResult;
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Per-editor export failed:", err);
      setError(`Failed to export report for ${actor}. Please try again.`);
    } finally {
      setDownloadingEditor(null);
    }
  }, [from, isPaidMember, leaderboardMode, leaderboardMonth, leaderboardYear, repoParam, to]);

  // Fetch membership tier on mount
  useEffect(() => {
    fetch('/api/stripe/subscription')
      .then(res => res.json())
      .then(data => setMembershipTier(data?.tier || 'free'))
      .catch(() => setMembershipTier('free'));
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Keep trend charts long-horizon so editorial patterns are visible across years.
        const months = 72;
        
        const [leaderboardData, trendData, reviewedTrendData, categoryData, repoData, dailyStackedData, actionDetails] = await Promise.all([
          leaderboardMode === "monthly"
            ? client.analytics.getMonthlyEditorLeaderboard({
                repo: repoParam,
                monthYear: `${leaderboardYear}-${String(leaderboardMonth).padStart(2, "0")}`,
                limit: 30,
              }).then((res) => ({
                rows: res.items.map((item) => ({
                  actor: item.actor,
                  totalActions: item.totalActions,
                  prsTouched: item.prsTouched,
                  reviews: 0,
                  comments: 0,
                  medianResponseDays: null,
                  updatedAt: res.updatedAt,
                })),
                updatedAt: res.updatedAt,
              }))
            : client.analytics.getEditorsLeaderboard({
                repo: repoParam,
                from: leaderboardWindow.from,
                to: leaderboardWindow.to,
                limit: 30,
              }).then((rows) => ({
                rows,
                updatedAt: rows
                  .map((row) => row.updatedAt)
                  .filter((value): value is string => Boolean(value))
                  .sort()
                  .at(-1) ?? null,
              })),
          client.analytics.getEditorsMonthlyTrend({
            repo: repoParam,
            months,
            from: leaderboardWindow.from,
            to: leaderboardWindow.to,
          }),
          client.analytics.getEditorsMonthlyReviewedPRs({
            repo: repoParam,
            months,
            from: leaderboardWindow.from,
            to: leaderboardWindow.to,
          }),
          client.analytics.getEditorsByCategory({
            repo: repoParam,
            from: leaderboardWindow.from,
            to: leaderboardWindow.to,
          }),
          client.analytics.getEditorsRepoDistribution({
            repo: repoParam,
            from: leaderboardWindow.from,
            to: leaderboardWindow.to,
          }),
          client.analytics.getEditorDailyActivityStacked({
            repo: repoParam,
            from: leaderboardWindow.from,
            to: leaderboardWindow.to,
          }),
          client.analytics.getEditorActionDetails({
            repo: repoParam,
            from: leaderboardWindow.from,
            to: leaderboardWindow.to,
            limit: 1200,
          }),
        ]);

        setLeaderboard(leaderboardData.rows);
        setMonthlyTrend(normalizeTrendSpikes(trendData)); // TEMPORARY: see normalizeTrendSpikes
        setMonthlyReviewedTrend(normalizeTrendSpikes(reviewedTrendData)); // TEMPORARY: see normalizeTrendSpikes
        setCategoryCoverage(categoryData);
        setRepoDistribution(repoData);
        setDailyActivityStacked(dailyStackedData);
        setEditorActionDetails(actionDetails);
        if (leaderboardData.updatedAt) {
          setDataUpdatedAt(new Date(leaderboardData.updatedAt));
        } else if (dailyStackedData.length > 0) {
          setDataUpdatedAt(new Date(`${dailyStackedData[dailyStackedData.length - 1]!.date}T00:00:00.000Z`));
        } else {
          setDataUpdatedAt(new Date());
        }
      } catch (error) {
        console.error("Failed to fetch editors analytics:", error);
        setError("Failed to load editor analytics. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timeRange, repoFilter, repoParam, from, to, leaderboardWindow.from, leaderboardWindow.to, leaderboardMode, leaderboardMonth, leaderboardYear]);

  // Aggregate repo distribution into cards
  const repoCards = useMemo(() => {
    const totals: Record<string, number> = {};
    repoDistribution.forEach(r => {
      const repoName = r.repo.split('/')[1] || r.repo;
      totals[repoName] = (totals[repoName] || 0) + r.count;
    });
    const total = Object.values(totals).reduce((s, v) => s + v, 0);
    return [
      { name: "EIPs", count: totals["EIPs"] || 0, pct: total > 0 ? ((totals["EIPs"] || 0) / total) * 100 : 0, color: repoColors["ethereum/EIPs"] },
      { name: "ERCs", count: totals["ERCs"] || 0, pct: total > 0 ? ((totals["ERCs"] || 0) / total) * 100 : 0, color: repoColors["ethereum/ERCs"] },
      { name: "RIPs", count: totals["RIPs"] || 0, pct: total > 0 ? ((totals["RIPs"] || 0) / total) * 100 : 0, color: repoColors["ethereum/RIPs"] },
    ];
  }, [repoDistribution]);

  // Prepare category coverage for stacked bars
  const categoryData = useMemo(() => {
    const categories = categoryCoverage.map(c => c.category);
    const allActors = new Set<string>();
    categoryCoverage.forEach(c => c.actors.forEach(a => allActors.add(a)));
    
    return categories.map(category => {
      const coverage = categoryCoverage.find(c => c.category === category);
      return {
        category: category.charAt(0).toUpperCase() + category.slice(1),
        count: coverage?.actors.length || 0,
        actors: coverage?.actors || [],
      };
    }).filter(c => c.count > 0);
  }, [categoryCoverage]);

  const categoriesByActor = useMemo(() => {
    const map: Record<string, string[]> = {};
    OFFICIAL_EDITOR_HANDLES.forEach((actor) => {
      map[actor] = [];
    });
    categoryCoverage.forEach((entry) => {
      entry.actors.forEach((actor) => {
        if (!map[actor]) map[actor] = [];
        map[actor].push(entry.category.charAt(0).toUpperCase() + entry.category.slice(1));
      });
    });
    return map;
  }, [categoryCoverage]);

  const reposByActor = useMemo(() => {
    const map: Record<string, string[]> = {};
    repoDistribution.forEach((row) => {
      const repoName = row.repo.split("/")[1] || row.repo;
      if (!map[row.actor]) map[row.actor] = [];
      if (!map[row.actor]!.includes(repoName)) map[row.actor]!.push(repoName);
    });
    return map;
  }, [repoDistribution]);

  const topEditorCards = useMemo(
    () => leaderboard.filter((e) => e.totalActions > 0).slice(0, 6),
    [leaderboard],
  );
  const leaderboardHeroRows = useMemo(
    () => [...leaderboard].sort((a, b) => b.totalActions - a.totalActions).slice(0, 12),
    [leaderboard]
  );

  // Get unique actors from monthly trend for legend
  const trendActors = useMemo(() => {
    if (monthlyTrend.length === 0) return [];
    const actors = new Set<string>();
    monthlyTrend.forEach(point => {
      Object.keys(point).forEach(key => {
        if (key !== 'month' && typeof point[key] === 'number') {
          actors.add(key);
        }
      });
    });
    return Array.from(actors).slice(0, 8); // Limit to 8 for readability
  }, [monthlyTrend]);

  const reviewedTrendActors = useMemo(() => {
    if (monthlyReviewedTrend.length === 0) return [];
    const actors = new Set<string>();
    monthlyReviewedTrend.forEach((point) => {
      Object.keys(point).forEach((key) => {
        if (key !== "month" && typeof point[key] === "number") {
          actors.add(key);
        }
      });
    });
    return Array.from(actors).slice(0, 8);
  }, [monthlyReviewedTrend]);

  const totalActions = useMemo(() => leaderboard.reduce((sum, e) => sum + e.totalActions, 0), [leaderboard]);
  const activeEditors = useMemo(() => leaderboard.filter((e) => e.totalActions > 0).length, [leaderboard]);
  const inactiveEditors = OFFICIAL_EDITOR_HANDLES.length - activeEditors;
  const avgResponseDays = useMemo(() => {
    const medians = leaderboard.map(e => e.medianResponseDays).filter((d): d is number => d !== null);
    if (medians.length === 0) return null;
    return medians.reduce((a, b) => a + b, 0) / medians.length;
  }, [leaderboard]);

  const concentrationTop3Pct = useMemo(() => {
    if (totalActions === 0) return 0;
    const top3 = [...leaderboard]
      .sort((a, b) => b.totalActions - a.totalActions)
      .slice(0, 3)
      .reduce((sum, row) => sum + row.totalActions, 0);
    return (top3 / totalActions) * 100;
  }, [leaderboard, totalActions]);

  const thinCoverageCategories = useMemo(
    () => categoryData.filter((entry) => entry.count <= 1).map((entry) => entry.category),
    [categoryData],
  );

  const inactiveEditorList = useMemo(
    () => leaderboard.filter((row) => row.totalActions === 0).map((row) => row.actor),
    [leaderboard],
  );

  const activityRepoOptions = useMemo(() => {
    const repos = Array.from(new Set(editorActionDetails.map((row) => row.repoShort))).sort();
    return repos;
  }, [editorActionDetails]);

  const activityEditorOptions = useMemo(() => {
    const editors = Array.from(new Set(editorActionDetails.map((row) => row.actor))).sort((a, b) => a.localeCompare(b));
    return editors;
  }, [editorActionDetails]);

  const activityActionOptions = useMemo(() => {
    const actions = Array.from(new Set(editorActionDetails.map((row) => row.eventType.toLowerCase()))).sort((a, b) =>
      a.localeCompare(b)
    );
    return actions;
  }, [editorActionDetails]);

  const filteredActivityFeed = useMemo(() => {
    return editorActionDetails.filter((row) => {
      const repoOk = activityRepoFilter === "all" || row.repoShort === activityRepoFilter;
      const editorOk = activityEditorFilter === "all" || row.actor === activityEditorFilter;
      const actionOk = activityActionFilter === "all" || row.eventType.toLowerCase() === activityActionFilter;
      return repoOk && editorOk && actionOk;
    });
  }, [editorActionDetails, activityRepoFilter, activityEditorFilter, activityActionFilter]);

  const visibleActivityFeed = useMemo(
    () => filteredActivityFeed.slice(0, visibleActivityCount),
    [filteredActivityFeed, visibleActivityCount]
  );

  const hasMoreActivities = visibleActivityCount < filteredActivityFeed.length;

  const toggleActivityDetails = useCallback((key: string) => {
    setExpandedActivityKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const formatEventLabel = useCallback((eventType: string) => {
    const normalized = eventType.toLowerCase();
    if (normalized === "reviewed") return "reviewed";
    if (normalized === "commented") return "commented";
    if (normalized === "opened") return "opened PR";
    if (normalized === "closed") return "closed PR";
    if (normalized === "committed") return "committed";
    if (normalized === "merged") return "merged PR";
    return eventType;
  }, []);

  const getActionBadgeClass = useCallback((eventType: string) => {
    const normalized = eventType.toLowerCase();
    if (normalized === "reviewed") return "border-emerald-500/35 bg-emerald-500/12 text-emerald-300";
    if (normalized === "commented") return "border-cyan-500/35 bg-cyan-500/12 text-cyan-300";
    if (normalized === "committed") return "border-blue-500/35 bg-blue-500/12 text-blue-300";
    if (normalized === "opened") return "border-violet-500/35 bg-violet-500/12 text-violet-300";
    if (normalized === "closed") return "border-rose-500/35 bg-rose-500/12 text-rose-300";
    if (normalized === "merged") return "border-amber-500/35 bg-amber-500/12 text-amber-300";
    if (normalized === "reopened") return "border-orange-500/35 bg-orange-500/12 text-orange-300";
    return "border-border/60 bg-muted/40 text-foreground/85";
  }, []);

  const formatActivityTime = useCallback((actedAt: string) => {
    const parsed = new Date(actedAt.includes("T") ? actedAt : `${actedAt.replace(" ", "T")}Z`);
    if (Number.isNaN(parsed.getTime())) return actedAt;
    return parsed.toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC",
    });
  }, []);

  const trendOption = useMemo(() => ({
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      formatter: (params: Array<any>) => {
        if (!Array.isArray(params)) return "";
        const title = params[0]?.axisValue || "";
        const items = params
          .map(
            (p) =>
              `<div style="color: ${p.color}; padding: 2px 0;"><strong>${p.seriesName}</strong>: ${p.value.toLocaleString()}</div>`
          )
          .join("");
        return `<div style="padding: 6px;"><div style="margin-bottom: 4px; font-weight: 600;">${title}</div>${items}</div>`;
      },
    },
    legend: {
      top: 0,
      textStyle: { color: "var(--muted-foreground)", fontSize: 11, fontWeight: 500 },
      type: "scroll",
    },
    grid: { top: 36, left: 28, right: 20, bottom: 28 },
    xAxis: {
      type: "category",
      data: monthlyTrend.map((m) => m.month),
      axisLabel: { color: "var(--muted-foreground)", fontSize: 11, fontWeight: 500 },
      axisLine: { lineStyle: { color: "rgba(148,163,184,0.25)" } },
      splitLine: { show: true, lineStyle: { color: "rgba(148,163,184,0.12)", type: "dashed" } },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "var(--muted-foreground)", fontSize: 11, fontWeight: 500 },
      splitLine: { lineStyle: { color: "rgba(148,163,184,0.2)", type: "dashed" } },
    },
    series: trendActors.map((actor, idx) => ({
      name: actor,
      type: "line",
      smooth: false,
      symbol: "circle",
      symbolSize: 4,
      lineStyle: { width: 2, color: `hsl(${(idx * 360) / Math.max(trendActors.length, 1)}, 70%, 55%)` },
      itemStyle: { color: `hsl(${(idx * 360) / Math.max(trendActors.length, 1)}, 70%, 55%)` },
      areaStyle: {
        color: `hsl(${(idx * 360) / Math.max(trendActors.length, 1)}, 70%, 55%, 0.08)`,
      },
      data: monthlyTrend.map((p) => Number(p[actor] || 0)),
    })),
  }), [monthlyTrend, trendActors]);

  const reviewedTrendOption = useMemo(() => ({
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      formatter: (params: Array<any>) => {
        if (!Array.isArray(params)) return "";
        const title = params[0]?.axisValue || "";
        const items = params
          .map(
            (p) =>
              `<div style="color: ${p.color}; padding: 2px 0;"><strong>${p.seriesName}</strong>: ${p.value.toLocaleString()}</div>`
          )
          .join("");
        return `<div style="padding: 6px;"><div style="margin-bottom: 4px; font-weight: 600;">${title}</div>${items}</div>`;
      },
    },
    legend: {
      top: 0,
      textStyle: { color: "var(--muted-foreground)", fontSize: 11, fontWeight: 500 },
      type: "scroll",
    },
    grid: { top: 36, left: 28, right: 20, bottom: 28 },
    xAxis: {
      type: "category",
      data: monthlyReviewedTrend.map((m) => m.month),
      axisLabel: { color: "var(--muted-foreground)", fontSize: 11, fontWeight: 500 },
      axisLine: { lineStyle: { color: "rgba(148,163,184,0.25)" } },
      splitLine: { show: true, lineStyle: { color: "rgba(148,163,184,0.12)", type: "dashed" } },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "var(--muted-foreground)", fontSize: 11, fontWeight: 500 },
      splitLine: { lineStyle: { color: "rgba(148,163,184,0.2)", type: "dashed" } },
    },
    series: reviewedTrendActors.map((actor, idx) => ({
      name: actor,
      type: "line",
      smooth: false,
      symbol: "circle",
      symbolSize: 4,
      lineStyle: { width: 2, color: `hsl(${(idx * 360) / Math.max(reviewedTrendActors.length, 1)}, 70%, 55%)` },
      itemStyle: { color: `hsl(${(idx * 360) / Math.max(reviewedTrendActors.length, 1)}, 70%, 55%)` },
      areaStyle: {
        color: `hsl(${(idx * 360) / Math.max(reviewedTrendActors.length, 1)}, 70%, 55%, 0.08)`,
      },
      data: monthlyReviewedTrend.map((p) => Number(p[actor] || 0)),
    })),
  }), [monthlyReviewedTrend, reviewedTrendActors]);

  const trendMetricMeta = useCallback((metric: "actions" | "reviews") => {
    if (metric === "reviews") {
      return {
        title: "PRs Reviewed (Monthly)",
        subtitle: "Monthly distinct PRs with review events by each editor.",
        footer: "Counts distinct PRs with review events, not total comments.",
        option: reviewedTrendOption,
      };
    }
    return {
      title: "Editor Actions Over Time",
      subtitle: "Monthly count of all editor actions (reviews, comments, labels, updates).",
      footer: "Shows monthly total editor actions, not cumulative totals.",
      option: trendOption,
    };
  }, [reviewedTrendOption, trendOption]);

  const categoryOption = useMemo(() => ({
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: Array<any>) => {
        if (!Array.isArray(params) || !params[0]) return "";
        const dataIndex = params[0].dataIndex;
        const category = categoryData[dataIndex];
        if (!category) return "";
        return `<div style="padding: 6px;"><div style="font-weight: 600; margin-bottom: 4px; font-size: 12px;">${category.category}</div><div style="font-size: 11px; color: var(--muted-foreground);">Coverage: <strong style="color: var(--foreground);">${category.count.toLocaleString()}</strong> editors</div></div>`;
      },
    },
    grid: { top: 16, left: 90, right: 18, bottom: 24 },
    xAxis: {
      type: "value",
      axisLabel: { color: "var(--muted-foreground)", fontSize: 11, fontWeight: 500 },
      splitLine: { lineStyle: { color: "rgba(148,163,184,0.15)", type: "dashed" } },
    },
    yAxis: {
      type: "category",
      data: categoryData.map((c) => c.category),
      axisLabel: { color: "var(--muted-foreground)", fontSize: 11, fontWeight: 500 },
      axisLine: { lineStyle: { color: "rgba(148,163,184,0.25)" } },
    },
    series: [
      {
        type: "bar",
        data: categoryData.map((entry) => ({
          value: entry.count,
          itemStyle: { color: categoryColors[entry.category.toLowerCase()] || "#94a3b8", borderRadius: [0, 8, 8, 0] },
        })),
      },
    ],
  }), [categoryData]);

  const coverageMatrixOption = useMemo(() => {
    const categories = categoryData.map((c) => c.category);
    const editors = OFFICIAL_EDITOR_HANDLES;
    const points: [number, number, number][] = [];
    editors.forEach((editor, rowIndex) => {
      categories.forEach((category, colIndex) => {
        const isCovered = (categoriesByActor[editor] || []).includes(category) ? 1 : 0;
        points.push([colIndex, rowIndex, isCovered]);
      });
    });

    return {
      backgroundColor: "transparent",
      tooltip: {
        formatter: (params: { data: [number, number, number] }) => {
          const [x, y, value] = params.data;
          return `${editors[y]} × ${categories[x]}: ${value ? "Covered" : "Not covered"}`;
        },
      },
      grid: { top: 12, left: 110, right: 16, bottom: 40 },
      xAxis: {
        type: "category",
        data: categories,
        axisLabel: { color: "var(--muted-foreground)", fontSize: 10, interval: 0, rotate: 20 },
        axisLine: { lineStyle: { color: "rgba(148,163,184,0.25)" } },
      },
      yAxis: {
        type: "category",
        data: editors,
        axisLabel: { color: "var(--muted-foreground)", fontSize: 10 },
        axisLine: { lineStyle: { color: "rgba(148,163,184,0.25)" } },
      },
      visualMap: {
        show: false,
        min: 0,
        max: 1,
        inRange: {
          color: ["rgba(148,163,184,0.12)", "rgba(34,211,238,0.75)"],
        },
      },
      series: [
        {
          type: "heatmap",
          data: points,
          itemStyle: {
            borderColor: "rgba(148,163,184,0.22)",
            borderWidth: 1,
            borderRadius: 4,
          },
          label: {
            show: false,
          },
        },
      ],
    };
  }, [categoriesByActor, categoryData]);

  const repoOption = useMemo(() => ({
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      formatter: (params: any) => {
        if (!params) return "";
        const pct = ((params.value / repoCards.reduce((s, r) => s + r.count, 0)) * 100).toFixed(1);
        return `<div style="padding: 6px;"><div style="font-weight: 600; margin-bottom: 4px;">${params.name}</div><div style="font-size: 11px; color: var(--muted-foreground);">Count: <strong style="color: var(--foreground);">${params.value.toLocaleString()}</strong></div><div style="font-size: 11px; color: var(--muted-foreground);">Share: <strong style="color: var(--foreground);">${pct}%</strong></div></div>`;
      },
    },
    legend: {
      orient: "vertical",
      right: 8,
      top: "middle",
      textStyle: { color: "var(--muted-foreground)", fontSize: 11, fontWeight: 500 },
      itemGap: 8,
    },
    series: [
      {
        type: "pie",
        radius: ["52%", "72%"],
        center: ["34%", "50%"],
        label: { show: false },
        data: repoCards.map((r) => ({
          name: r.name,
          value: r.count,
          itemStyle: { color: r.color },
        })),
        itemStyle: { borderColor: "rgba(2,6,23,0.4)", borderWidth: 2 },
      },
    ],
    title: [
      {
        text: repoCards.reduce((s, r) => s + r.count, 0).toLocaleString(),
        subtext: "Total",
        left: "34%",
        top: "45%",
        textAlign: "center",
        textStyle: { color: "var(--foreground)", fontSize: 28, fontWeight: 700 },
        subtextStyle: { color: "var(--muted-foreground)", fontSize: 11 },
      },
    ],
  }), [repoCards]);

  const dailyActivityOption = useMemo(() => {
    const dates = Array.from(new Set(dailyActivityStacked.map((item) => item.date))).sort();
    const actorTotals: Record<string, number> = {};
    dailyActivityStacked.forEach((row) => {
      actorTotals[row.actor] = (actorTotals[row.actor] || 0) + row.count;
    });
    const actors = Object.entries(actorTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([actor]) => actor);

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: Array<any>) => {
          if (!Array.isArray(params)) return "";
          const date = params[0]?.axisValue || "";
          const items = params
            .filter((p) => p.value > 0)
            .map(
              (p) =>
                `<div style="color: ${p.color}; padding: 2px 0;"><strong>${p.seriesName}</strong>: ${p.value.toLocaleString()}</div>`
            )
            .join("");
          const total = params.reduce((sum, p) => sum + (p.value || 0), 0);
          return `<div style="padding: 6px;"><div style="margin-bottom: 4px; font-weight: 600;">${date}</div>${items}<div style="margin-top: 4px; padding-top: 4px; border-top: 1px solid rgba(255,255,255,0.2); color: var(--foreground); font-weight: 600;">Total: ${total.toLocaleString()}</div></div>`;
        },
      },
      legend: {
        top: 0,
        type: "scroll",
        textStyle: { color: "var(--muted-foreground)", fontSize: 11, fontWeight: 500 },
      },
      grid: { top: 40, left: 28, right: 20, bottom: 46 },
      xAxis: {
        type: "category",
        data: dates,
        axisLabel: { color: "var(--muted-foreground)", fontSize: 10, hideOverlap: true, fontWeight: 500 },
        axisLine: { lineStyle: { color: "rgba(148,163,184,0.25)" } },
        splitLine: { show: true, lineStyle: { color: "rgba(148,163,184,0.12)", type: "dashed" } },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: "var(--muted-foreground)", fontSize: 11, fontWeight: 500 },
        splitLine: { lineStyle: { color: "rgba(148,163,184,0.2)", type: "dashed" } },
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
      series: actors.map((actor, idx) => ({
        name: actor,
        type: "bar",
        stack: "editors",
        data: dates.map((date) => {
          const row = dailyActivityStacked.find((item) => item.date === date && item.actor === actor);
          return row?.count ?? 0;
        }),
        itemStyle: {
          color: `hsl(${(idx * 360) / Math.max(actors.length, 1)}, 70%, 55%)`,
        },
      })),
    };
  }, [dailyActivityStacked]);

  const leaderboardHeroOption = useMemo(() => {
    const palette = [
      "#79d2e8",
      "#8b7dff",
      "#ff8a80",
      "#7ea8ff",
      "#6f9bff",
      "#ffd166",
      "#ff9f68",
      "#b794f4",
      "#4fd1c5",
      "#f687b3",
      "#90cdf4",
      "#c6f6d5",
    ];
    const ordered = [...leaderboardHeroRows].reverse();
    const maxValue = Math.max(1, ...leaderboardHeroRows.map((row) => row.totalActions));

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: Array<{ dataIndex: number }>) => {
          const idx = params?.[0]?.dataIndex ?? 0;
          const row = ordered[idx];
          if (!row) return "";
          return `<div style="padding: 8px;">
            <div style="font-weight: 600; margin-bottom: 6px; font-size: 13px;">${row.actor}</div>
            <div style="padding: 2px 0; font-size: 11px;"><span style="color: var(--muted-foreground);">Actions:</span> <strong>${row.totalActions.toLocaleString()}</strong></div>
            <div style="padding: 2px 0; font-size: 11px;"><span style="color: var(--muted-foreground);">PRs touched:</span> <strong>${row.prsTouched.toLocaleString()}</strong></div>
            <div style="padding: 2px 0; font-size: 11px;"><span style="color: var(--muted-foreground);">Reviews:</span> <strong>${row.reviews.toLocaleString()}</strong></div>
            <div style="padding: 2px 0; font-size: 11px;"><span style="color: var(--muted-foreground);">Comments:</span> <strong>${row.comments.toLocaleString()}</strong></div>
          </div>`;
        },
      },
      grid: { top: 8, left: 120, right: 100, bottom: 8, containLabel: true },
      xAxis: {
        type: "value",
        max: Math.ceil(maxValue * 1.15),
        axisLabel: { color: "var(--muted-foreground)", fontSize: 11, fontWeight: 500 },
        splitLine: { lineStyle: { color: "rgba(148,163,184,0.15)" } },
        axisLine: { lineStyle: { color: "rgba(148,163,184,0.25)" } },
      },
      yAxis: {
        type: "category",
        data: ordered.map((row) => row.actor),
        axisLabel: { color: "var(--foreground)", fontSize: 11, width: 110, overflow: "truncate", fontWeight: 500 },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      series: [
        {
          type: "bar",
          barWidth: 20,
          data: ordered.map((row, index) => ({
            value: row.totalActions,
            itemStyle: {
              color: palette[(ordered.length - 1 - index) % palette.length],
              borderRadius: [0, 4, 4, 0],
            },
          })),
          label: {
            show: true,
            position: "insideRight",
            color: "var(--foreground)",
            fontWeight: 700,
            fontSize: 11,
            formatter: ({ value }: { value: number }) => Number(value).toLocaleString(),
          },
          markPoint: {
            symbolKeepAspect: true,
            label: { show: false },
            data: ordered.map((row) => ({
              coord: [row.totalActions + maxValue * 0.045, row.actor],
              symbol: `image://${getGitHubAvatarUrl(row.actor)}`,
              symbolSize: 24,
            })),
          },
        },
      ],
    };
  }, [leaderboardHeroRows]);

  const downloadTrendReport = useCallback(() => {
    const headers = ["Month", ...trendActors];
    const rows = monthlyTrend.map((row) => [row.month, ...trendActors.map((actor) => Number(row[actor] || 0))]);
    downloadCsv(`editors-activity-over-time-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }, [monthlyTrend, trendActors]);

  const downloadReviewedMonthlyReport = useCallback(() => {
    const headers = ["Month", ...reviewedTrendActors];
    const rows = monthlyReviewedTrend.map((row) => [row.month, ...reviewedTrendActors.map((actor) => Number(row[actor] || 0))]);
    downloadCsv(`editors-prs-reviewed-monthly-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }, [monthlyReviewedTrend, reviewedTrendActors]);

  const downloadCoverageReport = useCallback(() => {
    const headers = ["Category", "Covered Editors", "Editors"];
    const rows = categoryData.map((entry) => [entry.category, entry.count, entry.actors.join(" | ")]);
    downloadCsv(`editors-category-coverage-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }, [categoryData]);

  const downloadDailyActivityReport = useCallback(() => {
    const dates = Array.from(new Set(dailyActivityStacked.map((item) => item.date))).sort();
    const actors = Array.from(new Set(dailyActivityStacked.map((item) => item.actor))).sort((a, b) => a.localeCompare(b));
    const headers = ["Date", ...actors];
    const rows = dates.map((date) => [
      date,
      ...actors.map((actor) => {
        const row = dailyActivityStacked.find((item) => item.date === date && item.actor === actor);
        return row?.count ?? 0;
      }),
    ]);
    downloadCsv(`editors-daily-activity-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }, [dailyActivityStacked]);

  const downloadRepoDistributionReport = useCallback(() => {
    const headers = ["Editor", "Repository", "Count", "Percent"];
    const rows = repoDistribution.map((row) => [row.actor, row.repo, row.count, row.pct]);
    downloadCsv(`editors-repo-distribution-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }, [repoDistribution]);

  // Export functionality
  useAnalyticsExport(() => {
    const combined: Record<string, unknown>[] = [];
    
    // Leaderboard data
    leaderboard.forEach(e => {
      combined.push({
        type: 'Leaderboard',
        editor: e.actor,
        totalActions: e.totalActions,
        totalReviews: e.reviews,
        totalComments: e.comments,
        prsTouched: e.prsTouched,
        medianResponseDays: e.medianResponseDays,
      });
    });
    
    // Category coverage
    categoryCoverage.forEach(c => {
      combined.push({
        type: 'Category Coverage',
        category: c.category,
        editorCount: c.actors.length,
        editors: c.actors.join(', '),
      });
    });
    
    // Repo distribution
    repoDistribution.forEach(r => {
      combined.push({
        type: 'Repo Distribution',
        editor: r.actor,
        repo: r.repo,
        count: r.count,
        pct: r.pct,
      });
    });
    
    return combined;
  }, `editors-analytics-${repoFilter}-${timeRange}`);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-border/70 bg-card/60 py-16 backdrop-blur-sm">
          <InlineBrandLoader size="md" label="Loading analytics..." />
        </div>
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

      <section id="editor-leaderboard-hero" className="space-y-4 border-b border-border/70 pb-8">
        <div>
          <div className="inline-flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Editors - {leaderboardLabel}</h2>
            <CopyLinkButton sectionId="editor-leaderboard-hero" className="h-8 w-8 rounded-md border border-border bg-muted/60 hover:border-primary/40 hover:bg-primary/10" />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">Ranked by actions with PR coverage context.</p>
        </div>
        <div className="rounded-xl border border-border bg-card/60 p-4 backdrop-blur-sm sm:p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/60 p-1">
            <button
              onClick={() => setLeaderboardHeroView("list")}
              title="List view"
              className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 transition-colors font-medium text-sm ${
                leaderboardHeroView === "list"
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <List className="h-4 w-4" />
              List
            </button>
            <button
              onClick={() => setLeaderboardHeroView("chart")}
              title="Chart view"
              className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 transition-colors font-medium text-sm ${
                leaderboardHeroView === "chart"
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <BarChart4 className="h-4 w-4" />
              Chart
            </button>
          </div>
          <button
            onClick={downloadLeaderboardCSV}
            disabled={exporting || leaderboard.length === 0}
            className="flex h-8 items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2.5 text-xs text-primary transition-colors hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Download CSV
          </button>
        </div>

        {leaderboardHeroView === "chart" ? (
          leaderboardHeroRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-border/70 border-dashed bg-muted/30 py-8">
              <BarChart3 className="mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No leaderboard data found for the current filters.</p>
            </div>
          ) : (
            <div className="h-[460px] w-full rounded-lg border border-border/70 bg-background/35 p-2">
              <ReactECharts option={leaderboardHeroOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} notMerge />
            </div>
          )
        ) : (
          <div className="space-y-2.5">
            {leaderboardHeroRows.map((editor, index) => (
              <div
                key={`top-leaderboard-${editor.actor}`}
                className="flex items-center justify-between rounded-lg border border-border/60 bg-background/35 px-3 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={getGitHubAvatarUrl(editor.actor)}
                    alt={`${editor.actor} avatar`}
                    className="h-8 w-8 rounded-full border border-border object-cover"
                    loading="lazy"
                  />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      #{index + 1} {editor.actor}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {editor.totalActions.toLocaleString()} actions · {editor.prsTouched.toLocaleString()} PRs touched
                    </p>
                  </div>
                </div>
                <p className="text-lg font-semibold tabular-nums text-foreground">{editor.totalActions.toLocaleString()}</p>
              </div>
            ))}
            {leaderboardHeroRows.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-lg border border-border/70 border-dashed bg-muted/30 py-8">
                <Users className="mb-2 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No leaderboard data found for the current filters.</p>
              </div>
            )}
          </div>
        )}
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>EIPsInsight.com</span>
          <LastUpdated timestamp={dataUpdatedAt} className="text-xs" />
        </div>
        </div>
      </section>

      <section id="editor-snapshot" className="space-y-4 border-b border-border/70 pb-8">
        <div>
          <div className="inline-flex items-center gap-2">
            <LineChart className="h-5 w-5 text-primary" />
            <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Editor Snapshot</h2>
            <CopyLinkButton sectionId="editor-snapshot" className="h-8 w-8 rounded-md border border-border bg-muted/60 hover:border-primary/40 hover:bg-primary/10" />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">Coverage, participation, and response metrics in this scope.</p>
        </div>
      <div className="rounded-xl border border-border/70 bg-card/60 p-4 backdrop-blur-sm shadow-sm sm:p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-border/60 bg-background/35 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Official Editors</p>
                <p className="text-3xl font-semibold text-foreground tabular-nums">{OFFICIAL_EDITOR_HANDLES.length}</p>
              </div>
              <div className="rounded-full bg-primary/10 p-2.5">
                <UserCheck className="h-5 w-5 text-primary" />
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/35 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Active This Scope</p>
                <p className="text-3xl font-semibold text-foreground tabular-nums">{activeEditors}</p>
              </div>
              <div className="rounded-full bg-primary/10 p-2.5">
                <UserCheck className="h-5 w-5 text-primary" />
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/35 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Total Actions</p>
                <p className="text-3xl font-semibold text-foreground tabular-nums">{totalActions.toLocaleString()}</p>
              </div>
              <div className="rounded-full bg-primary/10 p-2.5">
                <FileText className="h-5 w-5 text-primary" />
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/35 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Avg Response Time</p>
                <p className="text-3xl font-semibold text-foreground tabular-nums">{avgResponseDays != null ? `${Math.round(avgResponseDays)}d` : "–"}</p>
              </div>
              <div className="rounded-full bg-primary/10 p-2.5">
                <Clock className="h-5 w-5 text-primary" />
              </div>
            </div>
          </div>
        </div>
        <div className="mt-3 rounded-lg border border-border/60 bg-background/35 px-4 py-2.5 text-sm text-foreground">
          Coverage risk: {thinCoverageCategories.length} thin categories
          <span className="mx-2 text-muted-foreground">·</span>
          Top 3 editors: {concentrationTop3Pct.toFixed(1)}% of actions
          <span className="mx-2 text-muted-foreground">·</span>
          Inactive editors: {inactiveEditorList.length}
        </div>
      </div>
      </section>

      <section id="editor-trends" className="space-y-4 border-b border-border/70 pb-8">
        <div>
          <div className="inline-flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Editorial Trends</h2>
            <CopyLinkButton sectionId="editor-trends" className="h-8 w-8 rounded-md border border-border bg-muted/60 hover:border-primary/40 hover:bg-primary/10" />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{trendMetricMeta(trendPrimaryMetric).subtitle}</p>
        </div>
      <div className="rounded-xl border border-border/70 bg-card/60 p-5 backdrop-blur-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{trendMetricMeta(trendPrimaryMetric).title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/30 p-1">
              <button
                type="button"
                onClick={() => setTrendPrimaryMetric("actions")}
                title="Show all actions"
                className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                  trendPrimaryMetric === "actions"
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Activity className="h-3.5 w-3.5" />
                All Actions
              </button>
              <button
                type="button"
                onClick={() => setTrendPrimaryMetric("reviews")}
                title="Show reviewed PRs only"
                className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                  trendPrimaryMetric === "reviews"
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                Reviewed PRs
              </button>
            </div>
            <button onClick={downloadTrendReport} title="Download trend report" className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/15">
              <Download className="h-4 w-4" />
              Export Data
            </button>
          </div>
        </div>
        <div className="relative h-72 w-full">
          <ReactECharts option={trendMetricMeta(trendPrimaryMetric).option} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} notMerge />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-semibold text-foreground/10">EIPsInsight.com</span>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{trendMetricMeta(trendPrimaryMetric).footer}</p>
          <LastUpdated timestamp={dataUpdatedAt} className="text-xs" />
        </div>
      </div>
      </section>

      <section id="top-active-editors" className="space-y-4 border-b border-border/70 pb-8">
        <div>
          <div className="inline-flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Top Active Editors</h2>
            <CopyLinkButton sectionId="top-active-editors" className="h-8 w-8 rounded-md border border-border bg-muted/60 hover:border-primary/40 hover:bg-primary/10" />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">Most active official editors for the selected scope.</p>
        </div>
      <div className="rounded-xl border border-border/70 bg-card/60 p-5 backdrop-blur-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {topEditorCards.map((editor) => {
            const categories = (categoriesByActor[editor.actor] || []).slice(0, 2);
            const repos = (reposByActor[editor.actor] || []).slice(0, 2);
            const isActive = editor.totalActions > 0;
            return (
              <div key={editor.actor} className="rounded-lg border border-border/60 bg-background/35 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={getGitHubAvatarUrl(editor.actor)}
                      alt={`${editor.actor} avatar`}
                      className="h-10 w-10 rounded-full border border-border object-cover"
                      loading="lazy"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-foreground">{editor.actor}</p>
                        {editor.actor === "abcoathup" && (
                          <span className="rounded-full border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-primary">
                            Associate
                          </span>
                        )}
                      </div>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${isActive ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-border bg-muted/40 text-muted-foreground"}`}>
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-semibold tabular-nums text-foreground">{editor.totalActions}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">actions</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                  <div className="rounded-md border border-border/50 bg-muted/30 px-2 py-1">
                    <p className="text-muted-foreground">Reviews</p>
                    <p className="font-medium text-foreground tabular-nums">{editor.reviews}</p>
                  </div>
                  <div className="rounded-md border border-border/50 bg-muted/30 px-2 py-1">
                    <p className="text-muted-foreground">PRs</p>
                    <p className="font-medium text-foreground tabular-nums">{editor.prsTouched}</p>
                  </div>
                  <div className="rounded-md border border-border/50 bg-muted/30 px-2 py-1">
                    <p className="text-muted-foreground">Resp.</p>
                    <p className="font-medium text-foreground tabular-nums">{editor.medianResponseDays != null ? `${Math.round(editor.medianResponseDays)}d` : "–"}</p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {categories.map((category) => (
                    <span key={`${editor.actor}-${category}`} className="rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-[10px] text-foreground/85">
                      {category}
                    </span>
                  ))}
                  {repos.map((repo) => (
                    <span key={`${editor.actor}-${repo}`} className="rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                      {repo}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
          {topEditorCards.length === 0 && (
            <p className="text-sm text-muted-foreground">No active editors found in current scope.</p>
          )}
        </div>
      </div>
      </section>

      <section id="editor-category-coverage" className="space-y-4 border-b border-border/70 pb-8">
        <div>
          <div className="inline-flex items-center gap-2">
            <Grid3x3 className="h-5 w-5 text-primary" />
            <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Category Coverage</h2>
            <CopyLinkButton sectionId="editor-category-coverage" className="h-8 w-8 rounded-md border border-border bg-muted/60 hover:border-primary/40 hover:bg-primary/10" />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">Who covers what and where concentration risk appears.</p>
        </div>
      <div className="rounded-xl border border-border/70 bg-card/60 p-5 backdrop-blur-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Coverage Matrix</h3>
          </div>
          <button onClick={downloadCoverageReport} className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs text-foreground/85 hover:bg-muted/60">
            <Download className="h-3.5 w-3.5" />
            Download Reports
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="relative h-80 w-full rounded-lg border border-border/60 bg-background/30 p-2">
              <ReactECharts option={coverageMatrixOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} notMerge />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-semibold text-foreground/10">EIPsInsight.com</span>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md border border-border/60 bg-background/35 p-2.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Covered</p>
                <p className="text-lg font-semibold text-foreground tabular-nums">{categoryData.length}</p>
              </div>
              <div className="rounded-md border border-border/60 bg-background/35 p-2.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Thin</p>
                <p className="text-lg font-semibold text-foreground tabular-nums">{thinCoverageCategories.length}</p>
              </div>
            </div>
            <div className="rounded-md border border-border/60 bg-background/35 p-2.5 text-xs text-muted-foreground">
              Thin categories: {thinCoverageCategories.length ? thinCoverageCategories.join(", ") : "None"}
            </div>
            <div className="relative h-56 w-full rounded-md border border-border/60 bg-background/30 p-1">
              <ReactECharts option={categoryOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} notMerge />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-semibold text-foreground/10">EIPsInsight.com</span>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Includes category-level ownership and concentration signals.</p>
          <LastUpdated timestamp={dataUpdatedAt} className="text-xs" />
        </div>
      </div>
      </section>

      {/* Editor Directory */}
      <section id="editor-activity-directory" className="space-y-4 border-b border-border/70 pb-8">
        <div>
          <div className="inline-flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Editor Activity Directory</h2>
            <CopyLinkButton sectionId="editor-activity-directory" className="h-8 w-8 rounded-md border border-border bg-muted/60 hover:border-primary/40 hover:bg-primary/10" />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">Who is doing the work in this scope.</p>
        </div>
      <div className="rounded-xl border border-border/70 bg-card/60 p-5 backdrop-blur-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h3 className="text-xl font-semibold text-foreground">
              Directory Table
              <span className="ml-2 text-sm font-normal text-muted-foreground">— {leaderboardLabel}</span>
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="leaderboard-scope" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Time Period</label>
              <select
                id="leaderboard-scope"
                value={leaderboardMode}
                onChange={(e) => setLeaderboardMode(e.target.value as "all" | "monthly" | "range")}
                className="h-9 rounded-md border border-border/60 bg-background px-3 text-xs text-foreground transition-colors hover:border-border focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/30"
                aria-label="Select leaderboard scope"
              >
                <option value="all">All-time</option>
                <option value="monthly">Monthly</option>
                <option value="range">Use dashboard range</option>
              </select>
            </div>
            {leaderboardMode === "monthly" && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="leaderboard-year" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Year</label>
                  <select
                    id="leaderboard-year"
                    value={leaderboardYear}
                    onChange={(e) => setLeaderboardYear(Number(e.target.value))}
                    className="h-9 rounded-md border border-border/60 bg-background px-3 text-xs text-foreground transition-colors hover:border-border focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/30"
                    aria-label="Select leaderboard year"
                  >
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="leaderboard-month" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Month</label>
                  <select
                    id="leaderboard-month"
                    value={leaderboardMonth}
                    onChange={(e) => setLeaderboardMonth(Number(e.target.value))}
                    className="h-9 rounded-md border border-border/60 bg-background px-3 text-xs text-foreground transition-colors hover:border-border focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/30"
                    aria-label="Select leaderboard month"
                  >
                    {MONTH_NAMES.map((month, index) => (
                      <option key={month} value={index + 1}>
                        {month}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <button
              onClick={downloadLeaderboardCSV}
              disabled={exporting || leaderboard.length === 0}
              title="Download leaderboard as CSV"
              className="flex h-9 items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary/10"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {exporting ? "Exporting..." : "Export CSV"}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/70 bg-muted/30 backdrop-blur-sm">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-foreground">Editor</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-foreground">Status</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-foreground">Actions</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-foreground">Reviews</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-foreground">PRs Touched</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-foreground">Mix</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-foreground">Report</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((editor) => {
                const categories = categoriesByActor[editor.actor] || [];
                const isActive = editor.totalActions > 0;
                const reviewsPct = editor.totalActions > 0 ? (editor.reviews / editor.totalActions) * 100 : 0;
                const commentsPct = editor.totalActions > 0 ? (editor.comments / editor.totalActions) * 100 : 0;
                const otherPct = Math.max(0, 100 - reviewsPct - commentsPct);
                return (
                <tr
                  key={editor.actor}
                  className="border-b border-border/60 hover:bg-primary/5 transition-colors duration-150"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <img
                        src={getGitHubAvatarUrl(editor.actor)}
                        alt={`${editor.actor} avatar`}
                        className="h-7 w-7 rounded-full border border-border object-cover"
                        loading="lazy"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-foreground/90">{editor.actor}</p>
                          {editor.actor === "abcoathup" && (
                            <span className="rounded-full border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-primary">
                              Associate
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {categories.length ? categories.slice(0, 3).join(", ") : "No categories"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 uppercase tracking-wide ${isActive ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-border bg-muted/40 text-muted-foreground"}`}>
                      {isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-foreground/85">
                    {editor.totalActions.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-foreground/85">
                    {editor.reviews.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-foreground/85">
                    {editor.prsTouched.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex h-2 w-28 overflow-hidden rounded-full border border-border/50 bg-muted/30">
                      <div className="h-full" style={{ width: `${reviewsPct}%`, backgroundColor: "hsl(200, 90%, 55%)" }} />
                      <div className="h-full" style={{ width: `${commentsPct}%`, backgroundColor: "hsl(280, 80%, 55%)" }} />
                      <div className="h-full" style={{ width: `${otherPct}%`, backgroundColor: "hsl(0, 0%, 70%)" }} />
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground tabular-nums">
                      R {reviewsPct.toFixed(0)}% · C {commentsPct.toFixed(0)}%
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => downloadEditorReport(editor.actor)}
                      disabled={downloadingEditor === editor.actor}
                      title="Download editor report as CSV"
                      className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary/10"
                    >
                      {downloadingEditor === editor.actor ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    </button>
                  </td>
                </tr>
              )})}
              {leaderboard.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8">
                    <div className="flex flex-col items-center justify-center">
                      <Activity className="mb-2 h-8 w-8 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">No editor data found for the current filters.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </section>

      {/* TEMPORARY: Operational Breakdown section hidden. REVERT: remove the `hidden` class below. */}
      {/* Daily + Repo */}
      <section id="editor-operations" className="hidden space-y-4 border-b border-border/70 pb-8">
        <div>
          <div className="inline-flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Operational Breakdown</h2>
            <CopyLinkButton sectionId="editor-operations" className="h-8 w-8 rounded-md border border-border bg-muted/60 hover:border-primary/40 hover:bg-primary/10" />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">Daily throughput and repository concentration.</p>
        </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-2 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Daily Editorial Activity</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Which editors drove activity day by day.</p>
            </div>
            <button onClick={downloadDailyActivityReport} title="Download daily activity report" className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15">
              <Download className="h-4 w-4" />
              Export Data
            </button>
          </div>
        <div className="rounded-lg border border-border/70 bg-card/60 p-4 backdrop-blur-sm">
          <div className="relative h-64 w-full">
            <ReactECharts option={dailyActivityOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} notMerge />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-semibold text-foreground/10">EIPsInsight.com</span>
            </div>
          </div>
          <AnalyticsAnnotation>
            Stacked bars show total actions per day, split by editor.
          </AnalyticsAnnotation>
          <div className="mt-2 flex justify-end">
            <LastUpdated timestamp={dataUpdatedAt} className="text-xs" />
          </div>
        </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Repo Distribution</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Where editor work is concentrated.</p>
            </div>
            <button onClick={downloadRepoDistributionReport} title="Download repository distribution report" className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15">
              <Download className="h-4 w-4" />
              Export Data
            </button>
          </div>
        <div className="rounded-lg border border-border/70 bg-card/60 p-4 backdrop-blur-sm">
          <div className="relative h-64 w-full">
            <ReactECharts option={repoOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} notMerge />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-semibold text-foreground/10">EIPsInsight.com</span>
            </div>
          </div>
          <div className="mt-2 flex justify-end">
            <LastUpdated timestamp={dataUpdatedAt} className="text-xs" />
          </div>
        </div>
        </div>
      </div>
      </section>

      <section id="editor-recent-activity" className="space-y-4 border-b border-border/70 pb-8">
        <div>
          <div className="inline-flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Recent Activities</h2>
            <CopyLinkButton sectionId="editor-recent-activity" className="h-8 w-8 rounded-md border border-border bg-muted/60 hover:border-primary/40 hover:bg-primary/10" />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">Live feed with repository/editor/action filters.</p>
        </div>
      <div className="rounded-xl border border-border/70 bg-card/60 backdrop-blur-sm">
        <div className="border-b border-border/70 px-5 py-4">
          <div className="mb-3 flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Filters</span>
            {(activityRepoFilter !== "all" || activityEditorFilter !== "all" || activityActionFilter !== "all") && (
              <button
                onClick={() => {
                  setActivityRepoFilter("all");
                  setActivityEditorFilter("all");
                  setActivityActionFilter("all");
                  setVisibleActivityCount(20);
                }}
                className="ml-auto inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                title="Clear all filters"
              >
                <X className="h-3.5 w-3.5" />
                Reset
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="repo-filter" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Repository</label>
              <select
                id="repo-filter"
                value={activityRepoFilter}
                onChange={(e) => {
                  setActivityRepoFilter(e.target.value);
                  setVisibleActivityCount(20);
                }}
                className="h-10 w-full rounded-md border border-border/60 bg-background px-3 text-sm text-foreground transition-colors hover:border-border focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/30"
                aria-label="Filter activity by repository"
              >
                <option value="all">All Repositories</option>
                {activityRepoOptions.map((repo) => (
                  <option key={repo} value={repo}>
                    {repo}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="editor-filter" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Editor</label>
              <select
                id="editor-filter"
                value={activityEditorFilter}
                onChange={(e) => {
                  setActivityEditorFilter(e.target.value);
                  setVisibleActivityCount(20);
                }}
                className="h-10 w-full rounded-md border border-border/60 bg-background px-3 text-sm text-foreground transition-colors hover:border-border focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/30"
                aria-label="Filter activity by editor"
              >
                <option value="all">All Editors</option>
                {activityEditorOptions.map((editor) => (
                  <option key={editor} value={editor}>
                    {editor}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="action-filter" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Action Type</label>
              <select
                id="action-filter"
                value={activityActionFilter}
                onChange={(e) => {
                  setActivityActionFilter(e.target.value);
                  setVisibleActivityCount(20);
                }}
                className="h-10 w-full rounded-md border border-border/60 bg-background px-3 text-sm text-foreground transition-colors hover:border-border focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/30"
                aria-label="Filter activity by action"
              >
                <option value="all">All Actions</option>
                {activityActionOptions.map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div>
          {visibleActivityFeed.map((row, idx) => {
            const key = `${row.actor}-${row.prNumber}-${row.actedAt}-${row.eventType}-${idx}`;
            const expanded = Boolean(expandedActivityKeys[key]);
            const eventLabel = formatEventLabel(row.eventType);
            return (
              <div key={key} className="border-b border-border/60 px-5 py-4 last:border-b-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-md border px-2 py-0.5 text-xs font-medium ${getActionBadgeClass(row.eventType)}`}
                      >
                        {eventLabel}
                      </span>
                      <span className="rounded-md border border-border/60 bg-background/60 px-2 py-0.5 text-xs text-muted-foreground">
                        {row.repoShort}
                      </span>
                      <span className="text-xs text-muted-foreground">{row.actor}</span>
                    </div>
                    {row.title && (
                      <p className="mt-2 text-base text-foreground/90">{row.title}</p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground tabular-nums">{formatActivityTime(row.actedAt)}</p>
                </div>
                <button
                  onClick={() => toggleActivityDetails(key)}
                  className="mt-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
                  Show Details
                </button>
                {expanded && (
                  <div className="mt-2 rounded-md border border-border/60 bg-background/40 px-3 py-2 text-sm text-muted-foreground">
                    <div className="flex flex-wrap items-center gap-3">
                      <span>Type: {row.eventType}</span>
                      <span>PR:</span>
                      <Link href={`/pr/${row.repoShort}/${row.prNumber}`} className="text-primary hover:underline">
                        #{row.prNumber}
                      </Link>
                      {row.eventUrl && (
                        <a
                          href={row.eventUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline"
                        >
                          GitHub event
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {visibleActivityFeed.length === 0 && (
            <div className="flex flex-col items-center justify-center px-5 py-8">
              <Zap className="mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No editor actions found for current filters.</p>
            </div>
          )}
        </div>
        {hasMoreActivities && (
          <div className="border-t border-border/60 px-5 py-4">
            <button
              onClick={() => setVisibleActivityCount((count) => count + 20)}
              title="Show 20 more activities"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
            >
              <ChevronDown className="h-4 w-4" />
              Show more ({filteredActivityFeed.length - visibleActivityCount} remaining)
            </button>
          </div>
        )}
      </div>
      </section>

      <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-2">
          <details className="group">
            <summary className="cursor-pointer rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs text-foreground/85 hover:bg-muted/60">
              Methodology
            </summary>
            <div className="mt-2 max-w-3xl rounded-md border border-border/60 bg-background/50 p-3 text-xs text-muted-foreground">
              Official editor handles only. Activity uses normalized PR event timestamps with late-ingest correction.
              Median response is measured from PR creation to first editor action in selected scope.
            </div>
          </details>
          <span className="rounded-md border border-border bg-background/60 px-2 py-1 text-xs text-muted-foreground">
            Scope: {leaderboardLabel}
          </span>
          <LastUpdated timestamp={dataUpdatedAt} prefix="Updated" showAbsolute className="bg-muted/40 text-xs" />
        </div>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border/70 rounded-lg p-6 max-w-md w-full mx-4 shadow-lg">
            <div className="flex items-start gap-3 mb-4">
              <Download className="h-6 w-6 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-foreground">Unlock CSV Export</h3>
                <p className="text-sm text-muted-foreground mt-1">Upgrade to Pro or Enterprise to download analytics data</p>
              </div>
            </div>

            <div className="bg-muted/60 rounded p-3 mb-4 text-sm text-foreground/85">
              <p className="font-medium text-foreground mb-2">Pro features include:</p>
              <ul className="space-y-1 text-xs">
                <li>✓ CSV exports for all analytics</li>
                <li>✓ 50,000 API requests/month</li>
                <li>✓ Advanced analytics dashboards</li>
                <li>✓ Priority support</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-border/60 text-foreground/85 hover:bg-muted/60 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <Link
                href="/pricing"
                className="flex-1 px-4 py-2 rounded-lg bg-amber-600 text-foreground hover:bg-amber-700 transition-colors text-sm font-medium text-center"
              >
                View Plans
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
