"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAnalytics, useAnalyticsExport } from "../analytics-layout-client";
import { client } from "@/lib/orpc";
import { Loader2, Users, TrendingUp, GitPullRequest, FileText } from "lucide-react";
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
import { cn } from "@/lib/utils";

interface AuthorKPIs {
  totalAuthors: number;
  newAuthors: number;
  prsCreated: number;
  eipsAuthored: number;
}

interface ActivityTimelinePoint {
  month: string;
  activeAuthors: number;
}

interface SuccessRateRow {
  author: string;
  totalPRs: number;
  merged: number;
  closed: number;
  open: number;
  mergedPct: number;
  closedPct: number;
  openPct: number;
  avgTimeToMerge: number | null;
}

interface TopAuthorRow {
  author: string;
  prsCreated: number;
  prsMerged: number;
  avgTimeToMerge: number | null;
  lastActivity: string | null;
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

export default function AuthorsAnalyticsPage() {
  const { timeRange, repoFilter } = useAnalytics();
  const [loading, setLoading] = useState(true);
  
  const [kpis, setKPIs] = useState<AuthorKPIs | null>(null);
  const [activityTimeline, setActivityTimeline] = useState<ActivityTimelinePoint[]>([]);
  const [successRates, setSuccessRates] = useState<SuccessRateRow[]>([]);
  const [topAuthors, setTopAuthors] = useState<TopAuthorRow[]>([]);

  const repoParam = repoFilter === "all" ? undefined : repoFilter;
  const { from, to } = getTimeWindow(timeRange);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const months = timeRange === "7d" ? 3 : timeRange === "30d" ? 6 : timeRange === "90d" ? 12 : 24;
        
        const [kpisData, timelineData, successData, topData] = await Promise.all([
          client.analytics.getAuthorKPIs({
            repo: repoParam,
            from,
            to,
          }),
          client.analytics.getAuthorActivityTimeline({
            repo: repoParam,
            months,
          }),
          client.analytics.getAuthorSuccessRates({
            repo: repoParam,
            limit: 20,
          }),
          client.analytics.getTopAuthors({
            repo: repoParam,
            from,
            to,
            limit: 50,
          }),
        ]);

        setKPIs(kpisData);
        setActivityTimeline(timelineData);
        setSuccessRates(successData);
        setTopAuthors(topData);
      } catch (error) {
        console.error("Failed to fetch authors analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timeRange, repoFilter, repoParam, from, to]);

  // Export functionality
  useAnalyticsExport(() => {
    const combined: Record<string, unknown>[] = [];
    
    // KPIs
    if (kpis) {
      combined.push({
        type: 'KPIs',
        totalAuthors: kpis.totalAuthors,
        newAuthors: kpis.newAuthors,
        prsCreated: kpis.prsCreated,
        eipsAuthored: kpis.eipsAuthored,
      });
    }
    
    // Activity timeline
    activityTimeline.forEach(a => {
      combined.push({
        type: 'Activity Timeline',
        month: a.month,
        activeAuthors: a.activeAuthors,
      });
    });
    
    // Success rates
    successRates.forEach(s => {
      combined.push({
        type: 'Success Rate',
        author: s.author,
        totalPRs: s.totalPRs,
        merged: s.merged,
        closed: s.closed,
        open: s.open,
        mergedPct: s.mergedPct,
        closedPct: s.closedPct,
        openPct: s.openPct,
        avgTimeToMerge: s.avgTimeToMerge,
      });
    });
    
    // Top authors
    topAuthors.forEach(t => {
      combined.push({
        type: 'Top Author',
        author: t.author,
        prsCreated: t.prsCreated,
        prsMerged: t.prsMerged,
        avgTimeToMerge: t.avgTimeToMerge,
        lastActivity: t.lastActivity,
      });
    });
    
    return combined;
  }, `authors-analytics-${repoFilter}-${timeRange}`);

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
              <p className="text-sm text-slate-400">Total Authors</p>
              <p className="text-3xl font-bold text-white">
                {kpis?.totalAuthors.toLocaleString() || 0}
              </p>
            </div>
            <div className="rounded-full bg-amber-500/20 p-3">
              <Users className="h-6 w-6 text-amber-400" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">New Authors</p>
              <p className="text-3xl font-bold text-white">
                {kpis?.newAuthors.toLocaleString() || 0}
              </p>
              <p className="mt-1 text-xs text-slate-500">This period</p>
            </div>
            <div className="rounded-full bg-emerald-500/20 p-3">
              <TrendingUp className="h-6 w-6 text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">PRs Created</p>
              <p className="text-3xl font-bold text-white">
                {kpis?.prsCreated.toLocaleString() || 0}
              </p>
            </div>
            <div className="rounded-full bg-blue-500/20 p-3">
              <GitPullRequest className="h-6 w-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">EIPs Authored</p>
              <p className="text-3xl font-bold text-white">
                {kpis?.eipsAuthored.toLocaleString() || 0}
              </p>
            </div>
            <div className="rounded-full bg-violet-500/20 p-3">
              <FileText className="h-6 w-6 text-violet-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-6 backdrop-blur-sm">
        <h2 className="mb-4 text-lg font-semibold text-white">Author Activity Timeline</h2>
        <ChartContainer
          config={{
            activeAuthors: { label: "Active Authors", color: "#fbbf24" },
          }}
          className="h-72 w-full"
        >
          <ResponsiveContainer>
            <LineChart data={activityTimeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="activeAuthors"
                stroke="#fbbf24"
                strokeWidth={2}
                dot={false}
                name="Active Authors"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
        <p className="mt-2 text-xs text-slate-500">
          Number of unique authors who created PRs each month
        </p>
      </div>

      {/* Success Rates */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-6 backdrop-blur-sm">
        <h2 className="mb-4 text-lg font-semibold text-white">Success Rates (Top Authors)</h2>
        <div className="space-y-3">
          {successRates.slice(0, 10).map((author) => (
            <div
              key={author.author}
              className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium text-slate-200">{author.author}</span>
                <span className="text-sm text-slate-400">
                  {author.totalPRs} PRs total
                </span>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Merged</span>
                    <span className="text-emerald-400">{author.mergedPct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${author.mergedPct}%` }}
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Closed</span>
                    <span className="text-slate-400">{author.closedPct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-slate-600"
                      style={{ width: `${author.closedPct}%` }}
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Open</span>
                    <span className="text-blue-400">{author.openPct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${author.openPct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
          {successRates.length === 0 && (
            <p className="text-sm text-slate-500">No author success rate data available.</p>
          )}
        </div>
      </div>

      {/* Top Authors Table */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-6 backdrop-blur-sm">
        <h2 className="mb-4 text-xl font-semibold text-white">Top Authors</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="py-3 px-4 text-left text-sm font-medium text-slate-400">Rank</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-slate-400">Author</th>
                <th className="py-3 px-4 text-right text-sm font-medium text-slate-400">PRs Created</th>
                <th className="py-3 px-4 text-right text-sm font-medium text-slate-400">PRs Merged</th>
                <th className="py-3 px-4 text-right text-sm font-medium text-slate-400">Avg Time to Merge</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-slate-400">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {topAuthors.map((author, idx) => (
                <tr
                  key={author.author}
                  className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                >
                  <td className="py-3 px-4 text-sm text-slate-400">#{idx + 1}</td>
                  <td className="py-3 px-4">
                    <span className="font-medium text-slate-200">{author.author}</span>
                  </td>
                  <td className="py-3 px-4 text-right text-sm text-slate-300">
                    {author.prsCreated.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right text-sm text-slate-300">
                    {author.prsMerged.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right text-sm text-slate-300">
                    {author.avgTimeToMerge != null
                      ? `${author.avgTimeToMerge}d`
                      : "–"}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-400">
                    {author.lastActivity
                      ? new Date(author.lastActivity).toLocaleDateString()
                      : "–"}
                  </td>
                </tr>
              ))}
              {topAuthors.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-slate-500">
                    No author data found for the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
