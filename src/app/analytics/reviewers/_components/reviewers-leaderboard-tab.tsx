"use client";

import React, { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import ReactECharts from "echarts-for-react";
import {
  Search,
  Download,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Table as TableIcon,
  Clock,
  GitPullRequest,
  CheckCircle2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ReviewerLeaderboardRow,
  getGitHubAvatarUrl,
  downloadCsv,
  REVIEWER_PALETTE,
  OFFICIAL_REVIEWERS,
} from "./types";

interface ReviewersLeaderboardTabProps {
  leaderboard: ReviewerLeaderboardRow[];
  dataUpdatedAt?: Date;
  onSelectReviewer?: (actor: string) => void;
}

type SortColumn = "actor" | "reviews" | "prs" | "latency" | "rank";
type MetricType = "reviews" | "prs" | "latency";

export function ReviewersLeaderboardTab({
  leaderboard,
  dataUpdatedAt,
  onSelectReviewer,
}: ReviewersLeaderboardTabProps) {
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("reviews");
  const [sortColumn, setSortColumn] = useState<SortColumn>("reviews");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [roleFilter, setRoleFilter] = useState<"all" | "canonical" | "active">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Canonical handles set
  const canonicalHandles = useMemo(() => new Set(OFFICIAL_REVIEWERS), []);

  // Filter rows
  const filteredRows = useMemo(() => {
    return leaderboard.filter((r) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        if (!r.actor.toLowerCase().includes(query)) return false;
      }
      if (roleFilter === "canonical" && !canonicalHandles.has(r.actor)) {
        return false;
      }
      if (roleFilter === "active" && r.totalReviews === 0) {
        return false;
      }
      return true;
    });
  }, [leaderboard, searchQuery, roleFilter, canonicalHandles]);

  // Handle column sort
  const handleSort = useCallback(
    (col: SortColumn) => {
      if (sortColumn === col) {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortColumn(col);
        setSortDirection(col === "actor" || col === "rank" ? "asc" : "desc");
      }
      if (col === "reviews" || col === "prs" || col === "latency") {
        setSelectedMetric(col);
      }
    },
    [sortColumn],
  );

  // Sorted rows
  const sortedRows = useMemo(() => {
    const list = [...filteredRows];
    const factor = sortDirection === "asc" ? 1 : -1;
    return list.sort((a, b) => {
      if (sortColumn === "actor") {
        return factor * a.actor.localeCompare(b.actor);
      }
      if (sortColumn === "reviews") {
        return factor * (a.totalReviews - b.totalReviews);
      }
      if (sortColumn === "prs") {
        return factor * (a.prsTouched - b.prsTouched);
      }
      if (sortColumn === "latency") {
        const latA = a.medianResponseDays ?? 9999;
        const latB = b.medianResponseDays ?? 9999;
        return factor * (latA - latB);
      }
      return factor * (a.totalReviews - b.totalReviews);
    });
  }, [filteredRows, sortColumn, sortDirection]);

  // ECharts Horizontal Bar Chart
  const leaderboardChartOption = useMemo(() => {
    const palette = REVIEWER_PALETTE;
    const topRows = [...sortedRows].slice(0, 15).reverse();
    const maxValue = Math.max(
      1,
      ...topRows.map((r) => {
        if (selectedMetric === "reviews") return r.totalReviews;
        if (selectedMetric === "prs") return r.prsTouched;
        return r.medianResponseDays ?? 0;
      }),
    );

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: "rgba(15, 23, 42, 0.95)",
        borderColor: "rgba(148, 163, 184, 0.2)",
        textStyle: { color: "#f8fafc", fontSize: 11 },
        formatter: (params: Array<{ dataIndex: number }>) => {
          const idx = params?.[0]?.dataIndex ?? 0;
          const row = topRows[idx];
          if (!row) return "";
          const avatar = getGitHubAvatarUrl(row.actor);
          return `
            <div style="padding: 6px; font-size: 12px; min-width: 170px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                <img src="${avatar}" style="width: 22px; height: 22px; border-radius: 9999px; object-fit: cover;" />
                <strong style="font-size: 13px;">${row.actor}</strong>
              </div>
              <div style="padding: 2px 0;"><span style="color: #94a3b8;">Reviews:</span> <strong>${row.totalReviews.toLocaleString()}</strong></div>
              <div style="padding: 2px 0;"><span style="color: #94a3b8;">PRs touched:</span> <strong>${row.prsTouched.toLocaleString()}</strong></div>
              <div style="padding: 2px 0;"><span style="color: #94a3b8;">Turnaround:</span> <strong>${row.medianResponseDays != null ? `${row.medianResponseDays.toFixed(1)}d` : "–"}</strong></div>
            </div>
          `;
        },
      },
      grid: { top: 12, left: 110, right: 120, bottom: 20, containLabel: true },
      xAxis: {
        type: "value",
        max: Math.ceil(maxValue * 1.18),
        axisLabel: { color: "var(--muted-foreground)", fontSize: 11 },
        splitLine: { lineStyle: { color: "rgba(148,163,184,0.12)", type: "dashed" } },
      },
      yAxis: {
        type: "category",
        data: topRows.map((r) => r.actor),
        axisLabel: {
          color: "var(--foreground)",
          fontSize: 12,
          fontWeight: 600,
        },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      series: [
        {
          type: "bar",
          barWidth: 22,
          data: topRows.map((r, index) => ({
            value:
              selectedMetric === "reviews"
                ? r.totalReviews
                : selectedMetric === "prs"
                  ? r.prsTouched
                  : r.medianResponseDays ?? 0,
            itemStyle: {
              color: palette[(topRows.length - 1 - index) % palette.length],
              borderRadius: [0, 6, 6, 0],
            },
          })),
          label: {
            show: true,
            position: "right",
            color: "var(--foreground)",
            fontWeight: 600,
            fontSize: 12,
            distance: 8,
            formatter: ({ value }: { value: number }) =>
              selectedMetric === "latency"
                ? `${Number(value).toFixed(1)}d`
                : `${Number(value).toLocaleString()} ${selectedMetric === "reviews" ? "reviews" : "PRs"}`,
          },
        },
      ],
    };
  }, [sortedRows, selectedMetric]);

  // Export to CSV
  const handleExportCSV = useCallback(() => {
    const headers = ["Reviewer", "Reviews", "PRs Touched", "Median Turnaround (Days)"];
    const rows = sortedRows.map((r) => [
      r.actor,
      r.totalReviews,
      r.prsTouched,
      r.medianResponseDays != null ? r.medianResponseDays : "–",
    ]);
    downloadCsv(`reviewers-leaderboard-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }, [sortedRows]);

  // Pagination
  const totalPages = Math.ceil(sortedRows.length / itemsPerPage);
  const validPage = Math.min(currentPage, Math.max(1, totalPages));
  const paginatedRows = useMemo(() => {
    const start = (validPage - 1) * itemsPerPage;
    return sortedRows.slice(start, start + itemsPerPage);
  }, [sortedRows, validPage, itemsPerPage]);

  const maxReviews = useMemo(
    () => Math.max(1, ...leaderboard.map((r) => r.totalReviews)),
    [leaderboard],
  );

  // Top 3 Podium
  const topThree = useMemo(() => {
    return [...leaderboard].sort((a, b) => b.totalReviews - a.totalReviews).slice(0, 3);
  }, [leaderboard]);

  return (
    <div className="space-y-5">
      {/* Search & Global Controls */}
      <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card/60 p-3.5 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
        {/* Search & Role Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 sm:w-64 sm:flex-none">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search reviewer handle..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 w-full rounded-lg border border-border bg-background pl-8 pr-3 text-xs placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="inline-flex rounded-lg border border-border/70 bg-muted/40 p-0.5 text-xs">
            {(
              [
                ["all", `All (${leaderboard.length})`],
                ["canonical", `Canonical (${OFFICIAL_REVIEWERS.length})`],
                ["active", `Active (${leaderboard.filter((r) => r.totalReviews > 0).length})`],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => {
                  setRoleFilter(val);
                  setCurrentPage(1);
                }}
                className={cn(
                  "rounded-md px-2 py-0.5 text-[11px] font-medium transition-all cursor-pointer",
                  roleFilter === val
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Metric Selector, View Toggle & CSV Export */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Metric Selector Pills */}
          <div className="inline-flex rounded-lg border border-border/70 bg-muted/40 p-0.5 text-xs">
            {(
              [
                ["reviews", "Reviews"],
                ["prs", "PRs Touched"],
                ["latency", "Turnaround"],
              ] as const
            ).map(([metric, label]) => (
              <button
                key={metric}
                type="button"
                onClick={() => {
                  setSelectedMetric(metric);
                  setSortColumn(metric);
                  setSortDirection(metric === "latency" ? "asc" : "desc");
                }}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-all cursor-pointer",
                  selectedMetric === metric
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* View Mode Toggle */}
          <div className="inline-flex rounded-lg border border-border/70 bg-muted/40 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("chart")}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5",
                viewMode === "chart"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Leaderboard Graph</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5",
                viewMode === "table"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <TableIcon className="h-3.5 w-3.5" />
              <span>Directory Table</span>
            </button>
          </div>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-border/70 bg-muted/40 px-2.5 text-xs font-medium text-foreground/80 hover:bg-muted/70 hover:text-foreground transition-all cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Top 3 Podium Cards */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {topThree.map((reviewer, idx) => {
            const rankLabel = idx === 0 ? "1st Place" : idx === 1 ? "2nd Place" : "3rd Place";
            const rankColor =
              idx === 0
                ? "border-amber-500/40 bg-amber-500/10 text-amber-500"
                : idx === 1
                  ? "border-slate-400/40 bg-slate-400/10 text-slate-300"
                  : "border-amber-700/40 bg-amber-700/10 text-amber-600";

            return (
              <div
                key={reviewer.actor}
                className={cn(
                  "relative rounded-xl border p-4 backdrop-blur-sm transition-all hover:shadow-md flex flex-col justify-between",
                  idx === 0
                    ? "border-amber-500/30 bg-gradient-to-br from-amber-500/[0.06] to-card/60"
                    : "border-border/70 bg-card/60",
                )}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                        rankColor,
                      )}
                    >
                      {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"} {rankLabel}
                    </span>
                    <Link
                      href={`/user/${reviewer.actor}`}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title="View Profile"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <img
                      src={getGitHubAvatarUrl(reviewer.actor)}
                      alt={reviewer.actor}
                      className="h-10 w-10 rounded-full border border-border/80 object-cover"
                      loading="lazy"
                    />
                    <div>
                      <h4 className="text-sm font-bold text-foreground hover:underline">
                        <Link href={`/user/${reviewer.actor}`}>{reviewer.actor}</Link>
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {reviewer.prsTouched} PRs touched
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-muted-foreground">Total Reviews</span>
                    <p className="text-lg font-bold text-foreground tabular-nums">
                      {reviewer.totalReviews.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground">Turnaround</span>
                    <p className="text-sm font-semibold text-foreground">
                      {reviewer.medianResponseDays != null
                        ? `${reviewer.medianResponseDays.toFixed(1)}d`
                        : "–"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Main View: Graph or Directory Table */}
      {viewMode === "chart" ? (
        <div className="rounded-xl border border-border/70 bg-card/60 p-4 sm:p-5 backdrop-blur-sm shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Reviewer Leaderboard Graph</h3>
              <p className="text-xs text-muted-foreground">
                Comparative ranking by {selectedMetric === "reviews" ? "PR reviews" : selectedMetric === "prs" ? "PRs touched" : "turnaround latency"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View Directory Table</span>
              <TableIcon className="h-3 w-3" />
            </button>
          </div>

          <div className="h-[360px] w-full">
            <ReactECharts
              option={leaderboardChartOption}
              style={{ height: "100%", width: "100%" }}
              opts={{ renderer: "svg" }}
              notMerge
            />
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border/70 bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border/60 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Reviewer Directory Table</h3>
              <p className="text-xs text-muted-foreground">
                Detailed metrics, PR volume, and response latency per reviewer
              </p>
            </div>
            <button
              type="button"
              onClick={() => setViewMode("chart")}
              className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View Leaderboard Graph</span>
              <BarChart3 className="h-3 w-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-[11px] font-semibold text-muted-foreground border-b border-border/60">
                <tr>
                  <th className="py-2.5 px-4 w-12 text-center">Rank</th>
                  <th
                    className="py-2.5 px-4 cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("actor")}
                  >
                    Reviewer
                  </th>
                  <th
                    className="py-2.5 px-4 text-right cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("reviews")}
                  >
                    Reviews
                  </th>
                  <th
                    className="py-2.5 px-4 text-right cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("prs")}
                  >
                    PRs Touched
                  </th>
                  <th
                    className="py-2.5 px-4 text-right cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("latency")}
                  >
                    Median Turnaround
                  </th>
                  <th className="py-2.5 px-4 text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {paginatedRows.map((reviewer, idx) => {
                  const globalRank = (validPage - 1) * itemsPerPage + idx + 1;
                  const isCanonical = canonicalHandles.has(reviewer.actor);

                  return (
                    <tr key={reviewer.actor} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 text-center">
                        {globalRank <= 3 ? (
                          <span className="text-sm">
                            {globalRank === 1 ? "🥇" : globalRank === 2 ? "🥈" : "🥉"}
                          </span>
                        ) : (
                          <span className="font-mono text-muted-foreground">#{globalRank}</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={getGitHubAvatarUrl(reviewer.actor)}
                            alt={reviewer.actor}
                            className="h-7 w-7 rounded-full border border-border/80 object-cover"
                            loading="lazy"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <Link
                                href={`/user/${reviewer.actor}`}
                                className="font-semibold text-foreground hover:text-primary transition-colors"
                              >
                                {reviewer.actor}
                              </Link>
                              {isCanonical && (
                                <span className="rounded bg-primary/10 px-1 py-0.2 text-[9px] font-bold text-primary">
                                  Official
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              EIP Reviewer
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-1.5 w-16 rounded-full bg-muted/60 overflow-hidden hidden sm:block">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{
                                width: `${Math.max(4, (reviewer.totalReviews / maxReviews) * 100)}%`,
                              }}
                            />
                          </div>
                          <span className="font-mono font-semibold text-foreground tabular-nums">
                            {reviewer.totalReviews.toLocaleString()}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right font-mono text-foreground/80 tabular-nums">
                        {reviewer.prsTouched.toLocaleString()}
                      </td>

                      <td className="py-3 px-4 text-right font-mono text-foreground/80">
                        {reviewer.medianResponseDays != null
                          ? `${reviewer.medianResponseDays.toFixed(1)}d`
                          : "–"}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/user/${reviewer.actor}`}
                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            title="View Profile"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {paginatedRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      No reviewers match your search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="p-3 border-t border-border/60 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Showing {(validPage - 1) * itemsPerPage + 1}–
                {Math.min(validPage * itemsPerPage, sortedRows.length)} of {sortedRows.length} reviewers
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={validPage === 1}
                  className="rounded border border-border px-2 py-1 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="px-2 font-mono text-muted-foreground">
                  Page {validPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={validPage === totalPages}
                  className="rounded border border-border px-2 py-1 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
