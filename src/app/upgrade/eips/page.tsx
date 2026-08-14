import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ShareButtons } from '@/components/share-buttons';
import { getCachedUpgradeList, getCachedUpgradeEips } from '@/lib/upgrade-data.server';
import { UpgradeEipDirectory } from '@/components/upgrade/upgrade-eip-directory';
import type { UpgradeBucket } from '@/lib/upgrade-stages';
import { Suspense } from 'react';

export const revalidate = 300;

export default async function UpgradeEipsPage() {
  const [upgrades, eips] = await Promise.all([
    getCachedUpgradeList(),
    getCachedUpgradeEips(),
  ]);

  const formattedEips = eips.map((e) => ({
    ...e,
    bucket: e.bucket as UpgradeBucket,
  }));

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 pb-12 pt-8 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Link
            href="/upgrade"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Go back to main upgrades page
          </Link>
          <h1 className="dec-title persona-title text-balance text-3xl font-semibold tracking-tight leading-[1.1] sm:text-4xl">
            Upgrade EIP Directory
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Every EIP included, scheduled, or considered across Ethereum&apos;s network upgrades,
            from Frontier through the forks in progress, with the upgrade, year, and affected layer.
          </p>
        </div>
        <ShareButtons
          text="Upgrade EIP Directory: Every EIP included, scheduled, or considered across Ethereum's network upgrades on EIPsInsight"
          hashtags={['Ethereum', 'EIPs']}
          className="shrink-0"
        />
      </header>
      <hr className="border-border/60" />

      <Suspense fallback={<div className="text-center py-12 text-muted-foreground">Loading EIP directory...</div>}>
        <UpgradeEipDirectory
          initialEips={formattedEips}
          upgrades={upgrades.map((u) => ({
            name: u.name,
            slug: u.slug,
          }))}
        />
      </Suspense>
    </div>
  );
}
