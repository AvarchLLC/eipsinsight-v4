import type { Metadata } from 'next';
import { Suspense } from 'react';
import '@/lib/orpc.server';
import { buildMetadata } from '@/lib/seo';
import { PageHeader } from '@/components/header';
import { getCachedRecentDecisions } from '@/lib/upgrade-data.server';
import { DecisionsBrowser } from '@/components/upgrade/decisions-browser';

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: 'Protocol Decisions',
  description:
    'Key decisions from AllCoreDevs and breakout calls - stage changes, devnet inclusions, and headliner selections, with timestamps and sources.',
  path: '/decisions',
  keywords: ['AllCoreDevs decisions', 'Ethereum governance', 'ACD decisions'],
});

export default async function DecisionsPage() {
  // Fetch the full decision history (client-side filters handle navigation).
  const calls = await getCachedRecentDecisions(300);

  return (
    // No space-y here: UpgradeSection owns its vertical rhythm (divider + pt/pb).
    <div className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6">
      {/* padding="px-0": the wrapper already pads, so the header aligns with the sections. */}
      <PageHeader
        eyebrow="Governance"
        indicator={{ icon: 'clipboard', label: 'Protocol decisions' }}
        title="Protocol decisions"
        description="What was actually decided on each core-dev call - stage changes, devnet inclusions, and headliner selections, extracted from call recordings with timestamps."
        sectionId="protocol-decisions-overview"
        padding="px-0"
      />

      {/* Single-purpose page: the browser IS the content, so it needs no section heading. */}
      <div className="h-px w-full bg-border/60" aria-hidden />
      <section id="decisions" className="scroll-mt-24 pt-5">
        {calls.length === 0 ? (
          <p className="rounded-xl border border-border bg-card/60 px-4 py-6 text-sm text-muted-foreground">
            No structured decisions synced yet - run the protocol-calls sync (decisions are
            fetched alongside call summaries).
          </p>
        ) : (
          <Suspense fallback={null}>
            <DecisionsBrowser calls={calls} />
          </Suspense>
        )}
      </section>
    </div>
  );
}
