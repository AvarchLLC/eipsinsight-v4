'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Loader2,
  X,
  ArrowRight,
  FileText,
  Package,
  Users,
  Video,
  GitPullRequest,
  Zap,
  CheckCircle2,
  AlertCircle,
  CornerDownLeft,
} from 'lucide-react';
import { client } from '@/lib/orpc';
import { cn } from '@/lib/utils';
import { LedgerBadge } from '@/components/ledger/badge';

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

interface PrSearchResult {
  kind: 'pr';
  prNumber: number;
  repo: string;
  title: string | null;
  author: string | null;
  state: string | null;
  mergedAt: string | null;
}

interface PageMatch {
  url: string;
  label: string;
  sub: string;
  badge: string;
}

const SEARCHABLE_HUBS: Array<PageMatch & { keywords: string[] }> = [
  { url: '/upgrade/glamsterdam', label: 'Glamsterdam Upgrade', sub: 'Hoodi Dec 15, 2026 · EIP-7773 · ePBS + BALs', badge: 'Upgrade', keywords: ['glamsterdam', 'hoodi', 'sepolia', 'epbs', 'bal', '7773', '8037', '8038'] },
  { url: '/upgrade/hegota', label: 'Hegota Upgrade', sub: 'Next fork scoping · FOCIL / Frames', badge: 'Upgrade', keywords: ['hegota', 'focil', 'frames', '8081', '7805'] },
  { url: '/upgrade/fusaka', label: 'Fusaka Upgrade', sub: 'PeerDAS + Osaka/Fulu', badge: 'Upgrade', keywords: ['fusaka', 'osaka', 'fulu', 'peerdas', '7594'] },
  { url: '/upgrade/pectra', label: 'Pectra Upgrade', sub: 'Prague + Electra · EIP-7702', badge: 'Upgrade', keywords: ['pectra', 'prague', 'electra', '7702'] },
  { url: '/upgrade/schedule', label: 'Upgrade Schedule & Timeline', sub: 'Fork phases, devnets, testnets, mainnet', badge: 'Schedule', keywords: ['schedule', 'timeline', 'fork', 'devnet', 'testnet', 'hoodi'] },
  { url: '/upgrade/devnets', label: 'Ethereum Devnets', sub: 'Live devnet trackers & specs', badge: 'Devnets', keywords: ['devnet', 'devnets', 'ethpandaops'] },
  { url: '/adoption', label: 'Standards On-Chain Adoption', sub: 'Top ERCs/EIPs by contracts, active usage & USD value', badge: 'Adoption', keywords: ['adoption', 'onchain', 'usd', 'erc-20', 'erc-721', 'erc-4626', 'contract'] },
  { url: '/research/glamsterdam', label: 'Glamsterdam Repricer Research', sub: 'Sepolia & mainnet gas audit (EIP-8037/8038)', badge: 'Research', keywords: ['research', 'repricer', 'repricing', 'gas audit', 'glamsterdam', 'invariants'] },
  { url: '/aa/overview', label: 'Account Abstraction Research', sub: 'ERC-4337, EIP-7702, smart accounts', badge: 'Research', keywords: ['aa', 'account abstraction', '4337', '7702', 'smart account', 'paymaster'] },
  { url: '/pq/overview', label: 'Post-Quantum (PQ) Research', sub: 'PQ signatures, roadmap, dependencies', badge: 'Research', keywords: ['pq', 'post-quantum', 'quantum', 'pqc', 'falcon', 'xmss'] },
  { url: '/officehours/editors', label: 'Editors & Office Hours', sub: 'Leaderboard, attendance matrix, PR explorer, contributor lookup', badge: 'Editors', keywords: ['editor', 'editors', 'office hour', 'eipip', 'attendance', 'samwilsn', 'jochem'] },
  { url: '/analytics/contributors', label: 'Contributors & PR Analytics', sub: 'Search any contributor across EIPs, ERCs & RIPs', badge: 'Analytics', keywords: ['contributor', 'contributors', 'analytics', 'author', 'tony', 'creative score'] },
  { url: '/officehours/prs', label: 'PR & Editorial Queue', sub: 'Open, waiting-on-editor, merged & closed PRs', badge: 'PRs', keywords: ['pr', 'prs', 'pull request', 'queue', 'review'] },
  { url: '/calls', label: 'Protocol Calls (ACDC / ACDE / EIPIP)', sub: 'Call briefs, key decisions, detailed notes & transcripts', badge: 'Calls', keywords: ['call', 'calls', 'acdc', 'acde', 'eipip', 'meeting', 'notes', 'transcript'] },
];

const POPULAR_SEARCHES = ['Glamsterdam', '1559', '4844', '7702', 'ERC-4337', 'Account Abstraction', 'PQ', 'SamWilsn'];

const QUICK_JUMPS = [
  { href: '/standards', label: 'Browse all standards', icon: FileText },
  { href: '/upgrade', label: 'Network upgrades', icon: Package },
  { href: '/officehours/prs', label: 'Editorial queue', icon: GitPullRequest },
  { href: '/calls', label: 'Protocol calls', icon: Video },
  { href: '/analytics/contributors', label: 'Contributors & editors', icon: Users },
];

const KNOWN_STANDARDS: Record<number, { repo: 'eip' | 'erc' | 'rip'; name: string; title: string; status: string }> = {
  20: { repo: 'erc', name: 'ERC-20', title: 'Fungible Token Standard', status: 'Final' },
  721: { repo: 'erc', name: 'ERC-721', title: 'Non-Fungible Token Standard', status: 'Final' },
  1155: { repo: 'erc', name: 'ERC-1155', title: 'Multi-Token Standard', status: 'Final' },
  777: { repo: 'erc', name: 'ERC-777', title: 'Advanced Token Standard', status: 'Final' },
  1271: { repo: 'erc', name: 'ERC-1271', title: 'Standard Signature Validation Method for Contracts', status: 'Final' },
  2612: { repo: 'erc', name: 'ERC-2612', title: 'Permit Extension for ERC-20 Signed Approvals', status: 'Final' },
  4337: { repo: 'erc', name: 'ERC-4337', title: 'Account Abstraction Using Alt Mempool', status: 'Draft' },
  4626: { repo: 'erc', name: 'ERC-4626', title: 'Tokenized Vault Standard', status: 'Final' },
  6551: { repo: 'erc', name: 'ERC-6551', title: 'Non-Fungible Token Bound Accounts', status: 'Draft' },
  1: { repo: 'eip', name: 'EIP-1', title: 'EIP Purpose and Guidelines', status: 'Living' },
  1559: { repo: 'eip', name: 'EIP-1559', title: 'Fee market change for ETH 1.0 chain', status: 'Final' },
  4844: { repo: 'eip', name: 'EIP-4844', title: 'Shard Blob Transactions', status: 'Final' },
  3074: { repo: 'eip', name: 'EIP-3074', title: 'AUTH and AUTHCALL opcodes', status: 'Review' },
  7702: { repo: 'eip', name: 'EIP-7702', title: 'Set EOA Account Code for Transaction', status: 'Final' },
  4788: { repo: 'eip', name: 'EIP-4788', title: 'Beacon block root in EVM', status: 'Final' },
  6963: { repo: 'eip', name: 'EIP-6963', title: 'Multi-Injected Provider Discovery', status: 'Final' },
  7560: { repo: 'rip', name: 'RIP-7560', title: 'Native Account Abstraction', status: 'Draft' },
  7212: { repo: 'rip', name: 'RIP-7212', title: 'secp256r1 Curve Support', status: 'Final' },
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ProposalSearchResult[]>([]);
  const [peopleResults, setPeopleResults] = useState<AuthorSearchResult[]>([]);
  const [prResults, setPrResults] = useState<PrSearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const cacheRef = useRef<Map<string, { proposals: ProposalSearchResult[]; people: AuthorSearchResult[]; prs: PrSearchResult[] }>>(new Map());
  const reqIdRef = useRef(0);

  const term = query.trim();

  // Parse typed query for direct number/standard jump
  const parsed = useMemo(() => {
    if (!term) return null;
    const lower = term.toLowerCase();
    const matchPrefix = lower.match(/^(eip|erc|rip)[-\s]?(\d+)$/);
    if (matchPrefix) {
      return {
        prefix: matchPrefix[1] as 'eip' | 'erc' | 'rip',
        number: parseInt(matchPrefix[2], 10),
      };
    }
    if (/^\d+$/.test(term)) {
      return {
        prefix: null,
        number: parseInt(term, 10),
      };
    }
    return null;
  }, [term]);

  const swoop = useMemo(() => {
    if (!parsed?.number) return null;
    const num = parsed.number;
    if (KNOWN_STANDARDS[num]) {
      const k = KNOWN_STANDARDS[num];
      return {
        label: k.name,
        title: k.title,
        status: k.status,
        url: `/${k.repo}/${num}`,
        repo: k.repo,
      };
    }
    const repo = parsed.prefix || 'eip';
    const label = `${repo.toUpperCase()}-${num}`;
    return {
      label,
      title: 'Ethereum Proposal',
      status: 'Spec',
      url: `/${repo}/${num}`,
      repo,
    };
  }, [parsed]);

  // Global keydown listeners (⌘K, Ctrl+K, /, Escape)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      const isSlash =
        e.key === '/' &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) &&
        !(e.target as HTMLElement)?.isContentEditable;

      if (isCmdK || isSlash) {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };

    const handleCustomOpen = () => setOpen(true);

    window.addEventListener('keydown', onKey);
    window.addEventListener('open-command-palette', handleCustomOpen);

    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('open-command-palette', handleCustomOpen);
    };
  }, [open]);

  // Prevent background scroll and focus input on open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => inputRef.current?.focus(), 30);
    } else {
      document.body.style.overflow = '';
      setQuery('');
      setResults([]);
      setPeopleResults([]);
      setPrResults([]);
      setSelectedIndex(0);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Debounced search query
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open || !term) {
      setResults([]);
      setPeopleResults([]);
      setPrResults([]);
      setLoading(false);
      return;
    }

    const key = term.toLowerCase();
    setSelectedIndex(0);

    const cached = cacheRef.current.get(key);
    if (cached) {
      setResults(cached.proposals);
      setPeopleResults(cached.people);
      setPrResults(cached.prs);
      setLoading(false);
      return;
    }

    setLoading(true);
    const myId = ++reqIdRef.current;

    const timer = setTimeout(async () => {
      try {
        const [proposalsRes, authorsRes, prsRes] = await Promise.allSettled([
          client.search.searchProposals({ query: term, limit: 6 }),
          client.search.searchAuthors({ query: term, limit: 5 }),
          client.search.searchPRs({ query: term, limit: 5 }),
        ]);

        if (myId !== reqIdRef.current) return;

        const proposals =
          proposalsRes.status === 'fulfilled' ? (proposalsRes.value as ProposalSearchResult[]) : [];
        const people =
          authorsRes.status === 'fulfilled' ? (authorsRes.value as AuthorSearchResult[]) : [];
        const prs =
          prsRes.status === 'fulfilled' ? (prsRes.value as PrSearchResult[]) : [];

        cacheRef.current.set(key, { proposals, people, prs });
        setResults(proposals);
        setPeopleResults(people);
        setPrResults(prs);
      } catch (err) {
        if (myId === reqIdRef.current) console.error('Failed search in palette:', err);
      } finally {
        if (myId === reqIdRef.current) setLoading(false);
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [open, term]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const pageMatches = useMemo<PageMatch[]>(() => {
    const q = term.toLowerCase();
    if (!q) return [];
    return SEARCHABLE_HUBS.filter(
      (h) =>
        h.label.toLowerCase().includes(q) ||
        h.sub.toLowerCase().includes(q) ||
        h.keywords.some((k) => k.includes(q) || q.includes(k))
    ).slice(0, 4);
  }, [term]);

  const navigateTo = useCallback(
    (url: string) => {
      setOpen(false);
      if (url.startsWith('http')) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        router.push(url);
      }
    },
    [router]
  );

  const flatDestinations = useMemo(() => {
    const list: string[] = [];
    if (swoop) list.push(swoop.url);
    pageMatches.forEach((m) => list.push(m.url));
    peopleResults.forEach((p) => list.push(`/user/${encodeURIComponent(p.name)}`));
    results.forEach((r) => list.push(`/${r.repo}/${r.number}`));
    prResults.forEach((pr) => list.push(`https://github.com/${pr.repo}/pull/${pr.prNumber}`));
    return list;
  }, [swoop, pageMatches, peopleResults, results, prResults]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, Math.max(flatDestinations.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatDestinations[selectedIndex]) {
        navigateTo(flatDestinations[selectedIndex]);
      } else if (term) {
        navigateTo(`/search?q=${encodeURIComponent(term)}`);
      }
    }
  };

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${selectedIndex}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!open) return null;

  return (
    <div
      data-ledger
      className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[10vh] sm:pt-[15vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Command search palette"
    >
      {/* Dimmed backdrop - keep underlying page softly visible */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 bg-black/35 dark:bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        aria-hidden
      />

      {/* Main command palette dialog card - 100% solid, opaque, no transparency */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: -8 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[#ffffff] dark:bg-[#121316] text-[var(--ink)] shadow-2xl"
        style={{ backgroundColor: "var(--surface, #121316)" }}
      >
        {/* Search Input Bar */}
        <div
          className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3.5 sm:px-5"
          style={{ backgroundColor: "var(--surface, #121316)" }}
        >
          <Search className="h-5 w-5 shrink-0 text-[var(--ink-faint)]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search EIPs, upgrades, authors, contributors, PRs…"
            className="w-full bg-transparent text-base text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)]"
            spellCheck={false}
            autoComplete="off"
            aria-label="Search across proposals and standards"
          />
          {loading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--brand-strong)]" />
          ) : query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
                setPeopleResults([]);
                setPrResults([]);
                inputRef.current?.focus();
              }}
              className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-[var(--ink-faint)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)] cursor-pointer"
              aria-label="Clear query"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <kbd className="kbd shrink-0">esc</kbd>
          )}
        </div>

        {/* State A: Idle (nothing typed yet) */}
        {!term && (
          <div
            className="p-4 sm:p-5"
            style={{ backgroundColor: "var(--surface, #121316)" }}
          >
            <p className="eyebrow text-[11px] mb-2.5">Popular Searches</p>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_SEARCHES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setQuery(item);
                    inputRef.current?.focus();
                  }}
                  className="chip cursor-pointer text-xs"
                >
                  {item}
                </button>
              ))}
            </div>

            <p className="eyebrow text-[11px] mt-5 mb-2">Jump to</p>
            <ul className="space-y-0.5">
              {QUICK_JUMPS.map((j) => (
                <li key={j.href}>
                  <button
                    type="button"
                    onClick={() => navigateTo(j.href)}
                    className="group flex w-full items-center gap-2.5 rounded-[var(--l-radius-control)] px-2.5 py-2 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--surface-2)] cursor-pointer"
                  >
                    <j.icon className="h-4 w-4 text-[var(--ink-faint)] group-hover:text-[var(--brand-strong)]" />
                    <span className="font-medium">{j.label}</span>
                    <ArrowRight className="ml-auto h-3.5 w-3.5 text-[var(--ink-faint)] opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* State B: Active Query */}
        {term && (
          <div
            ref={listRef}
            className="max-h-[55vh] overflow-y-auto p-2"
            style={{ backgroundColor: "var(--surface, #121316)" }}
          >
            {/* Swoop Instant Jump */}
            {swoop && (
              <button
                type="button"
                data-idx={0}
                onClick={() => navigateTo(swoop.url)}
                onMouseEnter={() => setSelectedIndex(0)}
                className={cn(
                  'group flex w-full items-center justify-between gap-3 rounded-[var(--l-radius-control)] p-3 text-left transition-colors cursor-pointer',
                  selectedIndex === 0 ? 'bg-[var(--surface-2)]' : 'hover:bg-[var(--surface-2)]'
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-[var(--brand)] text-[var(--brand-ink)]">
                    <Zap className="h-4 w-4 fill-current" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--ink)]">Go to {swoop.label}</span>
                      <LedgerBadge token={swoop.status} />
                    </div>
                    <p className="truncate text-xs text-[var(--ink-muted)]">{swoop.title}</p>
                  </div>
                </div>
                <kbd className="kbd">↵</kbd>
              </button>
            )}

            {/* Upgrades & Hubs */}
            {pageMatches.length > 0 && (
              <div className="mt-1 space-y-0.5">
                <div className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-[var(--ink-faint)]">
                  <Package className="h-3 w-3" />
                  <span>Upgrades &amp; Hubs · {pageMatches.length}</span>
                </div>
                {pageMatches.map((m, i) => {
                  const targetIdx = (swoop ? 1 : 0) + i;
                  const isSelected = selectedIndex === targetIdx;
                  return (
                    <button
                      key={`hub-${m.url}`}
                      type="button"
                      data-idx={targetIdx}
                      onClick={() => navigateTo(m.url)}
                      onMouseEnter={() => setSelectedIndex(targetIdx)}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 rounded-[var(--l-radius-control)] px-3 py-2 text-left transition-colors cursor-pointer',
                        isSelected ? 'bg-[var(--surface-2)]' : 'hover:bg-[var(--surface-2)]'
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-xs font-semibold sm:text-sm text-[var(--ink)]">{m.label}</span>
                          <LedgerBadge token="core" className="text-[10px]">{m.badge}</LedgerBadge>
                        </div>
                        <p className="truncate font-mono text-[11px] text-[var(--ink-faint)]">{m.sub}</p>
                      </div>
                      <ArrowRight
                        className={cn(
                          'h-3.5 w-3.5 shrink-0 transition-opacity',
                          isSelected ? 'text-[var(--brand-strong)] opacity-100' : 'opacity-0'
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            )}

            {/* People (Authors / Editors) List */}
            {peopleResults.length > 0 && (
              <div className="mt-1 space-y-0.5">
                <div className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-[var(--ink-faint)]">
                  <Users className="h-3 w-3" />
                  <span>People &amp; Editors · {peopleResults.length}</span>
                </div>
                {peopleResults.map((p, i) => {
                  const targetIdx = (swoop ? 1 : 0) + pageMatches.length + i;
                  const isSelected = selectedIndex === targetIdx;
                  const url = `/user/${encodeURIComponent(p.name)}`;
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
                    <button
                      key={`people-${p.name}`}
                      type="button"
                      data-idx={targetIdx}
                      onClick={() => navigateTo(url)}
                      onMouseEnter={() => setSelectedIndex(targetIdx)}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 rounded-[var(--l-radius-control)] px-3 py-2 text-left transition-colors cursor-pointer',
                        isSelected ? 'bg-[var(--surface-2)]' : 'hover:bg-[var(--surface-2)]'
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

                      <div className="flex shrink-0 items-center gap-2">
                        <ArrowRight
                          className={cn(
                            'h-3.5 w-3.5 transition-opacity',
                            isSelected ? 'text-[var(--brand-strong)] opacity-100' : 'opacity-0'
                          )}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Results List */}
            {results.length > 0 && (
              <div className="mt-1 space-y-0.5">
                <div className="px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-[var(--ink-faint)]">
                  Proposals · {results.length}
                </div>
                {results.map((r, i) => {
                  const targetIdx = (swoop ? 1 : 0) + pageMatches.length + peopleResults.length + i;
                  const isSelected = selectedIndex === targetIdx;
                  const url = `/${r.repo}/${r.number}`;
                  const meta = [r.category, r.type].filter(Boolean).join(' · ');

                  return (
                    <button
                      key={`${r.repo}-${r.number}`}
                      type="button"
                      data-idx={targetIdx}
                      onClick={() => navigateTo(url)}
                      onMouseEnter={() => setSelectedIndex(targetIdx)}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 rounded-[var(--l-radius-control)] px-3 py-2 text-left transition-colors cursor-pointer',
                        isSelected ? 'bg-[var(--surface-2)]' : 'hover:bg-[var(--surface-2)]'
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <LedgerBadge token={r.repo} label={`${r.repo.toUpperCase()}-${r.number}`} />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold sm:text-sm text-[var(--ink)]">
                            {r.title || `${r.repo.toUpperCase()}-${r.number}`}
                          </p>
                          <p className="truncate text-[11px] font-mono text-[var(--ink-faint)]">
                            {meta || (r.author ? `by ${r.author}` : 'Ethereum proposal')}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <LedgerBadge token={r.status} />
                        <CornerDownLeft
                          className={cn(
                            'h-3.5 w-3.5 transition-opacity',
                            isSelected ? 'text-[var(--brand-strong)] opacity-100' : 'opacity-0'
                          )}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Pull Requests */}
            {prResults.length > 0 && (
              <div className="mt-1 space-y-0.5">
                <div className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-[var(--ink-faint)]">
                  <GitPullRequest className="h-3 w-3" />
                  <span>Pull Requests · {prResults.length}</span>
                </div>
                {prResults.map((pr, i) => {
                  const targetIdx = (swoop ? 1 : 0) + pageMatches.length + peopleResults.length + results.length + i;
                  const isSelected = selectedIndex === targetIdx;
                  const repoShort = pr.repo.split('/')[1] || pr.repo;
                  const url = `https://github.com/${pr.repo}/pull/${pr.prNumber}`;
                  const stateLabel = pr.mergedAt ? 'Merged' : pr.state === 'closed' ? 'Closed' : 'Open';
                  return (
                    <button
                      key={`pr-${pr.repo}-${pr.prNumber}`}
                      type="button"
                      data-idx={targetIdx}
                      onClick={() => navigateTo(url)}
                      onMouseEnter={() => setSelectedIndex(targetIdx)}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 rounded-[var(--l-radius-control)] px-3 py-2 text-left transition-colors cursor-pointer',
                        isSelected ? 'bg-[var(--surface-2)]' : 'hover:bg-[var(--surface-2)]'
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="rounded border border-[var(--border)] bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[var(--ink)]">
                          {repoShort}#{pr.prNumber}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold sm:text-sm text-[var(--ink)]">
                            {pr.title || `PR #${pr.prNumber}`}
                          </p>
                          <p className="truncate font-mono text-[11px] text-[var(--ink-faint)]">
                            {pr.author ? `by ${pr.author}` : pr.repo}
                          </p>
                        </div>
                      </div>
                      <LedgerBadge token={pr.mergedAt ? 'final' : pr.state === 'closed' ? 'stagnant' : 'review'}>
                        {stateLabel}
                      </LedgerBadge>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Empty State */}
            {!loading && pageMatches.length === 0 && results.length === 0 && peopleResults.length === 0 && prResults.length === 0 && !swoop && (
              <div className="px-5 py-8 text-center">
                <p className="text-sm font-medium text-[var(--ink)]">No results found for “{term}”</p>
                <p className="mt-1 text-xs text-[var(--ink-muted)]">
                  Try an author or editor name (e.g. Vitalik, lightclient), an EIP number (1559, 4844), or a topic.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer info & keyboard hints */}
        <div
          className="flex items-center justify-between border-t border-[var(--border)] bg-[#f6f7f9] dark:bg-[#181a1f] px-4 py-2.5 text-[11px] text-[var(--ink-faint)]"
          style={{ backgroundColor: "var(--surface-2, #181a1f)" }}
        >
          <div className="hidden items-center gap-3 sm:flex">
            <span className="flex items-center gap-1">
              <kbd className="kbd">↑↓</kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="kbd">↵</kbd> open
            </span>
            <span className="flex items-center gap-1">
              <kbd className="kbd">esc</kbd> close
            </span>
          </div>
          {term ? (
            <button
              type="button"
              onClick={() => navigateTo(`/search?q=${encodeURIComponent(term)}`)}
              className="ml-auto inline-flex items-center gap-1 font-medium text-[var(--brand-strong)] transition-colors hover:underline cursor-pointer"
            >
              See all results for “{term}” <ArrowRight className="h-3 w-3" />
            </button>
          ) : (
            <span className="ml-auto">Type a number to jump directly</span>
          )}
        </div>
      </motion.div>
    </div>
  );
}
