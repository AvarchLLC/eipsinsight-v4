import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ExternalLink, FlaskConical, Radio, Wrench } from 'lucide-react';
import { ShareButtons } from '@/components/share-buttons';
import '@/lib/orpc.server';
import { cn } from '@/lib/utils';
import { buildMetadata } from '@/lib/seo';
import { getCachedDevnetList } from '@/lib/upgrade-data.server';
import { devnetResourceLinks } from '@/lib/devnet-resources';

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: 'Devnets',
  description:
    'Ethereum devnets for in-progress network upgrades - specs, EIP scope, live status, and client support, scraped automatically from ethpandaops.',
  path: '/upgrade/devnets',
  keywords: ['Ethereum devnets', 'glamsterdam devnet', 'devnet spec'],
});

/** Series shown first; anything else (historical) follows alphabetically. */
const FEATURED_SERIES = ['glamsterdam', 'frames', 'focil', 'bal', 'epbs'];

const SERIES_LABELS: Record<string, string> = {
  glamsterdam: 'Glamsterdam',
  frames: 'Frame Transactions (EIP-8141)',
  focil: 'Fork-choice Enforced Inclusion Lists (FOCIL)',
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

  const activeDevnet =
    devnets.find((d) => d.active && d.id.includes('glamsterdam')) ||
    devnets.find((d) => d.active) ||
    devnets.find((d) => d.id === 'glamsterdam-devnet-8');

  const activeResources = activeDevnet ? devnetResourceLinks(activeDevnet.id) : [];

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
      <header className="space-y-2.5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <Link
              href="/upgrade"
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary mb-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Go back to main upgrades page
            </Link>
            <h1 className="dec-title persona-title text-balance text-3xl font-semibold tracking-tight leading-[1.1] sm:text-4xl">
              Devnets
            </h1>
          </div>
          <ShareButtons
            text="Ethereum Devnets: Developer test networks where upgrade features get implemented on EIPsInsight"
            hashtags={['Ethereum', 'EIPs', 'Devnets']}
            className="shrink-0"
          />
        </div>
        <p className="w-full text-sm leading-relaxed text-muted-foreground sm:text-base">
          Developer test networks where upgrade features get implemented and tested first, featuring
          specs, EIP scope, and live status scraped automatically from ethpandaops.
        </p>
      </header>
      <hr className="border-border/60" />

      {/* Featured Live Devnet Endpoints & Resources (Dora, RPC, Faucet, Checkpoint Sync, etc.) */}
      {activeDevnet && activeResources.length > 0 && (
        <section className="rounded-2xl border border-primary/30 bg-card/80 p-5 backdrop-blur-sm sm:p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-primary" />
                <h2 className="dec-title text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                  Live Devnet Endpoints & Resources : {activeDevnet.title ?? activeDevnet.id}
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  <Radio className="h-3 w-3" />
                  live
                </span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm">
                Hosted by ethpandaops at <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">&lt;service&gt;.{activeDevnet.id}.ethpandaops.io</code> , available while the devnet is live.
              </p>
            </div>
            <Link
              href={`/upgrade/devnets/${activeDevnet.id}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:underline"
            >
              Full spec & client support matrix ({activeDevnet.id})
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {activeResources.map((res) => (
              <a
                key={res.key}
                href={res.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'group flex items-start justify-between gap-2 rounded-xl border bg-card/60 px-3.5 py-3 transition-colors hover:border-primary/50 hover:bg-card',
                  res.key === 'faucet'
                    ? 'border-primary/40 bg-primary/10 shadow-sm'
                    : 'border-border/70'
                )}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground transition-colors group-hover:text-primary">
                    {res.label}
                    {res.key === 'faucet' && (
                      <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                        Faucet
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {res.description}
                  </div>
                </div>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
              </a>
            ))}
          </div>
        </section>
      )}

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
                      <span className="ml-auto shrink-0 rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                        canceled
                      </span>
                    ) : (
                      <span className="ml-auto shrink-0 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-600 dark:text-red-400">
                        inactive
                      </span>
                    )}
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
