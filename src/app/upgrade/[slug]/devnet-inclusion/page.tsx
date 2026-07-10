import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check } from 'lucide-react';
import '@/lib/orpc.server';
import { cn } from '@/lib/utils';
import { buildMetadata } from '@/lib/seo';
import { getUpgradeRegistryEntry } from '@/data/upgrade-registry';
import {
  getCachedDevnetMatrix,
  getCachedUpgrade,
  getCachedUpgradeComposition,
} from '@/lib/upgrade-data.server';
import { UpgradeDetailHeader } from '@/components/upgrade/upgrade-detail-header';

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const entry = getUpgradeRegistryEntry(slug);
  return buildMetadata({
    title: `${entry?.name ?? slug} — Devnet Inclusion`,
    description: `Which EIPs are included in each ${entry?.name ?? slug} devnet, tracked from ethpandaops specs.`,
    path: `/upgrade/${slug}/devnet-inclusion`,
  });
}

const CELL_STATUS_CLASS: Record<string, string> = {
  new: 'text-blue-500',
  new_optional: 'text-blue-400',
  updated: 'text-amber-500',
  required: 'text-red-400',
  optional: 'text-muted-foreground',
};

export default async function DevnetInclusionPage({ params }: Props) {
  const { slug } = await params;
  const upgrade = await getCachedUpgrade(slug);
  if (!upgrade) notFound();
  const entry = getUpgradeRegistryEntry(slug);
  const series = entry?.devnetSeries ?? [];

  const [composition, matrix] = await Promise.all([
    getCachedUpgradeComposition(slug),
    series.length > 0 ? getCachedDevnetMatrix(series) : Promise.resolve([]),
  ]);

  // Columns: devnets with any EIP data, most recent first, capped.
  const devnets = matrix
    .filter((devnet) => devnet.eips.length > 0)
    .sort(
      (a, b) =>
        a.series.localeCompare(b.series) || (b.devnet_number ?? 0) - (a.devnet_number ?? 0)
    )
    .slice(0, 12);

  // Rows: every EIP seen in any devnet, plus title/layman info if in composition.
  const titleByEip = new Map(
    composition.map((eip) => [eip.eip_number, eip.curation?.layman_title || eip.title])
  );
  const allEipNumbers = Array.from(
    new Set(devnets.flatMap((devnet) => devnet.eips.map((eip) => eip.number)))
  ).sort((a, b) => a - b);

  const inclusionByDevnet = new Map(
    devnets.map((devnet) => [
      devnet.id,
      new Map(devnet.eips.map((eip) => [eip.number, eip.status ?? 'included'])),
    ])
  );

  return (
    <div className="bg-background relative min-h-screen w-full">
      <UpgradeDetailHeader
        slug={slug}
        name={upgrade.name || entry?.name || slug}
        metaEip={upgrade.meta_eip}
        entry={entry}
        activeTab="devnet-inclusion"
      />

      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 pb-12 pt-6 sm:px-6">
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Which EIPs each devnet actually ships — scraped from the ethpandaops spec pages.
          Colored marks show the EIP&apos;s status in that devnet (new, updated, required,
          optional).
        </p>

        {devnets.length === 0 ? (
          <p className="rounded-xl border border-border bg-card/60 px-4 py-6 text-sm text-muted-foreground">
            No devnet specs with EIP data synced yet for this upgrade.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card/60">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/70 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="sticky left-0 bg-card px-3 py-2">EIP</th>
                    {devnets.map((devnet) => (
                      <th key={devnet.id} className="px-2 py-2 text-center">
                        <Link
                          href={`/upgrade/devnets/${devnet.id}`}
                          className={cn(
                            'whitespace-nowrap hover:text-primary',
                            devnet.active && 'text-emerald-500'
                          )}
                          title={devnet.active ? `${devnet.id} (live)` : devnet.id}
                        >
                          {devnet.series === slug
                            ? `D${devnet.devnet_number}`
                            : `${devnet.series}-${devnet.devnet_number}`}
                        </Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allEipNumbers.map((eipNumber) => (
                    <tr key={eipNumber} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                      <td className="sticky left-0 max-w-64 bg-card px-3 py-2">
                        <Link
                          href={`/eip/${eipNumber}`}
                          className="font-mono text-xs font-semibold text-primary hover:underline"
                        >
                          EIP-{eipNumber}
                        </Link>
                        {titleByEip.get(eipNumber) && (
                          <span className="ml-2 hidden truncate text-xs text-muted-foreground lg:inline">
                            {titleByEip.get(eipNumber)}
                          </span>
                        )}
                      </td>
                      {devnets.map((devnet) => {
                        const status = inclusionByDevnet.get(devnet.id)?.get(eipNumber);
                        return (
                          <td key={devnet.id} className="px-2 py-2 text-center">
                            {status ? (
                              <Check
                                className={cn(
                                  'mx-auto h-3.5 w-3.5',
                                  CELL_STATUS_CLASS[status] ?? 'text-emerald-500'
                                )}
                                aria-label={status}
                              />
                            ) : (
                              <span className="text-muted-foreground/30">·</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground">
          Legend: <Check className="inline h-3 w-3 text-emerald-500" /> included ·{' '}
          <Check className="inline h-3 w-3 text-blue-500" /> new ·{' '}
          <Check className="inline h-3 w-3 text-amber-500" /> updated ·{' '}
          <Check className="inline h-3 w-3 text-red-400" /> required · green column header =
          live devnet.
        </p>
      </div>
    </div>
  );
}
