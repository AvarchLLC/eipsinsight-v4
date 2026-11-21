"use client";

import React, { useState, useMemo, useCallback } from "react";
import ReactECharts from "echarts-for-react";
import { Download, TrendingUp } from "lucide-react";
import { LastUpdated } from "@/components/analytics/LastUpdated";
import { MonthlyTrendPoint, editorColor, editorAreaColor, downloadCsv } from "./types";

interface EditorsTrendsTabProps {
  monthlyTrend: MonthlyTrendPoint[];
  monthlyReviewedTrend: MonthlyTrendPoint[];
  dataUpdatedAt: Date;
}

export function EditorsTrendsTab({
  monthlyTrend,
  monthlyReviewedTrend,
  dataUpdatedAt,
}: EditorsTrendsTabProps) {
  const [trendMetric, setTrendMetric] = useState<"reviews" | "actions" | "other">("reviews");

  const trendActors = useMemo(() => {
    if (monthlyTrend.length === 0) return [];
    const actors = new Set<string>();
    monthlyTrend.forEach((point) => {
      Object.keys(point).forEach((key) => {
        if (key !== "month" && typeof point[key] === "number") {
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

  // Reviewed Trend Option
  const reviewedTrendOption = useMemo(
    () => ({
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        formatter: (params: Array<any>) => {
          if (!Array.isArray(params)) return "";
          const title = params[0]?.axisValue || "";
          const items = params
            .map(
              (p) =>
                `<div style="color: ${p.color}; padding: 1px 0;"><strong>${p.seriesName}</strong>: ${p.value.toLocaleString()}</div>`,
            )
            .join("");
          return `<div style="padding: 6px; font-size: 11px;"><div style="margin-bottom: 4px; font-weight: 600;">${title}</div>${items}</div>`;
        },
      },
      legend: {
        top: 0,
        textStyle: { color: "var(--muted-foreground)", fontSize: 11 },
        type: "scroll",
      },
      grid: { top: 35, left: 30, right: 20, bottom: 45 },
      xAxis: {
        type: "category",
        data: monthlyReviewedTrend.map((m) => m.month),
        axisLabel: { color: "var(--muted-foreground)", fontSize: 10 },
        splitLine: { show: true, lineStyle: { color: "rgba(148,163,184,0.12)", type: "dashed" } },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: "var(--muted-foreground)", fontSize: 10 },
        splitLine: { lineStyle: { color: "rgba(148,163,184,0.15)", type: "dashed" } },
      },
      dataZoom: [
        {
          type: "slider",
          show: true,
          realtime: true,
          height: 20,
          bottom: 4,
          borderColor: "rgba(148,163,184,0.15)",
          backgroundColor: "rgba(148,163,184,0.03)",
          fillerColor: "rgba(34,211,238,0.12)",
          showDetail: true,
          start: 40,
          end: 100,
          textStyle: { color: "var(--muted-foreground)", fontSize: 10 },
        },
        { type: "inside", realtime: true, start: 40, end: 100 },
      ],
      series: reviewedTrendActors.map((actor, idx) => ({
        name: actor,
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 4,
        lineStyle: { width: 2, color: editorColor(idx) },
        itemStyle: { color: editorColor(idx) },
        areaStyle: { color: editorAreaColor(idx) },
        data: monthlyReviewedTrend.map((p) => Number(p[actor] || 0)),
      })),
    }),
    [monthlyReviewedTrend, reviewedTrendActors],
  );

  // All Actions Trend Option
  const allActionsTrendOption = useMemo(
    () => ({
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        formatter: (params: Array<any>) => {
          if (!Array.isArray(params)) return "";
          const title = params[0]?.axisValue || "";
          const items = params
            .map(
              (p) =>
                `<div style="color: ${p.color}; padding: 1px 0;"><strong>${p.seriesName}</strong>: ${p.value.toLocaleString()}</div>`,
            )
            .join("");
          return `<div style="padding: 6px; font-size: 11px;"><div style="margin-bottom: 4px; font-weight: 600;">${title}</div>${items}</div>`;
        },
      },
      legend: {
        top: 0,
        textStyle: { color: "var(--muted-foreground)", fontSize: 11 },
        type: "scroll",
      },
      grid: { top: 35, left: 30, right: 20, bottom: 45 },
      xAxis: {
        type: "category",
        data: monthlyTrend.map((m) => m.month),
        axisLabel: { color: "var(--muted-foreground)", fontSize: 10 },
        splitLine: { show: true, lineStyle: { color: "rgba(148,163,184,0.12)", type: "dashed" } },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: "var(--muted-foreground)", fontSize: 10 },
        splitLine: { lineStyle: { color: "rgba(148,163,184,0.15)", type: "dashed" } },
      },
      dataZoom: [
        {
          type: "slider",
          show: true,
          realtime: true,
          height: 20,
          bottom: 4,
          borderColor: "rgba(148,163,184,0.15)",
          backgroundColor: "rgba(148,163,184,0.03)",
          fillerColor: "rgba(34,211,238,0.12)",
          showDetail: true,
          start: 40,
          end: 100,
          textStyle: { color: "var(--muted-foreground)", fontSize: 10 },
        },
        { type: "inside", realtime: true, start: 40, end: 100 },
      ],
      series: trendActors.map((actor, idx) => ({
        name: actor,
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 4,
        lineStyle: { width: 2, color: editorColor(idx) },
        itemStyle: { color: editorColor(idx) },
        areaStyle: { color: editorAreaColor(idx) },
        data: monthlyTrend.map((p) => Number(p[actor] || 0)),
      })),
    }),
    [monthlyTrend, trendActors],
  );

  // Other Actions Trend Option
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
                `<div style="color: ${p.color}; padding: 1px 0;"><strong>${p.seriesName}</strong>: ${p.value.toLocaleString()}</div>`,
            )
            .join("");
          return `<div style="padding: 6px; font-size: 11px;"><div style="margin-bottom: 4px; font-weight: 600;">${title}</div>${items}</div>`;
        },
      },
      legend: {
        top: 0,
        textStyle: { color: "var(--muted-foreground)", fontSize: 11 },
        type: "scroll",
      },
      grid: { top: 35, left: 30, right: 20, bottom: 45 },
      xAxis: {
        type: "category",
        data: otherTrend.map((m) => m.month),
        axisLabel: { color: "var(--muted-foreground)", fontSize: 10 },
        splitLine: { show: true, lineStyle: { color: "rgba(148,163,184,0.12)", type: "dashed" } },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: "var(--muted-foreground)", fontSize: 10 },
        splitLine: { lineStyle: { color: "rgba(148,163,184,0.15)", type: "dashed" } },
      },
      dataZoom: [
        {
          type: "slider",
          show: true,
          realtime: true,
          height: 20,
          bottom: 4,
          borderColor: "rgba(148,163,184,0.15)",
          backgroundColor: "rgba(148,163,184,0.03)",
          fillerColor: "rgba(34,211,238,0.12)",
          showDetail: true,
          start: 40,
          end: 100,
          textStyle: { color: "var(--muted-foreground)", fontSize: 10 },
        },
        { type: "inside", realtime: true, start: 40, end: 100 },
      ],
      series: trendActors.map((actor, idx) => ({
        name: actor,
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 4,
        lineStyle: { width: 2, color: editorColor(idx) },
        itemStyle: { color: editorColor(idx) },
        areaStyle: { color: editorAreaColor(idx) },
        data: otherTrend.map((p) => Number(p[actor] || 0)),
      })),
    };
  }, [monthlyTrend, monthlyReviewedTrend, trendActors]);

  const activeOption = useMemo(() => {
    if (trendMetric === "reviews") return reviewedTrendOption;
    if (trendMetric === "actions") return allActionsTrendOption;
    return otherTrendOption;
  }, [trendMetric, reviewedTrendOption, allActionsTrendOption, otherTrendOption]);

  const handleExport = useCallback(() => {
    if (trendMetric === "actions") {
      const headers = ["Month", ...trendActors];
      const rows = monthlyTrend.map((row) => [row.month, ...trendActors.map((actor) => Number(row[actor] || 0))]);
      downloadCsv(`editors-activity-over-time-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    } else if (trendMetric === "reviews") {
      const headers = ["Month", ...reviewedTrendActors];
      const rows = monthlyReviewedTrend.map((row) => [
        row.month,
        ...reviewedTrendActors.map((actor) => Number(row[actor] || 0)),
      ]);
      downloadCsv(`editors-prs-reviewed-monthly-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    } else {
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
    }
  }, [trendMetric, trendActors, reviewedTrendActors, monthlyTrend, monthlyReviewedTrend]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/70 bg-card/60 p-4 sm:p-5 backdrop-blur-sm shadow-sm space-y-4">
        {/* Controls Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Editorial Velocity Trends</h3>
            <p className="text-[11px] text-muted-foreground">
              Historical progression of editorial throughput recorded monthly over the past 72 months
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={trendMetric}
              onChange={(e) => setTrendMetric(e.target.value as "reviews" | "actions" | "other")}
              className="h-8 rounded-lg border border-border bg-background/80 px-2.5 text-xs text-foreground font-medium cursor-pointer focus:outline-none focus:border-primary/50"
              aria-label="Select trend metric"
            >
              <option value="reviews">PRs Reviewed (Monthly)</option>
              <option value="actions">All Editor Actions</option>
              <option value="other">Other Actions (Monthly)</option>
            </select>

            <button
              type="button"
              onClick={handleExport}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[360px] w-full">
          <ReactECharts
            option={activeOption}
            style={{ height: "100%", width: "100%" }}
            opts={{ renderer: "svg" }}
            notMerge
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/50 pt-2.5 text-[10px] text-muted-foreground">
          <span>
            {trendMetric === "reviews"
              ? "Distinct PRs reviewed each month per editor (approval, change request, or review comment)."
              : trendMetric === "actions"
                ? "Total editor actions recorded each calendar month."
                : "Comments, commits, and PR events excluding formal reviews."}
          </span>
          <LastUpdated timestamp={dataUpdatedAt} className="text-xs" />
        </div>
      </div>
    </div>
  );
}
