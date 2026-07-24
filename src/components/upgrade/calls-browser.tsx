'use client';

import { useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ExternalLink, Github, Video, Search, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { callDisplayName, callSeriesBadgeClass, callSeriesShort } from '@/data/call-series';
import { CallTldr } from '@/components/upgrade/call-tldr';
import {
  SeriesFilter,
  matchesSeries,
  DEFAULT_SERIES_FILTER,
  type SeriesFilterValue,
} from '@/components/upgrade/series-filter';

export interface RecentCall {
  series: string;
  call_id: string | number;
  call_number: string | null;
  display_name: string | null;
  occurred_on: string;
  video_url: string | null;
  issue_number: number | null;
  has_transcript: boolean;
  tldr: unknown;
}

function SeriesBadge({ series }: { series: string }) {
  return (
    <span
      className={cn(
        'inline-flex w-16 shrink-0 items-center justify-center rounded-full border px-2 py-0.5 text-[10px] font-semibold',
        callSeriesBadgeClass(series)
      )}
    >
      {callSeriesShort(series)}
    </span>
  );
}

// Recent calls list reveals in batches — how many to show first, and per click.
const INITIAL_VISIBLE = 13;
const STEP = 13;

/**
 * Client browser for recent protocol calls: colorful per-series filter tabs over
 * a compact card list. Each card is collapsed to its title row and expands to
 * reveal the summary on click; the list shows a batch at a time (Show more)
 * rather than dumping all ~300 calls at once.
 */
export function CallsBrowser({ calls }: { calls: RecentCall[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // The URL is the source of truth for the series filter — NOT a useState initialiser.
  // Sidebar deep links (?series=acd&acd=acde) are client-side navigations that
  // re-render this component without remounting it, so an initialiser would only ever
  // read the URL present on first mount and every later link would silently no-op.
  const series = useMemo<SeriesFilterValue>(() => {
    const g = searchParams.get('series');
    if (g === 'acd') return { group: 'acd', acd: searchParams.get('acd') ?? 'all' };
    if (g === 'breakouts') return { group: 'breakouts', acd: 'all' };
    return DEFAULT_SERIES_FILTER;
  }, [searchParams]);

  // Search keeps local state so typing stays responsive, but adopts the URL when it
  // changes externally (sidebar link, back button). Render-phase adjustment is React's
  // documented pattern for this and avoids a setState-in-effect.
  const urlSearch = searchParams.get('q') ?? '';
  const [search, setSearch] = useState(urlSearch);
  const [syncedSearch, setSyncedSearch] = useState(urlSearch);
  if (urlSearch !== syncedSearch) {
    setSyncedSearch(urlSearch);
    setSearch(urlSearch);
  }

  // Reflect the current filters back into the URL (shareable, back-button friendly).
  const syncUrl = (next: { series?: SeriesFilterValue; search?: string }) => {
    const s = next.series ?? series;
    const q = (next.search ?? search).trim();
    const params = new URLSearchParams();
    if (s.group !== 'all') params.set('series', s.group);
    if (s.group === 'acd' && s.acd !== 'all') params.set('acd', s.acd);
    if (q) params.set('q', q);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // No setSeries: the URL drives it, and syncUrl re-renders us with the new params.
  const changeSeries = (v: SeriesFilterValue) => {
    syncUrl({ series: v });
  };
  const changeSearch = (v: string) => {
    setSearch(v);
    syncUrl({ search: v });
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const call of calls) c[call.series] = (c[call.series] ?? 0) + 1;
    return c;
  }, [calls]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return calls.filter((c) => {
      if (!matchesSeries(c.series, series)) return false;
      if (!q) return true;
      return `${callDisplayName(c)} ${c.series} #${c.call_number ?? ''}`.toLowerCase().includes(q);
    });
  }, [calls, series, search]);

  // Which cards are expanded. Independent (not an accordion) so an editor can open
  // several summaries side by side. Keyed by series+call_id.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // Reveal the list in batches. visibleCount resets when the filter changes, via the
  // render-phase pattern — a plain initialiser wouldn't re-run, and a reset effect
  // would trip the React Compiler's setState-in-effect rule.
  const filterKey = `${series.group}:${series.acd ?? ''}:${search.trim().toLowerCase()}`;
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [syncedFilterKey, setSyncedFilterKey] = useState(filterKey);
  if (filterKey !== syncedFilterKey) {
    setSyncedFilterKey(filterKey);
    setVisibleCount(INITIAL_VISIBLE);
  }
  const visible = filtered.slice(0, visibleCount);
  const remaining = filtered.length - visible.length;

  return (
    <div className="space-y-4">
      {/* Search + grouped series filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SeriesFilter value={series} onChange={changeSeries} counts={counts} />
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => changeSearch(e.target.value)}
            placeholder="Search calls…"
            className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Call list — collapsed cards, revealed a batch at a time. */}
      {filtered.length === 0 ? (
        <p className="rounded-xl border border-border bg-card/60 px-4 py-6 text-sm text-muted-foreground">
          No calls in this series yet.
        </p>
      ) : (
        <div className="space-y-2.5">
          {visible.map((call) => {
            const key = `${call.series}-${call.call_id}`;
            const hasTldr = call.tldr != null;
            const isOpen = expanded.has(key);
            return (
              <div
                key={key}
                className="rounded-xl border border-border bg-card/60 p-4 transition-colors hover:border-primary/40"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  {/* Expander first, so every card's disclosure control lines up. It's
                      only interactive when there's a summary to reveal. */}
                  {hasTldr ? (
                    <button
                      type="button"
                      onClick={() => toggle(key)}
                      aria-expanded={isOpen}
                      aria-label={isOpen ? 'Collapse summary' : 'Expand summary'}
                      className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-primary"
                    >
                      <ChevronRight
                        className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-90')}
                      />
                    </button>
                  ) : (
                    <span className="w-5 shrink-0" aria-hidden />
                  )}
                  <SeriesBadge series={call.series} />
                  <Link
                    href={`/calls/${call.series}/${call.call_number ?? call.call_id}`}
                    className="min-w-0 flex-1 text-sm font-medium text-foreground transition-colors hover:text-primary hover:underline"
                  >
                    {callDisplayName(call)}
                  </Link>
                  <span className="text-xs text-muted-foreground">{call.occurred_on}</span>
                  <div className="flex items-center gap-3">
                    {call.video_url && (
                      <a
                        href={call.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Recording"
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        <Video className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Recording</span>
                      </a>
                    )}
                    {call.issue_number && (
                      <a
                        href={`https://github.com/ethereum/pm/issues/${call.issue_number}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Agenda"
                        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
                      >
                        <Github className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Agenda</span>
                      </a>
                    )}
                    {call.has_transcript && (
                      <Link
                        href={`/calls/${call.series}/${call.call_number ?? call.call_id}`}
                        title="Transcript"
                        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Transcript</span>
                      </Link>
                    )}
                  </div>
                </div>
                {/* Collapsed by default — the full summary reveals in place on click. */}
                {hasTldr && isOpen && <CallTldr tldr={call.tldr} />}
              </div>
            );
          })}

          {remaining > 0 && (
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + STEP)}
              className="mt-1 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-card/60 px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              Show {Math.min(STEP, remaining)} more
              <span className="text-xs text-muted-foreground/70">({remaining} remaining)</span>
              <ChevronDown className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
