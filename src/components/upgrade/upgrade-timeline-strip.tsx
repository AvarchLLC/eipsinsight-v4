import Link from 'next/link';
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

          return (
            <div key={entry.slug} className="flex items-stretch">
              {index > 0 && (
                <div
                  className={cn(
                    'relative flex items-center',
                    showHereMarker ? 'w-24' : 'w-10 sm:w-14'
                  )}
                >
                  <div className="h-px w-full bg-border" />
                  {showHereMarker && (
                    <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-[3px] flex-col items-center">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                      </span>
                      <span className="mt-1.5 whitespace-nowrap text-[10px] font-medium text-primary">
                        we are here
                      </span>
                    </div>
                  )}
                </div>
              )}
              <Link
                href={`/upgrade/${entry.slug}`}
                className={cn(
                  'flex min-w-32 flex-col gap-1 rounded-lg border px-3 py-2 transition-all',
                  isCurrent
                    ? 'border-primary/50 bg-primary/10 shadow-lg shadow-primary/15'
                    : 'border-border bg-card/60 hover:border-primary/40 hover:bg-primary/5'
                )}
              >
                <span
                  className={cn(
                    'text-sm font-semibold',
                    isCurrent ? 'text-primary' : 'text-foreground'
                  )}
                >
                  {entry.name}
                </span>
                <span className="flex items-center gap-1.5">
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
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
