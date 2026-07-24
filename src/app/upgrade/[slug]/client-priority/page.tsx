import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import '@/lib/orpc.server';
import { buildMetadata } from '@/lib/seo';
import { getUpgradeRegistryEntry } from '@/data/upgrade-registry';
import {
  getCachedClientPriority,
  getCachedDevnetMatrix,
  getCachedUpgrade,
  getCachedUpgradeComposition,
} from '@/lib/upgrade-data.server';
import { UpgradeDetailHeader } from '@/components/upgrade/upgrade-detail-header';
import {
  ClientPriorityView,
  type ClientPriorityEip,
} from '@/components/upgrade/client-priority-view';
import type { UpgradeBucket } from '@/lib/upgrade-stages';

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const entry = getUpgradeRegistryEntry(slug);
  return buildMetadata({
    title: `${entry?.name ?? slug} - Client Priority`,
    description: `How EL and CL client teams rank candidate EIPs for the ${entry?.name ?? slug} upgrade.`,
    path: `/upgrade/${slug}/client-priority`,
  });
}

export default async function ClientPriorityPage({ params }: Props) {
  const { slug } = await params;
  const [data, upgrade] = await Promise.all([
    getCachedClientPriority(slug),
    getCachedUpgrade(slug),
  ]);
  if (!upgrade || !data || data.eips.length === 0) notFound();
  const entry = getUpgradeRegistryEntry(slug);
  const [composition, devnetMatrix] = await Promise.all([
    getCachedUpgradeComposition(slug),
    entry?.devnetSeries?.length ? getCachedDevnetMatrix(entry.devnetSeries) : Promise.resolve([]),
  ]);
  const titleByEip = new Map(
    composition.map((eip) => [eip.eip_number, eip.curation?.layman_title || eip.title])
  );

  // Genuinely-ours readiness signal: how many devnets each EIP has shipped in,
  // straight from the ethpandaops spec scrape (not the seeded ratings).
  const devnetCountByEip = new Map<number, number>();
  for (const devnet of devnetMatrix) {
    for (const eip of devnet.eips) {
      devnetCountByEip.set(eip.number, (devnetCountByEip.get(eip.number) ?? 0) + 1);
    }
  }
  const hasDevnetData = devnetCountByEip.size > 0;
  const bucketByEip = new Map(composition.map((eip) => [eip.eip_number, eip.bucket]));

  // One entry per EIP, sorted by overall team support (desc).
  const eips: ClientPriorityEip[] = data.eips
    .map((eip) => {
      const scores = eip.stances
        .map((stance) => stance.normalizedScore)
        .filter((score): score is number => score != null);
      const average = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
      return {
        eipId: eip.eipId,
        title: titleByEip.get(eip.eipId) || `EIP-${eip.eipId}`,
        bucket: (bucketByEip.get(eip.eipId) ?? null) as UpgradeBucket | null,
        average,
        devnetCount: devnetCountByEip.get(eip.eipId) ?? 0,
        stances: eip.stances,
      };
    })
    .sort((a, b) => (b.average ?? -1) - (a.average ?? -1));

  return (
    <div className="bg-background relative min-h-screen w-full">
      <UpgradeDetailHeader
        slug={slug}
        name={upgrade.name || entry?.name || slug}
        metaEip={upgrade.meta_eip}
        entry={entry}
        activeTab="client-priority"
      />

      <div className="mx-auto w-full max-w-6xl space-y-5 px-4 pb-12 pt-6 sm:px-6">
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Where each candidate EIP stands with client teams - sorted by overall support, so
          what&apos;s likely in floats to the top. Each team&apos;s own rating (tiers,
          support/oppose) is normalized to a 1–5 scale; the{' '}
          <span className="font-medium text-emerald-700 dark:text-emerald-300">devnet</span>{' '}
          badge is a live readiness signal from our own spec tracking. Ratings last curated{' '}
          {data.lastUpdated}.
        </p>

        <ClientPriorityView eips={eips} hasDevnetData={hasDevnetData} />
      </div>
    </div>
  );
}
