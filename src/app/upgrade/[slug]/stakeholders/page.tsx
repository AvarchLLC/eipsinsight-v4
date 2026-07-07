import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Users } from 'lucide-react';
import '@/lib/orpc.server';
import { buildMetadata } from '@/lib/seo';
import { getUpgradeRegistryEntry } from '@/data/upgrade-registry';
import { getCachedUpgrade, getCachedUpgradeComposition } from '@/lib/upgrade-data.server';
import { UpgradeDetailHeader } from '@/components/upgrade/upgrade-detail-header';
import { StageBadge } from '@/components/upgrade/stage-badge';

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const entry = getUpgradeRegistryEntry(slug);
  return buildMetadata({
    title: `${entry?.name ?? slug} — Stakeholders`,
    description: `How the ${entry?.name ?? slug} upgrade affects end users, app developers, wallets, Layer 2s, stakers, and client teams.`,
    path: `/upgrade/${slug}/stakeholders`,
  });
}

const STAKEHOLDER_GROUPS: Array<{ key: string; label: string; blurb: string }> = [
  { key: 'endUsers', label: 'End users', blurb: 'People sending transactions and using apps.' },
  { key: 'appDevs', label: 'App developers', blurb: 'Teams building smart contracts and dapps.' },
  { key: 'walletDevs', label: 'Wallet developers', blurb: 'Wallet and account tooling teams.' },
  { key: 'toolingInfra', label: 'Tooling & infrastructure', blurb: 'Explorers, indexers, RPC providers.' },
  { key: 'layer2s', label: 'Layer 2s', blurb: 'Rollups and other scaling systems.' },
  { key: 'stakersNodes', label: 'Stakers & node operators', blurb: 'Validators and everyone running nodes.' },
  { key: 'elClients', label: 'Execution layer clients', blurb: 'Geth, Besu, Nethermind, Reth, Erigon…' },
  { key: 'clClients', label: 'Consensus layer clients', blurb: 'Lighthouse, Prysm, Teku, Nimbus, Lodestar…' },
];

export default async function StakeholdersPage({ params }: Props) {
  const { slug } = await params;
  const upgrade = await getCachedUpgrade(slug);
  if (!upgrade) notFound();
  const entry = getUpgradeRegistryEntry(slug);
  const composition = await getCachedUpgradeComposition(slug);

  // Only non-declined EIPs with curated stakeholder impacts.
  const relevant = composition.filter(
    (eip) => eip.bucket && eip.bucket !== 'declined' && eip.curation?.stakeholder_impacts
  );

  const groups = STAKEHOLDER_GROUPS.map((group) => ({
    ...group,
    entries: relevant
      .map((eip) => ({
        eip,
        description: eip.curation?.stakeholder_impacts?.[group.key]?.description,
      }))
      .filter((item): item is typeof item & { description: string } => Boolean(item.description)),
  })).filter((group) => group.entries.length > 0);

  return (
    <div className="bg-background relative min-h-screen w-full">
      <UpgradeDetailHeader
        slug={slug}
        name={upgrade.name || entry?.name || slug}
        metaEip={upgrade.meta_eip}
        entry={entry}
        activeTab="stakeholders"
      />

      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 pb-12 pt-6 sm:px-6">
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          What this upgrade means for each part of the ecosystem, aggregated from the
          plain-language analysis of every EIP currently in scope.
        </p>

        {groups.length === 0 && (
          <p className="rounded-xl border border-border bg-card/60 px-4 py-6 text-sm text-muted-foreground">
            No stakeholder analysis curated yet for this upgrade&apos;s EIPs.
          </p>
        )}

        {groups.map((group) => (
          <section key={group.key} id={group.key} className="scroll-mt-24">
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground">
                {group.label}
              </h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                {group.entries.length}
              </span>
              <span className="hidden text-xs text-muted-foreground sm:inline">{group.blurb}</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {group.entries.map(({ eip, description }) => (
                <div
                  key={eip.eip_number}
                  className="rounded-xl border border-border bg-card/60 p-4 transition-colors hover:border-primary/40"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/eip/${eip.eip_number}`}
                      className="font-mono text-xs font-semibold text-primary hover:underline"
                    >
                      EIP-{eip.eip_number}
                    </Link>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                      {eip.curation?.layman_title || eip.title}
                    </span>
                    <StageBadge bucket={eip.bucket} abbreviated />
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
