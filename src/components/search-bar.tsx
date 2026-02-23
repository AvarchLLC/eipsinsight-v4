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

// Status color mapping (light + dark mode)
const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  'Draft': { bg: 'bg-cyan-500/20', text: 'text-cyan-600 dark:text-cyan-300', border: 'border-cyan-400/30' },
  'Review': { bg: 'bg-blue-500/20', text: 'text-blue-600 dark:text-blue-300', border: 'border-blue-400/30' },
  'Last Call': { bg: 'bg-amber-500/20', text: 'text-amber-600 dark:text-amber-300', border: 'border-amber-400/30' },
  'Final': { bg: 'bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-300', border: 'border-emerald-400/30' },
  'Stagnant': { bg: 'bg-slate-500/20', text: 'text-slate-600 dark:text-slate-300', border: 'border-slate-400/30' },
  'Withdrawn': { bg: 'bg-red-500/20', text: 'text-red-600 dark:text-red-300', border: 'border-red-400/30' },
};

export function SearchBar() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
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

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults({ proposals: [], authors: [], prs: [] });
      setShowDropdown(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const [proposalsRes, authorsRes, prsRes] = await Promise.allSettled([
          client.search.searchProposals({ query: query.trim(), limit: 50 }),
          client.search.searchAuthors({ query: query.trim(), limit: 20 }),
          client.search.searchPRs({ query: query.trim(), limit: 20 }),
        ]);

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
        setShowDropdown(true);
        setSelectedIndex(0);
      } catch (err) {
        console.error('Search error:', err);
        setResults({ proposals: [], authors: [], prs: [] });
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Handler for clicking a result (must be defined before keyboard effect)
  const handleResultClick = useCallback((result: SearchResult) => {
    if (result.kind === 'proposal') {
      router.push(`/${result.repo}/${result.number}`);
    } else if (result.kind === 'author') {
      // TODO: Navigate to author page when available
      router.push(`/search?author=${encodeURIComponent(result.name)}`);
    } else if (result.kind === 'pr') {
      // Open GitHub PR directly using the full repository name from search results,
      // e.g. "ethereum/EIPs" -> https://github.com/ethereum/EIPs/pull/11171
      const githubUrl = `https://github.com/${result.repo}/pull/${result.prNumber}`;
      window.open(githubUrl, "_blank", "noopener,noreferrer");
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
          setSelectedIndex((prev) => (prev - 1 + totalResults) % totalResults);
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex < totalResults) {
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
    <div className="relative w-full max-w-3xl mx-auto">
      <div className="relative">
        {/* Search Icon */}
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-cyan-400/80 pointer-events-none" />
        
        {/* Search Input */}
        <input
          ref={inputRef}
          type="text"
          placeholder="Search EIPs, ERCs, RIPs, authors, status…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
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
            "w-full pl-12 pr-12 py-3 text-base",
            "rounded-full border border-slate-300 dark:border-cyan-300/30",
            "bg-white/95 dark:bg-black/40 backdrop-blur-sm",
            "text-slate-900 dark:text-slate-200 placeholder:text-slate-500 dark:placeholder:text-slate-400",
            "focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-cyan-400/50",
            "transition-all"
          )}
        />
        
        {/* Loading / Clear Button */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          {loading ? (
            <Loader2 className="h-4 w-4 text-slate-500 dark:text-cyan-400 animate-spin" />
          ) : query ? (
            <button
              onClick={() => {
                setQuery('');
                setShowDropdown(false);
                inputRef.current?.focus();
              }}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
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
          className="absolute mt-3 w-full bg-white dark:bg-slate-950/95 border border-slate-200 dark:border-cyan-400/20 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl"
          style={{ maxHeight: '480px' }}
        >
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-8 w-8 text-slate-500 dark:text-cyan-400 animate-spin mx-auto mb-3" />
              <p className="text-slate-600 dark:text-slate-400 text-sm">Searching...</p>
            </div>
          ) : !hasResults ? (
            <div className="p-8 text-center">
              <Search className="h-12 w-12 text-slate-400 dark:text-slate-500/50 mx-auto mb-3" />
              <p className="text-slate-700 dark:text-slate-300 font-semibold text-base mb-1">
                No results found
              </p>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Try searching for an EIP number, title, author, or status
              </p>
            </div>
          ) : (
            <div className="max-h-[480px] overflow-y-auto">
              {/* Proposals Section */}
              {results.proposals.length > 0 && (
                <div className="border-b border-slate-200 dark:border-cyan-400/10">
                  <div className="sticky top-0 z-10 px-4 py-2.5 bg-slate-100 dark:bg-gradient-to-r dark:from-cyan-500/10 dark:to-emerald-500/10 border-b border-slate-200 dark:border-cyan-400/20 backdrop-blur-sm">
                    <h3 className="text-xs font-semibold text-slate-600 dark:text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5" />
                      Proposals ({results.proposals.length})
                    </h3>
                  </div>
                  {results.proposals.map((result, index) => {
                    const statusColor = statusColors[result.status] || statusColors['Draft'];
                    const isSelected = selectedIndex === index;
                    
                    return (
                      <div
                        key={`proposal-${result.repo}-${result.number}`}
                        data-index={index}
                        onClick={() => handleResultClick(result)}
                        className={cn(
                          "cursor-pointer p-4 transition-all border-b border-slate-200 dark:border-slate-800/50 last:border-0",
                          isSelected 
                            ? "bg-slate-100 dark:bg-gradient-to-r dark:from-cyan-500/20 dark:to-emerald-500/20 border-l-4 border-l-cyan-500 dark:border-l-cyan-400" 
                            : "hover:bg-slate-50 dark:hover:bg-slate-900/50"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <span className="text-sm font-bold text-cyan-700 dark:text-cyan-300 font-mono">
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
                                <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-slate-200 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300">
                                  {result.category}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-slate-900 dark:text-white font-medium mb-1 line-clamp-2">
                              {result.title}
                            </div>
                            {result.author && (
                              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                                <Users className="h-3 w-3" />
                                {result.author.split(',')[0]}
                                {result.author.split(',').length > 1 && ` +${result.author.split(',').length - 1} more`}
                              </div>
                            )}
                          </div>
                          <ArrowRight className="h-4 w-4 text-slate-400 dark:text-slate-500 flex-shrink-0 mt-1" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Authors Section */}
              {results.authors.length > 0 && (
                <div className="border-b border-slate-200 dark:border-cyan-400/10">
                  <div className="sticky top-0 z-10 px-4 py-2.5 bg-slate-100 dark:bg-gradient-to-r dark:from-violet-500/10 dark:to-pink-500/10 border-b border-slate-200 dark:border-violet-400/20 backdrop-blur-sm">
                    <h3 className="text-xs font-semibold text-slate-600 dark:text-violet-300 uppercase tracking-wider flex items-center gap-2">
                      <Users className="h-3.5 w-3.5" />
                      Authors ({results.authors.length})
                    </h3>
                  </div>
                  {results.authors.map((result, index) => {
                    const globalIndex = results.proposals.length + index;
                    const isSelected = selectedIndex === globalIndex;
                    
                    return (
                      <div
                        key={`author-${result.name}`}
                        data-index={globalIndex}
                        onClick={() => handleResultClick(result)}
                        className={cn(
                          "cursor-pointer p-4 transition-all border-b border-slate-200 dark:border-slate-800/50 last:border-0",
                          isSelected 
                            ? "bg-slate-100 dark:bg-gradient-to-r dark:from-violet-500/20 dark:to-pink-500/20 border-l-4 border-l-violet-500 dark:border-l-violet-400" 
                            : "hover:bg-slate-50 dark:hover:bg-slate-900/50"
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                              <span className="text-white font-bold text-sm">
                                {result.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                {result.name}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {result.contributionCount} contribution{result.contributionCount !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Pull Requests Section */}
              {results.prs.length > 0 && (
                <div>
                  <div className="sticky top-0 z-10 px-4 py-2.5 bg-slate-100 dark:bg-gradient-to-r dark:from-blue-500/10 dark:to-indigo-500/10 border-b border-slate-200 dark:border-blue-400/20 backdrop-blur-sm">
                    <h3 className="text-xs font-semibold text-slate-600 dark:text-blue-300 uppercase tracking-wider flex items-center gap-2">
                      <GitPullRequest className="h-3.5 w-3.5" />
                      Pull Requests ({results.prs.length})
                    </h3>
                  </div>
                  {results.prs.map((result, index) => {
                    const globalIndex = results.proposals.length + results.authors.length + index;
                    const isSelected = selectedIndex === globalIndex;
                    
                    return (
                      <div
                        key={`pr-${result.repo}-${result.prNumber}`}
                        data-index={globalIndex}
                        onClick={() => handleResultClick(result)}
                        className={cn(
                          "cursor-pointer p-4 transition-all border-b border-slate-200 dark:border-slate-800/50 last:border-0",
                          isSelected 
                            ? "bg-slate-100 dark:bg-gradient-to-r dark:from-blue-500/20 dark:to-indigo-500/20 border-l-4 border-l-blue-500 dark:border-l-blue-400" 
                            : "hover:bg-slate-50 dark:hover:bg-slate-900/50"
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-bold text-blue-700 dark:text-blue-300 font-mono">
                                #{result.prNumber}
                              </span>
                              {result.state && (
                                <span className={cn(
                                  "px-2 py-0.5 text-xs font-medium rounded-md",
                                  result.state === 'open' ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300" :
                                  result.state === 'closed' ? "bg-slate-500/20 text-slate-600 dark:text-slate-300" :
                                  "bg-slate-500/20 text-slate-600 dark:text-slate-300"
                                )}>
                                  {result.state}
                                </span>
                              )}
                            </div>
                            {result.title && (
                              <div className="text-sm text-slate-900 dark:text-white line-clamp-2">
                                {result.title}
                              </div>
                            )}
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {result.repo}
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Keyboard hints */}
              {hasResults && (
                <div className="px-4 py-3 bg-slate-100 dark:bg-slate-900/50 border-t border-slate-200 dark:border-cyan-400/10">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        <kbd className="px-2 py-1 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded shadow-sm font-mono font-semibold text-slate-600 dark:text-slate-300">↑</kbd>
                        <kbd className="px-2 py-1 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded shadow-sm font-mono font-semibold text-slate-600 dark:text-slate-300">↓</kbd>
                        <span className="ml-1">Navigate</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        <kbd className="px-2 py-1 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded shadow-sm font-mono font-semibold text-slate-600 dark:text-slate-300">↵</kbd>
                        <span>Select</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        <kbd className="px-2 py-1 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded shadow-sm font-mono font-semibold text-slate-600 dark:text-slate-300">Esc</kbd>
                        <span>Close</span>
                      </span>
                    </div>
                    <span className="text-slate-600 dark:text-slate-500 text-xs">
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
