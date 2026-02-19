"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { Search as SearchIcon, Filter, Loader2, ChevronDown, ChevronUp, ExternalLink, TrendingUp } from "lucide-react";
import { client } from "@/lib/orpc";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { PieChart, Pie, Label } from "recharts";
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type Scope = "all" | "eips" | "ercs" | "rips" | "prs" | "issues";
type TabKey = "eips" | "prs" | "people";

interface ProposalSearchResult {
  kind: "proposal";
  number: number;
  repo: "eip" | "erc" | "rip";
  title: string;
  status: string;
  category: string | null;
  type: string | null;
  author: string | null;
  score: number;
}

interface PRSearchResult {
  kind: "pr";
  prNumber: number;
  repo: string;
  title: string | null;
  author: string | null;
  state: string | null;
  mergedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  labels: string[];
  governanceState: string | null;
}

interface IssueSearchResult {
  kind: "issue";
  issueNumber: number;
  repo: string;
  title: string | null;
  author: string | null;
  state: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  closedAt: string | null;
  labels: string[];
}

interface AuthorSearchResult {
  kind: "author";
  name: string;
  role: string | null;
  eipCount: number;
  prCount: number;
  issueCount: number;
  reviewCount: number;
  lastActivity: string | null;
}

const statusColorConfig: ChartConfig = {
  draft: { label: "Draft", color: "#22d3ee" },
  review: { label: "Review", color: "#60a5fa" },
  lastcall: { label: "Last Call", color: "#fbbf24" },
  final: { label: "Final", color: "#34d399" },
  other: { label: "Other", color: "#94a3b8" },
};

const SUGGESTED_QUERIES = [
  "ERC token standard",
  "Account abstraction",
  "blob transactions",
  "EIP-4844",
  "finalized ERCs",
  "stagnant proposals",
];

const TRENDING_TOPICS = [
  "ERC-4337",
  "Verkle Trees",
  "EOF proposals",
  "ERC-8000",
  "Account abstraction",
  "EIP-4844",
];

function useQueryState() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const scope = (searchParams.get("scope") as Scope | null) ?? "all";
  const tab = (searchParams.get("tab") as TabKey | null) ?? "eips";

  const setParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    const qs = params.toString();
    router.replace(qs ? `/search?${qs}` : "/search");
  };

  return {
    q,
    scope,
    tab,
    setQuery: (value: string) => setParam("q", value),
    setScope: (value: Scope) => setParam("scope", value),
    setTab: (value: TabKey) => setParam("tab", value),
  };
}

function SearchPageContent() {
  const { q, scope, tab, setQuery, setScope, setTab } = useQueryState();
  const [inputValue, setInputValue] = useState(q);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ProposalSearchResult[]>([]);
  const [prResults, setPrResults] = useState<PRSearchResult[]>([]);
  const [issueResults, setIssueResults] = useState<IssueSearchResult[]>([]);
  const [authorResults, setAuthorResults] = useState<AuthorSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [prIssueToggle, setPrIssueToggle] = useState<"prs" | "issues">("prs");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    setInputValue(q);
  }, [q]);

  // Debounced search: 300ms after typing, run search
  useEffect(() => {
    const trimmed = inputValue.trim();
    if (trimmed === q) return;
    const t = setTimeout(() => setQuery(trimmed), 300);
    return () => clearTimeout(t);
  }, [inputValue, q, setQuery]);

  const runSearch = useCallback((query: string) => {
    setInputValue(query);
    setQuery(query.trim());
  }, [setQuery]);

  // Fetch EIPs/ERCs/RIPs
  useEffect(() => {
    if (!q || tab !== "eips") {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await client.search.searchProposals({
          query: q,
          limit: 100,
        });

        if (cancelled) return;

        const filtered =
          scope === "all"
            ? data
            : data.filter((d) => {
                if (scope === "eips") return d.repo === "eip";
                if (scope === "ercs") return d.repo === "erc";
                if (scope === "rips") return d.repo === "rip";
                return true;
              });

        setResults(filtered as ProposalSearchResult[]);
      } catch (err) {
        console.error("Search failed", err);
        if (!cancelled) {
          setError("Search failed. Please try again.");
          setResults([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [q, scope, tab]);

  // Fetch PRs
  useEffect(() => {
    if (!q || tab !== "prs" || prIssueToggle !== "prs") {
      setPrResults([]);
      return;
    }

    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await client.search.searchPRs({
          query: q,
          limit: 100,
        });

        if (cancelled) return;
        setPrResults(data as PRSearchResult[]);
      } catch (err) {
        console.error("PR search failed", err);
        if (!cancelled) {
          setError("PR search failed. Please try again.");
          setPrResults([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [q, tab, prIssueToggle]);

  // Fetch Issues
  useEffect(() => {
    if (!q || tab !== "prs" || prIssueToggle !== "issues") {
      setIssueResults([]);
      return;
    }

    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await client.search.searchIssues({
          query: q,
          limit: 100,
        });

        if (cancelled) return;
        setIssueResults(data as IssueSearchResult[]);
      } catch (err) {
        console.error("Issue search failed", err);
        if (!cancelled) {
          setError("Issue search failed. Please try again.");
          setIssueResults([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [q, tab, prIssueToggle]);

  // Fetch Authors
  useEffect(() => {
    if (!q || tab !== "people") {
      setAuthorResults([]);
      return;
    }

    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await client.search.searchAuthors({
          query: q,
          limit: 100,
        });

        if (cancelled) return;
        setAuthorResults(data as AuthorSearchResult[]);
      } catch (err) {
        console.error("Author search failed", err);
        if (!cancelled) {
          setError("Author search failed. Please try again.");
          setAuthorResults([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [q, tab]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(inputValue.trim());
  };

  const statusBuckets = useMemo(() => {
    const buckets: Record<string, number> = {};
    for (const r of results) {
      const key = (r.status || "").toLowerCase();
      buckets[key] = (buckets[key] ?? 0) + 1;
    }
    const total = results.length || 1;
    const mapStatus = (s: string) => {
      if (s === "draft") return "draft";
      if (s === "review") return "review";
      if (s === "last call") return "lastcall";
      if (s === "final" || s === "living") return "final";
      return "other";
    };
    const grouped: Record<string, number> = {
      draft: 0,
      review: 0,
      lastcall: 0,
      final: 0,
      other: 0,
    };
    Object.entries(buckets).forEach(([key, count]) => {
      grouped[mapStatus(key)] += count;
    });
    return Object.entries(grouped).map(([key, count]) => ({
      key,
      value: count,
      percentage: (count / total) * 100,
    }));
  }, [results]);

  const filteredResults = useMemo(() => {
    if (!statusFilter) return results;
    const mapToKey = (s: string) => {
      const lower = (s || "").toLowerCase();
      if (lower === "draft") return "draft";
      if (lower === "review") return "review";
      if (lower === "last call") return "lastcall";
      if (lower === "final" || lower === "living") return "final";
      return "other";
    };
    return results.filter((r) => mapToKey(r.status || "") === statusFilter);
  }, [results, statusFilter]);

  const categoryBuckets = useMemo(() => {
    const buckets: Record<string, number> = {};
    for (const r of results) {
      const key = (r.category || r.type || "Unknown").trim() || "Unknown";
      buckets[key] = (buckets[key] ?? 0) + 1;
    }
    return Object.entries(buckets)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [results]);

  const resultDateRange = useMemo(() => {
    if (results.length === 0) return null;
    const nums = results.map((r) => r.number);
    return { min: Math.min(...nums), max: Math.max(...nums) };
  }, [results]);

  const finalizedRatio = useMemo(() => {
    if (results.length === 0) return 0;
    const final = statusBuckets.find((b) => b.key === "final")?.value ?? 0;
    return Math.round((final / results.length) * 100);
  }, [results.length, statusBuckets]);

  const prStats = useMemo(() => {
    const open = prResults.filter((r) => r.state === "open").length;
    const merged = prResults.filter((r) => r.mergedAt).length;
    const closed = prResults.filter((r) => !r.mergedAt && r.state !== "open").length;
    const withDates = prResults.filter((r) => r.mergedAt && r.createdAt);
    const avgMergeDays =
      withDates.length > 0
        ? Math.round(
            withDates.reduce((acc, r) => {
              const created = new Date(r.createdAt!).getTime();
              const merged = new Date(r.mergedAt!).getTime();
              return acc + (merged - created) / (24 * 60 * 60 * 1000);
            }, 0) / withDates.length
          )
        : null;
    return { open, merged, closed, avgMergeDays };
  }, [prResults]);

  const peopleRoleBreakdown = useMemo(() => {
    const authors = authorResults.filter((r) => r.eipCount > 0).length;
    const reviewers = authorResults.filter((r) => r.reviewCount > 0).length;
    const editors = authorResults.filter((r) => r.role === "Editor").length;
    const mostActive = authorResults.length > 0
      ? authorResults.reduce((best, r) => {
          const total = r.eipCount + r.prCount + r.issueCount + r.reviewCount;
          const bestTotal = best.eipCount + best.prCount + best.issueCount + best.reviewCount;
          return total > bestTotal ? r : best;
        })
      : null;
    return { authors, reviewers, editors, mostActive };
  }, [authorResults]);

  return (
    <TooltipProvider>
      <div className="bg-background relative min-h-screen w-full overflow-hidden">
        {/* Subtle background accent */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(52,211,153,0.03),transparent_70%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(52,211,153,0.05),transparent_70%)]" />
        </div>

        <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-6 px-4 pb-12 pt-6 sm:px-6 lg:px-8 xl:px-12">
          {/* Page header */}
          <motion.header
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-2"
          >
            <h1 className="dec-title bg-linear-to-br from-emerald-600 via-slate-700 to-cyan-600 dark:from-emerald-300 dark:via-slate-100 dark:to-cyan-200 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
              Search
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Find EIPs, ERCs, RIPs, pull requests, and contributors. Powered by{" "}
              <span className="text-slate-700 dark:text-slate-300">EIPsInsight</span>.
            </p>
          </motion.header>

          <hr className="border-slate-200 dark:border-slate-800/50 mb-2" />

          {/* Global search bar */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800/30 bg-white dark:bg-slate-950/40 px-3 py-3 shadow-md sm:px-4 sm:py-4">
            <form onSubmit={onSubmit} className="flex items-center gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-950/70 px-3 py-2">
                <SearchIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Search EIPs, PRs, authors, keywords..."
                  className="h-8 w-full bg-transparent text-sm outline-none placeholder:text-slate-500 dark:placeholder:text-slate-600 text-slate-900 dark:text-slate-100"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-lg bg-cyan-500 px-3 py-2 text-xs font-semibold text-slate-950 shadow hover:bg-cyan-400"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <SearchIcon className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">Search</span>
              </button>
            </form>
          </section>

          {/* Default state: Suggested Queries + Trending Topics (when no query) */}
          {!q && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 dark:border-slate-800/40 bg-white dark:bg-slate-950/40 p-4 sm:p-5">
                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <SearchIcon className="h-3.5 w-3.5" />
                  Suggested quick searches
                </h3>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_QUERIES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => runSearch(s)}
                      className="rounded-full border border-slate-200 dark:border-slate-700/60 bg-slate-100 dark:bg-slate-900/60 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors hover:border-cyan-400/50 hover:bg-cyan-500/10 dark:hover:bg-cyan-500/10"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </section>
              <section className="rounded-2xl border border-slate-200 dark:border-slate-800/40 bg-white dark:bg-slate-950/40 p-4 sm:p-5">
                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Trending topics this week
                </h3>
                <ul className="space-y-1.5">
                  {TRENDING_TOPICS.map((t) => (
                    <li key={t}>
                      <button
                        type="button"
                        onClick={() => runSearch(t)}
                        className="text-sm text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                      >
                        • {t}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}

          {/* Main content */}
          <section className="grid grid-cols-1 gap-6 md:grid-cols-[260px,minmax(0,1fr)]">
            {/* Filters column - collapsible */}
            <aside className="rounded-2xl border border-slate-200 dark:border-slate-800/40 bg-white dark:bg-slate-950/40 overflow-hidden">
              <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
                <CollapsibleTrigger className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <Filter className="h-3.5 w-3.5" />
                    Filters
                  </div>
                  {filtersOpen ? (
                    <ChevronUp className="h-4 w-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-500" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-4 px-3 pb-3 sm:px-4 sm:pb-4 border-t border-slate-200 dark:border-slate-800/40">
                    <div className="space-y-2">
                      <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Scope</p>
                      <div className="grid grid-cols-2 gap-1 text-[11px]">
                        {([
                          ["all", "All"],
                          ["eips", "EIPs"],
                          ["ercs", "ERCs"],
                          ["rips", "RIPs"],
                          ["prs", "PRs"],
                          ["issues", "Issues"],
                        ] as [Scope, string][]).map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setScope(value)}
                            className={`rounded-md border px-2 py-1 text-left transition-colors ${
                              scope === value
                                ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-700 dark:text-cyan-200"
                                : "border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Repository</p>
                      <p className="text-[11px] text-slate-500">
                        EIPsInsight auto-detects EIPs/ERCs/RIPs from search results.
                      </p>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </aside>

            {/* Results + visuals */}
            <div className="space-y-6">
              <div className="border-b border-slate-200 dark:border-slate-800/50 pb-3">
                <h2 className="dec-title text-xl font-semibold tracking-tight text-slate-800 dark:text-slate-200 sm:text-2xl">
                  {tab === "eips" && "Proposals matching query"}
                  {tab === "prs" && "PRs & Issues"}
                  {tab === "people" && "People & Contributors"}
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  {tab === "eips" && "EIPs, ERCs, and RIPs from your search"}
                  {tab === "prs" && "Pull requests and issues on GitHub"}
                  {tab === "people" && "Authors, reviewers, and editors"}
                </p>
              </div>
              {/* Tabs */}
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-800/60 bg-slate-100 dark:bg-slate-950/40 p-1 text-xs">
                  {([
                    ["eips", "EIPs"] as [TabKey, string],
                    ["prs", "PRs & Issues"],
                    ["people", "Authors / People"],
                  ] as [TabKey, string][]).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTab(key)}
                      className={`rounded-full px-3 py-1 ${
                        tab === key
                          ? "bg-cyan-500 text-slate-950 font-semibold"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {tab === "eips" && q && (
                  <p className="hidden text-[11px] text-slate-500 sm:inline">
                    {results.length} result{results.length === 1 ? "" : "s"} for “{q || ""}”
                    {scope !== "all" && ` in ${scope.toUpperCase()}`}
                  </p>
                )}
              </div>

              {/* EIPs tab */}
              {tab === "eips" && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr),minmax(0,1fr)]">
                  {/* Left: Insights + Results */}
                  <div className="space-y-4">
                    {/* Search Insights Summary + Chips */}
                    {q && !loading && results.length > 0 && (
                      <>
                        <div className="rounded-xl border border-slate-200 dark:border-slate-800/40 bg-slate-50 dark:bg-slate-950/50 p-3 sm:p-4">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                            {results.length} proposal{results.length === 1 ? "" : "s"} matched
                          </p>
                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                            {statusBuckets.filter((b) => b.value > 0).map((b) => `${b.key === "lastcall" ? "Last Call" : b.key.charAt(0).toUpperCase() + b.key.slice(1)} ${b.value}`).join(" • ")}
                            {categoryBuckets.length > 0 && (
                              <span className="block mt-1">Most common category: <span className="font-semibold text-slate-800 dark:text-slate-200">{categoryBuckets[0]?.[0]}</span></span>
                            )}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {statusBuckets.filter((b) => b.value > 0).map((b) => (
                            <button key={b.key} type="button" onClick={() => setStatusFilter(statusFilter === b.key ? null : b.key)} className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${statusFilter === b.key ? "border-cyan-400/60 bg-cyan-500/20 text-cyan-700 dark:text-cyan-300" : "border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"}`}>
                              {b.key === "lastcall" ? "Last Call" : b.key.charAt(0).toUpperCase() + b.key.slice(1)} ({b.value})
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  <div className="space-y-2 rounded-2xl border border-slate-200 dark:border-slate-800/40 bg-white dark:bg-slate-950/40 p-3 sm:p-4">
                    {error && (
                      <p className="mb-2 text-xs text-red-400">
                        {error}
                      </p>
                    )}
                    {!q && (
                      <p className="text-sm text-slate-500">
                        Start typing above to search EIPs, ERCs, and RIPs.
                      </p>
                    )}
                    {q && !loading && results.length === 0 && !error && (
                      <div className="rounded-lg border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/30 p-4">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No proposals found for &quot;{q}&quot;</p>
                        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">Try:</p>
                        <ul className="mt-1 list-disc list-inside space-y-0.5 text-xs text-slate-600 dark:text-slate-400">
                          <li>Searching by EIP number (e.g. EIP-4844)</li>
                          <li>Using broader keywords</li>
                          <li>Switching to PRs or Authors tab</li>
                        </ul>
                      </div>
                    )}
                    {loading && (
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Searching proposals…
                      </div>
                    )}
                    {!loading && results.length > 0 && (
                      <ul className="space-y-2">
                        {filteredResults.map((r) => {
                          const prefix = r.repo === "erc" ? "ERC" : r.repo === "rip" ? "RIP" : "EIP";
                          const numberLabel = `${prefix}-${r.number}`;
                          const proposalHref = `/${r.repo}/${r.number}`;
                          const status = r.status || "Unknown";
                          const category = r.category || r.type || "–";
                          return (
                            <li key={`${r.repo}-${r.number}`}>
                              <Link
                                href={proposalHref}
                                className="block rounded-xl border border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-950/80 p-3 hover:border-cyan-500/50 hover:bg-slate-100 dark:hover:bg-slate-900/80 transition-colors"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-semibold text-cyan-600 dark:text-cyan-300">
                                      {numberLabel}
                                    </span>
                                    <span className="rounded-full bg-slate-200 dark:bg-slate-800/80 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-600 dark:text-slate-400">
                                      {status}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-slate-500">
                                    {category}
                                  </span>
                                </div>
                                <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-100">
                                  {r.title || "Untitled proposal"}
                                </p>
                                {r.author && (
                                  <p className="mt-0.5 text-xs text-slate-500">
                                    Author: <span className="text-slate-700 dark:text-slate-300">{r.author}</span>
                                  </p>
                                )}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                  </div>

                  {/* Search Context Panel */}
                  <div className="space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Search context</p>
                    {/* Status donut */}
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800/40 bg-white dark:bg-slate-950/40 p-3 sm:p-4">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Status distribution</p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Based on current search results.
                      </p>
                      <div className="mt-3 flex items-center justify-center">
                        {results.length === 0 ? (
                          <p className="text-xs text-slate-500">No data yet</p>
                        ) : (
                          <ChartContainer
                            config={statusColorConfig}
                            className="h-40 w-40"
                          >
                            <PieChart>
                              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                              <Pie
                                data={statusBuckets}
                                dataKey="value"
                                nameKey="key"
                                innerRadius="65%"
                                outerRadius="100%"
                                strokeWidth={2}
                              >
                                <Label
                                  content={({ viewBox }) => {
                                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                      return (
                                        <text
                                          x={viewBox.cx}
                                          y={viewBox.cy}
                                          textAnchor="middle"
                                          dominantBaseline="middle"
                                        >
                                          <tspan
                                            x={viewBox.cx}
                                            y={viewBox.cy}
                                            className="fill-slate-800 dark:fill-slate-100 text-xl font-bold"
                                          >
                                            {results.length}
                                          </tspan>
                                          <tspan
                                            x={viewBox.cx}
                                            y={(viewBox.cy || 0) + 16}
                                            className="fill-slate-500 dark:fill-slate-400 text-[10px]"
                                          >
                                            proposals
                                          </tspan>
                                        </text>
                                      );
                                    }
                                    return null;
                                  }}
                                />
                              </Pie>
                            </PieChart>
                          </ChartContainer>
                        )}
                      </div>
                    </div>

                    {/* Top categories + stats */}
                    {results.length > 0 && (
                      <div className="rounded-2xl border border-slate-200 dark:border-slate-800/40 bg-white dark:bg-slate-950/40 p-3 sm:p-4 space-y-3">
                        {categoryBuckets.length > 0 && (
                          <div>
                            <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Top categories</p>
                            <ul className="mt-1 space-y-0.5">
                              {categoryBuckets.slice(0, 3).map(([key, count]) => (
                                <li key={key} className="text-xs text-slate-700 dark:text-slate-300 flex justify-between">
                                  <span>{key}</span>
                                  <span className="font-medium">{count}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {resultDateRange && (
                          <div>
                            <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Proposal range</p>
                            <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">
                              #{resultDateRange.min} → #{resultDateRange.max}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Finalized ratio</p>
                          <p className="mt-1 text-xs font-semibold text-slate-800 dark:text-slate-200">{finalizedRatio}%</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PRs & Issues tab */}
              {tab === "prs" && (
                <div className="space-y-6">
                  {/* PR Stats row */}
                  {q && prIssueToggle === "prs" && prResults.length > 0 && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800/40 bg-slate-50 dark:bg-slate-950/50 p-3 sm:p-4">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {prResults.length} PR{prResults.length === 1 ? "" : "s"} found
                      </p>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        {prStats.open} Open • {prStats.merged} Merged • {prStats.closed} Closed
                        {prStats.avgMergeDays != null && ` • Avg merge time: ${prStats.avgMergeDays} days`}
                      </p>
                    </div>
                  )}
                  {/* Toggle between PRs and Issues */}
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-800/60 bg-slate-100 dark:bg-slate-950/40 p-1 text-xs">
                      {(["prs", "issues"] as const).map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setPrIssueToggle(key)}
                          className={`rounded-full px-3 py-1 capitalize ${
                            prIssueToggle === key
                              ? "bg-cyan-500 text-slate-950 font-semibold"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                          }`}
                        >
                          {key}
                        </button>
                      ))}
                    </div>
                    <p className="hidden text-[11px] text-slate-500 sm:inline">
                      {prIssueToggle === "prs"
                        ? `${prResults.length} PR${prResults.length === 1 ? "" : "s"}`
                        : `${issueResults.length} issue${issueResults.length === 1 ? "" : "s"}`}{" "}
                      for &quot;{q || ""}&quot;
                    </p>
                  </div>

                  {/* PRs list */}
                  {prIssueToggle === "prs" && (
                    <div className="space-y-2 rounded-2xl border border-slate-200 dark:border-slate-800/40 bg-white dark:bg-slate-950/40 p-3 sm:p-4">
                      {!q && (
                        <p className="text-sm text-slate-500">
                          Start typing above to search pull requests.
                        </p>
                      )}
                      {q && !loading && prResults.length === 0 && !error && (
                        <p className="text-sm text-slate-500">
                          No PRs found for &quot;{q}&quot;. Try a PR number, title, or author.
                        </p>
                      )}
                      {loading && (
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Searching PRs…
                        </div>
                      )}
                      {!loading && prResults.length > 0 && (
                        <ul className="space-y-2">
                          {prResults.map((r) => {
                            const repoName = r.repo.split("/")[1] || r.repo;
                            const prUrl = `https://github.com/${r.repo}/pull/${r.prNumber}`;
                            const stateColors: Record<string, string> = {
                              open: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-400/30",
                              closed: r.mergedAt
                                ? "bg-violet-500/20 text-violet-700 dark:text-violet-300 border-violet-400/30"
                                : "bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-400/30",
                            };
                            return (
                              <li key={`${r.repo}-${r.prNumber}`}>
                                <a
                                  href={prUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block rounded-xl border border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-950/80 p-3 hover:border-cyan-500/50 hover:bg-slate-100 dark:hover:bg-slate-900/80 transition-colors"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-xs font-semibold text-cyan-600 dark:text-cyan-300 flex items-center gap-1">
                                        #{r.prNumber}
                                        <ExternalLink className="h-3 w-3" />
                                      </span>
                                    <span
                                      className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                                        stateColors[r.state || "closed"] ||
                                        "bg-slate-500/20 text-slate-700 dark:text-slate-300"
                                      }`}
                                    >
                                      {r.mergedAt ? "Merged" : r.state || "Closed"}
                                    </span>
                                    {r.governanceState && (
                                      <span className="rounded-full bg-amber-500/20 border border-amber-400/30 px-2 py-0.5 text-[10px] text-amber-300">
                                        {r.governanceState.replace(/_/g, " ")}
                                      </span>
                                    )}
                                    </div>
                                    <span className="text-[10px] text-slate-500">{repoName}</span>
                                  </div>
                                  <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-100">
                                    {r.title || "Untitled PR"}
                                  </p>
                                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                    {r.author && (
                                      <p className="text-xs text-slate-500">
                                        Author: <span className="text-slate-700 dark:text-slate-300">{r.author}</span>
                                      </p>
                                    )}
                                    {r.labels.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {r.labels.slice(0, 3).map((label) => (
                                          <span
                                            key={label}
                                            className="rounded border border-slate-200 dark:border-slate-700/50 bg-slate-100 dark:bg-slate-800/50 px-1.5 py-0.5 text-[10px] text-slate-600 dark:text-slate-400"
                                          >
                                            {label}
                                          </span>
                                        ))}
                                        {r.labels.length > 3 && (
                                          <span className="text-[10px] text-slate-500">
                                            +{r.labels.length - 3}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </a>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* Issues list */}
                  {prIssueToggle === "issues" && (
                    <div className="space-y-2 rounded-2xl border border-slate-200 dark:border-slate-800/40 bg-white dark:bg-slate-950/40 p-3 sm:p-4">
                      {!q && (
                        <p className="text-sm text-slate-500">
                          Start typing above to search issues.
                        </p>
                      )}
                      {q && !loading && issueResults.length === 0 && !error && (
                        <p className="text-sm text-slate-500">
                          No issues found for &quot;{q}&quot;. Try an issue number, title, or author.
                        </p>
                      )}
                      {loading && (
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Searching issues…
                        </div>
                      )}
                      {!loading && issueResults.length > 0 && (
                        <ul className="space-y-2">
                          {issueResults.map((r) => {
                            const repoName = r.repo.split("/")[1] || r.repo;
                            const issueUrl = `https://github.com/${r.repo}/issues/${r.issueNumber}`;
                            return (
                              <li key={`${r.repo}-${r.issueNumber}`}>
                                <a
                                  href={issueUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block rounded-xl border border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-950/80 p-3 hover:border-cyan-500/50 hover:bg-slate-100 dark:hover:bg-slate-900/80 transition-colors"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-xs font-semibold text-cyan-600 dark:text-cyan-300 flex items-center gap-1">
                                        #{r.issueNumber}
                                        <ExternalLink className="h-3 w-3" />
                                      </span>
                                    <span
                                      className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                                        r.state === "open"
                                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                                          : "bg-slate-500/20 text-slate-300 border-slate-400/30"
                                      }`}
                                    >
                                      {r.state || "Closed"}
                                    </span>
                                    </div>
                                    <span className="text-[10px] text-slate-500">{repoName}</span>
                                  </div>
                                  <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-100">
                                    {r.title || "Untitled issue"}
                                  </p>
                                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                    {r.author && (
                                      <p className="text-xs text-slate-500">
                                        Author: <span className="text-slate-700 dark:text-slate-300">{r.author}</span>
                                      </p>
                                    )}
                                    {r.labels.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {r.labels.slice(0, 3).map((label) => (
                                          <span
                                            key={label}
                                            className="rounded border border-slate-200 dark:border-slate-700/50 bg-slate-100 dark:bg-slate-800/50 px-1.5 py-0.5 text-[10px] text-slate-600 dark:text-slate-400"
                                          >
                                            {label}
                                          </span>
                                        ))}
                                        {r.labels.length > 3 && (
                                          <span className="text-[10px] text-slate-500">
                                            +{r.labels.length - 3}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </a>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Authors / People tab */}
              {tab === "people" && (
                <div className="space-y-6">
                  {q && authorResults.length > 0 && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800/40 bg-slate-50 dark:bg-slate-950/50 p-3 sm:p-4">
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Top roles in results</p>
                      <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-700 dark:text-slate-300">
                        <span>Authors: {peopleRoleBreakdown.authors}</span>
                        <span>Reviewers: {peopleRoleBreakdown.reviewers}</span>
                        <span>Editors: {peopleRoleBreakdown.editors}</span>
                      </div>
                      {peopleRoleBreakdown.mostActive && (
                        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                          Most active: <span className="font-semibold text-slate-800 dark:text-slate-200">{peopleRoleBreakdown.mostActive.name}</span>
                        </p>
                      )}
                    </div>
                  )}
                  <div className="space-y-2 rounded-2xl border border-slate-200 dark:border-slate-800/40 bg-white dark:bg-slate-950/40 p-3 sm:p-4">
                    {!q && (
                      <p className="text-sm text-slate-500">
                        Start typing above to search authors and contributors.
                      </p>
                    )}
                    {q && !loading && authorResults.length === 0 && !error && (
                      <p className="text-sm text-slate-500">
                        No authors found for &quot;{q}&quot;. Try a name or GitHub handle.
                      </p>
                    )}
                    {loading && (
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Searching authors…
                      </div>
                    )}
                    {!loading && authorResults.length > 0 && (
                      <ul className="space-y-2">
                        {authorResults.map((r) => {
                          const totalContributions =
                            r.eipCount + r.prCount + r.issueCount + r.reviewCount;
                          const roleBadges = [];
                          if (r.role) {
                            roleBadges.push(r.role);
                          }
                          if (r.reviewCount > 0) {
                            roleBadges.push("Reviewer");
                          }
                          const authorHref = `/search?q=${encodeURIComponent(r.name)}&tab=people`;
                          return (
                            <li key={r.name}>
                              <Link
                                href={authorHref}
                                className="block rounded-xl border border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-950/80 p-3 hover:border-cyan-500/50 hover:bg-slate-100 dark:hover:bg-slate-900/80 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                                        {r.name}
                                      </p>
                                    {roleBadges.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {roleBadges.map((role) => (
                                          <span
                                            key={role}
                                            className="rounded-full bg-cyan-500/20 border border-cyan-400/30 px-2 py-0.5 text-[10px] text-cyan-700 dark:text-cyan-300 uppercase"
                                          >
                                            {role}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                                    {r.eipCount > 0 && (
                                      <div>
                                        <p className="text-slate-500">EIPs</p>
                                        <p className="font-semibold text-emerald-300">
                                          {r.eipCount}
                                        </p>
                                      </div>
                                    )}
                                    {r.prCount > 0 && (
                                      <div>
                                        <p className="text-slate-500">PRs</p>
                                        <p className="font-semibold text-cyan-300">{r.prCount}</p>
                                      </div>
                                    )}
                                    {r.issueCount > 0 && (
                                      <div>
                                        <p className="text-slate-500">Issues</p>
                                        <p className="font-semibold text-amber-300">
                                          {r.issueCount}
                                        </p>
                                      </div>
                                    )}
                                    {r.reviewCount > 0 && (
                                      <div>
                                        <p className="text-slate-500">Reviews</p>
                                        <p className="font-semibold text-violet-300">
                                          {r.reviewCount}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                  {r.lastActivity && (
                                    <p className="mt-2 text-[10px] text-slate-500">
                                      Last activity:{" "}
                                      {new Date(r.lastActivity).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-slate-500">Total</p>
                                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                    {totalContributions}
                                  </p>
                                </div>
                              </div>
                            </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}

