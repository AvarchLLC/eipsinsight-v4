"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useAnalytics, useAnalyticsExport } from "../analytics-layout-client";
import { client } from "@/lib/orpc";
import { CANONICAL_EIP_REVIEWERS } from "@/data/eip-contributor-roles";
import { Users, Clock, MessageSquare, AlertCircle, Search, ChevronLeft, ChevronRight, ChevronDown, Download, LayoutGrid, BarChart3 } from "lucide-react";
import { LastUpdated } from "@/components/analytics/LastUpdated";
import { InlineBrandLoader } from "@/components/inline-brand-loader";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import { CHART_AXIS, CHART_GRID, chartColor } from "@/lib/chart-colors";

interface ReviewerLeaderboardRow {
  actor: string;
  totalReviews: number;
  prsTouched: number;
  medianResponseDays: number | null;
  updatedAt?: string | null;
}

interface CyclesData {
  cycles: number;
  count: number;
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

interface ReviewerActionDetailRow {
  actor: string;
  eventType: string;
  actedAt: string;
  prNumber: number;
  repoShort: string;
  title: string;
  eventUrl: string | null;
}

const OFFICIAL_REVIEWERS: string[] = Array.from(CANONICAL_EIP_REVIEWERS);

function getGitHubAvatarUrl(handle: string): string {
  return `https://github.com/${handle}.png?size=80`;
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

function getTimeWindow(
  timeRange: string,
  customFromMonth?: string,
  customToMonth?: string,
): { from: string | undefined; to: string | undefined } {
  const now = new Date();
  const to = now.toISOString().split('T')[0];
  
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

  let from: Date;
  switch (timeRange) {
    case "this_month":
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "7d":
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "15d":
      from = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
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

const STAT_ACCENT: Record<string, { chip: string; icon: string }> = {
  emerald: { chip: "bg-emerald-500/15", icon: "text-emerald-500" },
  blue: { chip: "bg-blue-500/15", icon: "text-blue-500" },
  amber: { chip: "bg-amber-500/15", icon: "text-amber-500" },
  violet: { chip: "bg-violet-500/15", icon: "text-violet-500" },
};

function StatCard({
  icon: Icon,
  accent,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  accent: keyof typeof STAT_ACCENT | string;
  label: string;
  value: string;
  sub?: string;
}) {
  const a = STAT_ACCENT[accent] ?? STAT_ACCENT.emerald;
  return (
    <div className="rounded-xl border border-border/70 bg-card/60 p-4 backdrop-blur-sm transition-colors hover:border-primary/40">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${a.chip}`}>
          <Icon className={`h-4 w-4 ${a.icon}`} />
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground sm:text-3xl">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function ReviewersAnalyticsPage() {
  const { timeRange, repoFilter, customFromMonth, customToMonth } = useAnalytics();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataUpdatedAt, setDataUpdatedAt] = useState<Date>(new Date());
  
  const [leaderboard, setLeaderboard] = useState<ReviewerLeaderboardRow[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrendPoint[]>([]);
  const [monthlyReviewedTrend, setMonthlyReviewedTrend] = useState<MonthlyTrendPoint[]>([]);
  const [cyclesData, setCyclesData] = useState<CyclesData[]>([]);
  const [repoDistribution, setRepoDistribution] = useState<RepoDistribution[]>([]);
  const [dailyActivityStacked, setDailyActivityStacked] = useState<DailyActivityStackedRow[]>([]);
  const [reviewerActionDetails, setReviewerActionDetails] = useState<ReviewerActionDetailRow[]>([]);
  
  // Leaderboard pagination and filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"reviews" | "prs" | "response">("reviews");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [repoDistributionView, setRepoDistributionView] = useState<"cards" | "graph">("cards");
  const [activityRepoFilter, setActivityRepoFilter] = useState<string>("all");
  const [activityEditorFilter, setActivityEditorFilter] = useState<string>("all");
  const [activityActionFilter, setActivityActionFilter] = useState<string>("all");
  const [visibleActivityCount, setVisibleActivityCount] = useState<number>(20);
  const [expandedActivityKeys, setExpandedActivityKeys] = useState<Record<string, boolean>>({});

  const repoParam = repoFilter === "all" ? undefined : repoFilter;
  const { from, to } = getTimeWindow(timeRange, customFromMonth, customToMonth);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const months = (timeRange === "7d" || timeRange === "15d") ? 3 : timeRange === "30d" ? 6 : timeRange === "90d" ? 12 : 24;
        
        const [leaderboardData, trendData, reviewedTrendData, cyclesDataRes, repoData, dailyData, actionDetails] = await Promise.all([
          client.analytics.getReviewersLeaderboard({
            repo: repoParam,
            from,
            to,
            limit: 30,
          }),
          client.analytics.getReviewersMonthlyTrend({
            repo: repoParam,
            months,
          }),
          client.analytics.getReviewersMonthlyReviewedPRs({
            repo: repoParam,
            months,
          }),
          client.analytics.getReviewerCyclesPerPR({
            repo: repoParam,
          }),
          client.analytics.getReviewersRepoDistribution({
            repo: repoParam,
            from,
            to,
          }),
          client.analytics.getReviewerDailyActivityStacked({
            repo: repoParam,
            from,
            to,
          }),
          client.analytics.getReviewerActionDetails({
            repo: repoParam,
            from,
            to,
            limit: 1200,
          }),
        ]);

        setLeaderboard(leaderboardData.filter((row) => OFFICIAL_REVIEWERS.includes(row.actor)));
        setMonthlyTrend(trendData);
        setMonthlyReviewedTrend(reviewedTrendData);
        setCyclesData(cyclesDataRes);
        setRepoDistribution(repoData.filter((row) => OFFICIAL_REVIEWERS.includes(row.actor)));
        setDailyActivityStacked(dailyData);
        setReviewerActionDetails(actionDetails);
        setDataUpdatedAt(new Date());
      } catch (error) {
        console.error("Failed to fetch reviewers analytics:", error);
        setError("Failed to load reviewer analytics. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timeRange, repoFilter, repoParam, from, to]);

  const activityRepoOptions = useMemo(() => {
    return Array.from(new Set(reviewerActionDetails.map((row) => row.repoShort))).sort();
  }, [reviewerActionDetails]);

  const activityEditorOptions = useMemo(() => {
    return Array.from(new Set(reviewerActionDetails.map((row) => row.actor))).sort((a, b) => a.localeCompare(b));
  }, [reviewerActionDetails]);

  const activityActionOptions = useMemo(() => {
    return Array.from(new Set(reviewerActionDetails.map((row) => row.eventType.toLowerCase()))).sort((a, b) => a.localeCompare(b));
  }, [reviewerActionDetails]);

  const filteredActivityFeed = useMemo(() => {
    return reviewerActionDetails.filter((row) => {
      const repoOk = activityRepoFilter === "all" || row.repoShort === activityRepoFilter;
      const editorOk = activityEditorFilter === "all" || row.actor === activityEditorFilter;
      const actionOk = activityActionFilter === "all" || row.eventType.toLowerCase() === activityActionFilter;
      return repoOk && editorOk && actionOk;
    });
  }, [reviewerActionDetails, activityRepoFilter, activityEditorFilter, activityActionFilter]);

  const visibleActivityFeed = useMemo(
    () => filteredActivityFeed.slice(0, visibleActivityCount),
    [filteredActivityFeed, visibleActivityCount]
  );

  const hasMoreActivities = visibleActivityCount < filteredActivityFeed.length;

  const reviewerRepoStackedData = useMemo(() => {
    const repos = ["eips", "ercs", "rips"] as const;
    const rows = repos.map((repo) => {
      const displayRepo = repo === "eips" ? "EIPs" : repo === "ercs" ? "ERCs" : "RIPs";
      const entry: Record<string, string | number> = { repo: displayRepo };
      OFFICIAL_REVIEWERS.forEach((reviewer) => {
        entry[reviewer] = 0;
      });
      return entry;
    });

    repoDistribution.forEach((row) => {
      const repoName = (row.repo.split("/")[1] || row.repo || "").toLowerCase();
      const targetRepo = repoName === "eips" ? "EIPs" : repoName === "ercs" ? "ERCs" : repoName === "rips" ? "RIPs" : null;
      const target = rows.find((r) => r.repo === targetRepo);
      if (!target) return;
      if (!OFFICIAL_REVIEWERS.includes(row.actor)) return;
      target[row.actor] = Number(target[row.actor] || 0) + row.count;
    });

    return rows;
  }, [repoDistribution]);

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

  const activeReviewers = useMemo(
    () => leaderboard.filter((row) => row.totalReviews > 0).length,
    [leaderboard]
  );

  const reviewerTotals = useMemo(
    () => leaderboard.reduce((sum, row) => sum + row.totalReviews, 0),
    [leaderboard]
  );

  const dailyStackedChartData = useMemo(() => {
    const dates = Array.from(new Set(dailyActivityStacked.map((row) => row.date))).sort();
    const actors = Array.from(new Set(dailyActivityStacked.map((row) => row.actor))).sort((a, b) => a.localeCompare(b));
    return {
      actors,
      rows: dates.map((date) => {
        const entry: Record<string, string | number> = { date };
        actors.forEach((actor) => {
          const hit = dailyActivityStacked.find((row) => row.date === date && row.actor === actor);
          entry[actor] = hit?.count ?? 0;
        });
        return entry;
      }),
    };
  }, [dailyActivityStacked]);

  const reviewerRepoCards = useMemo(() => {
    const byReviewer: Record<string, { eips: number; ercs: number; rips: number; total: number }> = {};
    OFFICIAL_REVIEWERS.forEach((reviewer) => {
      byReviewer[reviewer] = { eips: 0, ercs: 0, rips: 0, total: 0 };
    });

    repoDistribution.forEach((row) => {
      const reviewer = row.actor;
      if (!byReviewer[reviewer]) return;
      const repoName = (row.repo.split("/")[1] || row.repo || "").toLowerCase();
      if (repoName === "eips") byReviewer[reviewer]!.eips += row.count;
      else if (repoName === "ercs") byReviewer[reviewer]!.ercs += row.count;
      else if (repoName === "rips") byReviewer[reviewer]!.rips += row.count;
      byReviewer[reviewer]!.total += row.count;
    });

    return OFFICIAL_REVIEWERS.map((reviewer) => ({
      actor: reviewer,
      ...byReviewer[reviewer],
    }));
  }, [repoDistribution]);

  const formatEventLabel = (eventType: string) => {
    const normalized = eventType.toLowerCase();
    if (normalized === "reviewed") return "reviewed";
    if (normalized === "commented") return "commented";
    if (normalized === "opened") return "opened PR";
    if (normalized === "closed") return "closed PR";
    if (normalized === "committed") return "committed";
    if (normalized === "merged") return "merged PR";
    return eventType;
  };

  const getActionBadgeClass = (eventType: string) => {
    const normalized = eventType.toLowerCase();
    if (normalized === "reviewed") return "border-emerald-500/35 bg-emerald-500/12 text-emerald-300";
    if (normalized === "commented") return "border-cyan-500/35 bg-cyan-500/12 text-cyan-300";
    if (normalized === "committed") return "border-blue-500/35 bg-blue-500/12 text-blue-300";
    if (normalized === "opened") return "border-violet-500/35 bg-violet-500/12 text-violet-300";
    if (normalized === "closed") return "border-rose-500/35 bg-rose-500/12 text-rose-300";
    if (normalized === "merged") return "border-amber-500/35 bg-amber-500/12 text-amber-300";
    if (normalized === "reopened") return "border-orange-500/35 bg-orange-500/12 text-orange-300";
    return "border-border/60 bg-muted/40 text-foreground/85";
  };

  const formatActivityTime = (actedAt: string) => {
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
  };

  const downloadTrendReport = useCallback(() => {
    const headers = ["Month", ...trendActors];
    const rows = monthlyTrend.map((row) => [row.month, ...trendActors.map((actor) => Number(row[actor] || 0))]);
    downloadCsv(`reviewers-activity-over-time-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }, [monthlyTrend, trendActors]);

  const downloadCyclesReport = useCallback(() => {
    const headers = ["Reviewer Cycles", "PR Count"];
    const rows = cyclesData.map((row) => [row.cycles, row.count]);
    downloadCsv(`reviewers-cycles-per-pr-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }, [cyclesData]);

  const downloadReviewedMonthlyReport = useCallback(() => {
    const headers = ["Month", ...reviewedTrendActors];
    const rows = monthlyReviewedTrend.map((row) => [row.month, ...reviewedTrendActors.map((actor) => Number(row[actor] || 0))]);
    downloadCsv(`reviewers-prs-reviewed-monthly-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }, [monthlyReviewedTrend, reviewedTrendActors]);

  const downloadDailyActivityReport = useCallback(() => {
    const headers = ["Date", ...dailyStackedChartData.actors];
    const rows = dailyStackedChartData.rows.map((row) => [row.date as string, ...dailyStackedChartData.actors.map((actor) => Number(row[actor] || 0))]);
    downloadCsv(`reviewers-daily-activity-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }, [dailyStackedChartData]);

  const downloadRepoDistributionReport = useCallback(() => {
    const headers = ["Reviewer", "EIPs", "ERCs", "RIPs", "Total"];
    const rows = reviewerRepoCards.map((row) => [row.actor, row.eips, row.ercs, row.rips, row.total]);
    downloadCsv(`reviewers-repo-distribution-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }, [reviewerRepoCards]);

  // Filter and sort leaderboard
  const filteredAndSortedLeaderboard = useMemo(() => {
    const filtered = leaderboard.filter((reviewer) =>
      reviewer.actor.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort based on selected metric
    switch (sortBy) {
      case "reviews":
        filtered.sort((a, b) => b.totalReviews - a.totalReviews);
        break;
      case "prs":
        filtered.sort((a, b) => b.prsTouched - a.prsTouched);
        break;
      case "response":
        filtered.sort((a, b) => {
          const aVal = a.medianResponseDays ?? Infinity;
          const bVal = b.medianResponseDays ?? Infinity;
          return aVal - bVal;
        });
        break;
    }

    return filtered;
  }, [leaderboard, searchQuery, sortBy]);

  // Pagination
  const totalPages = Math.ceil(
    filteredAndSortedLeaderboard.length / itemsPerPage
  );
  const validPage = Math.min(currentPage, Math.max(1, totalPages));
  const paginatedLeaderboard = filteredAndSortedLeaderboard.slice(
    (validPage - 1) * itemsPerPage,
    validPage * itemsPerPage
  );

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy]);

  // Export functionality
  useAnalyticsExport(() => {
    const combined: Record<string, unknown>[] = [];
    
    // Leaderboard data
    leaderboard.forEach(r => {
      combined.push({
        type: 'Leaderboard',
        reviewer: r.actor,
        totalReviews: r.totalReviews,
        prsTouched: r.prsTouched,
        medianResponseDays: r.medianResponseDays,
      });
    });
    
    // Review cycles data
    cyclesData.forEach(c => {
      combined.push({
        type: 'Review Cycles',
        cycles: c.cycles,
        count: c.count,
      });
    });
    
    // Repo distribution
    repoDistribution.forEach(r => {
      combined.push({
        type: 'Repo Distribution',
        reviewer: r.actor,
        repo: r.repo,
        count: r.count,
        pct: r.pct,
      });
    });
    
    return combined;
  }, `reviewers-analytics-${repoFilter}-${timeRange}`);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <InlineBrandLoader size="md" label="Loading analytics..." />
      </div>
    );
  }

  const topReviewer = leaderboard[0] ?? null;
  const maxReviews = leaderboard.reduce((m, r) => Math.max(m, r.totalReviews), 0) || 1;
  const medianResponse = (() => {
    const medians = leaderboard.map((r) => r.medianResponseDays).filter((d): d is number => d !== null);
    if (medians.length === 0) return "–";
    return `${Math.round(medians.reduce((a, b) => a + b, 0) / medians.length)}d`;
  })();

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Hero insight */}
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-primary/[0.07] via-card/50 to-card/40 p-5 sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Editorial throughput</p>
        <h2 className="dec-title mt-1.5 text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl">
          {OFFICIAL_REVIEWERS.length} reviewers keeping the EIP pipeline moving
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Official EIP, ERC and RIP reviewers have logged{" "}
          <span className="font-semibold text-foreground">{reviewerTotals.toLocaleString()}</span> review actions in this
          window, with a <span className="font-semibold text-foreground">{medianResponse}</span> median turnaround.
          {topReviewer && (
            <>
              {" "}
              <span className="font-medium text-foreground">{topReviewer.actor}</span> leads with{" "}
              <span className="font-semibold text-foreground">{topReviewer.totalReviews.toLocaleString()}</span> reviews.
            </>
          )}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={Users} accent="emerald" label="Official reviewers" value={String(OFFICIAL_REVIEWERS.length)} sub={`${activeReviewers} active this window`} />
        <StatCard icon={MessageSquare} accent="blue" label="Active reviewers" value={String(activeReviewers)} sub="logged ≥1 action" />
        <StatCard icon={BarChart3} accent="amber" label="Review actions" value={reviewerTotals.toLocaleString()} sub="across EIP/ERC/RIP PRs" />
        <StatCard icon={Clock} accent="violet" label="Median response" value={medianResponse} sub="time to review" />
      </div>

      {/* Reviewer Leaderboard */}
      <div className="rounded-xl border border-border/70 bg-card/60 p-6 backdrop-blur-sm">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Reviewer Leaderboard</h2>
          <LastUpdated timestamp={dataUpdatedAt} />
        </div>

        {/* Filters and Search */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search reviewer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-input bg-background pl-9 pr-4 py-2 text-sm placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "reviews" | "prs" | "response")}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="reviews">Sort by Reviews (High to Low)</option>
            <option value="prs">Sort by PRs Touched (High to Low)</option>
            <option value="response">Sort by Response Time (Low to High)</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/70">
                <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">Rank</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">Reviewer</th>
                <th className="py-3 px-4 text-right text-sm font-medium text-muted-foreground">Reviews</th>
                <th className="py-3 px-4 text-right text-sm font-medium text-muted-foreground">PRs Touched</th>
                <th className="py-3 px-4 text-right text-sm font-medium text-muted-foreground">Median Response</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLeaderboard.map((reviewer, idx) => {
                const actualRank = (validPage - 1) * itemsPerPage + idx + 1;
                return (
                  <tr
                    key={reviewer.actor}
                    className={`border-b border-border/60 transition-colors hover:bg-muted/40 ${actualRank === 1 ? "bg-primary/[0.04]" : ""}`}
                  >
                    <td className="py-3 px-4">
                      {actualRank <= 3 ? (
                        <span className="text-base" title={`Rank ${actualRank}`}>
                          {actualRank === 1 ? "🥇" : actualRank === 2 ? "🥈" : "🥉"}
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-muted-foreground">#{actualRank}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <a
                        href={`/people/${reviewer.actor}`}
                        className="group inline-flex items-center gap-2"
                      >
                        <img
                          src={getGitHubAvatarUrl(reviewer.actor)}
                          alt={`${reviewer.actor} avatar`}
                          className="h-7 w-7 rounded-full border border-border object-cover"
                          loading="lazy"
                        />
                        <span className="font-medium text-foreground/90 group-hover:text-primary group-hover:underline">{reviewer.actor}</span>
                      </a>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <span className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-muted sm:block">
                          <span
                            className="block h-full rounded-full bg-primary"
                            style={{ width: `${Math.max(4, (reviewer.totalReviews / maxReviews) * 100)}%` }}
                          />
                        </span>
                        <span className="w-12 text-right text-sm font-semibold tabular-nums text-foreground">
                          {reviewer.totalReviews.toLocaleString()}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-foreground/85">
                      {reviewer.prsTouched.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-foreground/85">
                      {reviewer.medianResponseDays != null
                        ? `${reviewer.medianResponseDays}d`
                        : "–"}
                    </td>
                  </tr>
                );
              })}
              {paginatedLeaderboard.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                    {searchQuery ? "No reviewers match your search." : "No reviewer data found for the current filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filteredAndSortedLeaderboard.length > 0 && (
          <div className="mt-6 flex items-center justify-between border-t border-border/70 pt-4">
            <div className="text-xs text-muted-foreground">
              Showing {(validPage - 1) * itemsPerPage + 1}–
              {Math.min(validPage * itemsPerPage, filteredAndSortedLeaderboard.length)} of{" "}
              {filteredAndSortedLeaderboard.length} reviewers
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={validPage === 1}
                className="inline-flex items-center gap-1 rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <div className="flex items-center gap-2 px-2 text-sm text-muted-foreground">
                Page {validPage} of {totalPages === 0 ? 1 : totalPages}
              </div>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={validPage === totalPages || totalPages === 0}
                className="inline-flex items-center gap-1 rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Monthly Trend + Cycles per PR */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border/70 bg-card/60 p-6 backdrop-blur-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-foreground">Review Activity Over Time</h2>
            <button onClick={downloadTrendReport} className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs text-foreground/85 hover:bg-muted/60">
              <Download className="h-3.5 w-3.5" />
              Download Reports
            </button>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">All reviewer actions per month; each line is one reviewer.</p>
          <ChartContainer
            config={Object.fromEntries(
              trendActors.map((actor, idx) => [actor, { label: actor, color: chartColor(idx) }])
            )}
            className="h-72 w-full"
          >
            <div className="relative h-full w-full">
              <ResponsiveContainer>
                <LineChart data={monthlyTrend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: CHART_AXIS, fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis tick={{ fill: CHART_AXIS, fontSize: 11 }} tickLine={false} axisLine={false} width={32} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="plainline" />
                  {trendActors.map((actor, idx) => (
                    <Line
                      key={actor}
                      type="monotone"
                      dataKey={actor}
                      stroke={chartColor(idx)}
                      strokeWidth={2}
                      dot={false}
                      name={actor}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-semibold text-foreground/10">EIPsInsight.com</span>
              </div>
            </div>
          </ChartContainer>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Shows trend direction and contributor concentration over time.</p>
            <LastUpdated timestamp={dataUpdatedAt} className="text-xs" />
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-card/60 p-6 backdrop-blur-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-foreground">Review Cycles per PR</h2>
            <button onClick={downloadCyclesReport} className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs text-foreground/85 hover:bg-muted/60">
              <Download className="h-3.5 w-3.5" />
              Download Reports
            </button>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">How many reviewers typically touch each PR before decision.</p>
          <ChartContainer
            config={{
              count: { label: "PRs", color: "#22c55e" },
            }}
            className="h-72 w-full"
          >
            <div className="relative h-full w-full">
              <ResponsiveContainer>
                <BarChart data={cyclesData} margin={{ top: 8, right: 8, left: -12, bottom: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                  <XAxis dataKey="cycles" tick={{ fill: CHART_AXIS, fontSize: 11 }} tickLine={false} axisLine={false} label={{ value: "Reviewers per PR", position: "insideBottom", offset: -8, fill: CHART_AXIS, fontSize: 11 }} />
                  <YAxis tick={{ fill: CHART_AXIS, fontSize: 11 }} tickLine={false} axisLine={false} width={32} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#22c55e" isAnimationActive={false}>
                    {cyclesData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.cycles <= 2 ? "#10b981" : entry.cycles <= 4 ? "#f59e0b" : "#ef4444"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-semibold text-foreground/10">EIPsInsight.com</span>
              </div>
            </div>
          </ChartContainer>
          <p className="mt-2 text-xs text-muted-foreground">
            Distribution of how many reviewers typically review each PR
          </p>
          <div className="mt-2 flex justify-end">
            <LastUpdated timestamp={dataUpdatedAt} className="text-xs" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/70 bg-card/60 p-6 backdrop-blur-sm">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-foreground">PRs Reviewed (Monthly)</h2>
          <button onClick={downloadReviewedMonthlyReport} className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs text-foreground/85 hover:bg-muted/60">
            <Download className="h-3.5 w-3.5" />
            Download Reports
          </button>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">Monthly distinct PRs reviewed by each official reviewer.</p>
        <ChartContainer
          config={Object.fromEntries(
            reviewedTrendActors.map((actor, idx) => [actor, { label: actor, color: chartColor(idx) }])
          )}
          className="h-72 w-full"
        >
          <div className="relative h-full w-full">
            <ResponsiveContainer>
              <LineChart data={monthlyReviewedTrend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey="month" tick={{ fill: CHART_AXIS, fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis tick={{ fill: CHART_AXIS, fontSize: 11 }} tickLine={false} axisLine={false} width={32} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="plainline" />
                {reviewedTrendActors.map((actor, idx) => (
                  <Line
                    key={actor}
                    type="monotone"
                    dataKey={actor}
                    stroke={chartColor(idx)}
                    strokeWidth={2}
                    dot={false}
                    name={actor}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-semibold text-foreground/10">EIPsInsight.com</span>
            </div>
          </div>
        </ChartContainer>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Counts unique PRs, not total review events.</p>
          <LastUpdated timestamp={dataUpdatedAt} className="text-xs" />
        </div>
      </div>

      <div className="rounded-xl border border-border/70 bg-card/60 p-6 backdrop-blur-sm">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-foreground">Daily Reviewer Activity</h2>
          <button onClick={downloadDailyActivityReport} className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs text-foreground/85 hover:bg-muted/60">
            <Download className="h-3.5 w-3.5" />
            Download Reports
          </button>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">Stacked daily actions across official reviewers.</p>
        <ChartContainer
          config={Object.fromEntries(
            dailyStackedChartData.actors.map((actor, idx) => [actor, { label: actor, color: chartColor(idx) }])
          )}
          className="h-72 w-full"
        >
          <div className="relative h-full w-full">
            <ResponsiveContainer>
              <BarChart data={dailyStackedChartData.rows} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey="date" tick={{ fill: CHART_AXIS, fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis tick={{ fill: CHART_AXIS, fontSize: 11 }} tickLine={false} axisLine={false} width={32} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                {dailyStackedChartData.actors.map((actor, idx) => (
                  <Bar
                    key={actor}
                    dataKey={actor}
                    stackId="reviewers"
                    fill={chartColor(idx)}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-semibold text-foreground/10">EIPsInsight.com</span>
            </div>
          </div>
        </ChartContainer>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Useful for spotting bursts, pauses, and reviewer load balance by day.</p>
          <LastUpdated timestamp={dataUpdatedAt} className="text-xs" />
        </div>
      </div>

      {/* Top Reviewers by Repo */}
      <div className="rounded-xl border border-border/70 bg-card/60 p-6 backdrop-blur-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Reviewers Repository Distribution</h2>
          <div className="inline-flex rounded-md border border-border/70 bg-muted/30 p-1">
            <button
              onClick={() => setRepoDistributionView("cards")}
              aria-label="Cards view"
              title="Cards view"
              className={`rounded p-1.5 transition-colors ${repoDistributionView === "cards" ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setRepoDistributionView("graph")}
              aria-label="Graph view"
              title="Graph view"
              className={`rounded p-1.5 transition-colors ${repoDistributionView === "graph" ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <BarChart3 className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Breakdown of reviewer contributions by repository family.</p>
          <button onClick={downloadRepoDistributionReport} className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs text-foreground/85 hover:bg-muted/60">
            <Download className="h-3.5 w-3.5" />
            Download Reports
          </button>
        </div>

        {repoDistributionView === "cards" ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            {reviewerRepoCards.map((card) => {
              const total = card.total || 0;
              const eipsPct = total > 0 ? Math.round((card.eips / total) * 100) : 0;
              const ercsPct = total > 0 ? Math.round((card.ercs / total) * 100) : 0;
              const ripsPct = total > 0 ? Math.round((card.rips / total) * 100) : 0;
              return (
                <div key={card.actor} className="rounded-lg border border-border/60 bg-background/35 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img
                        src={getGitHubAvatarUrl(card.actor)}
                        alt={`${card.actor} avatar`}
                        className="h-9 w-9 rounded-full border border-border object-cover"
                        loading="lazy"
                      />
                      <p className="text-sm font-semibold text-foreground">{card.actor}</p>
                    </div>
                    <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {total} total
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-foreground">EIPs</span>
                        <span className="text-muted-foreground">{eipsPct}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted/40">
                        <div className="h-2 rounded-full bg-cyan-400" style={{ width: `${eipsPct}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-foreground">ERCs</span>
                        <span className="text-muted-foreground">{ercsPct}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted/40">
                        <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${ercsPct}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-foreground">RIPs</span>
                        <span className="text-muted-foreground">{ripsPct}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted/40">
                        <div className="h-2 rounded-full bg-rose-400" style={{ width: `${ripsPct}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <ChartContainer
            config={Object.fromEntries(
              OFFICIAL_REVIEWERS.map((reviewer, idx) => [
                reviewer,
                { label: reviewer, color: chartColor(idx) },
              ])
            )}
            className="h-64 w-full"
          >
            <div className="relative h-full w-full">
              <ResponsiveContainer>
                <BarChart data={reviewerRepoStackedData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                  <XAxis dataKey="repo" tick={{ fill: CHART_AXIS, fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: CHART_AXIS, fontSize: 11 }} tickLine={false} axisLine={false} width={32} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  {OFFICIAL_REVIEWERS.map((reviewer, idx) => (
                    <Bar
                      key={reviewer}
                      dataKey={reviewer}
                      stackId="reviewers"
                      fill={chartColor(idx)}
                      radius={[2, 2, 0, 0]}
                      isAnimationActive={false}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-semibold text-foreground/10">EIPsInsight.com</span>
              </div>
            </div>
          </ChartContainer>
        )}
        <div className="mt-3 flex justify-end">
          <LastUpdated timestamp={dataUpdatedAt} className="text-xs" />
        </div>
      </div>

      <div className="rounded-xl border border-border/70 bg-card/60 backdrop-blur-sm">
        <div className="border-b border-border/70 px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Recent Activities</h2>
          <p className="mt-1 text-sm text-muted-foreground">Live feed</p>
        </div>
        <div className="border-b border-border/70 px-5 py-3">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <select
              value={activityRepoFilter}
              onChange={(e) => {
                setActivityRepoFilter(e.target.value);
                setVisibleActivityCount(20);
              }}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
              aria-label="Filter activity by repository"
            >
              <option value="all">All Repositories</option>
              {activityRepoOptions.map((repo) => (
                <option key={repo} value={repo}>
                  {repo}
                </option>
              ))}
            </select>
            <select
              value={activityEditorFilter}
              onChange={(e) => {
                setActivityEditorFilter(e.target.value);
                setVisibleActivityCount(20);
              }}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
              aria-label="Filter activity by reviewer"
            >
              <option value="all">All Reviewers</option>
              {activityEditorOptions.map((reviewer) => (
                <option key={reviewer} value={reviewer}>
                  {reviewer}
                </option>
              ))}
            </select>
            <select
              value={activityActionFilter}
              onChange={(e) => {
                setActivityActionFilter(e.target.value);
                setVisibleActivityCount(20);
              }}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
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
                      <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${getActionBadgeClass(row.eventType)}`}>
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
                  onClick={() => setExpandedActivityKeys((prev) => ({ ...prev, [key]: !prev[key] }))}
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
                        <a href={row.eventUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
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
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              No reviewer actions found for current filters.
            </div>
          )}
        </div>
        {hasMoreActivities && (
          <div className="border-t border-border/60 px-5 py-3">
            <button
              onClick={() => setVisibleActivityCount((count) => count + 20)}
              className="inline-flex h-9 items-center rounded-md border border-border bg-muted/40 px-3 text-sm text-foreground/85 hover:bg-muted/60"
            >
              Show more
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
