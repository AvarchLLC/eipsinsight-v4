'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  CalendarClock,
  ChevronDown,
  ExternalLink,
  Github,
  MessageSquareQuote,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { client } from '@/lib/orpc';

/**
 * "On an ACD agenda" board tab.
 *
 * Agenda issues on ethereum/pm name EIPs, not PRs — and their bodies are mostly
 * empty templates, so the real references come from the comments. The scheduler
 * extracts those into pm_agenda_eips; this panel joins them to currently-open
 * PRs so an editor can see which of their queue is about to be discussed.
 *
 * Mentions are shown verbatim with author and source link: "I'd like to PFI
 * EIP-8115" is a request, not a decision, so the UI must not present it as one.
 */

type Mention = {
  issueNumber: number;
  issueTitle: string | null;
  issueUrl: string | null;
  series: string | null;
  callNumber: string | null;
  occursOn: string | Date | null;
  mentionedBy: string | null;
  snippet: string | null;
  source: string;
  sourceUrl: string | null;
  eip: number;
};

type Row = {
  prNumber: number;
  title: string;
  author: string | null;
  repo: string;
  createdAt: string;
  eipNumbers: number[];
  nextCallOn: string | Date | null;
  mentions: Mention[];
};

const SERIES = [
  { key: '', label: 'All ACD' },
  { key: 'acde', label: 'ACDE' },
  { key: 'acdc', label: 'ACDC' },
  { key: 'acdt', label: 'ACDT' },
  { key: 'acdtcl', label: 'ACDT-CL' },
] as const;

const SERIES_BADGE: Record<string, string> = {
  acde: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  acdc: 'border-blue-500/30 bg-blue-500/15 text-blue-700 dark:text-blue-300',
  acdt: 'border-cyan-500/30 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
  acdtcl: 'border-violet-500/30 bg-violet-500/15 text-violet-700 dark:text-violet-300',
};

const REPO_PATH: Record<string, string> = { eips: 'EIPs', ercs: 'ERCs', rips: 'RIPs' };

/**
 * Format a call date. The API returns plain 'YYYY-MM-DD' strings, but this stays
 * tolerant of Date objects too: node-postgres hydrates DATE columns into Dates,
 * so any query that forgets TO_CHAR would otherwise crash on `.slice`.
 */
function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const iso = value instanceof Date ? value.toISOString() : String(value);
  const day = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return '—';
  // Parsed and rendered as UTC so the calendar day can't shift by timezone.
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function AgendaPrsPanel() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [series, setSeries] = useState<string>(() => {
    const s = searchParams.get('series') || searchParams.get('acd_series');
    return s && ['acde', 'acdc', 'acdt', 'acdtcl'].includes(s) ? s : '';
  });
  const [window, setWindow] = useState<'upcoming' | 'all'>(() => {
    return searchParams.get('window') === 'upcoming' ? 'upcoming' : 'all';
  });
  const [search, setSearch] = useState(() => searchParams.get('acd_q') || '');
  const [debounced, setDebounced] = useState(() => searchParams.get('acd_q') || '');
  const [page, setPage] = useState(() => Math.max(1, Number(searchParams.get('acd_page')) || 1));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    ready: boolean;
    total: number;
    totalPages: number;
    rows: Row[];
  } | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Mirror agenda state to URL search parameters so sharing links retains tab + filters
  useEffect(() => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('tab', 'agenda');
    if (series) p.set('series', series);
    else p.delete('series');
    if (window !== 'all') p.set('window', window);
    else p.delete('window');
    if (debounced) p.set('acd_q', debounced);
    else p.delete('acd_q');
    if (page > 1) p.set('acd_page', String(page));
    else p.delete('acd_page');
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [series, window, debounced, page, pathname, router, searchParams]);

  // Filter changes reset paging in the handlers rather than via an effect on
  // [series, window, debounced] — that effect would setState synchronously on
  // every filter change, which the React Compiler flags as cascading renders.
  const changeSeries = (next: string) => {
    setSeries(next);
    setPage(1);
  };
  const changeWindow = (next: 'upcoming' | 'all') => {
    setWindow(next);
    setPage(1);
  };
  const changeSearch = (next: string) => {
    setSearch(next);
    setPage(1);
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // Yield a microtask first so the setState calls below are not synchronous
      // within the effect body (React Compiler rule); still lands in this frame.
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);
      setError(null);
      try {
        const res = await client.tools.getAgendaPRs({
          series: (series || undefined) as 'acde' | 'acdc' | 'acdt' | 'acdtcl' | undefined,
          window,
          search: debounced || undefined,
          page,
          pageSize: 25,
        });
        if (!cancelled) setData(res as { ready: boolean; total: number; totalPages: number; rows: Row[] });
      } catch (e) {
        // Most likely cause before the migration is applied: pm_agenda_eips missing.
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load agenda PRs');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [series, window, debounced, page]);

  const rows = useMemo(() => data?.rows ?? [], [data]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {SERIES.map((s) => (
            <button
              key={s.key || 'all'}
              type="button"
              onClick={() => changeSeries(s.key)}
              className={cn(
                'inline-flex h-8 items-center rounded-md border px-2.5 text-xs font-medium transition-colors',
                series === s.key
                  ? 'border-primary/50 bg-primary/10 text-foreground'
                  : 'border-border bg-card/70 text-muted-foreground hover:border-primary/40'
              )}
            >
              {s.label}
            </button>
          ))}
          <span className="mx-1 h-5 w-px bg-border" aria-hidden />
          <button
            type="button"
            onClick={() => changeWindow(window === 'all' ? 'upcoming' : 'all')}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors',
              window === 'upcoming'
                ? 'border-primary/50 bg-primary/10 text-foreground'
                : 'border-border bg-card/70 text-muted-foreground hover:border-primary/40'
            )}
            title="Only agendas for calls that haven't happened yet"
          >
            <CalendarClock className="h-3.5 w-3.5" />
            Upcoming calls only
          </button>
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => changeSearch(e.target.value)}
            placeholder="Search PR, author, EIP…"
            className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-6 text-sm">
          <p className="font-medium text-foreground">Couldn&apos;t load agenda PRs.</p>
          <p className="mt-2 font-mono text-xs text-muted-foreground">{error}</p>
        </div>
      ) : data && !data.ready ? (
        // Distinct from an error: the table simply hasn't been created yet.
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-6 text-sm">
          <p className="font-medium text-foreground">Agenda tracking isn&apos;t set up yet.</p>
          <p className="mt-1 text-muted-foreground">
            The <code className="font-mono text-xs">pm_agenda_eips</code> table hasn&apos;t been
            created. Run <code className="font-mono text-xs">bunx prisma migrate deploy</code>, then
            let the scheduler run once to populate it.
          </p>
        </div>
      ) : loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl border border-border bg-card/60" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-border bg-card/60 px-4 py-8 text-center text-sm text-muted-foreground">
          No open PRs are linked to an ACD agenda{series ? ` for ${series.toUpperCase()}` : ''}
          {window === 'upcoming' ? ' in an upcoming call' : ''}.
        </p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{data?.total ?? 0}</span> open{' '}
            {data?.total === 1 ? 'PR is' : 'PRs are'} linked to an EIP mentioned on an ACD agenda.
          </p>

          <div className="overflow-hidden rounded-xl border border-border bg-card/60">
            <ul className="divide-y divide-border/60">
              {rows.map((row) => {
                const isOpen = expanded === row.prNumber;
                return (
                  <li key={`${row.repo}-${row.prNumber}`} className="text-sm">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3">
                      <a
                        href={`https://github.com/ethereum/${REPO_PATH[row.repo] ?? 'EIPs'}/pull/${row.prNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-1 font-mono text-xs font-semibold text-primary hover:underline"
                      >
                        <Github className="h-3.5 w-3.5" />#{row.prNumber}
                      </a>

                      <span className="min-w-0 flex-1 truncate text-foreground">{row.title}</span>

                      <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                        @{row.author ?? 'unknown'}
                      </span>

                      <span className="inline-flex shrink-0 flex-wrap items-center gap-1">
                        {row.eipNumbers.slice(0, 4).map((n) => (
                          <Link
                            key={n}
                            href={`/eips/${n}`}
                            className="rounded-full border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground hover:border-primary/40 hover:text-primary"
                          >
                            {n}
                          </Link>
                        ))}
                        {row.eipNumbers.length > 4 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{row.eipNumbers.length - 4}
                          </span>
                        )}
                      </span>

                      {row.nextCallOn && (
                        <span
                          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-foreground"
                          title="Next call whose agenda mentions this EIP"
                        >
                          <CalendarClock className="h-3.5 w-3.5 text-primary" />
                          {formatDate(row.nextCallOn)}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : row.prNumber)}
                        aria-expanded={isOpen}
                        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                      >
                        {row.mentions.length} mention{row.mentions.length === 1 ? '' : 's'}
                        <ChevronDown
                          className={cn('h-3 w-3 transition-transform', isOpen && 'rotate-180')}
                        />
                      </button>
                    </div>

                    {isOpen && (
                      <div className="space-y-2 border-t border-border/50 bg-muted/20 px-4 py-3">
                        {row.mentions.map((m, i) => (
                          <div key={i} className="flex gap-2 text-xs">
                            <MessageSquareQuote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {m.series && (
                                  <span
                                    className={cn(
                                      'rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase',
                                      SERIES_BADGE[m.series] ??
                                        'border-border bg-muted text-muted-foreground'
                                    )}
                                  >
                                    {m.series}
                                    {m.callNumber ? ` #${m.callNumber}` : ''}
                                  </span>
                                )}
                                <span className="text-muted-foreground">
                                  {formatDate(m.occursOn)}
                                </span>
                                {m.mentionedBy && (
                                  <span className="text-muted-foreground">
                                    · raised by{' '}
                                    <span className="font-medium text-foreground">
                                      @{m.mentionedBy}
                                    </span>
                                  </span>
                                )}
                                <span className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
                                  EIP-{m.eip} · {m.source}
                                </span>
                                {m.sourceUrl && (
                                  <a
                                    href={m.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-0.5 text-primary hover:underline"
                                  >
                                    view
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </div>
                              {m.snippet && (
                                <p className="mt-1 border-l-2 border-border pl-2 italic text-muted-foreground">
                                  “{m.snippet}”
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                        <p className="pl-5 text-[10px] text-muted-foreground/70">
                          Mentions are quoted from ethereum/pm agenda issues — a request to discuss,
                          not a decision.
                        </p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {(data?.totalPages ?? 1) > 1 && (
            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-md border border-border px-2.5 py-1 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-muted-foreground">
                Page {page} of {data?.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= (data?.totalPages ?? 1)}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md border border-border px-2.5 py-1 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
