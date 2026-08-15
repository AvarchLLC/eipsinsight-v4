'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Zap,
  ArrowRight,
  X,
  AlertCircle,
  CheckCircle2,
  CornerDownLeft,
  Loader2,
  Info,
  Layers,
  BarChart3,
  GitBranch,
} from 'lucide-react';
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

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded border border-border/80 bg-muted/70 px-1 font-mono text-[10px] font-semibold text-muted-foreground shadow-[0_1px_0_0_var(--border)]">
      {children}
    </kbd>
  );
}

export function HomeHeroSection() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Per-query result cache + stale-response guard so fast typing / backspacing
  // is instant and never shows out-of-order results.
  const cacheRef = useRef<Map<string, ProposalSearchResult[]>>(new Map());
  const reqIdRef = useRef(0);

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ProposalSearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showInfoDrawer, setShowInfoDrawer] = useState(false);

  const infoItems = [
    {
      icon: Layers,
      title: 'Proposal Types',
      description: 'Browse EIPs, ERCs, and RIPs by category or lifecycle status',
    },
    {
      icon: BarChart3,
      title: 'Analytics',
      description: 'Track governance metrics, editorial workload, and decision velocity',
    },
    {
      icon: GitBranch,
      title: 'Governance',
      description: 'Explore upgrade impact, recent changes, and repository distribution',
    },
  ];

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
      // The dict is for instant 0ms feedback but can go stale; once the live
      // result for this exact standard loads, prefer its status/title.
      const live = results.find((r) => r.number === num && r.repo === known.repo);
      const liveStatus = live?.status ?? known.status;
      const liveTitle = live?.title || known.title;

      // User typed "EIP-20" or "eip 20", but it moved to ERC repository!
      if (parsedInput.prefix && parsedInput.prefix !== known.repo) {
        return {
          type: 'moved' as const,
          title: `Moved Standard Notice`,
          message: `${parsedInput.prefix.toUpperCase()}-${num} is officially classified as ${known.name} in the ${known.repo.toUpperCase()} repository.`,
          suggestion: `Swoop directly to ${known.name}`,
          targetPath,
          repo: known.repo,
          number: num,
          name: known.name,
          specTitle: liveTitle,
          status: liveStatus,
        };
      }

      // Exact match (pure number or matching prefix)
      return {
        type: 'matched' as const,
        title: `Spec Match: ${known.name}`,
        message: `${known.name} — ${liveTitle} (${liveStatus})`,
        suggestion: `Swoop directly to ${known.name}`,
        targetPath,
        repo: known.repo,
        number: num,
        name: known.name,
        specTitle: liveTitle,
        status: liveStatus,
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
            title: `Repo Location Notice`,
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
          title: `Proposal Match: ${name}`,
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

  // Debounced API search — cache-first, with a stale-response guard.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const trimmed = query.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed) {
      setResults([]);
      setIsOpen(false);
      setLoading(false);
      return;
    }

    setIsOpen(true);
    setSelectedIndex(-1);

    // Instant cache hit — no spinner, no network.
    const cached = cacheRef.current.get(key);
    if (cached) {
      setResults(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    const myId = ++reqIdRef.current;

    const timer = setTimeout(async () => {
      try {
        const res = (await client.search.searchProposals({ query: trimmed, limit: 8 })) as ProposalSearchResult[];
        cacheRef.current.set(key, res);
        if (myId !== reqIdRef.current) return; // a newer keystroke won
        setResults(res);
      } catch (err) {
        if (myId === reqIdRef.current) console.error('Failed to search proposals:', err);
      } finally {
        if (myId === reqIdRef.current) setLoading(false);
      }
    }, 130);

    return () => clearTimeout(timer);
  }, [query]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Prefetch likely destinations so the jump feels instant.
  useEffect(() => {
    results.slice(0, 5).forEach((r) => router.prefetch(`/${r.repo}/${r.number}`));
    if (sanityCheck) router.prefetch(sanityCheck.targetPath);
  }, [results, sanityCheck, router]);

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

  // Press "/" anywhere to jump into the search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || el?.isContentEditable) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
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
      inputRef.current?.blur();
    }
  };

  const clearQuery = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const quickPills = [
    { label: 'EIP-1559', path: '/eip/1559', tag: 'Fee Market' },
    { label: 'ERC-20', path: '/erc/20', tag: 'Tokens' },
    { label: 'ERC-721', path: '/erc/721', tag: 'NFTs' },
    { label: 'ERC-4337', path: '/erc/4337', tag: 'AA' },
    { label: 'EIP-4844', path: '/eip/4844', tag: 'Blobs' },
    { label: 'EIP-7702', path: '/eip/7702', tag: 'EOA Code' },
    { label: 'RIP-7560', path: '/rip/7560', tag: 'Native AA' },
  ];

  // Prefetch popular destinations up front.
  useEffect(() => {
    quickPills.forEach((p) => router.prefetch(p.path));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showDropdown = isOpen && query.trim().length > 0;

  return (
    <section className="relative w-full py-4 sm:py-6 md:py-8">
      {/* Soft Ambient Background Glow on Page Canvas */}
      <div className="pointer-events-none absolute -top-12 left-1/2 -z-10 h-80 w-full max-w-5xl -translate-x-1/2 rounded-full bg-primary/10 blur-3xl opacity-60" />

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Top Pill Badge & Info Button */}
        <div className="mb-4 flex items-center justify-center gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary shadow-xs">
            <Zap className="h-3.5 w-3.5 fill-primary text-primary" />
            <span>Ethereum Standards Observability</span>
          </div>

          <button
            onClick={() => setShowInfoDrawer(!showInfoDrawer)}
            className={cn(
              'inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/80 bg-background/80 text-muted-foreground backdrop-blur-md transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary',
              showInfoDrawer && 'border-primary/40 bg-primary/10 text-primary'
            )}
            title={showInfoDrawer ? 'Hide info' : 'Platform info'}
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Main Title */}
        <motion.h1
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="dec-title persona-title text-balance max-w-4xl text-3xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl leading-[1.1]"
        >
          Track Ethereum Proposals & Governance
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="mt-3.5 max-w-2xl text-balance text-sm leading-relaxed text-muted-foreground sm:text-base md:text-lg"
        >
          Real-time view of proposal lifecycles, upgrade timelines, and editorial activity across EIPs, ERCs, and RIPs. Type any number to swoop directly.
        </motion.p>

        {/* Centralized Search Box */}
        <div className="relative mt-8 w-full max-w-2xl">
          <div
            className={cn(
              'group relative flex w-full items-center rounded-2xl border bg-background/95 p-1.5 shadow-md backdrop-blur-md transition-all sm:p-2',
              showDropdown || isOpen
                ? 'border-primary shadow-lg ring-4 ring-primary/15'
                : 'border-border/80 hover:border-primary/50'
            )}
          >
            <div className="flex shrink-0 items-center pl-3.5 text-muted-foreground group-focus-within:text-primary sm:pl-4">
              {loading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <Search className="h-5 w-5" />}
            </div>

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => query.trim() && setIsOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder="Search a number or title — e.g. 1559, ERC-20, blobs…"
              className="w-full bg-transparent px-3 py-2 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground/60 sm:px-4 sm:py-2.5 sm:text-base"
              aria-label="Search EIPs, ERCs, and RIPs"
            />

            {query ? (
              <button
                type="button"
                onClick={clearQuery}
                className="mr-1.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <div className="mr-2 hidden shrink-0 items-center sm:flex" aria-hidden>
                <Kbd>/</Kbd>
              </div>
            )}

            <button
              type="button"
              onClick={() => handleSwoop()}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/40 active:scale-[0.98] sm:px-6 sm:py-3 sm:text-sm"
            >
              <span>Swoop</span>
              <Zap className="h-4 w-4 fill-primary-foreground" />
            </button>
          </div>

          {/* Dynamic Sanity Check — the "best match, jump straight there" row */}
          <AnimatePresence>
            {sanityCheck && (
              <motion.div
                initial={{ opacity: 0, y: -6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -6, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-3 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => handleSwoop(sanityCheck.targetPath)}
                  className={cn(
                    'group flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border p-3.5 text-left shadow-sm transition-all hover:shadow-md',
                    sanityCheck.type === 'moved'
                      ? 'border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/15'
                      : 'border-primary/40 bg-primary/10 hover:bg-primary/15'
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {sanityCheck.type === 'moved' ? (
                      <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'rounded-md border px-2 py-0.5 text-[11px] font-bold',
                            REPO_BADGE_STYLES[sanityCheck.repo]?.style
                          )}
                        >
                          {sanityCheck.name}
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
                      <p className="mt-1 truncate text-xs text-muted-foreground sm:text-sm">
                        {sanityCheck.specTitle || sanityCheck.message}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-primary transition-transform group-hover:translate-x-0.5">
                    <span className="hidden sm:inline">Open</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Live Autocomplete Suggestions Dropdown */}
          <AnimatePresence>
            {showDropdown && (
              <motion.div
                ref={dropdownRef}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-border/80 bg-popover/95 text-left shadow-2xl backdrop-blur-xl"
              >
                {/* Loading skeleton (first fetch only — cache hits are instant) */}
                {loading && results.length === 0 && (
                  <div className="space-y-1.5 p-2">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
                        <div className="h-6 w-16 shrink-0 animate-pulse rounded-lg bg-muted" />
                        <div className="h-3.5 flex-1 animate-pulse rounded bg-muted" style={{ maxWidth: `${70 - i * 12}%` }} />
                        <div className="h-4 w-14 shrink-0 animate-pulse rounded-full bg-muted" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Results */}
                {results.length > 0 && (
                  <div className="max-h-80 overflow-y-auto p-1.5">
                    <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Matching Proposals · {results.length}
                    </div>
                    {results.map((item, index) => {
                      const repoKey = item.repo;
                      const targetPath = `/${repoKey}/${item.number}`;
                      const repoBadge = REPO_BADGE_STYLES[repoKey] || REPO_BADGE_STYLES.eip;
                      const isSelected = index === selectedIndex;
                      const meta = [item.category, item.type].filter(Boolean).join(' · ');

                      return (
                        <div
                          key={`${item.repo}-${item.number}`}
                          onClick={() => handleSwoop(targetPath)}
                          onMouseEnter={() => setSelectedIndex(index)}
                          className={cn(
                            'flex cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2.5 transition-colors',
                            isSelected ? 'bg-primary/10' : 'hover:bg-muted/70'
                          )}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className={cn('shrink-0 rounded-lg border px-2.5 py-1 text-xs font-bold', repoBadge.style)}>
                              {repoBadge.label}-{item.number}
                            </span>
                            <div className="min-w-0">
                              <p className={cn('truncate text-xs font-semibold sm:text-sm', isSelected ? 'text-primary' : 'text-foreground')}>
                                {item.title || `${repoBadge.label}-${item.number}`}
                              </p>
                              <p className="truncate text-[11px] text-muted-foreground">
                                {meta || (item.author ? `by ${item.author}` : 'Ethereum proposal')}
                                {meta && item.author ? ` · ${item.author}` : ''}
                              </p>
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
                            <CornerDownLeft
                              className={cn('h-3.5 w-3.5 transition-opacity', isSelected ? 'text-primary opacity-100' : 'opacity-0')}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Empty state */}
                {!loading && results.length === 0 && !sanityCheck && (
                  <div className="px-4 py-6 text-center">
                    <p className="text-sm font-medium text-foreground">No proposals match “{query.trim()}”</p>
                    <p className="mt-1 text-xs text-muted-foreground">Try a number (1559), a repo tag (ERC-20), or a keyword.</p>
                  </div>
                )}

                {/* Footer: keyboard hints + full search */}
                {(results.length > 0 || (!loading && results.length === 0)) && (
                  <div className="flex items-center justify-between gap-2 border-t border-border/60 bg-muted/30 px-3 py-2">
                    <div className="hidden items-center gap-3 text-[11px] text-muted-foreground sm:flex">
                      <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
                      <span className="flex items-center gap-1"><Kbd>↵</Kbd> open</span>
                      <span className="flex items-center gap-1"><Kbd>esc</Kbd> close</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSwoop()}
                      className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                    >
                      All results for “{query.trim()}”
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Quick Jump Spec Chips */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Popular:</span>
          {quickPills.map((pill) => (
            <button
              key={pill.label}
              onClick={() => handleSwoop(pill.path)}
              onMouseEnter={() => router.prefetch(pill.path)}
              className="group inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-medium text-foreground transition-all hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
            >
              <span className="font-semibold">{pill.label}</span>
              <span className="text-[10px] text-muted-foreground group-hover:text-primary/80">{pill.tag}</span>
            </button>
          ))}
        </div>

        {/* Expandable Platform Info Drawer */}
        <AnimatePresence>
          {showInfoDrawer && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-6 w-full max-w-4xl overflow-hidden text-left"
            >
              <div className="rounded-2xl border border-border/70 bg-card/70 p-4 sm:p-6 backdrop-blur-md">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {infoItems.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <motion.div
                        key={item.title}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.08 }}
                        className="flex items-start gap-3"
                      >
                        <div className="shrink-0 rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="mb-1 text-sm font-semibold text-foreground">
                            {item.title}
                          </h3>
                          <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                            {item.description}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
