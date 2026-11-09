"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
} from "lucide-react";
import { client } from "@/lib/orpc";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ActivityTimelineSection, type ActivityDetail } from "@/components/user/activity-timeline-section";
import { RepositoryBreakdownSection } from "@/components/user/repository-breakdown-section";
import { ContributorHeatmap } from "@/components/analytics/ContributorHeatmap";
import { InlineBrandLoader } from "@/components/inline-brand-loader";
import { CANONICAL_EIP_EDITORS, CANONICAL_EIP_REVIEWERS } from "@/data/eip-contributor-roles";
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
  Legend,
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

function deriveRoleSummary(data: {
  summary: { reviews: number; prsAuthored: number; eipsAuthored: number };
  leaderboard: {
    editor: { rank: number | null };
    reviewer: { rank: number | null };
  };
}) {
  const editorRank = data.leaderboard.editor.rank;
  const reviewerRank = data.leaderboard.reviewer.rank;
  if (reviewerRank && editorRank) {
    return reviewerRank < editorRank ? "Reviewer-editor" : "Editor-reviewer";
  }
  if (reviewerRank) return "Reviewer";
  if (editorRank) return "Editor";
  if (data.summary.prsAuthored > 0 || data.summary.eipsAuthored > 0) return "Contributor-author";
  return "Contributor";
}

export default function PersonProfilePage() {
  const params = useParams();
  const actorParam = decodeURIComponent(String(params.actor ?? "")).trim();
  const [activeTab, setActiveTab] = useState<"timeline" | "prs" | "issues">("timeline");
  const [rangePreset, setRangePreset] = useState<RangePreset>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  // null = "all selected"; a Set means the explicit set the user picked.
  const [selectedActions, setSelectedActions] = useState<Set<string> | null>(null);

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

  // Action-type check options drive BOTH the timeline and the breakdown.
  const allActions: string[] = (data?.actionBreakdown ?? []).map((a: ActionCount) => a.actionType);
  const activeActions = selectedActions ?? new Set(allActions);
  const toggleAction = (a: string) =>
    setSelectedActions((prev) => {
      const base = new Set(prev ?? allActions);
      if (base.has(a)) base.delete(a);
      else base.add(a);
      return base;
    });
  const filteredActionBreakdown = (data?.actionBreakdown ?? []).filter((a: ActionCount) =>
    activeActions.has(a.actionType),
  );
  // Per-action-type monthly series so the timeline can show the selected actions over time.
  const monthlyByAction = useMemo(() => {
    if (!data) return [];
    return data.monthlyActivity.map((p: MonthlyPoint) => {
      const row: Record<string, string | number> = { month: p.month, label: monthLabel(p.month), total: p.total };
      for (const ac of p.actionCounts) row[ac.actionType] = ac.count;
      return row;
    });
  }, [data]);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const topRepo = useMemo(() => {
    if (!data?.activityDetails?.length) return "—";
    const counts = new Map<string, number>();
    for (const item of data.activityDetails as ActivityDetail[]) {
      const repo = item.repo ?? "Unknown";
      counts.set(repo, (counts.get(repo) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  }, [data?.activityDetails]);

  const roleSummary = data ? deriveRoleSummary(data) : "Contributor";
  const profileNarrative = data
    ? `${roleSummary} with strongest ${topAction ? prettyAction(topAction).toLowerCase() : "activity"} contribution in ${rangeLabel.toLowerCase()}, mainly across ${topRepo}.`
    : "";
  const canonicalBadge = useMemo(() => {
    const key = actorParam.toLowerCase();
    const isEditor = CANONICAL_EIP_EDITORS.some((e) => e.toLowerCase() === key);
    const isReviewer = CANONICAL_EIP_REVIEWERS.some((r) => r.toLowerCase() === key);
    if (isEditor && isReviewer) return "Editor & Reviewer Profile";
    if (isEditor) return "Editor Profile";
    if (isReviewer) return "Reviewer Profile";
    return "Contributor Profile";
  }, [actorParam]);

  if (profileQuery.isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <InlineBrandLoader size="md" label="Loading profile..." />
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
    <div className="mx-auto w-full px-3 py-6 sm:px-4 lg:px-5 xl:px-6">
      <header className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
          <Users className="h-3.5 w-3.5" />
          {canonicalBadge}
        </div>
        <div className="mt-3 flex items-start gap-4">
          <Avatar className="h-16 w-16 border border-border">
            <AvatarImage src={githubAvatar} alt={data.actor} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {initials(data.actor)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="dec-title persona-title text-3xl font-semibold tracking-tight sm:text-4xl">
              {data.actor}
            </h1>
            <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">
              {profileNarrative}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Primary role: <span className="font-medium text-foreground">{roleSummary}</span> · Primary action: <span className="font-medium text-foreground">{topAction ? prettyAction(topAction) : "—"}</span>
            </p>
            <a
              href={`https://github.com/${encodeURIComponent(data.actor)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex text-xs text-primary hover:underline"
            >
              View GitHub profile
            </a>
          </div>
        </div>
      </header>

      <section className="mb-6 rounded-xl border border-border bg-card/60 p-4">
        <div className="mb-3 text-sm font-medium text-foreground">Active Window</div>
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
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted/60"
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
                className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
              />
            </div>
          )}
        </div>
      </section>

      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-border bg-card/60 p-4">
          <p className="text-xs text-muted-foreground">Total Activity</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {data.summary.totalActivities.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card/60 p-4">
          <p className="text-xs text-muted-foreground">PRs Touched</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {data.summary.prsTouched.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card/60 p-4">
          <p className="text-xs text-muted-foreground">PRs Authored</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {data.summary.prsAuthored.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card/60 p-4">
          <p className="text-xs text-muted-foreground">EIPs Authored</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {data.summary.eipsAuthored.toLocaleString()}
          </p>
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-border bg-card/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Profile Summary</p>
        <div className="mt-2 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
          <p className="text-muted-foreground">All-time rank: <span className="font-semibold text-foreground">#{data.leaderboard.allTime.totalRank ?? "—"}</span> / {data.leaderboard.allTime.participants || "—"}</p>
          <p className="text-muted-foreground">This month rank: <span className="font-semibold text-foreground">#{data.leaderboard.thisMonth.totalRank ?? "—"}</span> / {data.leaderboard.thisMonth.participants || "—"}</p>
          <p className="text-muted-foreground">Peak month: <span className="font-semibold text-foreground">{data.peaks.topMonth ? `${monthLabel(data.peaks.topMonth.month)} (${data.peaks.topMonth.count})` : "—"}</span></p>
          <p className="text-muted-foreground">Top repo: <span className="font-semibold text-foreground">{topRepo}</span></p>
          <p className="text-muted-foreground">First seen: <span className="font-semibold text-foreground">{data.summary.firstActivity ? new Date(data.summary.firstActivity).toLocaleDateString() : "—"}</span></p>
          <p className="text-muted-foreground">Last active: <span className="font-semibold text-foreground">{data.summary.lastActivity ? new Date(data.summary.lastActivity).toLocaleDateString() : "—"}</span></p>
        </div>
      </section>

      <section className="mb-6 space-y-4">
        {/* Check options — pick which action types to show in both charts below */}
        {allActions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/60 px-4 py-3">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Show</span>
            {allActions.map((a) => {
              const on = activeActions.has(a);
              const color = actionColors[a] ?? "#22d3ee";
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleAction(a)}
                  aria-pressed={on}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                    on ? "border-border bg-muted/60 text-foreground" : "border-border/50 text-muted-foreground opacity-55 hover:opacity-80",
                  )}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-sm"
                    style={{ background: on ? color : "transparent", border: `1.5px solid ${color}` }}
                  />
                  {prettyAction(a)}
                </button>
              );
            })}
            {selectedActions && (
              <button
                type="button"
                onClick={() => setSelectedActions(null)}
                className="ml-1 text-xs font-medium text-primary hover:underline"
              >
                Reset
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-xl border border-border bg-card/60 p-4">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Activity over time</h2>
            <p className="mb-2 text-[11px] text-muted-foreground">Monthly actions by type for the selected options.</p>
            <ChartContainer
              config={Object.fromEntries(allActions.map((a) => [a, { label: prettyAction(a), color: actionColors[a] ?? "#22d3ee" }]))}
              className="h-72 w-full"
            >
              <ResponsiveContainer>
                <LineChart data={monthlyByAction} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#33415533" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={32} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="plainline" />
                  {allActions
                    .filter((a) => activeActions.has(a))
                    .map((a) => (
                      <Line
                        key={a}
                        type="monotone"
                        dataKey={a}
                        name={prettyAction(a)}
                        stroke={actionColors[a] ?? "#22d3ee"}
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                      />
                    ))}
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>

          <div className="rounded-xl border border-border bg-card/60 p-4">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Activity by action type</h2>
            <p className="mb-2 text-[11px] text-muted-foreground">Totals for the selected options.</p>
            <ChartContainer config={{ count: { label: "Count", color: "#10b981" } }} className="h-72 w-full">
              <ResponsiveContainer>
                <BarChart data={filteredActionBreakdown} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#33415533" vertical={false} />
                  <XAxis dataKey="actionType" tickFormatter={(value) => prettyAction(value)} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={32} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                    {filteredActionBreakdown.map((entry: ActionCount) => (
                      <Cell key={entry.actionType} fill={actionColors[entry.actionType] ?? "#22d3ee"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-border bg-card/60 p-4">
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
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted/60"
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
              <div key={`${pr.repo}-${pr.prNumber}`} className="rounded-lg border border-border bg-muted/20 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">#{pr.prNumber} · {pr.title || "Untitled PR"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {pr.repo ?? "Unknown"} · Last touched by contributor: {new Date(pr.lastOccurredAt).toLocaleDateString()}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] text-muted-foreground">{pr.state || "unknown"}</span>
                      {pr.governanceState && (
                        <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">{pr.governanceState}</span>
                      )}
                      <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                        {pr.totalActions} actions
                      </span>
                      {pr.actionsBreakdown.slice(0, 3).map((action) => (
                        <span key={action} className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">
                          {action.replace(":", " · ")}
                        </span>
                      ))}
                    </div>
                  </div>
                  <a
                    href={`https://github.com/${pr.repo ?? "ethereum/EIPs"}/pull/${pr.prNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground hover:bg-muted/60"
                  >
                    Open
                  </a>
                </div>
              </div>
            ))}
            {data.involvedPRs.length === 0 && (
              <p className="text-sm text-muted-foreground">No PR activity records found in selected window.</p>
            )}
          </div>
        )}

        {activeTab === "issues" && (
          <div className="space-y-3">
            {data.authoredIssues.map((issue: AuthoredIssue) => (
              <div key={`${issue.repo}-${issue.issueNumber}`} className="rounded-lg border border-border bg-muted/20 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">#{issue.issueNumber} · {issue.title || "Untitled Issue"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {issue.repo ?? "Unknown"} · {issue.updatedAt ? new Date(issue.updatedAt).toLocaleDateString() : "—"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] text-muted-foreground">{issue.state || "unknown"}</span>
                      {issue.labels.slice(0, 3).map((label) => (
                        <span key={label} className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">{label}</span>
                      ))}
                    </div>
                  </div>
                  <a
                    href={`https://github.com/${issue.repo ?? "ethereum/EIPs"}/issues/${issue.issueNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground hover:bg-muted/60"
                  >
                    Open
                  </a>
                </div>
              </div>
            ))}
            {data.authoredIssues.length === 0 && (
              <p className="text-sm text-muted-foreground">No authored issue records found.</p>
            )}
          </div>
        )}
      </section>

      <div className="mb-6">
        <RepositoryBreakdownSection
          actor={data.actor}
          activities={data.activityDetails as ActivityDetail[]}
        />
      </div>

      <details className="rounded-xl border border-border bg-card/60 p-4">
        <summary className="cursor-pointer text-sm font-medium text-foreground">Daily activity pattern</summary>
        <div className="mt-4">
          {dailyActivityQuery.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <InlineBrandLoader label="Loading activity..." />
            </div>
          ) : dailyActivityQuery.data && dailyActivityQuery.data.length > 0 ? (
            <ContributorHeatmap data={dailyActivityQuery.data} />
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 py-8 text-center">
              <p className="text-sm text-muted-foreground">No activity data available for the selected range</p>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
