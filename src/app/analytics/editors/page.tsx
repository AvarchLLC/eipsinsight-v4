"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useAnalytics } from "../analytics-layout-client";
import { client } from "@/lib/orpc";
import { Loader2, UserCheck, Clock, FileText, Download } from "lucide-react";
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

interface EditorLeaderboardRow {
  actor: string;
  totalReviews: number;
  prsTouched: number;
  medianResponseDays: number | null;
}

interface CategoryCoverage {
  category: string;
  actors: string[];
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

const categoryColors: Record<string, string> = {
  core: "#34d399",
  erc: "#60a5fa",
  networking: "#a78bfa",
  interface: "#f472b6",
  meta: "#fbbf24",
  informational: "#94a3b8",
  governance: "#ef4444",
};

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

export default function EditorsAnalyticsPage() {
  const { timeRange, repoFilter } = useAnalytics();
  const [loading, setLoading] = useState(true);
  
  const [leaderboard, setLeaderboard] = useState<EditorLeaderboardRow[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrendPoint[]>([]);
  const [categoryCoverage, setCategoryCoverage] = useState<CategoryCoverage[]>([]);
  const [repoDistribution, setRepoDistribution] = useState<RepoDistribution[]>([]);
  const [membershipTier, setMembershipTier] = useState<string>('free');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const repoParam = repoFilter === "all" ? undefined : repoFilter;
  const { from, to } = getTimeWindow(timeRange);
  const [exporting, setExporting] = useState(false);
  const isPaidMember = membershipTier !== 'free';

  const downloadLeaderboardCSV = useCallback(async () => {
    if (!isPaidMember) {
      setShowUpgradeModal(true);
      return;
    }

    setExporting(true);
    try {
      const { csv, filename } = await client.analytics.getEditorsLeaderboardExport({
        repo: repoParam,
        from,
        to,
      });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("CSV export failed:", err);
    } finally {
      setExporting(false);
    }
  }, [repoParam, from, to, isPaidMember]);

  // Fetch membership tier on mount
  useEffect(() => {
    fetch('/api/stripe/subscription')
      .then(res => res.json())
      .then(data => setMembershipTier(data?.tier || 'free'))
      .catch(() => setMembershipTier('free'));
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const months = timeRange === "7d" ? 3 : timeRange === "this_month" || timeRange === "30d" ? 6 : timeRange === "90d" ? 12 : 24;
        
        const [leaderboardData, trendData, categoryData, repoData] = await Promise.all([
          client.analytics.getEditorsLeaderboard({
            repo: repoParam,
            from,
            to,
            limit: 30,
          }),
          client.analytics.getEditorsMonthlyTrend({
            repo: repoParam,
            months,
          }),
          client.analytics.getEditorsByCategory({
            repo: repoParam,
          }),
          client.analytics.getEditorsRepoDistribution({
            repo: repoParam,
            from,
            to,
          }),
        ]);

        setLeaderboard(leaderboardData);
        setMonthlyTrend(trendData);
        setCategoryCoverage(categoryData);
        setRepoDistribution(repoData);
      } catch (error) {
        console.error("Failed to fetch editors analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timeRange, repoFilter, repoParam, from, to]);

  // Aggregate repo distribution into cards
  const repoCards = useMemo(() => {
    const totals: Record<string, number> = {};
    repoDistribution.forEach(r => {
      const repoName = r.repo.split('/')[1] || r.repo;
      totals[repoName] = (totals[repoName] || 0) + r.count;
    });
    return [
      { name: "EIPs", count: totals["EIPs"] || 0, color: repoColors["ethereum/EIPs"] },
      { name: "ERCs", count: totals["ERCs"] || 0, color: repoColors["ethereum/ERCs"] },
      { name: "RIPs", count: totals["RIPs"] || 0, color: repoColors["ethereum/RIPs"] },
    ];
  }, [repoDistribution]);

  // Prepare category coverage for stacked bars
  const categoryData = useMemo(() => {
    const categories = categoryCoverage.map(c => c.category);
    const allActors = new Set<string>();
    categoryCoverage.forEach(c => c.actors.forEach(a => allActors.add(a)));
    
    return categories.map(category => {
      const coverage = categoryCoverage.find(c => c.category === category);
      return {
        category: category.charAt(0).toUpperCase() + category.slice(1),
        count: coverage?.actors.length || 0,
        actors: coverage?.actors || [],
      };
    }).filter(c => c.count > 0);
  }, [categoryCoverage]);

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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Total Editors</p>
              <p className="text-3xl font-bold text-white">{leaderboard.length}</p>
            </div>
            <div className="rounded-full bg-violet-500/20 p-3">
              <UserCheck className="h-6 w-6 text-violet-400" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Total Reviews</p>
              <p className="text-3xl font-bold text-white">
                {leaderboard.reduce((sum, e) => sum + e.totalReviews, 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-full bg-blue-500/20 p-3">
              <FileText className="h-6 w-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Median Response Time</p>
              <p className="text-3xl font-bold text-white">
                {(() => {
                  const medians = leaderboard
                    .map(e => e.medianResponseDays)
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

      {/* Editor Leaderboard */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-6 backdrop-blur-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">
            Editor Leaderboard
            {timeRange === "this_month" && (
              <span className="ml-2 text-sm font-normal text-slate-500">
                — {new Date().toLocaleString('en', { month: 'long', year: 'numeric' })}
              </span>
            )}
            {timeRange === "all" && (
              <span className="ml-2 text-sm font-normal text-slate-500">— All-Time Contributions</span>
            )}
          </h2>
          <button
            onClick={downloadLeaderboardCSV}
            disabled={exporting || leaderboard.length === 0 || !isPaidMember}
            title={!isPaidMember ? 'Upgrade to Pro to download exports' : ''}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
              !isPaidMember
                ? 'border-amber-600/30 bg-amber-500/10 text-amber-600/70 cursor-not-allowed opacity-60'
                : 'border-slate-600/50 bg-slate-800/30 text-slate-300 hover:bg-slate-800/50 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {!isPaidMember ? 'Export (Pro+)' : 'Download CSV'}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="py-3 px-4 text-left text-sm font-medium text-slate-400">Rank</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-slate-400">Editor</th>
                <th className="py-3 px-4 text-right text-sm font-medium text-slate-400">Reviews</th>
                <th className="py-3 px-4 text-right text-sm font-medium text-slate-400">PRs Touched</th>
                <th className="py-3 px-4 text-right text-sm font-medium text-slate-400">Median Response</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((editor, idx) => (
                <tr
                  key={editor.actor}
                  className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                >
                  <td className="py-3 px-4 text-sm text-slate-400">#{idx + 1}</td>
                  <td className="py-3 px-4">
                    <span className="font-medium text-slate-200">{editor.actor}</span>
                  </td>
                  <td className="py-3 px-4 text-right text-sm text-slate-300">
                    {editor.totalReviews.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right text-sm text-slate-300">
                    {editor.prsTouched.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right text-sm text-slate-300">
                    {editor.medianResponseDays != null
                      ? `${editor.medianResponseDays}d`
                      : "–"}
                  </td>
                </tr>
              ))}
              {leaderboard.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-sm text-slate-500">
                    No editor data found for the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Trend + Repo Distribution */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-slate-700/50 bg-slate-900/40 p-6 backdrop-blur-sm">
          <h2 className="mb-4 text-lg font-semibold text-white">Review Load Over Time</h2>
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

        <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-6 backdrop-blur-sm">
          <h2 className="mb-4 text-lg font-semibold text-white">Repo Distribution</h2>
          <div className="space-y-4">
            {repoCards.map((repo) => (
              <div key={repo.name} className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-300">{repo.name}</span>
                  <span className="text-lg font-bold text-white">{repo.count.toLocaleString()}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (repo.count / Math.max(...repoCards.map(r => r.count), 1)) * 100)}%`,
                      backgroundColor: repo.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category Coverage */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-6 backdrop-blur-sm">
        <h2 className="mb-4 text-lg font-semibold text-white">Category Coverage</h2>
        <ChartContainer
          config={Object.fromEntries(
            Object.entries(categoryColors).map(([cat, color]) => [
              cat,
              { label: cat, color },
            ])
          )}
          className="h-64 w-full"
        >
          <ResponsiveContainer>
            <BarChart data={categoryData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis type="number" stroke="#94a3b8" />
              <YAxis dataKey="category" type="category" stroke="#94a3b8" width={100} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                {categoryData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={categoryColors[entry.category.toLowerCase()] || "#94a3b8"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
        <p className="mt-2 text-xs text-slate-500">
          Number of editors active in each category
        </p>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 max-w-md w-full mx-4 shadow-lg">
            <div className="flex items-start gap-3 mb-4">
              <Download className="h-6 w-6 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-white">Unlock CSV Export</h3>
                <p className="text-sm text-slate-400 mt-1">Upgrade to Pro or Enterprise to download analytics data</p>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded p-3 mb-4 text-sm text-slate-300">
              <p className="font-medium text-white mb-2">Pro features include:</p>
              <ul className="space-y-1 text-xs">
                <li>✓ CSV exports for all analytics</li>
                <li>✓ 50,000 API requests/month</li>
                <li>✓ Advanced analytics dashboards</li>
                <li>✓ Priority support</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800/50 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <a
                href="/pricing"
                className="flex-1 px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors text-sm font-medium text-center"
              >
                View Plans
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
