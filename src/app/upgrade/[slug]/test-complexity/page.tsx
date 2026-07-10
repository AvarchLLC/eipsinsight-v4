import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import '@/lib/orpc.server';
import { cn } from '@/lib/utils';
import { buildMetadata } from '@/lib/seo';
import { getUpgradeRegistryEntry } from '@/data/upgrade-registry';
import {
  getCachedSteelComplexity,
  getCachedUpgrade,
  getCachedUpgradeComposition,
} from '@/lib/upgrade-data.server';
import { UpgradeDetailHeader } from '@/components/upgrade/upgrade-detail-header';
import { StageBadge } from '@/components/upgrade/stage-badge';

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const entry = getUpgradeRegistryEntry(slug);
  return buildMetadata({
    title: `${entry?.name ?? slug} — Test Complexity`,
    description: `STEEL testing-complexity assessments for EIPs in the ${entry?.name ?? slug} upgrade.`,
    path: `/upgrade/${slug}/test-complexity`,
  });
}

const TIER_CHIP: Record<string, string> = {
  Low: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  Medium: 'border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300',
  High: 'border-red-500/30 bg-red-500/15 text-red-700 dark:text-red-300',
};

export default async function TestComplexityPage({ params }: Props) {
  const { slug } = await params;
  const upgrade = await getCachedUpgrade(slug);
  if (!upgrade) notFound();
  const entry = getUpgradeRegistryEntry(slug);

  const [composition, assessments] = await Promise.all([
    getCachedUpgradeComposition(slug),
    getCachedSteelComplexity(),
  ]);

  const assessmentByEip = new Map(assessments.map((item) => [item.eip, item]));
  const rows = composition
    .filter((eip) => eip.bucket && eip.bucket !== 'declined')
    .map((eip) => ({ eip, assessment: assessmentByEip.get(eip.eip_number) ?? null }))
    .sort((a, b) => (b.assessment?.total ?? -1) - (a.assessment?.total ?? -1));

  const assessedCount = rows.filter((row) => row.assessment).length;

  return (
    <div className="bg-background relative min-h-screen w-full">
      <UpgradeDetailHeader
        slug={slug}
        name={upgrade.name || entry?.name || slug}
        metaEip={upgrade.meta_eip}
        entry={entry}
        activeTab="test-complexity"
      />

      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 pb-12 pt-6 sm:px-6">
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          How hard each EIP is to test, from the{' '}
          <a
            href="https://github.com/ethsteel/pm"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            STEEL team&apos;s
          </a>{' '}
          published complexity assessments ({assessedCount} of {rows.length} EIPs assessed —
          scores sum ~24 testing anchors; &lt;10 Low, 10–19 Medium, ≥20 High).
        </p>

        <div className="overflow-hidden rounded-xl border border-border bg-card/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/70 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2">EIP</th>
                <th className="hidden px-3 py-2 md:table-cell">Stage</th>
                <th className="px-3 py-2 text-center">Complexity</th>
                <th className="px-3 py-2 text-center">Score</th>
                <th className="px-3 py-2 text-right">Assessment</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ eip, assessment }) => (
                <tr key={eip.eip_number} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                  <td className="max-w-72 px-3 py-2.5">
                    <Link
                      href={`/eip/${eip.eip_number}`}
                      className="font-mono text-xs font-semibold text-primary hover:underline"
                    >
                      EIP-{eip.eip_number}
                    </Link>
                    <span className="ml-2 hidden truncate text-xs text-muted-foreground sm:inline">
                      {eip.curation?.layman_title || eip.title}
                    </span>
                  </td>
                  <td className="hidden px-3 py-2.5 md:table-cell">
                    <StageBadge bucket={eip.bucket} abbreviated />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {assessment?.tier ? (
                      <span
                        className={cn(
                          'inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                          TIER_CHIP[assessment.tier]
                        )}
                      >
                        {assessment.tier}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">not assessed</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono text-xs text-foreground">
                    {assessment?.total ?? '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {assessment && (
                      <a
                        href={assessment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        STEEL
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
