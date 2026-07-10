'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Github, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  callDisplayName,
  callSeriesBadgeClass,
  callSeriesLabel,
  callSeriesShort,
} from '@/data/call-series';
import { CallTldr } from '@/components/upgrade/call-tldr';

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
  const [active, setActive] = useState<string>('all');

  // Distinct series present, ordered by how many calls each has.
  const seriesTabs = useMemo(() => {
    const counts = new Map<string, number>();
    for (const call of calls) counts.set(call.series, (counts.get(call.series) ?? 0) + 1);
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([series, count]) => ({ series, count }));
  }, [calls]);

  const filtered = useMemo(
    () => (active === 'all' ? calls : calls.filter((c) => c.series === active)),
    [calls, active]
  );

  return (
    <div className="space-y-4">
      {/* Series filter tabs */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setActive('all')}
          className={cn(
            'inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors',
            active === 'all'
              ? 'border-primary/50 bg-primary/10 text-primary'
              : 'border-border bg-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          All
          <span className="text-[10px] opacity-70">{calls.length}</span>
        </button>
        {seriesTabs.map(({ series, count }) => (
          <button
            key={series}
            type="button"
            onClick={() => setActive(series)}
            title={callSeriesLabel(series)}
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-all',
              active === series
                ? cn(callSeriesBadgeClass(series), 'ring-2 ring-primary/30')
                : 'border-border bg-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {callSeriesShort(series)}
            <span className="text-[10px] opacity-70">{count}</span>
          </button>
        ))}
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
                  href={`/upgrade/calls/${call.series}/${call.call_number ?? call.call_id}`}
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
                      href={`/upgrade/calls/${call.series}/${call.call_number ?? call.call_id}`}
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
