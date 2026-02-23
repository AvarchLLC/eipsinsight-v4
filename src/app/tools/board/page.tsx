"use client";

import React, { useState, useEffect } from "react";
import { client } from "@/lib/orpc";
import {
  ArrowLeft, Search, X, ExternalLink,
  ChevronLeft, ChevronRight, Flame, AlertTriangle, Minus,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/* ─── Types ─── */
type PRRow = {
  prNumber: number; title: string | null; author: string | null;
  createdAt: string; labels: string[]; repo: string; repoShort: string;
  govState: string; waitDays: number; processType: string;
};
type BoardData = {
  total: number; page: number; pageSize: number; totalPages: number;
  rows: PRRow[];
};
type StatsData = {
  processTypes: { type: string; count: number }[];
  govStates: { state: string; label: string; count: number }[];
  totalOpen: number;
};

/* ─── Constants ─── */
const GOV_STATES = [
  { state: "WAITING_ON_EDITOR", label: "Awaiting Editor", icon: "⏳", bg: "bg-cyan-500/10", text: "text-cyan-700 dark:text-cyan-300", border: "border-cyan-500/30" },
  { state: "WAITING_ON_AUTHOR", label: "Waiting on Author", icon: "✍️", bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-300", border: "border-amber-500/30" },
  { state: "STALLED", label: "Stalled", icon: "🔴", bg: "bg-red-500/10", text: "text-red-700 dark:text-red-300", border: "border-red-500/30" },
  { state: "DRAFT", label: "Draft PR", icon: "📝", bg: "bg-slate-500/10", text: "text-slate-700 dark:text-slate-300", border: "border-slate-500/30" },
  { state: "NO_STATE", label: "Uncategorized", icon: "❓", bg: "bg-slate-500/10", text: "text-slate-600 dark:text-slate-400", border: "border-slate-300 dark:border-slate-600/30" },
];

const PT_COLORS: Record<string, string> = {
  Typo: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20",
  "NEW EIP": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  Website: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/20",
  "EIP-1": "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/20",
  Tooling: "bg-orange-500/15 text-orange-300 border-orange-500/20",
  "Status Change": "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/20",
  Other: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/20",
};

/* ─── Helpers ─── */
function getLabelColor(label: string): string {
  if (label.startsWith("c-")) return "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300";
  if (label.startsWith("t-")) return "bg-blue-500/15 text-blue-700 dark:text-blue-300";
  if (label.startsWith("w-")) return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  if (label.startsWith("e-")) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  if (label.startsWith("a-")) return "bg-purple-500/15 text-purple-700 dark:text-purple-300";
  if (label === "dependencies" || label === "ruby") return "bg-orange-500/15 text-orange-300";
  return "bg-slate-500/15 text-slate-700 dark:text-slate-300";
}

function fmtWait(days: number): string {
  if (days >= 7) {
    const w = Math.floor(days / 7);
    return `${w} week${w !== 1 ? "s" : ""}`;
  }
  return `${days} day${days !== 1 ? "s" : ""}`;
}

function fmtDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function priorityOf(days: number) {
  if (days > 28) return { label: "High", color: "text-red-600 dark:text-red-400", Icon: Flame };
  if (days > 7) return { label: "Medium", color: "text-amber-600 dark:text-amber-400", Icon: AlertTriangle };
  return { label: "Low", color: "text-emerald-600 dark:text-emerald-400", Icon: Minus };
}

/* ─── Component ─── */
export default function BoardPage() {
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [repo, setRepo] = useState("");
  const [govState, setGovState] = useState("WAITING_ON_EDITOR");
  const [processType, setProcessType] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<BoardData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  type RepoType = 'eips' | 'ercs' | 'rips';
  const typedRepo: RepoType | undefined = repo === 'eips' || repo === 'ercs' || repo === 'rips' ? (repo as RepoType) : undefined;

  /* Fetch stats */
  useEffect(() => {
    setStatsLoading(true);
    client.tools
      .getOpenPRBoardStats({
        repo: typedRepo,
        govState: govState || undefined,
        search: search || undefined,
      })
      .then(setStats)
      .catch(console.error)
      .finally(() => setStatsLoading(false));
  }, [typedRepo, govState, search]);

  /* Fetch board rows */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const d = await client.tools.getOpenPRBoard({
          repo: typedRepo,
          govState: govState || undefined,
          processType: processType || undefined,
          search: search || undefined,
          page,
          pageSize: 10,
        });
        setData(d);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [typedRepo, govState, processType, search, page]);

  const now = new Date();
  const monthLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const monthShort = now.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  const totalMatching = data?.total ?? 0;
  const startIdx = totalMatching > 0 ? (page - 1) * 10 + 1 : 0;
  const endIdx = Math.min(page * 10, totalMatching);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* ─── Sticky Header ─── */}
      <div className="border-b border-slate-200 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/30 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3">
          <Link
            href="/tools"
            className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Tools
          </Link>
          <h1 className="dec-title bg-linear-to-br from-emerald-600 via-slate-700 to-cyan-600 dark:from-emerald-300 dark:via-slate-100 dark:to-cyan-200 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">EIP / ERC / RIP Board</h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 max-w-2xl">
            Open pull requests by type and status for the selected month. Filter
            by repo, process type, and participant status. Mission control for
            protocol changes.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-5 space-y-5">
        {/* ─── Scope ─── */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-widest">
              Scope
            </span>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Open PRs for{" "}
              <span className="font-semibold text-slate-900 dark:text-white">{monthLabel}</span>
            </p>
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg px-3 py-1.5 select-none">
            {monthShort}
          </div>
        </div>

        {/* ─── Priority Filters (Governance State) ─── */}
        <div className="space-y-2">
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-widest">
            Priority Filters
          </div>
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-slate-600 dark:text-slate-400 font-medium mr-1">PR Status</span>
            <button
              onClick={() => { setGovState(""); setPage(1); }}
              className={cn(
                "px-3 py-1.5 rounded-lg border transition-colors",
                !govState
                  ? "bg-white/10 border-white/20 text-slate-900 dark:text-white"
                  : "bg-slate-100 dark:bg-slate-800/30 border-slate-700/30 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-600/50",
              )}
            >
              All{" "}
              {stats && (
                <span className="opacity-60">
                  ({stats.totalOpen.toLocaleString()})
                </span>
              )}
            </button>
            {GOV_STATES.map((gs) => {
              const count =
                stats?.govStates.find((s) => s.state === gs.state)?.count ?? 0;
              const active = govState === gs.state;
              return (
                <button
                  key={gs.state}
                  onClick={() => {
                    setGovState(active ? "" : gs.state);
                    setProcessType("");
                    setPage(1);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap",
                    active
                      ? `${gs.bg} ${gs.border} ${gs.text}`
                      : "bg-slate-100 dark:bg-slate-800/30 border-slate-700/30 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-600/50",
                  )}
                >
                  {gs.icon} {gs.label}
                  {count > 0 && (
                    <span className="ml-1 opacity-70">({count})</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Content Filters ─── */}
        <div className="space-y-2">
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-widest">
            Content Filters
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search title, author, PR #"
                className="pl-8 pr-8 py-1.5 text-xs bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 w-64"
              />
              {search && (
                <button
                  onClick={() => { setSearch(""); setPage(1); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2"
                >
                  <X className="h-3 w-3 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white" />
                </button>
              )}
            </div>
            {/* Process type */}
            <select
              value={processType}
              onChange={(e) => { setProcessType(e.target.value); setPage(1); }}
              className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-cyan-500/50"
            >
              <option value="">Process type</option>
              {(stats?.processTypes ?? []).map((pt) => (
                <option key={pt.type} value={pt.type}>
                  {pt.type} ({pt.count})
                </option>
              ))}
            </select>
            {/* Repo */}
            <select
              value={repo}
              onChange={(e) => { setRepo(e.target.value); setPage(1); }}
              className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-cyan-500/50"
            >
              <option value="">All Repos</option>
              <option value="eips">EIPs</option>
              <option value="ercs">ERCs</option>
              <option value="rips">RIPs</option>
            </select>
            {/* Matching count */}
            <span className="text-xs text-slate-500 dark:text-slate-400 ml-auto font-medium tabular-nums">
              <span className="text-cyan-600 dark:text-cyan-400 font-semibold">
                {totalMatching.toLocaleString()}
              </span>{" "}
              matching
            </span>
          </div>
        </div>

        {/* ─── Process Type Breakdown Chips ─── */}
        {!statsLoading && stats && stats.processTypes.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-widest">
              PR Breakdown
            </div>
            <div className="flex flex-wrap gap-2">
              {stats.processTypes.map((pt) => {
                const active = processType === pt.type;
                return (
                  <button
                    key={pt.type}
                    onClick={() => {
                      setProcessType(active ? "" : pt.type);
                      setPage(1);
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors",
                      active
                        ? PT_COLORS[pt.type] ?? PT_COLORS.Other
                        : "bg-slate-100 dark:bg-slate-800/30 border-slate-700/30 text-slate-600 dark:text-slate-400 hover:border-slate-600/50 hover:text-slate-800 dark:text-slate-200",
                    )}
                  >
                    {pt.type}{" "}
                    <span className="opacity-70">({pt.count})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Table ─── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing{" "}
              <span className="text-slate-700 dark:text-slate-300">
                {startIdx}–{endIdx}
              </span>{" "}
              of{" "}
              <span className="text-slate-700 dark:text-slate-300">
                {totalMatching.toLocaleString()}
              </span>{" "}
              PRs
            </p>
            <p className="text-[10px] text-slate-600">10 per page</p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800/50 bg-slate-900/30 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800/50 bg-slate-900/50">
                    <Th w="w-10">#</Th>
                    <Th w="w-16">🔥</Th>
                    <Th w="w-20">PR</Th>
                    <Th>Title</Th>
                    <Th w="w-28">Created</Th>
                    <Th w="w-28">Wait</Th>
                    <Th w="w-28">Process</Th>
                    <Th w="w-36">PR Status</Th>
                    <Th w="w-52">Labels</Th>
                    <Th w="w-16" center>
                      Link
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <SkeletonRows />
                  ) : data?.rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="px-3 py-16 text-center text-slate-500 dark:text-slate-400"
                      >
                        No PRs match the current filters.
                      </td>
                    </tr>
                  ) : (
                    data?.rows.map((row, idx) => {
                      const p = priorityOf(row.waitDays);
                      const gsConf =
                        GOV_STATES.find((g) => g.state === row.govState) ??
                        GOV_STATES[4];
                      const labels = row.labels ?? [];
                      const showLabels = labels.slice(0, 3);
                      const extra = labels.length - showLabels.length;

                      return (
                        <tr
                          key={`${row.repo}-${row.prNumber}`}
                          className="border-b border-slate-800/30 hover:bg-slate-100 dark:bg-slate-800/20 transition-colors"
                        >
                          {/* # */}
                          <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                            {startIdx + idx}
                          </td>
                          {/* Priority */}
                          <td className="px-3 py-2.5">
                            <span
                              className={cn(
                                "inline-flex items-center gap-0.5 font-semibold",
                                p.color,
                              )}
                            >
                              <p.Icon className="h-3 w-3" />
                              {p.label}
                            </span>
                          </td>
                          {/* PR # */}
                          <td className="px-3 py-2.5 font-mono font-semibold text-cyan-700 dark:text-cyan-300">
                            #{row.prNumber}
                          </td>
                          {/* Title + author */}
                          <td className="px-3 py-2.5">
                            <div className="max-w-md">
                              <p className="text-slate-800 dark:text-slate-200 truncate leading-snug">
                                {row.title || "Untitled"}
                              </p>
                              {row.author && (
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                  {row.author}
                                </p>
                              )}
                            </div>
                          </td>
                          {/* Created */}
                          <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {fmtDate(row.createdAt)}
                          </td>
                          {/* Wait */}
                          <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            ⏳ {fmtWait(row.waitDays)}
                          </td>
                          {/* Process type */}
                          <td className="px-3 py-2.5">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap",
                                PT_COLORS[row.processType] ?? PT_COLORS.Other,
                              )}
                            >
                              {row.processType}
                            </span>
                          </td>
                          {/* Gov status */}
                          <td className="px-3 py-2.5">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap",
                                gsConf.bg,
                                gsConf.text,
                                gsConf.border,
                              )}
                            >
                              {gsConf.label}
                            </span>
                          </td>
                          {/* Labels */}
                          <td className="px-3 py-2.5">
                            <div className="flex flex-wrap gap-1">
                              {showLabels.map((l) => (
                                <span
                                  key={l}
                                  className={cn(
                                    "px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap",
                                    getLabelColor(l),
                                  )}
                                >
                                  {l}
                                </span>
                              ))}
                              {extra > 0 && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400">
                                  +{extra}
                                </span>
                              )}
                            </div>
                          </td>
                          {/* Link */}
                          <td className="px-3 py-2.5 text-center">
                            <a
                              href={`https://github.com/${row.repo}/pull/${row.prNumber}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/50 border border-slate-700/30 text-[10px] text-cyan-700 dark:text-cyan-300 hover:bg-slate-200 dark:hover:bg-slate-200 dark:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white transition-colors"
                            >
                              Open
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── Pagination ─── */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Page{" "}
                <span className="text-slate-700 dark:text-slate-300">{page}</span> of{" "}
                <span className="text-slate-700 dark:text-slate-300">{data.totalPages}</span>
              </p>
              <div className="flex items-center gap-1.5">
                <PgBtn
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </PgBtn>
                {pageRange(page, data.totalPages).map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={cn(
                      "w-7 h-7 rounded-lg text-xs font-medium transition-colors",
                      n === page
                        ? "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30"
                        : "bg-slate-100 dark:bg-slate-800/30 text-slate-600 dark:text-slate-400 border border-slate-700/30 hover:text-slate-900 dark:hover:text-white hover:border-slate-600/50",
                    )}
                  >
                    {n}
                  </button>
                ))}
                <PgBtn
                  disabled={page === data.totalPages}
                  onClick={() =>
                    setPage((p) => Math.min(data.totalPages, p + 1))
                  }
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </PgBtn>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Small UI primitives ─── */

function Th({
  children,
  w,
  center,
}: {
  children: React.ReactNode;
  w?: string;
  center?: boolean;
}) {
  return (
    <th
      className={cn(
        "px-3 py-2.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider",
        center ? "text-center" : "text-left",
        w,
      )}
    >
      {children}
    </th>
  );
}

function PgBtn({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="p-1.5 rounded-lg border border-slate-700/30 bg-slate-100 dark:bg-slate-800/30 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-600/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 10 }).map((_, i) => (
        <tr key={i} className="border-b border-slate-800/30">
          {Array.from({ length: 10 }).map((_, j) => (
            <td key={j} className="px-3 py-3">
              <div
                className="h-3 bg-slate-100 dark:bg-slate-800/50 rounded animate-pulse"
                style={{ width: `${50 + ((i * 17 + j * 13) % 40)}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function pageRange(current: number, total: number): number[] {
  const size = Math.min(5, total);
  const start = Math.max(1, Math.min(current - 2, total - size + 1));
  return Array.from({ length: size }, (_, i) => start + i);
}
