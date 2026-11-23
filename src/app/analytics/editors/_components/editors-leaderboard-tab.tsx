"use client";

import React, { useState, useMemo, useCallback } from "react";
import ReactECharts from "echarts-for-react";
import {
  Search,
  Download,
  Loader2,
  Table as TableIcon,
  BarChart3,
  ExternalLink,
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CHART_SERIES } from "@/lib/chart-colors";
import { CANONICAL_EIP_EDITORS, ASSOCIATE_EIP_EDITORS } from "@/data/eip-contributor-roles";
import {
  EditorLeaderboardRow,
  RepoDistribution,
  getGitHubAvatarUrl,
  repoColors,
} from "./types";

interface EditorsLeaderboardTabProps {
  leaderboard: EditorLeaderboardRow[];
  categoriesByActor: Record<string, string[]>;
  repoDistribution: RepoDistribution[];
  onInspectActor: (actor: string) => void;
  onExportCSV: () => void;
  onExportActorReport: (actor: string) => void;
  exporting: boolean;
  downloadingActor: string | null;
  leaderboardLabel: string;
}

type SortColumn = "rank" | "actor" | "reviews" | "prs" | "actions" | "latency";
type SortDirection = "asc" | "desc";

export function EditorsLeaderboardTab({
  leaderboard,
  categoriesByActor,
  repoDistribution,
  onInspectActor,
  onExportCSV,
  onExportActorReport,
  exporting,
  downloadingActor,
  leaderboardLabel,
}: EditorsLeaderboardTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "canonical" | "active">("all");
  const [selectedMetric, setSelectedMetric] = useState<"reviews" | "prs" | "actions" | "latency">("reviews");
  const [sortColumn, setSortColumn] = useState<SortColumn>("reviews");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");
  const [showMacroBreakdowns, setShowMacroBreakdowns] = useState(false);

  const canonicalHandles = useMemo(() => new Set(CANONICAL_EIP_EDITORS.map((e) => e.toLowerCase())), []);
  const associateHandles = useMemo(
    () => new Set((ASSOCIATE_EIP_EDITORS as readonly string[]).map((e) => e.toLowerCase())),
    [],
  );

  // Filter editors by search and role
  const filteredRows = useMemo(() => {
    return leaderboard.filter((row) => {
      const actorLower = row.actor.toLowerCase();
      if (searchQuery.trim() && !actorLower.includes(searchQuery.trim().toLowerCase())) {
        return false;
      }
      if (roleFilter === "canonical" && !canonicalHandles.has(actorLower)) {
        return false;
      }
      if (roleFilter === "active" && row.totalActions <= 0) {
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
      if (col === "reviews" || col === "prs" || col === "actions" || col === "latency") {
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
        return factor * (a.reviews - b.reviews);
      }
      if (sortColumn === "prs") {
        return factor * (a.prsTouched - b.prsTouched);
      }
      if (sortColumn === "actions") {
        return factor * (a.totalActions - b.totalActions);
      }
      if (sortColumn === "latency") {
        const latA = a.medianResponseDays ?? 9999;
        const latB = b.medianResponseDays ?? 9999;
        return factor * (latA - latB);
      }
      return factor * (a.reviews - b.reviews);
    });
  }, [filteredRows, sortColumn, sortDirection]);

  // Clean, crisp ECharts horizontal bar chart (no colliding markPoint overlay!)
  const leaderboardHeroOption = useMemo(() => {
    const palette = CHART_SERIES;
    const topRows = [...sortedRows].slice(0, 15).reverse();
    const maxValue = Math.max(
      1,
      ...topRows.map((r) => {
        if (selectedMetric === "reviews") return r.reviews;
        if (selectedMetric === "prs") return r.prsTouched;
        if (selectedMetric === "actions") return r.totalActions;
        return r.medianResponseDays ?? 0;
      }),
    );

    const metricLabel =
      selectedMetric === "reviews"
        ? "PR Reviews"
        : selectedMetric === "prs"
          ? "PRs Touched"
          : selectedMetric === "actions"
            ? "Total Actions"
            : "Turnaround";

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: Array<{ dataIndex: number }>) => {
          const idx = params?.[0]?.dataIndex ?? 0;
          const row = topRows[idx];
          if (!row) return "";
          const avatar = getGitHubAvatarUrl(row.actor);
          return `<div style="padding: 6px; font-size: 12px; min-width: 170px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
              <img src="${avatar}" style="width: 22px; height: 22px; border-radius: 9999px; object-fit: cover;" />
              <strong style="font-size: 13px;">${row.actor}</strong>
            </div>
            <div style="padding: 1px 0;"><span style="color: var(--muted-foreground);">Reviews:</span> <strong>${row.reviews.toLocaleString()}</strong></div>
            <div style="padding: 1px 0;"><span style="color: var(--muted-foreground);">PRs touched:</span> <strong>${row.prsTouched.toLocaleString()}</strong></div>
            <div style="padding: 1px 0;"><span style="color: var(--muted-foreground);">Total actions:</span> <strong>${row.totalActions.toLocaleString()}</strong></div>
            <div style="padding: 1px 0;"><span style="color: var(--muted-foreground);">Turnaround:</span> <strong>${row.medianResponseDays != null ? `${row.medianResponseDays.toFixed(1)}d` : "–"}</strong></div>
          </div>`;
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
                ? r.reviews
                : selectedMetric === "prs"
                  ? r.prsTouched
                  : selectedMetric === "actions"
                    ? r.totalActions
                    : r.medianResponseDays ?? 0,
            itemStyle: {
              color: index === topRows.length - 1 ? "var(--brand)" : "var(--brand-strong)",
              borderRadius: [0, 4, 4, 0],
            },
          })),
          label: {
            show: true,
            position: "right",
            color: "var(--ink)",
            fontWeight: 600,
            fontSize: 12,
            fontFamily: "var(--font-geist-mono), monospace",
            distance: 8,
            formatter: ({ value }: { value: number }) =>
              selectedMetric === "latency"
                ? `${Number(value).toFixed(1)}d`
                : `${Number(value).toLocaleString()} ${selectedMetric === "reviews" ? "reviews" : selectedMetric === "prs" ? "PRs" : "actions"}`,
          },
        },
      ],
    };
  }, [sortedRows, selectedMetric]);

  // Breakdown Repo Option
  const breakdownRepoOption = useMemo(() => {
    const sorted = [...leaderboard].sort((a, b) => b.totalActions - a.totalActions).slice(0, 10);
    const actors = sorted.map((r) => r.actor);
    const repos = ["ethereum/EIPs", "ethereum/ERCs", "ethereum/RIPs"];

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
      },
      legend: {
        textStyle: { color: "var(--muted-foreground)", fontSize: 11 },
        bottom: 0,
      },
      grid: { top: 20, left: 90, right: 20, bottom: 40 },
      xAxis: {
        type: "value",
        axisLabel: { color: "var(--muted-foreground)", fontSize: 10 },
        splitLine: { lineStyle: { color: "rgba(148,163,184,0.12)", type: "dashed" } },
      },
      yAxis: {
        type: "category",
        data: actors,
        axisLabel: { color: "var(--foreground)", fontSize: 10, fontWeight: 500 },
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

  // Breakdown Event Option
  const breakdownEventOption = useMemo(() => {
    const sorted = [...leaderboard].sort((a, b) => b.totalActions - a.totalActions).slice(0, 10);
    const actors = sorted.map((e) => e.actor);

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
      },
      legend: {
        textStyle: { color: "var(--muted-foreground)", fontSize: 11 },
        bottom: 0,
      },
      grid: { top: 20, left: 90, right: 20, bottom: 40 },
      xAxis: {
        type: "value",
        axisLabel: { color: "var(--muted-foreground)", fontSize: 10 },
        splitLine: { lineStyle: { color: "rgba(148,163,184,0.12)", type: "dashed" } },
      },
      yAxis: {
        type: "category",
        data: actors,
        axisLabel: { color: "var(--foreground)", fontSize: 10, fontWeight: 500 },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      series: [
        {
          name: "PR Reviews",
          type: "bar",
          stack: "events",
          data: sorted.map((e) => e.reviews),
          itemStyle: { color: "#10b981" },
        },
        {
          name: "Comments",
          type: "bar",
          stack: "events",
          data: sorted.map((e) => e.comments),
          itemStyle: { color: "#8b5cf6" },
        },
        {
          name: "Other Actions",
          type: "bar",
          stack: "events",
          data: sorted.map((e) => Math.max(0, e.totalActions - e.reviews - e.comments)),
          itemStyle: { color: "#64748b" },
        },
      ],
    };
  }, [leaderboard]);

  const activeCount = useMemo(() => leaderboard.filter((r) => r.totalActions > 0).length, [leaderboard]);
  const canonicalCount = useMemo(
    () => leaderboard.filter((r) => canonicalHandles.has(r.actor.toLowerCase())).length,
    [leaderboard, canonicalHandles],
  );

  return (
    <div className="space-y-4">
      {/* ONE Single, Unified Leaderboard Container */}
      <div className="card overflow-hidden">
        {/* Top Header Row with Title, Metric Switcher, View Toggle & Export */}
        <div className="flex flex-col gap-3 p-4 border-b border-[var(--border)] lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[var(--ink)]">Editor Leaderboard</h2>
            <p className="text-[11px] text-[var(--ink-muted)]">
              Ranked by <strong className="text-[var(--ink)] capitalize">{selectedMetric}</strong> ({leaderboardLabel})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Metric Sorter Chips */}
            <div className="inline-flex items-center gap-1 rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface-2)] p-0.5 text-xs">
              {(
                [
                  ["reviews", "Reviews"],
                  ["prs", "PRs Touched"],
                  ["actions", "Actions"],
                  ["latency", "Turnaround"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSort(key)}
                  data-active={selectedMetric === key ? "true" : undefined}
                  className="chip h-7 px-2.5 text-xs border-transparent bg-transparent hover:border-transparent cursor-pointer"
                >
                  {label}
                </button>
              ))}
            </div>

            {/* ONLY ONE View Switcher (inside the box header) */}
            <div className="inline-flex items-center gap-1 rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface-2)] p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("chart")}
                data-active={viewMode === "chart" ? "true" : undefined}
                className="chip h-7 px-2.5 text-xs border-transparent bg-transparent hover:border-transparent cursor-pointer"
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Graph</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                data-active={viewMode === "table" ? "true" : undefined}
                className="chip h-7 px-2.5 text-xs border-transparent bg-transparent hover:border-transparent cursor-pointer"
              >
                <TableIcon className="h-3.5 w-3.5" />
                <span>Table</span>
              </button>
            </div>

            {/* CSV Export Button */}
            <button
              type="button"
              onClick={onExportCSV}
              disabled={exporting || sortedRows.length === 0}
              className="btn btn-outline h-7 px-2.5 text-xs text-[var(--ink)] border-[var(--border)] hover:border-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Compact Sub-Toolbar: Search & Role Filters */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-2 bg-[var(--surface-2)] border-b border-[var(--border)]">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-48 sm:w-56">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ink-faint)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by handle..."
                className="h-7 w-full rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface)] pl-8 pr-2.5 text-xs text-[var(--ink)] placeholder:text-[var(--ink-faint)] outline-none focus:border-[var(--ink)]"
              />
            </div>

            {/* Role Filter Chips */}
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => setRoleFilter("all")}
                data-active={roleFilter === "all" ? "true" : undefined}
                className="chip h-7 px-2 text-[11px] cursor-pointer"
              >
                All ({leaderboard.length})
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter("canonical")}
                data-active={roleFilter === "canonical" ? "true" : undefined}
                className="chip h-7 px-2 text-[11px] cursor-pointer"
              >
                Canonical ({canonicalCount})
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter("active")}
                data-active={roleFilter === "active" ? "true" : undefined}
                className="chip h-7 px-2 text-[11px] cursor-pointer"
              >
                Active ({activeCount})
              </button>
            </div>
          </div>

          <span className="font-mono text-[11px] text-[var(--ink-muted)]">
            {sortedRows.length} {sortedRows.length === 1 ? "editor" : "editors"}
          </span>
        </div>

        {/* Content Area: Graph OR Table */}
        {viewMode === "chart" ? (
          <div className="p-4 sm:p-5">
            {sortedRows.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No editors match your search filter.
              </div>
            ) : (
              <div className="h-[400px] w-full">
                <ReactECharts
                  option={leaderboardHeroOption}
                  style={{ height: "100%", width: "100%" }}
                  opts={{ renderer: "svg" }}
                  notMerge
                />
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border/70 bg-muted/30 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="px-4 py-3 w-16 text-center">
                    #
                  </th>
                  <th scope="col" className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleSort("actor")}
                      className="inline-flex items-center gap-1 font-semibold text-foreground hover:text-primary cursor-pointer"
                    >
                      <span>Editor</span>
                      {sortColumn === "actor" ? (
                        sortDirection === "asc" ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-40" />
                      )}
                    </button>
                  </th>
                  <th scope="col" className="px-3 py-3 text-center">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleSort("reviews")}
                      className={cn(
                        "inline-flex items-center gap-1 font-semibold hover:text-primary cursor-pointer",
                        sortColumn === "reviews" ? "text-primary" : "text-foreground",
                      )}
                    >
                      <span>Reviews</span>
                      {sortColumn === "reviews" ? (
                        sortDirection === "asc" ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-40" />
                      )}
                    </button>
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleSort("prs")}
                      className={cn(
                        "inline-flex items-center gap-1 font-semibold hover:text-primary cursor-pointer",
                        sortColumn === "prs" ? "text-primary" : "text-foreground",
                      )}
                    >
                      <span>PRs Touched</span>
                      {sortColumn === "prs" ? (
                        sortDirection === "asc" ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-40" />
                      )}
                    </button>
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleSort("actions")}
                      className={cn(
                        "inline-flex items-center gap-1 font-semibold hover:text-primary cursor-pointer",
                        sortColumn === "actions" ? "text-primary" : "text-foreground",
                      )}
                    >
                      <span>Total Actions</span>
                      {sortColumn === "actions" ? (
                        sortDirection === "asc" ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-40" />
                      )}
                    </button>
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleSort("latency")}
                      className={cn(
                        "inline-flex items-center gap-1 font-semibold hover:text-primary cursor-pointer",
                        sortColumn === "latency" ? "text-primary" : "text-foreground",
                      )}
                    >
                      <span>Turnaround</span>
                      {sortColumn === "latency" ? (
                        sortDirection === "asc" ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-40" />
                      )}
                    </button>
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Action Mix
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {sortedRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-muted-foreground">
                      No editors found matching your filters.
                    </td>
                  </tr>
                ) : (
                  sortedRows.map((editor, idx) => {
                    const categories = categoriesByActor[editor.actor] || [];
                    const isActive = editor.totalActions > 0;
                    const isCanonical = canonicalHandles.has(editor.actor.toLowerCase());
                    const isAssociate = associateHandles.has(editor.actor.toLowerCase());

                    const reviewsPct =
                      editor.totalActions > 0 ? (editor.reviews / editor.totalActions) * 100 : 0;
                    const commentsPct =
                      editor.totalActions > 0 ? (editor.comments / editor.totalActions) * 100 : 0;
                    const otherPct = Math.max(0, 100 - reviewsPct - commentsPct);

                    let rankBadge: React.ReactNode = (
                      <span className="font-mono text-xs text-muted-foreground">#{idx + 1}</span>
                    );
                    if (idx === 0) {
                      rankBadge = (
                        <span className="inline-flex items-center justify-center rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold text-amber-500 dark:text-amber-300">
                          🥇 #1
                        </span>
                      );
                    } else if (idx === 1) {
                      rankBadge = (
                        <span className="inline-flex items-center justify-center rounded-full bg-slate-300/20 border border-slate-300/40 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-200">
                          🥈 #2
                        </span>
                      );
                    } else if (idx === 2) {
                      rankBadge = (
                        <span className="inline-flex items-center justify-center rounded-full bg-amber-700/20 border border-amber-700/40 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                          🥉 #3
                        </span>
                      );
                    }

                    return (
                      <tr key={editor.actor} className="transition-colors hover:bg-muted/30 group">
                        {/* Rank */}
                        <td className="px-4 py-3.5 text-center align-middle whitespace-nowrap">
                          {rankBadge}
                        </td>

                        {/* Editor Identity */}
                        <td className="px-4 py-3.5 align-middle">
                          <div className="flex items-center gap-3">
                            <a
                              href={`https://github.com/${editor.actor}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 transition-transform group-hover:scale-105"
                            >
                              <img
                                src={getGitHubAvatarUrl(editor.actor)}
                                alt={`${editor.actor} avatar`}
                                className="h-8 w-8 rounded-full border border-border/80 object-cover"
                                loading="lazy"
                              />
                            </a>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <a
                                  href={`https://github.com/${editor.actor}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-semibold text-foreground hover:text-primary hover:underline transition-colors"
                                >
                                  {editor.actor}
                                </a>
                                {isCanonical && (
                                  <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.2 text-[9px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                                    Canonical
                                  </span>
                                )}
                                {isAssociate && (
                                  <span className="rounded-full border border-primary/40 bg-primary/10 px-1.5 py-0.2 text-[9px] font-semibold uppercase tracking-wide text-primary">
                                    Associate
                                  </span>
                                )}
                              </div>
                              {categories.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {categories.slice(0, 3).map((cat) => (
                                    <span
                                      key={cat}
                                      className="rounded bg-muted/60 px-1.5 py-0.2 text-[9px] text-muted-foreground font-medium"
                                    >
                                      {cat}
                                    </span>
                                  ))}
                                  {categories.length > 3 && (
                                    <span className="text-[9px] text-muted-foreground">
                                      +{categories.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-3 py-3.5 text-center align-middle whitespace-nowrap">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                              isActive
                                ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "border border-border bg-muted/40 text-muted-foreground",
                            )}
                          >
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                isActive ? "bg-emerald-500" : "bg-muted-foreground",
                              )}
                            />
                            {isActive ? "Active" : "Idle"}
                          </span>
                        </td>

                        {/* Reviews */}
                        <td
                          className={cn(
                            "px-4 py-3.5 text-right font-mono text-sm tabular-nums align-middle whitespace-nowrap",
                            selectedMetric === "reviews"
                              ? "font-bold text-foreground bg-primary/5"
                              : "text-foreground/80",
                          )}
                        >
                          {editor.reviews.toLocaleString()}
                        </td>

                        {/* PRs Touched */}
                        <td
                          className={cn(
                            "px-4 py-3.5 text-right font-mono text-sm tabular-nums align-middle whitespace-nowrap",
                            selectedMetric === "prs"
                              ? "font-bold text-foreground bg-primary/5"
                              : "text-foreground/80",
                          )}
                        >
                          {editor.prsTouched.toLocaleString()}
                        </td>

                        {/* Actions */}
                        <td
                          className={cn(
                            "px-4 py-3.5 text-right font-mono text-sm tabular-nums align-middle whitespace-nowrap",
                            selectedMetric === "actions"
                              ? "font-bold text-foreground bg-primary/5"
                              : "text-foreground/80",
                          )}
                        >
                          {editor.totalActions.toLocaleString()}
                        </td>

                        {/* Turnaround */}
                        <td
                          className={cn(
                            "px-4 py-3.5 text-right font-mono text-sm tabular-nums align-middle whitespace-nowrap",
                            selectedMetric === "latency"
                              ? "font-bold text-foreground bg-primary/5"
                              : "text-muted-foreground",
                          )}
                        >
                          {editor.medianResponseDays != null ? `${editor.medianResponseDays.toFixed(1)}d` : "–"}
                        </td>

                        {/* Action Mix Visual Bar */}
                        <td className="px-4 py-3.5 align-middle">
                          <div className="w-32">
                            <div className="flex h-2 w-full overflow-hidden rounded-full border border-border/50 bg-muted/40">
                              <div
                                className="h-full bg-emerald-500 transition-all"
                                style={{ width: `${reviewsPct}%` }}
                                title={`Reviews: ${reviewsPct.toFixed(0)}%`}
                              />
                              <div
                                className="h-full bg-violet-500 transition-all"
                                style={{ width: `${commentsPct}%` }}
                                title={`Comments: ${commentsPct.toFixed(0)}%`}
                              />
                              <div
                                className="h-full bg-slate-400 dark:bg-slate-500 transition-all"
                                style={{ width: `${otherPct}%` }}
                                title={`Other: ${otherPct.toFixed(0)}%`}
                              />
                            </div>
                            <p className="mt-1 font-mono text-[9px] text-muted-foreground">
                              {reviewsPct.toFixed(0)}% rev · {commentsPct.toFixed(0)}% com
                            </p>
                          </div>
                        </td>

                        {/* Quick Actions */}
                        <td className="px-4 py-3.5 text-right align-middle whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onInspectActor(editor.actor)}
                              className="inline-flex items-center gap-1 rounded-md border border-border/80 bg-background/80 px-2 py-1 text-[11px] font-medium text-foreground hover:border-primary/50 hover:bg-primary/10 hover:text-primary transition-all cursor-pointer"
                              title={`Inspect actions for ${editor.actor}`}
                            >
                              <span>Inspect</span>
                              <ExternalLink className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onExportActorReport(editor.actor)}
                              disabled={downloadingActor === editor.actor}
                              className="inline-flex items-center rounded-md border border-border/80 bg-background/80 p-1 text-[11px] text-muted-foreground hover:border-primary/50 hover:text-primary transition-all disabled:opacity-50 cursor-pointer"
                              title={`Download CSV report for ${editor.actor}`}
                            >
                              {downloadingActor === editor.actor ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Download className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Collapsible Macro Operational Breakdowns: Repository Distribution & Action Type Mix */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setShowMacroBreakdowns((prev) => !prev)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <Layers className="h-4 w-4 text-primary" />
          <span>Repository &amp; Action Mix Breakdowns</span>
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showMacroBreakdowns ? "rotate-180" : "")} />
        </button>

        {showMacroBreakdowns && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Repo Distribution */}
            <div className="rounded-xl border border-border/70 bg-card/60 p-4 backdrop-blur-sm shadow-sm space-y-2">
              <div>
                <h4 className="text-xs font-semibold text-foreground">Repository Mix by Editor</h4>
                <p className="text-[10px] text-muted-foreground">EIPs vs ERCs vs RIPs participation</p>
              </div>
              <div className="h-[280px] w-full">
                <ReactECharts
                  option={breakdownRepoOption}
                  style={{ height: "100%", width: "100%" }}
                  opts={{ renderer: "svg" }}
                  notMerge
                />
              </div>
            </div>

            {/* Event Mix */}
            <div className="rounded-xl border border-border/70 bg-card/60 p-4 backdrop-blur-sm shadow-sm space-y-2">
              <div>
                <h4 className="text-xs font-semibold text-foreground">Action Type Mix by Editor</h4>
                <p className="text-[10px] text-muted-foreground">Reviews vs Comments vs Commits/Other</p>
              </div>
              <div className="h-[280px] w-full">
                <ReactECharts
                  option={breakdownEventOption}
                  style={{ height: "100%", width: "100%" }}
                  opts={{ renderer: "svg" }}
                  notMerge
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
