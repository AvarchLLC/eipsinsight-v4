'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Zap, ArrowRight, X, AlertCircle, CheckCircle2, CornerDownLeft, Loader2 } from 'lucide-react';
import { client } from '@/lib/orpc';
import { cn } from '@/lib/utils';

interface ProposalSearchResult {
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

interface KnownStandardInfo {
  repo: 'eip' | 'erc' | 'rip';
  name: string;
  title: string;
  status: string;
  movedFromEip?: boolean;
}

// Curated lookup table for instant 0ms offline sanity checks for widely referenced standards
const KNOWN_STANDARDS: Record<number, KnownStandardInfo> = {
  // ERCs originally created or commonly referred to as EIPs
  20: { repo: 'erc', name: 'ERC-20', title: 'Fungible Token Standard', status: 'Final', movedFromEip: true },
  721: { repo: 'erc', name: 'ERC-721', title: 'Non-Fungible Token Standard', status: 'Final', movedFromEip: true },
  1155: { repo: 'erc', name: 'ERC-1155', title: 'Multi-Token Standard', status: 'Final', movedFromEip: true },
  777: { repo: 'erc', name: 'ERC-777', title: 'Advanced Token Standard', status: 'Final', movedFromEip: true },
  1271: { repo: 'erc', name: 'ERC-1271', title: 'Standard Signature Validation Method for Contracts', status: 'Final', movedFromEip: true },
  2612: { repo: 'erc', name: 'ERC-2612', title: 'Permit Extension for ERC-20 Signed Approvals', status: 'Final', movedFromEip: true },
  4337: { repo: 'erc', name: 'ERC-4337', title: 'Account Abstraction Using Alt Mempool', status: 'Draft', movedFromEip: true },
  4626: { repo: 'erc', name: 'ERC-4626', title: 'Tokenized Vault Standard', status: 'Final', movedFromEip: true },
  6551: { repo: 'erc', name: 'ERC-6551', title: 'Non-Fungible Token Bound Accounts', status: 'Draft', movedFromEip: true },
  
  // Core EIPs
  1: { repo: 'eip', name: 'EIP-1', title: 'EIP Purpose and Guidelines', status: 'Living' },
  1559: { repo: 'eip', name: 'EIP-1559', title: 'Fee market change for ETH 1.0 chain', status: 'Final' },
  4844: { repo: 'eip', name: 'EIP-4844', title: 'Shard Blob Transactions', status: 'Final' },
  3074: { repo: 'eip', name: 'EIP-3074', title: 'AUTH and AUTHCALL opcodes', status: 'Review' },
  7702: { repo: 'eip', name: 'EIP-7702', title: 'Set EOA Account Code for Transaction', status: 'Final' },
  4788: { repo: 'eip', name: 'EIP-4788', title: 'Beacon block root in EVM', status: 'Final' },
  6963: { repo: 'eip', name: 'EIP-6963', title: 'Multi-Injected Provider Discovery', status: 'Final' },

  // RIPs
  7560: { repo: 'rip', name: 'RIP-7560', title: 'Native Account Abstraction', status: 'Draft' },
  7212: { repo: 'rip', name: 'RIP-7212', title: 'secp256r1 Curve Support', status: 'Final' },
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  Final: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  Draft: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
  Review: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  'Last Call': 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
  Living: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
  Stagnant: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
  Withdrawn: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
};

const REPO_BADGE_STYLES: Record<string, { label: string; style: string }> = {
  eip: { label: 'EIP', style: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border-cyan-500/30' },
  erc: { label: 'ERC', style: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30' },
  rip: { label: 'RIP', style: 'bg-violet-500/15 text-violet-600 dark:text-violet-300 border-violet-500/30' },
};

export function HeroQuickSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ProposalSearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Parse typed input into standard components (repo prefix, standard number, keywords)
  const parsedInput = React.useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return null;

    const lower = trimmed.toLowerCase();

    // Check explicit repo prefix + number (e.g. eip-1559, erc20, rip 7560)
    const matchExplicit = lower.match(/^(eip|erc|rip)[-\s]?(\d+)$/);
    if (matchExplicit) {
      return {
        prefix: matchExplicit[1] as 'eip' | 'erc' | 'rip',
        number: parseInt(matchExplicit[2], 10),
        isPureNumber: false,
        raw: trimmed,
      };
    }

    // Check pure number (e.g. 1559, 20, 7560)
    if (/^\d+$/.test(trimmed)) {
      return {
        prefix: null,
        number: parseInt(trimmed, 10),
        isPureNumber: true,
        raw: trimmed,
      };
    }

    return {
      prefix: null,
      number: null,
      isPureNumber: false,
      raw: trimmed,
    };
  }, [query]);

  // Generate dynamic sanity check info
  const sanityCheck = React.useMemo(() => {
    if (!parsedInput) return null;

    const num = parsedInput.number;

    // Check known standard dictionary
    if (num && KNOWN_STANDARDS[num]) {
      const known = KNOWN_STANDARDS[num];
      const targetPath = `/${known.repo}/${num}`;

      // User typed "EIP-20" or "eip 20", but it moved to ERC repository!
      if (parsedInput.prefix && parsedInput.prefix !== known.repo) {
        return {
          type: 'moved' as const,
          title: `Moved Standard Warning`,
          message: `${parsedInput.prefix.toUpperCase()}-${num} is officially classified as ${known.name} in the ${known.repo.toUpperCase()} repository.`,
          suggestion: `Swoop directly to ${known.name}`,
          targetPath,
          repo: known.repo,
          number: num,
          name: known.name,
          specTitle: known.title,
          status: known.status,
        };
      }

      // Exact match (pure number or matching prefix)
      return {
        type: 'matched' as const,
        title: `Found Spec Match: ${known.name}`,
        message: `${known.name} — ${known.title} (${known.status})`,
        suggestion: `Swoop directly to ${known.name}`,
        targetPath,
        repo: known.repo,
        number: num,
        name: known.name,
        specTitle: known.title,
        status: known.status,
      };
    }

    // Check live API search results if top result matches number
    if (num && results.length > 0) {
      const match = results.find((r) => r.number === num);
      if (match) {
        const repoKey = match.repo;
        const name = `${repoKey.toUpperCase()}-${num}`;
        const targetPath = `/${repoKey}/${num}`;

        if (parsedInput.prefix && parsedInput.prefix !== repoKey) {
          return {
            type: 'moved' as const,
            title: `Repo Location Warning`,
            message: `Proposal #${num} lives in the ${repoKey.toUpperCase()} repository (${name}).`,
            suggestion: `Swoop directly to ${name}`,
            targetPath,
            repo: repoKey,
            number: num,
            name,
            specTitle: match.title || '',
            status: match.status,
          };
        }

        return {
          type: 'matched' as const,
          title: `Found Proposal Match: ${name}`,
          message: `${name} — ${match.title || 'Ethereum Proposal'} (${match.status})`,
          suggestion: `Swoop directly to ${name}`,
          targetPath,
          repo: repoKey,
          number: num,
          name,
          specTitle: match.title || '',
          status: match.status,
        };
      }
    }

    return null;
  }, [parsedInput, results]);

  // Debounced API search for autocomplete dropdown
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setIsOpen(false);
      setLoading(false);
      return;
    }

    setIsOpen(true);
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await client.search.searchProposals({ query: trimmed, limit: 8 });
        setResults(res as ProposalSearchResult[]);
      } catch (err) {
        console.error('Failed to search proposals:', err);
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Swoop action handler
  const handleSwoop = useCallback(
    (explicitPath?: string) => {
      if (explicitPath) {
        setIsOpen(false);
        router.push(explicitPath);
        return;
      }

      // If sanity check exists, swoop directly to target path!
      if (sanityCheck) {
        setIsOpen(false);
        router.push(sanityCheck.targetPath);
        return;
      }

      // If typed input has explicit repo + number (e.g. erc-20, rip-7560)
      if (parsedInput?.number) {
        const repo = parsedInput.prefix || 'eip';
        setIsOpen(false);
        router.push(`/${repo}/${parsedInput.number}`);
        return;
      }

      // Default to global search page if keyword search
      const trimmed = query.trim();
      if (trimmed) {
        setIsOpen(false);
        router.push(`/search?q=${encodeURIComponent(trimmed)}`);
      }
    },
    [router, sanityCheck, parsedInput, query]
  );

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > -1 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && results[selectedIndex]) {
        const item = results[selectedIndex];
        handleSwoop(`/${item.repo}/${item.number}`);
      } else {
        handleSwoop();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const quickPills = [
    { label: 'EIP-1559', path: '/eip/1559', tag: 'Fee Market' },
    { label: 'ERC-20', path: '/erc/20', tag: 'Tokens' },
    { label: 'ERC-721', path: '/erc/721', tag: 'NFTs' },
    { label: 'ERC-4337', path: '/erc/4337', tag: 'Account Abstraction' },
    { label: 'EIP-4844', path: '/eip/4844', tag: 'Blobs' },
    { label: 'EIP-7702', path: '/eip/7702', tag: 'EOA Code' },
    { label: 'RIP-7560', path: '/rip/7560', tag: 'Native AA' },
  ];

  return (
    <section className="relative w-full overflow-visible">
      {/* Outer Card Wrapper with Glow & Ambient Gradient */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-card/95 via-card/85 to-primary/[0.03] p-4 shadow-xl backdrop-blur-md sm:p-6 md:p-7">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-4">
          {/* Header & Description */}
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-primary">
                <Zap className="h-3.5 w-3.5 fill-primary text-primary" />
                <span>Instant Spec Swoop & Sanity Check</span>
              </div>
              <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Jump directly to any EIP, ERC, or RIP
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                Type any number or standard (e.g. <code className="font-semibold text-foreground">1559</code>, <code className="font-semibold text-foreground">erc-20</code>, <code className="font-semibold text-foreground">rip-7560</code>) to swoop instantly — no waiting for search page results.
              </p>
            </div>
          </div>

          {/* Search Box Form */}
          <div className="relative w-full">
            <div className="group relative flex w-full items-center rounded-xl border border-border/80 bg-background/90 p-1.5 shadow-md transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 hover:border-primary/50">
              <div className="flex shrink-0 items-center pl-3 text-muted-foreground group-focus-within:text-primary">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
              </div>

              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => query.trim() && setIsOpen(true)}
                onKeyDown={handleKeyDown}
                placeholder="Search standard number (e.g. 1559, 20, 7560) or title/author..."
                className="w-full bg-transparent px-3 py-2 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground/60 sm:text-base"
              />

              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setResults([]);
                    setIsOpen(false);
                  }}
                  className="mr-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => handleSwoop()}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/40 sm:py-2.5 sm:text-sm"
              >
                <span>Swoop</span>
                <Zap className="h-4 w-4 fill-primary-foreground" />
              </button>
            </div>

            {/* Dynamic Sanity Check Alert Banner */}
            <AnimatePresence>
              {sanityCheck && (
                <motion.div
                  initial={{ opacity: 0, y: -6, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -6, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-2.5 overflow-hidden"
                >
                  <div
                    onClick={() => handleSwoop(sanityCheck.targetPath)}
                    className={cn(
                      'group flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 shadow-sm transition-all hover:shadow-md',
                      sanityCheck.type === 'moved'
                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200 hover:bg-amber-500/15'
                        : 'border-primary/40 bg-primary/10 text-foreground hover:bg-primary/15'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {sanityCheck.type === 'moved' ? (
                        <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider">
                            {sanityCheck.title}
                          </span>
                          {sanityCheck.status && (
                            <span
                              className={cn(
                                'rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                                STATUS_BADGE_STYLES[sanityCheck.status] || 'bg-muted text-muted-foreground'
                              )}
                            >
                              {sanityCheck.status}
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-muted-foreground sm:text-sm">
                          {sanityCheck.message}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1 text-xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
                      <span>Swoop to {sanityCheck.name}</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Live Autocomplete Suggestions Dropdown */}
            <AnimatePresence>
              {isOpen && results.length > 0 && (
                <motion.div
                  ref={dropdownRef}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-xl border border-border/80 bg-popover p-1.5 shadow-2xl backdrop-blur-xl"
                >
                  <div className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Matching Proposals ({results.length})
                  </div>
                  {results.map((item, index) => {
                    const repoKey = item.repo;
                    const targetPath = `/${repoKey}/${item.number}`;
                    const repoBadge = REPO_BADGE_STYLES[repoKey] || REPO_BADGE_STYLES.eip;
                    const isSelected = index === selectedIndex;

                    return (
                      <div
                        key={`${item.repo}-${item.number}`}
                        onClick={() => handleSwoop(targetPath)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={cn(
                          'flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 transition-colors',
                          isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted/70 text-foreground'
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={cn(
                              'rounded-md border px-2 py-0.5 text-xs font-bold shrink-0',
                              repoBadge.style
                            )}
                          >
                            {repoBadge.label}-{item.number}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold sm:text-sm">
                              {item.title || `${repoBadge.label}-${item.number}`}
                            </p>
                            {item.author && (
                              <p className="truncate text-[11px] text-muted-foreground">
                                Author: {item.author}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2 pl-2">
                          <span
                            className={cn(
                              'rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                              STATUS_BADGE_STYLES[item.status] || 'bg-muted text-muted-foreground'
                            )}
                          >
                            {item.status}
                          </span>
                          <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Quick Jump Spec Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-medium text-muted-foreground">Popular Standards:</span>
            {quickPills.map((pill) => (
              <button
                key={pill.label}
                onClick={() => handleSwoop(pill.path)}
                className="group inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/60 px-2.5 py-1 text-xs font-medium text-foreground transition-all hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
              >
                <span className="font-semibold">{pill.label}</span>
                <span className="text-[10px] text-muted-foreground group-hover:text-primary/80">({pill.tag})</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
