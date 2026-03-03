"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { Search as SearchIcon, Filter, Loader2, ChevronDown, ChevronUp, ExternalLink, TrendingUp, Info } from "lucide-react";
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

function normalizePersonQuery(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
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
  const router = useRouter();
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
  const [headerInfoOpen, setHeaderInfoOpen] = useState(false);

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

  useEffect(() => {
    if (tab !== "people" || !q || loading || authorResults.length !== 1) {
      return;
    }

    const queryNormalized = normalizePersonQuery(q);
    const onlyMatch = authorResults[0];
    if (queryNormalized && normalizePersonQuery(onlyMatch.name) === queryNormalized) {
      router.replace(`/people/${encodeURIComponent(onlyMatch.name)}`);
    }
  }, [tab, q, loading, authorResults, router]);

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
        <div className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute inset-0 persona-gradient-soft opacity-30" />
        </div>

        <div className="relative z-10 mx-auto flex max-w-full flex-col gap-4 px-4 py-8 sm:px-6 lg:px-8 xl:px-12">
          <motion.header
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-2 space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="dec-title persona-title text-balance text-3xl font-semibold tracking-tight leading-[1.1] sm:text-4xl">
                  Search
                </h1>
                <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Find EIPs, ERCs, RIPs, pull requests, issues, and contributors. Powered by{" "}
                  <span className="text-foreground/80">EIPsInsight</span>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHeaderInfoOpen((v) => !v)}
                className="group inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted/60 transition-all hover:border-primary/40 hover:bg-primary/10"
                aria-label="Search page info"
              >
                <Info className={`h-4 w-4 ${headerInfoOpen ? "text-primary" : "text-muted-foreground group-hover:text-primary"}`} />
              </button>
            </div>
            <Collapsible open={headerInfoOpen} onOpenChange={setHeaderInfoOpen}>
              <CollapsibleContent>
                <div className="rounded-lg border border-border bg-card/60 p-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-border bg-muted/40 p-3">
                      <p className="text-sm font-semibold text-foreground">Search Scope</p>
                      <p className="text-sm text-muted-foreground">Query proposals, PRs/issues, or people from one search box.</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/40 p-3">
                      <p className="text-sm font-semibold text-foreground">Fast Triage</p>
                      <p className="text-sm text-muted-foreground">Use tabs and filters to jump directly to the result type you need.</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/40 p-3">
                      <p className="text-sm font-semibold text-foreground">Context Panels</p>
                      <p className="text-sm text-muted-foreground">Status mix, category spread, and role distribution update from live results.</p>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </motion.header>

          <hr className="mb-2 border-border" />

          {/* Global search bar */}
          <section className="rounded-2xl border border-border bg-card/60 px-3 py-3 shadow-md sm:px-4 sm:py-4">
            <form onSubmit={onSubmit} className="flex items-center gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-muted/60 px-3 py-2">
                <SearchIcon className="h-4 w-4 text-muted-foreground" />
                <input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Search EIPs, PRs, authors, keywords..."
                  className="h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground text-foreground"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90"
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
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <section className="rounded-2xl border border-border bg-card/60 p-4 sm:p-5">
                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <SearchIcon className="h-3.5 w-3.5" />
                  Suggested quick searches
                </h3>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_QUERIES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => runSearch(s)}
                      className="rounded-full border border-border bg-muted/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </section>
              <section className="rounded-2xl border border-border bg-card/60 p-4 sm:p-5">
                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Trending topics this week
                </h3>
                <ul className="space-y-1.5">
                  {TRENDING_TOPICS.map((t) => (
                    <li key={t}>
                      <button
                        type="button"
                        onClick={() => runSearch(t)}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
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
          <section className="grid grid-cols-1 gap-4 md:grid-cols-[260px,minmax(0,1fr)]">
            {/* Filters column - collapsible */}
            <aside className="rounded-2xl border border-border bg-card/60 overflow-hidden">
              <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
                <CollapsibleTrigger className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Filter className="h-3.5 w-3.5" />
                    Filters
                  </div>
                  {filtersOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-4 px-3 pb-3 sm:px-4 sm:pb-4 border-t border-border">
                    <div className="space-y-2">
                      <p className="text-[11px] font-medium text-muted-foreground">Scope</p>
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
                                ? "border-primary/40 bg-primary/10 text-primary"
                                : "border-border bg-muted/60 text-muted-foreground hover:border-primary/40 hover:text-primary"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[11px] font-medium text-muted-foreground">Repository</p>
                      <p className="text-[11px] text-muted-foreground">
                        EIPsInsight auto-detects EIPs/ERCs/RIPs from search results.
                      </p>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </aside>

            {/* Results + visuals */}
            <div className="space-y-6">
              <div className="border-b border-border pb-3">
                <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                  {tab === "eips" && "Proposals matching query"}
                  {tab === "prs" && "PRs & Issues"}
                  {tab === "people" && "People & Contributors"}
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {tab === "eips" && "EIPs, ERCs, and RIPs from your search"}
                  {tab === "prs" && "Pull requests and issues on GitHub"}
                  {tab === "people" && "Authors, reviewers, and editors"}
                </p>
              </div>
              {/* Tabs */}
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 p-1 text-xs">
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
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {tab === "eips" && q && (
                  <p className="hidden text-[11px] text-muted-foreground sm:inline">
                    {results.length} result{results.length === 1 ? "" : "s"} for “{q || ""}”
                    {scope !== "all" && ` in ${scope.toUpperCase()}`}
                  </p>
                )}
              </div>

              {/* EIPs tab */}
              {tab === "eips" && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr),minmax(0,1fr)]">
                  {/* Left: Insights + Results */}
                  <div className="space-y-4">
                    {/* Search Insights Summary + Chips */}
                    {q && !loading && results.length > 0 && (
                      <>
                        <div className="rounded-xl border border-border bg-muted/50 p-3 sm:p-4">
                          <p className="text-sm font-medium text-foreground">
                            {results.length} proposal{results.length === 1 ? "" : "s"} matched
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {statusBuckets.filter((b) => b.value > 0).map((b) => `${b.key === "lastcall" ? "Last Call" : b.key.charAt(0).toUpperCase() + b.key.slice(1)} ${b.value}`).join(" • ")}
                            {categoryBuckets.length > 0 && (
                              <span className="block mt-1">Most common category: <span className="font-semibold text-foreground">{categoryBuckets[0]?.[0]}</span></span>
                            )}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {statusBuckets.filter((b) => b.value > 0).map((b) => (
                            <button key={b.key} type="button" onClick={() => setStatusFilter(statusFilter === b.key ? null : b.key)} className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${statusFilter === b.key ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-muted/60 text-muted-foreground hover:border-primary/40 hover:text-primary"}`}>
                              {b.key === "lastcall" ? "Last Call" : b.key.charAt(0).toUpperCase() + b.key.slice(1)} ({b.value})
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  <div className="space-y-2 rounded-2xl border border-border bg-card/60 p-3 sm:p-4">
                    {error && (
                      <p className="mb-2 text-xs text-red-400">
                        {error}
                      </p>
                    )}
                    {!q && (
                      <p className="text-sm text-muted-foreground">
                        Start typing above to search EIPs, ERCs, and RIPs.
                      </p>
                    )}
                    {q && !loading && results.length === 0 && !error && (
                      <div className="rounded-lg border border-border bg-muted/50 p-4">
                        <p className="text-sm font-medium text-foreground">No proposals found for &quot;{q}&quot;</p>
                        <p className="mt-2 text-xs text-muted-foreground">Try:</p>
                        <ul className="mt-1 list-disc list-inside space-y-0.5 text-xs text-muted-foreground">
                          <li>Searching by EIP number (e.g. EIP-4844)</li>
                          <li>Using broader keywords</li>
                          <li>Switching to PRs or Authors tab</li>
                        </ul>
                      </div>
                    )}
                    {loading && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
                                className="block rounded-xl border border-border bg-card/60 p-3 hover:border-primary/40 hover:bg-muted/50 transition-colors"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-semibold text-primary">
                                      {numberLabel}
                                    </span>
                                    <span className="rounded-full bg-muted/70 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                                      {status}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-muted-foreground">
                                    {category}
                                  </span>
                                </div>
                                <p className="mt-1 text-sm font-medium text-foreground">
                                  {r.title || "Untitled proposal"}
                                </p>
                                {r.author && (
                                  <p className="mt-0.5 text-xs text-muted-foreground">
                                    Author: <span className="text-muted-foreground">{r.author}</span>
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
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Search context</p>
                    {/* Status donut */}
                    <div className="rounded-2xl border border-border bg-card/60 p-3 sm:p-4">
                      <p className="text-xs font-semibold text-muted-foreground">Status distribution</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Based on current search results.
                      </p>
                      <div className="mt-3 flex items-center justify-center">
                        {results.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No data yet</p>
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
                                            className="fill-foreground text-xl font-bold"
                                          >
                                            {results.length}
                                          </tspan>
                                          <tspan
                                            x={viewBox.cx}
                                            y={(viewBox.cy || 0) + 16}
                                            className="fill-muted-foreground text-[10px]"
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
                      <div className="rounded-2xl border border-border bg-card/60 p-3 sm:p-4 space-y-3">
                        {categoryBuckets.length > 0 && (
                          <div>
                            <p className="text-[11px] font-medium text-muted-foreground">Top categories</p>
                            <ul className="mt-1 space-y-0.5">
                              {categoryBuckets.slice(0, 3).map(([key, count]) => (
                                <li key={key} className="text-xs text-muted-foreground flex justify-between">
                                  <span>{key}</span>
                                  <span className="font-medium">{count}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {resultDateRange && (
                          <div>
                            <p className="text-[11px] font-medium text-muted-foreground">Proposal range</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              #{resultDateRange.min} → #{resultDateRange.max}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-[11px] font-medium text-muted-foreground">Finalized ratio</p>
                          <p className="mt-1 text-xs font-semibold text-foreground">{finalizedRatio}%</p>
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
                    <div className="rounded-xl border border-border bg-muted/50 p-3 sm:p-4">
                      <p className="text-sm font-medium text-foreground">
                        {prResults.length} PR{prResults.length === 1 ? "" : "s"} found
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {prStats.open} Open • {prStats.merged} Merged • {prStats.closed} Closed
                        {prStats.avgMergeDays != null && ` • Avg merge time: ${prStats.avgMergeDays} days`}
                      </p>
                    </div>
                  )}
                  {/* Toggle between PRs and Issues */}
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 p-1 text-xs">
                      {(["prs", "issues"] as const).map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setPrIssueToggle(key)}
                          className={`rounded-full px-3 py-1 capitalize ${
                            prIssueToggle === key
                              ? "bg-primary text-primary-foreground font-semibold"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {key}
                        </button>
                      ))}
                    </div>
                    <p className="hidden text-[11px] text-muted-foreground sm:inline">
                      {prIssueToggle === "prs"
                        ? `${prResults.length} PR${prResults.length === 1 ? "" : "s"}`
                        : `${issueResults.length} issue${issueResults.length === 1 ? "" : "s"}`}{" "}
                      for &quot;{q || ""}&quot;
                    </p>
                  </div>

                  {/* PRs list */}
                  {prIssueToggle === "prs" && (
                    <div className="space-y-2 rounded-2xl border border-border bg-card/60 p-3 sm:p-4">
                      {!q && (
                        <p className="text-sm text-muted-foreground">
                          Start typing above to search pull requests.
                        </p>
                      )}
                      {q && !loading && prResults.length === 0 && !error && (
                        <p className="text-sm text-muted-foreground">
                          No PRs found for &quot;{q}&quot;. Try a PR number, title, or author.
                        </p>
                      )}
                      {loading && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
                                : "bg-slate-500/20 text-muted-foreground border-slate-400/30",
                            };
                            return (
                              <li key={`${r.repo}-${r.prNumber}`}>
                                <a
                                  href={prUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block rounded-xl border border-border bg-card/60 p-3 hover:border-primary/40 hover:bg-muted/50 transition-colors"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-xs font-semibold text-primary flex items-center gap-1">
                                        #{r.prNumber}
                                        <ExternalLink className="h-3 w-3" />
                                      </span>
                                    <span
                                      className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                                        stateColors[r.state || "closed"] ||
                                        "bg-slate-500/20 text-muted-foreground"
                                      }`}
                                    >
                                      {r.mergedAt ? "Merged" : r.state || "Closed"}
                                    </span>
                                    {r.governanceState && (
                                      <span className="rounded-full bg-amber-500/20 border border-amber-400/30 px-2 py-0.5 text-[10px] text-primary">
                                        {r.governanceState.replace(/_/g, " ")}
                                      </span>
                                    )}
                                    </div>
                                    <span className="text-[10px] text-muted-foreground">{repoName}</span>
                                  </div>
                                  <p className="mt-1 text-sm font-medium text-foreground">
                                    {r.title || "Untitled PR"}
                                  </p>
                                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                    {r.author && (
                                      <p className="text-xs text-muted-foreground">
                                        Author: <span className="text-muted-foreground">{r.author}</span>
                                      </p>
                                    )}
                                    {r.labels.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {r.labels.slice(0, 3).map((label) => (
                                          <span
                                            key={label}
                                            className="rounded border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                                          >
                                            {label}
                                          </span>
                                        ))}
                                        {r.labels.length > 3 && (
                                          <span className="text-[10px] text-muted-foreground">
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
                    <div className="space-y-2 rounded-2xl border border-border bg-card/60 p-3 sm:p-4">
                      {!q && (
                        <p className="text-sm text-muted-foreground">
                          Start typing above to search issues.
                        </p>
                      )}
                      {q && !loading && issueResults.length === 0 && !error && (
                        <p className="text-sm text-muted-foreground">
                          No issues found for &quot;{q}&quot;. Try an issue number, title, or author.
                        </p>
                      )}
                      {loading && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Searching issues…
                        </div>
                      )}
                      {!loading && issueResults.length > 0 && (
                        <ul className="space-y-2">
                          {issueResults.map((r) => {
                            const repoName = r.repo.split("/")[1] || r.repo;
                            const repoShortRaw = (r.repo.split("/")[1] || "").toLowerCase();
                            const issueRepo = repoShortRaw === "ercs" ? "ercs" : repoShortRaw === "rips" ? "rips" : "eips";
                            const internalIssueUrl = `/issue/${issueRepo}/${r.issueNumber}`;
                            const issueUrl = `https://github.com/${r.repo}/issues/${r.issueNumber}`;
                            return (
                              <li key={`${r.repo}-${r.issueNumber}`}>
                                <div className="rounded-xl border border-border bg-card/60 p-3 hover:border-primary/40 hover:bg-muted/50 transition-colors">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <Link href={internalIssueUrl} className="font-mono text-xs font-semibold text-primary hover:underline">
                                        #{r.issueNumber}
                                      </Link>
                                      <span
                                        className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                                          r.state === "open"
                                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                                            : "bg-slate-500/20 text-muted-foreground border-slate-400/30"
                                        }`}
                                      >
                                        {r.state || "Closed"}
                                      </span>
                                    </div>
                                    <a
                                      href={issueUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary"
                                      aria-label={`Open issue #${r.issueNumber} on GitHub`}
                                    >
                                      GitHub <ExternalLink className="h-3 w-3" />
                                    </a>
                                    <span className="text-[10px] text-muted-foreground">{repoName}</span>
                                  </div>
                                  <Link href={internalIssueUrl} className="mt-1 block text-sm font-medium text-foreground hover:text-primary">
                                    {r.title || "Untitled issue"}
                                  </Link>
                                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                    {r.author && (
                                      <p className="text-xs text-muted-foreground">
                                        Author: <span className="text-muted-foreground">{r.author}</span>
                                      </p>
                                    )}
                                    {r.labels.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {r.labels.slice(0, 3).map((label) => (
                                          <span
                                            key={label}
                                            className="rounded border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                                          >
                                            {label}
                                          </span>
                                        ))}
                                        {r.labels.length > 3 && (
                                          <span className="text-[10px] text-muted-foreground">
                                            +{r.labels.length - 3}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
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
                    <div className="rounded-xl border border-border bg-muted/50 p-3 sm:p-4">
                      <p className="text-xs font-medium text-muted-foreground">Top roles in results</p>
                      <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span>Authors: {peopleRoleBreakdown.authors}</span>
                        <span>Reviewers: {peopleRoleBreakdown.reviewers}</span>
                        <span>Editors: {peopleRoleBreakdown.editors}</span>
                      </div>
                      {peopleRoleBreakdown.mostActive && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Most active: <span className="font-semibold text-foreground">{peopleRoleBreakdown.mostActive.name}</span>
                        </p>
                      )}
                    </div>
                  )}
                  <div className="space-y-2 rounded-2xl border border-border bg-card/60 p-3 sm:p-4">
                    {!q && (
                      <p className="text-sm text-muted-foreground">
                        Start typing above to search authors and contributors.
                      </p>
                    )}
                    {q && !loading && authorResults.length === 0 && !error && (
                      <p className="text-sm text-muted-foreground">
                        No authors found for &quot;{q}&quot;. Try a name or GitHub handle.
                      </p>
                    )}
                    {loading && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
                          const authorHref = `/people/${encodeURIComponent(r.name)}`;
                          return (
                            <li key={r.name}>
                              <Link
                                href={authorHref}
                                className="block rounded-xl border border-border bg-card/60 p-3 hover:border-primary/40 hover:bg-muted/50 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="text-sm font-semibold text-foreground">
                                        {r.name}
                                      </p>
                                    {roleBadges.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {roleBadges.map((role) => (
                                          <span
                                            key={role}
                                            className="rounded-full bg-primary/10 border border-primary/30 px-2 py-0.5 text-[10px] text-primary uppercase"
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
                                        <p className="text-muted-foreground">EIPs</p>
                                        <p className="font-semibold text-primary">
                                          {r.eipCount}
                                        </p>
                                      </div>
                                    )}
                                    {r.prCount > 0 && (
                                      <div>
                                        <p className="text-muted-foreground">PRs</p>
                                        <p className="font-semibold text-primary">{r.prCount}</p>
                                      </div>
                                    )}
                                    {r.issueCount > 0 && (
                                      <div>
                                        <p className="text-muted-foreground">Issues</p>
                                        <p className="font-semibold text-primary">
                                          {r.issueCount}
                                        </p>
                                      </div>
                                    )}
                                    {r.reviewCount > 0 && (
                                      <div>
                                        <p className="text-muted-foreground">Reviews</p>
                                        <p className="font-semibold text-primary">
                                          {r.reviewCount}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                  {r.lastActivity && (
                                    <p className="mt-2 text-[10px] text-muted-foreground">
                                      Last activity:{" "}
                                      {new Date(r.lastActivity).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-muted-foreground">Total</p>
                                  <p className="text-sm font-bold text-foreground">
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
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
