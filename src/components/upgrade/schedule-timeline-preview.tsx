import Link from 'next/link';
import { ArrowUpRight, Check, ChevronDown, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getUpgradeRegistryEntry } from '@/data/upgrade-registry';
import {
  FORK_SCHEDULE_CONFIGS,
  calculateForkSchedule,
  groupScheduleIntoPhases,
} from '@/data/fork-schedule';

/**
 * Preview of the upgrade schedule for the /upgrade landing page. Each in-progress
 * fork shows its four phases (Scoping → Mainnet) as a status strip; expanding a
 * card reveals the milestone-by-milestone detail (dates, and whether each date is
 * a curated actual or a projection). Full view lives at /upgrade/schedule.
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
        <details
          key={fork.slug}
          className="group rounded-xl border border-border bg-card/60 transition-colors open:border-primary/40 hover:border-primary/40"
        >
          <summary className="flex cursor-pointer list-none flex-col gap-3 p-4 [&::-webkit-details-marker]:hidden">
            <div className="flex items-baseline justify-between gap-2">
              <span className="dec-title inline-flex items-center gap-1.5 text-base font-semibold text-foreground">
                {fork.name}
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
              </span>
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
                        phase.status === 'upcoming'
                          ? 'text-muted-foreground/60'
                          : 'text-muted-foreground'
                      )}
                    >
                      {phase.status === 'completed' && (
                        <Check className="h-2.5 w-2.5 text-emerald-500" />
                      )}
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
          </summary>

          {/* Expanded: milestone-by-milestone detail, grouped by phase. */}
          <div className="border-t border-border/60 px-4 pb-4 pt-3">
            <ol className="space-y-3">
              {fork.phases.map((phase) => (
                <li key={phase.id}>
                  <div className="mb-1.5 flex items-center gap-2">
                    <span
                      className={cn(
                        'h-2 w-2 shrink-0 rounded-full',
                        phase.status === 'completed'
                          ? 'bg-emerald-500'
                          : phase.status === 'active'
                            ? 'bg-primary'
                            : 'bg-muted-foreground/30'
                      )}
                    />
                    <span className="text-xs font-semibold text-foreground">{phase.label}</span>
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
                      {phase.status}
                    </span>
                  </div>
                  {phase.milestones.length > 0 ? (
                    <ul className="ml-4 space-y-1 border-l border-border/50 pl-3">
                      {phase.milestones.map((m) => (
                        <li
                          key={m.id}
                          className="flex items-center justify-between gap-2 text-xs"
                        >
                          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                            {m.label}
                            {m.locked && (
                              <Lock
                                className="h-2.5 w-2.5 text-emerald-500"
                                aria-label="Confirmed date"
                              />
                            )}
                          </span>
                          <span
                            className={cn(
                              'shrink-0 tabular-nums',
                              m.locked ? 'text-foreground' : 'text-muted-foreground/70'
                            )}
                          >
                            {formatDate(m.date)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="ml-4 pl-3 text-xs text-muted-foreground/60">
                      No milestones yet.
                    </p>
                  )}
                </li>
              ))}
            </ol>
            <Link
              href="/upgrade/schedule"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              View full schedule
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
            <p className="mt-2 text-[10px] text-muted-foreground/60">
              <Lock className="mr-1 inline h-2.5 w-2.5 text-emerald-500" />
              Confirmed date · others are projected from ACD targets.
            </p>
          </div>
        </details>
      ))}
    </div>
  );
}
