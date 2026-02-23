"use client";

import React, { useState } from "react";
import { client } from "@/lib/orpc";
import {
  Loader2, ArrowLeft, Search, ArrowRight, GitPullRequest,
  MessageSquare, Eye, FileCode, Clock, CheckCircle2, AlertTriangle,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  Draft: "#22d3ee", Review: "#60a5fa", "Last Call": "#fbbf24",
  Final: "#34d399", Living: "#a78bfa", Stagnant: "#94a3b8", Withdrawn: "#ef4444",
};

interface EIPTimeline {
  eipNumber: number;
  title: string | null;
  author: string | null;
  createdAt: string | null;
  currentStatus: string | null;
  currentType: string | null;
  currentCategory: string | null;
  deadline: string | null;
  lastUpdated: string | null;
  statusEvents: Array<{ from: string | null; to: string; date: string; prNumber: number | null }>;
  categoryEvents: Array<{ from: string | null; to: string; date: string }>;
  deadlineEvents: Array<{ previous: string | null; newDeadline: string | null; date: string }>;
  linkedPRs: Array<{
    prNumber: number; title: string | null; author: string | null;
    state: string | null; mergedAt: string | null;
    comments: number; reviews: number; commits: number; files: number;
    createdAt: string | null;
  }>;
}

export default function EditorialCommentaryPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<EIPTimeline | null>(null);

  const handleSearch = async () => {
    const num = parseInt(query.replace(/[^0-9]/g, ""), 10);
    if (isNaN(num)) {
      setError("Please enter a valid EIP number (e.g., 1559 or EIP-1559)");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await client.insights.getEIPTimeline({ eipNumber: num });
      if (!result.title && result.statusEvents.length === 0 && result.linkedPRs.length === 0) {
        setError(`No data found for EIP-${num}`);
        setTimeline(null);
      } else {
        setTimeline(result);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch EIP data. Please try again.");
      setTimeline(null);
    } finally {
      setLoading(false);
    }
  };

  // Merge all events into unified timeline
  const unifiedTimeline = React.useMemo(() => {
    if (!timeline) return [];
    const events: Array<{ date: string; type: string; description: string; color: string }> = [];

    if (timeline.createdAt) {
      events.push({ date: timeline.createdAt, type: "created", description: "EIP created", color: "#22d3ee" });
    }

    timeline.statusEvents.forEach((e) => {
      events.push({
        date: e.date,
        type: "status",
        description: e.from ? `${e.from} → ${e.to}` : `Set to ${e.to}`,
        color: STATUS_COLORS[e.to] ?? "#94a3b8",
      });
    });

    timeline.categoryEvents.forEach((e) => {
      events.push({
        date: e.date,
        type: "category",
        description: e.from ? `Category: ${e.from} → ${e.to}` : `Category set to ${e.to}`,
        color: "#a78bfa",
      });
    });

    timeline.deadlineEvents.forEach((e) => {
      events.push({
        date: e.date,
        type: "deadline",
        description: `Deadline ${e.previous ? `${e.previous} → ` : ""}${e.newDeadline ?? "removed"}`,
        color: "#fbbf24",
      });
    });

    return events.sort((a, b) => a.date.localeCompare(b.date));
  }, [timeline]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="border-b border-slate-200 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/30 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <Link href="/insights" className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-3">
            <ArrowLeft className="h-4 w-4" />Back to Insights
          </Link>
          <h1 className="dec-title bg-linear-to-br from-emerald-600 via-slate-700 to-cyan-600 dark:from-emerald-300 dark:via-slate-100 dark:to-cyan-200 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">Editorial Commentary</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Deep dive into a specific EIP — its timeline, linked PRs, and lifecycle.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
        {/* Search Box */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/40 p-6 backdrop-blur-sm">
          <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3 block">
            Enter an EIP number
          </label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600 dark:text-slate-400" />
              <input
                type="text"
                placeholder="e.g., 1559, EIP-4844, 20..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full pl-11 pr-4 py-3 text-sm bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-slate-900 dark:text-white bg-cyan-500/20 border border-cyan-500/40 rounded-lg hover:bg-cyan-500/30 hover:border-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Search
            </button>
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400 mt-3">{error}</p>}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-cyan-500" /></div>
        )}

        {timeline && !loading && (
          <>
            {/* EIP Header Card */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/40 p-6 backdrop-blur-sm">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                    EIP-{timeline.eipNumber}
                  </h2>
                  <p className="text-lg text-slate-700 dark:text-slate-300 mb-3">{timeline.title ?? "Untitled"}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Author: {timeline.author ?? "Unknown"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {timeline.currentStatus && (
                    <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium" style={{ backgroundColor: `${STATUS_COLORS[timeline.currentStatus] ?? "#94a3b8"}20`, color: STATUS_COLORS[timeline.currentStatus] ?? "#94a3b8", border: `1px solid ${STATUS_COLORS[timeline.currentStatus] ?? "#94a3b8"}40` }}>
                      {timeline.currentStatus}
                    </span>
                  )}
                  {timeline.currentType && <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-slate-200 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600/30">{timeline.currentType}</span>}
                  {timeline.currentCategory && <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-slate-200 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600/30">{timeline.currentCategory}</span>}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-200 dark:border-slate-700/50">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Created</p>
                  <p className="text-sm text-slate-900 dark:text-white">{timeline.createdAt ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Last Updated</p>
                  <p className="text-sm text-slate-900 dark:text-white">{timeline.lastUpdated ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Deadline</p>
                  <p className="text-sm text-slate-900 dark:text-white">{timeline.deadline ?? "None"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Linked PRs</p>
                  <p className="text-sm text-slate-900 dark:text-white">{timeline.linkedPRs.length}</p>
                </div>
              </div>
            </div>

            {/* Progress Timeline */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/40 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Progress Timeline</h3>
              <div className="relative">
                <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700/50" />
                <div className="space-y-4">
                  {unifiedTimeline.length === 0 ? (
                    <p className="text-slate-600 dark:text-slate-400 text-sm pl-14">No timeline events</p>
                  ) : unifiedTimeline.map((event, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="relative z-10 shrink-0">
                        <div className="h-10 w-10 rounded-full flex items-center justify-center border" style={{ backgroundColor: `${event.color}20`, borderColor: `${event.color}40` }}>
                          {event.type === "status" && <CheckCircle2 className="h-4 w-4" style={{ color: event.color }} />}
                          {event.type === "category" && <FileCode className="h-4 w-4" style={{ color: event.color }} />}
                          {event.type === "deadline" && <Clock className="h-4 w-4" style={{ color: event.color }} />}
                          {event.type === "created" && <Calendar className="h-4 w-4" style={{ color: event.color }} />}
                        </div>
                      </div>
                      <div className="flex-1 pt-2">
                        <p className="text-sm text-slate-900 dark:text-white font-medium">{event.description}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{event.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Checks Panel */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/40 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Checks</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-100 dark:bg-slate-800/30">
                  {timeline.currentStatus ? <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /> : <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
                  <div><p className="text-sm text-slate-900 dark:text-white">Valid Status</p><p className="text-xs text-slate-600 dark:text-slate-400">{timeline.currentStatus ?? "Missing"}</p></div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-100 dark:bg-slate-800/30">
                  {timeline.deadline ? <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /> : <AlertTriangle className="h-5 w-5 text-slate-500 dark:text-slate-400" />}
                  <div><p className="text-sm text-slate-900 dark:text-white">Has Deadline</p><p className="text-xs text-slate-600 dark:text-slate-400">{timeline.deadline ?? "Not set"}</p></div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-100 dark:bg-slate-800/30">
                  {timeline.statusEvents.length > 1 ? <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /> : <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
                  <div><p className="text-sm text-slate-900 dark:text-white">Status Transitions</p><p className="text-xs text-slate-600 dark:text-slate-400">{timeline.statusEvents.length} transitions</p></div>
                </div>
              </div>
            </div>

            {/* Linked PRs */}
            {timeline.linkedPRs.length > 0 && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/40 backdrop-blur-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700/50">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Linked Pull Requests</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700/50 bg-slate-100 dark:bg-slate-800/20">
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400">PR #</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400">Title</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400">State</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 dark:text-slate-400"><MessageSquare className="h-3 w-3 inline" /></th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 dark:text-slate-400"><Eye className="h-3 w-3 inline" /></th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 dark:text-slate-400"><GitPullRequest className="h-3 w-3 inline" /></th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 dark:text-slate-400"><FileCode className="h-3 w-3 inline" /></th>
                      </tr>
                    </thead>
                    <tbody>
                      {timeline.linkedPRs.map((pr) => (
                        <tr key={pr.prNumber} className="border-b border-slate-200 dark:border-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800/30">
                          <td className="px-4 py-3 text-cyan-700 dark:text-cyan-300 font-medium">#{pr.prNumber}</td>
                          <td className="px-4 py-3 text-slate-800 dark:text-slate-200 max-w-[250px] truncate">{pr.title ?? "—"}</td>
                          <td className="px-4 py-3">
                            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full",
                              pr.mergedAt ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" :
                              pr.state === "open" ? "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300" :
                              "bg-slate-500/20 text-slate-700 dark:text-slate-300"
                            )}>{pr.mergedAt ? "Merged" : pr.state ?? "—"}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{pr.comments}</td>
                          <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{pr.reviews}</td>
                          <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{pr.commits}</td>
                          <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{pr.files}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {!timeline && !loading && !error && (
          <div className="text-center py-16">
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-2">Search for an EIP to see its full story</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Try EIP-1559, EIP-4844, or ERC-20</p>
          </div>
        )}
      </div>
    </div>
  );
}
