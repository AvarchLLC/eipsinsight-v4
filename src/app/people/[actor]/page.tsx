"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  Loader2,
  Medal,
  RefreshCcw,
  Sparkles,
  Users,
} from "lucide-react";
import { client } from "@/lib/orpc";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ActivityTimelineSection, type ActivityDetail } from "@/components/people/activity-timeline-section";
import { RepositoryBreakdownSection } from "@/components/people/repository-breakdown-section";
import { ContributorHeatmap } from "@/components/analytics/ContributorHeatmap";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

type ActionCount = { actionType: string; count: number };
type MonthlyPoint = { month: string; total: number; actionCounts: ActionCount[] };

type InvolvedPR = {
  prNumber: number;
  repo: string | null;
  title: string | null;
  state: string | null;
  governanceState: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  mergedAt: string | null;
  closedAt: string | null;
  totalActions: number;
  actionsBreakdown: string[];
  lastOccurredAt: string;
};

type AuthoredIssue = {
  issueNumber: number;
  repo: string | null;
  title: string | null;
  state: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  closedAt: string | null;
  labels: string[];
};

type RangePreset = "7d" | "30d" | "365d" | "all" | "custom";

const actionColors: Record<string, string> = {
  reviewed: "#22c55e",
  commented: "#60a5fa",
  issue_comment: "#38bdf8",
  committed: "#a78bfa",
  opened: "#f59e0b",
  status_change: "#ef4444",
};

function prettyAction(action: string) {
  return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function monthLabel(month: string) {
  const [year, m] = month.split("-");
  return new Date(Number(year), Number(m) - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

function dateToIsoStart(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function dateToIsoEnd(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

function initials(name: string) {
  const bits = name.split(/\s+/).filter(Boolean);
  if (bits.length === 0) return "NA";
  if (bits.length === 1) return bits[0].slice(0, 2).toUpperCase();
  return (bits[0][0] + bits[1][0]).toUpperCase();
}

export default function PersonProfilePage() {
  const params = useParams();
  const actorParam = decodeURIComponent(String(params.actor ?? "")).trim();
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"timeline" | "prs" | "issues">("timeline");
  const [rangePreset, setRangePreset] = useState<RangePreset>("365d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const range = useMemo(() => {
    const now = new Date();
    if (rangePreset === "all") {
      return { fromIso: null as string | null, toIso: null as string | null };
    }
    if (rangePreset === "custom") {
      const fromIso = customFrom ? dateToIsoStart(new Date(customFrom)) : null;
      const toIso = customTo ? dateToIsoEnd(new Date(customTo)) : null;
      return { fromIso, toIso };
    }
    const days = rangePreset === "7d" ? 7 : rangePreset === "30d" ? 30 : 365;
    const from = new Date(now);
    from.setDate(now.getDate() - (days - 1));
    return { fromIso: dateToIsoStart(from), toIso: now.toISOString() };
  }, [rangePreset, customFrom, customTo]);

  const profileQuery = useQuery({
    queryKey: ["contributor-profile", actorParam, range.fromIso, range.toIso],
    queryFn: () =>
      client.analytics.getContributorProfile({
        actor: actorParam,
        limit: 400,
        months: 24,
        from: range.fromIso ?? undefined,
        to: range.toIso ?? undefined,
      }),
    enabled: actorParam.length > 0,
    staleTime: 60_000,
  });

  const dailyActivityQuery = useQuery({
    queryKey: ["contributor-daily-activity", actorParam, range.fromIso, range.toIso],
    queryFn: () =>
      client.analytics.getContributorDailyActivity({
        actor: actorParam,
        from: range.fromIso ?? undefined,
        to: range.toIso ?? undefined,
      }),
    enabled: actorParam.length > 0,
    staleTime: 60_000,
  });

  const data = profileQuery.data;
  const actionTypes = useMemo(
    () => data?.actionBreakdown.map((a) => a.actionType) ?? [],
    [data?.actionBreakdown]
  );

  const activeActions = selectedActions.length > 0 ? selectedActions : actionTypes;
  const topAction = data?.actionBreakdown[0]?.actionType ?? null;
  const githubAvatar = data?.actor ? `https://github.com/${encodeURIComponent(data.actor)}.png?size=128` : undefined;
  const rangeLabel = useMemo(() => {
    if (rangePreset === "7d") return "Last 7 days";
    if (rangePreset === "30d") return "Last 30 days";
    if (rangePreset === "365d") return "Last 365 days";
    if (rangePreset === "all") return "All time";
    if (customFrom || customTo) {
      return `${customFrom || "start"} to ${customTo || "today"}`;
    }
    return "Custom range";
  }, [rangePreset, customFrom, customTo]);

  const filteredMonthly = useMemo(() => {
    if (!data) return [];
    return data.monthlyActivity.map((point: MonthlyPoint) => {
      const total = point.actionCounts
        .filter((item) => activeActions.includes(item.actionType))
        .reduce((sum, item) => sum + item.count, 0);

      return {
        month: point.month,
        label: monthLabel(point.month),
        total,
      };
    });
  }, [data, activeActions]);

  const filteredActionBreakdown = useMemo(() => {
    if (!data) return [];
    return data.actionBreakdown.filter((a: ActionCount) =>
      activeActions.includes(a.actionType)
    );
  }, [data, activeActions]);

  const sparklineData = useMemo(() => {
    if (!data) return [] as Array<{ actionType: string; count: number; series: Array<{ idx: number; count: number }> }>;

    return data.actionBreakdown.map((action: ActionCount) => {
      const series = data.monthlyActivity.slice(-12).map((point: MonthlyPoint, idx: number) => {
        const found = point.actionCounts.find((a) => a.actionType === action.actionType);
        return { idx, count: found?.count ?? 0 };
      });
      return {
        actionType: action.actionType,
        count: action.count,
        series,
      };
    });
  }, [data]);

  const toggleAction = (action: string) => {
    setSelectedActions((prev) =>
      prev.includes(action) ? prev.filter((a) => a !== action) : [...prev, action]
    );
  };

  const resetFilters = () => setSelectedActions([]);

  if (profileQuery.isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (profileQuery.isError || !data) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-xl border border-rose-300/50 bg-rose-50/80 p-6 dark:border-rose-400/30 dark:bg-rose-950/20">
          <h1 className="text-lg font-semibold text-rose-700 dark:text-rose-300">
            Failed to load contributor profile
          </h1>
          <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">
            Try again from search, or use a different name.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-700 dark:text-cyan-300">
          <Users className="h-3.5 w-3.5" />
          Contributor Profile
        </div>
        <div className="mt-3 flex items-start gap-4">
          <Avatar className="h-16 w-16 border border-cyan-400/30">
            <AvatarImage src={githubAvatar} alt={data.actor} />
            <AvatarFallback className="bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">
              {initials(data.actor)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="dec-title text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              {data.actor}
            </h1>
            <p className="mt-1.5 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
              End-to-end activity view across reviews, comments, commits, PR actions, and
              governance-related status changes.
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Primary action: <span className="font-medium text-slate-800 dark:text-slate-200">{topAction ? prettyAction(topAction) : "—"}</span>
            </p>
            <a
              href={`https://github.com/${encodeURIComponent(data.actor)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex text-xs text-cyan-700 hover:underline dark:text-cyan-300"
            >
              View GitHub profile
            </a>
          </div>
        </div>
      </header>

      <section className="mb-6 rounded-xl border border-slate-200 bg-white/90 p-4 dark:border-slate-700/50 dark:bg-slate-900/50">
        <div className="mb-3 text-sm font-medium text-slate-800 dark:text-slate-200">Active Window</div>
        <div className="flex flex-wrap items-center gap-2">
          {([
            ["7d", "Last 7 Days"],
            ["30d", "Last 30 Days"],
            ["365d", "Last Year"],
            ["all", "All Time"],
            ["custom", "Custom"],
          ] as [RangePreset, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setRangePreset(key)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs transition-colors",
                rangePreset === key
                  ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
                  : "border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800/60"
              )}
            >
              {label}
            </button>
          ))}
          {rangePreset === "custom" && (
            <div className="ml-1 flex items-center gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              />
              <span className="text-xs text-slate-500">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              />
            </div>
          )}
        </div>
      </section>

      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white/90 p-4 dark:border-slate-700/50 dark:bg-slate-900/50">
          <p className="text-xs text-slate-500 dark:text-slate-400">Total Activity</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {data.summary.totalActivities.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white/90 p-4 dark:border-slate-700/50 dark:bg-slate-900/50">
          <p className="text-xs text-slate-500 dark:text-slate-400">PRs Touched</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {data.summary.prsTouched.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white/90 p-4 dark:border-slate-700/50 dark:bg-slate-900/50">
          <p className="text-xs text-slate-500 dark:text-slate-400">PRs Authored</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {data.summary.prsAuthored.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white/90 p-4 dark:border-slate-700/50 dark:bg-slate-900/50">
          <p className="text-xs text-slate-500 dark:text-slate-400">EIPs Authored</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {data.summary.eipsAuthored.toLocaleString()}
          </p>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white/90 p-4 dark:border-slate-700/50 dark:bg-slate-900/50">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
            <Medal className="h-4 w-4 text-amber-500" />
            Leaderboard Position
          </div>
          <div className="space-y-1 text-sm">
            <p className="text-slate-600 dark:text-slate-400">
              All-time total: <span className="font-semibold text-slate-900 dark:text-white">#{data.leaderboard.allTime.totalRank ?? "—"}</span> / {data.leaderboard.allTime.participants || "—"}
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              This month: <span className="font-semibold text-slate-900 dark:text-white">#{data.leaderboard.thisMonth.totalRank ?? "—"}</span> / {data.leaderboard.thisMonth.participants || "—"}
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              Editor rank: <span className="font-semibold text-slate-900 dark:text-white">{data.leaderboard.editor.rank ? `#${data.leaderboard.editor.rank}` : "—"}</span>
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              Reviewer rank: <span className="font-semibold text-slate-900 dark:text-white">{data.leaderboard.reviewer.rank ? `#${data.leaderboard.reviewer.rank}` : "—"}</span>
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white/90 p-4 dark:border-slate-700/50 dark:bg-slate-900/50">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
            <Sparkles className="h-4 w-4 text-cyan-500" />
            Peak Insights
          </div>
          <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
            <p>
              Peak month: <span className="font-semibold text-slate-900 dark:text-white">{data.peaks.topMonth ? `${monthLabel(data.peaks.topMonth.month)} (${data.peaks.topMonth.count})` : "—"}</span>
            </p>
            <p>
              Months topped leaderboard: <span className="font-semibold text-slate-900 dark:text-white">{data.peaks.toppedMonths}</span>
            </p>
            {data.peaks.topActionMonths.slice(0, 2).map((m: { actionType: string; month: string; count: number }) => (
              <p key={m.actionType}>
                Best {prettyAction(m.actionType)}: <span className="font-semibold text-slate-900 dark:text-white">{monthLabel(m.month)} ({m.count})</span>
              </p>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white/90 p-4 dark:border-slate-700/50 dark:bg-slate-900/50">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
            <Calendar className="h-4 w-4 text-emerald-500" />
            Activity Span
          </div>
          <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
            <p>
              First seen: <span className="font-medium text-slate-900 dark:text-white">{data.summary.firstActivity ? new Date(data.summary.firstActivity).toLocaleDateString() : "—"}</span>
            </p>
            <p>
              Last active: <span className="font-medium text-slate-900 dark:text-white">{data.summary.lastActivity ? new Date(data.summary.lastActivity).toLocaleDateString() : "—"}</span>
            </p>
            <p>
              Reviews: <span className="font-medium text-slate-900 dark:text-white">{data.summary.reviews}</span>
            </p>
            <p>
              Commits: <span className="font-medium text-slate-900 dark:text-white">{data.summary.commits}</span>
            </p>
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-slate-200 bg-white/90 p-4 dark:border-slate-700/50 dark:bg-slate-900/50">
        <h2 className="mb-4 text-sm font-medium text-slate-800 dark:text-slate-200">Daily Activity</h2>
        {dailyActivityQuery.isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
          </div>
        ) : dailyActivityQuery.data && dailyActivityQuery.data.length > 0 ? (
          <ContributorHeatmap data={dailyActivityQuery.data} />
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 py-8 text-center dark:border-slate-700 dark:bg-slate-900/50">
            <p className="text-sm text-slate-500 dark:text-slate-400">No activity data available for the selected range</p>
          </div>
        )}
      </section>

      <section className="mb-6 rounded-xl border border-slate-200 bg-white/90 p-4 dark:border-slate-700/50 dark:bg-slate-900/50">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Filter by activity action</div>
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/60"
          >
            <RefreshCcw className="h-3 w-3" />
            Reset
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {actionTypes.map((action) => {
            const active = selectedActions.length === 0 || selectedActions.includes(action);
            return (
              <button
                key={action}
                onClick={() => toggleAction(action)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs transition-colors",
                  active
                    ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
                    : "border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800/60"
                )}
              >
                {prettyAction(action)}
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sparklineData.map((item) => (
            <div key={item.actionType} className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{prettyAction(item.actionType)}</p>
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{item.count}</p>
              </div>
              <div className="h-14 w-full">
                <ResponsiveContainer>
                  <LineChart data={item.series}>
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke={actionColors[item.actionType] ?? "#22d3ee"}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white/90 p-4 dark:border-slate-700/50 dark:bg-slate-900/50">
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Progress Over Time (24 months)</h2>
          <ChartContainer config={{ total: { label: "Activity", color: "#22d3ee" } }} className="h-72 w-full">
            <ResponsiveContainer>
              <LineChart data={filteredMonthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#33415533" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="total" stroke="#06b6d4" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white/90 p-4 dark:border-slate-700/50 dark:bg-slate-900/50">
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Activity by Action Type</h2>
          <ChartContainer config={{ count: { label: "Count", color: "#10b981" } }} className="h-72 w-full">
            <ResponsiveContainer>
              <BarChart data={filteredActionBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#33415533" />
                <XAxis dataKey="actionType" tickFormatter={(value) => prettyAction(value)} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {filteredActionBreakdown.map((entry: ActionCount) => (
                    <Cell key={entry.actionType} fill={actionColors[entry.actionType] ?? "#22d3ee"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </section>

      <div className="mb-6">
        <RepositoryBreakdownSection
          actor={data.actor}
          activities={data.activityDetails as ActivityDetail[]}
        />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white/90 p-4 dark:border-slate-700/50 dark:bg-slate-900/50">
        <div className="mb-4 flex items-center gap-2">
          {([
            { key: "timeline", label: "Timeline" },
            { key: "prs", label: `PR Activity (${data.involvedPRs.length})` },
            { key: "issues", label: `Issues (${data.authoredIssues.length})` },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-xs transition-colors",
                activeTab === tab.key
                  ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
                  : "border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800/60"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "timeline" && (
          <ActivityTimelineSection
            actor={data.actor}
            rangeLabel={rangeLabel}
            activities={data.activityDetails as ActivityDetail[]}
          />
        )}

        {activeTab === "prs" && (
          <div className="space-y-3">
            {data.involvedPRs.map((pr: InvolvedPR) => (
              <div key={`${pr.repo}-${pr.prNumber}`} className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">#{pr.prNumber} · {pr.title || "Untitled PR"}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {pr.repo ?? "Unknown"} · Last touched by contributor: {new Date(pr.lastOccurredAt).toLocaleDateString()}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">{pr.state || "unknown"}</span>
                      {pr.governanceState && (
                        <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-700 dark:text-cyan-300">{pr.governanceState}</span>
                      )}
                      <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-700 dark:text-emerald-300">
                        {pr.totalActions} actions
                      </span>
                      {pr.actionsBreakdown.slice(0, 3).map((action) => (
                        <span key={action} className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-400">
                          {action.replace(":", " · ")}
                        </span>
                      ))}
                    </div>
                  </div>
                  <a
                    href={`https://github.com/${pr.repo ?? "ethereum/EIPs"}/pull/${pr.prNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-slate-300 px-2 py-1 text-[10px] text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Open
                  </a>
                </div>
              </div>
            ))}
            {data.involvedPRs.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">No PR activity records found in selected window.</p>
            )}
          </div>
        )}

        {activeTab === "issues" && (
          <div className="space-y-3">
            {data.authoredIssues.map((issue: AuthoredIssue) => (
              <div key={`${issue.repo}-${issue.issueNumber}`} className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">#{issue.issueNumber} · {issue.title || "Untitled Issue"}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {issue.repo ?? "Unknown"} · {issue.updatedAt ? new Date(issue.updatedAt).toLocaleDateString() : "—"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">{issue.state || "unknown"}</span>
                      {issue.labels.slice(0, 3).map((label) => (
                        <span key={label} className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-400">{label}</span>
                      ))}
                    </div>
                  </div>
                  <a
                    href={`https://github.com/${issue.repo ?? "ethereum/EIPs"}/issues/${issue.issueNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-slate-300 px-2 py-1 text-[10px] text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Open
                  </a>
                </div>
              </div>
            ))}
            {data.authoredIssues.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">No authored issue records found.</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
