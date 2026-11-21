"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useAnalytics, useAnalyticsExport } from "../analytics-layout-client";
import { client } from "@/lib/orpc";
import { BrandLoader } from "@/components/brand-loader";
import { AnalyticsHero } from "@/components/analytics/stat-card";
import { LastUpdated } from "@/components/analytics/LastUpdated";
import { CANONICAL_EIP_EDITORS } from "@/data/eip-contributor-roles";
import {
  Trophy,
  SlidersHorizontal,
  Grid3x3,
  TrendingUp,
  AlertCircle,
  Download,
  Info,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

import {
  EditorLeaderboardRow,
  CategoryCoverage,
  RepoDistribution,
  MonthlyTrendPoint,
  DailyActivityStackedRow,
  OFFICIAL_EDITOR_HANDLES,
  getTimeWindow,
} from "./_components/types";
import { EditorsKpiBar } from "./_components/editors-kpi-bar";
import { EditorsLeaderboardTab } from "./_components/editors-leaderboard-tab";
import { EditorsActivityTab } from "./_components/editors-activity-tab";
import { EditorsCoverageTab } from "./_components/editors-coverage-tab";
import { EditorsTrendsTab } from "./_components/editors-trends-tab";

type TabId = "leaderboard" | "explorer" | "coverage" | "trends";

export default function EditorsAnalyticsPage() {
  const { timeRange, repoFilter, customFromMonth, customToMonth } = useAnalytics();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataUpdatedAt, setDataUpdatedAt] = useState<Date>(new Date());

  // Active tab state
  const [activeTab, setActiveTab] = useState<TabId>("leaderboard");
  const [selectedActorForExplorer, setSelectedActorForExplorer] = useState<string>("");

  // Data states
  const [leaderboard, setLeaderboard] = useState<EditorLeaderboardRow[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrendPoint[]>([]);
  const [monthlyReviewedTrend, setMonthlyReviewedTrend] = useState<MonthlyTrendPoint[]>([]);
  const [categoryCoverage, setCategoryCoverage] = useState<CategoryCoverage[]>([]);
  const [repoDistribution, setRepoDistribution] = useState<RepoDistribution[]>([]);
  const [dailyActivityStacked, setDailyActivityStacked] = useState<DailyActivityStackedRow[]>([]);

  // Export & Membership states
  const [exporting, setExporting] = useState(false);
  const [downloadingActor, setDownloadingActor] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const isPaidMember = true;

  const repoParam = repoFilter === "all" ? undefined : repoFilter;
  const { from, to } = useMemo(
    () => getTimeWindow(timeRange, customFromMonth, customToMonth),
    [timeRange, customFromMonth, customToMonth],
  );

  const leaderboardLabel = useMemo(() => {
    if (timeRange === "all") return "All-Time Contributions";
    if (timeRange === "this_month") return "This Month";
    if (timeRange === "7d") return "Last 7 Days";
    if (timeRange === "15d") return "Last 15 Days";
    if (timeRange === "30d") return "Last 30 Days";
    if (timeRange === "90d") return "Last 90 Days";
    if (timeRange === "1y") return "Last 1 Year";
    if (timeRange === "custom") {
      if (customFromMonth && customToMonth) return `${customFromMonth} to ${customToMonth}`;
      if (customFromMonth) return `From ${customFromMonth}`;
      if (customToMonth) return `Until ${customToMonth}`;
    }
    return "Selected Range";
  }, [timeRange, customFromMonth, customToMonth]);

  // Main data fetch without heavy 1,200-row payload
  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const months = 72;
        const [leaderboardRows, trendData, reviewedTrendData, categoryData, repoData, dailyStackedData] =
          await Promise.all([
            client.analytics.getEditorsLeaderboard({
              repo: repoParam,
              from,
              to,
              limit: 30,
            }),
            client.analytics.getEditorsMonthlyTrend({
              repo: repoParam,
              months,
              from,
              to,
            }),
            client.analytics.getEditorsMonthlyReviewedPRs({
              repo: repoParam,
              months,
              from,
              to,
            }),
            client.analytics.getEditorsByCategory({
              repo: repoParam,
              from,
              to,
            }),
            client.analytics.getEditorsRepoDistribution({
              repo: repoParam,
              from,
              to,
            }),
            client.analytics.getEditorDailyActivityStacked({
              repo: repoParam,
              from,
              to,
            }),
          ]);

        if (cancelled) return;

        setLeaderboard(leaderboardRows);
        setMonthlyTrend(trendData);
        setMonthlyReviewedTrend(reviewedTrendData);
        setCategoryCoverage(categoryData);
        setRepoDistribution(repoData);
        setDailyActivityStacked(dailyStackedData);

        const latestUpdated = leaderboardRows
          .map((row) => row.updatedAt)
          .filter((v): v is string => Boolean(v))
          .sort()
          .at(-1);

        if (latestUpdated) {
          setDataUpdatedAt(new Date(latestUpdated));
        } else if (dailyStackedData.length > 0) {
          setDataUpdatedAt(new Date(`${dailyStackedData[dailyStackedData.length - 1]!.date}T00:00:00.000Z`));
        } else {
          setDataUpdatedAt(new Date());
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load editor analytics:", err);
        setError("Failed to load editor analytics. Please try refreshing.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [repoParam, from, to]);

  // Derived metrics
  const totalActions = useMemo(
    () => leaderboard.reduce((sum, e) => sum + e.totalActions, 0),
    [leaderboard],
  );
  const totalReviews = useMemo(
    () => leaderboard.reduce((sum, e) => sum + e.reviews, 0),
    [leaderboard],
  );
  const activeEditors = useMemo(
    () => leaderboard.filter((e) => e.totalActions > 0).length,
    [leaderboard],
  );

  const avgResponseDays = useMemo(() => {
    const medians = leaderboard.map((e) => e.medianResponseDays).filter((d): d is number => d !== null);
    if (medians.length === 0) return null;
    return medians.reduce((a, b) => a + b, 0) / medians.length;
  }, [leaderboard]);

  const categoryData = useMemo(() => {
    return categoryCoverage
      .map((entry) => ({
        category: entry.category.charAt(0).toUpperCase() + entry.category.slice(1),
        count: entry.actors.length,
        actors: entry.actors,
      }))
      .filter((c) => c.count > 0);
  }, [categoryCoverage]);

  const categoriesByActor = useMemo(() => {
    const map: Record<string, string[]> = {};
    OFFICIAL_EDITOR_HANDLES.forEach((actor) => {
      map[actor] = [];
    });
    categoryCoverage.forEach((entry) => {
      const catLabel = entry.category.charAt(0).toUpperCase() + entry.category.slice(1);
      entry.actors.forEach((actor) => {
        if (!map[actor]) map[actor] = [];
        if (!map[actor].includes(catLabel)) {
          map[actor].push(catLabel);
        }
      });
    });
    return map;
  }, [categoryCoverage]);

  const thinCoverageCategories = useMemo(
    () => categoryData.filter((entry) => entry.count <= 1).map((entry) => entry.category),
    [categoryData],
  );

  // Full Leaderboard CSV Export
  const downloadLeaderboardCSV = useCallback(async () => {
    if (!isPaidMember) {
      setShowUpgradeModal(true);
      return;
    }
    setExporting(true);
    try {
      const exportResult = await client.analytics.getEditorsLeaderboardExport({
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
      setError("Leaderboard CSV export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }, [repoParam, from, to, isPaidMember]);

  // Per-editor report download
  const downloadEditorReport = useCallback(
    async (actor: string) => {
      if (!isPaidMember) {
        setShowUpgradeModal(true);
        return;
      }
      setDownloadingActor(actor);
      try {
        const exportResult = await client.analytics.getEditorsLeaderboardExport({
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
        setDownloadingActor(null);
      }
    },
    [repoParam, from, to, isPaidMember],
  );

  // Handler to inspect editor actions (switches tab smoothly to Explorer)
  const handleInspectActor = useCallback((actor: string) => {
    setSelectedActorForExplorer(actor);
    setActiveTab("explorer");
    const el = document.getElementById("editors-tab-content");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  // Global analytics layout export integration
  useAnalyticsExport(() => {
    const combined: Record<string, unknown>[] = [];
    leaderboard.forEach((e) => {
      combined.push({
        type: "Leaderboard",
        editor: e.actor,
        totalActions: e.totalActions,
        totalReviews: e.reviews,
        totalComments: e.comments,
        prsTouched: e.prsTouched,
        medianResponseDays: e.medianResponseDays,
      });
    });
    repoDistribution.forEach((r) => {
      combined.push({
        type: "Repo Distribution",
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
      <BrandLoader
        title="Analyzing Editor Contributions"
        description="Compiling rankings, review metrics, turnaround latency, and category coverage across Ethereum standards..."
        minHeight="min-h-[460px]"
      />
    );
  }

  const TABS = [
    {
      id: "leaderboard" as const,
      label: "Rankings & Directory",
      icon: Trophy,
      count: leaderboard.length,
    },
    {
      id: "explorer" as const,
      label: "PR & Action Explorer",
      icon: SlidersHorizontal,
    },
    {
      id: "coverage" as const,
      label: "Category Coverage",
      icon: Grid3x3,
      count: categoryData.length,
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

      {/* Hero Header */}
      <AnalyticsHero eyebrow="Editorial Governance" title="The Editors Shaping Ethereum Standards">
        {OFFICIAL_EDITOR_HANDLES.length} canonical EIP editors have completed{" "}
        <strong className="text-foreground">{totalActions.toLocaleString()}</strong> indexed actions and{" "}
        <strong className="text-foreground">{totalReviews.toLocaleString()}</strong> PR reviews in this window (
        {leaderboardLabel}), with <strong className="text-foreground">{activeEditors}</strong> actively reviewing.
        {thinCoverageCategories.length > 0 ? (
          <>
            {" "}
            Coverage runs thin in{" "}
            <span className="font-semibold text-rose-500">{thinCoverageCategories.length} categories</span>.
          </>
        ) : (
          " All major proposal categories maintain active coverage."
        )}
      </AnalyticsHero>

      {/* Top 5 KPI Stat Cards */}
      <EditorsKpiBar
        totalActions={totalActions}
        activeEditors={activeEditors}
        totalEditors={OFFICIAL_EDITOR_HANDLES.length}
        totalReviews={totalReviews}
        avgResponseDays={avgResponseDays}
        totalCategories={categoryData.length}
        thinCategoriesCount={thinCoverageCategories.length}
      />

      {/* Segmented Tab Navigation Bar */}
      <div className="border-b border-border/70 pb-2">
        <div
          role="tablist"
          aria-label="Editor analytics views"
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

      {/* Main Tab Content */}
      <div id="editors-tab-content" className="min-w-0">
        {activeTab === "leaderboard" && (
          <EditorsLeaderboardTab
            leaderboard={leaderboard}
            categoriesByActor={categoriesByActor}
            repoDistribution={repoDistribution}
            onInspectActor={handleInspectActor}
            onExportCSV={downloadLeaderboardCSV}
            onExportActorReport={downloadEditorReport}
            exporting={exporting}
            downloadingActor={downloadingActor}
            leaderboardLabel={leaderboardLabel}
          />
        )}

        {activeTab === "explorer" && (
          <EditorsActivityTab
            repo={repoParam as "eips" | "ercs" | "rips" | undefined}
            from={from}
            to={to}
            actors={OFFICIAL_EDITOR_HANDLES}
            selectedActor={selectedActorForExplorer}
            onActorChange={setSelectedActorForExplorer}
            dailyActivityStacked={dailyActivityStacked}
          />
        )}

        {activeTab === "coverage" && (
          <EditorsCoverageTab
            categoryData={categoryData}
            categoryCoverage={categoryCoverage}
            thinCoverageCategories={thinCoverageCategories}
            onSelectEditor={handleInspectActor}
          />
        )}

        {activeTab === "trends" && (
          <EditorsTrendsTab
            monthlyTrend={monthlyTrend}
            monthlyReviewedTrend={monthlyReviewedTrend}
            dataUpdatedAt={dataUpdatedAt}
          />
        )}
      </div>

      {/* Methodology Accordion & Meta Footer */}
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
                <strong>Editorial Handles:</strong> Tracked against canonical Ethereum EIP editors and associates defined in EIP-1.
              </p>
              <p>
                <strong>Date Scoping:</strong> Events are indexed by normalized action occurrence time (when reviews or comments were submitted), matching live maintainer throughput.
              </p>
              <p>
                <strong>Turnaround Speed:</strong> Median elapsed time measured from PR creation to the first editorial review or decision.
              </p>
            </div>
          </details>

          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px]">Scope: {leaderboardLabel}</span>
            <span className="h-3 w-px bg-border" />
            <LastUpdated timestamp={dataUpdatedAt} prefix="Updated" showAbsolute className="bg-muted/40 text-xs" />
          </div>
        </div>
      </div>

      {/* Upgrade Modal for CSV Exports */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border/70 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl animate-fade-in">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500 shrink-0">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Unlock Full Analytics Export</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Download complete raw CSV datasets across editors, categories, and monthly velocity.
                </p>
              </div>
            </div>

            <div className="bg-muted/40 rounded-lg p-3.5 mb-4 text-xs space-y-1.5 text-foreground/85 border border-border/50">
              <p className="font-semibold text-foreground mb-1">Included with Pro &amp; Enterprise:</p>
              <p className="flex items-center gap-1.5">✓ Unlimited CSV exports for all analytics views</p>
              <p className="flex items-center gap-1.5">✓ Full API access (50k requests/month)</p>
              <p className="flex items-center gap-1.5">✓ Historical EIP velocity datasets</p>
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted/60 transition-colors text-xs font-semibold cursor-pointer"
              >
                Dismiss
              </button>
              <Link
                href="/pricing"
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-xs font-semibold text-center cursor-pointer"
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
