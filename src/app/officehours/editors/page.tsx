"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import {
  Activity,
  ArrowRight,
  BarChart3,
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
  Search,
  SlidersHorizontal,
  TrendingUp,
  Users,
} from "lucide-react";
import { client } from "@/lib/orpc";
import { cn } from "@/lib/utils";
import { InlineBrandLoader } from "@/components/inline-brand-loader";
import { ChartWatermark } from "@/components/chart-watermark";
import { EditorAttendanceMatrix } from "@/components/editor-attendance-matrix";
import { EditorActionsExplorer } from "@/components/analytics/editor-actions-explorer";
import { CANONICAL_EIP_EDITORS } from "@/data/eip-contributor-roles";
import { OFFICE_HOUR_MEETINGS } from "@/data/office-hour-meetings.generated";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

type Leader = Awaited<ReturnType<typeof client.analytics.getEventDayEditorLeaderboard>>[number];
type StatusChange = Awaited<ReturnType<typeof client.analytics.getEventDayStatusChanges>>[number];
type PRItem = Awaited<ReturnType<typeof client.analytics.getEventDayPRList>>[number];

const EXCLUDED = new Set(["abcoathup", "eip-review-bot"]);
const REPO_KEYS = ["eips", "ercs", "rips"] as const;
type RepoKey = (typeof REPO_KEYS)[number];
const REPO_LABEL: Record<RepoKey, string> = { eips: "EIPs", ercs: "ERCs", rips: "RIPs" };

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
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => esc(r[h])).join(",")),
  ].join("\n");
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

function urlParam(key: string): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(key);
}

interface CanonicalEditorParticipation {
  displayName: string;
  github: string;
  eipipAttended: number;
  officeHoursHosted: number;
  prReviews: number;
}

const CANONICAL_EDITOR_PARTICIPATION: CanonicalEditorParticipation[] = [
  {
    displayName: "Jochem B.",
    github: "jochem-brouwer",
    eipipAttended: 8,
    officeHoursHosted: 10,
    prReviews: 368,
  },
  {
    displayName: "Sam Wilson",
    github: "SamWilsn",
    eipipAttended: 8,
    officeHoursHosted: 18,
    prReviews: 300,
  },
  {
    displayName: "Gajinder Singh",
    github: "g11tech",
    eipipAttended: 1,
    officeHoursHosted: 3,
    prReviews: 119,
  },
  {
    displayName: "Matt",
    github: "lightclient",
    eipipAttended: 1,
    officeHoursHosted: 0,
    prReviews: 100,
  },
  {
    displayName: "Victor",
    github: "xinbenlv",
    eipipAttended: 2,
    officeHoursHosted: 1,
    prReviews: 63,
  },
];

const EDITOR_COLORS: Record<string, string> = {
  SamWilsn: "#38bdf8",
  "jochem-brouwer": "#818cf8",
  lightclient: "#34d399",
  g11tech: "#f59e0b",
  xinbenlv: "#ec4899",
};

type TabId = "leaderboard" | "attendance" | "explorer" | "trends";

export default function OfficeHoursEditorsPage() {
  const today = iso(new Date());
  const monthStart = `${today.slice(0, 7)}-01`;

  const [mode, setMode] = useState<"day" | "range">("range");
  const [day, setDay] = useState(today);
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [repos, setRepos] = useState<Set<RepoKey>>(() => new Set<RepoKey>(["eips", "ercs"]));
  const [hydrated, setHydrated] = useState(false);

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<TabId>("leaderboard");
  const [selectedActorForExplorer, setSelectedActorForExplorer] = useState<string>("");

  // Leaderboard filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const toggleRepo = (r: RepoKey) =>
    setRepos((prev) => {
      const next = new Set(prev);
      if (next.has(r)) {
        if (next.size > 1) next.delete(r);
      } else next.add(r);
      return next;
    });

  // Parse initial query params from URL
  useEffect(() => {
    const m = urlParam("mode");
    const preset = urlParam("preset") || urlParam("range");
    if (preset === "all") {
      setMode("range");
      setFrom(ALL_TIME_START);
      setTo(today);
    } else if (preset === "month") {
      setMode("range");
      setFrom(monthStart);
      setTo(today);
    } else if (preset === "7d") {
      setMode("range");
      setFrom(addDays(today, -6));
      setTo(today);
    } else if (preset === "today") {
      setMode("day");
      setDay(today);
    } else {
      if (m === "range" || m === "day") setMode(m);
      const d = urlParam("day");
      if (d) setDay(d);
      if (m === "day" && d && OFFICE_HOUR_MEETINGS.some((x) => x.dateISO === d))
        setFilterMode("meeting");
      const f = urlParam("from");
      if (f) setFrom(f);
      const t = urlParam("to");
      if (t) setTo(t);
    }
    const r = urlParam("repos");
    if (r) {
      const set = new Set<RepoKey>(
        r.split(",").filter((x): x is RepoKey => (REPO_KEYS as readonly string[]).includes(x))
      );
      if (set.size > 0) setRepos(set);
    }
    const tab = urlParam("tab");
    if (tab && (tab === "leaderboard" || tab === "attendance" || tab === "explorer" || tab === "trends")) {
      setActiveTab(tab as TabId);
    }
    setHydrated(true);
  }, []);

  // Sync state back to URL
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
    if (!(repoList.length === 2 && repoList[0] === "eips" && repoList[1] === "ercs"))
      p.set("repos", repoList.join(","));
    if (activeTab !== "leaderboard") p.set("tab", activeTab);
    const qs = p.toString();
    window.history.replaceState(
      null,
      "",
      qs ? `${window.location.pathname}?${qs}` : window.location.pathname
    );
  }, [hydrated, mode, day, from, to, repos, activeTab]);

  const winFrom = mode === "day" ? day : from;
  const winTo = mode === "day" ? day : to;

  const [customOpen, setCustomOpen] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const selectedMeeting = useMemo(
    () => (mode === "day" ? OFFICE_HOUR_MEETINGS.find((m) => m.dateISO === day) ?? null : null),
    [mode, day]
  );
  const latestPastMeeting = useMemo(
    () =>
      OFFICE_HOUR_MEETINGS.find((m) => m.dateISO <= today) ??
      OFFICE_HOUR_MEETINGS[0] ??
      null,
    [today]
  );
  const [filterMode, setFilterMode] = useState<"custom" | "meeting">("custom");
  const goCustom = () => {
    setFilterMode("custom");
    setMode("range");
    setFrom(monthStart);
    setTo(today);
    setCustomOpen(false);
    setMeetingOpen(false);
  };
  const goMeeting = () => {
    setFilterMode("meeting");
    setCustomOpen(false);
    setMeetingOpen(false);
    if (!selectedMeeting && latestPastMeeting) {
      setMode("day");
      setDay(latestPastMeeting.dateISO);
    }
  };

  const ALL_TIME_START = "2015-01-01";
  const PRESETS: Array<{ id: string; label: string; apply: () => void }> = [
    {
      id: "today",
      label: "Today",
      apply: () => {
        setMode("day");
        setDay(today);
      },
    },
    {
      id: "7d",
      label: "7d",
      apply: () => {
        setMode("range");
        setFrom(addDays(today, -6));
        setTo(today);
      },
    },
    {
      id: "month",
      label: "This month",
      apply: () => {
        setMode("range");
        setFrom(monthStart);
        setTo(today);
      },
    },
    {
      id: "all",
      label: "All time",
      apply: () => {
        setMode("range");
        setFrom(ALL_TIME_START);
        setTo(today);
      },
    },
  ];
  const activePresetId =
    mode === "day" && day === today
      ? "today"
      : mode === "range" && to === today && from === addDays(today, -6)
      ? "7d"
      : mode === "range" && to === today && from === monthStart
      ? "month"
      : mode === "range" && to === today && from === ALL_TIME_START
      ? "all"
      : "custom";

  // Data states
  const [leaderboard, setLeaderboard] = useState<Leader[]>([]);
  const [statusChanges, setStatusChanges] = useState<StatusChange[]>([]);
  const [totalPRs, setTotalPRs] = useState(0);
  const [dailyActivity, setDailyActivity] = useState<
    Array<{ date: string; actor: string; count: number }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const selected = [...repos];
    const isAllRepos = selected.length === REPO_KEYS.length;

    const ldrPromise: Promise<Leader[]> = isAllRepos
      ? client.analytics
          .getEventDayEditorLeaderboard({ date: winFrom, to: winTo })
          .catch(() => [] as Leader[])
      : Promise.all(
          selected.map((r) =>
            client.analytics
              .getEventDayEditorLeaderboard({ date: winFrom, to: winTo, repo: r })
              .catch(() => [] as Leader[])
          )
        ).then((lists) => {
          const by = new Map<string, Leader>();
          for (const list of lists)
            for (const e of list) {
              const cur = by.get(e.editor) ?? {
                editor: e.editor,
                reviews: 0,
                comments: 0,
                merges: 0,
                prsReviewed: 0,
                totalEvents: 0,
              };
              cur.reviews += e.reviews;
              cur.comments += e.comments;
              cur.merges += e.merges;
              cur.prsReviewed += e.prsReviewed;
              cur.totalEvents += e.totalEvents;
              by.set(e.editor, cur);
            }
          return [...by.values()].sort(
            (a, b) => b.prsReviewed - a.prsReviewed || b.totalEvents - a.totalEvents
          );
        });

    const [ldr, chg, tot, dailyStacked] = await Promise.all([
      ldrPromise,
      client.analytics
        .getEventDayStatusChanges({ date: winFrom, to: winTo })
        .catch(() => [] as StatusChange[]),
      client.analytics
        .getEventDayTotalPRs({ date: winFrom, to: winTo })
        .catch(() => ({ totalPRs: 0 })),
      client.analytics
        .getEditorDailyActivityStacked({
          from: winFrom,
          to: winTo,
        })
        .catch(() => []),
    ]);

    setLeaderboard(ldr.filter((e) => !EXCLUDED.has(e.editor.toLowerCase())));
    setStatusChanges(chg);
    setTotalPRs(tot.totalPRs);
    setDailyActivity(
      (dailyStacked as Array<{ date: string; actor: string; count: bigint | number }>).map(
        (r) => ({
          date: r.date,
          actor: r.actor,
          count: Number(r.count),
        })
      )
    );
    setRefreshedAt(new Date());
    setLoading(false);
  }, [winFrom, winTo, repos]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const activeCanonicalCount = useMemo(() => {
    const activeSet = new Set(
      leaderboard
        .filter((e) => (e.totalEvents ?? 0) > 0 || (e.prsReviewed ?? 0) > 0 || (e.reviews ?? 0) > 0)
        .map((e) => e.editor.toLowerCase())
    );
    return CANONICAL_EIP_EDITORS.filter((c) => activeSet.has(c.toLowerCase())).length;
  }, [leaderboard]);

  const displayLeaderboard = useMemo(() => {
    const activeMap = new Map<string, Leader>();
    for (const item of leaderboard) {
      activeMap.set(item.editor.toLowerCase(), item);
    }

    const active = leaderboard.filter(
      (e) => (e.totalEvents ?? 0) > 0 || (e.prsReviewed ?? 0) > 0 || (e.reviews ?? 0) > 0
    );

    const inactive: Array<Leader & { isInactive?: boolean }> = [];
    for (const canon of CANONICAL_EIP_EDITORS) {
      const existing = activeMap.get(canon.toLowerCase());
      const hasActivity =
        existing &&
        ((existing.totalEvents ?? 0) > 0 ||
          (existing.prsReviewed ?? 0) > 0 ||
          (existing.reviews ?? 0) > 0);
      if (!hasActivity) {
        inactive.push({
          editor: canon,
          prsReviewed: 0,
          totalEvents: 0,
          reviews: 0,
          comments: 0,
          merges: 0,
          isInactive: true,
        });
      }
    }

    return [...active.map((e) => ({ ...e, isInactive: false })), ...inactive];
  }, [leaderboard]);

  const filteredLeaderboard = useMemo(() => {
    return displayLeaderboard.filter((row) => {
      const matchSearch =
        !searchQuery.trim() ||
        row.editor.toLowerCase().includes(searchQuery.trim().toLowerCase());
      if (!matchSearch) return false;
      if (statusFilter === "active" && row.isInactive) return false;
      if (statusFilter === "inactive" && !row.isInactive) return false;
      return true;
    });
  }, [displayLeaderboard, searchQuery, statusFilter]);

  const totalReviewsInWindow = useMemo(
    () => leaderboard.reduce((sum, e) => sum + e.reviews, 0),
    [leaderboard]
  );
  const totalCommentsInWindow = useMemo(
    () => leaderboard.reduce((sum, e) => sum + e.comments, 0),
    [leaderboard]
  );
  const totalMergesInWindow = useMemo(
    () => leaderboard.reduce((sum, e) => sum + e.merges, 0),
    [leaderboard]
  );
  const totalActionsInWindow =
    totalReviewsInWindow + totalCommentsInWindow + totalMergesInWindow;

  const rangeLabel =
    activePresetId === "all"
      ? "All time"
      : mode === "day"
      ? prettyDate(day)
      : `${prettyDate(from)} – ${prettyDate(to)}`;

  // Activity trend option for Velocity & Trends tab
  const activityTrendOption = useMemo(() => {
    const dates = Array.from(new Set(dailyActivity.map((d) => d.date))).sort();
    const activeActors = Array.from(new Set(dailyActivity.map((d) => d.actor))).sort();

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: "var(--background)",
        borderColor: "var(--border)",
        textStyle: { color: "var(--foreground)", fontSize: 12 },
      },
      legend: {
        top: 0,
        textStyle: { color: "var(--muted-foreground)", fontSize: 11 },
      },
      grid: { left: 40, right: 16, top: 32, bottom: 24 },
      xAxis: {
        type: "category",
        data: dates.map((d) => prettyDate(d).replace(/, \d{4}$/, "")),
        axisLabel: { color: "var(--muted-foreground)", fontSize: 10 },
        axisLine: { lineStyle: { color: "var(--border)" } },
        splitLine: { show: false },
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        axisLabel: { color: "var(--muted-foreground)", fontSize: 10 },
        splitLine: { lineStyle: { color: "var(--border)", type: "dashed" } },
      },
      series: activeActors.map((actor) => {
        const color = EDITOR_COLORS[actor] || "#818cf8";
        return {
          name: actor,
          type: "line",
          smooth: true,
          symbol: "circle",
          symbolSize: 4,
          lineStyle: { width: 2, color },
          itemStyle: { color },
          areaStyle: { opacity: 0.12, color },
          data: dates.map((date) => {
            const row = dailyActivity.find((d) => d.date === date && d.actor === actor);
            return row?.count ?? 0;
          }),
        };
      }),
    };
  }, [dailyActivity]);

  const exportEditors = () => {
    downloadCsv(
      `office-hours-editors-${winFrom}_${winTo}.csv`,
      toCsv(
        displayLeaderboard.map((e) => ({
          editor: e.editor,
          prs_reviewed: e.prsReviewed,
          total_events: e.totalEvents,
          reviews: e.reviews,
          comments: e.comments,
          merges: e.merges,
        }))
      )
    );
  };

  const TABS = [
    {
      id: "leaderboard" as const,
      label: "Leaderboard",
      icon: BarChart3,
      count: displayLeaderboard.length,
    },
    {
      id: "attendance" as const,
      label: "Meeting Attendance",
      icon: CalendarClock,
    },
    {
      id: "explorer" as const,
      label: "PR & Action Explorer",
      icon: SlidersHorizontal,
    },
    {
      id: "trends" as const,
      label: "Velocity & Trends",
      icon: TrendingUp,
    },
  ];

  const handleInspectEditor = (handle: string) => {
    setSelectedActorForExplorer(handle);
    setActiveTab("explorer");
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <section className="rounded-xl border border-border bg-card/60 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="inline-flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
            <button
              onClick={goCustom}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-colors",
                filterMode === "custom"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <CalendarRange className="h-3.5 w-3.5" /> Custom range
            </button>
            <button
              onClick={goMeeting}
              disabled={OFFICE_HOUR_MEETINGS.length === 0}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-colors disabled:opacity-40",
                filterMode === "meeting"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <CalendarClock className="h-3.5 w-3.5" /> Office Hour
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void fetchData()}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 text-foreground hover:bg-muted/70"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> Refresh
            </button>
            <button
              onClick={exportEditors}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 text-foreground hover:bg-muted/70"
            >
              <Download className="h-3.5 w-3.5" /> Editors CSV
            </button>
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-border/60 pt-2.5 text-xs">
          {filterMode === "custom" ? (
            <div className="flex flex-wrap items-center gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    p.apply();
                    setCustomOpen(false);
                  }}
                  className={cn(
                    "rounded-full border px-2.5 py-1",
                    activePresetId === p.id && !customOpen
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p.label}
                </button>
              ))}
              <button
                onClick={() => {
                  setMode("range");
                  setCustomOpen(true);
                }}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1",
                  customOpen || activePresetId === "custom"
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                <CalendarRange className="h-3.5 w-3.5" /> Date range
              </button>
              {(customOpen || activePresetId === "custom") && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={from}
                    max={to}
                    onChange={(e) => setFrom(e.target.value)}
                    className="h-8 rounded-md border border-border bg-muted/40 px-2 text-foreground"
                  />
                  <span className="text-muted-foreground">to</span>
                  <input
                    type="date"
                    value={to}
                    min={from}
                    max={today}
                    onChange={(e) => setTo(e.target.value)}
                    className="h-8 rounded-md border border-border bg-muted/40 px-2 text-foreground"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="relative">
              <button
                onClick={() => setMeetingOpen((o) => !o)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5",
                  selectedMeeting
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border bg-muted/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                <CalendarClock className="h-3.5 w-3.5" />
                {selectedMeeting
                  ? `Office Hour #${selectedMeeting.meeting} · ${prettyDate(selectedMeeting.dateISO)}${
                      selectedMeeting.timeUTC ? ` · ${selectedMeeting.timeUTC} UTC` : ""
                    }`
                  : "Select an Office Hour"}
                <ChevronDown
                  className={cn("h-3.5 w-3.5 transition-transform", meetingOpen && "rotate-180")}
                />
              </button>
              {meetingOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMeetingOpen(false)} />
                  <div className="absolute left-0 z-20 mt-1 max-h-80 w-80 overflow-y-auto rounded-lg border border-border bg-card p-1 shadow-lg">
                    <p className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      Office Hours ({OFFICE_HOUR_MEETINGS.length})
                    </p>
                    {OFFICE_HOUR_MEETINGS.map((m) => {
                      const active = selectedMeeting?.meeting === m.meeting;
                      return (
                        <button
                          key={m.meeting}
                          onClick={() => {
                            setMode("day");
                            setDay(m.dateISO);
                            setCustomOpen(false);
                            setMeetingOpen(false);
                          }}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs",
                            active
                              ? "bg-primary/10 text-primary"
                              : "text-foreground hover:bg-muted"
                          )}
                        >
                          <span className="w-10 shrink-0 font-semibold tabular-nums">
                            #{m.meeting}
                          </span>
                          <span className="flex-1 truncate text-muted-foreground">
                            {prettyDate(m.dateISO)}
                          </span>
                          <span className="shrink-0 tabular-nums text-muted-foreground">
                            {m.timeUTC ? `${m.timeUTC} UTC` : "—"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Repos
            </span>
            {REPO_KEYS.map((r) => {
              const on = repos.has(r);
              return (
                <button
                  key={r}
                  onClick={() => toggleRepo(r)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border px-2 py-1",
                    on
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-3.5 w-3.5 items-center justify-center rounded-[3px] border",
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border"
                    )}
                  >
                    {on && <Check className="h-2.5 w-2.5" />}
                  </span>
                  {REPO_LABEL[r]}
                </button>
              );
            })}
          </div>
        </div>

        {refreshedAt && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Showing <strong className="text-foreground">{rangeLabel}</strong>
            {selectedMeeting && (
              <>
                {" "}
                · <span className="text-foreground">Office Hour #{selectedMeeting.meeting}</span>
                {selectedMeeting.timeUTC ? ` at ${selectedMeeting.timeUTC} UTC` : ""}
              </>
            )}{" "}
            · updated {refreshedAt.toLocaleTimeString()}
          </p>
        )}
      </section>

      {/* Segmented Sub-Tab Bar: Leaderboard First */}
      <div className="border-b border-border pb-2">
        <div
          role="tablist"
          aria-label="Editor analytics views"
          className="flex items-center gap-1.5 overflow-x-auto scrollbar-none"
        >
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-foreground text-background font-semibold shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <tab.icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                {"count" in tab && tab.count !== undefined && (
                  <span
                    className={cn(
                      "font-mono text-[10px]",
                      active ? "text-background/80" : "text-muted-foreground"
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {loading && leaderboard.length === 0 ? (
        <div className="rounded-xl border border-border bg-card/60 py-16">
          <InlineBrandLoader size="md" label="Loading editor intelligence…" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* TAB 1: LEADERBOARD FIRST */}
          {activeTab === "leaderboard" && (
            <div className="space-y-4">
              {/* Executive Metrics Overview */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="flex flex-col justify-between rounded-xl border border-border bg-card/60 p-3.5">
                  <div className="flex items-center justify-between">
                    <Users className="h-4 w-4 text-violet-500" />
                    <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
                      Canonical
                    </span>
                  </div>
                  <div>
                    <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-foreground font-mono">
                      <span>{activeCanonicalCount}</span>
                      <span className="text-muted-foreground font-normal text-lg">
                        /{CANONICAL_EIP_EDITORS.length}
                      </span>
                    </p>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Active Editors
                    </p>
                  </div>
                </div>

                <div className="flex flex-col justify-between rounded-xl border border-border bg-card/60 p-3.5">
                  <div className="flex items-center justify-between">
                    <GitPullRequest className="h-4 w-4 text-emerald-500" />
                    <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
                      Window
                    </span>
                  </div>
                  <div>
                    <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-foreground font-mono">
                      {totalPRs.toLocaleString()}
                    </p>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      PRs Touched
                    </p>
                  </div>
                </div>

                <div className="flex flex-col justify-between rounded-xl border border-border bg-card/60 p-3.5">
                  <div className="flex items-center justify-between">
                    <Eye className="h-4 w-4 text-blue-500" />
                    <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
                      Total
                    </span>
                  </div>
                  <div>
                    <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-foreground font-mono">
                      {totalReviewsInWindow.toLocaleString()}
                    </p>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Reviews
                    </p>
                  </div>
                </div>

                <div className="flex flex-col justify-between rounded-xl border border-border bg-card/60 p-3.5">
                  <div className="flex items-center justify-between">
                    <Activity className="h-4 w-4 text-amber-500" />
                    <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
                      Actions
                    </span>
                  </div>
                  <div>
                    <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-foreground font-mono">
                      {totalActionsInWindow.toLocaleString()}
                    </p>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Total Events
                    </p>
                  </div>
                </div>
              </div>

              {/* Comprehensive Leaderboard Table */}
              <section className="rounded-xl border border-border bg-card/60 p-4">
                <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold text-foreground">
                      Canonical Editor Leaderboard
                    </h2>
                    <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {filteredLeaderboard.length} editors
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Filter editor..."
                        className="h-8 rounded-lg border border-border bg-background/70 pl-8 pr-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
                      />
                    </div>

                    {/* Status Filter Chips */}
                    <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
                      <button
                        onClick={() => setStatusFilter("all")}
                        className={cn(
                          "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                          statusFilter === "all"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        All (5)
                      </button>
                      <button
                        onClick={() => setStatusFilter("active")}
                        className={cn(
                          "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                          statusFilter === "active"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Active ({activeCanonicalCount})
                      </button>
                      <button
                        onClick={() => setStatusFilter("inactive")}
                        className={cn(
                          "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                          statusFilter === "inactive"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Inactive ({CANONICAL_EIP_EDITORS.length - activeCanonicalCount})
                      </button>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-border/80 text-[11px] font-semibold text-muted-foreground">
                        <th className="py-2.5 pl-2 pr-3 font-semibold">Rank & Editor</th>
                        <th className="px-3 py-2.5 text-center font-semibold whitespace-nowrap">
                          Status
                        </th>
                        <th className="px-3 py-2.5 text-right font-semibold whitespace-nowrap">
                          Reviews
                        </th>
                        <th className="px-3 py-2.5 text-right font-semibold whitespace-nowrap">
                          Comments
                        </th>
                        <th className="px-3 py-2.5 text-right font-semibold whitespace-nowrap">
                          Merges
                        </th>
                        <th className="px-3 py-2.5 text-right font-semibold whitespace-nowrap">
                          PRs Touched
                        </th>
                        <th className="px-4 py-2.5 font-semibold">Activity Share</th>
                        <th className="py-2.5 pl-3 pr-2 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filteredLeaderboard.map((e, i) => {
                        const isInactive = Boolean(e.isInactive);
                        const total = e.reviews + e.comments + e.merges;
                        const medal =
                          !isInactive && i === 0
                            ? "🥇"
                            : !isInactive && i === 1
                            ? "🥈"
                            : !isInactive && i === 2
                            ? "🥉"
                            : null;
                        const sharePct =
                          totalActionsInWindow > 0
                            ? Math.round((total / totalActionsInWindow) * 100)
                            : 0;

                        return (
                          <tr
                            key={e.editor}
                            className={cn(
                              "hover:bg-muted/30 transition-colors",
                              isInactive ? "opacity-45 hover:opacity-75" : "opacity-100"
                            )}
                          >
                            {/* Editor */}
                            <td className="py-2.5 pl-2 pr-3 whitespace-nowrap">
                              <div className="flex items-center gap-2.5">
                                <span className="w-5 text-center font-mono text-xs text-muted-foreground">
                                  {medal ?? `#${i + 1}`}
                                </span>
                                <div className="relative shrink-0">
                                  <Image
                                    src={editorAvatar(e.editor)}
                                    alt={e.editor}
                                    width={26}
                                    height={26}
                                    unoptimized
                                    className={cn(
                                      "h-6.5 w-6.5 rounded-full object-cover ring-1",
                                      isInactive
                                        ? "ring-border/40 grayscale"
                                        : medal
                                        ? "ring-amber-400/60"
                                        : "ring-border"
                                    )}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <Link
                                    href={`/user/${e.editor}`}
                                    className="truncate font-medium text-foreground hover:text-primary transition-colors text-xs block"
                                  >
                                    {e.editor}
                                  </Link>
                                  <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
                                    Canonical Editor
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="px-3 py-2.5 text-center whitespace-nowrap">
                              {!isInactive ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                  Inactive
                                </span>
                              )}
                            </td>

                            {/* Reviews */}
                            <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-foreground/90 whitespace-nowrap">
                              {e.reviews}
                            </td>

                            {/* Comments */}
                            <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                              {e.comments}
                            </td>

                            {/* Merges */}
                            <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                              {e.merges > 0 ? (
                                <span className="font-semibold text-emerald-500">{e.merges}</span>
                              ) : (
                                "0"
                              )}
                            </td>

                            {/* PRs Touched */}
                            <td className="px-3 py-2.5 text-right font-mono text-xs font-semibold tabular-nums text-foreground whitespace-nowrap">
                              {e.prsReviewed}
                            </td>

                            {/* Activity Share Bar */}
                            <td className="px-4 py-2.5 min-w-[140px]">
                              {!isInactive && total > 0 ? (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                    <span>{sharePct}% share</span>
                                    <span>{total} events</span>
                                  </div>
                                  <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                    <div
                                      className="h-full bg-blue-500"
                                      style={{ width: `${(e.reviews / total) * 100}%` }}
                                    />
                                    <div
                                      className="h-full bg-violet-500"
                                      style={{ width: `${(e.comments / total) * 100}%` }}
                                    />
                                    <div
                                      className="h-full bg-emerald-500"
                                      style={{ width: `${(e.merges / total) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className="h-1.5 w-full rounded-full bg-muted-foreground/10" />
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-2.5 pl-3 pr-2 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  onClick={() => handleInspectEditor(e.editor)}
                                  className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1 text-[11px] text-foreground hover:border-primary/40 hover:text-primary transition-colors"
                                  title="Inspect actions in Explorer"
                                >
                                  Explorer
                                  <ArrowRight className="h-3 w-3" />
                                </button>
                                <Link
                                  href={`/user/${e.editor}`}
                                  className="rounded-md border border-border bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  Profile
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {/* TAB 2: MEETING ATTENDANCE MATRIX */}
          {activeTab === "attendance" && (
            <div className="space-y-4">
              <EditorAttendanceMatrix />

              {/* Canonical Editor Benchmark Participation Table */}
              <section className="rounded-xl border border-border bg-card/60 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">
                      Canonical Editor Benchmark Participation & Attendance
                    </h3>
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    Jan–Sep Historical Records
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-border/80 text-[11px] font-semibold text-muted-foreground">
                        <th className="py-2 pl-2 pr-3 font-semibold">Editor (GitHub)</th>
                        <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                          EIPIP (of 8)
                        </th>
                        <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                          Office Hours hosted (of 32)
                        </th>
                        <th className="py-2 pl-3 pr-2 text-right font-semibold whitespace-nowrap">
                          PR reviews, Jan–Sep
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {CANONICAL_EDITOR_PARTICIPATION.map((item) => (
                        <tr key={item.github} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2 pl-2 pr-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Image
                                src={editorAvatar(item.github)}
                                alt={item.displayName}
                                width={22}
                                height={22}
                                unoptimized
                                className="h-5.5 w-5.5 rounded-full object-cover ring-1 ring-border"
                              />
                              <Link
                                href={`/user/${item.github}`}
                                className="font-medium text-foreground hover:text-primary transition-colors text-xs"
                              >
                                {item.displayName}{" "}
                                <span className="text-muted-foreground font-mono text-[11px]">
                                  ({item.github})
                                </span>
                              </Link>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-xs tabular-nums text-foreground/90">
                            {item.eipipAttended}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-xs tabular-nums text-foreground/90">
                            {item.officeHoursHosted}
                          </td>
                          <td className="py-2 pl-3 pr-2 text-right font-mono text-xs font-semibold tabular-nums text-foreground">
                            {item.prReviews.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {/* TAB 3: PR & ACTION EXPLORER */}
          {activeTab === "explorer" && (
            <EditorActionsExplorer
              from={winFrom}
              to={winTo}
              actors={CANONICAL_EIP_EDITORS as unknown as string[]}
              selectedActor={selectedActorForExplorer}
              onActorChange={setSelectedActorForExplorer}
              hideHeader
            />
          )}

          {/* TAB 4: VELOCITY & TRENDS */}
          {activeTab === "trends" && (
            <div className="space-y-4">
              <section className="rounded-xl border border-border bg-card/60 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">
                      Activity Velocity over Time
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Daily editor actions
                  </span>
                </div>
                {dailyActivity.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    No recorded daily activity for canonical editors in this window.
                  </p>
                ) : (
                  <div className="relative h-[340px] w-full">
                    <ReactECharts
                      option={activityTrendOption}
                      style={{ height: "100%", width: "100%" }}
                      opts={{ renderer: "svg" }}
                      notMerge
                    />
                    <ChartWatermark position="center" />
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
