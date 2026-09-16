import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageHeader } from '@/components/header';
import '@/lib/orpc.server';
import { buildMetadata } from '@/lib/seo';
import {
  getCachedRecentCalls,
  getCachedUpcomingCalls,
} from '@/lib/upgrade-data.server';
import { OFFICE_HOUR_RECAPS } from '@/data/office-hour-recaps';
import { CallsBrowser } from '@/components/upgrade/calls-browser';

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: 'Protocol Calls',
  description:
    'Upcoming and recent Ethereum protocol calls - AllCoreDevs, testing, and breakout series - with agendas, recordings, and summaries.',
  path: '/calls',
  keywords: ['AllCoreDevs', 'ACDE', 'ACDC', 'Ethereum protocol calls'],
});

export default async function ProtocolCallsPage() {
  const [upcoming, recentDb] = await Promise.all([
    getCachedUpcomingCalls(),
    // Full history so past calls show (client-side series filter handles navigation).
    getCachedRecentCalls(300),
  ]);

  // Static office-hour-style recaps (ethproofs, eipoh, eipip) fill in only for a
  // meeting the DB pipeline does not already carry.
  const dbKeys = new Set(recentDb.map((c) => `${c.series}-${c.call_number ?? c.call_id}`));
  const recent = [
    ...recentDb,
    ...OFFICE_HOUR_RECAPS.filter((r) => !dbKeys.has(`${r.series}-${r.meeting}`)).map((r) => ({
      series: r.series,
      call_id: r.meeting.toString(),
      call_number: r.meeting.toString(),
      display_name: r.title,
      occurred_on: r.dateISO,
      video_url: r.youtube,
      issue_number: null,
      has_transcript: true,
      tldr: r.tldr,
    })),
  ].sort((a, b) => new Date(b.occurred_on).getTime() - new Date(a.occurred_on).getTime());

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6">
      {/* padding="px-0": the wrapper already pads, so the header aligns with the sections. */}
      <PageHeader
        eyebrow="Governance"
        indicator={{ icon: 'calendar', label: 'Protocol calls', pulse: upcoming.length > 0 }}
        title="Protocol calls"
        description="AllCoreDevs and breakout calls where upgrade decisions happen - agendas from ethereum/pm, recordings, and AI summaries, synced automatically. Filter by series or search below."
        sectionId="protocol-calls-overview"
        padding="px-0"
      />

      <div className="mt-6">
        {recent.length === 0 ? (
          <p className="rounded-xl border border-border bg-card/60 px-4 py-6 text-sm text-muted-foreground">
            No calls synced yet - the scheduler populates this within a few minutes of its
            first run.
          </p>
        ) : (
          <Suspense fallback={null}>
            <CallsBrowser calls={recent} upcoming={upcoming} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
