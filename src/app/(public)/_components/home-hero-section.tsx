'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Zap,
  ArrowRight,
  ArrowUpRight,
  X,
  AlertCircle,
  CheckCircle2,
  CornerDownLeft,
  Loader2,
  FileText,
  Package,
  Video,
  GitPullRequest,
  Users,
  Info,
  Layers,
  BarChart3,
  GitBranch,
} from 'lucide-react';
import { client } from '@/lib/orpc';
import { cn } from '@/lib/utils';
import { LedgerBadge } from '@/components/ledger/badge';
import { CountUp } from '@/components/ledger/count-up';

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

interface AuthorSearchResult {
  kind: 'author';
  name: string;
  role: string | null;
  contributionCount: number;
  eipCount?: number;
  prCount?: number;
  issueCount?: number;
  reviewCount?: number;
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

const EXAMPLES = ['1559', '4844', '7702', 'ERC-20', 'blob', 'Pectra', 'account abstraction', 'ERC-4337'];

const POPULAR_SEARCHES = ['1559', '4844', '7702', 'ERC-20', 'ERC-4337', 'ERC-721', 'RIP-7560', 'blobs'];

const QUICK_JUMPS = [
  { href: '/standards', label: 'Browse all standards', icon: FileText },
  { href: '/upgrade', label: 'Network upgrades', icon: Package },
  { href: '/calls', label: 'Protocol calls & meetings', icon: Video },
  { href: '/officehours/prs', label: 'Editorial PR queue', icon: GitPullRequest },
  { href: '/analytics/contributors', label: 'Contributors & editors', icon: Users },
];

const POPULAR_STANDARDS = [
  { label: 'EIP-1559', path: '/eip/1559', tag: 'Fee Market' },
  { label: 'ERC-20', path: '/erc/20', tag: 'Tokens' },
  { label: 'ERC-721', path: '/erc/721', tag: 'NFTs' },
  { label: 'ERC-4337', path: '/erc/4337', tag: 'AA' },
  { label: 'EIP-4844', path: '/eip/4844', tag: 'Blobs' },
  { label: 'EIP-7702', path: '/eip/7702', tag: 'EOA Code' },
  { label: 'RIP-7560', path: '/rip/7560', tag: 'Native AA' },
];

const INFO_ITEMS = [
  {
    icon: Layers,
    title: 'Proposal Types',
    description: 'Browse EIPs, ERCs, and RIPs by category, repository, or lifecycle status',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Insights',
    description: 'Track governance velocity, editorial review workload, and active participants',
  },
  {
    icon: GitBranch,
    title: 'Network Governance',
    description: 'Explore upcoming hard forks, upgrade schedules, devnet progression, and call recordings',
  },
];

export function HomeHeroSection() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const searchboxRef = useRef<HTMLDivElement>(null);
  const cacheRef = useRef<Map<string, { proposals: ProposalSearchResult[]; people: AuthorSearchResult[] }>>(new Map());
  const reqIdRef = useRef(0);

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ProposalSearchResult[]>([]);
  const [peopleResults, setPeopleResults] = useState<AuthorSearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [example, setExample] = useState(EXAMPLES[0]);
  const [showInfoDrawer, setShowInfoDrawer] = useState(false);

  // Prefetch popular standards
  useEffect(() => {
    POPULAR_STANDARDS.forEach((p) => router.prefetch(p.path));
  }, [router]);

  // Live platform counts for the plate base
  const [statFigures, setStatFigures] = useState({
    proposals: 1263,
    openPrs: 932,
    upgrades: 21,
    contributors: 7455,
  });

  // Fetch live headline platform stats directly from DB
  useEffect(() => {
    let active = true;
    client.explore.getPlatformHeadlineStats({})
      .then((stats) => {
        if (!active || !stats) return;
        setStatFigures({
          proposals: stats.proposals,
          openPrs: stats.openPrs,
          upgrades: stats.upgrades,
          contributors: stats.contributors,
        });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // While idle, auto-cycle placeholder examples
  useEffect(() => {
    if (query || isOpen) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let wordIdx = 0;
    let chars = EXAMPLES[0].length;
    let deleting = true;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const w = EXAMPLES[wordIdx];
      if (deleting) {
        chars -= 1;
        setExample(w.slice(0, chars));
        if (chars === 0) {
          deleting = false;
          wordIdx = (wordIdx + 1) % EXAMPLES.length;
          timer = setTimeout(tick, 300);
          return;
        }
        timer = setTimeout(tick, 30);
      } else {
        chars += 1;
        setExample(EXAMPLES[wordIdx].slice(0, chars));
        if (chars === EXAMPLES[wordIdx].length) {
          deleting = true;
          timer = setTimeout(tick, 1800);
          return;
        }
        timer = setTimeout(tick, 75);
      }
    };

    timer = setTimeout(tick, 2200);
    return () => clearTimeout(timer);
  }, [query, isOpen]);

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
      setLoading(false);
      return;
    }

    setSelectedIndex(-1);

    // Instant cache hit — no spinner, no network.
    const cached = cacheRef.current.get(key);
    if (cached) {
      setResults(cached.proposals);
      setPeopleResults(cached.people);
      setLoading(false);
      return;
    }

    setLoading(true);
    const myId = ++reqIdRef.current;

    const timer = setTimeout(async () => {
      try {
        const [proposalsRes, authorsRes] = await Promise.allSettled([
          client.search.searchProposals({ query: trimmed, limit: 6 }),
          client.search.searchAuthors({ query: trimmed, limit: 4 }),
        ]);

        if (myId !== reqIdRef.current) return;

        const proposals = proposalsRes.status === 'fulfilled' ? (proposalsRes.value as ProposalSearchResult[]) : [];
        const people = authorsRes.status === 'fulfilled' ? (authorsRes.value as AuthorSearchResult[]) : [];

        cacheRef.current.set(key, { proposals, people });
        setResults(proposals);
        setPeopleResults(people);
      } catch (err) {
        if (myId === reqIdRef.current) console.error('Failed to search:', err);
      } finally {
        if (myId === reqIdRef.current) setLoading(false);
      }
    }, 130);

    return () => clearTimeout(timer);
  }, [query]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Prefetch likely destinations
  useEffect(() => {
    results.slice(0, 5).forEach((r) => router.prefetch(`/${r.repo}/${r.number}`));
    if (sanityCheck) router.prefetch(sanityCheck.targetPath);
  }, [results, sanityCheck, router]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (searchboxRef.current && !searchboxRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const allDestinations = useMemo(() => {
    const list: string[] = [];
    peopleResults.forEach((p) => list.push(`/user/${encodeURIComponent(p.name)}`));
    results.forEach((r) => list.push(`/${r.repo}/${r.number}`));
    return list;
  }, [peopleResults, results]);

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

  // Keyboard navigation inside search dropdown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setSelectedIndex((prev) => (prev < allDestinations.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > -1 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && allDestinations[selectedIndex]) {
        handleSwoop(allDestinations[selectedIndex]);
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
    setPeopleResults([]);
    inputRef.current?.focus();
  };

  const figures = [
    { label: 'Proposals', value: statFigures.proposals, note: 'EIPs, ERCs and RIPs', href: '/standards' },
    { label: 'Editorial queue', value: statFigures.openPrs, note: 'open PRs awaiting review', href: '/officehours/prs' },
    { label: 'Network upgrades', value: statFigures.upgrades, note: 'shipped and planned', href: '/upgrade' },
    { label: 'Contributors', value: statFigures.contributors, note: 'authors, editors, reviewers', href: '/analytics/contributors' },
  ];

  return (
    <section className="relative w-full border-b border-[var(--border)]">
      <div className="wrap">
        <div className="relative">
          {/* Main Hero Inner Body */}
          <div className="pb-10 pt-10 text-center px-3 sm:px-5 sm:pb-14 sm:pt-16 lg:px-6 lg:pb-16 lg:pt-18">
            {/* Top Pill Badge & Info Button */}
            <div className="flex items-center justify-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1 text-[11px] font-mono uppercase tracking-[0.12em] text-[var(--ink)] shadow-xs">
                <span className="size-2 rounded-full bg-[var(--brand-strong)] shadow-[0_0_8px_var(--brand)]" />
                <span>Ethereum Standards Observability</span>
              </div>

              <button
                type="button"
                onClick={() => setShowInfoDrawer(!showInfoDrawer)}
                className={cn(
                  'inline-flex h-6.5 w-6.5 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--ink-muted)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)] cursor-pointer',
                  showInfoDrawer && 'border-[var(--brand-strong)] bg-[var(--surface-2)] text-[var(--brand-strong)]'
                )}
                title={showInfoDrawer ? 'Hide platform info' : 'Platform info'}
                aria-label="Toggle platform information drawer"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Expandable Platform Info Drawer */}
            <AnimatePresence>
              {showInfoDrawer && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="mx-auto mt-4 w-full max-w-3xl overflow-hidden text-left"
                >
                  <div className="rounded-[var(--l-radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      {INFO_ITEMS.map((item, idx) => {
                        const Icon = item.icon;
                        return (
                          <motion.div
                            key={item.title}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: idx * 0.05 }}
                            className="flex items-start gap-3"
                          >
                            <div className="shrink-0 rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface-2)] p-2 text-[var(--brand-strong)]">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="mb-0.5 text-xs font-semibold text-[var(--ink)]">
                                {item.title}
                              </h3>
                              <p className="text-[11px] leading-relaxed text-[var(--ink-muted)]">
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

            {/* Display Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="t-display mx-auto mt-6 max-w-5xl text-center leading-[1.04]"
            >
              Track Ethereum Proposals &amp; <span className="accent">Governance.</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 }}
              className="t-lead text-balance mx-auto mt-3 max-w-2xl text-center text-xs sm:text-sm md:text-base text-[var(--ink-muted)] leading-relaxed"
            >
              Real-time view of proposal lifecycles, upgrade timelines, and editorial activity across EIPs, ERCs, and RIPs. Type any number to swoop directly.
            </motion.p>

            {/* Centralized Search Box (Ledger CommandBar) */}
            <div ref={searchboxRef} className="searchbox relative z-30 mx-auto mt-8 sm:mt-10 w-full max-w-2xl" data-open={isOpen}>
              <div className="searchbox-field">
                <div className="flex shrink-0 items-center text-[var(--ink-faint)]">
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-[var(--brand-strong)]" />
                  ) : (
                    <Search className="h-5 w-5" />
                  )}
                </div>

                <input
                  id="hero-search-input"
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setIsOpen(true);
                  }}
                  onFocus={() => setIsOpen(true)}
                  onKeyDown={handleKeyDown}
                  placeholder={isOpen ? 'Search proposals, people, upgrades…' : 'Search number or keyword — e.g. 1559, ERC-20, blob'}
                  className="w-full min-w-0 flex-1 bg-transparent px-2.5 py-2 text-sm font-medium text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)] sm:px-3 sm:py-2.5"
                  aria-label="Search EIPs, ERCs, and RIPs"
                  autoComplete="off"
                  spellCheck={false}
                />

                {query ? (
                  <button
                    type="button"
                    onClick={clearQuery}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--ink-faint)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)] cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : (
                  <div className="mr-1 hidden shrink-0 items-center sm:flex" aria-hidden>
                    <kbd className="kbd">/</kbd>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleSwoop()}
                  className="btn btn-primary h-9.5 px-4 text-xs font-semibold cursor-pointer sm:px-5 sm:text-sm shrink-0 gap-1.5"
                >
                  <span>Swoop</span>
                  <Zap className="h-3.5 w-3.5 fill-current" />
                </button>
              </div>

              {/* Suggestions / Results Dropdown Panel */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="searchbox-panel text-left"
                  >
                    {/* State A: Idle (nothing typed yet) — Popular searches + Jump destinations */}
                    {!query.trim() && (
                      <div className="p-4 sm:p-5">
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                          <div>
                            <p className="eyebrow text-[11px]">Popular Searches</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {POPULAR_SEARCHES.map((p) => (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() => {
                                    setQuery(p);
                                    inputRef.current?.focus();
                                  }}
                                  className="chip cursor-pointer text-xs"
                                >
                                  {p}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <p className="eyebrow text-[11px]">Jump to</p>
                            <ul className="mt-2 space-y-1">
                              {QUICK_JUMPS.map((item) => (
                                <li key={item.href}>
                                  <Link
                                    href={item.href}
                                    onClick={() => setIsOpen(false)}
                                    className="group flex items-center gap-2.5 rounded-[var(--l-radius-control)] px-2.5 py-1.5 text-xs sm:text-sm text-[var(--ink)] transition-colors hover:bg-[var(--surface-2)]"
                                  >
                                    <item.icon className="size-3.5 text-[var(--ink-faint)] group-hover:text-[var(--brand-strong)]" />
                                    <span>{item.label}</span>
                                    <ArrowRight className="ml-auto size-3 text-[var(--ink-faint)] opacity-0 transition-opacity group-hover:opacity-100" />
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* State B: Active Query — Sanity Check card + Live Results */}
                    {query.trim().length > 0 && (
                      <div>
                        {/* Dynamic Sanity Check — high priority instant match */}
                        {sanityCheck && (
                          <div className="border-b border-[var(--border)] p-2">
                            <button
                              type="button"
                              onClick={() => handleSwoop(sanityCheck.targetPath)}
                              className={cn(
                                'group flex w-full cursor-pointer items-center justify-between gap-3 rounded-[var(--l-radius-control)] p-3 text-left transition-colors',
                                sanityCheck.type === 'moved'
                                  ? 'bg-[var(--surface-2)] hover:bg-[var(--surface-3)]'
                                  : 'bg-[var(--surface-2)] hover:bg-[var(--surface-3)]'
                              )}
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                {sanityCheck.type === 'moved' ? (
                                  <AlertCircle className="h-5 w-5 shrink-0 text-[var(--c-review)]" />
                                ) : (
                                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--brand-strong)]" />
                                )}
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <LedgerBadge token={sanityCheck.repo} label={sanityCheck.name} />
                                    {sanityCheck.status && (
                                      <LedgerBadge token={sanityCheck.status} />
                                    )}
                                  </div>
                                  <p className="mt-1 truncate text-xs text-[var(--ink-muted)] sm:text-sm">
                                    {sanityCheck.specTitle || sanityCheck.message}
                                  </p>
                                </div>
                              </div>

                              <div className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[var(--brand-strong)] transition-transform group-hover:translate-x-0.5">
                                <span className="hidden sm:inline">Open</span>
                                <ArrowRight className="h-4 w-4" />
                              </div>
                            </button>
                          </div>
                        )}

                        {/* Loading skeleton */}
                        {loading && results.length === 0 && (
                          <div className="space-y-1.5 p-3">
                            {[0, 1, 2].map((i) => (
                              <div key={i} className="flex items-center gap-3 rounded-md px-3 py-2">
                                <div className="h-5 w-16 shrink-0 animate-pulse rounded bg-[var(--surface-3)]" />
                                <div className="h-3.5 flex-1 animate-pulse rounded bg-[var(--surface-3)]" style={{ maxWidth: `${70 - i * 12}%` }} />
                                <div className="h-4 w-14 shrink-0 animate-pulse rounded-full bg-[var(--surface-3)]" />
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Matching People / Editors */}
                        {peopleResults.length > 0 && (
                          <div className="border-b border-[var(--border)] p-1.5">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider text-[var(--ink-faint)]">
                              <Users className="h-3 w-3" />
                              <span>People &amp; Editors · {peopleResults.length}</span>
                            </div>
                            {peopleResults.map((p, index) => {
                              const targetPath = `/user/${encodeURIComponent(p.name)}`;
                              const isSelected = index === selectedIndex;
                              const roleLabel = p.role || 'Contributor';
                              const roleBadgeClass =
                                roleLabel === 'EDITOR'
                                  ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                  : roleLabel === 'REVIEWER'
                                  ? 'border-blue-500/30 bg-blue-500/15 text-blue-600 dark:text-blue-400'
                                  : roleLabel === 'AUTHOR'
                                  ? 'border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                  : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--ink-muted)]';

                              const statsText =
                                [
                                  p.eipCount ? `${p.eipCount} EIPs` : null,
                                  p.reviewCount ? `${p.reviewCount} reviews` : null,
                                  p.prCount ? `${p.prCount} PRs` : null,
                                ]
                                  .filter(Boolean)
                                  .join(' · ') || `${p.contributionCount} contributions`;

                              return (
                                <div
                                  key={`hero-person-${p.name}`}
                                  onClick={() => handleSwoop(targetPath)}
                                  onMouseEnter={() => setSelectedIndex(index)}
                                  className={cn(
                                    'flex cursor-pointer items-center justify-between gap-2 rounded-[var(--l-radius-control)] px-3 py-2 transition-colors',
                                    isSelected ? 'bg-[var(--surface-2)] text-[var(--ink)]' : 'hover:bg-[var(--surface-2)]'
                                  )}
                                >
                                  <div className="flex min-w-0 items-center gap-2.5">
                                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] font-mono text-xs font-semibold text-[var(--ink)]">
                                      {p.name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="truncate text-xs font-semibold sm:text-sm text-[var(--ink)]">
                                          {p.name}
                                        </span>
                                        <span className={cn('rounded px-1.5 py-0.2 font-mono text-[10px] font-semibold border', roleBadgeClass)}>
                                          {roleLabel}
                                        </span>
                                      </div>
                                      <p className="truncate text-[11px] font-mono text-[var(--ink-faint)]">
                                        {statsText}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex shrink-0 items-center gap-1.5 pl-2">
                                    <ArrowRight
                                      className={cn(
                                        'h-3.5 w-3.5 transition-opacity',
                                        isSelected ? 'text-[var(--brand-strong)] opacity-100' : 'opacity-0'
                                      )}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Matching Proposals */}
                        {results.length > 0 && (
                          <div className="max-h-80 overflow-y-auto p-1.5">
                            <div className="px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider text-[var(--ink-faint)]">
                              Matching Proposals · {results.length}
                            </div>
                            {results.map((item, index) => {
                              const repoKey = item.repo;
                              const targetPath = `/${repoKey}/${item.number}`;
                              const isSelected = (peopleResults.length + index) === selectedIndex;
                              const meta = [item.category, item.type].filter(Boolean).join(' · ');

                              return (
                                <div
                                  key={`${item.repo}-${item.number}`}
                                  onClick={() => handleSwoop(targetPath)}
                                  onMouseEnter={() => setSelectedIndex(peopleResults.length + index)}
                                  className={cn(
                                    'flex cursor-pointer items-center justify-between gap-2 rounded-[var(--l-radius-control)] px-3 py-2.5 transition-colors',
                                    isSelected ? 'bg-[var(--surface-2)] text-[var(--ink)]' : 'hover:bg-[var(--surface-2)]'
                                  )}
                                >
                                  <div className="flex min-w-0 items-center gap-3">
                                    <LedgerBadge token={repoKey} label={`${repoKey.toUpperCase()}-${item.number}`} />
                                    <div className="min-w-0">
                                      <p className="truncate text-xs font-semibold sm:text-sm text-[var(--ink)]">
                                        {item.title || `${repoKey.toUpperCase()}-${item.number}`}
                                      </p>
                                      <p className="truncate text-[11px] text-[var(--ink-faint)] font-mono">
                                        {meta || (item.author ? `by ${item.author}` : 'Ethereum proposal')}
                                        {meta && item.author ? ` · ${item.author}` : ''}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex shrink-0 items-center gap-2 pl-2">
                                    <LedgerBadge token={item.status} />
                                    <CornerDownLeft
                                      className={cn('h-3.5 w-3.5 transition-opacity', isSelected ? 'text-[var(--brand-strong)] opacity-100' : 'opacity-0')}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Empty state */}
                        {!loading && results.length === 0 && peopleResults.length === 0 && !sanityCheck && (
                          <div className="px-4 py-6 text-center">
                            <p className="text-sm font-medium text-[var(--ink)]">No results match “{query.trim()}”</p>
                            <p className="mt-1 text-xs text-[var(--ink-muted)]">Try an author or editor (e.g. Vitalik, lightclient), a number (1559), or an upgrade.</p>
                          </div>
                        )}

                        {/* Footer: keyboard hints + full search link */}
                        <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2">
                          <div className="hidden items-center gap-3 text-[11px] text-[var(--ink-faint)] sm:flex">
                            <span className="flex items-center gap-1"><kbd className="kbd">↑</kbd><kbd className="kbd">↓</kbd> navigate</span>
                            <span className="flex items-center gap-1"><kbd className="kbd">↵</kbd> open</span>
                            <span className="flex items-center gap-1"><kbd className="kbd">esc</kbd> close</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSwoop()}
                            className="ml-auto inline-flex items-center gap-1.5 rounded-[var(--l-radius-control)] px-2 py-1 text-xs font-semibold text-[var(--brand-strong)] transition-colors hover:bg-[var(--surface-3)] cursor-pointer"
                          >
                            All results for “{query.trim()}”
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Popular Standards Row */}
            <div className="mt-5 mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-1 sm:gap-1.5">
              <span className="font-mono text-[11px] sm:text-xs text-[var(--ink-faint)] mr-0.5">Popular:</span>
              {POPULAR_STANDARDS.map((pill) => (
                <button
                  key={pill.label}
                  type="button"
                  onClick={() => handleSwoop(pill.path)}
                  onMouseEnter={() => router.prefetch(pill.path)}
                  className="group inline-flex items-center gap-1 sm:gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 sm:px-2.5 sm:py-1 text-[11px] sm:text-xs font-mono transition-colors hover:border-[var(--ink)] hover:bg-[var(--surface-2)] cursor-pointer"
                >
                  <span className="font-semibold text-[var(--ink)]">{pill.label}</span>
                  <span className="text-[9.5px] sm:text-[10px] text-[var(--ink-faint)] group-hover:text-[var(--ink-muted)]">{pill.tag}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Plate Base: 4-Column Key Figures Grid (from v5) ── */}
          <div className="grid grid-cols-2 border-t border-[var(--border)] lg:grid-cols-4">
            {figures.map((f, i) => (
              <Link
                key={f.label}
                href={f.href}
                className={cn(
                  'group block py-6 px-4 sm:px-6 lg:py-7 transition-colors hover:bg-[var(--surface-2)]',
                  i % 2 === 1 && 'border-l border-[var(--border)]',
                  i >= 2 && 'border-t border-[var(--border)] lg:border-t-0',
                  i === 2 && 'lg:border-l'
                )}
              >
                <p className="eyebrow flex items-center justify-between gap-2">
                  {f.label}
                  <ArrowUpRight className="size-3.5 text-[var(--ink-faint)] transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--brand-strong)]" />
                </p>
                <p className="t-figure mt-3 text-[var(--ink)]">
                  <CountUp to={f.value} />
                </p>
                <p className="mt-1.5 text-xs text-[var(--ink-faint)]">{f.note}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
