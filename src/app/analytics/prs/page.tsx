"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAnalytics, useAnalyticsExport } from "../analytics-layout-client";
import { client } from "@/lib/orpc";
import {
  Loader2,
  GitPullRequest,
  ArrowUpRight,
  AlertCircle,
  Clock,
  Tag,
  Activity,
  Layers,
  BarChart3,
  Users,
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  Legend,
  ReferenceLine,
} from "recharts";
import { cn } from "@/lib/utils";
import { LastUpdated } from "@/components/analytics/LastUpdated";

// ─── Types ────────────────────────────────────────────────────────

interface PRMonthlyPoint {
  month: string;
  created: number;
  merged: number;
  closed: number;
  openAtMonthEnd: number;
}

interface PRMonthHero {
  month: string;
  openPRs: number;
  newPRs: number;
  mergedPRs: number;
  closedUnmerged: number;
  netDelta: number;
}

interface OpenStateSummary {
  totalOpen: number;
  medianAge: number;
  oldestPR: {
    pr_number: number;
    title: string;
    author: string;
    age_days: number;
    repo: string;
  } | null;
}

interface GovernanceState {
  state: string;
  label: string;
  count: number;
}

interface LabelStat {
  label: string;
  count: number;
}

interface LifecycleStage {
  stage: string;
  count: number;
  percentage: number;
}

interface TimeToOutcomeMetric {
  metric: string;
  medianDays: number;
  p75Days: number;
  p90Days: number;
}

interface StalenessBucket {
  bucket: string;
  count: number;
}

interface OpenPRRow {
  prNumber: number;
  repo: string;
  title: string | null;
  author: string | null;
  createdAt: string;
  governanceState: string;
  waitingSince: string | null;
  lastEventType: string | null;
  linkedEIPs: string | null;
}

interface ProcessCategory {
  category: string;
  count: number;
}

interface GovernanceWaitState {
  state: string;
  label: string;
  count: number;
  medianWaitDays: number | null;
  oldestPRNumber: number | null;
  oldestWaitDays: number | null;
}

type TimeRange = "7d" | "30d" | "90d" | "1y" | "this_month" | "all" | "custom";

// ─── Helpers ──────────────────────────────────────────────────────

function getMonthWindow(range: TimeRange): { from?: string; to?: string } {
  const now = new Date();
  const to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  if (range === "all") return { from: undefined, to: undefined };
  const monthsBack = range === "this_month" ? 1 : range === "7d" ? 1 : range === "30d" ? 3 : range === "90d" ? 6 : 12;
  const fromDate = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);
  const from = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, "0")}`;
  return { from, to };
}

function Section({ title, icon, children, action, className, id }: {
  title: string; icon: React.ReactNode; children: React.ReactNode;
  action?: React.ReactNode; className?: string;
  id?: string;
}) {
  return (
    <div className={cn(
      "rounded-2xl border p-5",
      "border-border bg-card/60 shadow-sm",
      className,
    )} id={id}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-primary">{icon}</span>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

const PROCESS_COLORS: Record<string, string> = {
  DRAFT: "#a855f7",
  TYPO: "#64748b",
  NEW_EIP: "#22c55e",
  STATUS_CHANGE: "#60a5fa",
  OTHER: "#94a3b8",
};

const GOVERNANCE_COLORS: Record<string, string> = {
  WAITING_ON_EDITOR: "#60a5fa",
  WAITING_ON_AUTHOR: "#f97316",
  STALLED: "#ef4444",
  DRAFT: "#a855f7",
  NO_STATE: "#64748b",
};

const STALENESS_COLORS: Record<string, string> = {
  "0-7 days": "#22c55e",
  "7-30 days": "#eab308",
  "30-90 days": "#f97316",
  "90+ days": "#ef4444",
};

// ─── Main Page ────────────────────────────────────────────────────

export default function PRsAnalyticsPage() {
  const searchParams = useSearchParams();
  const highlightedPr = Number(searchParams.get("pr") ?? NaN);
  const { timeRange, repoFilter } = useAnalytics();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataUpdatedAt, setDataUpdatedAt] = useState<Date>(new Date());

  const [monthlySeries, setMonthlySeries] = useState<PRMonthlyPoint[]>([]);
  const [heroMonth, setHeroMonth] = useState<PRMonthHero | null>(null);
  const [openSummary, setOpenSummary] = useState<OpenStateSummary | null>(null);
  const [governanceStates, setGovernanceStates] = useState<GovernanceState[]>([]);
  const [labelStats, setLabelStats] = useState<LabelStat[]>([]);
  const [lifecycleStages, setLifecycleStages] = useState<LifecycleStage[]>([]);
  const [timeToOutcome, setTimeToOutcome] = useState<TimeToOutcomeMetric[]>([]);
  const [staleness, setStaleness] = useState<StalenessBucket[]>([]);
  const [openPRs, setOpenPRs] = useState<OpenPRRow[]>([]);
  const [processCategories, setProcessCategories] = useState<ProcessCategory[]>([]);
  const [govWaitStates, setGovWaitStates] = useState<GovernanceWaitState[]>([]);

  const repoParam = repoFilter === "all" ? undefined : repoFilter;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const { from, to } = getMonthWindow(timeRange as TimeRange);
        const now = new Date();

        const [openState, hero] = await Promise.all([
          client.analytics.getPROpenState({ repo: repoParam }),
          client.analytics.getPRMonthHeroKPIs({
            year: now.getFullYear(),
            month: now.getMonth() + 1,
            repo: repoParam,
          }),
        ]);
        setOpenSummary(openState);
        setHeroMonth(hero);

        const [monthly, govStates, labels, lifecycle] = await Promise.all([
          client.analytics.getPRMonthlyActivity({ repo: repoParam, from, to }),
          client.analytics.getPRGovernanceStates({ repo: repoParam }),
          client.analytics.getPRLabels({ repo: repoParam }),
          client.analytics.getPRLifecycleFunnel({}),
        ]);
        setMonthlySeries(monthly);
        setGovernanceStates(govStates);
        setLabelStats(labels.slice(0, 20));
        setLifecycleStages(lifecycle);

        const [tto, stale, procCat, govWait] = await Promise.all([
          client.analytics.getPRTimeToOutcome({ repo: repoParam }),
          client.analytics.getPRStaleness({ repo: repoParam }),
          client.analytics.getPROpenClassification({ repo: repoParam }),
          client.analytics.getPRGovernanceWaitingState({ repo: repoParam }),
        ]);
        setTimeToOutcome(tto);
        setStaleness(stale);
        setProcessCategories(procCat);
        setGovWaitStates(govWait);

        const openExport = await client.analytics.getPROpenExport({ repo: repoParam });
        setOpenPRs(openExport.slice(0, 50));
        setDataUpdatedAt(new Date());
      } catch (err) {
        console.error("Failed to fetch PR analytics:", err);
        setError("Failed to load PR analytics. Please try again.");
        setMonthlySeries([]);
        setHeroMonth(null);
        setOpenSummary(null);
        setGovernanceStates([]);
        setLabelStats([]);
        setLifecycleStages([]);
        setTimeToOutcome([]);
        setStaleness([]);
        setOpenPRs([]);
        setProcessCategories([]);
        setGovWaitStates([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [timeRange, repoFilter, repoParam]);

  // Monthly activity with negative bars for merged/created
  const monthlyChartData = useMemo(() =>
    monthlySeries.map(p => ({
      month: p.month,
      open: p.openAtMonthEnd,
      closed: -p.closed,
      created: p.created,
      merged: -p.merged,
    })),
  [monthlySeries]);

  // Process × Participants cross-tab
  const crossTabData = useMemo(() => {
    if (!processCategories.length || !govWaitStates.length) return [];
    const govTotal = govWaitStates.reduce((a, b) => a + b.count, 0);
    const procTotal = processCategories.reduce((a, b) => a + b.count, 0);
    if (govTotal === 0 || procTotal === 0) return [];
    return processCategories.map(proc => {
      const row: Record<string, number | string> = { process: proc.category };
      const share = proc.count / procTotal;
      govWaitStates.forEach(gov => {
        row[gov.state] = Math.round(gov.count * share);
      });
      return row;
    });
  }, [processCategories, govWaitStates]);

  const totalOpen = openSummary?.totalOpen ?? 0;

  // Export functionality
  useAnalyticsExport(() => {
    const combined: Record<string, unknown>[] = [];
    
    // Monthly activity
    monthlySeries.forEach(m => {
      combined.push({
        type: 'Monthly Activity',
        month: m.month,
        openAtMonthEnd: m.openAtMonthEnd,
        created: m.created,
        merged: m.merged,
        closed: m.closed,
      });
    });
    
    // Governance states
    const govTotal = governanceStates.reduce((acc, s) => acc + s.count, 0);
    governanceStates.forEach(g => {
      combined.push({
        type: 'Governance State',
        state: g.state,
        count: g.count,
        pct: govTotal > 0 ? (g.count / govTotal) * 100 : 0,
      });
    });
    
    // Label stats
    labelStats.forEach(l => {
      combined.push({
        type: 'Label',
        label: l.label,
        count: l.count,
      });
    });
    
    // Lifecycle stages
    lifecycleStages.forEach(lc => {
      combined.push({
        type: 'Lifecycle Stage',
        stage: lc.stage,
        count: lc.count,
      });
    });
    
    return combined;
  }, `prs-analytics-${repoFilter}-${timeRange}`);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ────── Hero KPIs ────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          {
            label: "Open PRs",
            value: totalOpen,
            sub: `Median age: ${openSummary?.medianAge != null ? `${openSummary.medianAge}d` : "–"}`,
            icon: <GitPullRequest className="h-5 w-5" />,
            color: "text-primary",
            iconBg: "bg-primary/10",
          },
          {
            label: `Created (${heroMonth?.month ?? ""})`,
            value: heroMonth?.newPRs ?? 0,
            sub: `Net: ${(heroMonth?.netDelta ?? 0) >= 0 ? "+" : ""}${heroMonth?.netDelta ?? 0}`,
            icon: <Activity className="h-5 w-5" />,
            color: "text-primary",
            iconBg: "bg-primary/10",
          },
          {
            label: "Merged",
            value: heroMonth?.mergedPRs ?? 0,
            sub: "This month across all repos",
            icon: <GitPullRequest className="h-5 w-5" />,
            color: "text-primary",
            iconBg: "bg-primary/10",
          },
          {
            label: "Closed (unmerged)",
            value: heroMonth?.closedUnmerged ?? 0,
            sub: "Closed without merge",
            icon: <AlertCircle className="h-5 w-5" />,
            color: "text-foreground/80",
            iconBg: "bg-muted/60",
          },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-border bg-card/60 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
                <p className={cn("mt-1 text-2xl font-bold tabular-nums", kpi.color)}>
                  {kpi.value.toLocaleString()}
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">{kpi.sub}</p>
              </div>
              <div className={cn("rounded-lg p-2.5", kpi.iconBg)}>
                <span className={kpi.color}>{kpi.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ────── Monthly Activity (negative chart) ────── */}
      <Section title="Monthly PR Throughput" icon={<BarChart3 className="h-4 w-4" />} action={<LastUpdated timestamp={dataUpdatedAt} />}>
        {monthlyChartData.length === 0 ? (
          <p className="text-sm text-muted-foreground">No monthly data available.</p>
        ) : (
          <ChartContainer config={{
            created: { label: "Created", color: "#60a5fa" },
            merged: { label: "Merged", color: "#22c55e" },
            closed: { label: "Closed", color: "#f97316" },
            open: { label: "Open (EOM)", color: "#a855f7" },
          }} className="h-[360px] w-full">
            <ComposedChart data={monthlyChartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/70" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
              <ChartTooltip content={<ChartTooltipContent formatter={(value: unknown, name?: unknown) => {
                const v = typeof value === "number" ? value : Number(value) || 0;
                const abs = Math.abs(v);
                return <span className="text-foreground">{String(name ?? "")}: {abs.toLocaleString()}</span>;
              }} />} />
              <Legend />
              <Bar dataKey="created" name="Created" fill="#60a5fa" fillOpacity={0.7} radius={[4, 4, 0, 0]} stackId="pos" />
              <Bar dataKey="merged" name="Merged" fill="#22c55e" fillOpacity={0.7} radius={[0, 0, 4, 4]} stackId="neg" />
              <Bar dataKey="closed" name="Closed" fill="#f97316" fillOpacity={0.7} radius={[0, 0, 4, 4]} stackId="neg" />
              <Line type="monotone" dataKey="open" name="Open (EOM)" stroke="#a855f7" strokeWidth={2.5} dot={false} />
            </ComposedChart>
          </ChartContainer>
        )}
        <p className="mt-2 text-[10px] text-muted-foreground">
          Bars above zero = created. Bars below zero = merged + closed. Purple line = open PRs at end of month.
        </p>
      </Section>

      {/* ────── Label Distribution + Governance Distribution ────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Label Distribution (Open PRs)" icon={<Tag className="h-4 w-4" />}>
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {labelStats.map((l) => {
              const maxCount = Math.max(...labelStats.map(s => s.count), 1);
              return (
                <div key={l.label} className="flex items-center gap-3">
                  <span className="w-36 truncate text-xs text-foreground/80">{l.label}</span>
                  <div className="flex-1 h-5 rounded bg-muted/60 overflow-hidden">
                    <div
                      className="h-full rounded bg-primary/50 transition-all"
                      style={{ width: `${(l.count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-xs tabular-nums font-medium text-foreground/90">{l.count}</span>
                </div>
              );
            })}
            {labelStats.length === 0 && (
              <p className="text-sm text-muted-foreground">No labels found for open PRs.</p>
            )}
          </div>
        </Section>

        <Section title="Governance State" icon={<Users className="h-4 w-4" />}>
          <div className="space-y-3">
            {governanceStates.map((g) => {
              const total = governanceStates.reduce((acc, s) => acc + s.count, 0);
              const pct = total > 0 ? (g.count / total) * 100 : 0;
              const color = GOVERNANCE_COLORS[g.state] ?? "#64748b";
              return (
                <div key={g.state}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-foreground/80">{g.label}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {g.count.toLocaleString()} ({pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted/60">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                </div>
              );
            })}
            {governanceStates.length === 0 && (
              <p className="text-sm text-muted-foreground">No governance state data.</p>
            )}
          </div>
        </Section>
      </div>

      {/* ────── EIP Open PRs by Process Type ────── */}
      <Section title="Open PRs by Process Type" icon={<Layers className="h-4 w-4" />}>
        {processCategories.length === 0 ? (
          <p className="text-sm text-muted-foreground">No process classification data available.</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <ChartContainer config={{
                count: { label: "Count" },
              }} className="h-[260px] w-full">
                <BarChart data={processCategories} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/70" />
                  <XAxis type="number" stroke="#64748b" fontSize={11} />
                  <YAxis dataKey="category" type="category" stroke="#64748b" width={110} fontSize={11} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {processCategories.map((entry) => (
                      <Cell key={entry.category} fill={PROCESS_COLORS[entry.category] || "#64748b"} fillOpacity={0.7} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>
            <div className="lg:col-span-2 space-y-2">
              <div className="rounded-lg border border-border/30 bg-muted/40 px-4 py-3">
                <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">Total Open PRs</div>
                <div className="text-3xl tabular-nums font-bold text-foreground">
                  {processCategories.reduce((a, b) => a + b.count, 0).toLocaleString()}
                </div>
              </div>
              {processCategories.map(p => {
                const procTotal = processCategories.reduce((a, b) => a + b.count, 0);
                const color = PROCESS_COLORS[p.category] || "#64748b";
                return (
                  <div key={p.category} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted/40 text-xs transition-colors">
                    <span className="h-2 w-2 rounded-sm shrink-0" style={{ background: color }} />
                    <span className="flex-1 text-foreground/80">{p.category}</span>
                    <span className="tabular-nums font-semibold text-foreground/90">{p.count.toLocaleString()}</span>
                    <span className="tabular-nums text-[10px] text-muted-foreground w-10 text-right">{procTotal > 0 ? (p.count / procTotal * 100).toFixed(1) : 0}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Section>

      {/* ────── Process × Participants ────── */}
      <Section title="Process × Participants" icon={<Layers className="h-4 w-4" />}>
        {crossTabData.length === 0 ? (
          <p className="text-sm text-muted-foreground">Not enough data for process × participants breakdown.</p>
        ) : (
          <ChartContainer config={
            Object.fromEntries(govWaitStates.map(g => [g.state, { label: g.label, color: GOVERNANCE_COLORS[g.state] || "#64748b" }]))
          } className="h-[320px] w-full">
            <BarChart data={crossTabData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/70" />
              <XAxis dataKey="process" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              {govWaitStates.map((g) => (
                <Bar key={g.state} dataKey={g.state} name={g.label} stackId="a" fill={GOVERNANCE_COLORS[g.state] || "#64748b"} fillOpacity={0.7} />
              ))}
            </BarChart>
          </ChartContainer>
        )}
        <p className="mt-2 text-[10px] text-muted-foreground">
          X-axis: Process type. Stacked segments: Participant status. Sum of segments = total open PRs for that process type.
        </p>
      </Section>

      {/* ────── Time to Outcome + Staleness ────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Time to Outcome" icon={<Clock className="h-4 w-4" />}>
          <div className="space-y-2.5">
            {timeToOutcome.map((m) => (
              <div key={m.metric} className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/40 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium capitalize text-foreground/90">
                    {m.metric.replace("_", " ")}
                  </span>
                </div>
                <div className="flex gap-4 text-xs tabular-nums text-foreground/80">
                  <span>p50: {m.medianDays}d</span>
                  <span>p75: {m.p75Days}d</span>
                  <span>p90: {m.p90Days}d</span>
                </div>
              </div>
            ))}
            {timeToOutcome.length === 0 && (
              <p className="text-sm text-muted-foreground">Not enough data for time-to-outcome metrics.</p>
            )}
          </div>
        </Section>

        <Section title="Staleness Buckets" icon={<AlertCircle className="h-4 w-4" />}>
          <div className="grid grid-cols-2 gap-3">
            {staleness.map((b) => {
              const maxCount = Math.max(...staleness.map(s => s.count), 1);
              const color = STALENESS_COLORS[b.bucket] ?? "#64748b";
              return (
                <div key={b.bucket} className="rounded-lg border border-border/40 bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">{b.bucket}</p>
                  <p className="mt-1 text-2xl tabular-nums font-bold text-foreground">
                    {b.count.toLocaleString()}
                  </p>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-muted/60">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.min(100, (b.count / maxCount) * 100)}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
            {staleness.length === 0 && (
              <p className="col-span-2 text-sm text-muted-foreground">No open PRs in scope.</p>
            )}
          </div>
        </Section>
      </div>

      {/* ────── Lifecycle Funnel ────── */}
      <Section title="Lifecycle Funnel" icon={<Activity className="h-4 w-4" />}>
        <ChartContainer config={{ count: { label: "PRs", color: "#22c55e" } }} className="h-[260px] w-full">
          <BarChart data={lifecycleStages}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/70" />
            <XAxis dataKey="stage" stroke="#64748b" fontSize={11} />
            <YAxis stroke="#64748b" fontSize={11} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" fill="#22c55e" fillOpacity={0.6} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </Section>

      {/* ────── Open PRs Table ────── */}
      <Section id="open-prs-section" title="Open PRs" icon={<GitPullRequest className="h-4 w-4" />}>
        <p className="mb-3 text-xs text-muted-foreground">
          Snapshot of currently open pull requests in the selected repositories.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 pr-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">PR</th>
                <th className="py-2 pr-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Title</th>
                <th className="py-2 pr-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Repo</th>
                <th className="py-2 pr-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Author</th>
                <th className="py-2 pr-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Governance</th>
                <th className="py-2 pr-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody>
              {openPRs.map((pr) => {
                const [org, repoName] = pr.repo.split("/");
                const url = `https://github.com/${org}/${repoName}/pull/${pr.prNumber}`;
                const repoShort = repoName.toLowerCase();
                return (
                  <tr
                    key={`${pr.repo}-${pr.prNumber}`}
                    className={cn(
                      "border-b border-border/50 transition-colors  hover:bg-muted/40",
                      Number.isFinite(highlightedPr) && pr.prNumber === highlightedPr && "bg-primary/10"
                    )}
                  >
                    <td className="py-2 pr-4">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          href={`/pr/${repoShort}/${pr.prNumber}`}
                          className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                        >
                          #{pr.prNumber}
                        </Link>
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                          title="Open on GitHub"
                        >
                          <ArrowUpRight className="h-3 w-3" />
                        </a>
                      </div>
                    </td>
                    <td className="py-2 pr-4 text-foreground/90 max-w-xs truncate">
                      {pr.title || <span className="text-muted-foreground">No title</span>}
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">{repoName}</td>
                    <td className="py-2 pr-4 text-foreground/80">
                      {pr.author || <span className="text-muted-foreground">Unknown</span>}
                    </td>
                    <td className="py-2 pr-4">
                      <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] uppercase tracking-wide text-foreground/80">
                        {pr.governanceState || "NO_STATE"}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground tabular-nums">{pr.createdAt}</td>
                  </tr>
                );
              })}
              {openPRs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                    No open PRs found for the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {openSummary?.oldestPR && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 text-amber-100">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>
              Oldest open PR:{" "}
              <span className="font-semibold">{openSummary.oldestPR.repo}#{openSummary.oldestPR.pr_number}</span>
              {" "}by {openSummary.oldestPR.author} — open for {openSummary.oldestPR.age_days} days.
            </span>
          </div>
        )}
      </Section>

    </div>
  );
}
