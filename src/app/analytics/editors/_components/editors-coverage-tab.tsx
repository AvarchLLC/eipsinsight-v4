"use client";

import React, { useState, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { Grid3x3, ShieldAlert, ShieldCheck, User, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CategoryCoverage,
  categoryColors,
  editorColor,
  getGitHubAvatarUrl,
} from "./types";

interface EditorsCoverageTabProps {
  categoryData: Array<{ category: string; count: number; actors: string[] }>;
  categoryCoverage: CategoryCoverage[];
  thinCoverageCategories: string[];
  onSelectEditor?: (actor: string) => void;
}

export function EditorsCoverageTab({
  categoryData,
  categoryCoverage,
  thinCoverageCategories,
  onSelectEditor,
}: EditorsCoverageTabProps) {
  const [categoryActionType, setCategoryActionType] = useState<"all" | "review" | "comment" | "commit">("all");

  // Per-category real action counts straight from DB
  const categoryActionsData = useMemo(() => {
    const data: Array<{ category: string; actor: string; count: number }> = [];

    const normalizeCategory = (cat: string) => {
      const c = cat.trim().toUpperCase();
      if (c === "ERC") return "ERC";
      if (c === "RIP") return "RIP";
      return cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
    };

    const pick = (c: { count: number; reviews: number; comments: number; commits: number }) =>
      categoryActionType === "review"
        ? c.reviews
        : categoryActionType === "comment"
          ? c.comments
          : categoryActionType === "commit"
            ? c.commits
            : c.count;

    categoryCoverage.forEach((entry) => {
      (entry.actorCounts ?? []).forEach((c) => {
        const count = pick(c);
        if (count > 0) {
          data.push({ category: normalizeCategory(entry.category), actor: c.actor, count });
        }
      });
    });

    return data;
  }, [categoryCoverage, categoryActionType]);

  // Find top contributor for each category
  const topContributorByCategory = useMemo(() => {
    const map: Record<string, { actor: string; count: number }> = {};
    categoryCoverage.forEach((entry) => {
      const sorted = [...(entry.actorCounts ?? [])].sort((a, b) => b.count - a.count);
      if (sorted.length > 0 && sorted[0].count > 0) {
        map[entry.category.toLowerCase()] = {
          actor: sorted[0].actor,
          count: sorted[0].count,
        };
      }
    });
    return map;
  }, [categoryCoverage]);

  // 100% Stacked Coverage Share Chart Option
  const coverageShareOption = useMemo(() => {
    const cats = categoryData.map((c) => c.category);
    const byCat = new Map<string, Map<string, number>>();
    const totals = new Map<string, number>();
    const actorSet = new Set<string>();

    categoryCoverage.forEach((entry) => {
      const m = new Map<string, number>();
      let total = 0;
      (entry.actorCounts ?? []).forEach((c) => {
        if (c.count > 0) {
          m.set(c.actor, c.count);
          actorSet.add(c.actor);
          total += c.count;
        }
      });
      byCat.set(entry.category.toLowerCase(), m);
      totals.set(entry.category.toLowerCase(), total);
    });

    const actors = Array.from(actorSet);

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: any[]) => {
          if (!params || params.length === 0) return "";
          const cat = params[0].name;
          const total = totals.get(cat.toLowerCase()) || 0;
          const rows = params
            .filter((p) => Number(p.value) > 0)
            .sort((a, b) => Number(b.value) - Number(a.value))
            .map((p) => {
              const raw = Math.round((Number(p.value) / 100) * total);
              return `<div style="color:${p.color};padding:2px 0;"><strong>${p.seriesName}</strong>: ${Number(p.value).toFixed(1)}% <span style="opacity:0.7;">(${raw.toLocaleString()})</span></div>`;
            })
            .join("");
          return `<div style="padding:6px; font-size:11px;"><div style="font-weight:600;margin-bottom:4px;">${cat} · ${total.toLocaleString()} actions</div>${rows}</div>`;
        },
      },
      legend: {
        textStyle: { color: "var(--muted-foreground)", fontSize: 11 },
        type: "scroll",
        bottom: 0,
      },
      grid: { top: 20, left: 100, right: 30, bottom: 45 },
      xAxis: {
        type: "value",
        max: 100,
        axisLabel: { color: "var(--muted-foreground)", fontSize: 10, formatter: "{value}%" },
        splitLine: { lineStyle: { color: "rgba(148,163,184,0.12)", type: "dashed" } },
      },
      yAxis: {
        type: "category",
        data: cats,
        axisLabel: { color: "var(--foreground)", fontSize: 11, fontWeight: 500 },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      series: actors.map((actor, idx) => ({
        name: actor,
        type: "bar",
        stack: "coverageShare",
        emphasis: { focus: "series" },
        data: cats.map((cat) => {
          const m = byCat.get(cat.toLowerCase());
          const total = totals.get(cat.toLowerCase()) || 0;
          const v = m?.get(actor) || 0;
          return total > 0 ? Math.round((v / total) * 1000) / 10 : 0;
        }),
        itemStyle: { color: editorColor(idx) },
      })),
    };
  }, [categoryCoverage, categoryData]);

  // Breakdown Category Actions Option
  const breakdownCategoryOption = useMemo(() => {
    const categories = ["Core", "ERC", "Networking", "Interface", "Meta", "Informational", "RIP"];
    const actors = Array.from(new Set(categoryActionsData.map((d) => d.actor)));
    const typeLabel =
      categoryActionType === "all"
        ? "actions"
        : categoryActionType === "review"
          ? "reviews"
          : categoryActionType === "comment"
            ? "comments"
            : "commits";

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
            .sort((a, b) => Number(b.value) - Number(a.value))
            .map((p) => {
              return `<div style="color: ${p.color}; padding: 2px 0;"><strong>${p.seriesName}</strong>: ${Number(p.value).toLocaleString()} ${typeLabel}</div>`;
            })
            .join("");
          return `<div style="padding: 6px; font-size:11px;"><div style="font-weight: 600; margin-bottom: 4px;">Category: ${catName} <span style="opacity:0.7;font-weight:400;">(${typeLabel})</span></div>${items}</div>`;
        },
      },
      legend: {
        textStyle: { color: "var(--muted-foreground)", fontSize: 11 },
        type: "scroll",
        bottom: 0,
      },
      grid: { top: 20, left: 100, right: 30, bottom: 45 },
      xAxis: {
        type: "value",
        axisLabel: { color: "var(--muted-foreground)", fontSize: 10 },
        splitLine: { lineStyle: { color: "rgba(148,163,184,0.12)", type: "dashed" } },
      },
      yAxis: {
        type: "category",
        data: categories,
        axisLabel: { color: "var(--foreground)", fontSize: 11, fontWeight: 500 },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      series: actors.map((actor, idx) => ({
        name: actor,
        type: "bar",
        stack: "categoryActions",
        emphasis: { focus: "series" },
        data: categories.map((cat) => {
          const match = categoryActionsData.find((d) => d.category === cat && d.actor === actor);
          return match ? match.count : 0;
        }),
        itemStyle: {
          color: editorColor(idx),
        },
      })),
    };
  }, [categoryActionsData, categoryActionType]);

  return (
    <div className="space-y-6">
      {/* Category Health Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Category Coverage Health</h3>
            <p className="text-[11px] text-muted-foreground">
              Staffing level and active editors per Ethereum standards category
            </p>
          </div>
          {thinCoverageCategories.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-500">
              <ShieldAlert className="h-3 w-3" />
              <span>{thinCoverageCategories.length} thin categories</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-7">
          {categoryData.map((category) => {
            const isThin = category.count <= 1;
            const color = categoryColors[category.category.toLowerCase()] || "#94a3b8";
            const topContributor = topContributorByCategory[category.category.toLowerCase()];

            return (
              <div
                key={category.category}
                className={cn(
                  "rounded-xl border p-3.5 backdrop-blur-sm transition-all flex flex-col justify-between shadow-sm",
                  isThin
                    ? "border-rose-500/30 bg-rose-500/[0.03] hover:border-rose-500/50"
                    : "border-border/70 bg-card/60 hover:border-primary/40",
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground truncate">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span>{category.category}</span>
                    </span>
                    {isThin ? (
                      <span className="rounded bg-rose-500/15 px-1.5 py-0.2 text-[9px] font-bold text-rose-600 dark:text-rose-400">
                        Risk
                      </span>
                    ) : (
                      <span className="rounded bg-emerald-500/15 px-1.5 py-0.2 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                        Healthy
                      </span>
                    )}
                  </div>

                  <p className="text-2xl font-bold text-foreground tabular-nums tracking-tight">
                    {category.count}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Active Editors</p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-border/40">
                  {/* Editor Avatars */}
                  <div className="flex flex-wrap items-center gap-1">
                    {category.actors.slice(0, 4).map((actor) => (
                      <button
                        key={actor}
                        type="button"
                        onClick={() => onSelectEditor?.(actor)}
                        title={`View ${actor}'s activity`}
                        className="cursor-pointer transition-transform hover:scale-110"
                      >
                        <img
                          src={getGitHubAvatarUrl(actor)}
                          alt={actor}
                          className="h-5 w-5 rounded-full border border-border/80 object-cover"
                          loading="lazy"
                        />
                      </button>
                    ))}
                    {category.actors.length > 4 && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border/80 bg-muted/60 text-[9px] font-semibold text-muted-foreground">
                        +{category.actors.length - 4}
                      </span>
                    )}
                  </div>

                  {topContributor && (
                    <p className="mt-1.5 text-[9px] text-muted-foreground truncate">
                      Lead: <strong className="text-foreground">{topContributor.actor}</strong>
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Visual Charts: Coverage Share and Category Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Coverage Share */}
        <div className="rounded-xl border border-border/70 bg-card/60 p-4 sm:p-5 backdrop-blur-sm shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-semibold text-foreground">Coverage Share by Editor</h4>
              <p className="text-[10px] text-muted-foreground">
                Proportion of actions each editor contributes to each category
              </p>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">100% Stacked</span>
          </div>
          <div className="h-[340px] w-full">
            <ReactECharts
              option={coverageShareOption}
              style={{ height: "100%", width: "100%" }}
              opts={{ renderer: "svg" }}
              notMerge
            />
          </div>
        </div>

        {/* Category Actions by Type */}
        <div className="rounded-xl border border-border/70 bg-card/60 p-4 sm:p-5 backdrop-blur-sm shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-semibold text-foreground">Action Count by Category</h4>
              <p className="text-[10px] text-muted-foreground">Real DB count filtered by action type</p>
            </div>
            {/* Action Type Filter Pills */}
            <div className="inline-flex items-center rounded-lg border border-border/70 bg-muted/40 p-0.5 text-xs">
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
                  onClick={() => setCategoryActionType(val)}
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[11px] font-medium transition-all cursor-pointer",
                    categoryActionType === val
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[340px] w-full">
            <ReactECharts
              option={breakdownCategoryOption}
              style={{ height: "100%", width: "100%" }}
              opts={{ renderer: "svg" }}
              notMerge
            />
          </div>
        </div>
      </div>
    </div>
  );
}
