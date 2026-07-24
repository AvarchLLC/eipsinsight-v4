import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CalendarClock, History } from 'lucide-react';
import { PageHeader } from '@/components/header';
import { UpgradeSection } from '@/components/upgrade/upgrade-section';
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
    'Upcoming and recent Ethereum protocol calls - AllCoreDevs, testing, and breakout series - with agendas, recordings, and summaries.',
  path: '/calls',
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
    // No space-y on this container: UpgradeSection owns its vertical rhythm (divider + pt/pb).
    <div className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6">
      {/* padding="px-0": the wrapper already pads, so the header aligns with the sections. */}
      <PageHeader
        eyebrow="Governance"
        indicator={{ icon: 'calendar', label: 'Protocol calls', pulse: upcoming.length > 0 }}
        title="Protocol calls"
        description="AllCoreDevs and breakout calls where upgrade decisions happen - agendas from ethereum/pm, recordings, and AI summaries, synced automatically."
        sectionId="protocol-calls-overview"
        padding="px-0"
      />

      <UpgradeSection
        id="upcoming"
        icon={CalendarClock}
        title="Upcoming"
        description="Parsed from open agenda issues on ethereum/pm."
      >
        {upcoming.length === 0 ? (
          <p className="rounded-xl border border-border bg-card/60 px-4 py-6 text-sm text-muted-foreground">
            No upcoming calls found right now - check back after the next scheduler sync.
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
      </UpgradeSection>

      <UpgradeSection
        id="recent"
        icon={History}
        title="Recent calls"
        description="Latest calls with recordings and summaries from the ACDbot pipeline - filter by series below."
      >
        {recent.length === 0 ? (
          <p className="rounded-xl border border-border bg-card/60 px-4 py-6 text-sm text-muted-foreground">
            No calls synced yet - the scheduler populates this within a few minutes of its
            first run.
          </p>
        ) : (
          <Suspense fallback={null}>
            <CallsBrowser calls={recent} />
          </Suspense>
        )}
      </UpgradeSection>
    </div>
  );
}
