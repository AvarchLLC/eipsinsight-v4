"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { client } from "@/lib/orpc";
import { PageHeader, SectionSeparator } from "@/components/header";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCode,
  GitCommit,
  GitPullRequest,
  Loader2,
  Search,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  Draft: "#22d3ee",
  Review: "#60a5fa",
  "Last Call": "#fbbf24",
  Final: "#34d399",
  Living: "#a78bfa",
  Stagnant: "#94a3b8",
  Withdrawn: "#ef4444",
};

interface TimelineData {
  eipNumber: number;
  title: string | null;
  author: string | null;
  currentStatus: string | null;
  type: string | null;
  category: string | null;
  createdAt: string | null;
  repo: string;
  statusEvents: Array<{ from: string | null; to: string; date: string; prNumber: number | null; commitSha: string }>;
  categoryEvents: Array<{ from: string | null; to: string; date: string }>;
  deadlineEvents: Array<{ previous: string | null; newDeadline: string | null; date: string }>;
  linkedPRs: Array<{
    prNumber: number;
    title: string | null;
    author: string | null;
    state: string | null;
    mergedAt: string | null;
    createdAt: string | null;
    commits: number;
    files: number;
    repo: string;
  }>;
}

type UnifiedEvent = {
  date: string;
  type: "created" | "status" | "category" | "deadline" | "pr-opened" | "pr-merged";
  title: string;
  detail: string;
  color: string;
  meta?: string;
  prNumber?: number;
  repoSegment?: "eips" | "ercs" | "rips";
};

function parseDate(input: string | null | undefined): Date | null {
  if (!input) return null;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function formatDateTime(input: string | null | undefined) {
  const d = parseDate(input);
  if (!d) return "—";
  return d.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(input: string | null | undefined) {
  const d = parseDate(input);
  if (!d) return "—";
  return d.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function daysBetween(a: string | null | undefined, b: string | null | undefined) {
  const d1 = parseDate(a);
  const d2 = parseDate(b);
  if (!d1 || !d2) return null;
  return Math.max(0, Math.round((d2.getTime() - d1.getTime()) / 86400000));
}

function normalizeRepoSegment(repo: string | null | undefined): "eips" | "ercs" | "rips" {
  const value = (repo || "").toLowerCase();
  if (value.includes("erc")) return "ercs";
  if (value.includes("rip")) return "rips";
  return "eips";
}

function TimelineContent() {
  const searchParams = useSearchParams();
  const rawRepo = (searchParams.get("repo") || "eips").toLowerCase();
  const initialRepo: "eips" | "ercs" | "rips" =
    rawRepo === "ercs" || rawRepo === "erc" ? "ercs" : rawRepo === "rips" || rawRepo === "rip" ? "rips" : "eips";
  const initialNumber = searchParams.get("number") || searchParams.get("eip") || "";

  const [repo, setRepo] = useState<"eips" | "ercs" | "rips">(initialRepo);
  const [query, setQuery] = useState(initialNumber);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TimelineData | null>(null);

  const handleSearch = useCallback(
    async (num?: number) => {
      const proposalNum = num ?? parseInt(query.replace(/[^0-9]/g, ""), 10);
      if (Number.isNaN(proposalNum)) {
        setError("Enter a valid proposal number.");
        return;
      }

      setError(null);
      setLoading(true);
      try {
        const result = await client.tools.getEIPFullTimeline({ eipNumber: proposalNum });
        if (!result.title && result.statusEvents.length === 0) {
          setError(`No timeline data found for #${proposalNum}.`);
          setData(null);
        } else {
          setData(result);
          const params = new URLSearchParams(window.location.search);
          params.set("repo", repo);
          params.set("number", String(proposalNum));
          window.history.replaceState(null, "", `/timeline?${params.toString()}`);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load timeline data.");
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [query, repo]
  );

  useEffect(() => {
    if (!initialNumber) return;
    const num = parseInt(initialNumber, 10);
    if (!Number.isNaN(num)) void handleSearch(num);
  }, [initialNumber, handleSearch]);

  const repoLabel = repo === "ercs" ? "ERC" : repo === "rips" ? "RIP" : "EIP";

  const timeline = useMemo<UnifiedEvent[]>(() => {
    if (!data) return [];
    const events: UnifiedEvent[] = [];

    if (data.createdAt) {
      events.push({
        date: data.createdAt,
        type: "created",
        title: "Proposal Created",
        detail: `EIP-${data.eipNumber} authored by ${data.author || "Unknown"}`,
        color: "#22d3ee",
      });
    }

    data.statusEvents.forEach((e) => {
      events.push({
        date: e.date,
        type: "status",
        title: e.from ? `Status changed: ${e.from} -> ${e.to}` : `Status set: ${e.to}`,
        detail: e.prNumber ? `Transition tracked via PR #${e.prNumber}` : "Transition tracked via commit history",
        color: STATUS_COLORS[e.to] ?? "#94a3b8",
        meta: e.commitSha ? e.commitSha.slice(0, 8) : undefined,
        prNumber: e.prNumber ?? undefined,
        repoSegment: normalizeRepoSegment(data.repo),
      });
    });

    data.categoryEvents.forEach((e) => {
      events.push({
        date: e.date,
        type: "category",
        title: e.from ? `Category changed: ${e.from} -> ${e.to}` : `Category set: ${e.to}`,
        detail: "Metadata classification updated.",
        color: "#a78bfa",
      });
    });

    data.deadlineEvents.forEach((e) => {
      const from = e.previous ? formatDate(e.previous) : "not set";
      const to = e.newDeadline ? formatDate(e.newDeadline) : "removed";
      events.push({
        date: e.date,
        type: "deadline",
        title: `Deadline update: ${from} -> ${to}`,
        detail: "Governance deadline metadata changed.",
        color: "#fbbf24",
      });
    });

    data.linkedPRs.forEach((pr) => {
      if (pr.createdAt) {
        events.push({
          date: pr.createdAt,
          type: "pr-opened",
          title: `PR #${pr.prNumber} opened`,
          detail: pr.title || "Untitled PR",
          color: "#38bdf8",
          meta: `${pr.commits} commits · ${pr.files} files`,
          prNumber: pr.prNumber,
          repoSegment: normalizeRepoSegment(pr.repo),
        });
      }
      if (pr.mergedAt) {
        events.push({
          date: pr.mergedAt,
          type: "pr-merged",
          title: `PR #${pr.prNumber} merged`,
          detail: pr.title || "Untitled PR",
          color: "#34d399",
          prNumber: pr.prNumber,
          repoSegment: normalizeRepoSegment(pr.repo),
        });
      }
    });

    return events.sort((a, b) => (parseDate(b.date)?.getTime() ?? 0) - (parseDate(a.date)?.getTime() ?? 0));
  }, [data]);

  const summary = useMemo(() => {
    if (!data) return null;
    const firstStatusDate = data.statusEvents[0]?.date ?? null;
    const finalDate = data.statusEvents.find((s) => s.to === "Final")?.date ?? null;
    const timeToFinal = finalDate ? daysBetween(data.createdAt, finalDate) : null;
    const draftToReview = (() => {
      const review = data.statusEvents.find((s) => s.to === "Review")?.date;
      if (!review) return null;
      return daysBetween(data.createdAt, review);
    })();
    const lastCallToFinal = (() => {
      const lastCall = data.statusEvents.find((s) => s.to === "Last Call")?.date;
      if (!lastCall || !finalDate) return null;
      return daysBetween(lastCall, finalDate);
    })();

    const keyMoments = [
      data.createdAt ? `Created on ${formatDate(data.createdAt)}.` : null,
      firstStatusDate ? `First status transition on ${formatDate(firstStatusDate)}.` : null,
      data.statusEvents.find((s) => s.to === "Last Call")?.date
        ? `Entered Last Call on ${formatDate(data.statusEvents.find((s) => s.to === "Last Call")?.date)}.`
        : null,
      finalDate ? `Finalized on ${formatDate(finalDate)}.` : null,
      data.linkedPRs.length > 0 ? `${data.linkedPRs.length} linked PRs recorded in lifecycle data.` : "No linked PRs in current index.",
    ].filter((x): x is string => !!x);

    return {
      timeToFinal,
      draftToReview,
      lastCallToFinal,
      keyMoments,
      totalEvents: timeline.length,
    };
  }, [data, timeline.length]);

  const iconForEvent = (type: UnifiedEvent["type"]) => {
    switch (type) {
      case "created":
        return Calendar;
      case "status":
        return CheckCircle2;
      case "category":
        return Tag;
      case "deadline":
        return Clock;
      case "pr-opened":
        return GitPullRequest;
      case "pr-merged":
        return GitCommit;
      default:
        return FileCode;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        eyebrow="Tools"
        indicator={{ icon: "activity", label: "Timeline", pulse: !!data }}
        title="Status & Commit Timeline"
        description="Trace a proposal's lifecycle across status transitions, metadata updates, and linked pull requests."
        sectionId="proposal-timeline"
      />
      <SectionSeparator />

      <div className="w-full space-y-4 px-4 pb-12 sm:px-6 lg:px-8 xl:px-12">
        <Link href="/tools" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Tools
        </Link>

        <section className="rounded-xl border border-border bg-card/60 p-4">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Search Proposal</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="inline-flex rounded-lg border border-border bg-muted/50 p-1">
              {(["eips", "ercs", "rips"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRepo(r)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    repo === r ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void handleSearch()}
                placeholder={`e.g. ${repo === "eips" ? "1559" : repo === "ercs" ? "20" : "1"}`}
                className="w-full rounded-lg border border-border bg-muted/60 py-2.5 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
            <button
              onClick={() => void handleSearch()}
              disabled={loading || !query.trim()}
              className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/15 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Analyze
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        </section>

        {loading && (
          <div className="flex min-h-[260px] items-center justify-center rounded-xl border border-border bg-card/60">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {data && !loading && (
          <>
            <section className="rounded-xl border border-border bg-card/60 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="dec-title text-2xl font-semibold tracking-tight text-foreground">{repoLabel}-{data.eipNumber}</h2>
                  <p className="mt-1 text-sm text-foreground/90">{data.title ?? "Untitled"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Author: {data.author ?? "Unknown"} · Repo: {data.repo.toUpperCase()}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.currentStatus && (
                    <span
                      className="rounded-full border px-3 py-1 text-xs font-medium"
                      style={{
                        backgroundColor: `${STATUS_COLORS[data.currentStatus] ?? "#94a3b8"}22`,
                        borderColor: `${STATUS_COLORS[data.currentStatus] ?? "#94a3b8"}66`,
                        color: STATUS_COLORS[data.currentStatus] ?? "#94a3b8",
                      }}
                    >
                      {data.currentStatus}
                    </span>
                  )}
                  {data.type && <span className="rounded-md border border-border bg-muted/50 px-2 py-1 text-xs text-muted-foreground">{data.type}</span>}
                  {data.category && <span className="rounded-md border border-border bg-muted/50 px-2 py-1 text-xs text-muted-foreground">{data.category}</span>}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Created</p>
                  <p className="mt-1 text-sm text-foreground">{formatDate(data.createdAt)}</p>
                </div>
                <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status Changes</p>
                  <p className="mt-1 text-sm text-foreground">{data.statusEvents.length}</p>
                </div>
                <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Linked PRs</p>
                  <p className="mt-1 text-sm text-foreground">{data.linkedPRs.length}</p>
                </div>
                <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Timeline Events</p>
                  <p className="mt-1 text-sm text-foreground">{summary?.totalEvents ?? 0}</p>
                </div>
                <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Time To Final</p>
                  <p className="mt-1 text-sm text-foreground">{summary?.timeToFinal != null ? `${summary.timeToFinal}d` : "—"}</p>
                </div>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-border bg-card/60 p-4 lg:col-span-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Lifecycle Notes</p>
                <div className="mt-3 space-y-2">
                  <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
                    <p className="text-xs text-muted-foreground">Draft → Review</p>
                    <p className="text-sm text-foreground">{summary?.draftToReview != null ? `${summary.draftToReview}d` : "—"}</p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
                    <p className="text-xs text-muted-foreground">Last Call → Final</p>
                    <p className="text-sm text-foreground">{summary?.lastCallToFinal != null ? `${summary.lastCallToFinal}d` : "—"}</p>
                  </div>
                </div>
                <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Key Moments</p>
                <div className="mt-2 space-y-1.5">
                  {summary?.keyMoments.map((m, i) => (
                    <p key={i} className="text-xs text-muted-foreground">• {m}</p>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card/60 p-4 lg:col-span-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Descriptive Timeline</p>
                <div className="mt-3 space-y-2">
                  {timeline.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No events recorded.</p>
                  ) : (
                    timeline.map((event, idx) => {
                      const Icon = iconForEvent(event.type);
                      const prev = timeline[idx - 1];
                      const elapsed = prev ? daysBetween(event.date, prev.date) : null;
                      const prHref = event.prNumber ? `/pr/${event.repoSegment ?? normalizeRepoSegment(data.repo)}/${event.prNumber}` : null;
                      return (
                        <div key={`${event.type}-${event.date}-${idx}`} className="rounded-lg border border-border/70 bg-muted/25 p-3">
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-md border" style={{ borderColor: `${event.color}66`, backgroundColor: `${event.color}22` }}>
                              <Icon className="h-4 w-4" style={{ color: event.color }} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium text-foreground">{event.title}</p>
                                {event.prNumber && prHref && (
                                  <Link href={prHref} className="text-xs text-primary hover:underline">
                                    PR #{event.prNumber}
                                  </Link>
                                )}
                              </div>
                              <p className="mt-0.5 text-xs text-muted-foreground">{event.detail}</p>
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                <span className="text-[11px] text-muted-foreground">{formatDateTime(event.date)}</span>
                                {event.meta && (
                                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{event.meta}</span>
                                )}
                                {elapsed != null && idx > 0 && (
                                  <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] text-muted-foreground">+{elapsed}d since previous</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </section>

            {data.linkedPRs.length > 0 && (
              <section className="overflow-hidden rounded-xl border border-border bg-card/60">
                <div className="border-b border-border px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Linked Pull Requests</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/70 bg-muted/30">
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">PR</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Title</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Author</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">State</th>
                        <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Commits</th>
                        <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Files</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.linkedPRs.map((pr) => (
                        <tr key={pr.prNumber} className="border-b border-border/60 last:border-0 hover:bg-muted/20">
                          <td className="px-4 py-3">
                            <div className="inline-flex items-center gap-2">
                              <Link
                                href={`/pr/${normalizeRepoSegment(pr.repo)}/${pr.prNumber}`}
                                className="text-primary hover:underline"
                              >
                                #{pr.prNumber}
                              </Link>
                              <a
                                href={`https://github.com/${pr.repo}/pull/${pr.prNumber}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground"
                                aria-label={`Open PR #${pr.prNumber} on GitHub`}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </td>
                          <td className="max-w-[260px] truncate px-4 py-3 text-foreground/90">{pr.title ?? "—"}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{pr.author ?? "—"}</td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-xs font-medium",
                                pr.mergedAt
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : pr.state === "open"
                                    ? "bg-primary/20 text-primary"
                                    : "bg-muted text-muted-foreground"
                              )}
                            >
                              {pr.mergedAt ? "Merged" : pr.state ?? "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{pr.commits}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{pr.files}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(pr.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}

        {!data && !loading && !error && (
          <div className="rounded-xl border border-border bg-card/50 px-4 py-14 text-center">
            <Clock className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-base text-foreground">Search a proposal number to explore its lifecycle timeline.</p>
            <p className="mt-1 text-sm text-muted-foreground">Includes status transitions, metadata updates, and linked PR chronology.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TimelinePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <TimelineContent />
    </Suspense>
  );
}
