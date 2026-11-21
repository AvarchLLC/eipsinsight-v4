"use client";

import React, { useState, useMemo, useCallback } from "react";
import ReactECharts from "echarts-for-react";
import {
  FolderGit2,
  LayoutGrid,
  BarChart3,
  Download,
  GitPullRequest,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  RepoDistribution,
  CyclesData,
  getGitHubAvatarUrl,
  downloadCsv,
  repoColors,
  OFFICIAL_REVIEWERS,
  reviewerColor,
} from "./types";

interface ReviewersDistributionTabProps {
  repoDistribution: RepoDistribution[];
  cyclesData: CyclesData[];
  onSelectReviewer?: (actor: string) => void;
}

export function ReviewersDistributionTab({
  repoDistribution,
  cyclesData,
  onSelectReviewer,
}: ReviewersDistributionTabProps) {
  const [viewMode, setViewMode] = useState<"cards" | "chart">("cards");

  // Normalized reviewer repo cards data
  const reviewerRepoCards = useMemo(() => {
    const byReviewer: Record<string, { eips: number; ercs: number; rips: number; total: number }> = {};
    OFFICIAL_REVIEWERS.forEach((rev) => {
      byReviewer[rev] = { eips: 0, ercs: 0, rips: 0, total: 0 };
    });

    repoDistribution.forEach((row) => {
      const rev = row.actor;
      if (!byReviewer[rev]) {
        byReviewer[rev] = { eips: 0, ercs: 0, rips: 0, total: 0 };
      }
      const repoName = (row.repo.split("/")[1] || row.repo || "").toLowerCase();
      if (repoName === "eips") byReviewer[rev].eips += row.count;
      else if (repoName === "ercs") byReviewer[rev].ercs += row.count;
      else if (repoName === "rips") byReviewer[rev].rips += row.count;
      byReviewer[rev].total += row.count;
    });

    return OFFICIAL_REVIEWERS.map((rev) => ({
      actor: rev,
      ...byReviewer[rev],
    })).sort((a, b) => b.total - a.total);
  }, [repoDistribution]);

  // ECharts Option for Repo Distribution Stacked Bar Chart
  const repoDistributionOption = useMemo(() => {
    const repos = ["EIPs", "ERCs", "RIPs"];
    const activeReviewers = reviewerRepoCards.filter((r) => r.total > 0);

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
          const repoName = params[0].name;
          const sum = params.reduce((acc, p) => acc + (Number(p.value) || 0), 0);
          const rows = params
            .filter((p) => Number(p.value) > 0)
            .sort((a, b) => Number(b.value) - Number(a.value))
            .map((p) => {
              const pct = sum > 0 ? ((Number(p.value) / sum) * 100).toFixed(1) : "0";
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
            <div style="padding:6px; min-width:180px;">
              <div style="font-weight:600;font-size:12px;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.1);">
                ${repoName} (${sum.toLocaleString()} total reviews)
              </div>
              ${rows}
            </div>
          `;
        },
      },
      legend: {
        type: "scroll",
        bottom: 0,
        textStyle: { color: "var(--muted-foreground)", fontSize: 11 },
      },
      grid: { top: 20, left: 60, right: 30, bottom: 45, containLabel: true },
      xAxis: {
        type: "category",
        data: repos,
        axisLabel: { color: "var(--foreground)", fontSize: 12, fontWeight: 600 },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: "var(--muted-foreground)", fontSize: 11 },
        splitLine: { lineStyle: { color: "rgba(148,163,184,0.12)", type: "dashed" } },
      },
      series: activeReviewers.map((rev, idx) => ({
        name: rev.actor,
        type: "bar",
        stack: "repos",
        itemStyle: {
          color: reviewerColor(idx),
        },
        data: [rev.eips, rev.ercs, rev.rips],
      })),
    };
  }, [reviewerRepoCards]);

  // ECharts Option for Cycles per PR
  const cyclesChartOption = useMemo(() => {
    const sorted = [...cyclesData].sort((a, b) => a.cycles - b.cycles);

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
          const p = params[0];
          return `
            <div style="padding:6px;">
              <div style="font-weight:600;margin-bottom:2px;">${p.name} Reviewers</div>
              <div style="font-family:monospace;font-size:12px;"><strong>${Number(p.value).toLocaleString()}</strong> pull requests</div>
            </div>
          `;
        },
      },
      grid: { top: 20, left: 50, right: 25, bottom: 40, containLabel: true },
      xAxis: {
        type: "category",
        data: sorted.map((c) => `${c.cycles}`),
        name: "Reviewers per PR",
        nameLocation: "middle",
        nameGap: 25,
        nameTextStyle: { color: "var(--muted-foreground)", fontSize: 11 },
        axisLabel: { color: "var(--foreground)", fontSize: 11 },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: "var(--muted-foreground)", fontSize: 11 },
        splitLine: { lineStyle: { color: "rgba(148,163,184,0.12)", type: "dashed" } },
      },
      series: [
        {
          type: "bar",
          data: sorted.map((c) => ({
            value: c.count,
            itemStyle: {
              color: c.cycles <= 2 ? "#10b981" : c.cycles <= 4 ? "#f59e0b" : "#ef4444",
              borderRadius: [4, 4, 0, 0],
            },
          })),
        },
      ],
    };
  }, [cyclesData]);

  const handleExportCSV = useCallback(() => {
    const headers = ["Reviewer", "EIPs", "ERCs", "RIPs", "Total Reviews"];
    const rows = reviewerRepoCards.map((r) => [r.actor, r.eips, r.ercs, r.rips, r.total]);
    downloadCsv(`reviewers-repo-distribution-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }, [reviewerRepoCards]);

  return (
    <div className="space-y-6">
      {/* Repo Distribution Section */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FolderGit2 className="h-4 w-4 text-primary" />
              Repository Workload & Distribution
            </h3>
            <p className="text-xs text-muted-foreground">
              Reviewer focus across core standards (ethereum/EIPs), applications (ERCs), and rollups (RIPs)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-border/70 bg-muted/40 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer",
                  viewMode === "cards"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("chart")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer",
                  viewMode === "chart"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Graph</span>
              </button>
            </div>

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

        {viewMode === "cards" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reviewerRepoCards.map((card) => {
              const total = card.total || 0;
              const eipsPct = total > 0 ? Math.round((card.eips / total) * 100) : 0;
              const ercsPct = total > 0 ? Math.round((card.ercs / total) * 100) : 0;
              const ripsPct = total > 0 ? Math.round((card.rips / total) * 100) : 0;

              return (
                <div
                  key={card.actor}
                  className="rounded-xl border border-border/70 bg-card/60 p-4 backdrop-blur-sm shadow-sm hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <button
                        type="button"
                        onClick={() => onSelectReviewer?.(card.actor)}
                        className="flex items-center gap-2.5 text-foreground hover:text-primary transition-colors cursor-pointer group text-left"
                      >
                        <img
                          src={getGitHubAvatarUrl(card.actor)}
                          alt={card.actor}
                          className="h-8 w-8 rounded-full border border-border/80 object-cover"
                          loading="lazy"
                        />
                        <div>
                          <p className="text-sm font-bold group-hover:underline">{card.actor}</p>
                          <p className="text-[10px] text-muted-foreground">EIP Reviewer</p>
                        </div>
                      </button>

                      <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary font-mono">
                        {total.toLocaleString()} reviews
                      </span>
                    </div>

                    {/* Proportional Bars */}
                    <div className="space-y-2 mt-3 pt-3 border-t border-border/40">
                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="text-foreground flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: repoColors.EIPs }} />
                            <span>EIPs</span>
                          </span>
                          <span className="text-muted-foreground font-mono">
                            {eipsPct}% <span className="opacity-60">({card.eips})</span>
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${eipsPct}%`, backgroundColor: repoColors.EIPs }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="text-foreground flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: repoColors.ERCs }} />
                            <span>ERCs</span>
                          </span>
                          <span className="text-muted-foreground font-mono">
                            {ercsPct}% <span className="opacity-60">({card.ercs})</span>
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${ercsPct}%`, backgroundColor: repoColors.ERCs }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="text-foreground flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: repoColors.RIPs }} />
                            <span>RIPs</span>
                          </span>
                          <span className="text-muted-foreground font-mono">
                            {ripsPct}% <span className="opacity-60">({card.rips})</span>
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${ripsPct}%`, backgroundColor: repoColors.RIPs }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-border/70 bg-card/60 p-4 sm:p-5 backdrop-blur-sm shadow-sm space-y-3">
            <h4 className="text-xs font-semibold text-foreground">Reviewer Count by Repository</h4>
            <div className="h-[340px] w-full">
              <ReactECharts
                option={repoDistributionOption}
                style={{ height: "100%", width: "100%" }}
                opts={{ renderer: "svg" }}
                notMerge
              />
            </div>
          </div>
        )}
      </div>

      {/* Review Cycles per PR Section */}
      <div className="rounded-xl border border-border/70 bg-card/60 p-4 sm:p-5 backdrop-blur-sm shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Reviewer Cycles per Pull Request
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Distribution of how many reviewers typically inspect a proposal before a decision
            </p>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> 1-2 Fast
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> 3-4 Standard
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-rose-500" /> 5+ High Burden
            </span>
          </div>
        </div>

        <div className="h-[280px] w-full">
          <ReactECharts
            option={cyclesChartOption}
            style={{ height: "100%", width: "100%" }}
            opts={{ renderer: "svg" }}
            notMerge
          />
        </div>
      </div>
    </div>
  );
}
