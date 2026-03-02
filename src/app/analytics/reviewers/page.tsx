"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAnalytics, useAnalyticsExport } from "../analytics-layout-client";
import { client } from "@/lib/orpc";
import { Loader2, Users, Clock, MessageSquare, AlertCircle } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";

interface ReviewerLeaderboardRow {
  actor: string;
  totalReviews: number;
  prsTouched: number;
  medianResponseDays: number | null;
}

interface CyclesData {
  cycles: number;
  count: number;
}

interface RepoDistribution {
  actor: string;
  repo: string;
  count: number;
  pct: number;
}

interface MonthlyTrendPoint {
  month: string;
  [actor: string]: string | number;
}

const repoColors: Record<string, string> = {
  "ethereum/EIPs": "#22d3ee",
  "ethereum/ERCs": "#60a5fa",
  "ethereum/RIPs": "#94a3b8",
};

function getTimeWindow(timeRange: string): { from: string | undefined; to: string | undefined } {
  const now = new Date();
  const to = now.toISOString().split('T')[0];
  
  if (timeRange === "all") {
    return { from: undefined, to: undefined };
  }

  let from: Date;
  switch (timeRange) {
    case "this_month":
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "7d":
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "90d":
      from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "1y":
      from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      from = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  
  return { from: from.toISOString().split('T')[0], to };
}

export default function ReviewersAnalyticsPage() {
  const { timeRange, repoFilter } = useAnalytics();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [leaderboard, setLeaderboard] = useState<ReviewerLeaderboardRow[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrendPoint[]>([]);
  const [cyclesData, setCyclesData] = useState<CyclesData[]>([]);
  const [repoDistribution, setRepoDistribution] = useState<RepoDistribution[]>([]);

  const repoParam = repoFilter === "all" ? undefined : repoFilter;
  const { from, to } = getTimeWindow(timeRange);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const months = timeRange === "7d" ? 3 : timeRange === "30d" ? 6 : timeRange === "90d" ? 12 : 24;
        
        const [leaderboardData, trendData, cyclesDataRes, repoData] = await Promise.all([
          client.analytics.getReviewersLeaderboard({
            repo: repoParam,
            from,
            to,
            limit: 30,
          }),
          client.analytics.getReviewersMonthlyTrend({
            repo: repoParam,
            months,
          }),
          client.analytics.getReviewerCyclesPerPR({
            repo: repoParam,
          }),
          client.analytics.getReviewersRepoDistribution({
            repo: repoParam,
            from,
            to,
          }),
        ]);

        setLeaderboard(leaderboardData);
        setMonthlyTrend(trendData);
        setCyclesData(cyclesDataRes);
        setRepoDistribution(repoData);
      } catch (error) {
        console.error("Failed to fetch reviewers analytics:", error);
        setError("Failed to load reviewer analytics. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timeRange, repoFilter, repoParam, from, to]);

  // Aggregate repo distribution
  const repoBars = useMemo(() => {
    const totals: Record<string, number> = {};
    repoDistribution.forEach(r => {
      const repoName = r.repo.split('/')[1] || r.repo;
      totals[repoName] = (totals[repoName] || 0) + r.count;
    });
    return [
      { repo: "EIPs", count: totals["EIPs"] || 0 },
      { repo: "ERCs", count: totals["ERCs"] || 0 },
      { repo: "RIPs", count: totals["RIPs"] || 0 },
    ];
  }, [repoDistribution]);

  // Get unique actors from monthly trend for legend
  const trendActors = useMemo(() => {
    if (monthlyTrend.length === 0) return [];
    const actors = new Set<string>();
    monthlyTrend.forEach(point => {
      Object.keys(point).forEach(key => {
        if (key !== 'month' && typeof point[key] === 'number') {
          actors.add(key);
        }
      });
    });
    return Array.from(actors).slice(0, 8); // Limit to 8 for readability
  }, [monthlyTrend]);

  // Export functionality
  useAnalyticsExport(() => {
    const combined: Record<string, unknown>[] = [];
    
    // Leaderboard data
    leaderboard.forEach(r => {
      combined.push({
        type: 'Leaderboard',
        reviewer: r.actor,
        totalReviews: r.totalReviews,
        prsTouched: r.prsTouched,
        medianResponseDays: r.medianResponseDays,
      });
    });
    
    // Review cycles data
    cyclesData.forEach(c => {
      combined.push({
        type: 'Review Cycles',
        cycles: c.cycles,
        count: c.count,
      });
    });
    
    // Repo distribution
    repoDistribution.forEach(r => {
      combined.push({
        type: 'Repo Distribution',
        reviewer: r.actor,
        repo: r.repo,
        count: r.count,
        pct: r.pct,
      });
    });
    
    return combined;
  }, `reviewers-analytics-${repoFilter}-${timeRange}`);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Hero KPIs */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border/70 bg-card/60 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Reviewers</p>
              <p className="text-3xl font-bold text-foreground">{leaderboard.length}</p>
            </div>
            <div className="rounded-full bg-emerald-500/20 p-3">
              <Users className="h-6 w-6 text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-card/60 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Reviews</p>
              <p className="text-3xl font-bold text-foreground">
                {leaderboard.reduce((sum, r) => sum + r.totalReviews, 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-full bg-blue-500/20 p-3">
              <MessageSquare className="h-6 w-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-card/60 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Median Response Time</p>
              <p className="text-3xl font-bold text-foreground">
                {(() => {
                  const medians = leaderboard
                    .map(r => r.medianResponseDays)
                    .filter((d): d is number => d !== null);
                  if (medians.length === 0) return "–";
                  const overall = medians.reduce((a, b) => a + b, 0) / medians.length;
                  return `${Math.round(overall)}d`;
                })()}
              </p>
            </div>
            <div className="rounded-full bg-amber-500/20 p-3">
              <Clock className="h-6 w-6 text-amber-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Reviewer Leaderboard */}
      <div className="rounded-xl border border-border/70 bg-card/60 p-6 backdrop-blur-sm">
        <h2 className="mb-4 text-xl font-semibold text-foreground">Reviewer Leaderboard</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/70">
                <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">Rank</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">Reviewer</th>
                <th className="py-3 px-4 text-right text-sm font-medium text-muted-foreground">Reviews</th>
                <th className="py-3 px-4 text-right text-sm font-medium text-muted-foreground">PRs Touched</th>
                <th className="py-3 px-4 text-right text-sm font-medium text-muted-foreground">Median Response</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((reviewer, idx) => (
                <tr
                  key={reviewer.actor}
                  className="border-b border-border/60 hover:bg-muted/40 transition-colors"
                >
                  <td className="py-3 px-4 text-sm text-muted-foreground">#{idx + 1}</td>
                  <td className="py-3 px-4">
                    <span className="font-medium text-foreground/90">{reviewer.actor}</span>
                  </td>
                  <td className="py-3 px-4 text-right text-sm text-foreground/85">
                    {reviewer.totalReviews.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right text-sm text-foreground/85">
                    {reviewer.prsTouched.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right text-sm text-foreground/85">
                    {reviewer.medianResponseDays != null
                      ? `${reviewer.medianResponseDays}d`
                      : "–"}
                  </td>
                </tr>
              ))}
              {leaderboard.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                    No reviewer data found for the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Trend + Cycles per PR */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border/70 bg-card/60 p-6 backdrop-blur-sm">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Review Activity Over Time</h2>
          <ChartContainer
            config={Object.fromEntries(
              trendActors.map((actor, idx) => [
                actor,
                {
                  label: actor,
                  color: `hsl(${(idx * 360) / trendActors.length}, 70%, 50%)`,
                },
              ])
            )}
            className="h-72 w-full"
          >
            <ResponsiveContainer>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                {trendActors.map((actor, idx) => (
                  <Line
                    key={actor}
                    type="monotone"
                    dataKey={actor}
                    stroke={`hsl(${(idx * 360) / trendActors.length}, 70%, 50%)`}
                    strokeWidth={2}
                    dot={false}
                    name={actor}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        <div className="rounded-xl border border-border/70 bg-card/60 p-6 backdrop-blur-sm">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Review Cycles per PR</h2>
          <ChartContainer
            config={{
              count: { label: "PRs", color: "#22c55e" },
            }}
            className="h-72 w-full"
          >
            <ResponsiveContainer>
              <BarChart data={cyclesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="cycles" stroke="#94a3b8" label={{ value: "Number of Reviewers", position: "insideBottom", offset: -5 }} />
                <YAxis stroke="#94a3b8" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#22c55e">
                  {cyclesData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.cycles <= 2 ? "#22c55e" : entry.cycles <= 4 ? "#eab308" : "#ef4444"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
          <p className="mt-2 text-xs text-muted-foreground">
            Distribution of how many reviewers typically review each PR
          </p>
        </div>
      </div>

      {/* Top Reviewers by Repo */}
      <div className="rounded-xl border border-border/70 bg-card/60 p-6 backdrop-blur-sm">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Reviewers by Repository</h2>
        <ChartContainer
          config={Object.fromEntries(
            repoBars.map((r) => [
              r.repo,
              {
                label: r.repo,
                color: repoColors[`ethereum/${r.repo}`] || "#94a3b8",
              },
            ])
          )}
          className="h-64 w-full"
        >
          <ResponsiveContainer>
            <BarChart data={repoBars}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="repo" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {repoBars.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={repoColors[`ethereum/${entry.repo}`] || "#94a3b8"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  );
}
