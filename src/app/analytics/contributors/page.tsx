"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAnalytics, useAnalyticsExport } from "../analytics-layout-client";
import { client } from "@/lib/orpc";
import { Loader2, Users, Activity, Zap, Database } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from "recharts";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ContributorKPIs {
  totalContributors: number;
  activeContributors30d: number;
  totalActivities: number;
  last24hCount: number;
}

interface ActivityByType {
  actionType: string;
  count: number;
}

interface ActivityByRepo {
  repo: string;
  count: number;
}

interface ContributorRanking {
  actor: string;
  total: number;
  reviews: number;
  statusChanges: number;
  prsAuthored: number;
  prsReviewed: number;
}

interface LiveFeedItem {
  actor: string;
  actionType: string;
  prNumber: number;
  repo: string | null;
  occurredAt: string;
}

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

const actionTypeColors: Record<string, string> = {
  reviewed: "#22c55e",
  commented: "#60a5fa",
  committed: "#a78bfa",
  opened: "#fbbf24",
  status_change: "#ef4444",
};

const repoColors: Record<string, string> = {
  "ethereum/EIPs": "#22d3ee",
  "ethereum/ERCs": "#60a5fa",
  "ethereum/RIPs": "#94a3b8",
};

export default function ContributorsAnalyticsPage() {
  const { timeRange, repoFilter } = useAnalytics();
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'total' | 'reviews' | 'status_changes' | 'prs_authored' | 'prs_reviewed'>('total');
  
  const [kpis, setKPIs] = useState<ContributorKPIs | null>(null);
  const [activityByType, setActivityByType] = useState<ActivityByType[]>([]);
  const [activityByRepo, setActivityByRepo] = useState<ActivityByRepo[]>([]);
  const [rankings, setRankings] = useState<ContributorRanking[]>([]);
  const [liveFeed, setLiveFeed] = useState<LiveFeedItem[]>([]);

  const repoParam = repoFilter === "all" ? undefined : repoFilter;
  const { from, to } = getTimeWindow(timeRange);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [kpisData, typeData, repoData, rankingsData, feedData] = await Promise.all([
          client.analytics.getContributorKPIs({}),
          client.analytics.getContributorActivityByType({
            repo: repoParam,
            from,
            to,
          }),
          client.analytics.getContributorActivityByRepo({
            from,
            to,
          }),
          client.analytics.getContributorRankings({
            repo: repoParam,
            from,
            to,
            sortBy,
            limit: 50,
          }),
          client.analytics.getContributorLiveFeed({
            hours: 48,
            limit: 50,
          }),
        ]);

        setKPIs(kpisData);
        setActivityByType(typeData);
        setActivityByRepo(repoData);
        setRankings(rankingsData);
        setLiveFeed(feedData);
      } catch (error) {
        console.error("Failed to fetch contributors analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timeRange, repoFilter, repoParam, from, to, sortBy]);

  // Prepare repo heatmap data
  const repoHeatmap = useMemo(() => {
    return activityByRepo.map(r => ({
      repo: r.repo.split('/')[1] || r.repo,
      count: r.count,
      color: repoColors[r.repo] || "#94a3b8",
    }));
  }, [activityByRepo]);

  // Export functionality
  useAnalyticsExport(() => {
    const combined: Record<string, unknown>[] = [];
    
    // KPIs
    if (kpis) {
      combined.push({
        type: 'KPIs',
        totalContributors: kpis.totalContributors,
        activeContributors30d: kpis.activeContributors30d,
        totalActivities: kpis.totalActivities,
        last24hCount: kpis.last24hCount,
      });
    }
    
    // Activity by type
    activityByType.forEach(a => {
      combined.push({
        type: 'Activity by Type',
        actionType: a.actionType,
        count: a.count,
      });
    });
    
    // Activity by repo
    activityByRepo.forEach(a => {
      combined.push({
        type: 'Activity by Repo',
        repo: a.repo,
        count: a.count,
      });
    });
    
    // Contributor rankings
    rankings.forEach(r => {
      combined.push({
        type: 'Contributor Ranking',
        contributor: r.actor,
        total: r.total,
        reviews: r.reviews,
        statusChanges: r.statusChanges,
        prsAuthored: r.prsAuthored,
        prsReviewed: r.prsReviewed,
      });
    });
    
    // Live feed (sampling first 20)
    liveFeed.slice(0, 20).forEach(l => {
      combined.push({
        type: 'Live Feed',
        actor: l.actor,
        actionType: l.actionType,
        prNumber: l.prNumber,
        repo: l.repo,
        occurredAt: l.occurredAt,
      });
    });
    
    return combined;
  }, `contributors-analytics-${repoFilter}-${timeRange}`);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero KPIs */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Total Contributors</p>
              <p className="text-3xl font-bold text-white">
                {kpis?.totalContributors.toLocaleString() || 0}
              </p>
            </div>
            <div className="rounded-full bg-pink-500/20 p-3">
              <Users className="h-6 w-6 text-pink-400" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Active (30d)</p>
              <p className="text-3xl font-bold text-white">
                {kpis?.activeContributors30d.toLocaleString() || 0}
              </p>
            </div>
            <div className="rounded-full bg-emerald-500/20 p-3">
              <Activity className="h-6 w-6 text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Total Activities</p>
              <p className="text-3xl font-bold text-white">
                {kpis?.totalActivities.toLocaleString() || 0}
              </p>
            </div>
            <div className="rounded-full bg-blue-500/20 p-3">
              <Database className="h-6 w-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Last 24h</p>
              <p className="text-3xl font-bold text-white">
                {kpis?.last24hCount.toLocaleString() || 0}
              </p>
            </div>
            <div className="rounded-full bg-amber-500/20 p-3">
              <Zap className="h-6 w-6 text-amber-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Activity by Type + Activity by Repo */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-6 backdrop-blur-sm">
          <h2 className="mb-4 text-lg font-semibold text-white">Activity by Type</h2>
          <ChartContainer
            config={Object.fromEntries(
              Object.entries(actionTypeColors).map(([type, color]) => [
                type,
                { label: type, color },
              ])
            )}
            className="h-64 w-full"
          >
            <ResponsiveContainer>
              <BarChart data={activityByType} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#94a3b8" />
                <YAxis dataKey="actionType" type="category" stroke="#94a3b8" width={100} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                  {activityByType.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={actionTypeColors[entry.actionType] || "#94a3b8"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-6 backdrop-blur-sm">
          <h2 className="mb-4 text-lg font-semibold text-white">Activity by Repository</h2>
          <ChartContainer
            config={Object.fromEntries(
              repoHeatmap.map((r) => [
                r.repo,
                { label: r.repo, color: r.color },
              ])
            )}
            className="h-64 w-full"
          >
            <ResponsiveContainer>
              <BarChart data={repoHeatmap}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="repo" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {repoHeatmap.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </div>

      {/* Contributor Rankings */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-6 backdrop-blur-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Contributor Rankings</h2>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="rounded-lg border border-slate-700/50 bg-slate-800/30 px-3 py-1.5 text-sm text-slate-300"
          >
            <option value="total">Total Activities</option>
            <option value="reviews">Reviews</option>
            <option value="status_changes">Status Changes</option>
            <option value="prs_authored">PRs Authored</option>
            <option value="prs_reviewed">PRs Reviewed</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="py-3 px-4 text-left text-sm font-medium text-slate-400">Rank</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-slate-400">Contributor</th>
                <th className="py-3 px-4 text-right text-sm font-medium text-slate-400">Total</th>
                <th className="py-3 px-4 text-right text-sm font-medium text-slate-400">Reviews</th>
                <th className="py-3 px-4 text-right text-sm font-medium text-slate-400">Status Changes</th>
                <th className="py-3 px-4 text-right text-sm font-medium text-slate-400">PRs Authored</th>
                <th className="py-3 px-4 text-right text-sm font-medium text-slate-400">PRs Reviewed</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((contributor, idx) => (
                <tr
                  key={contributor.actor}
                  className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                >
                  <td className="py-3 px-4 text-sm text-slate-400">#{idx + 1}</td>
                  <td className="py-3 px-4">
                    <Link
                      href={`/analytics/contributors/${contributor.actor}`}
                      className="font-medium text-cyan-400 hover:text-cyan-300"
                    >
                      {contributor.actor}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-right text-sm text-slate-300">
                    {contributor.total.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right text-sm text-slate-300">
                    {contributor.reviews.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right text-sm text-slate-300">
                    {contributor.statusChanges.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right text-sm text-slate-300">
                    {contributor.prsAuthored.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right text-sm text-slate-300">
                    {contributor.prsReviewed.toLocaleString()}
                  </td>
                </tr>
              ))}
              {rankings.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-sm text-slate-500">
                    No contributor data found for the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Activity Feed */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-6 backdrop-blur-sm">
        <h2 className="mb-4 text-lg font-semibold text-white">Live Activity Feed (Last 48h)</h2>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {liveFeed.map((item, idx) => {
            const repoName = item.repo ? item.repo.split('/')[1] : 'Unknown';
            return (
              <div
                key={idx}
                className="flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-800/30 px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-slate-200">{item.actor}</span>
                  <span className="text-slate-400">
                    {item.actionType.replace('_', ' ')}
                  </span>
                  {item.prNumber > 0 && (
                    <span className="text-cyan-400">PR #{item.prNumber}</span>
                  )}
                  {item.repo && (
                    <span className="text-slate-500">{repoName}</span>
                  )}
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(item.occurredAt).toLocaleString()}
                </span>
              </div>
            );
          })}
          {liveFeed.length === 0 && (
            <p className="text-sm text-slate-500">No recent activity in the last 48 hours.</p>
          )}
        </div>
      </div>
    </div>
  );
}
