"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { client } from "@/lib/orpc";
import {
  Loader2, ArrowLeft, TrendingUp, TrendingDown, Minus,
  ExternalLink,
} from "lucide-react";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from "@/components/ui/chart";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import Link from "next/link";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  Draft: "#22d3ee", Review: "#60a5fa", "Last Call": "#fbbf24",
  Final: "#34d399", Living: "#a78bfa", Stagnant: "#94a3b8", Withdrawn: "#ef4444",
};

function YearMonthContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const month = searchParams.get("month") || defaultMonth;
  const repo = (searchParams.get("repo") as "eips" | "ercs" | "rips" | undefined) || undefined;

  const [loading, setLoading] = useState(true);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [snapshot, setSnapshot] = useState<Array<{ status: string; repo: string; count: number; delta: number }>>([]);
  const [statusFlow, setStatusFlow] = useState<Array<{ month: string; status: string; count: number }>>([]);
  const [deadlineVol, setDeadlineVol] = useState<Array<{ month: string; changes: number }>>([]);
  const [editors, setEditors] = useState<Array<{ editor: string; reviews: number; prsTouched: number; comments: number }>>([]);
  const [openPRs, setOpenPRs] = useState<Array<{ prNumber: number; title: string | null; author: string | null; governanceState: string | null; daysWaiting: number; repo: string }>>([]);

  useEffect(() => {
    client.insights.getAvailableMonths().then(setAvailableMonths).catch(console.error);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Load sequentially to avoid connection pool exhaustion
        const snap = await client.insights.getMonthlyStatusSnapshot({ month, repo });
        setSnapshot(snap);

        const eds = await client.insights.getEditorsLeaderboard({ month, repo });
        setEditors(eds);

        const prs = await client.insights.getOpenPRs({ month, repo, limit: 20 });
        setOpenPRs(prs);

        // Charts can load after critical data is shown
        const flow = await client.insights.getStatusFlowOverTime({ repo });
        setStatusFlow(flow);

        const dl = await client.insights.getDeadlineVolatility({ repo });
        setDeadlineVol(dl);
      } catch (err) { console.error("Error:", err); }
      finally { setLoading(false); }
    };
    load();
  }, [month, repo]);

  const setParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") params.delete(key);
    else params.set(key, value);
    router.replace(`/insights/year-month-analysis?${params.toString()}`);
  };

  // ── Table aggregation ──
  const statusTable = useMemo(() => {
    const byStatus: Record<string, { eips: number; ercs: number; rips: number; delta: number }> = {};
    for (const s of snapshot) {
      if (!byStatus[s.status]) byStatus[s.status] = { eips: 0, ercs: 0, rips: 0, delta: 0 };
      if (s.repo === "eips") byStatus[s.status].eips += s.count;
      else if (s.repo === "ercs") byStatus[s.status].ercs += s.count;
      else if (s.repo === "rips") byStatus[s.status].rips += s.count;
      byStatus[s.status].delta += s.delta;
    }
    return Object.entries(byStatus).map(([status, data]) => ({ status, ...data }));
  }, [snapshot]);

  // ── Stacked area data ──
  const areaData = useMemo(() => {
    const byMonth: Record<string, Record<string, number>> = {};
    for (const s of statusFlow) {
      if (!byMonth[s.month]) byMonth[s.month] = {};
      byMonth[s.month][s.status] = (byMonth[s.month][s.status] ?? 0) + s.count;
    }
    return Object.entries(byMonth).map(([m, statuses]) => ({ month: m, ...statuses })).sort((a, b) => a.month.localeCompare(b.month));
  }, [statusFlow]);

  const DeltaBadge = ({ delta }: { delta: number }) => {
    if (delta > 0) return <span className="inline-flex items-center gap-0.5 text-emerald-400 text-xs"><TrendingUp className="h-3 w-3" />+{delta}</span>;
    if (delta < 0) return <span className="inline-flex items-center gap-0.5 text-red-400 text-xs"><TrendingDown className="h-3 w-3" />{delta}</span>;
    return <span className="inline-flex items-center gap-0.5 text-slate-500 text-xs"><Minus className="h-3 w-3" />0</span>;
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="border-b border-slate-800/50 bg-slate-900/30 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <Link href="/insights" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-3">
            <ArrowLeft className="h-4 w-4" />Back to Insights
          </Link>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h1 className="text-2xl font-bold text-white">Year–Month Analysis</h1>
            <div className="flex items-center gap-3 flex-wrap">
              <select value={month} onChange={(e) => setParam("month", e.target.value)}
                className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-cyan-500/50">
                {availableMonths.map((m) => <option key={m} value={m}>{m}</option>)}
                {!availableMonths.includes(month) && <option value={month}>{month}</option>}
              </select>
              <select value={repo ?? "all"} onChange={(e) => setParam("repo", e.target.value === "all" ? null : e.target.value)}
                className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-cyan-500/50">
                <option value="all">All Repos</option>
                <option value="eips">EIPs</option>
                <option value="ercs">ERCs</option>
                <option value="rips">RIPs</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
          </div>
        ) : (
          <>
            {/* Status Snapshot Table */}
            <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 backdrop-blur-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-700/50">
                <h3 className="text-lg font-semibold text-white">Status Snapshot — {month}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50 bg-slate-800/20">
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">EIP</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">ERC</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">RIP</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">Δ vs Last Month</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statusTable.length === 0 ? (
                      <tr><td colSpan={5} className="py-8 text-center text-slate-400">No data for this month</td></tr>
                    ) : statusTable.map((row) => (
                      <tr key={row.status} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="px-6 py-3">
                          <span className="inline-flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[row.status] ?? "#94a3b8" }} />
                            <span className="text-white font-medium">{row.status}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-300">{row.eips}</td>
                        <td className="px-4 py-3 text-right text-slate-300">{row.ercs}</td>
                        <td className="px-4 py-3 text-right text-slate-300">{row.rips}</td>
                        <td className="px-4 py-3 text-right"><DeltaBadge delta={row.delta} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Status Flow Over Time */}
              <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-6 backdrop-blur-sm lg:col-span-2">
                <h3 className="text-lg font-semibold text-white mb-4">Status Flow Over Time</h3>
                {areaData.length > 0 ? (
                  <ChartContainer config={Object.fromEntries(Object.entries(STATUS_COLORS).map(([k, v]) => [k, { label: k, color: v }])) as ChartConfig} className="h-[350px] w-full">
                    <AreaChart data={areaData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v: string) => v.slice(2)} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      {Object.entries(STATUS_COLORS).map(([status, color]) => (
                        <Area key={status} type="monotone" dataKey={status} stackId="1" stroke={color} fill={color} fillOpacity={0.3} />
                      ))}
                    </AreaChart>
                  </ChartContainer>
                ) : <p className="text-slate-400 text-sm">No data</p>}
              </div>

              {/* Deadline Volatility */}
              <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-6 backdrop-blur-sm lg:col-span-2">
                <h3 className="text-lg font-semibold text-white mb-4">Deadline Volatility</h3>
                {deadlineVol.length > 0 ? (
                  <ChartContainer config={{ changes: { label: "Deadline Changes", color: "#fbbf24" } } satisfies ChartConfig} className="h-[250px] w-full">
                    <LineChart data={deadlineVol}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v: string) => v.slice(2)} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="changes" stroke="#fbbf24" strokeWidth={2} dot={false} name="Changes" />
                    </LineChart>
                  </ChartContainer>
                ) : <p className="text-slate-400 text-sm">No data</p>}
              </div>
            </div>

            {/* Editors Leaderboard */}
            <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 backdrop-blur-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-700/50">
                <h3 className="text-lg font-semibold text-white">Editors Leaderboard</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50 bg-slate-800/20">
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400">#</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Editor</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">Reviews</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">PRs Touched</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">Comments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editors.length === 0 ? (
                      <tr><td colSpan={5} className="py-8 text-center text-slate-400">No editor activity</td></tr>
                    ) : editors.map((e, i) => (
                      <tr key={e.editor} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="px-6 py-3 text-slate-500 font-mono text-xs">{i + 1}</td>
                        <td className="px-4 py-3 text-white font-medium">{e.editor}</td>
                        <td className="px-4 py-3 text-right text-cyan-300">{e.reviews}</td>
                        <td className="px-4 py-3 text-right text-slate-300">{e.prsTouched}</td>
                        <td className="px-4 py-3 text-right text-slate-300">{e.comments}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Open PRs */}
            <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 backdrop-blur-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-700/50">
                <h3 className="text-lg font-semibold text-white">Open PRs — Waiting Longest</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50 bg-slate-800/20">
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">PR #</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Title</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Author</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Waiting On</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">Days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openPRs.length === 0 ? (
                      <tr><td colSpan={5} className="py-8 text-center text-slate-400">No open PRs</td></tr>
                    ) : openPRs.map((pr) => (
                      <tr key={`${pr.repo}-${pr.prNumber}`} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="px-4 py-3 text-cyan-300 font-medium">#{pr.prNumber}</td>
                        <td className="px-4 py-3 text-slate-200 max-w-[300px] truncate">{pr.title ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-300 text-xs">{pr.author ?? "—"}</td>
                        <td className="px-4 py-3">
                          {pr.governanceState ? (
                            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full",
                              pr.governanceState === "WAITING_ON_EDITOR" ? "bg-amber-500/20 text-amber-300" :
                              pr.governanceState === "WAITING_ON_AUTHOR" ? "bg-blue-500/20 text-blue-300" :
                              pr.governanceState === "STALLED" ? "bg-red-500/20 text-red-300" :
                              "bg-slate-500/20 text-slate-300"
                            )}>{pr.governanceState.replace(/_/g, " ")}</span>
                          ) : <span className="text-slate-500">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-300">{pr.daysWaiting}d</td>
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

export default function YearMonthAnalysisPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-cyan-500" /></div>}>
      <YearMonthContent />
    </Suspense>
  );
}
