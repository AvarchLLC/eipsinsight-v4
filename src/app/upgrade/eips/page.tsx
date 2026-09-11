import Link from 'next/link';
import { ArrowLeft, ArrowRight, Zap } from 'lucide-react';
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
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 pb-12 pt-8 sm:px-6">
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
              Upgrade EIP Directory
            </h1>
          </div>
          <ShareButtons
            text="Upgrade EIP Directory: Every EIP included, scheduled, or considered across Ethereum's network upgrades on EIPsInsight"
            hashtags={['Ethereum', 'EIPs']}
            className="shrink-0"
          />
        </div>
        <p className="w-full text-sm leading-relaxed text-muted-foreground sm:text-base">
          Every EIP included, scheduled, or considered across Ethereum&apos;s network upgrades,
          from Frontier through the forks in progress, with the upgrade, year, and affected layer.
        </p>
      </header>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4 text-sm text-foreground shadow-xs">
        <div className="flex items-center gap-2.5">
          <Zap className="h-4 w-4 shrink-0 text-primary" />
          <span className="text-xs sm:text-sm font-medium text-muted-foreground">
            Want to learn more about Ethereum Network Upgrades, inclusion process, and devnet schedules?
          </span>
        </div>
        <Link
          href="/upgrade"
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary transition-all hover:bg-primary/20 hover:border-primary/40"
        >
          Explore Upgrade Hub
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

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

      <div className="pt-6 border-t border-border/60 flex items-center justify-between">
        <Link
          href="/upgrade"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Go back to main upgrades page
        </Link>
      </div>
    </div>
  );
}
