import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, FlaskConical, Radio } from 'lucide-react';
import '@/lib/orpc.server';
import { buildMetadata } from '@/lib/seo';
import { getCachedDevnetList } from '@/lib/upgrade-data.server';

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: 'Devnets',
  description:
    'Ethereum devnets for in-progress network upgrades - specs, EIP scope, live status, and client support, scraped automatically from ethpandaops.',
  path: '/upgrade/devnets',
  keywords: ['Ethereum devnets', 'glamsterdam devnet', 'devnet spec'],
});

/** Series shown first; anything else (historical) follows alphabetically. */
const FEATURED_SERIES = ['glamsterdam', 'bal', 'epbs'];

const SERIES_LABELS: Record<string, string> = {
  glamsterdam: 'Glamsterdam',
  bal: 'Block-Level Access Lists (BAL)',
  epbs: 'ePBS',
  blob: 'Blob scaling',
};

function genesisDate(genesisTime: number | null): string | null {
  if (!genesisTime) return null;
  return new Date(genesisTime * 1000).toISOString().slice(0, 10);
}

export default async function DevnetsPage() {
  const devnets = await getCachedDevnetList();

  const bySeries = new Map<string, typeof devnets>();
  for (const devnet of devnets) {
    if (!bySeries.has(devnet.series)) bySeries.set(devnet.series, []);
    bySeries.get(devnet.series)!.push(devnet);
  }

  const seriesOrder = [
    ...FEATURED_SERIES.filter((series) => bySeries.has(series)),
    ...Array.from(bySeries.keys())
      .filter((series) => !FEATURED_SERIES.includes(series))
      .sort(),
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 px-4 pb-12 pt-8 sm:px-6">
      <header>
        <h1 className="dec-title persona-title text-balance text-3xl font-semibold tracking-tight leading-[1.1] sm:text-4xl">
          Devnets
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Developer test networks where upgrade features get implemented and broken first —
          specs, EIP scope, and live status scraped automatically from ethpandaops.
        </p>
      </header>

      {devnets.length === 0 && (
        <p className="rounded-xl border border-border bg-card/60 px-4 py-6 text-sm text-muted-foreground">
          No devnet specs synced yet - the scheduler populates this within a few minutes of
          its first run.
        </p>
      )}

      {seriesOrder.map((series) => {
        const entries = bySeries.get(series)!;
        return (
          <section key={series} id={series}>
            <div className="mb-4">
              <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                {SERIES_LABELS[series] ?? series}
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {entries.length} devnet{entries.length === 1 ? '' : 's'}
                {entries.some((d) => d.active) && ' · has live networks'}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {entries.map((devnet) => (
                <Link
                  key={devnet.id}
                  href={`/upgrade/devnets/${devnet.id}`}
                  className="group flex flex-col rounded-xl border border-border bg-card/60 p-4 transition-colors hover:border-primary/40"
                >
                  <div className="flex items-center gap-2">
                    <FlaskConical className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate text-sm font-semibold text-foreground">
                      {devnet.title ?? devnet.id}
                    </span>
                    {devnet.active ? (
                      <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                        <Radio className="h-2.5 w-2.5" />
                        live
                      </span>
                    ) : devnet.canceled ? (
                      <span className="ml-auto shrink-0 rounded-full border border-red-500/30 bg-red-500/15 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:text-red-300">
                        canceled
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {genesisDate(devnet.genesis_time) && (
                      <span>Genesis {genesisDate(devnet.genesis_time)}</span>
                    )}
                    <span>
                      {devnet.same_spec_as
                        ? `Same spec as ${devnet.same_spec_as}`
                        : `${devnet.eip_count} EIPs in scope`}
                    </span>
                  </div>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                    Spec & client support
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
