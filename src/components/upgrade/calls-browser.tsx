'use client';

import { useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ExternalLink, Github, Video, Search } from 'lucide-react';
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

/**
 * Client browser for recent protocol calls: colorful per-series filter tabs
 * over a compact card list (summaries stay collapsed to keep it scannable).
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

      {/* Call list */}
      {filtered.length === 0 ? (
        <p className="rounded-xl border border-border bg-card/60 px-4 py-6 text-sm text-muted-foreground">
          No calls in this series yet.
        </p>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((call) => (
            <div
              key={`${call.series}-${call.call_id}`}
              className="rounded-xl border border-border bg-card/60 p-4 transition-colors hover:border-primary/40"
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
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
              {call.tldr != null && <CallTldr tldr={call.tldr} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
