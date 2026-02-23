"use client";

import React, { useState, useEffect, useMemo } from "react";
import { client } from "@/lib/orpc";
import { Loader2, ArrowLeft } from "lucide-react";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from "@/components/ui/chart";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell,
} from "recharts";
import Link from "next/link";
import { cn } from "@/lib/utils";

const GOVERNANCE_COLORS: Record<string, string> = {
  WAITING_ON_EDITOR: "#fbbf24",
  WAITING_ON_AUTHOR: "#60a5fa",
  STALLED: "#ef4444",
  MERGED: "#34d399",
  CLOSED: "#94a3b8",
  DRAFT: "#22d3ee",
};

const FUNNEL_COLORS = ["#22d3ee", "#60a5fa", "#34d399", "#ef4444"];

export default function GovernanceProcessPage() {
  const [loading, setLoading] = useState(true);
  const [repoFilter, setRepoFilter] = useState<"eips" | "ercs" | "rips" | undefined>(undefined);
  const [funnel, setFunnel] = useState({ opened: 0, reviewed: 0, merged: 0, closedUnmerged: 0 });
  const [govStates, setGovStates] = useState<Array<{ state: string; count: number }>>([]);
  const [ttd, setTtd] = useState<Array<{ repo: string; outcome: string; medianDays: number; avgDays: number; count: number }>>([]);
  const [heatmap, setHeatmap] = useState<Array<{ month: string; state: string; count: number }>>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Sequential to avoid connection pool exhaustion
        const f = await client.insights.getPRLifecycleFunnel({ repo: repoFilter });
        setFunnel(f);

        const g = await client.insights.getGovernanceStatesOverTime({ repo: repoFilter });
        setGovStates(g);

        const t = await client.insights.getTimeToDecision({ repo: repoFilter });
        setTtd(t);

        const h = await client.insights.getBottleneckHeatmap({ repo: repoFilter });
        setHeatmap(h);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, [repoFilter]);

  const funnelData = useMemo(() => [
    { stage: "Opened", count: funnel.opened },
    { stage: "Reviewed", count: funnel.reviewed },
    { stage: "Merged", count: funnel.merged },
    { stage: "Closed (unmerged)", count: funnel.closedUnmerged },
  ], [funnel]);

  const heatmapByMonth = useMemo(() => {
    const byMonth: Record<string, Record<string, number>> = {};
    for (const h of heatmap) {
      if (!byMonth[h.month]) byMonth[h.month] = {};
      byMonth[h.month][h.state] = h.count;
    }
    return Object.entries(byMonth)
      .map(([month, states]) => ({ month, ...states }))
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 12);
  }, [heatmap]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="border-b border-slate-200 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/30 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <Link href="/insights" className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-3">
            <ArrowLeft className="h-4 w-4" />Back to Insights
          </Link>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="dec-title bg-linear-to-br from-emerald-600 via-slate-700 to-cyan-600 dark:from-emerald-300 dark:via-slate-100 dark:to-cyan-200 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">Governance & Process Insights</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">How reviews, editors, and PR flow shape outcomes.</p>
            </div>
            <select value={repoFilter ?? "all"} onChange={(e) => setRepoFilter(e.target.value === "all" ? undefined : e.target.value as "eips" | "ercs" | "rips")}
              className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-cyan-500/50">
              <option value="all">All Repos</option>
              <option value="eips">EIPs</option>
              <option value="ercs">ERCs</option>
              <option value="rips">RIPs</option>
            </select>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-cyan-500" /></div>
        ) : (
          <>
            {/* PR Lifecycle Funnel */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/40 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">PR Lifecycle Funnel</h3>
              <ChartContainer config={{ count: { label: "PRs", color: "#22d3ee" } } satisfies ChartConfig} className="h-[300px] w-full">
                <BarChart data={funnelData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis dataKey="stage" type="category" width={140} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} name="PRs">
                    {funnelData.map((_, i) => <Cell key={i} fill={FUNNEL_COLORS[i]} />)}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>

            {/* Governance State Distribution */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/40 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Current Governance States</h3>
              <ChartContainer config={Object.fromEntries(Object.entries(GOVERNANCE_COLORS).map(([k, v]) => [k, { label: k.replace(/_/g, " "), color: v }])) as ChartConfig} className="h-[300px] w-full">
                <BarChart data={govStates}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="state" tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v: string) => v.replace(/_/g, " ")} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Count">
                    {govStates.map((s, i) => <Cell key={i} fill={GOVERNANCE_COLORS[s.state] ?? "#94a3b8"} />)}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>

            {/* Time-to-Decision */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/40 backdrop-blur-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700/50">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Time-to-Decision</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700/50 bg-slate-100 dark:bg-slate-800/20">
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400">Repo</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400">Outcome</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 dark:text-slate-400">Median Days</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 dark:text-slate-400">Avg Days</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 dark:text-slate-400">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ttd.map((r, i) => (
                      <tr key={i} className="border-b border-slate-200 dark:border-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800/30">
                        <td className="px-6 py-3 text-slate-900 dark:text-white font-medium">{r.repo.toUpperCase()}</td>
                        <td className="px-4 py-3"><span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", r.outcome === "merged" ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "bg-slate-500/20 text-slate-700 dark:text-slate-300")}>{r.outcome}</span></td>
                        <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{r.medianDays}d</td>
                        <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{r.avgDays}d</td>
                        <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{r.count.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottleneck Heatmap */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/40 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Bottleneck Heatmap (Recent Months)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700/50">
                      <th className="px-4 py-2 text-left text-slate-600 dark:text-slate-400">Month</th>
                      {["WAITING_ON_EDITOR", "WAITING_ON_AUTHOR", "STALLED", "MERGED", "CLOSED"].map((s) => (
                        <th key={s} className="px-4 py-2 text-center text-slate-600 dark:text-slate-400">{s.replace(/_/g, " ")}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {heatmapByMonth.map((row) => (
                      <tr key={row.month} className="border-b border-slate-200 dark:border-slate-800/50">
                        <td className="px-4 py-2 text-slate-900 dark:text-white font-medium">{row.month}</td>
                        {["WAITING_ON_EDITOR", "WAITING_ON_AUTHOR", "STALLED", "MERGED", "CLOSED"].map((state) => {
                          const val = (row as Record<string, unknown>)[state] as number | undefined ?? 0;
                          const maxVal = 50; // scale
                          const intensity = Math.min(val / maxVal, 1);
                          const color = GOVERNANCE_COLORS[state] ?? "#94a3b8";
                          return (
                            <td key={state} className="px-4 py-2 text-center">
                              <span className="inline-block px-3 py-1 rounded text-xs font-medium" style={{ backgroundColor: `${color}${Math.round(intensity * 60 + 15).toString(16).padStart(2, '0')}`, color: intensity > 0.3 ? 'white' : '#94a3b8' }}>
                                {val}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
