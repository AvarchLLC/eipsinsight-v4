"use client";

import React, { useState, useMemo, useCallback } from "react";
import ReactECharts from "echarts-for-react";
import { Download, TrendingUp, Calendar, BarChart2 } from "lucide-react";
import { LastUpdated } from "@/components/analytics/LastUpdated";
import { cn } from "@/lib/utils";
import {
  MonthlyTrendPoint,
  DailyActivityStackedRow,
  reviewerColor,
  reviewerAreaColor,
  downloadCsv,
} from "./types";

interface ReviewersTrendsTabProps {
  monthlyTrend: MonthlyTrendPoint[];
  monthlyReviewedTrend: MonthlyTrendPoint[];
  dailyActivityStacked: DailyActivityStackedRow[];
  dataUpdatedAt: Date;
}

export function ReviewersTrendsTab({
  monthlyTrend,
  monthlyReviewedTrend,
  dailyActivityStacked,
  dataUpdatedAt,
}: ReviewersTrendsTabProps) {
  const [trendMetric, setTrendMetric] = useState<"reviewed" | "all" | "daily">("reviewed");

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

  // Reviewed Trend ECharts Option
  const reviewedTrendOption = useMemo(
    () => ({
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(15, 23, 42, 0.95)",
        borderColor: "rgba(148, 163, 184, 0.2)",
        textStyle: { color: "#f8fafc", fontSize: 11 },
        formatter: (params: Array<any>) => {
          if (!Array.isArray(params)) return "";
          const title = params[0]?.axisValue || "";
          const items = params
            .filter((p) => Number(p.value) > 0)
            .sort((a, b) => Number(b.value) - Number(a.value))
            .map(
              (p) =>
                `<div style="display:flex;justify-content:space-between;gap:12px;padding:1px 0;"><span style="color:${p.color};font-weight:600;">${p.seriesName}</span><span style="font-family:monospace;">${Number(p.value).toLocaleString()} PRs</span></div>`,
            )
            .join("");
          const sum = params.reduce((acc, p) => acc + (Number(p.value) || 0), 0);
          return `<div style="padding:6px; min-width:160px;"><div style="margin-bottom:4px; font-weight:600; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:3px;">${title} (${sum.toLocaleString()} total)</div>${items}</div>`;
        },
      },
      legend: {
        top: 0,
        textStyle: { color: "var(--muted-foreground)", fontSize: 11 },
        type: "scroll",
      },
      grid: { top: 35, left: 35, right: 25, bottom: 45, containLabel: true },
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
          start: 20,
          end: 100,
          textStyle: { color: "var(--muted-foreground)", fontSize: 10 },
        },
        { type: "inside", realtime: true, start: 20, end: 100 },
      ],
      series: reviewedTrendActors.map((actor, idx) => ({
        name: actor,
        type: "line",
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2.5, color: reviewerColor(idx) },
        areaStyle: {
          color: reviewerAreaColor(idx),
        },
        data: monthlyReviewedTrend.map((m) => (m[actor] as number) || 0),
      })),
    }),
    [monthlyReviewedTrend, reviewedTrendActors],
  );

  // All Actions Monthly Trend ECharts Option
  const allMonthlyTrendOption = useMemo(
    () => ({
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(15, 23, 42, 0.95)",
        borderColor: "rgba(148, 163, 184, 0.2)",
        textStyle: { color: "#f8fafc", fontSize: 11 },
        formatter: (params: Array<any>) => {
          if (!Array.isArray(params)) return "";
          const title = params[0]?.axisValue || "";
          const items = params
            .filter((p) => Number(p.value) > 0)
            .sort((a, b) => Number(b.value) - Number(a.value))
            .map(
              (p) =>
                `<div style="display:flex;justify-content:space-between;gap:12px;padding:1px 0;"><span style="color:${p.color};font-weight:600;">${p.seriesName}</span><span style="font-family:monospace;">${Number(p.value).toLocaleString()}</span></div>`,
            )
            .join("");
          const sum = params.reduce((acc, p) => acc + (Number(p.value) || 0), 0);
          return `<div style="padding:6px; min-width:160px;"><div style="margin-bottom:4px; font-weight:600; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:3px;">${title} (${sum.toLocaleString()} total)</div>${items}</div>`;
        },
      },
      legend: {
        top: 0,
        textStyle: { color: "var(--muted-foreground)", fontSize: 11 },
        type: "scroll",
      },
      grid: { top: 35, left: 35, right: 25, bottom: 45, containLabel: true },
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
          start: 20,
          end: 100,
          textStyle: { color: "var(--muted-foreground)", fontSize: 10 },
        },
        { type: "inside", realtime: true, start: 20, end: 100 },
      ],
      series: trendActors.map((actor, idx) => ({
        name: actor,
        type: "line",
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2.5, color: reviewerColor(idx) },
        areaStyle: {
          color: reviewerAreaColor(idx),
        },
        data: monthlyTrend.map((m) => (m[actor] as number) || 0),
      })),
    }),
    [monthlyTrend, trendActors],
  );

  // Daily Activity Stacked Bar ECharts Option
  const dailyStackedOption = useMemo(() => {
    const dates = Array.from(new Set(dailyActivityStacked.map((item) => item.date))).sort();
    const activeActors = Array.from(new Set(dailyActivityStacked.map((item) => item.actor))).sort((a, b) =>
      a.localeCompare(b),
    );

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: "rgba(15, 23, 42, 0.95)",
        borderColor: "rgba(148, 163, 184, 0.2)",
        textStyle: { color: "#f8fafc", fontSize: 11 },
        formatter: (params: Array<any>) => {
          if (!Array.isArray(params)) return "";
          const date = params[0]?.axisValue || "";
          const items = params
            .filter((p) => Number(p.value) > 0)
            .map(
              (p) =>
                `<div style="display:flex;justify-content:space-between;gap:12px;padding:1px 0;"><span style="color:${p.color};font-weight:600;">${p.seriesName}</span><span style="font-family:monospace;">${Number(p.value).toLocaleString()}</span></div>`,
            )
            .join("");
          const total = params.reduce((sum, p) => sum + (Number(p.value) || 0), 0);
          return `<div style="padding:6px; min-width:150px;"><div style="margin-bottom:4px; font-weight:600; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:3px;">${date}</div>${items}<div style="margin-top:4px; padding-top:4px; border-top:1px solid rgba(255,255,255,0.2); font-weight:600;">Total: ${total.toLocaleString()}</div></div>`;
        },
      },
      legend: {
        top: 0,
        type: "scroll",
        textStyle: { color: "var(--muted-foreground)", fontSize: 11 },
      },
      grid: { top: 35, left: 35, right: 25, bottom: 45, containLabel: true },
      xAxis: {
        type: "category",
        data: dates,
        axisLabel: { color: "var(--muted-foreground)", fontSize: 10 },
        splitLine: { show: true, lineStyle: { color: "rgba(148,163,184,0.12)", type: "dashed" } },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: "var(--muted-foreground)", fontSize: 10 },
        splitLine: { lineStyle: { color: "rgba(148,163,184,0.15)", type: "dashed" } },
      },
      dataZoom: [
        { type: "inside", xAxisIndex: 0, start: 0, end: 100 },
        {
          type: "slider",
          xAxisIndex: 0,
          bottom: 4,
          height: 20,
          borderColor: "rgba(148,163,184,0.15)",
          backgroundColor: "rgba(148,163,184,0.03)",
          fillerColor: "rgba(34,211,238,0.12)",
          showDetail: true,
          textStyle: { color: "var(--muted-foreground)", fontSize: 10 },
        },
      ],
      series: activeActors.map((actor, idx) => ({
        name: actor,
        type: "bar",
        stack: "reviewers",
        data: dates.map((date) => {
          const row = dailyActivityStacked.find((item) => item.date === date && item.actor === actor);
          return row?.count ?? 0;
        }),
        itemStyle: {
          color: reviewerColor(idx),
        },
      })),
    };
  }, [dailyActivityStacked]);

  const handleExportCSV = useCallback(() => {
    if (trendMetric === "reviewed") {
      const headers = ["Month", ...reviewedTrendActors];
      const rows = monthlyReviewedTrend.map((row) => [
        row.month,
        ...reviewedTrendActors.map((actor) => Number(row[actor] || 0)),
      ]);
      downloadCsv(`reviewers-prs-reviewed-monthly-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    } else if (trendMetric === "all") {
      const headers = ["Month", ...trendActors];
      const rows = monthlyTrend.map((row) => [
        row.month,
        ...trendActors.map((actor) => Number(row[actor] || 0)),
      ]);
      downloadCsv(`reviewers-all-actions-monthly-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    } else {
      const dates = Array.from(new Set(dailyActivityStacked.map((item) => item.date))).sort();
      const actors = Array.from(new Set(dailyActivityStacked.map((item) => item.actor))).sort();
      const headers = ["Date", ...actors];
      const rows = dates.map((date) => [
        date,
        ...actors.map((actor) => {
          const hit = dailyActivityStacked.find((r) => r.date === date && r.actor === actor);
          return hit?.count ?? 0;
        }),
      ]);
      downloadCsv(`reviewers-daily-activity-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    }
  }, [trendMetric, monthlyReviewedTrend, reviewedTrendActors, monthlyTrend, trendActors, dailyActivityStacked]);

  return (
    <div className="space-y-4">
      {/* Chart Card */}
      <div className="rounded-xl border border-border/70 bg-card/60 p-4 sm:p-5 backdrop-blur-sm shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Review Velocity & Longitudinal Trends
            </h3>
            <p className="text-xs text-muted-foreground">
              {trendMetric === "reviewed" && "Monthly distinct pull requests reviewed by each reviewer"}
              {trendMetric === "all" && "All reviewer actions per month (reviews, comments, and commits)"}
              {trendMetric === "daily" && "Daily stacked reviewer activity across all standard repositories"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Metric Toggle */}
            <div className="inline-flex rounded-lg border border-border/70 bg-muted/40 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setTrendMetric("reviewed")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-all cursor-pointer",
                  trendMetric === "reviewed"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                PRs Reviewed (Monthly)
              </button>
              <button
                type="button"
                onClick={() => setTrendMetric("all")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-all cursor-pointer",
                  trendMetric === "all"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                All Actions (Monthly)
              </button>
              <button
                type="button"
                onClick={() => setTrendMetric("daily")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-all cursor-pointer",
                  trendMetric === "daily"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Daily Activity
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

        {/* ECharts Canvas */}
        <div className="h-[380px] w-full">
          <ReactECharts
            option={
              trendMetric === "reviewed"
                ? reviewedTrendOption
                : trendMetric === "all"
                  ? allMonthlyTrendOption
                  : dailyStackedOption
            }
            style={{ height: "100%", width: "100%" }}
            opts={{ renderer: "svg" }}
            notMerge
          />
        </div>

        <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
          <span>Interactive timeline: use the slider below the chart or scroll to zoom in on specific periods.</span>
          <LastUpdated timestamp={dataUpdatedAt} className="text-xs" />
        </div>
      </div>
    </div>
  );
}
