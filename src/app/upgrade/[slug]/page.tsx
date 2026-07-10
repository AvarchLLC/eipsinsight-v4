import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import '@/lib/orpc.server';
import { buildMetadata } from '@/lib/seo';
import { getUpgradeRegistryEntry } from '@/data/upgrade-registry';
import { getUpgradeTimelineData } from '@/data/upgrade-timelines';
import { eipTitles } from '@/data/network-upgrades';
import type { UpgradeBucket } from '@/lib/upgrade-stages';
import {
  getCachedUpgrade,
  getCachedUpgradeComposition,
  getCachedUpgradeEvents,
  getCachedUpgradeTimeline,
} from '@/lib/upgrade-data.server';
import { UpgradeDetailHeader } from '@/components/upgrade/upgrade-detail-header';
import { UpgradeDetailBody } from '@/components/upgrade/upgrade-detail-body';
import type {
  UpgradeCompositionEip,
  UpgradeTimelinePoint,
} from '@/components/upgrade/types';

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const entry = getUpgradeRegistryEntry(slug);
  const title = entry?.name ?? slug.split('-').filter(Boolean).map((part) => part[0]?.toUpperCase() + part.slice(1)).join(' ');

  return buildMetadata({
    title: `${title} Upgrade`,
    description:
      entry?.tagline ??
      'Track upgrade composition, timeline updates, and implementation progress for this Ethereum network upgrade.',
    path: `/upgrade/${slug}`,
    keywords: ['Ethereum upgrade', 'fork composition', 'EIP inclusion'],
  });
}

/**
 * Pectra/Fusaka predate the scheduler's composition tracking; their final
 * state lives in the curated static timelines. Build a composition list from
 * the last timeline entry when the DB has none.
 */
function compositionFromStaticTimeline(slug: string): {
  composition: UpgradeCompositionEip[];
  timeline: UpgradeTimelinePoint[];
} | null {
  const staticTimeline = getUpgradeTimelineData(slug);
  if (!staticTimeline || staticTimeline.length === 0) return null;

  const lastEntry = staticTimeline[staticTimeline.length - 1];
  const bucketMap = new Map<number, UpgradeBucket>();
  const collect = (values: string[], bucket: UpgradeBucket) => {
    for (const value of values) {
      const eipNumber = Number.parseInt(value.replace('EIP-', ''), 10);
      if (Number.isFinite(eipNumber) && !bucketMap.has(eipNumber)) {
        bucketMap.set(eipNumber, bucket);
      }
    }
  };
  collect(lastEntry.included, 'included');
  collect(lastEntry.scheduled, 'scheduled');
  collect(lastEntry.declined, 'declined');
  collect(lastEntry.considered, 'considered');
  collect(lastEntry.proposed, 'proposed');

  const composition: UpgradeCompositionEip[] = Array.from(bucketMap.entries()).map(
    ([eipNumber, bucket]) => ({
      eip_number: eipNumber,
      bucket,
      title: eipTitles[String(eipNumber)]?.title ?? `EIP-${eipNumber}`,
      status: null,
      category: eipTitles[String(eipNumber)]?.category ?? null,
      author: null,
      created_at: null,
      updated_at: null,
      curation: null,
    })
  );

  const timeline: UpgradeTimelinePoint[] = staticTimeline.map((point) => ({
    date: point.date,
    included: point.included.map((value) => value.replace('EIP-', '')),
    scheduled: point.scheduled.map((value) => value.replace('EIP-', '')),
    declined: point.declined.map((value) => value.replace('EIP-', '')),
    considered: point.considered.map((value) => value.replace('EIP-', '')),
    proposed: point.proposed.map((value) => value.replace('EIP-', '')),
  }));

  return { composition, timeline };
}

export default async function UpgradeDetailPage({ params }: Props) {
  const { slug } = await params;
  const upgrade = await getCachedUpgrade(slug);
  if (!upgrade) notFound();

  const entry = getUpgradeRegistryEntry(slug);

  const [dbComposition, events, dbTimeline] = await Promise.all([
    getCachedUpgradeComposition(slug),
    getCachedUpgradeEvents(slug, 50),
    getCachedUpgradeTimeline(slug),
  ]);
  let composition = dbComposition;
  let timeline = dbTimeline;

  // Curations are attached to DB composition rows; static fallback covers
  // upgrades tracked before the scheduler pipeline existed.
  if (composition.length === 0) {
    const staticData = compositionFromStaticTimeline(slug);
    if (staticData) {
      composition = staticData.composition;
      if (timeline.length <= 1) timeline = staticData.timeline;
    }
  }

  return (
    <div className="bg-background relative min-h-screen w-full">
      <UpgradeDetailHeader
        slug={slug}
        name={upgrade.name || entry?.name || slug}
        metaEip={upgrade.meta_eip}
        entry={entry}
        activeTab="overview"
      />

      <UpgradeDetailBody
        slug={slug}
        name={upgrade.name || entry?.name || slug}
        entry={entry}
        composition={composition}
        events={events}
        timelineData={timeline}
      />
    </div>
  );
}
