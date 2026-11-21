"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useAnalytics, useAnalyticsExport } from "../analytics-layout-client";
import { client } from "@/lib/orpc";
import {
  Users,
  Clock,
  GitPullRequest,
  AlertCircle,
  Download,
  Info,
  ChevronDown,
  BarChart3,
  Layers,
  TrendingUp,
  FolderGit2,
} from "lucide-react";
import { InlineBrandLoader } from "@/components/inline-brand-loader";
import { cn } from "@/lib/utils";

import {
  ReviewerLeaderboardRow,
  CyclesData,
  RepoDistribution,
  MonthlyTrendPoint,
  DailyActivityStackedRow,
  ReviewerActionDetailRow,
  OFFICIAL_REVIEWERS,
  getTimeWindow,
} from "./_components/types";
import { ReviewersKpiBar } from "./_components/reviewers-kpi-bar";
import { ReviewersLeaderboardTab } from "./_components/reviewers-leaderboard-tab";
import { ReviewersActivityTab } from "./_components/reviewers-activity-tab";
import { ReviewersDistributionTab } from "./_components/reviewers-distribution-tab";
import { ReviewersTrendsTab } from "./_components/reviewers-trends-tab";

type TabId = "leaderboard" | "explorer" | "distribution" | "trends";

export default function ReviewersAnalyticsPage() {
  const { timeRange, repoFilter, customFromMonth, customToMonth } = useAnalytics();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataUpdatedAt, setDataUpdatedAt] = useState<Date>(new Date());

  // Active tab state
  const [activeTab, setActiveTab] = useState<TabId>("leaderboard");

  // Selected reviewer for drill-down into explorer
  const [selectedReviewerForExplorer, setSelectedReviewerForExplorer] = useState<string | undefined>(
    undefined,
  );

  // Raw data from procedures
  const [leaderboard, setLeaderboard] = useState<ReviewerLeaderboardRow[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrendPoint[]>([]);
  const [monthlyReviewedTrend, setMonthlyReviewedTrend] = useState<MonthlyTrendPoint[]>([]);
  const [cyclesData, setCyclesData] = useState<CyclesData[]>([]);
  const [repoDistribution, setRepoDistribution] = useState<RepoDistribution[]>([]);
  const [dailyActivityStacked, setDailyActivityStacked] = useState<DailyActivityStackedRow[]>([]);
  const [reviewerActionDetails, setReviewerActionDetails] = useState<ReviewerActionDetailRow[]>([]);

  const repoParam = repoFilter === "all" ? undefined : repoFilter;
  const { from, to } = getTimeWindow(timeRange, customFromMonth, customToMonth);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const months =
          timeRange === "7d" || timeRange === "15d"
            ? 3
            : timeRange === "30d"
              ? 6
              : timeRange === "90d"
                ? 12
                : 24;

        const [
          leaderboardData,
          trendData,
          reviewedTrendData,
          cyclesDataRes,
          repoData,
          dailyData,
          actionDetails,
        ] = await Promise.all([
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

        if (cancelled) return;

        setLeaderboard(leaderboardData.filter((row) => OFFICIAL_REVIEWERS.includes(row.actor)));
        setMonthlyTrend(trendData);
        setMonthlyReviewedTrend(reviewedTrendData);
        setCyclesData(cyclesDataRes);
        setRepoDistribution(repoData.filter((row) => OFFICIAL_REVIEWERS.includes(row.actor)));
        setDailyActivityStacked(dailyData);
        setReviewerActionDetails(actionDetails);
        setDataUpdatedAt(new Date());
      } catch (err) {
        console.error("Failed to fetch reviewer analytics:", err);
        setError("Failed to load reviewer analytics. Please try refreshing.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [repoParam, from, to, timeRange]);

  // Derived metrics
  const totalReviews = useMemo(
    () => leaderboard.reduce((sum, r) => sum + r.totalReviews, 0),
    [leaderboard],
  );

  const totalPrsTouched = useMemo(
    () => leaderboard.reduce((sum, r) => sum + r.prsTouched, 0),
    [leaderboard],
  );

  const activeReviewers = useMemo(
    () => leaderboard.filter((r) => r.totalReviews > 0).length,
    [leaderboard],
  );

  const avgResponseDays = useMemo(() => {
    const medians = leaderboard
      .map((r) => r.medianResponseDays)
      .filter((d): d is number => d !== null);
    if (medians.length === 0) return null;
    return medians.reduce((a, b) => a + b, 0) / medians.length;
  }, [leaderboard]);

  const handleSelectReviewer = useCallback((actor: string) => {
    setSelectedReviewerForExplorer(actor);
    setActiveTab("explorer");
  }, []);

  // Export functionality
  useAnalyticsExport(() => {
    const combined: Record<string, unknown>[] = [];
    leaderboard.forEach((r) => {
      combined.push({
        type: "Leaderboard",
        reviewer: r.actor,
        totalReviews: r.totalReviews,
        prsTouched: r.prsTouched,
        medianResponseDays: r.medianResponseDays,
      });
    });
    cyclesData.forEach((c) => {
      combined.push({
        type: "Review Cycles",
        cycles: c.cycles,
        count: c.count,
      });
    });
    repoDistribution.forEach((r) => {
      combined.push({
        type: "Repo Distribution",
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
      <div className="flex min-h-[420px] items-center justify-center">
        <InlineBrandLoader size="md" label="Loading reviewer analytics..." />
      </div>
    );
  }

  const TABS = [
    {
      id: "leaderboard" as const,
      label: "Leaderboard Graph",
      icon: BarChart3,
      count: leaderboard.length,
    },
    {
      id: "explorer" as const,
      label: "PR & Action Explorer",
      icon: GitPullRequest,
    },
    {
      id: "distribution" as const,
      label: "Repo Distribution",
      icon: FolderGit2,
      count: 3,
    },
    {
      id: "trends" as const,
      label: "Velocity & Trends",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Top KPI Stat Cards */}
      <ReviewersKpiBar
        activeReviewers={activeReviewers}
        totalReviewers={OFFICIAL_REVIEWERS.length}
        totalReviews={totalReviews}
        totalPrsTouched={totalPrsTouched}
        avgResponseDays={avgResponseDays}
      />

      {/* Segmented Tab Navigation Bar */}
      <div className="border-b border-border/70 pb-2">
        <div
          role="tablist"
          aria-label="Reviewer analytics views"
          className="flex items-center gap-1.5 overflow-x-auto scrollbar-none"
        >
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all whitespace-nowrap cursor-pointer",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {"count" in tab && tab.count !== undefined && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.2 text-[10px] font-mono",
                      active
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Panels */}
      <div id="reviewers-tab-content" className="min-w-0">
        {activeTab === "leaderboard" && (
          <ReviewersLeaderboardTab
            leaderboard={leaderboard}
            dataUpdatedAt={dataUpdatedAt}
            onSelectReviewer={handleSelectReviewer}
          />
        )}

        {activeTab === "explorer" && (
          <ReviewersActivityTab
            reviewerActionDetails={reviewerActionDetails}
            selectedReviewer={selectedReviewerForExplorer}
            onSelectReviewer={setSelectedReviewerForExplorer}
          />
        )}

        {activeTab === "distribution" && (
          <ReviewersDistributionTab
            repoDistribution={repoDistribution}
            cyclesData={cyclesData}
            onSelectReviewer={handleSelectReviewer}
          />
        )}

        {activeTab === "trends" && (
          <ReviewersTrendsTab
            monthlyTrend={monthlyTrend}
            monthlyReviewedTrend={monthlyReviewedTrend}
            dailyActivityStacked={dailyActivityStacked}
            dataUpdatedAt={dataUpdatedAt}
          />
        )}
      </div>

      {/* Methodology Accordion */}
      <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <details className="group">
            <summary className="inline-flex items-center gap-1.5 cursor-pointer rounded-md border border-border/70 bg-background/60 px-2.5 py-1 text-xs text-foreground/85 hover:bg-muted/60 transition-colors">
              <Info className="h-3.5 w-3.5 text-primary" />
              <span>Methodology &amp; Scope Details</span>
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
            </summary>
            <div className="mt-2.5 max-w-2xl rounded-lg border border-border/60 bg-background/80 p-3 text-xs text-muted-foreground space-y-1.5">
              <p>
                <strong>Official Reviewers:</strong> Tracked against canonical Ethereum EIP reviewers who actively review and triage proposals across EIPs, ERCs, and RIPs.
              </p>
              <p>
                <strong>Review Events:</strong> Counts distinct PR review submissions, approvals, requested changes, and triage comments recorded on proposal pull requests.
              </p>
              <p>
                <strong>Turnaround Latency:</strong> Median elapsed days from PR creation until the first official reviewer inspection.
              </p>
            </div>
          </details>

          <span className="font-mono text-[11px]">
            Updated {dataUpdatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>
    </div>
  );
}
