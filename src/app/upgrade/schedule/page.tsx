import type { Metadata } from 'next';
import Link from 'next/link';
import {
  CalendarClock,
  Check,
  CheckCircle2,
  ExternalLink,
  FlaskConical,
  Pin,
} from 'lucide-react';
import '@/lib/orpc.server';
import { cn } from '@/lib/utils';
import { buildMetadata } from '@/lib/seo';
import { getUpgradeRegistryEntry } from '@/data/upgrade-registry';
import {
  FORK_SCHEDULE_CONFIGS,
  calculateForkSchedule,
  groupScheduleIntoPhases,
  type ScheduleMilestone,
  type SchedulePhase,
} from '@/data/fork-schedule';
import { getCachedDevnetList } from '@/lib/upgrade-data.server';
import {
  STAGE_ORDER,
  stageAbbreviation,
  stageBadgeClass,
  type UpgradeBucket,
} from '@/lib/upgrade-stages';
import { getCachedUpgradeComposition } from '@/lib/upgrade-data.server';
import { UpgradeStatusBadge } from '@/components/upgrade/stage-badge';
import { SchedulePlanner } from '@/components/upgrade/schedule-planner';

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: 'Upgrade Schedule',
  description:
    'Phase-by-phase timelines for upcoming Ethereum network upgrades - headliner selection, EIP deadlines, devnets, testnets, and mainnet targets.',
  path: '/upgrade/schedule',
  keywords: ['Ethereum upgrade schedule', 'devnets', 'fork timeline'],
});

function daysUntil(date: string, today: string): number {
  return Math.round(
    (new Date(`${date}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / 86_400_000
  );
}

function relativeLabel(date: string, today: string): string {
  const days = daysUntil(date, today);
  if (days === 0) return 'today';
  if (days > 0) return `in ${days}d`;
  return `${-days}d ago`;
}

function MilestoneRow({
  milestone,
  today,
}: {
  milestone: ScheduleMilestone;
  today: string;
}) {
  const isPast = milestone.date < today;
  return (
    <li className="flex items-baseline justify-between gap-3 py-1">
      <span className="flex min-w-0 items-center gap-2">
        {isPast ? (
          <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
        ) : (
          <span className="h-3.5 w-3.5 shrink-0 text-center text-[10px] leading-[14px] text-muted-foreground">
            ·
          </span>
        )}
        <span
          className={cn(
            'truncate text-sm',
            isPast ? 'text-muted-foreground' : 'text-foreground'
          )}
        >
          {milestone.label}
        </span>
        {milestone.locked && (
          <Pin
            className="h-3 w-3 shrink-0 text-primary"
            aria-label="Confirmed date from ACD"
          />
        )}
      </span>
      <span className="shrink-0 text-right">
        <span className="font-mono text-xs text-muted-foreground">{milestone.date}</span>
        {!isPast && (
          <span className="ml-2 hidden text-[10px] font-medium text-primary sm:inline">
            {relativeLabel(milestone.date, today)}
          </span>
        )}
      </span>
    </li>
  );
}

function PhaseBlock({ phase, today }: { phase: SchedulePhase; today: string }) {
  const isDevnetPhase = phase.id === 'development';

  return (
    <div
      className={cn(
        'rounded-lg border p-3',
        phase.status === 'active'
          ? 'border-primary/40 bg-primary/5'
          : 'border-border/60 bg-card/40'
      )}
    >
      <div className="flex items-center gap-2">
        {phase.status === 'completed' ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        ) : (
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              phase.status === 'active' ? 'bg-primary' : 'bg-muted-foreground/40'
            )}
          />
        )}
        <h4
          className={cn(
            'text-sm font-semibold',
            phase.status === 'active' ? 'text-primary' : 'text-foreground'
          )}
        >
          {phase.label}
        </h4>
        {phase.status === 'active' && (
          <span className="rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
            Now
          </span>
        )}
      </div>
      <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
        {phase.description}
      </p>

      {isDevnetPhase ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {phase.milestones.map((milestone) => {
            const isPast = milestone.date < today;
            return (
              <span
                key={milestone.id}
                title={`${milestone.label} - ${milestone.date}${milestone.locked ? ' (confirmed)' : ' (projected)'}`}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium',
                  isPast
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'border-border bg-muted/50 text-muted-foreground'
                )}
              >
                {isPast && <Check className="h-2.5 w-2.5" />}
                {milestone.label.replace('Devnet ', 'D')}
                {milestone.locked && <Pin className="h-2.5 w-2.5 text-primary" />}
              </span>
            );
          })}
        </div>
      ) : (
        <ul className="mt-1.5">
          {phase.milestones.map((milestone) => (
            <MilestoneRow key={milestone.id} milestone={milestone} today={today} />
          ))}
        </ul>
      )}
    </div>
  );
}

async function ForkScheduleCard({ slug, today }: { slug: string; today: string }) {
  const entry = getUpgradeRegistryEntry(slug);
  const config = FORK_SCHEDULE_CONFIGS.find((c) => c.slug === slug);
  if (!entry || !config) return null;

  const milestones = calculateForkSchedule(config);
  const phases = groupScheduleIntoPhases(milestones, today);
  const composition = await getCachedUpgradeComposition(slug);

  const completedCount = milestones.filter((m) => m.date < today).length;
  const progressPercent = Math.round((completedCount / milestones.length) * 100);
  const nextMilestone = milestones.find((m) => m.date >= today);
  const mainnetDays = daysUntil(config.mainnetTarget, today);

  const stageCounts = new Map<UpgradeBucket, number>();
  for (const eip of composition) {
    if (eip.bucket) stageCounts.set(eip.bucket, (stageCounts.get(eip.bucket) ?? 0) + 1);
  }

  return (
    <div className="rounded-xl border border-border bg-card/60 p-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/upgrade/${slug}`}
          className="dec-title text-xl font-semibold tracking-tight text-foreground hover:text-primary"
        >
          {entry.name}
        </Link>
        <UpgradeStatusBadge status={entry.status} />
        <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" />
          Mainnet {config.mainnetTarget}
          {mainnetDays > 0 && (
            <span className="font-medium text-primary">~{mainnetDays}d</span>
          )}
        </span>
      </div>

      {/* Live composition */}
      {stageCounts.size > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Scope today:
          </span>
          {STAGE_ORDER.map((bucket) => {
            const count = stageCounts.get(bucket);
            if (!count) return null;
            return (
              <span
                key={bucket}
                className={cn(
                  'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium',
                  stageBadgeClass(bucket)
                )}
              >
                {count} {stageAbbreviation(bucket)}
              </span>
            );
          })}
        </div>
      )}

      {/* Progress */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            {completedCount} of {milestones.length} milestones
            {nextMilestone && (
              <>
                {' · next: '}
                <span className="font-medium text-foreground/80">{nextMilestone.label}</span>{' '}
                <span className="text-primary">{relativeLabel(nextMilestone.date, today)}</span>
              </>
            )}
          </span>
          <span>{progressPercent}%</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="persona-gradient h-full rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Phases */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {phases.map((phase) => (
          <PhaseBlock key={phase.id} phase={phase} today={today} />
        ))}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        Dates with <Pin className="inline h-3 w-3 text-primary" /> are confirmed via ACD;
        everything else is projected backwards from the curated mainnet target and shifts
        as decisions land.
      </p>
    </div>
  );
}

export default async function UpgradeSchedulePage() {
  const today = new Date().toISOString().slice(0, 10);
  const allDevnets = await getCachedDevnetList();
  // Live networks first, then the newest specs from in-progress series.
  const highlightedDevnets = [
    ...allDevnets.filter((devnet) => devnet.active),
    ...allDevnets.filter(
      (devnet) => !devnet.active && ['glamsterdam', 'bal', 'epbs'].includes(devnet.series)
    ),
  ].slice(0, 6);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 px-4 pb-12 pt-8 sm:px-6">
      <header>
        <h1 className="dec-title persona-title text-balance text-3xl font-semibold tracking-tight leading-[1.1] sm:text-4xl">
          Upgrade schedule
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Where each in-progress upgrade stands - scoping, devnets, testnets, mainnet - with
          confirmed dates pinned from AllCoreDevs decisions and the rest projected.
        </p>
      </header>

      {/* Interactive planning sandbox + Gantt timeline (client) */}
      <SchedulePlanner />

      <section className="space-y-4">
        <div>
          <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Per-fork detail
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Live scope, progress, and phase breakdown for each in-progress upgrade.
          </p>
        </div>
        {FORK_SCHEDULE_CONFIGS.map((config) => (
          <ForkScheduleCard key={config.slug} slug={config.slug} today={today} />
        ))}
      </section>

      {/* Devnets (live from the scraper) */}
      {highlightedDevnets.length > 0 && (
        <section id="devnets" className="scroll-mt-24">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                Devnets
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Live and recent developer test networks for in-progress upgrades.
              </p>
            </div>
            <Link
              href="/upgrade/devnets"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              All devnets
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {highlightedDevnets.map((devnet) => (
              <Link
                key={devnet.id}
                href={`/upgrade/devnets/${devnet.id}`}
                className="group rounded-xl border border-border bg-card/60 p-4 transition-colors hover:border-primary/40"
              >
                <div className="flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate text-sm font-semibold text-foreground">
                    {devnet.title ?? devnet.id}
                  </span>
                  {devnet.active && (
                    <span className="ml-auto shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                      live
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {devnet.genesis_time
                    ? `Genesis ${new Date(devnet.genesis_time * 1000).toISOString().slice(0, 10)} · `
                    : ''}
                  {devnet.same_spec_as
                    ? `same spec as ${devnet.same_spec_as}`
                    : `${devnet.eip_count} EIPs in scope`}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
