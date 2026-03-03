"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileEdit,
  GitPullRequest,
  Loader2,
  Search,
  Tag,
  Workflow,
} from "lucide-react";
import { client } from "@/lib/orpc";
import { PageHeader, SectionSeparator } from "@/components/header";
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

type TimelineData = {
  eipNumber: number;
  title: string | null;
  author: string | null;
  createdAt: string | null;
  currentStatus: string | null;
  currentType: string | null;
  currentCategory: string | null;
  deadline: string | null;
  lastUpdated: string | null;
  statusEvents: Array<{ from: string | null; to: string; date: string; prNumber: number | null }>;
  categoryEvents: Array<{ from: string | null; to: string; date: string }>;
  typeEvents: Array<{ from: string | null; to: string; date: string }>;
  deadlineEvents: Array<{ previous: string | null; newDeadline: string | null; date: string }>;
  upgrades: Array<{ slug: string; name: string; bucket: string | null }>;
  linkedPRs: Array<{
    prNumber: number;
    title: string | null;
    author: string | null;
    state: string | null;
    mergedAt: string | null;
    comments: number;
    reviews: number;
    commits: number;
    files: number;
    participants: number;
    createdAt: string | null;
    repositoryName: string | null;
    classification: string;
  }>;
};

function fmtDate(iso: string | null | undefined, withTime = false) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  if (withTime) {
    return d.toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }
  return d.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function daysBetween(start: string | null | undefined, end: string | null | undefined) {
  if (!start || !end) return null;
  const a = new Date(start);
  const b = new Date(end);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000));
}

export default function EditorialCommentaryPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineData | null>(null);

  const handleSearch = async () => {
    const num = parseInt(query.replace(/[^0-9]/g, ""), 10);
    if (Number.isNaN(num)) {
      setError("Enter a valid EIP number (e.g. 1559 or EIP-1559).");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await client.insights.getEIPTimeline({ eipNumber: num });
      if (!result.title && result.statusEvents.length === 0 && result.linkedPRs.length === 0) {
        setTimeline(null);
        setError(`No indexed lifecycle data found for EIP-${num}.`);
      } else {
        setTimeline(result as TimelineData);
      }
    } catch (e) {
      console.error(e);
      setTimeline(null);
      setError("Failed to load EIP lifecycle data.");
    } finally {
      setLoading(false);
    }
  };

  const lifecycle = useMemo(() => {
    if (!timeline) return null;

    const statusEvents = [...timeline.statusEvents].sort((a, b) => a.date.localeCompare(b.date));
    const toFinal = statusEvents.find((e) => e.to === "Final");
    const nowIso = new Date().toISOString();

    const stageDays: Record<string, number> = {};
    for (let i = 0; i < statusEvents.length; i++) {
      const current = statusEvents[i];
      const next = statusEvents[i + 1];
      const start = current.date;
      const end = next?.date ?? timeline.lastUpdated ?? nowIso;
      const d = daysBetween(start, end);
      if (d != null) stageDays[current.to] = (stageDays[current.to] ?? 0) + d;
    }

    const firstStatus = statusEvents[0];
    if (timeline.createdAt && firstStatus?.from) {
      const pre = daysBetween(timeline.createdAt, firstStatus.date);
      if (pre != null) stageDays[firstStatus.from] = (stageDays[firstStatus.from] ?? 0) + pre;
    }

    const transitions = statusEvents.length;
    let reversions = 0;
    for (let i = 1; i < statusEvents.length; i++) {
      if (statusEvents[i].to === statusEvents[i - 1].from) reversions += 1;
    }
    const churnScore = transitions + reversions * 2 + timeline.deadlineEvents.length + timeline.categoryEvents.length + timeline.typeEvents.length;
    const stability =
      churnScore <= 6
        ? "Stable"
        : churnScore <= 12
          ? "Moderate churn"
          : "High churn";

    const keyMoments: Array<{ label: string; date: string | null }> = [];
    if (timeline.createdAt) keyMoments.push({ label: "Proposal created", date: timeline.createdAt });
    if (timeline.linkedPRs[0]?.createdAt) keyMoments.push({ label: `First linked PR #${timeline.linkedPRs[0].prNumber}`, date: timeline.linkedPRs[0].createdAt });
    if (statusEvents[0]) keyMoments.push({ label: `First status transition (${statusEvents[0].to})`, date: statusEvents[0].date });
    const lastCall = statusEvents.find((e) => e.to === "Last Call");
    if (lastCall) keyMoments.push({ label: "Entered Last Call", date: lastCall.date });
    if (toFinal) keyMoments.push({ label: "Finalized", date: toFinal.date });
    if (timeline.upgrades[0]) keyMoments.push({ label: `Included in ${timeline.upgrades[0].name}`, date: null });

    return {
      timeToFinalDays: daysBetween(timeline.createdAt, toFinal?.date) ?? null,
      draftDays: stageDays.Draft ?? 0,
      reviewDays: stageDays.Review ?? 0,
      lastCallDays: stageDays["Last Call"] ?? 0,
      statusTransitions: transitions,
      totalPRs: timeline.linkedPRs.length,
      stability,
      keyMoments,
      stageDays,
    };
  }, [timeline]);

  const unifiedTimeline = useMemo(() => {
    if (!timeline) return [];
    const events: Array<{
      date: string;
      kind: "created" | "status" | "category" | "type" | "deadline" | "pr";
      label: string;
      color: string;
      prNumber?: number;
    }> = [];

    if (timeline.createdAt) {
      events.push({ date: timeline.createdAt, kind: "created", label: "Proposal created", color: "#22d3ee" });
    }
    timeline.statusEvents.forEach((e) => {
      events.push({
        date: e.date,
        kind: "status",
        label: e.from ? `${e.from} -> ${e.to}` : `Set to ${e.to}`,
        color: STATUS_COLORS[e.to] ?? "#94a3b8",
        prNumber: e.prNumber ?? undefined,
      });
    });
    timeline.categoryEvents.forEach((e) => {
      events.push({
        date: e.date,
        kind: "category",
        label: e.from ? `Category: ${e.from} -> ${e.to}` : `Category set: ${e.to}`,
        color: "#a78bfa",
      });
    });
    timeline.typeEvents.forEach((e) => {
      events.push({
        date: e.date,
        kind: "type",
        label: e.from ? `Type: ${e.from} -> ${e.to}` : `Type set: ${e.to}`,
        color: "#38bdf8",
      });
    });
    timeline.deadlineEvents.forEach((e) => {
      events.push({
        date: e.date,
        kind: "deadline",
        label: `Deadline ${e.previous ? `${fmtDate(e.previous)} -> ` : ""}${e.newDeadline ? fmtDate(e.newDeadline) : "removed"}`,
        color: "#fbbf24",
      });
    });
    timeline.linkedPRs
      .filter((p) => p.mergedAt)
      .forEach((p) => {
        events.push({
          date: p.mergedAt!,
          kind: "pr",
          label: `PR #${p.prNumber} merged (${p.classification})`,
          color: "#34d399",
          prNumber: p.prNumber,
        });
      });

    return events.sort((a, b) => a.date.localeCompare(b.date));
  }, [timeline]);

  const maxStageDays = useMemo(() => {
    if (!lifecycle) return 1;
    return Math.max(1, lifecycle.draftDays, lifecycle.reviewDays, lifecycle.lastCallDays);
  }, [lifecycle]);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        eyebrow="Insights"
        indicator={{ icon: "sparkles", label: "Editorial", pulse: !!timeline }}
        title="Editorial Commentary"
        description="Lifecycle intelligence report for a protocol proposal: stage durations, governance churn, and PR impact."
        sectionId="editorial-commentary"
      />
      <SectionSeparator />

      <div className="w-full space-y-5 px-4 pb-12 sm:px-6 lg:px-8 xl:px-12">
        <div className="flex items-center justify-between">
          <Link href="/insights" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Insights
          </Link>
        </div>

        <section className="rounded-xl border border-border/60 bg-card/60 p-4">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Find Proposal</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="e.g. 1559, EIP-4844, 20"
                className="h-10 w-full rounded-lg border border-border bg-muted/60 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <button
              type="button"
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 text-sm font-medium text-primary hover:bg-primary/15 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Analyze
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        </section>

        {loading && (
          <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-border/60 bg-card/60">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        )}

        {timeline && !loading && lifecycle && (
          <>
            <section className="rounded-xl border border-border/60 bg-card/60 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="dec-title persona-title text-2xl font-semibold tracking-tight text-foreground">
                    EIP-{timeline.eipNumber}
                  </h2>
                  <p className="mt-1 text-base text-foreground/90">{timeline.title ?? "Untitled"}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Author: {timeline.author ?? "Unknown"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {timeline.currentStatus && (
                    <span className="rounded-full border px-3 py-1 text-xs font-medium" style={{ borderColor: `${STATUS_COLORS[timeline.currentStatus] ?? "#94a3b8"}66`, color: STATUS_COLORS[timeline.currentStatus] ?? "#94a3b8", backgroundColor: `${STATUS_COLORS[timeline.currentStatus] ?? "#94a3b8"}22` }}>
                      {timeline.currentStatus}
                    </span>
                  )}
                  {timeline.currentType && <span className="rounded-md border border-border bg-muted/60 px-2 py-1 text-xs text-muted-foreground">{timeline.currentType}</span>}
                  {timeline.currentCategory && <span className="rounded-md border border-border bg-muted/60 px-2 py-1 text-xs text-muted-foreground">{timeline.currentCategory}</span>}
                  <span className={cn("rounded-md border px-2 py-1 text-xs", lifecycle.stability === "High churn" ? "border-red-500/40 bg-red-500/10 text-red-300" : lifecycle.stability === "Moderate churn" ? "border-amber-500/40 bg-amber-500/10 text-amber-300" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300")}>
                    {lifecycle.stability}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                {[
                  { label: "Time to Final", value: lifecycle.timeToFinalDays != null ? `${lifecycle.timeToFinalDays}d` : "—" },
                  { label: "Draft Duration", value: `${lifecycle.draftDays}d` },
                  { label: "Review Duration", value: `${lifecycle.reviewDays}d` },
                  { label: "Last Call Duration", value: `${lifecycle.lastCallDays}d` },
                  { label: "Total PRs", value: String(lifecycle.totalPRs) },
                  { label: "Status Transitions", value: String(lifecycle.statusTransitions) },
                ].map((m) => (
                  <div key={m.label} className="rounded-lg border border-border/60 bg-muted/40 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{m.label}</p>
                    <p className="mt-1 text-xl font-semibold text-foreground">{m.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stage Duration Distribution</p>
                  <div className="mt-3 space-y-2">
                    {[
                      { name: "Draft", days: lifecycle.draftDays, color: "#22d3ee" },
                      { name: "Review", days: lifecycle.reviewDays, color: "#60a5fa" },
                      { name: "Last Call", days: lifecycle.lastCallDays, color: "#fbbf24" },
                    ].map((s) => (
                      <div key={s.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{s.name}</span>
                          <span className="tabular-nums text-foreground">{s.days}d</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted">
                          <div className="h-2 rounded-full" style={{ width: `${Math.max(6, Math.round((s.days / maxStageDays) * 100))}%`, backgroundColor: s.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Upgrade Context</p>
                  <div className="mt-2.5 space-y-2">
                    {timeline.upgrades.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No upgrade inclusion found.</p>
                    ) : timeline.upgrades.map((u) => (
                      <Link key={`${u.slug}-${u.bucket ?? "none"}`} href={`/upgrade/${u.slug}`} className="flex items-center justify-between rounded-md border border-border/60 bg-card/50 px-3 py-2 text-sm hover:border-primary/40 hover:bg-primary/5">
                        <span className="truncate text-foreground">{u.name}</span>
                        <span className="ml-3 shrink-0 text-xs text-muted-foreground">{u.bucket ?? "core"}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-5">
              <div className="xl:col-span-3 rounded-xl border border-border/60 bg-card/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lifecycle Timeline</p>
                <div className="mt-3 space-y-3">
                  {unifiedTimeline.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No timeline events available.</p>
                  ) : unifiedTimeline.map((event, i) => {
                    const prev = unifiedTimeline[i - 1];
                    const delta = prev ? daysBetween(prev.date, event.date) : null;
                    const Icon =
                      event.kind === "status"
                        ? CheckCircle2
                        : event.kind === "pr"
                          ? GitPullRequest
                          : event.kind === "category"
                            ? Tag
                            : event.kind === "type"
                              ? Workflow
                              : event.kind === "deadline"
                                ? Clock3
                                : CalendarClock;
                    return (
                      <div key={`${event.kind}-${event.date}-${i}`} className="rounded-lg border border-border/60 bg-muted/30 p-3">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 rounded-md border p-1.5" style={{ borderColor: `${event.color}66`, backgroundColor: `${event.color}22` }}>
                            <Icon className="h-4 w-4" style={{ color: event.color }} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <p className="text-sm font-medium text-foreground">{event.label}</p>
                              {event.prNumber && (
                                <Link href={`/pr/eips/${event.prNumber}`} className="text-xs text-primary hover:underline">PR #{event.prNumber}</Link>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">{fmtDate(event.date, true)}</p>
                          </div>
                          {delta != null && i > 0 && (
                            <span className="shrink-0 rounded-full border border-border bg-card px-2 py-0.5 text-[11px] text-muted-foreground">
                              +{delta}d
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="xl:col-span-2 rounded-xl border border-border/60 bg-card/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Key Moments</p>
                <div className="mt-3 space-y-2">
                  {lifecycle.keyMoments.map((k, i) => (
                    <div key={`${k.label}-${i}`} className="rounded-md border border-border/60 bg-muted/30 px-3 py-2">
                      <p className="text-sm text-foreground">{k.label}</p>
                      <p className="text-xs text-muted-foreground">{k.date ? fmtDate(k.date, true) : "Derived from current upgrade composition"}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-border/60 bg-card/60">
              <div className="border-b border-border px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">PR Intelligence</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">PR</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Classification</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Title</th>
                      <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Commits</th>
                      <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Files</th>
                      <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Comments</th>
                      <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Reviews</th>
                      <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Participants</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Merged</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeline.linkedPRs.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-sm text-muted-foreground">No linked PRs found.</td>
                      </tr>
                    ) : timeline.linkedPRs.map((pr) => {
                      const repoPath = pr.repositoryName ?? "ethereum/EIPs";
                      const repoKey = repoPath.toLowerCase().includes("erc") ? "ercs" : repoPath.toLowerCase().includes("rip") ? "rips" : "eips";
                      const stateLabel = pr.mergedAt ? "Merged" : pr.state ?? "—";
                      return (
                        <tr key={pr.prNumber} className="border-b border-border/60 last:border-0 hover:bg-muted/20">
                          <td className="px-3 py-2 text-primary">
                            <Link href={`/pr/${repoKey}/${pr.prNumber}`} className="hover:underline">#{pr.prNumber}</Link>
                          </td>
                          <td className="px-3 py-2">
                            <span className={cn("rounded-full border px-2 py-0.5 text-xs", pr.classification === "Status Transition PR" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : pr.classification === "Editorial" ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300" : "border-amber-500/40 bg-amber-500/10 text-amber-300")}>
                              {pr.classification}
                            </span>
                          </td>
                          <td className="max-w-[360px] truncate px-3 py-2 text-foreground/90">{pr.title ?? "—"}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{pr.commits}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{pr.files}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{pr.comments}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{pr.reviews}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{pr.participants}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">
                            <span className={cn("mr-2 inline-flex rounded-full border px-1.5 py-0.5", stateLabel === "Merged" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-border bg-muted/40 text-muted-foreground")}>
                              {stateLabel}
                            </span>
                            {fmtDate(pr.mergedAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {!timeline && !loading && !error && (
          <div className="rounded-xl border border-border/60 bg-card/40 px-4 py-12 text-center">
            <FileEdit className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-base text-foreground">Search an EIP to generate its lifecycle intelligence report.</p>
            <p className="mt-1 text-sm text-muted-foreground">Try EIP-1559, EIP-4844, or ERC-20.</p>
          </div>
        )}
      </div>
    </div>
  );
}
