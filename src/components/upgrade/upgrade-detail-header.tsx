import Link from 'next/link';
import { ArrowLeft, Box, CalendarDays, FileText, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UpgradeRegistryEntry } from '@/data/upgrade-registry';
import { getCurrentPhase } from '@/data/fork-schedule';
import { PhaseBadge, UpgradeStatusBadge } from '@/components/upgrade/stage-badge';
import { UpgradeTimelineStrip } from '@/components/upgrade/upgrade-timeline-strip';

export type UpgradeSubtab =
  | 'overview'
  | 'stakeholders'
  | 'client-priority'
  | 'devnet-inclusion'
  | 'test-complexity';

/** Which subtabs exist for a fork (beyond Overview). */
export function subtabsFor(slug: string, entry: UpgradeRegistryEntry | null) {
  if (!entry || entry.status === 'Live') return [];
  const tabs: Array<{ id: UpgradeSubtab; label: string; href: string }> = [
    { id: 'stakeholders', label: 'Stakeholders', href: `/upgrade/${slug}/stakeholders` },
  ];
  if (slug === 'glamsterdam') {
    tabs.push({
      id: 'client-priority',
      label: 'Client priority',
      href: `/upgrade/${slug}/client-priority`,
    });
  }
  if (entry.devnetSeries?.length) {
    tabs.push({
      id: 'devnet-inclusion',
      label: 'Devnet inclusion',
      href: `/upgrade/${slug}/devnet-inclusion`,
    });
  }
  tabs.push({
    id: 'test-complexity',
    label: 'Test complexity',
    href: `/upgrade/${slug}/test-complexity`,
  });
  return tabs;
}

/**
 * Shared header for the upgrade detail page and its subtab routes:
 * back link, title + badges, meta facts, timeline strip, and the subtab bar.
 */
export function UpgradeDetailHeader({
  slug,
  name,
  metaEip,
  entry,
  activeTab,
}: {
  slug: string;
  name: string;
  metaEip: number | null;
  entry: UpgradeRegistryEntry | null;
  activeTab: UpgradeSubtab;
}) {
  const subtabs = subtabsFor(slug, entry);
  const phase =
    entry && entry.status !== 'Live'
      ? getCurrentPhase(slug, new Date().toISOString().slice(0, 10))
      : null;

  return (
    <div className="relative w-full border-b border-border/60 bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6 sm:pt-8">
        <Link
          href="/upgrade"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All upgrades
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="dec-title persona-title text-balance text-3xl font-semibold tracking-tight leading-[1.1] sm:text-4xl">
            {name}
          </h1>
          {phase ? (
            <PhaseBadge phaseId={phase.id} label={phase.label} />
          ) : (
            entry && <UpgradeStatusBadge status={entry.status} />
          )}
          {phase && (
            <span className="text-xs font-medium text-muted-foreground">
              Target: {phase.targetYear}
            </span>
          )}
        </div>

        {entry?.tagline && (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {entry.tagline}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
          {metaEip && (
            <Link
              href={`/eip/${metaEip}`}
              className="inline-flex items-center gap-1 text-primary transition-colors hover:text-primary/80"
            >
              <FileText className="h-3.5 w-3.5" />
              Meta EIP-{metaEip}
            </Link>
          )}
          {entry?.activationDate && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              Activated {entry.activationDate}
            </span>
          )}
          {typeof entry?.activationBlock === 'number' && (
            <span className="inline-flex items-center gap-1">
              <Box className="h-3.5 w-3.5" />
              Block {entry.activationBlock.toLocaleString()}
            </span>
          )}
          {entry?.executionName && entry?.consensusName && (
            <span className="inline-flex items-center gap-1">
              <Layers className="h-3.5 w-3.5" />
              {entry.executionName} (EL) + {entry.consensusName} (CL)
            </span>
          )}
        </div>

        <div className="mt-5 hidden sm:block">
          <UpgradeTimelineStrip currentSlug={slug} />
        </div>

        {/* Subtab bar */}
        {subtabs.length > 0 && (
          <nav className="-mb-px mt-4 flex gap-1 overflow-x-auto">
            {[{ id: 'overview' as const, label: 'Overview', href: `/upgrade/${slug}` }, ...subtabs].map(
              (tab) => (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className={cn(
                    'whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                  )}
                >
                  {tab.label}
                </Link>
              )
            )}
          </nav>
        )}
        {subtabs.length === 0 && <div className="pb-5" />}
      </div>
    </div>
  );
}
