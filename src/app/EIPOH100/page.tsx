"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw,
  Users,
  GitPullRequest,
  Trophy,
  Activity,
  Clock,
  ArrowRight,
  Zap,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { client } from "@/lib/orpc";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────

type EditorEntry = {
  editor: string;
  prsReviewed: number;
  totalEvents: number;
};

type HourlyActivity = {
  hour: string;
  prsChecked: number;
  totalEvents: number;
};

type HourlyByType = {
  hour: string;
  repoType: string;
  prsChecked: number;
};

type RecentActivity = {
  kind: "status_change" | "pr_event";
  occurredAt: Date;
  eip: string;
  eipType: string;
  title: string;
  fromStatus: string | null;
  toStatus: string | null;
  actor: string;
  repository: string;
  prNumber: string | null;
  eventType: string | null;
  eventUrl: string | null;
  days: number;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const EVENT_DATE = "2025-06-02";

const TYPE_SERIES_COLORS: Record<string, string> = {
  eips: "#6366f1",
  ercs: "#10b981",
  rips: "#f59e0b",
};
const TYPE_LABELS: Record<string, string> = {
  eips: "EIPs",
  ercs: "ERCs",
  rips: "RIPs",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function editorAvatar(actor: string) {
  return `https://avatars.githubusercontent.com/${encodeURIComponent(actor)}?s=96&d=identicon`;
}

function formatEditorAction(eventType: string) {
  const map: Record<string, string> = {
    reviewed: "reviewed",
    commented: "commented",
    issue_comment: "commented",
    labeled: "labeled",
    unlabeled: "removed label",
    merged: "merged",
    approved: "approved",
    changes_requested: "requested changes",
  };
  return map[eventType?.toLowerCase()] || (eventType ?? "").replace(/_/g, " ");
}

function formatHourLabel(isoStr: string) {
  return new Date(isoStr).toLocaleTimeString("en-US", { hour: "numeric", hour12: true });
}

function sprintProgress() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const pct = ((now.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100;
  const remaining = end.getTime() - now.getTime();
  const h = Math.floor(remaining / 3_600_000);
  const m = Math.floor((remaining % 3_600_000) / 60_000);
  return { pct: Math.min(100, pct), remaining: `${h}h ${m}m remaining today` };
}

// ─── Theme-aware chart color hook ─────────────────────────────────────────────

function useChartColors() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  return useMemo(
    () => ({
      mutedFg: isDark ? "oklch(0.708 0 0)" : "oklch(0.5 0.02 260)",
      border: isDark ? "oklch(1 0 0 / 12%)" : "oklch(0.88 0.02 250)",
      fg: isDark ? "oklch(0.985 0 0)" : "oklch(0.2 0.02 260)",
      card: isDark ? "oklch(0.205 0 0)" : "oklch(1 0 0)",
    }),
    [isDark]
  );
}

// ─── Podium card ─────────────────────────────────────────────────────────────

function PodiumCard({
  entry,
  rank,
  max,
  delay,
}: {
  entry: EditorEntry;
  rank: 1 | 2 | 3;
  max: number;
  delay: number;
}) {
  const medals = { 1: "🥇", 2: "🥈", 3: "🥉" } as const;
  const baseHeights = { 1: "h-[80px]", 2: "h-[56px]", 3: "h-[44px]" } as const;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`flex flex-col items-center gap-2 rounded-xl border bg-card p-3 shadow-sm ${
        rank === 1
          ? "border-amber-400/50 shadow-amber-400/10 dark:border-amber-400/40"
          : "border-border"
      }`}
    >
      <div className="relative">
        <div
          className={`overflow-hidden rounded-full ring-2 ${
            rank === 1
              ? "h-14 w-14 ring-amber-400/60"
              : "h-10 w-10 ring-border"
          }`}
        >
          <Image
            src={editorAvatar(entry.editor)}
            alt={entry.editor}
            width={rank === 1 ? 56 : 40}
            height={rank === 1 ? 56 : 40}
            className="h-full w-full object-cover"
          />
        </div>
        <span className="absolute -bottom-1 -right-1 text-base leading-none">{medals[rank]}</span>
      </div>
      <div className="text-center">
        <p className={`truncate font-semibold text-foreground ${rank === 1 ? "max-w-[100px] text-sm" : "max-w-[84px] text-xs"}`}>
          {entry.editor}
        </p>
        <p className={`tabular-nums font-bold text-primary ${rank === 1 ? "text-2xl" : "text-lg"}`}>
          {entry.prsReviewed}
          <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">PRs</span>
        </p>
        <p className="text-[10px] text-muted-foreground">{entry.totalEvents} actions</p>
      </div>
      {/* Podium base */}
      <div className={`w-full rounded-md border border-border bg-muted ${baseHeights[rank]}`} />
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EIPOH100Page() {
  const today = new Date().toISOString().slice(0, 10);
  const displayDate = today === EVENT_DATE ? EVENT_DATE : today;

  const [leaderboard, setLeaderboard] = useState<EditorEntry[]>([]);
  const [hourlyActivity, setHourlyActivity] = useState<HourlyActivity[]>([]);
  const [hourlyByType, setHourlyByType] = useState<HourlyByType[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [sprint, setSprint] = useState(sprintProgress());
  const [expandedFeed, setExpandedFeed] = useState(false);

  const chartColors = useChartColors();

  const fetchData = useCallback(async () => {
    try {
      const [editors, hourly, byType, activity] = await Promise.all([
        client.analytics.getEventDayEditorLeaderboard({ date: displayDate }),
        client.analytics.getEventDayActivity({ date: displayDate }),
        client.analytics.getEventDayHourlyByType({ date: displayDate }),
        client.analytics.getAllRecentActivity({ limit: 10 }),
      ]);
      setLeaderboard(editors);
      setHourlyActivity(hourly);
      setHourlyByType(byType);
      setRecentActivity(activity as typeof recentActivity);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("EIPOH100 fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [displayDate]);

  useEffect(() => {
    fetchData();
    const dataInterval = setInterval(fetchData, 60_000);
    const clockInterval = setInterval(() => setSprint(sprintProgress()), 30_000);
    return () => {
      clearInterval(dataInterval);
      clearInterval(clockInterval);
    };
  }, [fetchData]);

  // ─── Derived stats ─────────────────────────────────────────────────────
  const totalPRs = useMemo(
    () => hourlyActivity.reduce((s, h) => s + h.prsChecked, 0),
    [hourlyActivity]
  );
  const totalEvents = useMemo(
    () => hourlyActivity.reduce((s, h) => s + h.totalEvents, 0),
    [hourlyActivity]
  );
  const maxPRs = leaderboard[0]?.prsReviewed ?? 1;

  // ─── ECharts: hourly bar ────────────────────────────────────────────────
  const barOption = useMemo(() => {
    const hours = hourlyActivity.map((h) => formatHourLabel(h.hour));
    const values = hourlyActivity.map((h) => h.prsChecked);
    const { mutedFg, border, fg, card } = chartColors;
    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: card,
        borderColor: border,
        textStyle: { color: fg, fontSize: 12 },
        formatter: (p: Array<{ name: string; value: number }>) =>
          `<div style="padding:4px 6px"><b>${p[0]?.name}</b><br/>PRs checked: <strong>${p[0]?.value ?? 0}</strong></div>`,
      },
      grid: { left: 32, right: 12, top: 8, bottom: 28 },
      xAxis: {
        type: "category",
        data: hours,
        axisLabel: { color: mutedFg, fontSize: 11 },
        axisLine: { lineStyle: { color: border } },
        splitLine: { show: false },
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        axisLabel: { color: mutedFg, fontSize: 11 },
        splitLine: { lineStyle: { color: border, type: "dashed" } },
      },
      series: [
        {
          type: "bar",
          data: values,
          barMaxWidth: 36,
          itemStyle: {
            color: {
              type: "linear",
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: "#6366f1" },
                { offset: 1, color: "#6366f155" },
              ],
            },
            borderRadius: [4, 4, 0, 0],
          },
        },
      ],
    };
  }, [hourlyActivity, chartColors]);

  // ─── ECharts: line by type ──────────────────────────────────────────────
  const lineOption = useMemo(() => {
    const allHours = Array.from(new Set(hourlyByType.map((r) => r.hour))).sort();
    const types = Array.from(new Set(hourlyByType.map((r) => r.repoType)));
    const hourLabels = allHours.map(formatHourLabel);
    const { mutedFg, border, fg, card } = chartColors;

    const series = types.map((type) => {
      const dataMap = new Map(
        hourlyByType.filter((r) => r.repoType === type).map((r) => [r.hour, r.prsChecked])
      );
      const color = TYPE_SERIES_COLORS[type] ?? "#94a3b8";
      return {
        name: TYPE_LABELS[type] ?? type.toUpperCase(),
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 5,
        data: allHours.map((h) => dataMap.get(h) ?? 0),
        lineStyle: { width: 2.5, color },
        itemStyle: { color },
        areaStyle: {
          color: {
            type: "linear",
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: `${color}40` },
              { offset: 1, color: `${color}05` },
            ],
          },
        },
      };
    });

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: card,
        borderColor: border,
        textStyle: { color: fg, fontSize: 12 },
      },
      legend: {
        data: types.map((t) => TYPE_LABELS[t] ?? t.toUpperCase()),
        textStyle: { color: mutedFg, fontSize: 11 },
        top: 0,
        right: 0,
      },
      grid: { left: 32, right: 12, top: 28, bottom: 28 },
      xAxis: {
        type: "category",
        data: hourLabels,
        boundaryGap: false,
        axisLabel: { color: mutedFg, fontSize: 11 },
        axisLine: { lineStyle: { color: border } },
        splitLine: { show: false },
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        axisLabel: { color: mutedFg, fontSize: 11 },
        splitLine: { lineStyle: { color: border, type: "dashed" } },
      },
      series,
    };
  }, [hourlyByType, chartColors]);

  // ─── Render ────────────────────────────────────────────────────────────
  const [p1, p2, p3, ...rest] = leaderboard;
  const feedVisible = expandedFeed ? recentActivity : recentActivity.slice(0, 6);

  return (
    <div className="min-h-screen bg-background">
      <div className="page-shell py-8">

        {/* ── Header ── */}
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="dec-title persona-title text-3xl font-semibold tracking-tight sm:text-4xl">
                  EIPOH100
                </h1>
                <p className="mt-0.5 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Editor Sprint · June 2, 2025 · Live dashboard
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {lastRefreshed && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {lastRefreshed.toLocaleTimeString()}
                </span>
              )}
              <button
                type="button"
                onClick={fetchData}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </button>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                Live · 60s
              </span>
            </div>
          </div>

          {/* Sprint progress */}
          <div className="mt-5 rounded-xl border border-border bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Daily Sprint Progress
              </span>
              <span className="text-[11px] text-muted-foreground">{sprint.remaining}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                initial={{ width: 0 }}
                animate={{ width: `${sprint.pct}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
        </motion.header>

        {/* ── Stat cards ── */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          {[
            { icon: GitPullRequest, label: "PRs Reviewed Today", value: totalPRs },
            { icon: Activity, label: "Editor Actions Today", value: totalEvents },
            { icon: Users, label: "Active Editors", value: leaderboard.length },
          ].map(({ icon: Icon, label, value }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 + i * 0.07 }}
              className="rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="mb-1.5 flex items-center gap-2 text-muted-foreground">
                <Icon className="h-4 w-4" />
                <span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
              </div>
              {loading ? (
                <div className="h-9 w-16 animate-pulse rounded-md bg-muted" />
              ) : (
                <p className="text-3xl font-bold tabular-nums text-foreground">{value}</p>
              )}
            </motion.div>
          ))}
        </div>

        {/* ── Main grid ── */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">

          {/* ── Leaderboard ── */}
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground">
                Editor Leaderboard
              </h2>
              <span className="ml-auto rounded-md border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Today
              </span>
            </div>

            {loading ? (
              <div className="space-y-3">
                <div className="flex gap-3">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="h-44 flex-1 animate-pulse rounded-xl bg-muted" />
                  ))}
                </div>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <Trophy className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm font-medium text-muted-foreground">No editor activity yet today.</p>
                <p className="text-xs text-muted-foreground/60">Refreshes every 60 seconds.</p>
              </div>
            ) : (
              <>
                {/* Podium — 2nd left · 1st center · 3rd right */}
                <div className="mb-5 grid grid-cols-3 items-end gap-3">
                  {p2 ? <PodiumCard entry={p2} rank={2} max={maxPRs} delay={0.12} /> : <div />}
                  {p1 && <PodiumCard entry={p1} rank={1} max={maxPRs} delay={0} />}
                  {p3 ? <PodiumCard entry={p3} rank={3} max={maxPRs} delay={0.22} /> : <div />}
                </div>

                {/* 4th+ ranked list */}
                {rest.length > 0 && (
                  <div className="space-y-1.5 border-t border-border pt-3">
                    {rest.map((entry, i) => (
                      <motion.div
                        key={entry.editor}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.22, delay: 0.04 * i }}
                        className="flex items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2"
                      >
                        <span className="w-5 flex-shrink-0 text-center text-xs font-bold text-muted-foreground">
                          {i + 4}
                        </span>
                        <div className="h-6 w-6 flex-shrink-0 overflow-hidden rounded-full ring-1 ring-border">
                          <Image
                            src={editorAvatar(entry.editor)}
                            alt={entry.editor}
                            width={24}
                            height={24}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                          {entry.editor}
                        </span>
                        <div className="flex w-28 items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary/60"
                              style={{ width: `${(entry.prsReviewed / maxPRs) * 100}%` }}
                            />
                          </div>
                          <span className="w-8 text-right text-xs font-bold tabular-nums text-foreground">
                            {entry.prsReviewed}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>

          {/* ── Charts ── */}
          <div className="space-y-6">

            {/* EIP vs ERC vs RIP line chart */}
            <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-1 flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground">
                  EIPs · ERCs · RIPs
                </h2>
              </div>
              <p className="mb-4 text-xs text-muted-foreground">PRs checked per hour, by type</p>
              {loading ? (
                <div className="h-[200px] animate-pulse rounded-lg bg-muted" />
              ) : hourlyByType.length === 0 ? (
                <div className="flex h-[200px] items-center justify-center">
                  <p className="text-sm text-muted-foreground">No data yet for today.</p>
                </div>
              ) : (
                <ReactECharts
                  option={lineOption}
                  style={{ height: 200, width: "100%" }}
                  opts={{ renderer: "svg" }}
                  notMerge
                />
              )}
            </section>

            {/* Hourly activity bar chart */}
            <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-1 flex items-center gap-2">
                <GitPullRequest className="h-5 w-5 text-primary" />
                <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground">
                  Hourly Activity
                </h2>
              </div>
              <p className="mb-4 text-xs text-muted-foreground">Total PRs checked across all repos</p>
              {loading ? (
                <div className="h-[200px] animate-pulse rounded-lg bg-muted" />
              ) : hourlyActivity.length === 0 ? (
                <div className="flex h-[200px] items-center justify-center">
                  <p className="text-sm text-muted-foreground">No activity recorded yet today.</p>
                </div>
              ) : (
                <ReactECharts
                  option={barOption}
                  style={{ height: 200, width: "100%" }}
                  opts={{ renderer: "svg" }}
                  notMerge
                />
              )}
            </section>
          </div>
        </div>

        {/* ── Recent Activity ── */}
        <section className="mt-6 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground">
              Recent Activity
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-px text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
              <span className="h-1 w-1 animate-pulse rounded-full bg-emerald-500" />
              Live
            </span>
            <Link
              href="/analytics/prs"
              className="ml-auto inline-flex h-7 items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/15"
            >
              PR Analytics
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {loading ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-[52px] animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity.</p>
          ) : (
            <>
              <div className="grid gap-1.5 sm:grid-cols-2">
                <AnimatePresence initial={false}>
                  {feedVisible.map((item, idx) => (
                    <motion.a
                      key={`${item.kind}-${item.eip}-${idx}`}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18, delay: idx * 0.025 }}
                      href={
                        item.kind === "pr_event"
                          ? (item.eventUrl ?? `https://github.com/${item.repository}/pull/${item.prNumber}`)
                          : `/${item.eipType === "RIP" ? "rip" : item.eipType === "ERC" ? "erc" : "eip"}/${item.eip}`
                      }
                      target={item.kind === "pr_event" ? "_blank" : undefined}
                      rel={item.kind === "pr_event" ? "noopener noreferrer" : undefined}
                      className="flex items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2 transition-colors hover:border-primary/40 hover:bg-muted/40"
                    >
                      <div className="h-6 w-6 flex-shrink-0 overflow-hidden rounded-full ring-1 ring-border">
                        <Image
                          src={editorAvatar(item.actor)}
                          alt={item.actor}
                          width={24}
                          height={24}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs">
                          <span className="font-semibold text-foreground">{item.actor}</span>
                          {item.kind === "status_change" ? (
                            <span className="text-muted-foreground">
                              {" "}moved {item.eipType}-{item.eip} →{" "}
                              <span className="font-medium text-foreground">{item.toStatus}</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              {" "}{formatEditorAction(item.eventType ?? "")}{" "}
                              <span className="font-medium text-foreground">
                                {item.eipType.toUpperCase()} #{item.prNumber}
                              </span>
                            </span>
                          )}
                        </p>
                        <p className="truncate text-[10px] text-muted-foreground">{item.title}</p>
                      </div>
                      <span
                        className={`flex-shrink-0 rounded-md border px-1.5 py-px text-[10px] font-medium ${
                          item.kind === "pr_event"
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : "border-border bg-muted/60 text-muted-foreground"
                        }`}
                      >
                        {item.kind === "pr_event"
                          ? formatEditorAction(item.eventType ?? "")
                          : "status"}
                      </span>
                    </motion.a>
                  ))}
                </AnimatePresence>
              </div>

              {recentActivity.length > 6 && (
                <button
                  type="button"
                  onClick={() => setExpandedFeed((v) => !v)}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-background py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  {expandedFeed ? (
                    <><ChevronUp className="h-3.5 w-3.5" /> Show less</>
                  ) : (
                    <><ChevronDown className="h-3.5 w-3.5" /> Show {recentActivity.length - 6} more</>
                  )}
                </button>
              )}
            </>
          )}
        </section>

      </div>
    </div>
  );
}
