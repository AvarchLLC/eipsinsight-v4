"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import {
  Activity,
  ArrowRight,
  CalendarClock,
  CalendarRange,
  Check,
  ChevronDown,
  Download,
  Eye,
  GitMerge,
  GitPullRequest,
  MessageSquare,
  RefreshCw,
  Shuffle,
  Users,
} from "lucide-react";
import { client } from "@/lib/orpc";
import { cn } from "@/lib/utils";
import { InlineBrandLoader } from "@/components/inline-brand-loader";
import { OFFICE_HOUR_MEETINGS } from "@/data/office-hour-meetings.generated";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

/**
 * Multipurpose "EIP Editing Office Hours" dashboard — the same editorial-activity
 * metrics and visual language as the one-off /eipoh100 Blitz page, but for ANY
 * day or date range. All data comes from the getEventDay* analytics procedures
 * (which accept an optional `to` for ranges).
 */

type Leader = Awaited<ReturnType<typeof client.analytics.getEventDayEditorLeaderboard>>[number];
type ByType = Awaited<ReturnType<typeof client.analytics.getEventDayHourlyByType>>[number];
type StatusChange = Awaited<ReturnType<typeof client.analytics.getEventDayStatusChanges>>[number];
type StatusChangeItem = Awaited<ReturnType<typeof client.analytics.getEventDayStatusChangeList>>[number];
type Breakdown = Awaited<ReturnType<typeof client.analytics.getEventDayProposalBreakdown>>[number];
type PRItem = Awaited<ReturnType<typeof client.analytics.getEventDayPRList>>[number];
type Recent = Awaited<ReturnType<typeof client.analytics.getAllRecentActivity>>[number];
type Meeting = Awaited<ReturnType<typeof client.calls.listOfficeHourMeetings>>[number];

const EXCLUDED = new Set(["abcoathup", "eip-review-bot"]);
const REPOS = ["all", "eips", "ercs", "rips"] as const;
type Repo = (typeof REPOS)[number];

// Repo checkboxes (RIP unchecked by default).
const REPO_KEYS = ["eips", "ercs", "rips"] as const;
type RepoKey = (typeof REPO_KEYS)[number];
const REPO_LABEL: Record<RepoKey, string> = { eips: "EIPs", ercs: "ERCs", rips: "RIPs" };

/** Merge per-repo editor leaderboards into one, summing each editor's counts. */
function mergeLeaders(lists: Array<Array<{ editor: string; reviews: number; comments: number; merges: number; prsReviewed: number; totalEvents: number }>>) {
  const by = new Map<string, { editor: string; reviews: number; comments: number; merges: number; prsReviewed: number; totalEvents: number }>();
  for (const list of lists) for (const e of list) {
    const cur = by.get(e.editor) ?? { editor: e.editor, reviews: 0, comments: 0, merges: 0, prsReviewed: 0, totalEvents: 0 };
    cur.reviews += e.reviews; cur.comments += e.comments; cur.merges += e.merges; cur.prsReviewed += e.prsReviewed; cur.totalEvents += e.totalEvents;
    by.set(e.editor, cur);
  }
  return [...by.values()].sort((a, b) => b.prsReviewed - a.prsReviewed || b.totalEvents - a.totalEvents);
}

const TYPE_META: Array<{ key: "eips" | "ercs" | "rips"; label: string; color: string }> = [
  { key: "eips", label: "EIPs", color: "#6366f1" },
  { key: "ercs", label: "ERCs", color: "#10b981" },
  { key: "rips", label: "RIPs", color: "#f59e0b" },
];

const STATUS_COLORS: Record<string, string> = {
  Draft: "#64748b", Review: "#f59e0b", "Last Call": "#f97316",
  Final: "#10b981", Living: "#22d3ee", Stagnant: "#6b7280",
  Withdrawn: "#ef4444", Moved: "#a855f7", "—": "#94a3b8", Unknown: "#94a3b8",
};

function editorAvatar(actor: string) {
  return `https://avatars.githubusercontent.com/${encodeURIComponent(actor)}?s=96&d=identicon`;
}
function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}
function addDays(dateStr: string, days: number) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return iso(d);
}
function prettyDate(dateStr: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}
function relativeTime(dt: string | Date) {
  const diff = Date.now() - new Date(dt).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}
function formatEditorAction(eventType: string) {
  const map: Record<string, string> = {
    reviewed: "reviewed", commented: "commented", issue_comment: "commented",
    labeled: "labeled", unlabeled: "removed label", merged: "merged",
    approved: "approved", changes_requested: "requested changes",
  };
  return map[eventType?.toLowerCase()] || (eventType ?? "").replace(/_/g, " ");
}
function repoTag(eipType: string): { label: string; cls: string } {
  const t = (eipType || "").toUpperCase().replace(/S$/, "");
  if (t === "ERC") return { label: "ERC", cls: "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400" };
  if (t === "RIP") return { label: "RIP", cls: "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400" };
  return { label: "EIP", cls: "bg-violet-500/10 border-violet-500/20 text-violet-700 dark:text-violet-400" };
}

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}
function downloadCsv(name: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Read a filter value from the URL query string (client-only). */
function urlParam(key: string): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(key);
}

export default function OfficeHoursPage() {
  const today = iso(new Date());

  // Defaults must match the server render (no window access here) to avoid a
  // hydration mismatch: THIS MONTH by default. The URL is read after mount.
  const monthStart = `${today.slice(0, 7)}-01`;
  const [mode, setMode] = useState<"day" | "range">("range");
  const [day, setDay] = useState(today);
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [repos, setRepos] = useState<Set<RepoKey>>(() => new Set<RepoKey>(["eips", "ercs"]));
  const [hydrated, setHydrated] = useState(false);
  const toggleRepo = (r: RepoKey) => setRepos((prev) => {
    const next = new Set(prev);
    if (next.has(r)) { if (next.size > 1) next.delete(r); } else next.add(r);
    return next;
  });

  // After mount (client only), apply any filters from the URL so links are
  // shareable. Runs once; then the sync effect below keeps the URL updated.
  useEffect(() => {
    const m = urlParam("mode");
    if (m === "range" || m === "day") setMode(m);
    const d = urlParam("day");
    if (d) setDay(d);
    if (m === "day" && d && OFFICE_HOUR_MEETINGS.some((x) => x.dateISO === d)) setFilterMode("officehour");
    const f = urlParam("from");
    if (f) setFrom(f);
    const t = urlParam("to");
    if (t) setTo(t);
    const r = urlParam("repos");
    if (r) {
      const set = new Set<RepoKey>(r.split(",").filter((x): x is RepoKey => (REPO_KEYS as readonly string[]).includes(x)));
      if (set.size > 0) setRepos(set);
    }
    setHydrated(true);
  }, []);

  // Keep the URL in sync with the active filters (shareable / bookmarkable).
  useEffect(() => {
    if (!hydrated) return;
    const p = new URLSearchParams();
    p.set("mode", mode);
    if (mode === "day") p.set("day", day);
    else {
      p.set("from", from);
      p.set("to", to);
    }
    const repoList = [...repos].sort();
    if (!(repoList.length === 2 && repoList[0] === "eips" && repoList[1] === "ercs")) p.set("repos", repoList.join(","));
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
  }, [hydrated, mode, day, from, to, repos]);

  const winFrom = mode === "day" ? day : from;
  const winTo = mode === "day" ? day : to;

  // Simplified date control: Today · 7d · This month (default) · Date range.
  const [customOpen, setCustomOpen] = useState(false);
  // Office Hour picker (backfilled list of ethereum/pm office-hour meetings).
  const [ohOpen, setOhOpen] = useState(false);
  const selectedOh = useMemo(
    () => (mode === "day" ? OFFICE_HOUR_MEETINGS.find((m) => m.dateISO === day) ?? null : null),
    [mode, day],
  );
  const latestPastOh = useMemo(() => OFFICE_HOUR_MEETINGS.find((m) => m.dateISO <= today) ?? OFFICE_HOUR_MEETINGS[0] ?? null, [today]);
  // Top-level switch: filter by a specific Office Hour, or by a custom date window.
  const [filterMode, setFilterMode] = useState<"custom" | "officehour">("custom");
  const goCustom = () => { setFilterMode("custom"); setMode("range"); setFrom(monthStart); setTo(today); setCustomOpen(false); setOhOpen(false); };
  const goOfficeHour = () => { setFilterMode("officehour"); setCustomOpen(false); setOhOpen(false); if (!selectedOh && latestPastOh) { setMode("day"); setDay(latestPastOh.dateISO); } };
  const PRESETS: Array<{ id: string; label: string; apply: () => void }> = [
    { id: "today", label: "Today", apply: () => { setMode("day"); setDay(today); } },
    { id: "7d", label: "7d", apply: () => { setMode("range"); setFrom(addDays(today, -6)); setTo(today); } },
    { id: "month", label: "This month", apply: () => { setMode("range"); setFrom(monthStart); setTo(today); } },
  ];
  const activePresetId =
    mode === "day" && day === today ? "today"
    : mode === "range" && to === today && from === addDays(today, -6) ? "7d"
    : mode === "range" && to === today && from === monthStart ? "month"
    : "custom";

  const [leaderboard, setLeaderboard] = useState<Leader[]>([]);
  const [byType, setByType] = useState<ByType[]>([]);
  const [statusChanges, setStatusChanges] = useState<StatusChange[]>([]);
  const [statusChangeList, setStatusChangeList] = useState<StatusChangeItem[]>([]);
  // Clicking an aggregate transition chip filters the detailed list to it.
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<Breakdown[]>([]);
  const [totalPRs, setTotalPRs] = useState(0);
  const [prList, setPrList] = useState<PRItem[]>([]);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const [prFilter, setPrFilter] = useState<Repo>("all");
  const [prPage, setPrPage] = useState(1);

  useEffect(() => {
    client.calls.listOfficeHourMeetings({ limit: 12 }).then(setMeetings).catch(() => {});
    client.analytics.getAllRecentActivity({ limit: 14 }).then((r) => setRecent(r as Recent[])).catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const selected = [...repos];
    const isAllRepos = selected.length === REPO_KEYS.length;
    // Leaderboard + total PRs are repo-filtered server-side; for a multi-repo
    // selection we fetch each and merge (all three = one unfiltered call).
    const ldrPromise: Promise<Leader[]> = isAllRepos
      ? client.analytics.getEventDayEditorLeaderboard({ date: winFrom, to: winTo }).catch(() => [] as Leader[])
      : Promise.all(selected.map((r) => client.analytics.getEventDayEditorLeaderboard({ date: winFrom, to: winTo, repo: r }).catch(() => [] as Leader[]))).then(mergeLeaders);
    const [ldr, typ, chg, chgList, brk, tot, prs, act] = await Promise.all([
      ldrPromise,
      client.analytics.getEventDayHourlyByType({ date: winFrom, to: winTo }).catch(() => [] as ByType[]),
      client.analytics.getEventDayStatusChanges({ date: winFrom, to: winTo }).catch(() => [] as StatusChange[]),
      client.analytics.getEventDayStatusChangeList({ date: winFrom, to: winTo }).catch(() => [] as StatusChangeItem[]),
      client.analytics.getEventDayProposalBreakdown({ date: winFrom, to: winTo }).catch(() => [] as Breakdown[]),
      client.analytics.getEventDayTotalPRs({ date: winFrom, to: winTo }).catch(() => ({ totalPRs: 0 })),
      client.analytics.getEventDayPRList({ date: winFrom, to: winTo }).catch(() => [] as PRItem[]),
      client.analytics.getAllRecentActivity({ limit: 14 }).catch(() => [] as Recent[]),
    ]);
    setLeaderboard(ldr.filter((e) => !EXCLUDED.has(e.editor.toLowerCase())));
    setByType(typ);
    setStatusChanges(chg);
    setStatusChangeList(chgList);
    setBreakdown(brk);
    setTotalPRs(tot.totalPRs);
    setPrList(prs);
    setRecent(act as Recent[]);
    setRefreshedAt(new Date());
    setLoading(false);
  }, [winFrom, winTo, repos]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const kpis = useMemo(() => ({
    editors: leaderboard.length,
    reviews: leaderboard.reduce((s, e) => s + e.reviews, 0),
    statusTotal: statusChanges.reduce((s, c) => s + c.count, 0),
  }), [leaderboard, statusChanges]);

  const rangeLabel = mode === "day" ? prettyDate(day) : `${prettyDate(from)} – ${prettyDate(to)}`;

  const typeSeries = useMemo(() => {
    const map = new Map<string, { key: string; eips: number; ercs: number; rips: number }>();
    for (const r of byType) {
      const key = mode === "day" ? `${String(new Date(r.hour).getUTCHours()).padStart(2, "0")}` : r.hour.slice(0, 10);
      const cur = map.get(key) ?? { key, eips: 0, ercs: 0, rips: 0 };
      if (r.repoType === "eips") cur.eips += r.prsChecked;
      else if (r.repoType === "ercs") cur.ercs += r.prsChecked;
      else if (r.repoType === "rips") cur.rips += r.prsChecked;
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => (a.key < b.key ? -1 : 1)).map((v) => ({ ...v, label: mode === "day" ? v.key : prettyDate(v.key).replace(/, \d{4}$/, "") }));
  }, [byType, mode]);

  // Only the proposal types that actually had activity in this window. A type
  // with zero activity (often RIPs) is dropped entirely so it can't appear to
  // have volume — the old stacked chart made the top series trace the running
  // total, which read as activity even when it was flat zero.
  const activeTypes = useMemo(
    () => TYPE_META.filter((t) => repos.has(t.key) && typeSeries.some((d) => d[t.key] > 0)),
    [typeSeries, repos],
  );

  const activityOption = useMemo(() => ({
    backgroundColor: "transparent",
    tooltip: { trigger: "axis", backgroundColor: "var(--background)", borderColor: "var(--border)", textStyle: { color: "var(--foreground)", fontSize: 12 } },
    grid: { left: 36, right: 10, top: 12, bottom: 22 },
    xAxis: { type: "category", data: typeSeries.map((d) => d.label), boundaryGap: false, axisLabel: { color: "var(--muted-foreground)", fontSize: 10 }, axisLine: { lineStyle: { color: "var(--border)" } }, splitLine: { show: false } },
    yAxis: { type: "value", minInterval: 1, axisLabel: { color: "var(--muted-foreground)", fontSize: 10 }, splitLine: { lineStyle: { color: "var(--border)", type: "dashed" } } },
    // Not stacked — each line shows that type's real count, so a flat/absent
    // type reads correctly as "no activity".
    series: activeTypes.map((t) => ({
      name: t.label, type: "line", smooth: true, symbol: "none",
      lineStyle: { width: 2, color: t.color }, itemStyle: { color: t.color }, areaStyle: { opacity: 0.14, color: t.color },
      data: typeSeries.map((d) => d[t.key]),
    })),
  }), [typeSeries, activeTypes]);

  const breakdownOption = useMemo(() => {
    const byStatus = new Map<string, number>();
    breakdown.forEach((r) => byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + r.prsChecked));
    const statusEntries = [...byStatus.entries()].sort((a, b) => b[1] - a[1]);
    const byCat = new Map<string, number>();
    breakdown.forEach((r) => {
      const cat = r.category && r.category !== "Unknown" ? r.category : r.proposalType;
      byCat.set(cat, (byCat.get(cat) ?? 0) + r.prsChecked);
    });
    const catEntries = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
    const catColors = ["#6366f1", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4", "#f97316", "#ef4444"];
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "item", backgroundColor: "var(--background)", borderColor: "var(--border)", textStyle: { color: "var(--foreground)", fontSize: 12 } },
      grid: [
        { left: "6%", right: "56%", top: 26, bottom: 8, containLabel: true },
        { left: "56%", right: "4%", top: 26, bottom: 8, containLabel: true },
      ],
      title: [
        { text: "By status", left: "6%", top: 0, textStyle: { color: "var(--muted-foreground)", fontSize: 11, fontWeight: 600 } },
        { text: "By category", left: "56%", top: 0, textStyle: { color: "var(--muted-foreground)", fontSize: 11, fontWeight: 600 } },
      ],
      xAxis: [
        { gridIndex: 0, type: "value", minInterval: 1, axisLabel: { color: "var(--muted-foreground)", fontSize: 10 }, splitLine: { lineStyle: { color: "var(--border)", type: "dashed" } } },
        { gridIndex: 1, type: "value", minInterval: 1, axisLabel: { color: "var(--muted-foreground)", fontSize: 10 }, splitLine: { lineStyle: { color: "var(--border)", type: "dashed" } } },
      ],
      yAxis: [
        { gridIndex: 0, type: "category", data: statusEntries.map((e) => e[0]), axisLabel: { color: "var(--muted-foreground)", fontSize: 10 }, axisLine: { lineStyle: { color: "var(--border)" } } },
        { gridIndex: 1, type: "category", data: catEntries.map((e) => e[0]), axisLabel: { color: "var(--muted-foreground)", fontSize: 10 }, axisLine: { lineStyle: { color: "var(--border)" } } },
      ],
      series: [
        { type: "bar", xAxisIndex: 0, yAxisIndex: 0, barMaxWidth: 18, data: statusEntries.map(([s, v]) => ({ value: v, itemStyle: { color: STATUS_COLORS[s] ?? "#94a3b8", borderRadius: [0, 4, 4, 0] } })) },
        { type: "bar", xAxisIndex: 1, yAxisIndex: 1, barMaxWidth: 18, data: catEntries.map(([, v], i) => ({ value: v, itemStyle: { color: catColors[i % catColors.length], borderRadius: [0, 4, 4, 0] } })) },
      ],
    };
  }, [breakdown]);

  const filteredStatusChanges = useMemo(
    () => (statusFilter ? statusChangeList.filter((c) => `${c.fromStatus}→${c.toStatus}` === statusFilter) : statusChangeList),
    [statusChangeList, statusFilter],
  );
  useEffect(() => { setStatusFilter(null); }, [statusChangeList]);

  const filteredPRs = useMemo(() => prList.filter((p) => prFilter === "all" || p.repoType === prFilter), [prList, prFilter]);
  const filteredRecent = useMemo(() => recent.filter((r) => !EXCLUDED.has((r.actor || "").toLowerCase())), [recent]);

  const PR_PAGE_SIZE = 12;
  const prPageCount = Math.max(1, Math.ceil(filteredPRs.length / PR_PAGE_SIZE));
  const prPageSafe = Math.min(prPage, prPageCount);
  const pagedPRs = useMemo(
    () => filteredPRs.slice((prPageSafe - 1) * PR_PAGE_SIZE, prPageSafe * PR_PAGE_SIZE),
    [filteredPRs, prPageSafe],
  );
  useEffect(() => { setPrPage(1); }, [prFilter, prList]);

  const exportPRs = () => {
    downloadCsv(`office-hours-prs-${winFrom}_${winTo}.csv`, toCsv(prList.map((p) => ({
      pr_number: p.prNumber, repo: p.repoType, title: p.title, state: p.state,
      editors: p.editors.join(" "), eip_numbers: p.eipNumbers.join(" "),
      reviews: p.reviews, comments: p.comments, merges: p.merges, url: p.githubUrl,
    }))));
  };
  const exportEditors = () => {
    downloadCsv(`office-hours-editors-${winFrom}_${winTo}.csv`, toCsv(leaderboard.map((e) => ({
      editor: e.editor, prs_reviewed: e.prsReviewed, total_events: e.totalEvents,
      reviews: e.reviews, comments: e.comments, merges: e.merges,
    }))));
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <section className="rounded-xl border border-border bg-card/60 p-3">
        {/* Row 1: mode switch (left) + actions (right) */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="inline-flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
            <button
              onClick={goCustom}
              className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-colors", filterMode === "custom" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              <CalendarRange className="h-3.5 w-3.5" /> Custom range
            </button>
            <button
              onClick={goOfficeHour}
              disabled={OFFICE_HOUR_MEETINGS.length === 0}
              className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-colors disabled:opacity-40", filterMode === "officehour" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              <CalendarClock className="h-3.5 w-3.5" /> Office Hour
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => void fetchData()} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 text-foreground hover:bg-muted/70"><RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> Refresh</button>
            <button onClick={exportEditors} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 text-foreground hover:bg-muted/70"><Download className="h-3.5 w-3.5" /> Editors CSV</button>
            <button onClick={exportPRs} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2.5 font-medium text-primary hover:bg-primary/15"><Download className="h-3.5 w-3.5" /> PRs CSV</button>
          </div>
        </div>

        {/* Row 2: mode-specific selector (left) + repos (right) */}
        <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-border/60 pt-2.5 text-xs">
          {filterMode === "custom" ? (
            <div className="flex flex-wrap items-center gap-2">
              {PRESETS.map((p) => (
                <button key={p.id} onClick={() => { p.apply(); setCustomOpen(false); }} className={cn("rounded-full border px-2.5 py-1", activePresetId === p.id && !customOpen ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground")}>{p.label}</button>
              ))}
              <button onClick={() => { setMode("range"); setCustomOpen(true); }} className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1", customOpen || activePresetId === "custom" ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground")}><CalendarRange className="h-3.5 w-3.5" /> Date range</button>
              {(customOpen || activePresetId === "custom") && (
                <div className="flex items-center gap-1.5">
                  <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="h-8 rounded-md border border-border bg-muted/40 px-2 text-foreground" />
                  <span className="text-muted-foreground">to</span>
                  <input type="date" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} className="h-8 rounded-md border border-border bg-muted/40 px-2 text-foreground" />
                </div>
              )}
            </div>
          ) : (
            /* Office Hour selector */
            <div className="relative">
              <button
                onClick={() => setOhOpen((o) => !o)}
                title="Pick an EIP Editing Office Hour"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5",
                  selectedOh ? "border-primary/50 bg-primary/10 text-primary" : "border-border bg-muted/50 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                <CalendarClock className="h-3.5 w-3.5" />
                {selectedOh
                  ? `Office Hour #${selectedOh.meeting} · ${prettyDate(selectedOh.dateISO)}${selectedOh.timeUTC ? ` · ${selectedOh.timeUTC} UTC` : ""}`
                  : "Select an Office Hour"}
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", ohOpen && "rotate-180")} />
              </button>
              {ohOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setOhOpen(false)} />
                  <div className="absolute left-0 z-20 mt-1 max-h-80 w-80 overflow-y-auto rounded-lg border border-border bg-card p-1 shadow-lg">
                    <p className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      EIP Editing Office Hours ({OFFICE_HOUR_MEETINGS.length})
                    </p>
                    {OFFICE_HOUR_MEETINGS.map((m) => {
                      const active = selectedOh?.meeting === m.meeting;
                      return (
                        <button
                          key={m.meeting}
                          onClick={() => { setMode("day"); setDay(m.dateISO); setCustomOpen(false); setOhOpen(false); }}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs",
                            active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted",
                          )}
                        >
                          <span className="w-10 shrink-0 font-semibold tabular-nums">#{m.meeting}</span>
                          <span className="flex-1 truncate text-muted-foreground">{prettyDate(m.dateISO)}</span>
                          <span className="shrink-0 tabular-nums text-muted-foreground">{m.timeUTC ? `${m.timeUTC} UTC` : "—"}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Repos (checkboxes — RIP off by default) */}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Repos</span>
            {REPO_KEYS.map((r) => {
              const on = repos.has(r);
              return (
                <button key={r} onClick={() => toggleRepo(r)} className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-1", on ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground")}>
                  <span className={cn("flex h-3.5 w-3.5 items-center justify-center rounded-[3px] border", on ? "border-primary bg-primary text-primary-foreground" : "border-border")}>{on && <Check className="h-2.5 w-2.5" />}</span>
                  {REPO_LABEL[r]}
                </button>
              );
            })}
          </div>
        </div>
        {refreshedAt && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Showing <strong className="text-foreground">{rangeLabel}</strong>
            {selectedOh && (
              <> · <span className="text-foreground">Office Hour #{selectedOh.meeting}</span>{selectedOh.timeUTC ? ` at ${selectedOh.timeUTC} UTC` : ""}</>
            )}
            {" "}· updated {refreshedAt.toLocaleTimeString()}
          </p>
        )}
      </section>

      {loading && leaderboard.length === 0 ? (
        <div className="rounded-xl border border-border bg-card/60 py-16"><InlineBrandLoader size="md" label="Loading office-hours activity…" /></div>
      ) : (
        <>
          {/* KPI band */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi icon={Users} accent="text-violet-500" label="Active editors" value={kpis.editors} />
            <Kpi icon={GitPullRequest} accent="text-emerald-500" label="PRs touched" value={totalPRs} />
            <Kpi icon={Eye} accent="text-blue-500" label="Review actions" value={kpis.reviews} />
            <Kpi icon={Shuffle} accent="text-amber-500" label="Status changes" value={kpis.statusTotal} />
          </section>

          {/* Row 1: Leaderboard · Activity · Recent Activity */}
          <div className="grid gap-3 lg:grid-cols-3">
            {/* Leaderboard */}
            <Card title="Editor leaderboard" icon={<Users className="h-4 w-4 text-primary" />} right={<span className="text-[11px] text-muted-foreground">{rangeLabel}</span>}>
              {leaderboard.length === 0 ? (
                <Empty label="No editor activity in this window." />
              ) : (
                <>
                  <div className="mb-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-blue-500" /> Reviews</span>
                    <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-violet-500" /> Comments</span>
                    <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-500" /> Merges</span>
                  </div>
                  <ul className="h-[300px] space-y-2 overflow-y-auto pr-1">
                    {leaderboard.slice(0, 12).map((e, i) => {
                      const total = Math.max(e.reviews + e.comments + e.merges, 1);
                      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                      return (
                        <li key={e.editor} className="flex items-center gap-2.5">
                          <div className="relative shrink-0">
                            <Image src={editorAvatar(e.editor)} alt={e.editor} width={28} height={28} unoptimized className={cn("h-7 w-7 rounded-full object-cover ring-2", i === 0 ? "ring-amber-400/60" : "ring-border")} />
                            {medal && <span className="absolute -bottom-1 -right-1 text-[11px] leading-none">{medal}</span>}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <Link href={`/people/${e.editor}`} className="truncate text-sm font-medium text-foreground hover:text-primary">{e.editor}</Link>
                              <span className="shrink-0 text-[11px] text-muted-foreground"><Eye className="mr-0.5 inline h-3 w-3" />{e.reviews} <MessageSquare className="ml-1 mr-0.5 inline h-3 w-3" />{e.comments}{e.merges > 0 && <> <GitMerge className="ml-1 mr-0.5 inline h-3 w-3 text-emerald-500" />{e.merges}</>}</span>
                            </div>
                            <div className="mt-1 flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div className="h-full bg-blue-500" style={{ width: `${(e.reviews / total) * 100}%` }} />
                              <div className="h-full bg-violet-500" style={{ width: `${(e.comments / total) * 100}%` }} />
                              <div className="h-full bg-emerald-500" style={{ width: `${(e.merges / total) * 100}%` }} />
                            </div>
                          </div>
                          <span className="w-12 shrink-0 text-right text-xs font-semibold text-foreground">{e.prsReviewed}<span className="ml-0.5 text-[10px] font-normal text-muted-foreground">PRs</span></span>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </Card>

            {/* Activity by type */}
            <Card
              title={mode === "day" ? "Activity by hour (UTC)" : "Activity by day"}
              icon={<CalendarClock className="h-4 w-4 text-primary" />}
              right={<span className="flex items-center gap-2 text-[11px] text-muted-foreground">{(activeTypes.length ? activeTypes : TYPE_META).map((t) => (<span key={t.key} className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: t.color }} />{t.label}</span>))}</span>}
            >
              {typeSeries.length === 0 ? <Empty label="No activity in this window." /> : (
                <div className="h-[300px] w-full"><ReactECharts option={activityOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} notMerge /></div>
              )}
            </Card>

            {/* Recent Activity */}
            <Card
              title="Recent activity"
              icon={<Activity className="h-4 w-4 text-primary" />}
              right={<span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-px text-[10px] font-medium text-emerald-700 dark:text-emerald-400"><span className="h-1 w-1 animate-pulse rounded-full bg-emerald-500" />Live</span>}
            >
              {filteredRecent.length === 0 ? <Empty label="No recent activity." /> : (
                <ul className="h-[300px] space-y-1.5 overflow-y-auto pr-1">
                  {filteredRecent.map((item, idx) => {
                    const isStatus = item.kind === "status_change";
                    const href = isStatus
                      ? `/${item.eipType === "RIP" ? "rip" : item.eipType === "ERC" ? "erc" : "eip"}/${item.eip}`
                      : (item.eventUrl ?? `https://github.com/${item.repository}/pull/${item.prNumber}`);
                    const action = isStatus ? `${item.fromStatus ?? "—"} → ${item.toStatus}` : formatEditorAction(item.eventType ?? "");
                    const tag = repoTag(item.eipType);
                    const ref = isStatus ? `${tag.label}-${item.eip}` : `PR #${item.prNumber}`;
                    const title = item.title || ref;
                    return (
                      <li key={`${item.kind}-${item.eip}-${idx}`} className="rounded-lg border border-border bg-background/50 transition-colors hover:border-primary/40">
                        <div className="flex items-center gap-2 px-2.5 pt-2">
                          <Image src={editorAvatar(item.actor)} alt={item.actor} width={18} height={18} unoptimized className="h-[18px] w-[18px] rounded-full ring-1 ring-border" />
                          <span className="truncate text-[11px] font-semibold text-foreground">{item.actor}</span>
                          <span className={cn("shrink-0 rounded border px-1 py-px text-[9px] font-medium", isStatus ? "border-border bg-muted/60 text-muted-foreground" : "border-primary/30 bg-primary/10 text-primary")}>{action}</span>
                          <span className="ml-auto shrink-0 text-[9px] tabular-nums text-muted-foreground">{relativeTime(item.occurredAt)}</span>
                        </div>
                        <p className="line-clamp-1 px-2.5 py-1 text-[11px] text-muted-foreground">{title}</p>
                        <div className="flex items-center gap-1.5 border-t border-border/50 px-2.5 py-1.5">
                          <span className={cn("shrink-0 rounded border px-1 py-px text-[9px] font-medium", tag.cls)}>{tag.label}</span>
                          <span className="text-[9px] text-muted-foreground">{ref}</span>
                          <a href={href} target={isStatus ? undefined : "_blank"} rel={isStatus ? undefined : "noopener noreferrer"} className="ml-auto inline-flex items-center gap-0.5 text-[10px] font-medium text-primary hover:underline">View<ArrowRight className="h-2.5 w-2.5" /></a>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>

          {/* Row 2: Proposals by Status & Category · Status changes */}
          <div className="grid gap-3 lg:grid-cols-3">
            <Card title="Proposals by status & category" icon={<Shuffle className="h-4 w-4 text-primary" />} className="lg:col-span-2">
              {breakdown.length === 0 ? <Empty label="No proposals changed in this window." /> : (
                <div className="h-[300px] w-full"><ReactECharts option={breakdownOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} notMerge /></div>
              )}
            </Card>
            <Card
              title="Status changes"
              icon={<Shuffle className="h-4 w-4 text-amber-500" />}
              right={statusChangeList.length > 0 ? <span className="text-[11px] text-muted-foreground">{statusFilter ? `${filteredStatusChanges.length} of ${statusChangeList.length}` : `${statusChangeList.length} proposal${statusChangeList.length === 1 ? "" : "s"}`}</span> : undefined}
            >
              {statusChangeList.length === 0 ? <Empty label="No status changes." /> : (
                <div className="flex h-[300px] flex-col">
                  {/* Detailed, clickable list of the proposals that changed. */}
                  <ul className="flex-1 space-y-1.5 overflow-y-auto pr-1">
                    {filteredStatusChanges.map((c, i) => {
                      const tag = repoTag(c.eipType);
                      const href = `/${c.eipType === "RIP" ? "rip" : c.eipType === "ERC" ? "erc" : "eip"}/${c.eip}`;
                      return (
                        <li key={`${c.eipType}-${c.eip}-${i}`}>
                          <Link href={href} className="group flex items-center gap-2 rounded-lg border border-border bg-background/50 px-2 py-1.5 transition-colors hover:border-primary/40">
                            <span className={cn("shrink-0 rounded border px-1 py-px text-[9px] font-medium", tag.cls)}>{tag.label}</span>
                            <span className="shrink-0 text-xs font-semibold text-foreground group-hover:text-primary">{tag.label}-{c.eip}</span>
                            <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-[11px]">
                              <span className="text-muted-foreground">{c.fromStatus}</span>
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                                <span className="h-2 w-2 rounded-sm" style={{ background: STATUS_COLORS[c.toStatus] ?? "#94a3b8" }} />
                                {c.toStatus}
                              </span>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                  {/* Aggregate transition counts — click to filter the list above. */}
                  {statusChanges.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border/60 pt-2">
                      {statusChanges.map((c, i) => {
                        const key = `${c.fromStatus}→${c.toStatus}`;
                        const active = statusFilter === key;
                        return (
                          <button
                            key={i}
                            onClick={() => setStatusFilter(active ? null : key)}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                              active ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                            )}
                          >
                            <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: STATUS_COLORS[c.toStatus] ?? "#94a3b8" }} />
                            {c.label}
                            <span className="font-semibold text-foreground">{c.count}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* Detailed PR table */}
          <Card
            title={`Pull requests worked on (${filteredPRs.length})`}
            icon={<GitPullRequest className="h-4 w-4 text-primary" />}
            right={
              <div className="inline-flex items-center rounded-lg border border-border bg-muted/60 p-0.5 text-[11px]">
                {REPOS.map((r) => (
                  <button key={r} onClick={() => setPrFilter(r)} className={cn("rounded-md px-2 py-0.5", prFilter === r ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{r === "all" ? "All" : r.toUpperCase()}</button>
                ))}
              </div>
            }
          >
            {filteredPRs.length === 0 ? <Empty label="No pull requests in this window." /> : (
              <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-2 py-1.5 font-semibold">PR</th>
                      <th className="px-2 py-1.5 font-semibold">Title</th>
                      <th className="px-2 py-1.5 font-semibold">EIPs</th>
                      <th className="px-2 py-1.5 font-semibold">Editors</th>
                      <th className="px-2 py-1.5 text-right font-semibold">Activity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {pagedPRs.map((pr) => {
                      const tag = repoTag(pr.repoType);
                      return (
                        <tr key={`${pr.repoName}-${pr.prNumber}`} className="hover:bg-muted/40">
                          <td className="whitespace-nowrap px-2 py-2">
                            <a href={pr.githubUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary">
                              <span className={cn("rounded border px-1 py-px text-[9px] font-medium", tag.cls)}>{tag.label}</span>#{pr.prNumber}
                            </a>
                          </td>
                          <td className="max-w-[280px] px-2 py-2"><span className="line-clamp-1 text-foreground/90">{pr.title}</span></td>
                          <td className="whitespace-nowrap px-2 py-2 text-muted-foreground">{pr.eipNumbers.length ? pr.eipNumbers.slice(0, 4).join(", ") : "—"}</td>
                          <td className="max-w-[160px] px-2 py-2">
                            <div className="flex -space-x-1.5">
                              {pr.editors.slice(0, 4).map((ed) => (
                                <Image key={ed} src={editorAvatar(ed)} alt={ed} title={ed} width={18} height={18} unoptimized className="h-[18px] w-[18px] rounded-full ring-1 ring-background" />
                              ))}
                              {pr.editors.length > 4 && <span className="ml-2 text-[10px] text-muted-foreground">+{pr.editors.length - 4}</span>}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 text-right text-muted-foreground">
                            <Eye className="mr-0.5 inline h-3 w-3" />{pr.reviews}<MessageSquare className="ml-1.5 mr-0.5 inline h-3 w-3" />{pr.comments}{pr.merges > 0 && <><GitMerge className="ml-1.5 inline h-3 w-3 text-emerald-500" /></>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {prPageCount > 1 && (
                <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground">Page {prPageSafe} of {prPageCount} · {filteredPRs.length} PRs</span>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setPrPage((p) => Math.max(1, p - 1))} disabled={prPageSafe <= 1} className="inline-flex h-7 items-center rounded-md border border-border bg-muted/40 px-2.5 text-foreground hover:bg-muted/70 disabled:opacity-40">Prev</button>
                    <button onClick={() => setPrPage((p) => Math.min(prPageCount, p + 1))} disabled={prPageSafe >= prPageCount} className="inline-flex h-7 items-center rounded-md border border-border bg-muted/40 px-2.5 text-foreground hover:bg-muted/70 disabled:opacity-40">Next</button>
                  </div>
                </div>
              )}
              </>
            )}
          </Card>

          <p className="text-center text-[11px] text-muted-foreground">
            Looking for the June 2 EIP/ERC Blitz event dashboard? <Link href="/EIPOH100" className="text-primary hover:underline">Open /eipoh100</Link>.
          </p>
        </>
      )}
    </div>
  );
}

function Card({ title, icon, right, className, children }: { title: string; icon: React.ReactNode; right?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("rounded-xl border border-border bg-card/60 p-4", className)}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {icon}
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {right && <span className="ml-auto">{right}</span>}
      </div>
      {children}
    </section>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{label}</p>;
}

function Kpi({ icon: Icon, accent, label, value }: { icon: React.ComponentType<{ className?: string }>; accent: string; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-3.5">
      <Icon className={cn("h-4 w-4", accent)} />
      <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-foreground">{value.toLocaleString()}</p>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}
