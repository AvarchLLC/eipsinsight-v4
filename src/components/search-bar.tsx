'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, ArrowRight, FileText, Users, GitPullRequest, Loader2 } from 'lucide-react';
import { client } from '@/lib/orpc';
import { cn } from '@/lib/utils';

interface ProposalResult {
  kind: 'proposal';
  number: number;
  repo: 'eip' | 'erc' | 'rip';
  title: string;
  status: string;
  category: string | null;
  type: string | null;
  author: string | null;
  score: number;
}

interface AuthorResult {
  kind: 'author';
  name: string;
  contributionCount: number;
  role?: string | null;
  eipCount?: number;
  prCount?: number;
  issueCount?: number;
  reviewCount?: number;
  lastActivity?: string | null;
}

interface PRResult {
  kind: 'pr';
  prNumber: number;
  repo: string;
  title: string | null;
  state: string | null;
}

type SearchResult = ProposalResult | AuthorResult | PRResult;

type AuthorSearchRaw = Partial<AuthorResult> & {
  name: string;
  contributionCount?: number;
  eipCount?: number;
  prCount?: number;
  issueCount?: number;
  reviewCount?: number;
};

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  Draft: { bg: 'bg-slate-500/20', text: 'text-slate-300', border: 'border-slate-400/30' },
  Review: { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-400/30' },
  'Last Call': { bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-400/30' },
  Final: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-400/30' },
  Living: { bg: 'bg-cyan-500/20', text: 'text-cyan-300', border: 'border-cyan-400/30' },
  Stagnant: { bg: 'bg-gray-500/20', text: 'text-gray-300', border: 'border-gray-400/30' },
  Withdrawn: { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-400/30' },
};

export function SearchBar() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    proposals: ProposalResult[];
    authors: AuthorResult[];
    prs: PRResult[];
  }>({
    proposals: [],
    authors: [],
    prs: [],
  });

  const openSearchPage = useCallback(
    (rawQuery: string, params?: { tab?: 'people' | 'eips' | 'prs' }) => {
      const trimmed = rawQuery.trim();
      if (!trimmed) return;

      const searchParams = new URLSearchParams({ q: trimmed });
      if (params?.tab) {
        searchParams.set('tab', params.tab);
      }

      router.push(`/search?${searchParams.toString()}`);
    },
    [router]
  );

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults({ proposals: [], authors: [], prs: [] });
      setShowDropdown(false);
      setLoading(false);
      return;
    }

    // Always show dropdown while searching so users get immediate feedback.
    setShowDropdown(true);
    setLoading(true);

    let cancelled = false;

    const timeoutId = setTimeout(async () => {
      try {
        const searchQuery = query.trim();
        const [proposalsRes, authorsRes, prsRes] = await Promise.allSettled([
          client.search.searchProposals({ query: searchQuery, limit: 50 }),
          client.search.searchAuthors({ query: searchQuery, limit: 20 }),
          client.search.searchPRs({ query: searchQuery, limit: 20 }),
        ]);

        // Only update if this is still the latest request
        if (cancelled) return;

        const proposals = proposalsRes.status === 'fulfilled' ? proposalsRes.value : [];
        const authors = authorsRes.status === 'fulfilled' ? (authorsRes.value as AuthorSearchRaw[]) : [];
        const prs = prsRes.status === 'fulfilled' ? prsRes.value : [];

        if (proposalsRes.status === 'rejected') console.error('Search proposals failed:', proposalsRes.reason);
        if (authorsRes.status === 'rejected') console.error('Search authors failed:', authorsRes.reason);
        if (prsRes.status === 'rejected') console.error('Search PRs failed:', prsRes.reason);

        // Fix: Convert proposals' repo property to union type
        setResults({
          proposals: proposals.map(p => ({
            ...p,
            // Map repo string to allowed values ("eip" | "erc" | "rip"), fallback to "eip" if unknown
            repo: (["eip", "erc", "rip"].includes(p.repo) ? p.repo : "eip") as "eip" | "erc" | "rip"
          })),
          authors: authors.map((a) => ({
            kind: 'author' as const,
            ...a,
            // Derive a contributionCount if not provided by the backend
            contributionCount:
              a.contributionCount ??
              ((a.eipCount ?? 0) +
                (a.prCount ?? 0) +
                (a.issueCount ?? 0) +
                (a.reviewCount ?? 0)),
          })),
          prs,
        });
        setSelectedIndex(-1);
      } catch (err) {
        if (cancelled) return;
        console.error('Search error:', err);
        setResults({ proposals: [], authors: [], prs: [] });
        // Keep dropdown open to show "No results found" fallback instead of appearing broken.
        setShowDropdown(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [query]);

  // Handler for clicking a result (must be defined before keyboard effect)
  const handleResultClick = useCallback((result: SearchResult) => {
    if (result.kind === 'proposal') {
      router.push(`/${result.repo}/${result.number}`);
    } else if (result.kind === 'author') {
      router.push(`/people/${encodeURIComponent(result.name)}`);
    } else if (result.kind === 'pr') {
      // Navigate to internal PR detail page
      // Convert full repo name (ethereum/EIPs) to short name (eips)
      let shortRepo = 'eips'; // default
      if (result.repo.toLowerCase().includes('erc')) shortRepo = 'ercs';
      if (result.repo.toLowerCase().includes('rip')) shortRepo = 'rips';
      router.push(`/pr/${shortRepo}/${result.prNumber}`);
    }
    setShowDropdown(false);
    setQuery('');
    inputRef.current?.blur();
  }, [router]);

  // Keyboard navigation
  useEffect(() => {
    if (!showDropdown) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const allResults = [
        ...results.proposals,
        ...results.authors,
        ...results.prs,
      ];
      const totalResults = allResults.length;

      if (totalResults === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % totalResults);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev <= 0 ? totalResults - 1 : prev - 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < totalResults) {
            handleResultClick(allResults[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setShowDropdown(false);
          inputRef.current?.blur();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDropdown, selectedIndex, results, handleResultClick]);

  // Scroll selected item into view
  useEffect(() => {
    if (showDropdown && dropdownRef.current) {
      const selectedElement = dropdownRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      );
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex, showDropdown]);


  const allResults = [
    ...results.proposals,
    ...results.authors,
    ...results.prs,
  ];
  const hasResults = allResults.length > 0;

  return (
    <div className="relative mx-auto w-full max-w-3xl">
      <div className="relative">
        {/* Search Icon */}
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        
        {/* Search Input */}
        <input
          ref={inputRef}
          type="text"
          placeholder="Search EIPs, ERCs, RIPs, authors, status…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;

            const trimmed = query.trim();
            if (!trimmed) return;

            // If dropdown is open and has selected results, keyboard effect handles Enter.
            // Otherwise, fall back to full search page.
            if (!showDropdown || allResults.length === 0 || loading) {
              e.preventDefault();
              setShowDropdown(false);
              openSearchPage(trimmed);
            }
          }}
          onFocus={() => {
            if (query.trim() || hasResults) {
              setShowDropdown(true);
            }
          }}
          onBlur={() => {
            // Delay to allow click events
            setTimeout(() => setShowDropdown(false), 200);
          }}
          className={cn(
            "h-10 w-full rounded-lg border border-border bg-muted/60 pl-10 pr-10 text-sm text-foreground",
            "placeholder:text-muted-foreground backdrop-blur-sm transition-all duration-200",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-primary/40"
          )}
        />
        
        {/* Loading / Clear Button */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : query ? (
            <button
              onClick={() => {
                setQuery('');
                setShowDropdown(false);
                inputRef.current?.focus();
              }}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Dropdown */}
      {showDropdown && (query.trim() || hasResults) && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-border bg-card/95 shadow-2xl backdrop-blur-xl"
        >
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Searching...</p>
            </div>
          ) : !hasResults ? (
            <div className="p-8 text-center">
              <Search className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="mb-1 text-base font-semibold text-foreground">
                No results found
              </p>
              <p className="text-sm text-muted-foreground">
                Try searching for an EIP number, title, author, or status
              </p>
            </div>
          ) : (
            <div
              className="max-h-[70vh] overflow-y-auto overscroll-contain space-y-0 pr-2"
              style={{ scrollbarGutter: 'stable both-edges' }}
            >
              {/* Proposals Section */}
              {results.proposals.length > 0 && (
                <div className="border-b border-border/80">
                  <div className="sticky top-0 z-10 border-b border-border bg-muted/80 px-4 py-2 backdrop-blur-sm">
                    <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <FileText className="h-3.5 w-3.5" />
                      Proposals ({results.proposals.length})
                    </h3>
                  </div>
                  <div
                    className={cn(
                    "overflow-y-auto",
                    results.proposals.length > 3 ? "max-h-56" : ""
                    )}
                    style={{ scrollbarGutter: 'stable both-edges' }}
                  >
                    {results.proposals.map((result, index) => {
                      const statusColor = statusColors[result.status] || statusColors['Draft'];
                      const isSelected = selectedIndex === index;
                      
                      return (
                        <div
                          key={`proposal-${result.repo}-${result.number}`}
                          data-index={index}
                          onClick={() => handleResultClick(result)}
                          className={cn(
                            "cursor-pointer border-b border-border/60 p-3.5 transition-all last:border-0",
                            isSelected 
                              ? "border-l-2 border-l-primary bg-primary/10"
                              : "hover:bg-muted/50"
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <span className="font-mono text-sm font-bold text-primary">
                                  {result.repo.toUpperCase()}-{result.number}
                                </span>
                                <span className={cn(
                                  "px-2 py-0.5 text-xs font-semibold rounded-full border",
                                  statusColor.bg,
                                  statusColor.text,
                                  statusColor.border
                                )}>
                                  {result.status}
                                </span>
                                {result.category && (
                                  <span className="rounded-md border border-border bg-muted/60 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                    {result.category}
                                  </span>
                                )}
                              </div>
                              <div className="mb-1 line-clamp-2 text-sm font-medium text-foreground">
                                {result.title}
                              </div>
                              {result.author ? (
                                <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                                  <Users className="h-3 w-3" />
                                  {result.author.split(',')[0]}
                                  {result.author.split(',').length > 1 && ` +${result.author.split(',').length - 1} more`}
                                </div>
                              ) : null}
                            </div>
                            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Authors Section */}
              {results.authors.length > 0 && (
                <div className="border-b border-border/80">
                  <div className="sticky top-0 z-10 border-b border-border bg-muted/80 px-4 py-2 backdrop-blur-sm">
                    <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      Authors ({results.authors.length})
                    </h3>
                  </div>
                  <div
                    className={cn(
                    "overflow-y-auto",
                    results.authors.length > 3 ? "max-h-56" : ""
                    )}
                    style={{ scrollbarGutter: 'stable both-edges' }}
                  >
                    {results.authors.map((result, index) => {
                      const globalIndex = results.proposals.length + index;
                      const isSelected = selectedIndex === globalIndex;
                      
                      return (
                        <div
                          key={`author-${result.name}`}
                          data-index={globalIndex}
                          onClick={() => handleResultClick(result)}
                          className={cn(
                            "cursor-pointer border-b border-border/60 p-3.5 transition-all last:border-0",
                            isSelected 
                              ? "border-l-2 border-l-primary bg-primary/10"
                              : "hover:bg-muted/50"
                          )}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
                                <span className="text-sm font-bold text-primary">
                                  {result.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="truncate text-sm font-semibold text-foreground">
                                  {result.name}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <FileText className="h-3 w-3" />
                                  {result.contributionCount} contribution{result.contributionCount !== 1 ? 's' : ''}
                                </div>
                              </div>
                            </div>
                            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Pull Requests Section */}
              {results.prs.length > 0 && (
                <div>
                  <div className="sticky top-0 z-10 border-b border-border bg-muted/80 px-4 py-2 backdrop-blur-sm">
                    <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <GitPullRequest className="h-3.5 w-3.5" />
                      Pull Requests ({results.prs.length})
                    </h3>
                  </div>
                  <div
                    className={cn(
                    "overflow-y-auto",
                    results.prs.length > 3 ? "max-h-56" : ""
                    )}
                    style={{ scrollbarGutter: 'stable both-edges' }}
                  >
                    {results.prs.map((result, index) => {
                      const globalIndex = results.proposals.length + results.authors.length + index;
                      const isSelected = selectedIndex === globalIndex;
                      
                      return (
                        <div
                          key={`pr-${result.repo}-${result.prNumber}`}
                          data-index={globalIndex}
                          onClick={() => handleResultClick(result)}
                          className={cn(
                            "cursor-pointer border-b border-border/60 p-3.5 transition-all last:border-0",
                            isSelected 
                              ? "border-l-2 border-l-primary bg-primary/10"
                              : "hover:bg-muted/50"
                          )}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-sm font-bold text-primary">
                                  #{result.prNumber}
                                </span>
                                {result.state && (
                                  <span className={cn(
                                    "px-2 py-0.5 text-xs font-medium rounded-md",
                                    result.state === 'open' ? "bg-emerald-500/20 text-emerald-300" :
                                    "bg-slate-500/20 text-slate-300"
                                  )}>
                                    {result.state}
                                  </span>
                                )}
                              </div>
                              {result.title && (
                                <div className="line-clamp-2 text-sm text-foreground">
                                  {result.title}
                                </div>
                              )}
                              <div className="mt-1 text-xs text-muted-foreground">
                                {result.repo}
                              </div>
                            </div>
                            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Keyboard hints */}
              {hasResults && (
                <div className="border-t border-border bg-muted/60 px-4 py-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <kbd className="rounded border border-border bg-background px-2 py-1 font-mono font-semibold text-foreground">↑</kbd>
                        <kbd className="rounded border border-border bg-background px-2 py-1 font-mono font-semibold text-foreground">↓</kbd>
                        <span className="ml-1">Navigate</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <kbd className="rounded border border-border bg-background px-2 py-1 font-mono font-semibold text-foreground">↵</kbd>
                        <span>Select</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <kbd className="rounded border border-border bg-background px-2 py-1 font-mono font-semibold text-foreground">Esc</kbd>
                        <span>Close</span>
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {allResults.length} result{allResults.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
