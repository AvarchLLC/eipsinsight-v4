import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import '@/lib/orpc.server';
import { buildMetadata } from '@/lib/seo';
import { getUpgradeRegistryEntry } from '@/data/upgrade-registry';
import { getCachedUpgrade, getCachedUpgradeComposition } from '@/lib/upgrade-data.server';
import { UpgradeDetailHeader } from '@/components/upgrade/upgrade-detail-header';
import { STAKEHOLDER_GROUPS, type StakeholderKey } from '@/lib/stakeholders';
import {
  StakeholdersMatrix,
  type StakeholderEip,
} from '@/components/upgrade/stakeholders-matrix';

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const entry = getUpgradeRegistryEntry(slug);
  return buildMetadata({
    title: `${entry?.name ?? slug} - Stakeholders`,
    description: `How the ${entry?.name ?? slug} upgrade affects end users, app developers, wallets, Layer 2s, stakers, and client teams.`,
    path: `/upgrade/${slug}/stakeholders`,
  });
}

export default async function StakeholdersPage({ params }: Props) {
  const { slug } = await params;
  const upgrade = await getCachedUpgrade(slug);
  if (!upgrade) notFound();
  const entry = getUpgradeRegistryEntry(slug);
  const composition = await getCachedUpgradeComposition(slug);

  // One row per EIP (non-declined, with curated impacts) — no repetition.
  const eips: StakeholderEip[] = composition
    .filter((eip) => eip.bucket && eip.bucket !== 'declined' && eip.curation?.stakeholder_impacts)
    .map((eip) => {
      const impacts: Partial<Record<StakeholderKey, string>> = {};
      for (const group of STAKEHOLDER_GROUPS) {
        const description = eip.curation?.stakeholder_impacts?.[group.key]?.description?.trim();
        if (description) impacts[group.key] = description;
      }
      return {
        eip_number: eip.eip_number,
        title: eip.curation?.layman_title || eip.title || `EIP-${eip.eip_number}`,
        bucket: eip.bucket,
        impacts,
      };
    })
    .filter((eip) => Object.keys(eip.impacts).length > 0)
    .sort((a, b) => Object.keys(b.impacts).length - Object.keys(a.impacts).length);

  return (
    <div className="bg-background relative min-h-screen w-full">
      <UpgradeDetailHeader
        slug={slug}
        name={upgrade.name || entry?.name || slug}
        metaEip={upgrade.meta_eip}
        entry={entry}
        activeTab="stakeholders"
      />

      <div className="mx-auto w-full max-w-6xl space-y-5 px-4 pb-12 pt-6 sm:px-6">
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Who each in-scope EIP affects, and how. Every proposal appears once - scan the grid
          for the big picture, click a row for the full breakdown, or focus a single group.
        </p>

        {eips.length === 0 ? (
          <p className="rounded-xl border border-border bg-card/60 px-4 py-6 text-sm text-muted-foreground">
            No stakeholder analysis curated yet for this upgrade&apos;s EIPs.
          </p>
        ) : (
          <StakeholdersMatrix eips={eips} />
        )}
      </div>
    </div>
  );
}
