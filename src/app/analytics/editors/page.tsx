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
  Filter,
  X,
  BookOpen,
  Info
} from "lucide-react";
import { AnalyticsAnnotation } from "@/components/analytics/AnalyticsAnnotation";
import ReactECharts from "echarts-for-react";
import { LastUpdated } from "@/components/analytics/LastUpdated";
import { CopyLinkButton } from "@/components/header";

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
  rip: "#fb923c",
};

const repoColors: Record<string, string> = {
  "ethereum/EIPs": "#22d3ee",
  "ethereum/ERCs": "#60a5fa",
  "ethereum/RIPs": "#fb923c",
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

function getTimeWindow(
  timeRange: string,
  customFromMonth?: string,
  customToMonth?: string,
): { from: string | undefined; to: string | undefined } {
  if (timeRange === "all") {
    return { from: undefined, to: undefined };
  }
  if (timeRange === "custom") {
    const from = customFromMonth ? `${customFromMonth}-01` : undefined;
    
    let to: string | undefined = undefined;
    if (customToMonth) {
      const [yearStr, monthStr] = customToMonth.split("-");
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const date = new Date(year, month, 0); // Last day of month
      to = date.toISOString().split("T")[0];
    }
    
    return { from, to };
  }

  const now = new Date();
  const to = now.toISOString().split('T')[0];
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

// Spikes normalization helper removed to ensure raw database values are loaded in graphs

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
  const { timeRange, repoFilter, customFromMonth, customToMonth } = useAnalytics();
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
  const [trendPrimaryMetric, setTrendPrimaryMetric] = useState<"actions" | "reviews" | "other">("reviews");
  
  // Sorted metric filters
  const [selectedMetric, setSelectedMetric] = useState<"reviews" | "prs" | "actions">("reviews");

  // Breakdown tabs
  const [breakdownTab, setBreakdownTab] = useState<"repo" | "event" | "category">("repo");

  const repoParam = repoFilter === "all" ? undefined : repoFilter;
  const { from, to } = getTimeWindow(timeRange, customFromMonth, customToMonth);
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
    if (leaderboardMode === "all") return "All-Time Activity";
    if (leaderboardMode === "monthly") return `${MONTH_NAMES[leaderboardMonth - 1]} ${leaderboardYear}`;
    if (!leaderboardWindow.from && !leaderboardWindow.to) return "All-Time Contributions";
    return "Selected Dashboard Range";
  }, [leaderboardMode, leaderboardMonth, leaderboardYear, leaderboardWindow.from, leaderboardWindow.to]);

  const currentYear = new Date().getUTCFullYear();
  const yearOptions = useMemo(() => {
    return Array.from({ length: 8 }, (_, idx) => currentYear - idx);
  }, [currentYear]);

  // Adjust metric selection based on available monthly support keys
  useEffect(() => {
    if (leaderboardMode === "monthly" && selectedMetric === "reviews") {
      setSelectedMetric("actions");
    }
  }, [leaderboardMode, selectedMetric]);

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

  const handleQuickFilter = useCallback((actor: string, actionType: "all" | "reviewed" | "prs") => {
    setActivityEditorFilter(actor);
    if (actionType === "reviewed") {
      setActivityActionFilter("reviewed");
    } else {
      setActivityActionFilter("all");
    }
    setVisibleActivityCount(20);
    const element = document.getElementById("editor-recent-activity");
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  // Fetch subscription tier on mount
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
        setMonthlyTrend(trendData);
        setMonthlyReviewedTrend(reviewedTrendData);
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

  // Sorting logic based on selected Metric
  const sortedLeaderboard = useMemo(() => {
    return [...leaderboard].sort((a, b) => {
      if (selectedMetric === "reviews") return b.reviews - a.reviews;
      if (selectedMetric === "prs") return b.prsTouched - a.prsTouched;
      return b.totalActions - a.totalActions;
    });
  }, [leaderboard, selectedMetric]);

  const leaderboardHeroRows = useMemo(
    () => sortedLeaderboard.slice(0, 12),
    [sortedLeaderboard]
  );

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

  // Sleek Category coverage metrics
  const categoryData = useMemo(() => {
    const categories = categoryCoverage.map(c => c.category);
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
    return Array.from(actors).slice(0, 8);
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
  const thinCoverageCategories = useMemo(
    () => categoryData.filter((entry) => entry.count <= 1).map((entry) => entry.category),
    [categoryData]
  );
  const avgResponseDays = useMemo(() => {
    const medians = leaderboard.map(e => e.medianResponseDays).filter((d): d is number => d !== null);
    if (medians.length === 0) return null;
    return medians.reduce((a, b) => a + b, 0) / medians.length;
  }, [leaderboard]);

  const activityRepoOptions = useMemo(() => {
    return Array.from(new Set(editorActionDetails.map((row) => row.repoShort))).sort();
  }, [editorActionDetails]);

  const activityEditorOptions = useMemo(() => {
    return Array.from(new Set(editorActionDetails.map((row) => row.actor))).sort((a, b) => a.localeCompare(b));
  }, [editorActionDetails]);

  const activityActionOptions = useMemo(() => {
    return Array.from(new Set(editorActionDetails.map((row) => row.eventType.toLowerCase()))).sort((a, b) =>
      a.localeCompare(b)
    );
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

  // Compute action events frequency in the feed
  const activityFeedStats = useMemo(() => {
    const stats: Record<string, number> = {};
    filteredActivityFeed.forEach((row) => {
      const label = formatEventLabel(row.eventType);
      stats[label] = (stats[label] || 0) + 1;
    });
    return stats;
  }, [filteredActivityFeed, formatEventLabel]);

  // ─── ECharts Interactive Breakdown Configurations ──────────────────

  // Heuristic-based breakdown mapping: actual editor actions parsed into category buckets
  const categoryActionsData = useMemo(() => {
    const data: Array<{ category: string; actor: string; count: number; repo: string }> = [];
    
    const normalizeCategory = (cat: string) => {
      const c = cat.trim().toUpperCase();
      if (c === "ERC") return "ERC";
      if (c === "RIP") return "RIP";
      // Capitalize first letter
      return cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
    };

    repoDistribution.forEach((row) => {
      const repoName = row.repo;
      const actor = row.actor;
      const count = row.count;
      
      if (repoName === "ethereum/ERCs") {
        data.push({ category: "ERC", actor, count, repo: "ethereum/ERCs" });
      } else if (repoName === "ethereum/RIPs") {
        data.push({ category: "RIP", actor, count, repo: "ethereum/RIPs" });
      } else {
        // For ethereum/EIPs, distribute actions over the categories covered by this actor
        const actorCats = categoriesByActor[actor] || [];
        if (actorCats.length > 0) {
          const countPerCat = Math.round(count / actorCats.length);
          actorCats.forEach((cat) => {
            data.push({ category: normalizeCategory(cat), actor, count: countPerCat, repo: "ethereum/EIPs" });
          });
        } else {
          data.push({ category: "Core", actor, count, repo: "ethereum/EIPs" });
        }
      }
    });
    
    return data;
  }, [repoDistribution, categoriesByActor]);

  // 1. Actions by Editor and Repository Stacked Horizontal Bar
  const breakdownRepoOption = useMemo(() => {
    const sorted = [...leaderboard].sort((a, b) => b.totalActions - a.totalActions);
    const actors = sorted.map((r) => r.actor);
    const repos = ["ethereum/EIPs", "ethereum/ERCs", "ethereum/RIPs"];
    
    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
      },
      legend: {
        textStyle: { color: "var(--muted-foreground)", fontSize: 11, fontWeight: 500 },
        bottom: 0,
      },
      grid: { top: 30, left: 100, right: 30, bottom: 45 },
      xAxis: {
        type: "value",
        axisLabel: { color: "var(--muted-foreground)", fontSize: 10 },
        splitLine: { lineStyle: { color: "rgba(148,163,184,0.12)", type: "dashed" } },
      },
      yAxis: {
        type: "category",
        data: actors,
        axisLabel: { color: "var(--foreground)", fontSize: 10, fontWeight: 505 },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      series: repos.map((repo) => {
        const repoName = repo.split("/")[1] || repo;
        return {
          name: repoName,
          type: "bar",
          stack: "repos",
          data: actors.map((actor) => {
            const match = repoDistribution.find((r) => r.actor === actor && r.repo === repo);
            return match ? match.count : 0;
          }),
          itemStyle: { color: repoColors[repo] },
        };
      }),
    };
  }, [repoDistribution, leaderboard]);

  // 2. Actions by Editor and Event Type Stacked Horizontal Bar
  const breakdownEventOption = useMemo(() => {
    const sorted = [...leaderboard].sort((a, b) => b.totalActions - a.totalActions);
    const actors = sorted.map((e) => e.actor);
    
    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
      },
      legend: {
        textStyle: { color: "var(--muted-foreground)", fontSize: 11, fontWeight: 500 },
        bottom: 0,
      },
      grid: { top: 30, left: 100, right: 30, bottom: 45 },
      xAxis: {
        type: "value",
        axisLabel: { color: "var(--muted-foreground)", fontSize: 10 },
        splitLine: { lineStyle: { color: "rgba(148,163,184,0.12)", type: "dashed" } },
      },
      yAxis: {
        type: "category",
        data: actors,
        axisLabel: { color: "var(--foreground)", fontSize: 10, fontWeight: 505 },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      series: [
        {
          name: "PR Reviews",
          type: "bar",
          stack: "events",
          data: sorted.map((e) => e.reviews),
          itemStyle: { color: "#60a5fa" }, // ERC-like blue
        },
        {
          name: "Comments",
          type: "bar",
          stack: "events",
          data: sorted.map((e) => e.comments),
          itemStyle: { color: "#a78bfa" }, // networking purple
        },
        {
          name: "Other Actions",
          type: "bar",
          stack: "events",
          data: sorted.map((e) => Math.max(0, e.totalActions - e.reviews - e.comments)),
          itemStyle: { color: "rgba(148, 163, 184, 0.45)" },
        },
      ],
    };
  }, [leaderboard]);

  // 3. Category Actions breakdown (Stacked horizontal bar chart showing category-based actions by Editor)
  const breakdownCategoryOption = useMemo(() => {
    const categories = ["Core", "ERC", "Networking", "Interface", "Meta", "Informational", "RIP"];
    const actors = Array.from(new Set(categoryActionsData.map((d) => d.actor)));
    
    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: any[]) => {
          if (!params || params.length === 0) return "";
          const catName = params[0].name;
          const items = params
            .filter((p) => Number(p.value) > 0)
            .map((p) => {
              const match = categoryActionsData.find((d) => d.category === catName && d.actor === p.seriesName);
              const repoStr = match ? match.repo.split("/")[1] : "EIPs";
              return `<div style="color: ${p.color}; padding: 2px 0;"><strong>${p.seriesName}</strong>: ${p.value.toLocaleString()} actions on <span style="opacity:0.8;">${repoStr}</span></div>`;
            })
            .join("");
          return `<div style="padding: 6px;"><div style="font-weight: 600; margin-bottom: 4px;">Category: ${catName}</div>${items}</div>`;
        }
      },
      legend: {
        textStyle: { color: "var(--muted-foreground)", fontSize: 10, fontWeight: 500 },
        type: "scroll",
        bottom: 0,
      },
      grid: { top: 30, left: 100, right: 30, bottom: 45 },
      xAxis: {
        type: "value",
        axisLabel: { color: "var(--muted-foreground)", fontSize: 10 },
        splitLine: { lineStyle: { color: "rgba(148,163,184,0.12)", type: "dashed" } },
      },
      yAxis: {
        type: "category",
        data: categories,
        axisLabel: { color: "var(--foreground)", fontSize: 10, fontWeight: 505 },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      series: actors.map((actor, idx) => {
        return {
          name: actor,
          type: "bar",
          stack: "categoryActions",
          emphasis: { focus: "series" },
          data: categories.map((cat) => {
            const match = categoryActionsData.find((d) => d.category === cat && d.actor === actor);
            return match ? match.count : 0;
          }),
          itemStyle: {
            color: `hsl(${(idx * 360) / Math.max(actors.length, 1)}, 70%, 55%)`
          }
        };
      }),
    };
  }, [categoryActionsData]);

  // ECharts Trend Option with Nice Thick DataZoom
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
    grid: { top: 40, left: 32, right: 20, bottom: 50 },
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
    dataZoom: [
      {
        type: "slider",
        show: true,
        realtime: true,
        height: 24,
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
    grid: { top: 40, left: 32, right: 20, bottom: 50 },
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
    dataZoom: [
      {
        type: "slider",
        show: true,
        realtime: true,
        height: 24,
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

  const otherTrendOption = useMemo(() => {
    const otherTrend = monthlyTrend.map((point) => {
      const reviewedPoint = monthlyReviewedTrend.find((r) => r.month === point.month);
      const normalized: MonthlyTrendPoint = { month: point.month };
      for (const key of Object.keys(point)) {
        if (key === "month") continue;
        const totalVal = Number(point[key] || 0);
        const reviewedVal = reviewedPoint ? Number(reviewedPoint[key] || 0) : 0;
        normalized[key] = Math.max(0, totalVal - reviewedVal);
      }
      return normalized;
    });

    return {
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
      grid: { top: 40, left: 32, right: 20, bottom: 50 },
      xAxis: {
        type: "category",
        data: otherTrend.map((m) => m.month),
        axisLabel: { color: "var(--muted-foreground)", fontSize: 11, fontWeight: 500 },
        axisLine: { lineStyle: { color: "rgba(148,163,184,0.25)" } },
        splitLine: { show: true, lineStyle: { color: "rgba(148,163,184,0.12)", type: "dashed" } },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: "var(--muted-foreground)", fontSize: 11, fontWeight: 500 },
        splitLine: { lineStyle: { color: "rgba(148,163,184,0.2)", type: "dashed" } },
      },
      dataZoom: [
        {
          type: "slider",
          show: true,
          realtime: true,
          height: 24,
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
        data: otherTrend.map((p) => Number(p[actor] || 0)),
      })),
    };
  }, [monthlyTrend, monthlyReviewedTrend, trendActors]);

  const downloadOtherTrendReport = useCallback(() => {
    const otherTrend = monthlyTrend.map((point) => {
      const reviewedPoint = monthlyReviewedTrend.find((r) => r.month === point.month);
      const normalized: MonthlyTrendPoint = { month: point.month };
      for (const key of Object.keys(point)) {
        if (key === "month") continue;
        const totalVal = Number(point[key] || 0);
        const reviewedVal = reviewedPoint ? Number(reviewedPoint[key] || 0) : 0;
        normalized[key] = Math.max(0, totalVal - reviewedVal);
      }
      return normalized;
    });
    const headers = ["Month", ...trendActors];
    const rows = otherTrend.map((row) => [row.month, ...trendActors.map((actor) => Number(row[actor] || 0))]);
    downloadCsv(`editors-other-actions-monthly-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }, [monthlyTrend, monthlyReviewedTrend, trendActors]);

  const trendMetricMeta = useCallback((metric: "actions" | "reviews" | "other") => {
    if (metric === "reviews") {
      return {
        title: "PRs Reviewed (Monthly)",
        subtitle: "Monthly distinct PRs with review events by each editor.",
        footer: "Counts distinct PRs with review events, not total comments.",
        option: reviewedTrendOption,
      };
    }
    if (metric === "other") {
      return {
        title: "Other Actions (Monthly)",
        subtitle: "Monthly count of non-review actions (comments, commits, label updates).",
        footer: "Calculated as total monthly actions minus PR reviews.",
        option: otherTrendOption,
      };
    }
    return {
      title: "Editor Actions Over Time",
      subtitle: "Monthly count of all editor actions (reviews, comments, labels, updates).",
      footer: "Shows monthly total editor actions, not cumulative totals.",
      option: trendOption,
    };
  }, [reviewedTrendOption, trendOption, otherTrendOption]);

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
        textStyle: { color: "var(--foreground)", fontSize: 28, fontFamily: "monospace", fontWeight: 700 },
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
      grid: { top: 40, left: 28, right: 20, bottom: 52 },
      xAxis: {
        type: "category",
        data: dates,
        axisLabel: { color: "var(--muted-foreground)", fontSize: 10, hideOverlap: true, fontWeight: 505 },
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
          height: 22,
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
          start: 0,
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

  // ECharts Leaderboard Option that reflects active Metric filter
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
    const maxValue = Math.max(1, ...ordered.map((row) => {
      if (selectedMetric === "reviews") return row.reviews;
      if (selectedMetric === "prs") return row.prsTouched;
      return row.totalActions;
    }));

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
            value: selectedMetric === "reviews" ? row.reviews : selectedMetric === "prs" ? row.prsTouched : row.totalActions,
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
              coord: [
                (selectedMetric === "reviews" ? row.reviews : selectedMetric === "prs" ? row.prsTouched : row.totalActions) + maxValue * 0.045,
                row.actor
              ],
              symbol: `image://${getGitHubAvatarUrl(row.actor)}`,
              symbolSize: 24,
            })),
          },
        },
      ],
    };
  }, [leaderboardHeroRows, selectedMetric]);

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

  // Custom Pulsing Glassmorphic Loader
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] rounded-2xl border border-border/40 bg-card/35 backdrop-blur-md p-8 relative overflow-hidden">
        {/* Glowing backdrop ambient blur */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-primary/10 rounded-full blur-[110px] pointer-events-none" />
        
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-4 border-primary/10" />
          <div className="absolute inset-0 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin" />
          <div className="absolute inset-3.5 rounded-full border-2 border-primary/5" />
          <div className="absolute inset-3.5 rounded-full border-2 border-t-transparent border-r-transparent border-b-primary border-l-transparent animate-spin [animation-duration:1.5s]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Activity className="h-6 w-6 text-primary animate-pulse" />
          </div>
        </div>
        
        <h3 className="mt-6 text-base font-semibold text-foreground tracking-tight">Analyzing Editor Performance</h3>
        <p className="mt-1.5 text-xs text-muted-foreground max-w-sm text-center leading-relaxed">
          Compiling activity leaderboards, response latency metrics, category coverage depth, and repo distributions...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Top Subtle Stats Summary Bar */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2.5 rounded-2xl border border-border/45 bg-gradient-to-r from-card/85 to-card/45 px-5 py-3.5 text-xs text-muted-foreground backdrop-blur-md shadow-md hover:border-primary/20 transition-all duration-300">
        <span className="flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-primary" />
          Total Actions: <strong className="text-foreground font-semibold tabular-nums">{totalActions.toLocaleString()}</strong>
        </span>
        <span className="h-4 w-px bg-border/60 hidden sm:inline" />
        <span className="flex items-center gap-1.5">
          <UserCheck className="h-3.5 w-3.5 text-primary" />
          Active Editors: <strong className="text-foreground font-semibold tabular-nums">{activeEditors} / {OFFICIAL_EDITOR_HANDLES.length}</strong>
        </span>
        <span className="h-4 w-px bg-border/60 hidden sm:inline" />
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-primary" />
          Avg Response: <strong className="text-foreground font-semibold tabular-nums">{avgResponseDays != null ? `${Math.round(avgResponseDays)}d` : "–"}</strong>
        </span>
        <span className="h-4 w-px bg-border/60 hidden sm:inline" />
        <span className="flex items-center gap-1.5">
          <Grid3x3 className="h-3.5 w-3.5 text-primary" />
          Coverage Risk: <strong className="text-foreground font-semibold text-rose-300">{thinCoverageCategories.length} thin categories</strong>
        </span>
      </div>

      {/* Section 2: Editor Leaderboard */}
      <section id="editor-leaderboard" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="inline-flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h2 className="dec-title text-base font-semibold tracking-tight text-foreground sm:text-lg">Editor Leaderboard - {leaderboardLabel}</h2>
              <CopyLinkButton sectionId="editor-leaderboard" className="h-7 w-7 rounded-md border border-border bg-muted/65 hover:border-primary/45 hover:bg-primary/10" />
            </div>
            <p className="text-xs text-muted-foreground">Main ranking of canonical editors sorted by their PR reviews, comments, and total indexed actions.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Metric Selector Chips */}
            <div className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 p-1">
              {leaderboardMode !== "monthly" && (
                <button
                  onClick={() => setSelectedMetric("reviews")}
                  className={`rounded px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                    selectedMetric === "reviews"
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Reviews
                </button>
              )}
              <button
                onClick={() => setSelectedMetric("prs")}
                className={`rounded px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  selectedMetric === "prs"
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                PRs Touched
              </button>
              <button
                onClick={() => setSelectedMetric("actions")}
                className={`rounded px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  selectedMetric === "actions"
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Total Actions
              </button>
            </div>

            <button
              onClick={downloadLeaderboardCSV}
              disabled={exporting || leaderboard.length === 0}
              className="flex h-8 items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Download CSV
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-card/85 to-card/45 p-6 backdrop-blur-md shadow-lg hover:border-primary/20 transition-all duration-300 relative flex flex-col justify-between">
          <div>
            {/* Metric Definitions guide */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg border border-border/40 bg-muted/20 p-3 text-[10px] text-muted-foreground mb-4 shadow-inner">
              <div className="flex gap-1.5 items-start">
                <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                <div>
                  <strong className="text-foreground">Reviews:</strong> Count of pull requests reviewed by the editor (approvals, requested changes, or comments).
                </div>
              </div>
              <div className="flex gap-1.5 items-start">
                <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                <div>
                  <strong className="text-foreground">PRs Touched:</strong> Count of distinct pull requests where the editor had any activity (commits, comments, reviews).
                </div>
              </div>
              <div className="flex gap-1.5 items-start">
                <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                <div>
                  <strong className="text-foreground">Actions:</strong> Combined total of all events (reviews, comments, commits, PR open/close/merge).
                </div>
              </div>
            </div>

            <div className="relative">
              {/* Overlay graph switcher */}
              <div className="absolute right-4 top-4 z-10 inline-flex items-center gap-1 rounded-md border border-border/80 bg-background/90 p-1 shadow backdrop-blur-sm">
                <button
                  onClick={() => setLeaderboardHeroView("list")}
                  className={`p-1.5 rounded transition-all cursor-pointer ${
                    leaderboardHeroView === "list"
                      ? "bg-primary/20 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="List view"
                >
                  <BookOpen className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setLeaderboardHeroView("chart")}
                  className={`p-1.5 rounded transition-all cursor-pointer ${
                    leaderboardHeroView === "chart"
                      ? "bg-primary/20 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Chart view"
                >
                  <BarChart3 className="h-4 w-4" />
                </button>
              </div>

              {leaderboardHeroView === "chart" ? (
                leaderboardHeroRows.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-border/70 border-dashed bg-muted/30 py-8">
                    <BarChart3 className="mb-2 h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No leaderboard data found for the current filters.</p>
                  </div>
                ) : (
                  <div className="h-[430px] w-full rounded-lg border border-border/70 bg-background/35 p-2">
                    <ReactECharts option={leaderboardHeroOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} notMerge />
                  </div>
                )
              ) : (
                <div className="space-y-2.5 h-[430px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-primary/10 hover:scrollbar-thumb-primary/20">
                  {leaderboardHeroRows.map((editor, index) => (
                    <div
                      key={`top-leaderboard-${editor.actor}`}
                      className="flex items-center justify-between rounded-lg border border-border/60 bg-background/35 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={getGitHubAvatarUrl(editor.actor)}
                          alt={`${editor.actor} avatar`}
                          className="h-9 w-9 rounded-full border border-border object-cover"
                          loading="lazy"
                        />
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            #{index + 1} {editor.actor}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {editor.reviews.toLocaleString()} reviews · {editor.prsTouched.toLocaleString()} PRs touched · {editor.totalActions.toLocaleString()} total actions
                          </p>
                        </div>
                      </div>
                      <p className="text-lg font-bold tabular-nums text-foreground">
                        {selectedMetric === "reviews" ? editor.reviews.toLocaleString() : selectedMetric === "prs" ? editor.prsTouched.toLocaleString() : editor.totalActions.toLocaleString()}
                      </p>
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
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Interactive Action Breakdown (Tabs: Repo Distribution, Event Types, Category Action breakdown) */}
      <section id="editor-action-breakdown" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="inline-flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <h2 className="dec-title text-base font-semibold tracking-tight text-foreground sm:text-lg">Detailed Action Breakdown</h2>
              <CopyLinkButton sectionId="editor-action-breakdown" className="h-7 w-7 rounded-md border border-border bg-muted/65 hover:border-primary/45 hover:bg-primary/10" />
            </div>
            <p className="text-xs text-muted-foreground">Analyze who acts where, what events are triggered, and category-focused activities.</p>
          </div>

          {/* Tab switch buttons */}
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 p-1">
            <button
              onClick={() => setBreakdownTab("repo")}
              className={`rounded px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                breakdownTab === "repo"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Repository Mix
            </button>
            <button
              onClick={() => setBreakdownTab("event")}
              className={`rounded px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                breakdownTab === "event"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Action Type Mix
            </button>
            <button
              onClick={() => setBreakdownTab("category")}
              className={`rounded px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                breakdownTab === "category"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Category Actions
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-card/85 to-card/45 p-6 backdrop-blur-md shadow-lg hover:border-primary/20 transition-all duration-300">
          <div className="h-[430px] w-full rounded-lg border border-border/70 bg-background/35 p-2">
            {breakdownTab === "repo" && (
              <ReactECharts option={breakdownRepoOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} notMerge />
            )}
            {breakdownTab === "event" && (
              <ReactECharts option={breakdownEventOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} notMerge />
            )}
            {breakdownTab === "category" && (
              <ReactECharts option={breakdownCategoryOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} notMerge />
            )}
          </div>
        </div>
      </section>

      {/* Section 4: Editorial Trends */}
      <section id="editor-trends" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="inline-flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="dec-title text-base font-semibold tracking-tight text-foreground sm:text-lg">Editorial Trends Over Time</h2>
              <CopyLinkButton sectionId="editor-trends" className="h-7 w-7 rounded-md border border-border bg-muted/65 hover:border-primary/45 hover:bg-primary/10" />
            </div>
            <p className="text-xs text-muted-foreground">Historical progression of editor actions and distinct PR reviews recorded monthly.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={trendPrimaryMetric}
              onChange={(e) => setTrendPrimaryMetric(e.target.value as "actions" | "reviews" | "other")}
              className="h-8 rounded-md border border-border bg-background px-3 text-xs text-foreground font-semibold transition-all hover:border-primary/45 focus:outline-none focus:ring-1 focus:ring-primary/20 cursor-pointer"
              aria-label="Select trend metric"
            >
              <option value="reviews">PRs Reviewed (Monthly)</option>
              <option value="actions">All Editor Actions</option>
              <option value="other">Other Actions (Monthly)</option>
            </select>

            <button
              onClick={() => {
                if (trendPrimaryMetric === "actions") {
                  downloadTrendReport();
                } else if (trendPrimaryMetric === "reviews") {
                  downloadReviewedMonthlyReport();
                } else {
                  downloadOtherTrendReport();
                }
              }}
              className="flex h-8 items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-card/85 to-card/45 p-6 backdrop-blur-md shadow-lg hover:border-primary/20 transition-all duration-300">
          <div className="relative h-[340px] w-full">
            <ReactECharts option={trendMetricMeta(trendPrimaryMetric).option} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} notMerge />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-semibold text-foreground/5">EIPsInsight.com</span>
            </div>
          </div>
          
          <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2.5 text-[10px] text-muted-foreground">
            <span>{trendMetricMeta(trendPrimaryMetric).footer}</span>
            <LastUpdated timestamp={dataUpdatedAt} className="text-xs" />
          </div>
        </div>
      </section>

      {/* Section 5: Category Coverage */}
      <section id="editor-category-coverage" className="space-y-3">
        <div className="flex flex-col gap-1">
          <div className="inline-flex items-center gap-2">
            <Grid3x3 className="h-5 w-5 text-primary" />
            <h2 className="dec-title text-base font-semibold tracking-tight text-foreground sm:text-lg">Category Coverage Index</h2>
            <CopyLinkButton sectionId="editor-category-coverage" className="h-7 w-7 rounded-md border border-border bg-muted/65 hover:border-primary/40 hover:bg-primary/10" />
          </div>
          <p className="text-xs text-muted-foreground">Who covers what categories, highlighting gaps and active editors count.</p>
        </div>
        
        <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-card/85 to-card/45 p-6 backdrop-blur-md shadow-lg hover:border-primary/20 transition-all duration-300">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7">
            {categoryData.map((category) => {
              const isThin = category.count <= 1;
              const color = categoryColors[category.category.toLowerCase()] || "#94a3b8";
              return (
                <div key={category.category} className="rounded-lg border border-border/60 bg-background/35 p-3.5 flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="flex items-center justify-between gap-1.5 mb-1.5">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground truncate">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        {category.category}
                      </span>
                      {isThin && (
                        <span className="rounded bg-rose-500/12 border border-rose-500/30 px-1 py-0.5 text-[9px] font-semibold text-rose-300">
                          Risk
                        </span>
                      )}
                    </div>
                    <p className="text-3xl font-bold text-foreground tabular-nums tracking-tight">{category.count}</p>
                    <p className="text-[10px] text-muted-foreground">Covering Editors</p>
                  </div>
                  
                  <div className="mt-3 flex flex-wrap gap-1">
                    {category.actors.slice(0, 3).map(actor => (
                      <img
                        key={actor}
                        src={getGitHubAvatarUrl(actor)}
                        alt={actor}
                        title={actor}
                        className="h-5 w-5 rounded-full border border-border/80 object-cover"
                        loading="lazy"
                      />
                    ))}
                    {category.actors.length > 3 && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border/80 bg-muted/65 text-[9px] font-semibold text-muted-foreground">
                        +{category.actors.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section 6: Daily + Repo Operations Breakdown */}
      <section id="editor-operations" className="space-y-3">
        <div className="flex flex-col gap-1">
          <div className="inline-flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <h2 className="dec-title text-base font-semibold tracking-tight text-foreground sm:text-lg">Operational Breakdowns</h2>
            <CopyLinkButton sectionId="editor-operations" className="h-7 w-7 rounded-md border border-border bg-muted/65 hover:border-primary/40 hover:bg-primary/10" />
          </div>
          <p className="text-xs text-muted-foreground">Breakdowns of editor activities split by calendar day and distinct repositories.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Daily activity */}
          <div className="lg:col-span-2 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-muted-foreground">Daily Editorial Activity</span>
              <button onClick={downloadDailyActivityReport} className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/15">
                <Download className="h-3.5 w-3.5" />
                Export
              </button>
            </div>
            <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-card/85 to-card/45 p-6 backdrop-blur-md shadow-lg">
              <div className="relative h-64 w-full">
                <ReactECharts option={dailyActivityOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} notMerge />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-semibold text-foreground/5">EIPsInsight.com</span>
                </div>
              </div>
              <AnalyticsAnnotation>
                Stacked bars show total actions per day, split by editor.
              </AnalyticsAnnotation>
            </div>
          </div>

          {/* Repo distribution */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-muted-foreground">Repo Distribution</span>
              <button onClick={downloadRepoDistributionReport} className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/15">
                <Download className="h-3.5 w-3.5" />
                Export
              </button>
            </div>
            <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-card/85 to-card/45 p-6 backdrop-blur-md shadow-lg">
              <div className="relative h-64 w-full">
                <ReactECharts option={repoOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} notMerge />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-semibold text-foreground/5">EIPsInsight.com</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 7: Directory Table */}
      <section id="editor-activity-directory" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="inline-flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="dec-title text-base font-semibold tracking-tight text-foreground sm:text-lg">Editor Activity Directory</h2>
              <CopyLinkButton sectionId="editor-activity-directory" className="h-7 w-7 rounded-md border border-border bg-muted/65 hover:border-primary/40 hover:bg-primary/10" />
            </div>
            <p className="text-xs text-muted-foreground">Lookup tabular metrics, repository distribution, and action mixes per editor.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-col gap-1">
              <select
                id="leaderboard-scope"
                value={leaderboardMode}
                onChange={(e) => setLeaderboardMode(e.target.value as "all" | "monthly" | "range")}
                className="h-8 rounded-md border border-border bg-background px-3 text-xs text-foreground cursor-pointer"
                aria-label="Select leaderboard scope"
              >
                <option value="all">All-time</option>
                <option value="monthly">Monthly</option>
                <option value="range">Use dashboard range</option>
              </select>
            </div>
            {leaderboardMode === "monthly" && (
              <>
                <div className="flex flex-col gap-1">
                  <select
                    id="leaderboard-year"
                    value={leaderboardYear}
                    onChange={(e) => setLeaderboardYear(Number(e.target.value))}
                    className="h-8 rounded-md border border-border bg-background px-3 text-xs text-foreground cursor-pointer"
                    aria-label="Select leaderboard year"
                  >
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <select
                    id="leaderboard-month"
                    value={leaderboardMonth}
                    onChange={(e) => setLeaderboardMonth(Number(e.target.value))}
                    className="h-8 rounded-md border border-border bg-background px-3 text-xs text-foreground cursor-pointer"
                    aria-label="Select leaderboard month"
                  >
                    {MONTH_NAMES.map((month, index) => (
                      <option key={month} value={index + 1}>{month}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <button
              onClick={downloadLeaderboardCSV}
              disabled={exporting || leaderboard.length === 0}
              className="flex h-8 items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Export CSV
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-card/85 to-card/45 p-6 backdrop-blur-md shadow-lg hover:border-primary/20 transition-all duration-300">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/70 bg-muted/30 backdrop-blur-sm">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-foreground">Editor</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-foreground">Status</th>
                  <th className={`px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-foreground transition-all ${selectedMetric === "actions" ? "text-primary bg-primary/5 font-bold" : ""}`}>Actions</th>
                  {leaderboardMode !== "monthly" && (
                    <th className={`px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-foreground transition-all ${selectedMetric === "reviews" ? "text-primary bg-primary/5 font-bold" : ""}`}>Reviews</th>
                  )}
                  <th className={`px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-foreground transition-all ${selectedMetric === "prs" ? "text-primary bg-primary/5 font-bold" : ""}`}>PRs Touched</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-foreground">Mix</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-foreground">Report</th>
                </tr>
              </thead>
              <tbody>
                {sortedLeaderboard.map((editor) => {
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
                              <p className="font-medium text-foreground/90 text-sm">{editor.actor}</p>
                              {editor.actor === "abcoathup" && (
                                <span className="rounded-full border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-primary">
                                  Associate
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              {categories.length ? categories.slice(0, 3).join(", ") : "No categories"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${isActive ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-border bg-muted/40 text-muted-foreground"}`}>
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right text-sm tabular-nums transition-all ${selectedMetric === "actions" ? "bg-primary/5 font-semibold text-primary" : ""}`}>
                        <button
                          onClick={() => handleQuickFilter(editor.actor, "all")}
                          className="hover:text-primary hover:underline font-mono text-foreground/85 cursor-pointer focus:outline-none"
                          title={`View recent actions for ${editor.actor}`}
                        >
                          {editor.totalActions.toLocaleString()}
                        </button>
                      </td>
                      {leaderboardMode !== "monthly" && (
                        <td className={`px-4 py-3 text-right text-sm tabular-nums transition-all ${selectedMetric === "reviews" ? "bg-primary/5 font-semibold text-primary" : ""}`}>
                          <button
                            onClick={() => handleQuickFilter(editor.actor, "reviewed")}
                            className="hover:text-primary hover:underline font-mono text-foreground/85 cursor-pointer focus:outline-none"
                            title={`View recent reviews for ${editor.actor}`}
                          >
                            {editor.reviews.toLocaleString()}
                          </button>
                        </td>
                      )}
                      <td className={`px-4 py-3 text-right text-sm tabular-nums transition-all ${selectedMetric === "prs" ? "bg-primary/5 font-semibold text-primary" : ""}`}>
                        <button
                          onClick={() => handleQuickFilter(editor.actor, "prs")}
                          className="hover:text-primary hover:underline font-mono text-foreground/85 cursor-pointer focus:outline-none"
                          title={`View recent PRs touched by ${editor.actor}`}
                        >
                          {editor.prsTouched.toLocaleString()}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex h-2 w-28 overflow-hidden rounded-full border border-border/50 bg-muted/30">
                          <div className="h-full" style={{ width: `${reviewsPct}%`, backgroundColor: "hsl(200, 90%, 55%)" }} />
                          <div className="h-full" style={{ width: `${commentsPct}%`, backgroundColor: "hsl(280, 80%, 55%)" }} />
                          <div className="h-full" style={{ width: `${otherPct}%`, backgroundColor: "hsl(0, 0%, 70%)" }} />
                        </div>
                        <p className="mt-1 text-[9px] text-muted-foreground tabular-nums">
                          R {reviewsPct.toFixed(0)}% · C {commentsPct.toFixed(0)}%
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => downloadEditorReport(editor.actor)}
                          disabled={downloadingEditor === editor.actor}
                          className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {downloadingEditor === editor.actor ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {leaderboard.length === 0 && (
                  <tr>
                    <td colSpan={leaderboardMode === "monthly" ? 6 : 7} className="py-8">
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

      {/* Section 8: Recent Activities */}
      <section id="editor-recent-activity" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="inline-flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <h2 className="dec-title text-base font-semibold tracking-tight text-foreground sm:text-lg">Recent Activities Feed</h2>
              <CopyLinkButton sectionId="editor-recent-activity" className="h-7 w-7 rounded-md border border-border bg-muted/65 hover:border-primary/40 hover:bg-primary/10" />
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">Live, queryable actions feed filtering by repository, specific editor handles, and PR event types.</p>
          </div>
          
          {(activityRepoFilter !== "all" || activityEditorFilter !== "all" || activityActionFilter !== "all") && (
            <button
              onClick={() => {
                setActivityRepoFilter("all");
                setActivityEditorFilter("all");
                setActivityActionFilter("all");
                setVisibleActivityCount(20);
              }}
              className="inline-flex items-center gap-1 rounded border border-border bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Reset Filters
            </button>
          )}
        </div>
        
        <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-card/85 to-card/45 p-6 backdrop-blur-md shadow-lg">
          <div className="border-b border-border/70 pb-4 mb-4">
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
                  className="h-9 w-full rounded-md border border-border/60 bg-background px-3 text-xs text-foreground cursor-pointer"
                  aria-label="Filter activity by repository"
                >
                  <option value="all">All Repositories</option>
                  {activityRepoOptions.map((repo) => (
                    <option key={repo} value={repo}>{repo}</option>
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
                  className="h-9 w-full rounded-md border border-border/60 bg-background px-3 text-xs text-foreground cursor-pointer"
                  aria-label="Filter activity by editor"
                >
                  <option value="all">All Editors</option>
                  {activityEditorOptions.map((editor) => (
                    <option key={editor} value={editor}>{editor}</option>
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
                  className="h-9 w-full rounded-md border border-border/60 bg-background px-3 text-xs text-foreground cursor-pointer"
                  aria-label="Filter activity by action"
                >
                  <option value="all">All Actions</option>
                  {activityActionOptions.map((action) => (
                    <option key={action} value={action}>{action}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dynamic feed statistics */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[10px] text-muted-foreground mt-3 pt-3.5 border-t border-border/40">
              <span className="font-semibold text-foreground/75">Filtered Feed Stats:</span>
              {Object.keys(activityFeedStats).length === 0 ? (
                <span>No actions</span>
              ) : (
                Object.entries(activityFeedStats).map(([type, count]) => (
                  <span key={type} className="rounded bg-muted px-1.5 py-0.5 font-semibold text-foreground/80 lowercase">
                    {type}: {count}
                  </span>
                ))
              )}
              {filteredActivityFeed.length > 0 && (
                <span className="ml-auto font-medium">Showing top {visibleActivityFeed.length} of {filteredActivityFeed.length} actions</span>
              )}
            </div>
          </div>
          
          <div className="space-y-3">
            {visibleActivityFeed.map((row, idx) => {
              const key = `${row.actor}-${row.prNumber}-${row.actedAt}-${row.eventType}-${idx}`;
              const expanded = Boolean(expandedActivityKeys[key]);
              const eventLabel = formatEventLabel(row.eventType);
              return (
                <div key={key} className="rounded-xl border border-border/50 bg-background/20 px-4 py-3 transition-all hover:border-primary/25">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase ${getActionBadgeClass(row.eventType)}`}>
                          {eventLabel}
                        </span>
                        <span className="rounded border border-border/60 bg-background/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                          {row.repoShort}
                        </span>
                        <span className="text-xs font-semibold text-foreground/85">{row.actor}</span>
                      </div>
                      {row.title && (
                        <p className="mt-2 text-sm text-foreground/95 font-medium">{row.title}</p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground tabular-nums font-mono">{formatActivityTime(row.actedAt)}</p>
                  </div>
                  
                  <button
                    onClick={() => toggleActivityDetails(key)}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary/80 transition-colors hover:text-primary"
                  >
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
                    {expanded ? "Hide Details" : "Show Details"}
                  </button>
                  
                  {expanded && (
                    <div className="mt-2 rounded border border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground">
                      <div className="flex flex-wrap items-center gap-3">
                        <span>Event Type: <strong className="text-foreground/80">{row.eventType}</strong></span>
                        <span>·</span>
                        <span>PR:</span>
                        <Link href={`/pr/${row.repoShort}/${row.prNumber}`} className="text-primary font-semibold hover:underline">
                          #{row.prNumber}
                        </Link>
                        {row.eventUrl && (
                          <>
                            <span>·</span>
                            <a
                              href={row.eventUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary font-semibold hover:underline inline-flex items-center gap-0.5"
                            >
                              GitHub link
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            
            {visibleActivityFeed.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8">
                <Zap className="mb-2 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No editor actions found for current filters.</p>
              </div>
            )}
          </div>
          
          {hasMoreActivities && (
            <div className="border-t border-border/60 mt-4 pt-4">
              <button
                onClick={() => setVisibleActivityCount((count) => count + 20)}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
              >
                <ChevronDown className="h-3.5 w-3.5" />
                Show more ({filteredActivityFeed.length - visibleActivityCount} remaining)
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Methodology Section */}
      <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-2">
          <details className="group">
            <summary className="cursor-pointer rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs text-foreground/85 hover:bg-muted/60 transition-colors">
              Methodology
            </summary>
            <div className="mt-2 max-w-3xl rounded-md border border-border/60 bg-background/50 p-3 text-xs text-muted-foreground">
              Official editor handles only. Activity uses normalized PR event timestamps with late-ingest correction.
              Median response is measured from PR creation to first editor action in selected scope.
            </div>
          </details>
          <span className="rounded-md border border-border bg-background/60 px-2.5 py-1 text-xs text-muted-foreground">
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
