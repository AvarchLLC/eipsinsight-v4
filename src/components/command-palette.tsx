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

const POPULAR_SEARCHES = ['1559', '4844', '7702', 'ERC-20', 'ERC-4337', 'ERC-721', 'RIP-7560', 'blobs'];

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
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const cacheRef = useRef<Map<string, ProposalSearchResult[]>>(new Map());
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
      setLoading(false);
      return;
    }

    const key = term.toLowerCase();
    setSelectedIndex(0);

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
        const res = (await client.search.searchProposals({ query: term, limit: 8 })) as ProposalSearchResult[];
        cacheRef.current.set(key, res);
        if (myId !== reqIdRef.current) return;
        setResults(res);
      } catch (err) {
        if (myId === reqIdRef.current) console.error('Failed search in palette:', err);
      } finally {
        if (myId === reqIdRef.current) setLoading(false);
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [open, term]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const navigateTo = useCallback(
    (url: string) => {
      setOpen(false);
      router.push(url);
    },
    [router]
  );

  const flatDestinations = useMemo(() => {
    const list: string[] = [];
    if (swoop) list.push(swoop.url);
    results.forEach((r) => list.push(`/${r.repo}/${r.number}`));
    return list;
  }, [swoop, results]);

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
      {/* Dimmed backdrop - solid dark with blur so underlying page is muted */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-md"
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
            placeholder="Search proposals, people, upgrades…"
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

            {/* Results List */}
            {results.length > 0 && (
              <div className="mt-1 space-y-0.5">
                <div className="px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-[var(--ink-faint)]">
                  Proposals · {results.length}
                </div>
                {results.map((r, i) => {
                  const targetIdx = swoop ? i + 1 : i;
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

            {/* Empty State */}
            {!loading && results.length === 0 && !swoop && (
              <div className="px-5 py-8 text-center">
                <p className="text-sm font-medium text-[var(--ink)]">No results found for “{term}”</p>
                <p className="mt-1 text-xs text-[var(--ink-muted)]">
                  Try a proposal number (e.g. 1559, 4844), an ERC (ERC-20), or a keyword.
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
