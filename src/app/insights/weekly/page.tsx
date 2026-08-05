"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  FileText,
  GitMerge,
  Loader2,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { client } from "@/lib/orpc";
import { cn } from "@/lib/utils";
import { statusBadgeClass } from "@/lib/proposal-status";
import { CHART_SERIES, CHART_AXIS, CHART_GRID } from "@/lib/chart-colors";
import { InlineBrandLoader } from "@/components/inline-brand-loader";

type WeeklyData = Awaited<ReturnType<typeof client.dashboard.getWeeklyRecap>>;

const RANGE_OPTIONS = [
  { days: 7, label: "7 days" },
  { days: 15, label: "15 days" },
  { days: 30, label: "30 days" },
];

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** A short, human sentence summarising the period from the raw counts. */
function buildNarrative(data: WeeklyData, days: number): string {
  const parts: string[] = [];
  if (data.newProposals.length) parts.push(plural(data.newProposals.length, "new proposal"));
  if (data.statusChanges.length) parts.push(plural(data.statusChanges.length, "status change"));
  if (data.mergedPRs.length) parts.push(`${plural(data.mergedPRs.length, "PR")} merged`);
  if (data.editorActions.length) parts.push(plural(data.editorActions.length, "editor action"));
  if (data.recentCalls.length) parts.push(plural(data.recentCalls.length, "protocol call"));

  if (parts.length === 0) return `A quiet ${days} days — no recorded proposal, PR, or call activity.`;

  const last = parts.pop();
  const list = parts.length ? `${parts.join(", ")} and ${last}` : last;
  return `Over the last ${days} days: ${list}.`;
}

export default function WeeklyStoryPage() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<WeeklyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    client.dashboard
      .getWeeklyRecap({ days })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load the weekly recap.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days]);

  const activity = useMemo(() => {
    if (!data) return [];
    return [
      { label: "New proposals", value: data.newProposals.length },
      { label: "Status changes", value: data.statusChanges.length },
      { label: "PRs merged", value: data.mergedPRs.length },
      { label: "Editor actions", value: data.editorActions.length },
    ];
  }, [data]);

  const hasActivity = activity.some((a) => a.value > 0);

  return (
    <div className="page-shell space-y-8 py-8">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Weekly recap
          </div>
          <h1 className="dec-title persona-title text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            This week in EIPs
          </h1>
          <p className="mt-1.5 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
            {loading || !data
              ? "A short, data-driven story of the latest movement across proposals, pull requests, and protocol calls."
              : buildNarrative(data, days)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card/60 p-1">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              type="button"
              onClick={() => setDays(opt.days)}
              aria-pressed={days === opt.days}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                days === opt.days
                  ? "bg-primary/15 text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="rounded-xl border border-border bg-card/60 py-16">
          <InlineBrandLoader size="sm" label="Assembling this week's story…" />
        </div>
      ) : error || !data ? (
        <div className="rounded-xl border border-border bg-card/60 px-4 py-12 text-center text-sm text-muted-foreground">
          {error ?? "No data."}
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard icon={FileText} accent="text-blue-500" label="New proposals" value={data.newProposals.length} />
            <KpiCard icon={TrendingUp} accent="text-emerald-500" label="Status changes" value={data.statusChanges.length} />
            <KpiCard icon={GitMerge} accent="text-violet-500" label="PRs merged" value={data.mergedPRs.length} />
            <KpiCard icon={ShieldCheck} accent="text-amber-500" label="Editor actions" value={data.editorActions.length} />
          </div>

          {/* Activity chart */}
          {hasActivity && (
            <Section title="Activity at a glance" icon={<TrendingUp className="h-5 w-5 text-primary" />}>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activity} layout="vertical" margin={{ left: 8, right: 32 }}>
                    <CartesianGrid horizontal={false} stroke={CHART_GRID} strokeDasharray="3 3" />
                    <XAxis type="number" stroke={CHART_AXIS} allowDecimals={false} tick={{ fontSize: 12 }} />
                    <YAxis
                      type="category"
                      dataKey="label"
                      stroke={CHART_AXIS}
                      width={110}
                      tick={{ fontSize: 12 }}
                    />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                      {activity.map((_, i) => (
                        <Cell key={i} fill={CHART_SERIES[i % CHART_SERIES.length]} />
                      ))}
                      <LabelList dataKey="value" position="right" className="fill-foreground text-xs" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Section>
          )}

          {/* Status movements */}
          {data.statusChanges.length > 0 && (
            <Section title="Proposals on the move" icon={<TrendingUp className="h-5 w-5 text-emerald-500" />}>
              <ul className="divide-y divide-border/60">
                {data.statusChanges.slice(0, 12).map((sc, i) => (
                  <li key={`${sc.number}-${i}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
                    <Link href={`/eip/${sc.number}`} className="font-mono text-xs font-semibold text-primary hover:underline">
                      EIP-{sc.number}
                    </Link>
                    <span className="hidden max-w-72 truncate text-muted-foreground md:inline">{sc.title}</span>
                    <span className="ml-auto inline-flex items-center gap-1.5">
                      {sc.from && <StatusPill status={sc.from} />}
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      <StatusPill status={sc.to} />
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* New proposals */}
          {data.newProposals.length > 0 && (
            <Section title="Freshly proposed" icon={<FileText className="h-5 w-5 text-blue-500" />}>
              <ul className="divide-y divide-border/60">
                {data.newProposals.slice(0, 10).map((p) => (
                  <li key={p.number} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
                    <Link href={`/eip/${p.number}`} className="font-mono text-xs font-semibold text-primary hover:underline">
                      EIP-{p.number}
                    </Link>
                    <span className="min-w-0 flex-1 truncate text-foreground">{p.title}</span>
                    {p.category && (
                      <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">
                        {p.category}
                      </span>
                    )}
                    <StatusPill status={p.status} />
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Merged PRs */}
          {data.mergedPRs.length > 0 && (
            <Section title="Merged this period" icon={<GitMerge className="h-5 w-5 text-violet-500" />}>
              <ul className="divide-y divide-border/60">
                {data.mergedPRs.slice(0, 10).map((pr, i) => (
                  <li key={`${pr.number}-${i}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
                    <span className="font-mono text-xs font-semibold text-primary">#{pr.number}</span>
                    <span className="min-w-0 flex-1 truncate text-foreground">{pr.title}</span>
                    {pr.author && <span className="text-xs text-muted-foreground">@{pr.author}</span>}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Protocol calls */}
          {(data.recentCalls.length > 0 || data.upcomingCalls.length > 0) && (
            <Section title="Protocol calls" icon={<PhoneCall className="h-5 w-5 text-cyan-500" />}>
              <div className="grid gap-4 sm:grid-cols-2">
                {data.recentCalls.length > 0 && (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Recent</p>
                    <ul className="space-y-1.5">
                      {data.recentCalls.slice(0, 5).map((c) => (
                        <li key={`${c.series}-${c.number}`} className="text-sm">
                          <Link href={`/calls/${c.series}/${c.number}`} className="text-primary hover:underline">
                            {c.displayName}
                          </Link>
                          <span className="ml-2 text-xs text-muted-foreground">{c.occurredOn}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {data.upcomingCalls.length > 0 && (
                  <div>
                    <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <CalendarClock className="h-3.5 w-3.5" />
                      Upcoming
                    </p>
                    <ul className="space-y-1.5">
                      {data.upcomingCalls.slice(0, 5).map((c, i) => (
                        <li key={`${c.series}-${c.callNumber}-${i}`} className="text-sm text-foreground">
                          {c.title || `${c.series} #${c.callNumber}`}
                          {c.occursOn && <span className="ml-2 text-xs text-muted-foreground">{c.occursOn}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function KpiCard({
  icon: Icon,
  accent,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4">
      <Icon className={cn("h-4 w-4", accent)} />
      <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">{value}</p>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string | null | undefined }) {
  if (!status) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
        statusBadgeClass(status, "outline")
      )}
    >
      {status}
    </span>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 inline-flex items-center gap-2">
        {icon}
        <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground">{title}</h2>
      </div>
      <div className="rounded-xl border border-border bg-card/60 px-4 py-3 sm:px-5">{children}</div>
    </section>
  );
}
