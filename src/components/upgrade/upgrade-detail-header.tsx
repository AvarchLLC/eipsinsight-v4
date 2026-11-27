import Link from 'next/link';
import { ArrowLeft, Box, CalendarDays, FileText, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UpgradeRegistryEntry } from '@/data/upgrade-registry';
import { getCurrentPhase } from '@/data/fork-schedule';
import { PhaseBadge, UpgradeStatusBadge } from '@/components/upgrade/stage-badge';
import { UpgradeTimelineStrip } from '@/components/upgrade/upgrade-timeline-strip';
import { UpgradeCountdown } from '@/components/upgrade/upgrade-countdown';

function renderNameWithHighlight(fullStr: string, highlight: string) {
  const index = fullStr.toLowerCase().indexOf(highlight.toLowerCase());
  if (index === -1) return <strong className="font-bold text-foreground">{fullStr}</strong>;

  const before = fullStr.slice(0, index);
  const match = fullStr.slice(index, index + highlight.length);
  const after = fullStr.slice(index + highlight.length);

  return (
    <span className="font-medium text-foreground">
      {before}
      <strong className="font-bold text-primary underline decoration-primary/50 underline-offset-2">{match}</strong>
      {after}
    </span>
  );
}

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
    <div className="masthead relative w-full border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6 sm:pt-8">
        <Link
          href="/upgrade"
          className="inline-flex items-center gap-1.5 font-mono text-xs text-[var(--ink-muted)] transition-colors hover:text-[var(--brand-strong)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All upgrades
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="t-h1 text-balance text-3xl sm:text-4xl text-[var(--ink)]">
            {name}
          </h1>
          {phase ? (
            <PhaseBadge phaseId={phase.id} label={phase.label} />
          ) : (
            entry && <UpgradeStatusBadge status={entry.status} />
          )}
          {phase && (
            <span className="font-mono text-xs text-[var(--ink-muted)]">
              Target: {phase.targetYear}
            </span>
          )}
        </div>

        {entry?.tagline && (
          <p className="t-lead mt-2 max-w-4xl">
            {entry.tagline}
          </p>
        )}

        <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs text-[var(--ink-muted)]">
          {metaEip && (
            <Link
              href={`/eip/${metaEip}`}
              className="chip"
            >
              <FileText className="h-3.5 w-3.5 text-[var(--brand-strong)]" />
              <span>Meta EIP: <strong className="font-mono text-[var(--ink)]">EIP-{metaEip}</strong></span>
            </Link>
          )}
          {entry?.mascot && (
            <span className="chip">
              <span>{entry.mascot.emoji}</span>
              <span>Mascot: {entry.mascot.name}</span>
              {entry.mascot.eip && (
                <Link
                  href={`/eip/${entry.mascot.eip}`}
                  className="font-mono text-[11px] text-[var(--brand-strong)] hover:underline"
                  title="Selected per EIP-8066 process"
                >
                  (EIP-{entry.mascot.eip})
                </Link>
              )}
            </span>
          )}
          {entry?.executionName && entry?.consensusName && (
            <span className="chip">
              <Layers className="h-3.5 w-3.5 text-[var(--brand-strong)]" />
              {entry.nameOriginDetails ? (
                <span>
                  {renderNameWithHighlight(entry.nameOriginDetails.clName, entry.nameOriginDetails.clHighlight)} (CL) + {renderNameWithHighlight(entry.nameOriginDetails.elName, entry.nameOriginDetails.elHighlight)} (EL)
                </span>
              ) : (
                <span>{entry.executionName} (EL) + {entry.consensusName} (CL)</span>
              )}
              {entry.nameOriginDetails?.eip && (
                <Link
                  href={`/eip/${entry.nameOriginDetails.eip}`}
                  className="font-mono text-[11px] text-[var(--brand-strong)] hover:underline"
                  title="Naming convention per EIP-8133"
                >
                  (EIP-{entry.nameOriginDetails.eip})
                </Link>
              )}
            </span>
          )}
          {entry?.activationDate && (
            <span className="inline-flex items-center gap-1 font-mono text-xs">
              <CalendarDays className="h-3.5 w-3.5" />
              Activated {entry.activationDate}
            </span>
          )}
          {typeof entry?.activationBlock === 'number' && (
            <span className="inline-flex items-center gap-1 font-mono text-xs">
              <Box className="h-3.5 w-3.5" />
              Block {entry.activationBlock.toLocaleString()}
            </span>
          )}
        </div>

        <div className="mt-5 hidden sm:block">
          <UpgradeTimelineStrip currentSlug={slug} />
        </div>

        {/* Live activation countdown (renders only for forks with a config) */}
        <UpgradeCountdown slug={slug} />

        {/* Subtab bar: solid Ledger chips */}
        {subtabs.length > 0 && (
          <div className="mt-5 pb-4">
            <nav className="flex flex-wrap items-center gap-1.5">
              {[{ id: 'overview' as const, label: 'Overview', href: `/upgrade/${slug}` }, ...subtabs].map(
                (tab) => (
                  <Link
                    key={tab.id}
                    href={tab.href}
                    aria-current={activeTab === tab.id ? 'page' : undefined}
                    data-active={activeTab === tab.id}
                    className="chip h-8 px-3.5 text-xs whitespace-nowrap"
                  >
                    {tab.label}
                  </Link>
                )
              )}
            </nav>
          </div>
        )}
        {subtabs.length === 0 && <div className="pb-5" />}
      </div>
    </div>
  );
}
