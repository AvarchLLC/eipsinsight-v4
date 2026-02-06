'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader, SectionSeparator } from '@/components/header';
import { client } from '@/lib/orpc';
import { Loader2, Users, Activity, Clock, Download } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const RANGE_OPTIONS = [
  { label: 'Last 30 days', from: () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), to: () => new Date().toISOString().slice(0, 10) },
  { label: 'Last month', from: () => { const d = new Date(); d.setMonth(d.getMonth() - 1); d.setDate(1); return d.toISOString().slice(0, 10); }, to: () => { const d = new Date(); d.setDate(0); return d.toISOString().slice(0, 10); } },
  { label: 'Last year', from: () => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return d.toISOString().slice(0, 10); }, to: () => new Date().toISOString().slice(0, 10) },
  { label: 'All time', from: () => '', to: () => '' },
];

type RepoFilter = 'eips' | 'ercs' | 'rips' | undefined;

export default function ContributorsAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rangeIndex, setRangeIndex] = useState(0);
  const [repo, setRepo] = useState<RepoFilter>(undefined);
  const [sortBy, setSortBy] = useState<'total' | 'reviews' | 'status_changes' | 'prs_authored' | 'prs_reviewed'>('total');
  const [kpis, setKpis] = useState<{ totalContributors: number; activeContributors30d: number; totalActivities: number; last24hCount: number } | null>(null);
  const [byType, setByType] = useState<Array<{ actionType: string; count: number }>>([]);
  const [byRepo, setByRepo] = useState<Array<{ repo: string; count: number }>>([]);
  const [rankings, setRankings] = useState<Array<{ actor: string; total: number; reviews: number; statusChanges: number; prsAuthored: number; prsReviewed: number }>>([]);
  const [liveFeed, setLiveFeed] = useState<Array<{ actor: string; actionType: string; prNumber: number; repo: string | null; occurredAt: string }>>([]);

  const range = RANGE_OPTIONS[rangeIndex];
  const from = range.from();
  const to = range.to();

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const apiParams = { from: from || undefined, to: to || undefined, repo: repo || undefined };
        const [kpisData, byTypeData, byRepoData, rankingsData, feedData] = await Promise.all([
          client.analytics.getContributorKPIs({}),
          client.analytics.getContributorActivityByType(apiParams),
          client.analytics.getContributorActivityByRepo({ from: from || undefined, to: to || undefined }),
          client.analytics.getContributorRankings({ ...apiParams, sortBy, limit: 50 }),
          client.analytics.getContributorLiveFeed({ hours: 48, limit: 30 }),
        ]);
        setKpis(kpisData);
        setByType(byTypeData);
        setByRepo(byRepoData);
        setRankings(rankingsData);
        setLiveFeed(feedData);
      } catch (err) {
        console.error('Failed to fetch contributor analytics:', err);
        setError('Failed to load contributor analytics');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [rangeIndex, repo, sortBy, from, to]);

  const downloadRankingsCSV = () => {
    const headers = ['actor', 'total', 'reviews', 'statusChanges', 'prsAuthored', 'prsReviewed'];
    const rows = rankings.map((r) => [r.actor, r.total, r.reviews, r.statusChanges, r.prsAuthored, r.prsReviewed].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contributor-rankings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !kpis) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-background relative w-full overflow-hidden min-h-screen">
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(52,211,153,0.15),_transparent_50%),_radial-gradient(ellipse_at_bottom_right,_rgba(6,182,212,0.12),_transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(34,211,238,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(34,211,238,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      <div className="relative z-10">
        <PageHeader
          title="Contributors Analytics"
          description="Who is doing the work, how consistently, and where. Event-sourced from contributor_activity."
          sectionId="contributors"
          className="bg-background/80 backdrop-blur-xl"
        />

        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4 pb-2">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-300">Time range:</label>
              <select
                value={rangeIndex}
                onChange={(e) => setRangeIndex(Number(e.target.value))}
                className="rounded-lg border border-cyan-400/20 bg-slate-950/50 px-3 py-1.5 text-sm text-white"
              >
                {RANGE_OPTIONS.map((opt, i) => (
                  <option key={i} value={i}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-300">Repo:</label>
              <select
                value={repo || 'all'}
                onChange={(e) => setRepo(e.target.value === 'all' ? undefined : (e.target.value as RepoFilter))}
                className="rounded-lg border border-cyan-400/20 bg-slate-950/50 px-3 py-1.5 text-sm text-white"
              >
                <option value="all">All</option>
                <option value="eips">EIPs</option>
                <option value="ercs">ERCs</option>
                <option value="rips">RIPs</option>
              </select>
            </div>
          </div>
        </div>

        <SectionSeparator />

        <section className="relative w-full bg-slate-950/30">
          <PageHeader title="Global KPIs" sectionId="kpis" className="bg-slate-950/30" />
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-cyan-400/20 bg-slate-950/50 p-4">
                <div className="flex items-center gap-2 mb-1"><Users className="h-4 w-4 text-cyan-400" /><span className="text-xs text-slate-400">Total Contributors</span></div>
                <p className="text-2xl font-bold text-white">{kpis?.totalContributors ?? 0}</p>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-lg border border-cyan-400/20 bg-slate-950/50 p-4">
                <div className="flex items-center gap-2 mb-1"><Activity className="h-4 w-4 text-emerald-400" /><span className="text-xs text-slate-400">Active (30d)</span></div>
                <p className="text-2xl font-bold text-white">{kpis?.activeContributors30d ?? 0}</p>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-lg border border-cyan-400/20 bg-slate-950/50 p-4">
                <div className="flex items-center gap-2 mb-1"><Activity className="h-4 w-4 text-amber-400" /><span className="text-xs text-slate-400">Total Activities</span></div>
                <p className="text-2xl font-bold text-white">{kpis?.totalActivities ?? 0}</p>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-lg border border-cyan-400/20 bg-slate-950/50 p-4">
                <div className="flex items-center gap-2 mb-1"><Clock className="h-4 w-4 text-blue-400" /><span className="text-xs text-slate-400">Last 24h</span></div>
                <p className="text-2xl font-bold text-white">{kpis?.last24hCount ?? 0}</p>
              </motion.div>
            </div>
          </div>
        </section>

        <SectionSeparator />

        <section className="relative w-full bg-slate-950/30">
          <PageHeader title="Activity by Type" description="PR opened, review, comment, status change, commit" sectionId="by-type" className="bg-slate-950/30" />
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-6">
            <div className="rounded-lg border border-cyan-400/20 bg-slate-950/50 p-4">
              <div className="flex flex-wrap gap-3">
                {byType.map((item) => (
                  <div key={item.actionType} className="rounded-lg bg-slate-900/50 px-4 py-2 flex items-center justify-between gap-4 min-w-[140px]">
                    <span className="text-sm text-slate-300">{item.actionType}</span>
                    <span className="text-lg font-bold text-cyan-300">{item.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <SectionSeparator />

        <section className="relative w-full bg-slate-950/30">
          <PageHeader title="Activity by Repository" sectionId="by-repo" className="bg-slate-950/30" />
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-6">
            <div className="rounded-lg border border-cyan-400/20 bg-slate-950/50 p-4">
              <div className="flex flex-wrap gap-3">
                {byRepo.map((item) => (
                  <div key={item.repo} className="rounded-lg bg-slate-900/50 px-4 py-2 flex items-center justify-between gap-4 min-w-[160px]">
                    <span className="text-sm text-slate-300 truncate">{item.repo}</span>
                    <span className="text-lg font-bold text-cyan-300">{item.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <SectionSeparator />

        <section className="relative w-full bg-slate-950/30">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 pb-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <PageHeader title="Contributor Rankings" description="Sortable leaderboard" sectionId="rankings" className="bg-transparent p-0" />
              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="rounded-lg border border-cyan-400/20 bg-slate-950/50 px-3 py-1.5 text-sm text-white"
                >
                  <option value="total">Total actions</option>
                  <option value="reviews">Reviews</option>
                  <option value="status_changes">Status changes</option>
                  <option value="prs_authored">PRs authored</option>
                  <option value="prs_reviewed">PRs reviewed</option>
                </select>
                <button onClick={downloadRankingsCSV} className="flex items-center gap-1.5 rounded-lg border border-cyan-400/20 bg-slate-900/50 px-3 py-1.5 text-xs font-medium text-cyan-300">
                  <Download className="h-3.5 w-3.5" /> CSV
                </button>
              </div>
            </div>
            <div className="rounded-lg border border-cyan-400/20 bg-slate-950/50 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cyan-400/20 bg-slate-900/50">
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">#</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Actor</th>
                    <th className="text-right py-3 px-4 text-slate-400 font-medium">Total</th>
                    <th className="text-right py-3 px-4 text-slate-400 font-medium">Reviews</th>
                    <th className="text-right py-3 px-4 text-slate-400 font-medium">Status changes</th>
                    <th className="text-right py-3 px-4 text-slate-400 font-medium">PRs authored</th>
                    <th className="text-right py-3 px-4 text-slate-400 font-medium">PRs reviewed</th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((r, i) => (
                    <tr key={r.actor} className="border-b border-slate-800/50 hover:bg-slate-900/30">
                      <td className="py-2 px-4 text-slate-500">{i + 1}</td>
                      <td className="py-2 px-4">
                        <Link href={`/analytics/contributors/${encodeURIComponent(r.actor)}`} className="text-cyan-300 hover:underline font-medium">
                          {r.actor}
                        </Link>
                      </td>
                      <td className="py-2 px-4 text-right text-white">{r.total.toLocaleString()}</td>
                      <td className="py-2 px-4 text-right text-slate-300">{r.reviews.toLocaleString()}</td>
                      <td className="py-2 px-4 text-right text-slate-300">{r.statusChanges.toLocaleString()}</td>
                      <td className="py-2 px-4 text-right text-slate-300">{r.prsAuthored.toLocaleString()}</td>
                      <td className="py-2 px-4 text-right text-slate-300">{r.prsReviewed.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <SectionSeparator />

        <section className="relative w-full bg-slate-950/30">
          <PageHeader title="Live Activity Feed" description="Last 24–48h, chronological" sectionId="feed" className="bg-slate-950/30" />
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-6">
            <div className="rounded-lg border border-cyan-400/20 bg-slate-950/50 divide-y divide-slate-800/50 max-h-[400px] overflow-y-auto">
              {liveFeed.map((a, index) => (
                <div key={`${a.actor}-${a.occurredAt}-${a.prNumber}-${index}`} className="flex items-center justify-between gap-4 py-2 px-4 text-sm">
                  <span className="text-cyan-300 font-medium">{a.actor}</span>
                  <span className="text-slate-400">{a.actionType}</span>
                  <span className="text-slate-500">PR #{a.prNumber}</span>
                  <span className="text-slate-500">{a.repo ?? '—'}</span>
                  <span className="text-slate-500 text-xs">{new Date(a.occurredAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
