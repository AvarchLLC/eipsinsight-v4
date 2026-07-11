import type { Metadata } from 'next';
import { CalendarClock } from 'lucide-react';
import '@/lib/orpc.server';
import { cn } from '@/lib/utils';
import { buildMetadata } from '@/lib/seo';
import {
  getCachedRecentCalls,
  getCachedUpcomingCalls,
} from '@/lib/upgrade-data.server';
import { callSeriesBadgeClass, callSeriesShort } from '@/data/call-series';
import { CallsBrowser } from '@/components/upgrade/calls-browser';

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: 'Protocol Calls',
  description:
    'Upcoming and recent Ethereum protocol calls — AllCoreDevs, testing, and breakout series — with agendas, recordings, and summaries.',
  path: '/upgrade/calls',
  keywords: ['AllCoreDevs', 'ACDE', 'ACDC', 'Ethereum protocol calls'],
});

function SeriesBadge({ series }: { series: string | null }) {
  const slug = series ?? 'unknown';
  return (
    <span
      className={cn(
        'inline-flex w-16 shrink-0 items-center justify-center rounded-full border px-2 py-0.5 text-[10px] font-semibold',
        series ? callSeriesBadgeClass(series) : 'border-border bg-muted text-muted-foreground'
      )}
    >
      {series ? callSeriesShort(slug) : '—'}
    </span>
  );
}

function formatUpcoming(call: { occurs_at: string | null; occurs_on: string | null }): string {
  if (call.occurs_at) {
    const date = new Date(call.occurs_at);
    return `${date.toISOString().slice(0, 10)} · ${date.toISOString().slice(11, 16)} UTC`;
  }
  return call.occurs_on ?? 'Date TBD';
}

export default async function ProtocolCallsPage() {
  const [upcoming, recent] = await Promise.all([
    getCachedUpcomingCalls(),
    // Full history so past calls show (client-side series filter handles navigation).
    getCachedRecentCalls(300),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 px-4 pb-12 pt-8 sm:px-6">
      <header>
        <h1 className="dec-title persona-title text-balance text-3xl font-semibold tracking-tight leading-[1.1] sm:text-4xl">
          Protocol calls
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          AllCoreDevs and breakout calls where upgrade decisions happen — agendas from
          ethereum/pm, recordings, and AI summaries, synced automatically.
        </p>
      </header>

      {/* Upcoming */}
      <section id="upcoming">
        <div className="mb-4">
          <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Upcoming
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Parsed from open agenda issues on ethereum/pm.
          </p>
        </div>
        {upcoming.length === 0 ? (
          <p className="rounded-xl border border-border bg-card/60 px-4 py-6 text-sm text-muted-foreground">
            No upcoming calls found right now — check back after the next scheduler sync.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card/60">
            <ul className="divide-y divide-border/60">
              {upcoming.map((call) => (
                <li
                  key={call.issue_number}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3"
                >
                  <SeriesBadge series={call.series} />
                  <div className="min-w-0 flex-1">
                    <a
                      href={call.issue_url ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-foreground transition-colors hover:text-primary"
                    >
                      {call.title}
                    </a>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5" />
                    {formatUpcoming(call)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Recent */}
      <section id="recent">
        <div className="mb-4">
          <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Recent calls
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Latest calls with recordings and summaries from the ACDbot pipeline — filter by
            series below.
          </p>
        </div>
        {recent.length === 0 ? (
          <p className="rounded-xl border border-border bg-card/60 px-4 py-6 text-sm text-muted-foreground">
            No calls synced yet — the scheduler populates this within a few minutes of its
            first run.
          </p>
        ) : (
          <CallsBrowser calls={recent} />
        )}
      </section>
    </div>
  );
}
