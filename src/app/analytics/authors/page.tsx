"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAnalytics, useAnalyticsExport } from "../analytics-layout-client";
import { client } from "@/lib/orpc";
import { AlertCircle, Download, FileText, Repeat2, Sparkles, Users } from "lucide-react";
import { LastUpdated } from "@/components/analytics/LastUpdated";
import ReactECharts from "echarts-for-react";
import { InlineBrandLoader } from "@/components/inline-brand-loader";

interface AuthorKPIs {
  totalAuthors: number;
  newAuthors: number;
  repeatAuthors: number;
  proposalsAuthored: number;
  authorsWithMerged: number;
  prsCreated: number;
  eipsAuthored: number;
}

interface AuthorCohortTimelinePoint {
  month: string;
  activeAuthors: number;
  newAuthors: number;
  returningAuthors: number;
  proposalsAuthored: number;
}

interface AuthorRepoCompositionRow {
  repo: string;
  uniqueAuthors: number;
  repeatAuthors: number;
  proposals: number;
}

interface TopAuthorRow {
  author: string;
  prsCreated: number;
  prsMerged: number;
  prsOpen: number;
  prsClosed: number;
  avgTimeToMerge: number | null;
  firstSeen: string | null;
  lastActivity: string | null;
  topRepo: string | null;
}

function getTimeWindow(timeRange: string): { from: string | undefined; to: string | undefined } {
  const now = new Date();
  const to = now.toISOString().split("T")[0];

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

  return { from: from.toISOString().split("T")[0], to };
}

function getGitHubAvatarUrl(handle: string): string {
  return `https://github.com/${handle}.png?size=80`;
}

function labelRepo(repo: string | null | undefined): string {
  if (!repo) return "Unknown";
  const key = repo.toLowerCase();
  if (key === "eips") return "EIPs";
  if (key === "ercs") return "ERCs";
  if (key === "rips") return "RIPs";
  return repo.toUpperCase();
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

export default function AuthorsAnalyticsPage() {
  const { timeRange, repoFilter } = useAnalytics();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataUpdatedAt, setDataUpdatedAt] = useState<Date>(new Date());

  const [kpis, setKPIs] = useState<AuthorKPIs | null>(null);
  const [cohortTimeline, setCohortTimeline] = useState<AuthorCohortTimelinePoint[]>([]);
  const [repoComposition, setRepoComposition] = useState<AuthorRepoCompositionRow[]>([]);
  const [topAuthors, setTopAuthors] = useState<TopAuthorRow[]>([]);

  const repoParam = repoFilter === "all" ? undefined : repoFilter;
  const { from, to } = getTimeWindow(timeRange);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const months = timeRange === "all" ? undefined : timeRange === "7d" ? 3 : timeRange === "30d" ? 6 : timeRange === "90d" ? 12 : 24;

        const [kpisData, cohortData, repoData, topData] = await Promise.all([
          client.analytics.getAuthorKPIs({
            repo: repoParam,
            from,
            to,
          }),
          client.analytics.getAuthorCohortTimeline({
            repo: repoParam,
            from,
            to,
            months,
          }),
          client.analytics.getAuthorRepoComposition({
            repo: repoParam,
            from,
            to,
          }),
          client.analytics.getTopAuthors({
            repo: repoParam,
            from,
            to,
            limit: 50,
          }),
        ]);

        setKPIs(kpisData);
        setCohortTimeline(cohortData);
        setRepoComposition(repoData);
        setTopAuthors(topData);
        setDataUpdatedAt(new Date());
      } catch (fetchError) {
        console.error("Failed to fetch author analytics:", fetchError);
        setError("Failed to load author analytics. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timeRange, repoFilter, repoParam, from, to]);

  const topAuthorCards = useMemo(() => topAuthors.slice(0, 6), [topAuthors]);
  const oneTimeAuthors = useMemo(() => Math.max(0, (kpis?.totalAuthors ?? 0) - (kpis?.repeatAuthors ?? 0)), [kpis]);
  const concentrationTop10Pct = useMemo(() => {
    if (!kpis?.proposalsAuthored || kpis.proposalsAuthored === 0) return 0;
    const top10Total = topAuthors.slice(0, 10).reduce((sum, row) => sum + row.prsCreated, 0);
    return (top10Total / kpis.proposalsAuthored) * 100;
  }, [kpis, topAuthors]);

  const outcomeRows = useMemo(() => topAuthors.slice(0, 10), [topAuthors]);

  const cohortTrendOption = useMemo(() => ({
    backgroundColor: "transparent",
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: {
      top: 0,
      textStyle: { color: "var(--muted-foreground)", fontSize: 11 },
    },
    grid: { top: 36, left: 28, right: 20, bottom: 28 },
    xAxis: {
      type: "category",
      data: cohortTimeline.map((row) => row.month),
      axisLabel: { color: "var(--muted-foreground)", fontSize: 11 },
      axisLine: { lineStyle: { color: "rgba(148,163,184,0.25)" } },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "var(--muted-foreground)", fontSize: 11 },
      splitLine: { lineStyle: { color: "rgba(148,163,184,0.15)", type: "dashed" } },
    },
    series: [
      {
        name: "New Authors",
        type: "bar",
        stack: "authors",
        itemStyle: { color: "#22d3ee", borderRadius: [4, 4, 0, 0] },
        data: cohortTimeline.map((row) => row.newAuthors),
      },
      {
        name: "Returning Authors",
        type: "bar",
        stack: "authors",
        itemStyle: { color: "#60a5fa", borderRadius: [4, 4, 0, 0] },
        data: cohortTimeline.map((row) => row.returningAuthors),
      },
      {
        name: "Proposals Authored",
        type: "line",
        smooth: true,
        symbol: "none",
        lineStyle: { color: "#fbbf24", width: 2 },
        data: cohortTimeline.map((row) => row.proposalsAuthored),
      },
    ],
  }), [cohortTimeline]);

  const repoCompositionOption = useMemo(() => ({
    backgroundColor: "transparent",
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: {
      top: 0,
      textStyle: { color: "var(--muted-foreground)", fontSize: 11 },
    },
    grid: { top: 36, left: 28, right: 20, bottom: 28 },
    xAxis: {
      type: "category",
      data: repoComposition.map((row) => labelRepo(row.repo)),
      axisLabel: { color: "var(--muted-foreground)", fontSize: 11 },
      axisLine: { lineStyle: { color: "rgba(148,163,184,0.25)" } },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "var(--muted-foreground)", fontSize: 11 },
      splitLine: { lineStyle: { color: "rgba(148,163,184,0.15)", type: "dashed" } },
    },
    series: [
      {
        name: "Unique Authors",
        type: "bar",
        itemStyle: { color: "#22d3ee", borderRadius: [4, 4, 0, 0] },
        data: repoComposition.map((row) => row.uniqueAuthors),
      },
      {
        name: "Repeat Authors",
        type: "bar",
        itemStyle: { color: "#10b981", borderRadius: [4, 4, 0, 0] },
        data: repoComposition.map((row) => row.repeatAuthors),
      },
    ],
  }), [repoComposition]);

  const downloadCohortReport = useCallback(() => {
    const headers = ["Month", "Active Authors", "New Authors", "Returning Authors", "Proposals Authored"];
    const rows = cohortTimeline.map((row) => [row.month, row.activeAuthors, row.newAuthors, row.returningAuthors, row.proposalsAuthored]);
    downloadCsv(`authors-cohort-timeline-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }, [cohortTimeline]);

  const downloadRepoCompositionReport = useCallback(() => {
    const headers = ["Repository", "Unique Authors", "Repeat Authors", "Proposals"];
    const rows = repoComposition.map((row) => [labelRepo(row.repo), row.uniqueAuthors, row.repeatAuthors, row.proposals]);
    downloadCsv(`authors-repo-composition-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }, [repoComposition]);

  const downloadOutcomesReport = useCallback(() => {
    const headers = ["Author", "Proposals Authored", "Merged", "Open", "Closed (Unmerged)", "Median Time to Merge (days)", "First Seen", "Last Activity", "Top Repo"];
    const rows = topAuthors.map((row) => [
      row.author,
      row.prsCreated,
      row.prsMerged,
      row.prsOpen,
      row.prsClosed,
      row.avgTimeToMerge ?? "",
      row.firstSeen ?? "",
      row.lastActivity ?? "",
      labelRepo(row.topRepo),
    ]);
    downloadCsv(`authors-directory-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }, [topAuthors]);

  useAnalyticsExport(() => {
    const combined: Record<string, unknown>[] = [];

    if (kpis) {
      combined.push({
        type: "KPIs",
        totalAuthors: kpis.totalAuthors,
        newAuthors: kpis.newAuthors,
        repeatAuthors: kpis.repeatAuthors,
        proposalsAuthored: kpis.proposalsAuthored,
        authorsWithMerged: kpis.authorsWithMerged,
      });
    }

    cohortTimeline.forEach((row) => {
      combined.push({
        type: "Cohort Timeline",
        month: row.month,
        activeAuthors: row.activeAuthors,
        newAuthors: row.newAuthors,
        returningAuthors: row.returningAuthors,
        proposalsAuthored: row.proposalsAuthored,
      });
    });

    repoComposition.forEach((row) => {
      combined.push({
        type: "Repo Composition",
        repo: labelRepo(row.repo),
        uniqueAuthors: row.uniqueAuthors,
        repeatAuthors: row.repeatAuthors,
        proposals: row.proposals,
      });
    });

    topAuthors.forEach((row) => {
      combined.push({
        type: "Author Directory",
        author: row.author,
        proposalsAuthored: row.prsCreated,
        merged: row.prsMerged,
        open: row.prsOpen,
        closed: row.prsClosed,
        firstSeen: row.firstSeen,
        lastActivity: row.lastActivity,
        topRepo: labelRepo(row.topRepo),
      });
    });

    return combined;
  }, `authors-analytics-${repoFilter}-${timeRange}`);

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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border/70 bg-card/60 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Authors</p>
              <p className="text-3xl font-semibold text-foreground">{kpis?.totalAuthors.toLocaleString() ?? "0"}</p>
            </div>
            <div className="rounded-full bg-primary/10 p-3">
              <Users className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border/70 bg-card/60 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">New Authors</p>
              <p className="text-3xl font-semibold text-foreground">{kpis?.newAuthors.toLocaleString() ?? "0"}</p>
            </div>
            <div className="rounded-full bg-primary/10 p-3">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border/70 bg-card/60 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Repeat Authors</p>
              <p className="text-3xl font-semibold text-foreground">{kpis?.repeatAuthors.toLocaleString() ?? "0"}</p>
            </div>
            <div className="rounded-full bg-primary/10 p-3">
              <Repeat2 className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border/70 bg-card/60 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Proposals Authored</p>
              <p className="text-3xl font-semibold text-foreground">{kpis?.proposalsAuthored.toLocaleString() ?? "0"}</p>
            </div>
            <div className="rounded-full bg-primary/10 p-3">
              <FileText className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/70 bg-card/60 px-4 py-3 text-sm text-foreground">
        One-time authors: {oneTimeAuthors.toLocaleString()}
        <span className="mx-2 text-muted-foreground">·</span>
        Authors with landed proposals: {kpis?.authorsWithMerged.toLocaleString() ?? "0"}
        <span className="mx-2 text-muted-foreground">·</span>
        Top 10 concentration: {concentrationTop10Pct.toFixed(1)}%
      </div>

      <div className="rounded-xl border border-border/70 bg-card/60 p-6 backdrop-blur-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Authorship Trend</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">New vs returning authors, with authored proposals overlay.</p>
          </div>
          <button onClick={downloadCohortReport} className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs text-foreground/85 hover:bg-muted/60">
            <Download className="h-3.5 w-3.5" />
            Download Reports
          </button>
        </div>
        <div className="relative h-72 w-full">
          <ReactECharts option={cohortTrendOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} notMerge />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-semibold text-foreground/10">EIPsInsight.com</span>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Highlights onboarding velocity and repeat-contributor stability month by month.</p>
          <LastUpdated timestamp={dataUpdatedAt} className="text-xs" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border/70 bg-card/60 p-6 backdrop-blur-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Authorship Composition by Repository</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Where unique and repeat authors contribute.</p>
            </div>
            <button onClick={downloadRepoCompositionReport} className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs text-foreground/85 hover:bg-muted/60">
              <Download className="h-3.5 w-3.5" />
              Download Reports
            </button>
          </div>
          <div className="relative h-72 w-full">
            <ReactECharts option={repoCompositionOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} notMerge />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-semibold text-foreground/10">EIPsInsight.com</span>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <LastUpdated timestamp={dataUpdatedAt} className="text-xs" />
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-card/60 p-6 backdrop-blur-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Author Outcomes</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Top authors by authored proposals and current outcomes.</p>
            </div>
            <button onClick={downloadOutcomesReport} className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs text-foreground/85 hover:bg-muted/60">
              <Download className="h-3.5 w-3.5" />
              Download Reports
            </button>
          </div>
          <div className="space-y-3">
            {outcomeRows.map((row) => {
              const landedPct = row.prsCreated > 0 ? Math.round((row.prsMerged / row.prsCreated) * 100) : 0;
              const activePct = row.prsCreated > 0 ? Math.round((row.prsOpen / row.prsCreated) * 100) : 0;
              const closedPct = row.prsCreated > 0 ? Math.round((row.prsClosed / row.prsCreated) * 100) : 0;
              return (
                <div key={row.author} className="rounded-lg border border-border/70 bg-muted/30 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{row.author}</span>
                    <span className="text-xs text-muted-foreground">{row.prsCreated} proposals</span>
                  </div>
                  <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted/50">
                    <div className="h-full bg-emerald-500" style={{ width: `${landedPct}%` }} />
                    <div className="h-full bg-blue-500" style={{ width: `${activePct}%` }} />
                    <div className="h-full bg-slate-500" style={{ width: `${closedPct}%` }} />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Landed {landedPct}% · Active {activePct}% · Closed {closedPct}%
                  </p>
                </div>
              );
            })}
            {outcomeRows.length === 0 && (
              <p className="text-sm text-muted-foreground">No outcome data available for current filters.</p>
            )}
          </div>
          <div className="mt-3 flex justify-end">
            <LastUpdated timestamp={dataUpdatedAt} className="text-xs" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/70 bg-card/60 p-5 backdrop-blur-sm">
        <h2 className="mb-4 text-xl font-semibold text-foreground">Top Active Authors</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {topAuthorCards.map((author) => (
            <div key={author.author} className="rounded-lg border border-border/60 bg-background/35 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img
                    src={getGitHubAvatarUrl(author.author)}
                    alt={`${author.author} avatar`}
                    className="h-9 w-9 rounded-full border border-border object-cover"
                    loading="lazy"
                  />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{author.author}</p>
                    <p className="text-[11px] text-muted-foreground">Top repo: {labelRepo(author.topRepo)}</p>
                  </div>
                </div>
                <p className="text-lg font-semibold text-foreground tabular-nums">{author.prsCreated}</p>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                <div className="rounded-md border border-border/50 bg-muted/30 px-2 py-1">
                  <p className="text-muted-foreground">Landed</p>
                  <p className="font-medium text-foreground tabular-nums">{author.prsMerged}</p>
                </div>
                <div className="rounded-md border border-border/50 bg-muted/30 px-2 py-1">
                  <p className="text-muted-foreground">Open</p>
                  <p className="font-medium text-foreground tabular-nums">{author.prsOpen}</p>
                </div>
                <div className="rounded-md border border-border/50 bg-muted/30 px-2 py-1">
                  <p className="text-muted-foreground">Closed</p>
                  <p className="font-medium text-foreground tabular-nums">{author.prsClosed}</p>
                </div>
              </div>
            </div>
          ))}
          {topAuthorCards.length === 0 && (
            <p className="text-sm text-muted-foreground">No author cards available for current filters.</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border/70 bg-card/60 p-6 backdrop-blur-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Author Directory</h2>
          <LastUpdated timestamp={dataUpdatedAt} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/70">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Rank</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Author</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Proposals</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Landed</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Active</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Closed</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Top Repo</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">First Seen</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {topAuthors.map((author, idx) => (
                <tr key={author.author} className="border-b border-border/60 hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-3 text-sm text-muted-foreground">#{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <img
                        src={getGitHubAvatarUrl(author.author)}
                        alt={`${author.author} avatar`}
                        className="h-7 w-7 rounded-full border border-border object-cover"
                        loading="lazy"
                      />
                      <span className="font-medium text-foreground/90">{author.author}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-foreground/85 tabular-nums">{author.prsCreated.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-sm text-foreground/85 tabular-nums">{author.prsMerged.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-sm text-foreground/85 tabular-nums">{author.prsOpen.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-sm text-foreground/85 tabular-nums">{author.prsClosed.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{labelRepo(author.topRepo)}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{author.firstSeen ? new Date(author.firstSeen).toLocaleDateString() : "–"}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{author.lastActivity ? new Date(author.lastActivity).toLocaleDateString() : "–"}</td>
                </tr>
              ))}
              {topAuthors.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-sm text-muted-foreground">
                    No author data found for the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
