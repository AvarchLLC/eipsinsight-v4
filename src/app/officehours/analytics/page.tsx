"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { BarChart3, Shuffle, Gavel, Users, Activity, CheckCircle2, CalendarRange, type LucideIcon } from "lucide-react";
import { client } from "@/lib/orpc";
import { InlineBrandLoader } from "@/components/inline-brand-loader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const ghAvatar = (handle: string) => `https://github.com/${encodeURIComponent(handle)}.png?size=48`;

function ContributorCell({ handle }: { handle: string }) {
  return (
    <a
      href={`https://github.com/${encodeURIComponent(handle)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 hover:text-primary"
    >
      <Avatar className="h-6 w-6 border border-border/60">
        <AvatarImage src={ghAvatar(handle)} alt={handle} />
        <AvatarFallback className="bg-muted text-[9px] font-semibold uppercase">{handle.slice(0, 2)}</AvatarFallback>
      </Avatar>
      <span className="truncate">{handle}</span>
    </a>
  );
}

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

type Breakdown = Awaited<ReturnType<typeof client.analytics.getEventDayProposalBreakdown>>[number];
type StatusChange = Awaited<ReturnType<typeof client.analytics.getEventDayStatusChanges>>[number];
// Editors and reviewers leaderboards return slightly different shapes; normalize
// to one row so the shared Leaderboard component can render either.
type LeaderRow = { actor: string; reviews: number; prsTouched: number; comments: number };

type RepoKey = "all" | "eips" | "ercs" | "rips";
const REPOS: { key: RepoKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "eips", label: "EIPs" },
  { key: "ercs", label: "ERCs" },
  { key: "rips", label: "RIPs" },
];

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => `${today().slice(0, 7)}-01`;
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const yearStart = () => `${today().slice(0, 4)}-01-01`;

type PresetId = "month" | "30d" | "year" | "all" | "custom";
const PRESETS: { id: PresetId; label: string; range: () => { from: string; to: string } }[] = [
  { id: "month", label: "This month", range: () => ({ from: monthStart(), to: today() }) },
  { id: "30d", label: "Last 30 days", range: () => ({ from: daysAgo(30), to: today() }) },
  { id: "year", label: "This year", range: () => ({ from: yearStart(), to: today() }) },
  { id: "all", label: "All time", range: () => ({ from: "2015-01-01", to: today() }) },
];

function urlParam(k: string): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(k);
}

function writeUrl(next: Record<string, string | null>) {
  if (typeof window === "undefined") return;
  const p = new URLSearchParams(window.location.search);
  for (const [k, v] of Object.entries(next)) {
    if (v == null || v === "") p.delete(k);
    else p.set(k, v);
  }
  window.history.replaceState(null, "", `${window.location.pathname}?${p.toString()}`);
}

const nf = (n: number) => n.toLocaleString("en-US");

/** KPI tile. */
function Kpi({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className={cn("h-3.5 w-3.5", tone ?? "text-primary")} /> {label}
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums text-foreground">{value}</div>
    </div>
  );
}

/** Horizontal leaderboard bar chart + compact table. */
function Leaderboard({
  title,
  icon: Icon,
  tone,
  rows,
  color,
  showComments = true,
}: {
  title: string;
  icon: LucideIcon;
  tone: string;
  rows: LeaderRow[];
  color: string;
  showComments?: boolean;
}) {
  const top = rows.slice(0, 12);
  const option = useMemo(() => {
    const data = [...top].reverse();
    return {
      backgroundColor: "transparent",
      grid: { top: 8, right: 24, bottom: 8, left: 8, containLabel: true },
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      xAxis: { type: "value", axisLabel: { fontSize: 10 }, splitLine: { lineStyle: { type: "dashed", opacity: 0.4 } } },
      yAxis: { type: "category", data: data.map((r) => r.actor), axisLabel: { fontSize: 11 } },
      series: [
        {
          type: "bar",
          barWidth: "60%",
          data: data.map((r) => r.reviews),
          itemStyle: { color, borderRadius: [0, 4, 4, 0] },
          label: { show: true, position: "right", fontSize: 10, color: "inherit", formatter: (p: { value: number }) => nf(p.value) },
        },
      ],
    };
  }, [top, color]);

  return (
    <section className="rounded-xl border border-border bg-card/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Icon className={cn("h-4 w-4", tone)} /> {title}
        </div>
        <span className="text-xs text-muted-foreground">{rows.length} active</span>
      </div>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No activity in this window.</p>
      ) : (
        <>
          <div className="h-[280px] w-full">
            <ReactECharts option={option} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} notMerge />
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-1.5 pr-2 font-medium">#</th>
                  <th className="py-1.5 pr-2 font-medium">Contributor</th>
                  <th className="py-1.5 pr-2 text-right font-medium">Reviews</th>
                  <th className={cn("py-1.5 text-right font-medium", showComments && "pr-2")}>PRs</th>
                  {showComments && <th className="py-1.5 text-right font-medium">Comments</th>}
                </tr>
              </thead>
              <tbody>
                {top.map((r, i) => (
                  <tr key={r.actor} className="border-b border-border/50">
                    <td className="py-1.5 pr-2 tabular-nums text-muted-foreground">{i + 1}</td>
                    <td className="py-1.5 pr-2 font-medium text-foreground"><ContributorCell handle={r.actor} /></td>
                    <td className="py-1.5 pr-2 text-right tabular-nums text-foreground">{nf(r.reviews)}</td>
                    <td className={cn("py-1.5 text-right tabular-nums text-muted-foreground", showComments && "pr-2")}>{nf(r.prsTouched)}</td>
                    {showComments && <td className="py-1.5 text-right tabular-nums text-muted-foreground">{nf(r.comments)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

export default function OfficeHoursAnalyticsTab() {
  // ── Window + repo, synced to the hub's URL params ──────────────────────────
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [repo, setRepo] = useState<RepoKey>("all");
  const [preset, setPreset] = useState<PresetId>("month");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const mode = urlParam("mode");
    const uFrom = urlParam("from");
    const uTo = urlParam("to");
    const uRepo = urlParam("repo") as RepoKey | null;
    if (mode === "day") {
      const d = urlParam("day") || today();
      setFrom(d); setTo(d); setPreset("custom");
    } else if (uFrom || uTo) {
      setFrom(uFrom || monthStart()); setTo(uTo || today()); setPreset("custom");
    }
    if (uRepo && REPOS.some((r) => r.key === uRepo)) setRepo(uRepo);
    setHydrated(true);
  }, []);

  const applyPreset = useCallback((id: PresetId) => {
    setPreset(id);
    if (id === "custom") return;
    const r = PRESETS.find((p) => p.id === id)!.range();
    setFrom(r.from); setTo(r.to);
    writeUrl({ mode: "range", from: r.from, to: r.to, day: null });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeUrl({ repo: repo === "all" ? null : repo });
  }, [repo, hydrated]);

  // ── Data ───────────────────────────────────────────────────────────────────
  const [editors, setEditors] = useState<LeaderRow[] | null>(null);
  const [reviewers, setReviewers] = useState<LeaderRow[]>([]);
  const [breakdown, setBreakdown] = useState<Breakdown[]>([]);
  const [statusChanges, setStatusChanges] = useState<StatusChange[]>([]);
  const [categories, setCategories] = useState<{ category: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const repoArg = repo === "all" ? undefined : repo;
    Promise.all([
      client.analytics.getEditorsLeaderboard({ from, to, repo: repoArg, limit: 30 }).catch(() => []),
      client.analytics.getReviewersLeaderboard({ from, to, repo: repoArg, limit: 30 }).catch(() => []),
      client.analytics.getEventDayProposalBreakdown({ date: from, to }).catch(() => [] as Breakdown[]),
      client.analytics.getEventDayStatusChanges({ date: from, to }).catch(() => [] as StatusChange[]),
      client.analytics.getPROpenClassification({ repo: repoArg, month: to.slice(0, 7) }).catch(() => [] as { category: string; count: number }[]),
    ]).then(([e, rv, b, s, c]) => {
      if (!alive) return;
      setEditors(e.map((r) => ({ actor: r.actor, reviews: r.reviews, prsTouched: r.prsTouched, comments: r.comments })));
      setReviewers(rv.map((r) => ({ actor: r.actor, reviews: r.totalReviews, prsTouched: r.prsTouched, comments: 0 })));
      setBreakdown(b); setStatusChanges(s);
      setCategories(c.map((x) => ({ category: x.category, count: Number(x.count) })));
      setLoading(false);
    });
    return () => { alive = false; };
  }, [from, to, repo]);

  const kpis = useMemo(() => {
    const eds = editors ?? [];
    const totalReviews = eds.reduce((a, r) => a + r.reviews, 0) + reviewers.reduce((a, r) => a + r.reviews, 0);
    const prs = new Set<number>();
    const prsTouched = eds.reduce((a, r) => a + r.prsTouched, 0);
    void prs;
    return {
      editors: eds.length,
      reviewers: reviewers.length,
      reviews: totalReviews,
      prsTouched,
      statusChanges: statusChanges.reduce((a, s) => a + s.count, 0),
    };
  }, [editors, reviewers, statusChanges]);

  const statusOption = useMemo(() => {
    const byStatus = new Map<string, number>();
    breakdown.forEach((r) => byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + r.prsChecked));
    const data = [...byStatus.entries()].sort((a, b) => b[1] - a[1]);
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      grid: { top: 16, right: 16, bottom: 24, left: 8, containLabel: true },
      xAxis: { type: "category", data: data.map((d) => d[0]), axisLabel: { fontSize: 11 } },
      yAxis: { type: "value" },
      series: [{ type: "bar", barWidth: "50%", data: data.map((d) => d[1]), itemStyle: { color: "#6366f1", borderRadius: [4, 4, 0, 0] } }],
    };
  }, [breakdown]);

  const categoryOption = useMemo(() => {
    const data = [...categories].sort((a, b) => a.count - b.count);
    const palette = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      grid: { top: 8, right: 28, bottom: 8, left: 8, containLabel: true },
      xAxis: { type: "value", axisLabel: { fontSize: 10 }, splitLine: { lineStyle: { type: "dashed", opacity: 0.4 } } },
      yAxis: { type: "category", data: data.map((d) => d.category), axisLabel: { fontSize: 11 } },
      series: [{
        type: "bar",
        barWidth: "62%",
        data: data.map((d, i) => ({ value: d.count, itemStyle: { color: palette[i % palette.length], borderRadius: [0, 4, 4, 0] } })),
        label: { show: true, position: "right", fontSize: 10, formatter: (p: { value: number }) => nf(p.value) },
      }],
    };
  }, [categories]);

  const totalOpen = useMemo(() => categories.reduce((a, c) => a + c.count, 0), [categories]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/40 p-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <CalendarRange className="h-3.5 w-3.5" /> Range
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p.id)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs transition-colors",
                preset === p.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => { setFrom(e.target.value); setPreset("custom"); writeUrl({ mode: "range", from: e.target.value, day: null }); }}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
          />
          <span className="text-xs text-muted-foreground">→</span>
          <input
            type="date"
            value={to}
            min={from}
            max={today()}
            onChange={(e) => { setTo(e.target.value); setPreset("custom"); writeUrl({ mode: "range", to: e.target.value, day: null }); }}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
          />
        </div>
        <div className="ml-auto flex items-center gap-1">
          {REPOS.map((r) => (
            <button
              key={r.key}
              onClick={() => setRepo(r.key)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs transition-colors",
                repo === r.key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {editors === null ? (
        <div className="py-16"><InlineBrandLoader size="md" label="Loading analytics…" /></div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Kpi icon={Gavel} label="Editors active" value={nf(kpis.editors)} tone="text-primary" />
            <Kpi icon={Users} label="Reviewers active" value={nf(kpis.reviewers)} tone="text-sky-500" />
            <Kpi icon={Activity} label="Reviews" value={nf(kpis.reviews)} tone="text-emerald-500" />
            <Kpi icon={CheckCircle2} label="PRs touched" value={nf(kpis.prsTouched)} tone="text-violet-500" />
            <Kpi icon={Shuffle} label="Status changes" value={nf(kpis.statusChanges)} tone="text-amber-500" />
          </div>

          <p className="text-xs text-muted-foreground">
            Editorial activity from <strong className="text-foreground">{from}</strong> to <strong className="text-foreground">{to}</strong>
            {repo !== "all" && <> · <strong className="text-foreground uppercase">{repo}</strong></>}
            {loading && <span className="ml-2 animate-pulse">updating…</span>}
          </p>

          {/* Leaderboards */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Leaderboard title="Editor leaderboard" icon={Gavel} tone="text-primary" rows={editors} color="#6366f1" />
            <Leaderboard title="Reviewer leaderboard" icon={Users} tone="text-sky-500" rows={reviewers} color="#0ea5e9" showComments={false} />
          </div>

          {/* Open-PR editorial backlog by category (like /analytics/prs category breakdown) */}
          <section className="rounded-xl border border-border bg-card/60 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <BarChart3 className="h-4 w-4 text-emerald-500" /> Open PRs by category
                <span className="text-xs font-normal text-muted-foreground">editorial backlog{repo !== "all" && <> · {repo.toUpperCase()}</>}</span>
              </div>
              <span className="text-xs text-muted-foreground">{nf(totalOpen)} open</span>
            </div>
            {categories.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No open PRs to classify.</p>
            ) : (
              <div className="h-[280px] w-full"><ReactECharts option={categoryOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} notMerge /></div>
            )}
          </section>

          {/* Status breakdown + changes */}
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-border bg-card/60 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                <BarChart3 className="h-4 w-4 text-primary" /> Proposals by status
              </div>
              {breakdown.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No proposal activity in this window.</p>
              ) : (
                <div className="h-[300px] w-full"><ReactECharts option={statusOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} notMerge /></div>
              )}
            </section>

            <section className="rounded-xl border border-border bg-card/60 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                <Shuffle className="h-4 w-4 text-amber-500" /> Status changes ({statusChanges.length})
              </div>
              {statusChanges.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No status changes in this window.</p>
              ) : (
                <ul className="grid max-h-[300px] gap-1.5 overflow-y-auto sm:grid-cols-1">
                  {statusChanges.slice(0, 60).map((s, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-1.5 text-sm">
                      <span className="shrink-0 text-xs text-muted-foreground">{s.fromStatus ?? "—"} → {s.toStatus}</span>
                      <span className="truncate text-right text-foreground">{s.label} <span className="text-muted-foreground">×{s.count}</span></span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
