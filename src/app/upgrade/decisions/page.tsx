import type { Metadata } from 'next';
import '@/lib/orpc.server';
import { buildMetadata } from '@/lib/seo';
import { getCachedRecentDecisions } from '@/lib/upgrade-data.server';
import { DecisionsBrowser } from '@/components/upgrade/decisions-browser';

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: 'Protocol Decisions',
  description:
    'Key decisions from AllCoreDevs and breakout calls — stage changes, devnet inclusions, and headliner selections, with timestamps and sources.',
  path: '/upgrade/decisions',
  keywords: ['AllCoreDevs decisions', 'Ethereum governance', 'ACD decisions'],
});

export default async function DecisionsPage() {
  // Fetch the full decision history (client-side filters handle navigation).
  const calls = await getCachedRecentDecisions(300);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-4 pb-12 pt-8 sm:px-6">
      <header>
        <h1 className="dec-title persona-title text-balance text-3xl font-semibold tracking-tight leading-[1.1] sm:text-4xl">
          Protocol decisions
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          What was actually decided on each core-dev call — stage changes, devnet
          inclusions, and headliner selections, extracted from call recordings with
          timestamps.
        </p>
      </header>

      {calls.length === 0 ? (
        <p className="rounded-xl border border-border bg-card/60 px-4 py-6 text-sm text-muted-foreground">
          No structured decisions synced yet — run the protocol-calls sync (decisions are
          fetched alongside call summaries).
        </p>
      ) : (
        <DecisionsBrowser calls={calls} />
      )}
    </div>
  );
}
