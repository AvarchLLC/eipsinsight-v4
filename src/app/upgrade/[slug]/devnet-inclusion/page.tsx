import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import '@/lib/orpc.server';
import { buildMetadata } from '@/lib/seo';
import { getUpgradeRegistryEntry } from '@/data/upgrade-registry';
import {
  getCachedDevnetMatrix,
  getCachedUpgrade,
  getCachedUpgradeComposition,
} from '@/lib/upgrade-data.server';
import { UpgradeDetailHeader } from '@/components/upgrade/upgrade-detail-header';
import {
  DevnetInclusionMatrix,
  type DevnetColumn,
  type DevnetEipRow,
} from '@/components/upgrade/devnet-inclusion-matrix';

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const entry = getUpgradeRegistryEntry(slug);
  return buildMetadata({
    title: `${entry?.name ?? slug} - Devnet Inclusion`,
    description: `Which EIPs are included in each ${entry?.name ?? slug} devnet, tracked from ethpandaops specs.`,
    path: `/upgrade/${slug}/devnet-inclusion`,
  });
}

/** "bal" -> "BAL", "fusaka" -> "Fusaka" — a readable devnet-series label. */
function seriesLabel(series: string): string {
  return series.length <= 3 ? series.toUpperCase() : series.charAt(0).toUpperCase() + series.slice(1);
}

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

  // Columns: devnets sorted with active/live & newest devnets FIRST, retired/canceled LAST.
  const devnets = matrix
    .filter((devnet) => devnet.eips.length > 0)
    .sort((a, b) => {
      // 1. Active/live devnets first
      if (a.active !== b.active) return a.active ? -1 : 1;
      // 2. Non-canceled before canceled/retired
      if (a.canceled !== b.canceled) return a.canceled ? 1 : -1;
      // 3. Primary upgrade series first (e.g. glamsterdam devnets on glamsterdam upgrade page)
      const aIsPrimary = a.series === slug;
      const bIsPrimary = b.series === slug;
      if (aIsPrimary !== bIsPrimary) return aIsPrimary ? -1 : 1;
      // 4. Higher devnet number first (e.g. devnet-8 before devnet-7)
      const numA = a.devnet_number ?? 0;
      const numB = b.devnet_number ?? 0;
      if (numA !== numB) return numB - numA;
      return a.series.localeCompare(b.series);
    });

  const columns: DevnetColumn[] = devnets.map((devnet) => ({
    id: devnet.id,
    series: devnet.series,
    devnet_number: devnet.devnet_number,
    active: devnet.active,
    canceled: devnet.canceled,
    label:
      devnet.series === slug
        ? `Devnet ${devnet.devnet_number}`
        : `${seriesLabel(devnet.series)} ${devnet.devnet_number}`,
  }));

  // Rows: every EIP seen in any devnet, enriched with composition metadata
  // (stage, layer, status, title) where available.
  const metaByEip = new Map(composition.map((eip) => [eip.eip_number, eip]));
  const allEipNumbers = Array.from(
    new Set(devnets.flatMap((devnet) => devnet.eips.map((eip) => eip.number)))
  ).sort((a, b) => a - b);

  const rows: DevnetEipRow[] = allEipNumbers.map((eipNumber) => {
    const meta = metaByEip.get(eipNumber);
    const inclusion: Record<string, string> = {};
    for (const devnet of devnets) {
      const hit = devnet.eips.find((e) => e.number === eipNumber);
      if (hit) inclusion[devnet.id] = hit.status ?? 'included';
    }
    return {
      eip_number: eipNumber,
      title: meta?.title ?? '',
      layman_title: meta?.curation?.layman_title ?? null,
      bucket: meta?.bucket ?? null,
      layer: meta?.curation?.layer ?? null,
      status: meta?.status ?? null,
      inclusion,
    };
  });

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
        <p className="w-full text-sm leading-relaxed text-muted-foreground">
          Which EIPs each devnet actually ships - scraped from the ethpandaops spec pages. Each
          column is a devnet (newest first); colored marks show how the EIP appears in that
          devnet. Filter by layer, inclusion stage, or narrow to live devnets.
        </p>

        {columns.length === 0 ? (
          <p className="rounded-xl border border-border bg-card/60 px-4 py-6 text-sm text-muted-foreground">
            No devnet specs with EIP data synced yet for this upgrade.
          </p>
        ) : (
          <DevnetInclusionMatrix columns={columns} rows={rows} />
        )}
      </div>
    </div>
  );
}
