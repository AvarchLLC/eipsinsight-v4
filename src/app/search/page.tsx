"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  ExternalLink,
  Filter,
  GitPullRequest,
  Layers,
  Info,
  Loader2,
  Search as SearchIcon,
  UserRound,
  Waypoints,
} from "lucide-react";
import { client } from "@/lib/orpc";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { InlineBrandLoader } from "@/components/inline-brand-loader";

type SearchKind = "all" | "proposals" | "prs" | "issues" | "people";
type RepoFilter = "all" | "eip" | "erc" | "rip";
type ProposalStatusFilter = "all" | "draft" | "review" | "last call" | "final" | "living" | "other";

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

const QUICK_SEARCHES = [
  "EIP-4844",
  "blob transactions",
  "Account abstraction",
  "ERC token standard",
  "Tim Beiko",
  "Verkle Trees",
];

const SEARCH_INFO_ITEMS = [
  {
    icon: SearchIcon,
    title: "Search everything",
    description: "Run one query across proposals, pull requests, issues, and contributors.",
  },
  {
    icon: Filter,
    title: "Refine fast",
    description: "Narrow by result type, repository family, or proposal status only when you need to.",
  },
  {
    icon: Layers,
    title: "Jump anywhere",
    description: "Open proposal pages, PRs, issues, GitHub links, and people profiles directly from results.",
  },
];

function normalizeStatus(status: string | null | undefined): ProposalStatusFilter {
  const value = (status || "").trim().toLowerCase();
  if (value === "draft") return "draft";
  if (value === "review") return "review";
  if (value === "last call") return "last call";
  if (value === "final") return "final";
  if (value === "living") return "living";
  return "other";
}

function getScopeFromLegacy(scope: string | null): SearchKind {
  if (scope === "prs") return "prs";
  if (scope === "issues") return "issues";
  if (scope === "eips" || scope === "ercs" || scope === "rips") return "proposals";
  return "all";
}

function getRepoFromLegacy(scope: string | null): RepoFilter {
  if (scope === "eips") return "eip";
  if (scope === "ercs") return "erc";
  if (scope === "rips") return "rip";
  return "all";
}

function getKindFromQuery(tab: string | null, kind: string | null, scope: string | null): SearchKind {
  if (kind === "all" || kind === "proposals" || kind === "prs" || kind === "issues" || kind === "people") {
    return kind;
  }
  if (tab === "people") return "people";
  if (tab === "prs") return scope === "issues" ? "issues" : "prs";
  if (tab === "eips") return "proposals";
  return getScopeFromLegacy(scope);
}

function getRepoFromQuery(repo: string | null, scope: string | null): RepoFilter {
  if (repo === "all" || repo === "eip" || repo === "erc" || repo === "rip") return repo;
  return getRepoFromLegacy(scope);
}

function useSearchQueryState() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const kind = getKindFromQuery(searchParams.get("tab"), searchParams.get("kind"), searchParams.get("scope"));
  const repo = getRepoFromQuery(searchParams.get("repo"), searchParams.get("scope"));

  const update = (next: { q?: string; kind?: SearchKind; repo?: RepoFilter }) => {
    const params = new URLSearchParams(searchParams.toString());
    const nextQuery = next.q ?? q;
    const nextKind = next.kind ?? kind;
    const nextRepo = next.repo ?? repo;

    if (nextQuery.trim()) {
      params.set("q", nextQuery.trim());
    } else {
      params.delete("q");
    }

    if (nextKind === "all") {
      params.delete("kind");
      params.delete("tab");
      if (nextRepo === "all") {
        params.delete("scope");
      }
    } else {
      params.set("kind", nextKind);
      params.delete("scope");
      params.set(
        "tab",
        nextKind === "people" ? "people" : nextKind === "proposals" ? "eips" : "prs"
      );
    }

    if (nextRepo === "all") {
      params.delete("repo");
      if (!(nextKind === "proposals")) {
        params.delete("scope");
      }
    } else {
      params.set("repo", nextRepo);
      if (nextKind === "proposals") {
        params.set("scope", nextRepo === "eip" ? "eips" : nextRepo === "erc" ? "ercs" : "rips");
      }
    }

    const qs = params.toString();
    router.replace(qs ? `/search?${qs}` : "/search");
  };

  return {
    q,
    kind,
    repo,
    setQuery: (value: string) => update({ q: value }),
    setKind: (value: SearchKind) => update({ kind: value }),
    setRepo: (value: RepoFilter) => update({ repo: value }),
  };
}

function getInternalRepoSegment(repo: string) {
  const lower = repo.toLowerCase();
  if (lower.includes("erc")) return "ercs";
  if (lower.includes("rip")) return "rips";
  return "eips";
}

function matchesRepoFilter(repoName: string, repoFilter: RepoFilter) {
  if (repoFilter === "all") return true;
  const lower = repoName.toLowerCase();
  if (repoFilter === "eip") return lower.includes("eip");
  if (repoFilter === "erc") return lower.includes("erc");
  return lower.includes("rip");
}

function formatDate(value: string | null) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return null;
  }
}

function SearchPageContent() {
  const { q, kind, repo, setKind, setQuery, setRepo } = useSearchQueryState();

  const [inputValue, setInputValue] = useState(q);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [headerInfoOpen, setHeaderInfoOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [proposalStatusFilter, setProposalStatusFilter] = useState<ProposalStatusFilter>("all");
  const [proposalResults, setProposalResults] = useState<ProposalSearchResult[]>([]);
  const [prResults, setPrResults] = useState<PRSearchResult[]>([]);
  const [issueResults, setIssueResults] = useState<IssueSearchResult[]>([]);
  const [authorResults, setAuthorResults] = useState<AuthorSearchResult[]>([]);

  useEffect(() => {
    setInputValue(q);
  }, [q]);

  useEffect(() => {
    const trimmed = inputValue.trim();
    if (trimmed === q) return;
    const timeout = window.setTimeout(() => setQuery(trimmed), 250);
    return () => window.clearTimeout(timeout);
  }, [inputValue, q, setQuery]);

  useEffect(() => {
    if (!q.trim()) {
      setProposalResults([]);
      setPrResults([]);
      setIssueResults([]);
      setAuthorResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);

      const [proposalsRes, prsRes, issuesRes, authorsRes] = await Promise.allSettled([
        client.search.searchProposals({ query: q.trim(), limit: 60 }),
        client.search.searchPRs({ query: q.trim(), limit: 40 }),
        client.search.searchIssues({ query: q.trim(), limit: 40 }),
        client.search.searchAuthors({ query: q.trim(), limit: 40 }),
      ]);

      if (cancelled) return;

      setProposalResults(proposalsRes.status === "fulfilled" ? (proposalsRes.value as ProposalSearchResult[]) : []);
      setPrResults(prsRes.status === "fulfilled" ? (prsRes.value as PRSearchResult[]) : []);
      setIssueResults(issuesRes.status === "fulfilled" ? (issuesRes.value as IssueSearchResult[]) : []);
      setAuthorResults(authorsRes.status === "fulfilled" ? (authorsRes.value as AuthorSearchResult[]) : []);

      const failures = [proposalsRes, prsRes, issuesRes, authorsRes].filter((result) => result.status === "rejected");
      if (failures.length > 0 && failures.length < 4) {
        setError("Some result groups could not be loaded. Showing what is available.");
      } else if (failures.length === 4) {
        setError("Search failed. Please try again.");
      }

      setLoading(false);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [q]);

  const filteredProposals = useMemo(() => {
    return proposalResults.filter((item) => {
      if (repo !== "all" && item.repo !== repo) return false;
      if (proposalStatusFilter !== "all" && normalizeStatus(item.status) !== proposalStatusFilter) return false;
      return true;
    });
  }, [proposalResults, proposalStatusFilter, repo]);

  const filteredPrs = useMemo(
    () => prResults.filter((item) => matchesRepoFilter(item.repo, repo)),
    [prResults, repo]
  );

  const filteredIssues = useMemo(
    () => issueResults.filter((item) => matchesRepoFilter(item.repo, repo)),
    [issueResults, repo]
  );

  const filteredPeople = useMemo(() => {
    if (repo === "all") return authorResults;
    return authorResults.filter((item) => {
      if (repo === "eip") return item.eipCount > 0;
      if (repo === "erc") return item.eipCount > 0;
      if (repo === "rip") return item.eipCount > 0;
      return true;
    });
  }, [authorResults, repo]);

  const visibleSections = useMemo(() => {
    const sections = [
      { key: "proposals" as const, count: filteredProposals.length },
      { key: "prs" as const, count: filteredPrs.length },
      { key: "issues" as const, count: filteredIssues.length },
      { key: "people" as const, count: filteredPeople.length },
    ];
    return kind === "all" ? sections : sections.filter((section) => section.key === kind);
  }, [filteredIssues.length, filteredPeople.length, filteredProposals.length, filteredPrs.length, kind]);

  const totalResults =
    filteredProposals.length + filteredPrs.length + filteredIssues.length + filteredPeople.length;

  const topProposalCategories = useMemo(() => {
    const buckets: Record<string, number> = {};
    for (const item of filteredProposals) {
      const label = item.category || item.type || "Unknown";
      buckets[label] = (buckets[label] ?? 0) + 1;
    }
    return Object.entries(buckets)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [filteredProposals]);

  const runQuickSearch = (value: string) => {
    setInputValue(value);
    setQuery(value);
  };

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setQuery(inputValue.trim());
  };

  return (
    <div className="mx-auto w-full px-3 py-8 sm:px-4 lg:px-5 xl:px-6">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="dec-title persona-title text-balance text-3xl font-semibold tracking-tight leading-[1.1] sm:text-4xl">
              Search Everything
            </h1>
            <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Search proposals, pull requests, issues, and contributors from one place. Start broad, then narrow with
              advanced filters only if you need them.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setHeaderInfoOpen((value) => !value)}
            className="group inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted/60 transition-all hover:border-primary/40 hover:bg-primary/10"
            aria-label="Search page info"
          >
            <Info
              className={cn(
                "h-4 w-4",
                headerInfoOpen ? "text-primary" : "text-muted-foreground group-hover:text-primary"
              )}
            />
          </button>
        </div>
        <AnimatePresence initial={false}>
          {headerInfoOpen && (
            <motion.div
              key="search-header-info"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-4 overflow-hidden"
            >
              <div className="rounded-lg border border-border bg-card/60 p-4 sm:p-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
                  {SEARCH_INFO_ITEMS.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <motion.div
                        key={item.title}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.24, delay: index * 0.06 }}
                        className="flex items-start gap-3"
                      >
                        <div className="shrink-0 rounded-lg border border-primary/20 bg-primary/10 p-2">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="mb-1 text-sm font-semibold text-foreground">{item.title}</h3>
                          <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      <section className="rounded-xl border border-border bg-card/60 p-4 shadow-sm sm:p-5">
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 lg:flex-row">
            <label className="flex flex-1 items-center gap-3 rounded-xl border border-border bg-muted/60 px-4 py-3 transition-colors focus-within:border-primary/40">
              <SearchIcon className="h-4 w-4 text-muted-foreground" />
              <input
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder="Search by EIP number, title, author, repo, PR, issue, label, or contributor name"
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </label>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg persona-gradient px-4 text-sm font-semibold text-black shadow-sm transition-opacity hover:opacity-90"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SearchIcon className="h-4 w-4" />}
              Search
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Try</span>
            {QUICK_SEARCHES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => runQuickSearch(item)}
                className="rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
              >
                {item}
              </button>
            ))}
          </div>
        </form>

        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen} className="mt-4 rounded-xl border border-border/80 bg-background/30 p-4 sm:p-5">
          <CollapsibleTrigger className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground">
            <Filter className="h-4 w-4" />
            Advanced filters
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <FilterGroup label="What to search">
                {[
                  ["all", "Everything"],
                  ["proposals", "Proposals"],
                  ["prs", "Pull Requests"],
                  ["issues", "Issues"],
                  ["people", "People"],
                ].map(([value, label]) => (
                  <FilterChip
                    key={value}
                    active={kind === value}
                    onClick={() => setKind(value as SearchKind)}
                    label={label}
                  />
                ))}
              </FilterGroup>

              <FilterGroup label="Repository family">
                {[
                  ["all", "All repos"],
                  ["eip", "EIPs"],
                  ["erc", "ERCs"],
                  ["rip", "RIPs"],
                ].map(([value, label]) => (
                  <FilterChip
                    key={value}
                    active={repo === value}
                    onClick={() => setRepo(value as RepoFilter)}
                    label={label}
                  />
                ))}
              </FilterGroup>

              <FilterGroup label="Proposal status">
                {[
                  ["all", "Any status"],
                  ["draft", "Draft"],
                  ["review", "Review"],
                  ["last call", "Last Call"],
                  ["final", "Final"],
                  ["living", "Living"],
                  ["other", "Other"],
                ].map(([value, label]) => (
                  <FilterChip
                    key={value}
                    active={proposalStatusFilter === value}
                    onClick={() => setProposalStatusFilter(value as ProposalStatusFilter)}
                    label={label}
                  />
                ))}
              </FilterGroup>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </section>

      {!q && (
        <section className="mt-6 grid gap-4 lg:grid-cols-4">
          <OverviewCard
            icon={<Waypoints className="h-4 w-4 text-primary" />}
            title="Proposals"
            description="EIPs, ERCs, and RIPs by number, title, author, type, category, or status."
          />
          <OverviewCard
            icon={<GitPullRequest className="h-4 w-4 text-primary" />}
            title="Pull Requests"
            description="Search PR titles, authors, labels, governance state, and repository history."
          />
          <OverviewCard
            icon={<ArrowRight className="h-4 w-4 text-primary" />}
            title="Issues"
            description="Find GitHub issues by number, title, label, author, and current open or closed state."
          />
          <OverviewCard
            icon={<UserRound className="h-4 w-4 text-primary" />}
            title="People"
            description="Look up authors, reviewers, editors, and contributors across protocol work."
          />
        </section>
      )}

      {q && (
        <section className="mt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <SummaryCard label="Total results" value={loading ? "..." : `${totalResults}`} />
            <SummaryCard label="Proposals" value={loading ? "..." : `${filteredProposals.length}`} />
            <SummaryCard label="PRs + Issues" value={loading ? "..." : `${filteredPrs.length + filteredIssues.length}`} />
            <SummaryCard label="People" value={loading ? "..." : `${filteredPeople.length}`} />
          </div>

          {error && (
            <div className="rounded-xl border border-border bg-card/60 px-4 py-3 text-sm text-muted-foreground">
              {error}
            </div>
          )}

          {loading ? (
            <div className="rounded-xl border border-border bg-card/60 px-4 py-12 text-center">
              <InlineBrandLoader size="sm" label="Searching proposals, PRs, issues, and people..." />
            </div>
          ) : totalResults === 0 ? (
            <div className="rounded-xl border border-border bg-card/60 px-4 py-12 text-center">
              <p className="text-base font-semibold text-foreground">No results for “{q}”</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Try a proposal number, a broader keyword, a contributor name, or remove one of the advanced filters.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {visibleSections.some((section) => section.key === "proposals" && section.count > 0) && (
                <ResultSection
                  title="Proposals"
                  description={
                    topProposalCategories.length > 0
                      ? `Top categories: ${topProposalCategories.map(([name, count]) => `${name} (${count})`).join(" • ")}`
                      : "EIPs, ERCs, and RIPs matching your query."
                  }
                  count={filteredProposals.length}
                >
                  {filteredProposals.slice(0, 20).map((item) => {
                    const prefix = item.repo === "erc" ? "ERC" : item.repo === "rip" ? "RIP" : "EIP";
                    return (
                      <li key={`${item.repo}-${item.number}`}>
                        <Link
                          href={`/${item.repo}/${item.number}`}
                          className="block rounded-lg border border-border bg-background/40 px-4 py-3 transition-colors hover:border-primary/30 hover:bg-muted/40"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              <span className="font-mono text-xs font-semibold text-primary">
                                {prefix}-{item.number}
                              </span>
                              <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground">
                                {item.status}
                              </span>
                              {(item.category || item.type) && (
                                <span className="rounded-full border border-border bg-muted/30 px-2 py-0.5 text-[11px] text-muted-foreground">
                                  {item.category || item.type}
                                </span>
                              )}
                            </div>
                            {item.author && <span className="text-xs text-muted-foreground">{item.author}</span>}
                          </div>
                          <p className="mt-2 text-sm font-medium text-foreground">{item.title}</p>
                        </Link>
                      </li>
                    );
                  })}
                </ResultSection>
              )}

              {visibleSections.some((section) => section.key === "prs" && section.count > 0) && (
                <ResultSection title="Pull Requests" description="Repository PRs matching title, number, author, or labels." count={filteredPrs.length}>
                  {filteredPrs.slice(0, 16).map((item) => {
                    const repoSegment = getInternalRepoSegment(item.repo);
                    const internalHref = `/pr/${repoSegment}/${item.prNumber}`;
                    const githubHref = `https://github.com/${item.repo}/pull/${item.prNumber}`;
                    return (
                      <li key={`${item.repo}-${item.prNumber}`}>
                        <div className="rounded-lg border border-border bg-background/40 px-4 py-3">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              <Link href={internalHref} className="font-mono text-xs font-semibold text-primary hover:underline">
                                #{item.prNumber}
                              </Link>
                              <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground">
                                {item.mergedAt ? "Merged" : item.state || "Closed"}
                              </span>
                              {item.governanceState && (
                                <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                                  {item.governanceState.replace(/_/g, " ")}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground">{item.repo.split("/")[1] || item.repo}</span>
                              <a
                                href={githubHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
                              >
                                GitHub <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </div>
                          <Link href={internalHref} className="mt-2 block text-sm font-medium text-foreground hover:text-primary">
                            {item.title || "Untitled PR"}
                          </Link>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {item.author && <span>Author: {item.author}</span>}
                            {formatDate(item.updatedAt) && <span>Updated: {formatDate(item.updatedAt)}</span>}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ResultSection>
              )}

              {visibleSections.some((section) => section.key === "issues" && section.count > 0) && (
                <ResultSection title="Issues" description="Internal issue pages plus direct GitHub context." count={filteredIssues.length}>
                  {filteredIssues.slice(0, 16).map((item) => {
                    const repoSegment = getInternalRepoSegment(item.repo);
                    const internalHref = `/issue/${repoSegment}/${item.issueNumber}`;
                    const githubHref = `https://github.com/${item.repo}/issues/${item.issueNumber}`;
                    return (
                      <li key={`${item.repo}-${item.issueNumber}`}>
                        <div className="rounded-lg border border-border bg-background/40 px-4 py-3">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              <Link href={internalHref} className="font-mono text-xs font-semibold text-primary hover:underline">
                                #{item.issueNumber}
                              </Link>
                              <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground">
                                {item.state || "Closed"}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground">{item.repo.split("/")[1] || item.repo}</span>
                              <a
                                href={githubHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
                              >
                                GitHub <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </div>
                          <Link href={internalHref} className="mt-2 block text-sm font-medium text-foreground hover:text-primary">
                            {item.title || "Untitled issue"}
                          </Link>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {item.author && <span>Author: {item.author}</span>}
                            {formatDate(item.updatedAt) && <span>Updated: {formatDate(item.updatedAt)}</span>}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ResultSection>
              )}

              {visibleSections.some((section) => section.key === "people" && section.count > 0) && (
                <ResultSection title="People" description="Authors, reviewers, editors, and active contributors." count={filteredPeople.length}>
                  {filteredPeople.slice(0, 16).map((item) => {
                    const total = item.eipCount + item.prCount + item.issueCount + item.reviewCount;
                    const href = `/people/${encodeURIComponent(item.name)}`;
                    return (
                      <li key={item.name}>
                        <Link
                          href={href}
                          className="block rounded-lg border border-border bg-background/40 px-4 py-3 transition-colors hover:border-primary/30 hover:bg-muted/40"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold text-foreground">{item.name}</span>
                                {item.role && (
                                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                                    {item.role}
                                  </span>
                                )}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                                <span>EIPs: {item.eipCount}</span>
                                <span>PRs: {item.prCount}</span>
                                <span>Issues: {item.issueCount}</span>
                                <span>Reviews: {item.reviewCount}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Total</p>
                              <p className="text-base font-semibold text-foreground">{total}</p>
                            </div>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ResultSection>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border bg-muted/40 text-muted-foreground hover:border-primary/30 hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function OverviewCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        {icon}
        {title}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function ResultSection({
  title,
  description,
  count,
  children,
}: {
  title: string;
  description: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card/60 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
        <div>
          <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
        <span className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
          {count} result{count === 1 ? "" : "s"}
        </span>
      </div>
      <ul className="space-y-3">{children}</ul>
    </section>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background">
          <InlineBrandLoader size="md" label="Loading search..." />
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
