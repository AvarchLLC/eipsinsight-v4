"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { client } from "@/lib/orpc";
import {
  Loader2, ArrowLeft, Search, ArrowRight, CheckCircle2, Clock,
  FileCode, GitPullRequest, Calendar, Tag, AlertTriangle,
  ExternalLink, GitCommit,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  Draft: "#22d3ee", Review: "#60a5fa", "Last Call": "#fbbf24",
  Final: "#34d399", Living: "#a78bfa", Stagnant: "#94a3b8", Withdrawn: "#ef4444",
};

interface TimelineData {
  eipNumber: number;
  title: string | null;
  author: string | null;
  currentStatus: string | null;
  type: string | null;
  category: string | null;
  createdAt: string | null;
  repo: string;
  statusEvents: Array<{ from: string | null; to: string; date: string; prNumber: number | null; commitSha: string }>;
  categoryEvents: Array<{ from: string | null; to: string; date: string }>;
  deadlineEvents: Array<{ previous: string | null; newDeadline: string | null; date: string }>;
  linkedPRs: Array<{
    prNumber: number; title: string | null; author: string | null;
    state: string | null; mergedAt: string | null; createdAt: string | null;
    commits: number; files: number; repo: string;
  }>;
}

function TimelineContent() {
  const searchParams = useSearchParams();
  const initialEip = searchParams.get("eip") || "";

  const [query, setQuery] = useState(initialEip);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TimelineData | null>(null);

  const handleSearch = async (num?: number) => {
    const eipNum = num ?? parseInt(query.replace(/[^0-9]/g, ""), 10);
    if (isNaN(eipNum)) { setError("Enter a valid EIP number"); return; }

    setError(null);
    setLoading(true);
    try {
      const result = await client.tools.getEIPFullTimeline({ eipNumber: eipNum });
      if (!result.title && result.statusEvents.length === 0) {
        setError(`No data found for EIP-${eipNum}`);
        setData(null);
      } else {
        setData(result);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load timeline.");
      setData(null);
    } finally { setLoading(false); }
  };

  // Auto-search if URL has ?eip=
  useEffect(() => {
    if (initialEip) {
      const num = parseInt(initialEip, 10);
      if (!isNaN(num)) handleSearch(num);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Build unified chronological timeline
  const timeline = useMemo(() => {
    if (!data) return [];
    const events: Array<{
      date: string; type: string; icon: typeof CheckCircle2;
      title: string; detail: string; color: string; meta?: string;
    }> = [];

    if (data.createdAt) {
      events.push({
        date: data.createdAt, type: "created", icon: Calendar,
        title: "EIP Created", detail: `EIP-${data.eipNumber} authored by ${data.author || "unknown"}`,
        color: "#22d3ee",
      });
    }

    data.statusEvents.forEach((e) => {
      events.push({
        date: e.date, type: "status", icon: CheckCircle2,
        title: `Status: ${e.from ? `${e.from} → ` : ""}${e.to}`,
        detail: e.prNumber ? `via PR #${e.prNumber}` : "via commit",
        color: STATUS_COLORS[e.to] ?? "#94a3b8",
        meta: e.commitSha?.slice(0, 8),
      });
    });

    data.categoryEvents.forEach((e) => {
      events.push({
        date: e.date, type: "category", icon: Tag,
        title: `Category: ${e.from ? `${e.from} → ` : ""}${e.to}`,
        detail: "Category change", color: "#a78bfa",
      });
    });

    data.deadlineEvents.forEach((e) => {
      events.push({
        date: e.date, type: "deadline", icon: Clock,
        title: `Deadline ${e.previous ? `${e.previous} → ` : "set to "}${e.newDeadline ?? "removed"}`,
        detail: "Deadline update", color: "#fbbf24",
      });
    });

    data.linkedPRs.forEach((pr) => {
      if (pr.createdAt) {
        events.push({
          date: pr.createdAt, type: "pr", icon: GitPullRequest,
          title: `PR #${pr.prNumber} opened`,
          detail: pr.title || "Untitled PR",
          color: pr.mergedAt ? "#34d399" : pr.state === "open" ? "#22d3ee" : "#94a3b8",
          meta: `${pr.commits} commits, ${pr.files} files`,
        });
      }
      if (pr.mergedAt) {
        events.push({
          date: pr.mergedAt, type: "pr-merged", icon: GitCommit,
          title: `PR #${pr.prNumber} merged`,
          detail: pr.title || "Untitled PR",
          color: "#34d399",
        });
      }
    });

    return events.sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/30 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3">
          <Link href="/tools" className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-2">
            <ArrowLeft className="h-4 w-4" />Back to Tools
          </Link>
          <h1 className="dec-title bg-linear-to-br from-emerald-600 via-slate-700 to-cyan-600 dark:from-emerald-300 dark:via-slate-100 dark:to-cyan-200 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">EIP Status & Commit Timeline</h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Full lifecycle of any EIP — status changes, category shifts, deadlines, and linked PRs.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        {/* Search */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/40 p-5 backdrop-blur-sm">
          <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2 block">Enter an EIP / ERC / RIP number</label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600 dark:text-slate-400" />
              <input
                type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="e.g. 1559, 4844, 20"
                className="w-full pl-11 pr-4 py-3 text-sm bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
              />
            </div>
            <button onClick={() => handleSearch()} disabled={loading || !query.trim()}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-slate-900 dark:text-white bg-cyan-500/20 border border-cyan-500/40 rounded-lg hover:bg-cyan-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Search
            </button>
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400 mt-2">{error}</p>}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-cyan-500" /></div>
        )}

        {data && !loading && (
          <>
            {/* EIP Header */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/40 p-5 backdrop-blur-sm">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">EIP-{data.eipNumber}</h2>
                  <p className="text-base text-slate-700 dark:text-slate-300">{data.title ?? "Untitled"}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Author: {data.author ?? "Unknown"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.currentStatus && (
                    <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium"
                      style={{ backgroundColor: `${STATUS_COLORS[data.currentStatus] ?? "#94a3b8"}20`, color: STATUS_COLORS[data.currentStatus] ?? "#94a3b8", border: `1px solid ${STATUS_COLORS[data.currentStatus] ?? "#94a3b8"}40` }}>
                      {data.currentStatus}
                    </span>
                  )}
                  {data.type && <span className="text-xs px-2 py-1 rounded-md bg-slate-200 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600/30">{data.type}</span>}
                  {data.category && <span className="text-xs px-2 py-1 rounded-md bg-slate-200 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600/30">{data.category}</span>}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 pt-5 border-t border-slate-200 dark:border-slate-700/50">
                <div><p className="text-xs text-slate-500 dark:text-slate-400">Created</p><p className="text-sm text-slate-900 dark:text-white">{data.createdAt ?? "—"}</p></div>
                <div><p className="text-xs text-slate-500 dark:text-slate-400">Repo</p><p className="text-sm text-slate-900 dark:text-white uppercase">{data.repo}</p></div>
                <div><p className="text-xs text-slate-500 dark:text-slate-400">Status Changes</p><p className="text-sm text-slate-900 dark:text-white">{data.statusEvents.length}</p></div>
                <div><p className="text-xs text-slate-500 dark:text-slate-400">Linked PRs</p><p className="text-sm text-slate-900 dark:text-white">{data.linkedPRs.length}</p></div>
              </div>
            </div>

            {/* Unified Timeline */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/40 p-5 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Full Timeline</h3>
              <div className="relative">
                <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700/50" />
                <div className="space-y-4">
                  {timeline.length === 0 ? (
                    <p className="text-slate-600 dark:text-slate-400 text-sm pl-14">No events recorded</p>
                  ) : timeline.map((event, i) => {
                    const Icon = event.icon;
                    return (
                      <div key={i} className="flex gap-4">
                        <div className="relative z-10 shrink-0">
                          <div className="h-10 w-10 rounded-full flex items-center justify-center border"
                            style={{ backgroundColor: `${event.color}15`, borderColor: `${event.color}40` }}>
                            <Icon className="h-4 w-4" style={{ color: event.color }} />
                          </div>
                        </div>
                        <div className="flex-1 pt-1.5">
                          <p className="text-sm text-slate-900 dark:text-white font-medium">{event.title}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{event.detail}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">{event.date}</span>
                            {event.meta && (
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800/50 px-1.5 py-0.5 rounded">{event.meta}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Linked PRs Table */}
            {data.linkedPRs.length > 0 && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/40 backdrop-blur-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700/50">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Linked Pull Requests</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700/50 bg-slate-100 dark:bg-slate-800/20">
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400">PR</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400">Title</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400">Author</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400">State</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 dark:text-slate-400">Commits</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 dark:text-slate-400">Files</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.linkedPRs.map((pr) => (
                        <tr key={pr.prNumber} className="border-b border-slate-200 dark:border-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800/30">
                          <td className="px-4 py-3">
                            <a href={`https://github.com/${pr.repo}/pull/${pr.prNumber}`} target="_blank" rel="noopener noreferrer"
                              className="text-cyan-700 dark:text-cyan-300 font-medium hover:text-cyan-800 dark:hover:text-cyan-200 inline-flex items-center gap-1">
                              #{pr.prNumber} <ExternalLink className="h-3 w-3" />
                            </a>
                          </td>
                          <td className="px-4 py-3 text-slate-800 dark:text-slate-200 max-w-[200px] truncate">{pr.title ?? "—"}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs">{pr.author ?? "—"}</td>
                          <td className="px-4 py-3">
                            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full",
                              pr.mergedAt ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" :
                              pr.state === "open" ? "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300" :
                              "bg-slate-500/20 text-slate-700 dark:text-slate-300"
                            )}>{pr.mergedAt ? "Merged" : pr.state ?? "—"}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{pr.commits}</td>
                          <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{pr.files}</td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">{pr.createdAt ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {!data && !loading && !error && (
          <div className="text-center py-16">
            <Clock className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <p className="text-lg text-slate-600 dark:text-slate-400">Search for an EIP to explore its full timeline</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Every status change, commit, and PR — in chronological order</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TimelinePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-cyan-500" /></div>}>
      <TimelineContent />
    </Suspense>
  );
}
