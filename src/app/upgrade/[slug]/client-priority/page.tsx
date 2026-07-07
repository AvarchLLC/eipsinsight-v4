import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import '@/lib/orpc.server';
import { cn } from '@/lib/utils';
import { buildMetadata } from '@/lib/seo';
import { getUpgradeRegistryEntry } from '@/data/upgrade-registry';
import { getCachedUpgrade, getCachedUpgradeComposition } from '@/lib/upgrade-data.server';
import { UpgradeDetailHeader } from '@/components/upgrade/upgrade-detail-header';
import glamsterdamPrioritization from '@/data/prioritization-glamsterdam.json';

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

interface ClientStance {
  clientName: string;
  clientType: 'EL' | 'CL';
  ratingSystem: string;
  rawRating: string;
  normalizedScore: number | null;
  comment?: string;
  sourceUrl?: string;
}

interface PrioritizationData {
  fork: string;
  lastUpdated: string;
  eips: Array<{ eipId: number; stances: ClientStance[] }>;
}

const PRIORITIZATION_BY_SLUG: Record<string, PrioritizationData> = {
  glamsterdam: glamsterdamPrioritization as unknown as PrioritizationData,
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const entry = getUpgradeRegistryEntry(slug);
  return buildMetadata({
    title: `${entry?.name ?? slug} — Client Priority`,
    description: `How EL and CL client teams rank candidate EIPs for the ${entry?.name ?? slug} upgrade.`,
    path: `/upgrade/${slug}/client-priority`,
  });
}

function scoreClass(score: number | null): string {
  if (score == null) return 'border-border bg-muted/40 text-muted-foreground/60';
  if (score >= 5) return 'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
  if (score >= 4) return 'border-teal-500/30 bg-teal-500/15 text-teal-700 dark:text-teal-300';
  if (score >= 3) return 'border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300';
  if (score >= 2) return 'border-orange-500/30 bg-orange-500/15 text-orange-700 dark:text-orange-300';
  return 'border-red-500/30 bg-red-500/15 text-red-700 dark:text-red-300';
}

export default async function ClientPriorityPage({ params }: Props) {
  const { slug } = await params;
  const data = PRIORITIZATION_BY_SLUG[slug];
  const upgrade = await getCachedUpgrade(slug);
  if (!upgrade || !data) notFound();
  const entry = getUpgradeRegistryEntry(slug);
  const composition = await getCachedUpgradeComposition(slug);
  const titleByEip = new Map(
    composition.map((eip) => [eip.eip_number, eip.curation?.layman_title || eip.title])
  );

  // Client columns, EL first then CL, in the order they first appear.
  const clients: Array<{ name: string; type: 'EL' | 'CL' }> = [];
  for (const eip of data.eips) {
    for (const stance of eip.stances) {
      if (!clients.some((client) => client.name === stance.clientName)) {
        clients.push({ name: stance.clientName, type: stance.clientType });
      }
    }
  }
  clients.sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));

  // Rows sorted by average normalized score (desc), unrated last.
  const rows = data.eips
    .map((eip) => {
      const scores = eip.stances
        .map((stance) => stance.normalizedScore)
        .filter((score): score is number => score != null);
      const average = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
      const stanceByClient = new Map(eip.stances.map((stance) => [stance.clientName, stance]));
      return { eipId: eip.eipId, average, stanceByClient };
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

      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 pb-12 pt-6 sm:px-6">
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          How client teams rank candidate EIPs, aggregated from their published tier lists
          and ACD statements. Ratings use each team&apos;s own system (tiers, support/oppose)
          normalized to a 1–5 scale — hover a cell for the source comment. Curated{' '}
          {data.lastUpdated}.
        </p>

        <div className="overflow-hidden rounded-xl border border-border bg-card/60">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/70 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="sticky left-0 bg-card px-3 py-2">EIP</th>
                  <th className="px-2 py-2 text-center">Avg</th>
                  {clients.map((client) => (
                    <th key={client.name} className="px-2 py-2 text-center">
                      <span
                        className={cn(
                          'whitespace-nowrap',
                          client.type === 'EL'
                            ? 'text-indigo-600 dark:text-indigo-300'
                            : 'text-teal-600 dark:text-teal-300'
                        )}
                      >
                        {client.name}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.eipId} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                    <td className="sticky left-0 max-w-64 bg-card px-3 py-2">
                      <Link
                        href={`/eip/${row.eipId}`}
                        className="font-mono text-xs font-semibold text-primary hover:underline"
                      >
                        EIP-{row.eipId}
                      </Link>
                      {titleByEip.get(row.eipId) && (
                        <span className="ml-2 hidden truncate text-xs text-muted-foreground xl:inline">
                          {titleByEip.get(row.eipId)}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-center text-xs font-semibold text-foreground">
                      {row.average != null ? row.average.toFixed(1) : '—'}
                    </td>
                    {clients.map((client) => {
                      const stance = row.stanceByClient.get(client.name);
                      return (
                        <td key={client.name} className="px-1.5 py-1.5 text-center">
                          {stance ? (
                            <a
                              href={stance.sourceUrl || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={
                                [stance.rawRating, stance.comment].filter(Boolean).join(' — ') +
                                ` (${stance.ratingSystem})`
                              }
                              className={cn(
                                'inline-flex min-w-9 justify-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold',
                                scoreClass(stance.normalizedScore)
                              )}
                            >
                              {stance.rawRating.length > 8
                                ? stance.rawRating.slice(0, 7) + '…'
                                : stance.rawRating}
                            </a>
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

        <p className="text-[11px] text-muted-foreground">
          Column colors: <span className="text-indigo-600 dark:text-indigo-300">EL clients</span> ·{' '}
          <span className="text-teal-600 dark:text-teal-300">CL clients</span>. Cell colors run
          red (opposed / low tier) → emerald (strong support / top tier).
        </p>
      </div>
    </div>
  );
}
