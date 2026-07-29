import Link from 'next/link';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getInProgressUpgrades, getLiveUpgrades } from '@/data/upgrade-registry';
import { getCurrentPhase } from '@/data/fork-schedule';
import { PhaseBadge, UpgradeStatusBadge } from '@/components/upgrade/stage-badge';

/**
 * Responsive horizontal strip of recent and upcoming network upgrades with a
 * "we are here" marker between the latest Live fork and the next one.
 * CSS/flexbox (scrolls horizontally on small screens) — intentionally not the
 * hand-positioned SVG approach.
 */
export function UpgradeTimelineStrip({
  currentSlug,
  liveCount = 3,
}: {
  currentSlug?: string;
  liveCount?: number;
}) {
  const live = getLiveUpgrades().slice(0, liveCount).reverse();
  const inProgress = getInProgressUpgrades();
  const entries = [...live, ...inProgress];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-max items-stretch gap-0">
        {entries.map((entry, index) => {
          const isCurrent = entry.slug === currentSlug;
          const previous = entries[index - 1];
          const showHereMarker =
            previous?.status === 'Live' && entry.status !== 'Live';
          const phase = entry.status !== 'Live' ? getCurrentPhase(entry.slug, today) : null;
          // The connector into this node is "live" history while the node to its
          // left has already shipped; everything past the marker is still ahead.
          const liveConnector = previous?.status === 'Live';
          const headliner = entry.headliners?.[0];
          const headlinerCount = entry.headliners?.length ?? 0;

          return (
            <div key={entry.slug} className="flex items-stretch">
              {index > 0 && (
                <div
                  className={cn(
                    'relative flex items-center',
                    showHereMarker ? 'w-28' : 'w-12 sm:w-16'
                  )}
                >
                  <div
                    className={cn(
                      'h-0.5 w-full',
                      liveConnector ? 'bg-emerald-500/40' : 'bg-border'
                    )}
                  />
                  {showHereMarker && (
                    <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-[3px] flex-col items-center">
                      <span className="relative flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
                      </span>
                      <span className="mt-1.5 whitespace-nowrap rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        we are here
                      </span>
                    </div>
                  )}
                </div>
              )}
              <Link
                href={`/upgrade/${entry.slug}`}
                className={cn(
                  'group/card flex w-52 flex-col gap-2 rounded-xl border px-4 py-3 transition-all',
                  isCurrent
                    ? 'border-primary/50 bg-primary/10 shadow-lg shadow-primary/15'
                    : 'border-border bg-card/60 shadow-sm hover:border-primary/40 hover:bg-primary/5'
                )}
              >
                <div className="flex items-start justify-between gap-1">
                  <span
                    className={cn(
                      'text-base font-semibold leading-tight',
                      isCurrent ? 'text-primary' : 'text-foreground'
                    )}
                  >
                    {entry.name}
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-colors group-hover/card:text-primary" />
                </div>
                <span className="flex flex-wrap items-center gap-1.5">
                  {phase ? (
                    <PhaseBadge phaseId={phase.id} label={phase.label} className="text-[10px]" />
                  ) : (
                    <UpgradeStatusBadge status={entry.status} className="text-[10px]" />
                  )}
                  {entry.activationDate ? (
                    <span className="text-[10px] text-muted-foreground">
                      {entry.activationDate}
                    </span>
                  ) : phase ? (
                    <span className="text-[10px] text-muted-foreground">
                      → {phase.targetYear}
                    </span>
                  ) : null}
                </span>
                {entry.tagline && (
                  <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">
                    {entry.tagline}
                  </p>
                )}
                {headliner && (
                  <span className="mt-auto inline-flex items-center gap-1 truncate text-[10px] font-medium text-muted-foreground/80">
                    <Sparkles className="h-3 w-3 shrink-0 text-primary/70" />
                    <span className="truncate">
                      EIP-{headliner.eip}
                      {headlinerCount > 1 ? ` +${headlinerCount - 1} more` : ''}
                    </span>
                  </span>
                )}
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
