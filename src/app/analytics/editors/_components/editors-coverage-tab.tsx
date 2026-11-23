"use client";

import React, { useState, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import {
  Layers,
  ShieldAlert,
  ShieldCheck,
  Activity,
  GitPullRequest,
  BarChart2,
  PieChart,
  Users,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LedgerBadge } from "@/components/ledger/badge";
import {
  CategoryCoverage,
  categoryColors,
  editorColor,
  getGitHubAvatarUrl,
  TRACK_META,
  formatCategoryName,
} from "./types";

interface EditorsCoverageTabProps {
  categoryData: Array<{ category: string; count: number; actors: string[] }>;
  categoryCoverage: CategoryCoverage[];
  thinCoverageCategories: string[];
  onSelectEditor?: (actor: string) => void;
}

type ChartViewMode = "share" | "reviews" | "actions";
type ActionFilter = "all" | "review" | "comment" | "commit";

export function EditorsCoverageTab({
  categoryCoverage,
  thinCoverageCategories,
  onSelectEditor,
}: EditorsCoverageTabProps) {
  const [chartMode, setChartMode] = useState<ChartViewMode>("share");
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all");

  // Comprehensive processed data per track
  const tracksData = useMemo(() => {
    // Collect all canonical actors
    const actorSet = new Set<string>();

    const tracks = categoryCoverage
      .map((entry) => {
        const catKey = entry.category.toLowerCase().trim();
        const meta = TRACK_META[catKey] || {
          title: formatCategoryName(entry.category),
          tagline: "Standards & Specifications",
          color: categoryColors[catKey] || "#94a3b8",
        };

        const actorCounts = entry.actorCounts ?? [];
        actorCounts.forEach((a) => {
          if (a.count > 0) actorSet.add(a.actor);
        });

        const totalActions = actorCounts.reduce((sum, a) => sum + a.count, 0);
        const totalReviews = actorCounts.reduce((sum, a) => sum + a.reviews, 0);
        const totalComments = actorCounts.reduce((sum, a) => sum + a.comments, 0);
        const totalCommits = actorCounts.reduce((sum, a) => sum + a.commits, 0);

        // Sort actors by total actions descending
        const sortedActors = [...actorCounts]
          .filter((a) => a.count > 0)
          .sort((a, b) => b.count - a.count)
          .map((a) => ({
            ...a,
            pct: totalActions > 0 ? Math.round((a.count / totalActions) * 1000) / 10 : 0,
            reviewPct: totalReviews > 0 ? Math.round((a.reviews / totalReviews) * 1000) / 10 : 0,
          }));

        const isThin = thinCoverageCategories.some(
          (c) => c.toLowerCase() === catKey || c.toLowerCase() === entry.category.toLowerCase(),
        );

        return {
          key: catKey,
          name: meta.title,
          tagline: meta.tagline,
          color: meta.color,
          actors: entry.actors,
          actorCounts: sortedActors,
          totalActions,
          totalReviews,
          totalComments,
          totalCommits,
          leadActor: sortedActors[0] ?? null,
          secondaryActor: sortedActors[1] ?? null,
          isThin,
        };
      })
      .filter((t) => t.totalActions > 0 || t.actors.length > 0)
      // Sort tracks by total actions descending (highest volume first)
      .sort((a, b) => b.totalActions - a.totalActions);

    const actorsList = Array.from(actorSet);

    return { tracks, actors: actorsList };
  }, [categoryCoverage, thinCoverageCategories]);

  // Total actions across all tracks
  const totalEcosystemActions = useMemo(() => {
    return tracksData.tracks.reduce((sum, t) => sum + t.totalActions, 0);
  }, [tracksData.tracks]);

  // ECharts Option for Flagship Chart
  const chartOption = useMemo(() => {
    const { tracks, actors } = tracksData;
    if (tracks.length === 0) return {};

    // For horizontal bar chart, reverse so highest volume is at top
    const displayTracks = [...tracks].reverse();
    const trackNames = displayTracks.map((t) => t.name);

    // Map each actor to a fixed index for stable colors
    const actorColorMap = new Map<string, number>();
    actors.forEach((act, idx) => actorColorMap.set(act, idx));

    if (chartMode === "share") {
      // 100% Stacked Proportional Share
      return {
        backgroundColor: "transparent",
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "shadow" },
          backgroundColor: "rgba(15, 23, 42, 0.95)",
          borderColor: "rgba(148, 163, 184, 0.2)",
          textStyle: { color: "#f8fafc", fontSize: 11 },
          formatter: (params: any[]) => {
            if (!params || params.length === 0) return "";
            const catName = params[0].name;
            const targetTrack = tracks.find((t) => t.name === catName);
            const total = targetTrack?.totalActions || 0;

            const rows = params
              .filter((p) => Number(p.value) > 0)
              .sort((a, b) => Number(b.value) - Number(a.value))
              .map((p) => {
                const actorCount =
                  targetTrack?.actorCounts.find((a) => a.actor === p.seriesName)?.count || 0;
                return `
                  <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:2px 0;">
                    <div style="display:flex;align-items:center;gap:6px;">
                      <span style="width:8px;height:8px;border-radius:50%;background-color:${p.color};"></span>
                      <strong style="color:${p.color};">${p.seriesName}</strong>
                    </div>
                    <div style="font-family:monospace;font-size:11px;">
                      ${Number(p.value).toFixed(1)}% <span style="opacity:0.6;">(${actorCount.toLocaleString()})</span>
                    </div>
                  </div>
                `;
              })
              .join("");

            return `
              <div style="padding:6px; min-width:200px;">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.1);">
                  <span style="width:8px;height:8px;border-radius:50%;background-color:${targetTrack?.color};"></span>
                  <span style="font-weight:600;font-size:12px;">${catName}</span>
                  <span style="opacity:0.6;font-size:10px;margin-left:auto;">${total.toLocaleString()} total actions</span>
                </div>
                ${rows}
              </div>
            `;
          },
        },
        legend: {
          textStyle: { color: "var(--muted-foreground)", fontSize: 11 },
          type: "scroll",
          bottom: 4,
          left: "center",
          padding: [0, 60, 0, 20],
        },
        grid: {
          top: 25,
          left: 110,
          right: 35,
          bottom: 50,
          containLabel: true,
        },
        xAxis: {
          type: "value",
          max: 100,
          axisLabel: {
            color: "var(--muted-foreground)",
            fontSize: 10,
            formatter: "{value}%",
          },
          splitLine: {
            lineStyle: { color: "rgba(148,163,184,0.12)", type: "dashed" },
          },
        },
        yAxis: {
          type: "category",
          data: trackNames,
          axisLabel: {
            color: "var(--foreground)",
            fontSize: 12,
            fontWeight: 600,
          },
          axisTick: { show: false },
          axisLine: { show: false },
        },
        series: actors.map((actor) => {
          const colorIdx = actorColorMap.get(actor) ?? 0;
          return {
            name: actor,
            type: "bar",
            stack: "share",
            emphasis: { focus: "series" },
            itemStyle: {
              color: editorColor(colorIdx),
            },
            data: displayTracks.map((t) => {
              const match = t.actorCounts.find((a) => a.actor === actor);
              return match ? match.pct : 0;
            }),
          };
        }),
      };
    }

    if (chartMode === "reviews") {
      // Absolute PR Reviews per category
      return {
        backgroundColor: "transparent",
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "shadow" },
          backgroundColor: "rgba(15, 23, 42, 0.95)",
          borderColor: "rgba(148, 163, 184, 0.2)",
          textStyle: { color: "#f8fafc", fontSize: 11 },
          formatter: (params: any[]) => {
            if (!params || params.length === 0) return "";
            const catName = params[0].name;
            const targetTrack = tracks.find((t) => t.name === catName);
            const total = targetTrack?.totalReviews || 0;

            const rows = params
              .filter((p) => Number(p.value) > 0)
              .sort((a, b) => Number(b.value) - Number(a.value))
              .map((p) => {
                const pct = total > 0 ? ((Number(p.value) / total) * 100).toFixed(1) : "0";
                return `
                  <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:2px 0;">
                    <div style="display:flex;align-items:center;gap:6px;">
                      <span style="width:8px;height:8px;border-radius:50%;background-color:${p.color};"></span>
                      <strong style="color:${p.color};">${p.seriesName}</strong>
                    </div>
                    <div style="font-family:monospace;font-size:11px;">
                      ${Number(p.value).toLocaleString()} reviews <span style="opacity:0.6;">(${pct}%)</span>
                    </div>
                  </div>
                `;
              })
              .join("");

            return `
              <div style="padding:6px; min-width:200px;">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.1);">
                  <span style="width:8px;height:8px;border-radius:50%;background-color:${targetTrack?.color};"></span>
                  <span style="font-weight:600;font-size:12px;">${catName}</span>
                  <span style="opacity:0.6;font-size:10px;margin-left:auto;">${total.toLocaleString()} total reviews</span>
                </div>
                ${rows}
              </div>
            `;
          },
        },
        legend: {
          textStyle: { color: "var(--muted-foreground)", fontSize: 11 },
          type: "scroll",
          bottom: 4,
          left: "center",
          padding: [0, 60, 0, 20],
        },
        grid: {
          top: 25,
          left: 110,
          right: 35,
          bottom: 50,
          containLabel: true,
        },
        xAxis: {
          type: "value",
          axisLabel: {
            color: "var(--muted-foreground)",
            fontSize: 10,
            formatter: (val: number) => val.toLocaleString(),
          },
          splitLine: {
            lineStyle: { color: "rgba(148,163,184,0.12)", type: "dashed" },
          },
        },
        yAxis: {
          type: "category",
          data: trackNames,
          axisLabel: {
            color: "var(--foreground)",
            fontSize: 12,
            fontWeight: 600,
          },
          axisTick: { show: false },
          axisLine: { show: false },
        },
        series: actors.map((actor) => {
          const colorIdx = actorColorMap.get(actor) ?? 0;
          return {
            name: actor,
            type: "bar",
            stack: "reviews",
            emphasis: { focus: "series" },
            itemStyle: {
              color: editorColor(colorIdx),
            },
            data: displayTracks.map((t) => {
              const match = t.actorCounts.find((a) => a.actor === actor);
              return match ? match.reviews : 0;
            }),
          };
        }),
      };
    }

    // "actions" Mode (with sub-filter)
    const filterLabel =
      actionFilter === "all"
        ? "actions"
        : actionFilter === "review"
          ? "reviews"
          : actionFilter === "comment"
            ? "comments"
            : "commits";

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: "rgba(15, 23, 42, 0.95)",
        borderColor: "rgba(148, 163, 184, 0.2)",
        textStyle: { color: "#f8fafc", fontSize: 11 },
        formatter: (params: any[]) => {
          if (!params || params.length === 0) return "";
          const catName = params[0].name;
          const targetTrack = tracks.find((t) => t.name === catName);

          const sumVal = params.reduce((acc, p) => acc + (Number(p.value) || 0), 0);

          const rows = params
            .filter((p) => Number(p.value) > 0)
            .sort((a, b) => Number(b.value) - Number(a.value))
            .map((p) => {
              const pct = sumVal > 0 ? ((Number(p.value) / sumVal) * 100).toFixed(1) : "0";
              return `
                <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:2px 0;">
                  <div style="display:flex;align-items:center;gap:6px;">
                    <span style="width:8px;height:8px;border-radius:50%;background-color:${p.color};"></span>
                    <strong style="color:${p.color};">${p.seriesName}</strong>
                  </div>
                  <div style="font-family:monospace;font-size:11px;">
                    ${Number(p.value).toLocaleString()} <span style="opacity:0.6;">(${pct}%)</span>
                  </div>
                </div>
              `;
            })
            .join("");

          return `
            <div style="padding:6px; min-width:200px;">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.1);">
                <span style="width:8px;height:8px;border-radius:50%;background-color:${targetTrack?.color};"></span>
                <span style="font-weight:600;font-size:12px;">${catName}</span>
                <span style="opacity:0.6;font-size:10px;margin-left:auto;">${sumVal.toLocaleString()} ${filterLabel}</span>
              </div>
              ${rows}
            </div>
          `;
        },
      },
      legend: {
        textStyle: { color: "var(--muted-foreground)", fontSize: 11 },
        type: "scroll",
        bottom: 4,
        left: "center",
        padding: [0, 60, 0, 20],
      },
      grid: {
        top: 25,
        left: 110,
        right: 35,
        bottom: 50,
        containLabel: true,
      },
      xAxis: {
        type: "value",
        axisLabel: {
          color: "var(--muted-foreground)",
          fontSize: 10,
          formatter: (val: number) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toString()),
        },
        splitLine: {
          lineStyle: { color: "rgba(148,163,184,0.12)", type: "dashed" },
        },
      },
      yAxis: {
        type: "category",
        data: trackNames,
        axisLabel: {
          color: "var(--foreground)",
          fontSize: 12,
          fontWeight: 600,
        },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      series: actors.map((actor) => {
        const colorIdx = actorColorMap.get(actor) ?? 0;
        return {
          name: actor,
          type: "bar",
          stack: "actions",
          emphasis: { focus: "series" },
          itemStyle: {
            color: editorColor(colorIdx),
          },
          data: displayTracks.map((t) => {
            const match = t.actorCounts.find((a) => a.actor === actor);
            if (!match) return 0;
            return actionFilter === "review"
              ? match.reviews
              : actionFilter === "comment"
                ? match.comments
                : actionFilter === "commit"
                  ? match.commits
                  : match.count;
          }),
        };
      }),
    };
  }, [tracksData, chartMode, actionFilter]);

  // Map editor handle to color index helper
  const getActorColorIdx = useMemo(() => {
    const map = new Map<string, number>();
    tracksData.actors.forEach((act, idx) => map.set(act, idx));
    return (actor: string) => map.get(actor) ?? 0;
  }, [tracksData.actors]);

  return (
    <div className="space-y-6">
      {/* Category Track Cards Grid */}
      <div className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Category Coverage & Track Specialization
            </h3>
            <p className="text-xs text-muted-foreground">
              Editorial staffing, lead reviewers, and workload distribution across Ethereum standards tracks
            </p>
          </div>
          {thinCoverageCategories.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-500">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>{thinCoverageCategories.length} thin categories</span>
            </span>
          )}
        </div>

        {/* Spacious 3-Column Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tracksData.tracks.map((track) => {
            const topTwo = track.actorCounts.slice(0, 2);

            return (
              <div
                key={track.key}
                className={cn(
                  "card p-4.5 flex flex-col justify-between transition-colors hover:border-[var(--ink)]",
                  track.isThin && "border-[var(--c-withdrawn)]/40 bg-[var(--surface-2)]",
                )}
              >
                <div>
                  {/* Track Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: `var(--c-${track.key}, ${track.color})` }}
                        />
                        <h4 className="text-sm font-semibold text-[var(--ink)] tracking-tight truncate">
                          {track.name}
                        </h4>
                      </div>
                      <p className="text-[11px] text-[var(--ink-muted)] truncate">{track.tagline}</p>
                    </div>

                    {track.isThin ? (
                      <LedgerBadge token="withdrawn" label="Thin" />
                    ) : (
                      <LedgerBadge token="final" label="Healthy" />
                    )}
                  </div>

                  {/* Volume Counters */}
                  <div className="grid grid-cols-2 gap-2 py-2 px-3 rounded-[var(--l-radius-control)] bg-[var(--surface-2)] border border-[var(--border)]">
                    <div>
                      <div className="flex items-center gap-1 text-[10px] text-[var(--ink-muted)]">
                        <Activity className="h-3 w-3 text-[var(--ink-muted)]" />
                        <span>All Actions</span>
                      </div>
                      <p className="text-base font-semibold font-mono text-[var(--ink)] tabular-nums">
                        {track.totalActions.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-[10px] text-[var(--ink-muted)]">
                        <GitPullRequest className="h-3 w-3 text-[var(--ink-muted)]" />
                        <span>PR Reviews</span>
                      </div>
                      <p className="text-base font-semibold font-mono text-[var(--ink)] tabular-nums">
                        {track.totalReviews.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Mini Proportional Progress Bar */}
                  <div className="mt-3.5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground font-medium">Editor Workload Share</span>
                      <span className="text-muted-foreground font-mono text-[10px]">
                        {track.actors.length} active
                      </span>
                    </div>

                    <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden flex shadow-inner">
                      {track.actorCounts.map((act) => (
                        <div
                          key={act.actor}
                          style={{
                            width: `${act.pct}%`,
                            backgroundColor: editorColor(getActorColorIdx(act.actor)),
                          }}
                          className="h-full transition-all"
                          title={`${act.actor}: ${act.pct}% (${act.count.toLocaleString()} actions)`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Top Contributors & Editors Strip */}
                <div className="mt-4 pt-3 border-t border-border/40 space-y-2">
                  {/* Top 2 Editors with Share */}
                  {topTwo.length > 0 && (
                    <div className="space-y-1.5">
                      {topTwo.map((act, i) => (
                        <div key={act.actor} className="flex items-center justify-between text-xs">
                          <button
                            type="button"
                            onClick={() => onSelectEditor?.(act.actor)}
                            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer group/btn truncate"
                          >
                            <img
                              src={getGitHubAvatarUrl(act.actor)}
                              alt={act.actor}
                              className="h-4 w-4 rounded-full border border-border/80 object-cover shrink-0"
                            />
                            <span className="font-medium truncate group-hover/btn:underline">
                              {act.actor}
                            </span>
                            {i === 0 && (
                              <span className="rounded bg-primary/10 px-1 py-0.2 text-[9px] font-bold text-primary shrink-0">
                                Lead
                              </span>
                            )}
                          </button>
                          <div className="text-[11px] font-mono text-muted-foreground shrink-0 pl-2">
                            <strong className="text-foreground">{act.pct}%</strong>{" "}
                            <span className="opacity-60">({act.count.toLocaleString()})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Active Reviewers Avatar Strip */}
                  <div className="pt-1 flex items-center justify-between">
                    <div className="flex items-center -space-x-1.5 overflow-hidden">
                      {track.actors.slice(0, 5).map((actor) => (
                        <button
                          key={actor}
                          type="button"
                          onClick={() => onSelectEditor?.(actor)}
                          title={`View ${actor}'s contributions`}
                          className="cursor-pointer transition-transform hover:scale-115 hover:z-10"
                        >
                          <img
                            src={getGitHubAvatarUrl(actor)}
                            alt={actor}
                            className="h-5 w-5 rounded-full border-2 border-background object-cover"
                            loading="lazy"
                          />
                        </button>
                      ))}
                      {track.actors.length > 5 && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-muted text-[9px] font-semibold text-muted-foreground">
                          +{track.actors.length - 5}
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] text-muted-foreground">
                      {totalEcosystemActions > 0
                        ? `${((track.totalActions / totalEcosystemActions) * 100).toFixed(1)}% of all tracks`
                        : ""}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Flagship Unified Visualization Card */}
      <div className="card p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-[var(--ink)] flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-[var(--brand-strong)]" />
              Category Workload & Specialization Explorer
            </h4>
            <p className="text-[11px] text-[var(--ink-muted)]">
              {chartMode === "share" &&
                "Proportion of activity each editor contributes to each standards track (100% Normalized)"}
              {chartMode === "reviews" &&
                "Distinct pull request reviews conducted across each standards track"}
              {chartMode === "actions" &&
                "Absolute tracked event volume across standards tracks filtered by action type"}
            </p>
          </div>

          {/* Controls: Mode Switcher & Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1 rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface-2)] p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setChartMode("share")}
                data-active={chartMode === "share" ? "true" : undefined}
                className="chip h-7 px-2.5 text-xs border-transparent bg-transparent hover:border-transparent cursor-pointer flex items-center gap-1.5"
              >
                <PieChart className="h-3.5 w-3.5" />
                <span>Share (%)</span>
              </button>
              <button
                type="button"
                onClick={() => setChartMode("reviews")}
                data-active={chartMode === "reviews" ? "true" : undefined}
                className="chip h-7 px-2.5 text-xs border-transparent bg-transparent hover:border-transparent cursor-pointer flex items-center gap-1.5"
              >
                <GitPullRequest className="h-3.5 w-3.5" />
                <span>PR Reviews</span>
              </button>
              <button
                type="button"
                onClick={() => setChartMode("actions")}
                data-active={chartMode === "actions" ? "true" : undefined}
                className="chip h-7 px-2.5 text-xs border-transparent bg-transparent hover:border-transparent cursor-pointer flex items-center gap-1.5"
              >
                <Activity className="h-3.5 w-3.5" />
                <span>All Actions</span>
              </button>
            </div>

            {/* Action Type Sub-Filter (only visible in actions mode) */}
            {chartMode === "actions" && (
              <div className="inline-flex items-center gap-1 rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface-2)] p-0.5 text-xs">
                {(
                  [
                    ["all", "All"],
                    ["review", "Reviews"],
                    ["comment", "Comments"],
                    ["commit", "Commits"],
                  ] as const
                ).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setActionFilter(val)}
                    data-active={actionFilter === val ? "true" : undefined}
                    className="chip h-7 px-2 text-[11px] border-transparent bg-transparent hover:border-transparent cursor-pointer"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* High-Impact ECharts Canvas */}
        <div className="h-[380px] w-full">
          <ReactECharts
            option={chartOption}
            style={{ height: "100%", width: "100%" }}
            opts={{ renderer: "svg" }}
            notMerge
          />
        </div>
      </div>

      {/* Structured Category Directory Matrix Table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold text-[var(--ink)]">Category Coverage Directory</h4>
            <p className="text-[10px] text-[var(--ink-muted)]">
              Tabular view of staffing depth, leading contributors, and action totals by track
            </p>
          </div>
          <span className="text-[10px] text-[var(--ink-muted)] font-mono">
            {tracksData.tracks.length} active tracks
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-[11px] font-semibold text-muted-foreground border-b border-border/60">
              <tr>
                <th className="py-2.5 px-4">Track</th>
                <th className="py-2.5 px-4 text-right">Total Actions</th>
                <th className="py-2.5 px-4 text-right">PR Reviews</th>
                <th className="py-2.5 px-4">Lead Contributor</th>
                <th className="py-2.5 px-4">Secondary Contributor</th>
                <th className="py-2.5 px-4">Active Editors</th>
                <th className="py-2.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {tracksData.tracks.map((t) => (
                <tr key={t.key} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: t.color }}
                      />
                      <div>
                        <span className="font-semibold text-foreground">{t.name}</span>
                        <p className="text-[10px] text-muted-foreground">{t.tagline}</p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4 text-right font-mono font-medium text-foreground">
                    {t.totalActions.toLocaleString()}
                    <span className="block text-[10px] font-normal text-muted-foreground">
                      {totalEcosystemActions > 0
                        ? `${((t.totalActions / totalEcosystemActions) * 100).toFixed(1)}% share`
                        : ""}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-right font-mono font-medium text-foreground">
                    {t.totalReviews.toLocaleString()}
                  </td>

                  <td className="py-3 px-4">
                    {t.leadActor ? (
                      <button
                        type="button"
                        onClick={() => onSelectEditor?.(t.leadActor!.actor)}
                        className="flex items-center gap-2 text-foreground hover:text-primary transition-colors cursor-pointer group"
                      >
                        <img
                          src={getGitHubAvatarUrl(t.leadActor.actor)}
                          alt={t.leadActor.actor}
                          className="h-5 w-5 rounded-full border border-border/80 object-cover"
                        />
                        <div className="text-left">
                          <span className="font-semibold group-hover:underline">
                            {t.leadActor.actor}
                          </span>
                          <span className="block text-[10px] font-mono text-muted-foreground">
                            {t.leadActor.pct}% ({t.leadActor.count.toLocaleString()})
                          </span>
                        </div>
                      </button>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>

                  <td className="py-3 px-4">
                    {t.secondaryActor ? (
                      <button
                        type="button"
                        onClick={() => onSelectEditor?.(t.secondaryActor!.actor)}
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer group"
                      >
                        <img
                          src={getGitHubAvatarUrl(t.secondaryActor.actor)}
                          alt={t.secondaryActor.actor}
                          className="h-5 w-5 rounded-full border border-border/80 object-cover"
                        />
                        <div className="text-left">
                          <span className="font-medium group-hover:underline">
                            {t.secondaryActor.actor}
                          </span>
                          <span className="block text-[10px] font-mono opacity-80">
                            {t.secondaryActor.pct}% ({t.secondaryActor.count.toLocaleString()})
                          </span>
                        </div>
                      </button>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center -space-x-1.5">
                      {t.actors.slice(0, 5).map((actor) => (
                        <button
                          key={actor}
                          type="button"
                          onClick={() => onSelectEditor?.(actor)}
                          title={actor}
                          className="cursor-pointer transition-transform hover:scale-115 hover:z-10"
                        >
                          <img
                            src={getGitHubAvatarUrl(actor)}
                            alt={actor}
                            className="h-5 w-5 rounded-full border-2 border-background object-cover"
                          />
                        </button>
                      ))}
                      {t.actors.length > 5 && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-muted text-[9px] font-semibold text-muted-foreground">
                          +{t.actors.length - 5}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3 px-4 text-center">
                    {t.isThin ? (
                      <span className="inline-flex items-center gap-1 rounded bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                        <ShieldAlert className="h-3 w-3" />
                        Thin
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        Healthy
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
