"use client";

import React, { useState, useMemo, useCallback } from "react";
import ReactECharts from "echarts-for-react";
import { SlidersHorizontal, Calendar, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { EditorActionsExplorer } from "@/components/analytics/editor-actions-explorer";
import { DailyActivityStackedRow, editorColor, downloadCsv } from "./types";

interface EditorsActivityTabProps {
  repo?: "eips" | "ercs" | "rips";
  from?: string;
  to?: string;
  actors: string[];
  selectedActor?: string;
  onActorChange?: (actor: string) => void;
  dailyActivityStacked: DailyActivityStackedRow[];
}

export function EditorsActivityTab({
  repo,
  from,
  to,
  actors,
  selectedActor,
  onActorChange,
  dailyActivityStacked,
}: EditorsActivityTabProps) {
  const [subView, setSubView] = useState<"explorer" | "daily">("explorer");

  // Daily Activity Stacked Option for ECharts
  const dailyActivityOption = useMemo(() => {
    const dates = Array.from(new Set(dailyActivityStacked.map((item) => item.date))).sort();
    const activeActors = Array.from(new Set(dailyActivityStacked.map((item) => item.actor))).sort((a, b) =>
      a.localeCompare(b),
    );

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: Array<any>) => {
          if (!Array.isArray(params)) return "";
          const date = params[0]?.axisValue || "";
          const items = params
            .filter((p) => p.value > 0)
            .map(
              (p) =>
                `<div style="color: ${p.color}; padding: 1px 0;"><strong>${p.seriesName}</strong>: ${p.value.toLocaleString()}</div>`,
            )
            .join("");
          const total = params.reduce((sum, p) => sum + (p.value || 0), 0);
          return `<div style="padding: 6px; font-size: 11px;"><div style="margin-bottom: 4px; font-weight: 600;">${date}</div>${items}<div style="margin-top: 4px; padding-top: 4px; border-top: 1px solid rgba(255,255,255,0.2); font-weight: 600;">Total: ${total.toLocaleString()}</div></div>`;
        },
      },
      legend: {
        top: 0,
        type: "scroll",
        textStyle: { color: "var(--muted-foreground)", fontSize: 11 },
      },
      grid: { top: 35, left: 30, right: 20, bottom: 45 },
      xAxis: {
        type: "category",
        data: dates,
        axisLabel: { color: "var(--muted-foreground)", fontSize: 10, hideOverlap: true },
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
        stack: "editors",
        data: dates.map((date) => {
          const row = dailyActivityStacked.find((item) => item.date === date && item.actor === actor);
          return row?.count ?? 0;
        }),
        itemStyle: {
          color: editorColor(idx),
        },
      })),
    };
  }, [dailyActivityStacked]);

  const downloadDailyReport = useCallback(() => {
    const dates = Array.from(new Set(dailyActivityStacked.map((item) => item.date))).sort();
    const activeActors = Array.from(new Set(dailyActivityStacked.map((item) => item.actor))).sort((a, b) =>
      a.localeCompare(b),
    );
    const headers = ["Date", ...activeActors];
    const rows = dates.map((date) => [
      date,
      ...activeActors.map((actor) => {
        const row = dailyActivityStacked.find((item) => item.date === date && item.actor === actor);
        return row?.count ?? 0;
      }),
    ]);
    downloadCsv(`editors-daily-activity-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }, [dailyActivityStacked]);

  return (
    <div className="space-y-4">
      {/* Sub-view switcher */}
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex items-center rounded-lg border border-border/70 bg-muted/40 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setSubView("explorer")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all cursor-pointer",
              subView === "explorer"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>PR Actions Explorer</span>
          </button>
          <button
            type="button"
            onClick={() => setSubView("daily")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all cursor-pointer",
              subView === "daily"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Daily Activity Timeline</span>
          </button>
        </div>

        {subView === "daily" && (
          <button
            type="button"
            onClick={downloadDailyReport}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Daily CSV</span>
          </button>
        )}
      </div>

      {subView === "explorer" ? (
        <EditorActionsExplorer
          repo={repo}
          from={from}
          to={to}
          actors={actors}
          selectedActor={selectedActor}
          onActorChange={onActorChange}
          hideHeader
        />
      ) : (
        <div className="rounded-xl border border-border/70 bg-card/60 p-4 sm:p-5 backdrop-blur-sm shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Daily Editorial Activity</h3>
              <p className="text-[11px] text-muted-foreground">Total actions per calendar day stacked by editor</p>
            </div>
          </div>
          <div className="h-[380px] w-full">
            <ReactECharts
              option={dailyActivityOption}
              style={{ height: "100%", width: "100%" }}
              opts={{ renderer: "svg" }}
              notMerge
            />
          </div>
        </div>
      )}
    </div>
  );
}
