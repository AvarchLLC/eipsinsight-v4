"use client";

import { useMemo, useState } from "react";
import { Download, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export type ActivityDetail = {
  actionType: string;
  role: string | null;
  prNumber: number;
  repo: string | null;
  occurredAt: string;
  prTitle: string | null;
  prState: string | null;
  governanceState: string | null;
  prLabels: string[];
  eventType: string | null;
  githubId: string | null;
  commitSha: string | null;
};

type MetricType = "commits" | "prs" | "reviews" | "comments";

const metricLabels: Record<MetricType, string> = {
  commits: "Commits",
  prs: "Pull Requests",
  reviews: "Reviews",
  comments: "Comments",
};

function prettyAction(action: string) {
  return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function metricForActivity(activity: ActivityDetail): MetricType {
  if (activity.actionType === "committed") return "commits";
  if (activity.actionType === "reviewed") return "reviews";
  if (activity.actionType === "commented" || activity.actionType === "issue_comment") return "comments";
  return "prs";
}

function eventForActivity(activity: ActivityDetail): string {
  const evt = (activity.eventType || "").toUpperCase();
  if (activity.actionType === "committed") return "Commit";
  if (evt === "APPROVED") return "Review Approved";
  if (evt === "CHANGES_REQUESTED") return "Changes Requested";
  if (evt === "COMMENTED" && activity.actionType === "reviewed") return "Review Commented";
  if (activity.actionType === "reviewed") return "PR Review";
  if (activity.actionType === "commented" || activity.actionType === "issue_comment") return "PR Comment";
  if (activity.actionType === "opened") return "PR Opened";
  if (activity.actionType === "status_change") {
    if ((activity.prState || "").toLowerCase() === "closed") return "PR Closed";
    return "PR Status Change";
  }
  return prettyAction(activity.actionType);
}

function repoFamily(repo: string | null) {
  if (!repo) return "Unknown";
  if (repo.includes("EIPs")) return "EIPs";
  if (repo.includes("ERCs")) return "ERCs";
  if (repo.includes("RIPs")) return "RIPs";
  return "Other";
}

function toCsvValue(value: unknown) {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const content = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => toCsvValue(row[h])).join(",")),
  ].join("\n");

  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function githubLinkForActivity(activity: ActivityDetail) {
  const repo = activity.repo || "ethereum/EIPs";
  
  // Convert full repo name to short name (e.g., "ethereum/EIPs" → "eips")
  let shortRepo = 'eips';
  if (repo.toLowerCase().includes('erc')) shortRepo = 'ercs';
  if (repo.toLowerCase().includes('rip')) shortRepo = 'rips';
  
  const basePr = `/pr/${shortRepo}/${activity.prNumber}`;

  if (activity.commitSha) {
    // For commits, we still link to GitHub since we don't have internal commit detail pages
    return `https://github.com/${repo}/commit/${activity.commitSha}`;
  }

  const eventType = (activity.eventType || "").toUpperCase();
  if (activity.githubId && ["APPROVED", "CHANGES_REQUESTED", "REVIEWED"].includes(eventType)) {
    // For review comments, link to internal PR page with hash anchor
    return `${basePr}#pullrequestreview-${activity.githubId}`;
  }

  if (activity.githubId && eventType === "COMMENTED") {
    // For PR comments, link to internal PR page with hash anchor
    return `${basePr}#issuecomment-${activity.githubId}`;
  }

  return basePr;
}

export function ActivityTimelineSection({
  actor,
  rangeLabel,
  activities,
}: {
  actor: string;
  rangeLabel: string;
  activities: ActivityDetail[];
}) {
  const [selectedMetrics, setSelectedMetrics] = useState<MetricType[]>(["commits", "prs", "reviews", "comments"]);
  const allEventTypes = useMemo(() => {
    const set = new Set<string>();
    for (const activity of activities) set.add(eventForActivity(activity));
    return Array.from(set.values());
  }, [activities]);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [repoFilter, setRepoFilter] = useState<string>("All Repositories");
  const [visibleCount, setVisibleCount] = useState(10);

  const filtered = useMemo(() => {
    const eventFilterSet = selectedEvents.length > 0 ? new Set(selectedEvents) : null;
    const metricSet = new Set(selectedMetrics);
    return activities.filter((activity) => {
      if (!metricSet.has(metricForActivity(activity))) return false;
      if (repoFilter !== "All Repositories" && repoFamily(activity.repo) !== repoFilter) return false;
      if (eventFilterSet && !eventFilterSet.has(eventForActivity(activity))) return false;
      return true;
    });
  }, [activities, selectedMetrics, selectedEvents, repoFilter]);

  const visibleActivities = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  const metricCounts = useMemo(() => {
    const counts: Record<MetricType, number> = { commits: 0, prs: 0, reviews: 0, comments: 0 };
    for (const activity of filtered) counts[metricForActivity(activity)] += 1;
    return counts;
  }, [filtered]);

  const csvRows = useMemo(
    () =>
      filtered.map((a) => ({
        actor,
        occurredAt: a.occurredAt,
        repository: a.repo || "",
        repositoryFamily: repoFamily(a.repo),
        prNumber: a.prNumber,
        prTitle: a.prTitle || "",
        prState: a.prState || "",
        governanceState: a.governanceState || "",
        actionType: a.actionType,
        eventType: a.eventType || "",
        role: a.role || "",
        metricType: metricForActivity(a),
        activityType: eventForActivity(a),
        commitSha: a.commitSha || "",
        githubId: a.githubId || "",
        githubUrl: githubLinkForActivity(a),
        labels: a.prLabels.join("|"),
      })),
    [filtered, actor]
  );

  const repoOptions = ["All Repositories", "EIPs", "ERCs", "RIPs", "Unknown", "Other"];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground">
            Activity Timeline
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{rangeLabel}</p>
        </div>
        <button
          onClick={() => downloadCsv(`${actor.replace(/\s+/g, "-").toLowerCase()}-activity-timeline.csv`, csvRows)}
          className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs text-primary hover:bg-primary/15"
        >
          <Download className="h-3.5 w-3.5" />
          Download Reports
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(Object.keys(metricLabels) as MetricType[]).map((metric) => {
          const active = selectedMetrics.includes(metric);
          return (
            <button
              key={metric}
              onClick={() =>
                setSelectedMetrics((prev) =>
                  prev.includes(metric) ? prev.filter((m) => m !== metric) : [...prev, metric]
                )
              }
              className={cn(
                "rounded-lg border px-3 py-2 text-left",
                active
                  ? "border-primary/40 bg-primary/10"
                  : "border-border bg-muted/20"
              )}
            >
              <p className="text-[11px] text-muted-foreground">{metricLabels[metric]}</p>
              <p className="text-base font-semibold text-foreground">{metricCounts[metric]}</p>
            </button>
          );
        })}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Filter by activity type</span>
        <button
          onClick={() => setSelectedEvents(allEventTypes)}
          className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted/60"
        >
          Select All
        </button>
        <button
          onClick={() => setSelectedEvents([])}
          className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted/60"
        >
          Unselect All
        </button>
        <select
          value={repoFilter}
          onChange={(e) => setRepoFilter(e.target.value)}
          className="ml-auto rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground"
        >
          {repoOptions.map((repo) => (
            <option key={repo} value={repo}>{repo}</option>
          ))}
        </select>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {allEventTypes.map((eventType) => {
          const active = selectedEvents.length === 0 || selectedEvents.includes(eventType);
          return (
            <button
              key={eventType}
              onClick={() =>
                setSelectedEvents((prev) =>
                  prev.includes(eventType)
                    ? prev.filter((v) => v !== eventType)
                    : [...prev, eventType]
                )
              }
              className={cn(
                "rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wide",
                active
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground"
              )}
            >
              {eventType}
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        {visibleActivities.map((activity, idx) => {
          const eventType = eventForActivity(activity);
          const link = githubLinkForActivity(activity);
          return (
            <div key={`${activity.occurredAt}-${activity.prNumber}-${idx}`} className="rounded-lg border border-border bg-muted/20 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-primary">{eventType}</span>
                    <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] text-muted-foreground">{repoFamily(activity.repo)}</span>
                    <span className="text-[11px] text-muted-foreground">{new Date(activity.occurredAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    #{activity.prNumber} · {activity.prTitle || "Untitled PR"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {activity.repo || "Unknown repo"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {activity.prState && (
                      <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] text-muted-foreground">{activity.prState}</span>
                    )}
                    {activity.governanceState && (
                      <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">{activity.governanceState}</span>
                    )}
                    {activity.commitSha && (
                      <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">commit {activity.commitSha.slice(0, 7)}</span>
                    )}
                    {activity.prLabels.slice(0, 5).map((label) => (
                      <span key={label} className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">{label}</span>
                    ))}
                  </div>
                </div>
                <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground hover:bg-muted/60">
                  View on GitHub
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
            No activities for current filters.
          </div>
        )}
        {filtered.length > visibleCount && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 10)}
              className="rounded-md border border-border bg-muted/30 px-3 py-1.5 text-xs text-foreground hover:bg-muted/60"
            >
              Show more
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
