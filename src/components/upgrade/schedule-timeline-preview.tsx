import Link from 'next/link';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getUpgradeRegistryEntry } from '@/data/upgrade-registry';
import {
  FORK_SCHEDULE_CONFIGS,
  calculateForkSchedule,
  groupScheduleIntoPhases,
} from '@/data/fork-schedule';

/**
 * Compact preview of the upgrade schedule for the /upgrade landing page: each
 * in-progress fork's four phases (Scoping → Mainnet) as a status strip, plus its
 * mainnet target. A read-only teaser that hands off to /upgrade/schedule for the
 * full milestone-by-milestone view.
 */

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function ScheduleTimelinePreview({ today }: { today: string }) {
  const forks = FORK_SCHEDULE_CONFIGS.map((config) => {
    const milestones = calculateForkSchedule(config);
    const phases = groupScheduleIntoPhases(milestones, today);
    const name = getUpgradeRegistryEntry(config.slug)?.name ?? config.slug;
    return { slug: config.slug, name, mainnetTarget: config.mainnetTarget, phases };
  });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {forks.map((fork) => (
        <Link
          key={fork.slug}
          href="/upgrade/schedule"
          className="group flex flex-col gap-3 rounded-xl border border-border bg-card/60 p-4 transition-colors hover:border-primary/40"
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="dec-title text-base font-semibold text-foreground">{fork.name}</span>
            <span className="text-xs text-muted-foreground">
              Mainnet target · {formatDate(fork.mainnetTarget)}
            </span>
          </div>

          {/* Phase strip: completed (check) · active (filled) · upcoming (faint). */}
          <div className="flex items-center gap-1.5">
            {fork.phases.map((phase, index) => (
              <div key={phase.id} className="flex flex-1 items-center gap-1.5">
                <div className="flex flex-1 flex-col gap-1">
                  <div
                    className={cn(
                      'h-1.5 w-full rounded-full',
                      phase.status === 'completed'
                        ? 'bg-emerald-500/60'
                        : phase.status === 'active'
                          ? 'bg-primary'
                          : 'bg-muted'
                    )}
                  />
                  <span
                    className={cn(
                      'flex items-center gap-1 text-[10px] font-medium',
                      phase.status === 'upcoming' ? 'text-muted-foreground/60' : 'text-muted-foreground'
                    )}
                  >
                    {phase.status === 'completed' && <Check className="h-2.5 w-2.5 text-emerald-500" />}
                    {phase.label}
                  </span>
                </div>
                {index < fork.phases.length - 1 && (
                  <span className="text-muted-foreground/30" aria-hidden>
                    ·
                  </span>
                )}
              </div>
            ))}
          </div>
        </Link>
      ))}
    </div>
  );
}
