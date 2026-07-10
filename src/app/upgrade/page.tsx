import Link from 'next/link';
import { ArrowRight, Archive, BarChart2, GitCommit, Star } from 'lucide-react';
import '@/lib/orpc.server';
import { cn } from '@/lib/utils';
import {
  getInProgressUpgrades,
  getLiveUpgrades,
  type UpgradeRegistryEntry,
} from '@/data/upgrade-registry';
import {
  STAGE_ORDER,
  stageAbbreviation,
  stageBadgeClass,
  stageDefinition,
  stageLabel,
  type UpgradeBucket,
} from '@/lib/upgrade-stages';
import { getCurrentPhase } from '@/data/fork-schedule';
import {
  getCachedRecentActivity,
  getCachedRecentCalls,
  getCachedUpcomingCalls,
  getCachedUpgradeComposition,
  getCachedUpgradeList,
  getCachedUpgradeStats,
} from '@/lib/upgrade-data.server';
import {
  callDisplayName,
  callSeriesBadgeClass,
  callSeriesShort,
} from '@/data/call-series';
import { UpgradeTimelineStrip } from '@/components/upgrade/upgrade-timeline-strip';
import { PhaseBadge, StageBadge, UpgradeStatusBadge } from '@/components/upgrade/stage-badge';
import { EipInclusionProcessGraph } from '@/components/upgrade/eip-inclusion-process-graph';

export const revalidate = 300;

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return 'just now';
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function stageCounts(composition: Awaited<ReturnType<typeof getCachedUpgradeComposition>>) {
  const counts = new Map<UpgradeBucket, number>();
  for (const eip of composition) {
    if (eip.bucket) counts.set(eip.bucket, (counts.get(eip.bucket) ?? 0) + 1);
  }
  return counts;
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function UpgradeCard({
  entry,
  counts,
  today,
}: {
  entry: UpgradeRegistryEntry;
  counts: Map<UpgradeBucket, number>;
  today: string;
}) {
  const totalEips = Array.from(counts.values()).reduce((sum, count) => sum + count, 0);
  const isLive = entry.status === 'Live';
  const phase = isLive ? null : getCurrentPhase(entry.slug, today);

  return (
    <Link
      href={`/upgrade/${entry.slug}`}
      className="group flex h-full flex-col rounded-xl border border-border bg-card/60 p-5 transition-colors hover:border-primary/40"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="dec-title text-xl font-semibold tracking-tight text-foreground">
          {entry.name}
        </h3>
        {phase ? (
          <PhaseBadge phaseId={phase.id} label={phase.label} />
        ) : (
          <UpgradeStatusBadge status={entry.status} />
        )}
      </div>
      <p className="mt-0.5 text-xs font-medium text-muted-foreground">
        {isLive && entry.activationDate
          ? `Activated: ${formatDate(entry.activationDate)}`
          : phase
            ? `Target: ${phase.targetYear}`
            : null}
      </p>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
        {entry.statusNote ?? entry.tagline}
      </p>

      {entry.headliners && entry.headliners.length > 0 && (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
          <Star className="mt-0.5 h-3 w-3 shrink-0 fill-current text-primary" />
          <span>
            {entry.headliners
              .map((headliner) => `EIP-${headliner.eip}`)
              .join(' · ')}{' '}
            headline this upgrade
          </span>
        </p>
      )}

      {totalEips > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {STAGE_ORDER.map((bucket) => {
            const count = counts.get(bucket);
            if (!count) return null;
            return (
              <span
                key={bucket}
                title={stageLabel(bucket)}
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

      <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary">
        View upgrade
        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

export default async function UpgradeIndexPage() {
  const today = new Date().toISOString().slice(0, 10);
  const inProgress = getInProgressUpgrades();
  const live = getLiveUpgrades();
  // Featured cards: newest live fork + everything in progress.
  const featured = [live[0], ...inProgress].filter(Boolean);

  const [list, stats, activity, recentCalls, upcomingCalls, ...compositions] = await Promise.all([
    getCachedUpgradeList(),
    getCachedUpgradeStats(),
    getCachedRecentActivity(10),
    getCachedRecentCalls(5),
    getCachedUpcomingCalls(),
    ...featured.map((entry) => getCachedUpgradeComposition(entry.slug)),
  ]);

  const eipCountBySlug = new Map(list.map((upgrade) => [upgrade.slug, upgrade.stats.totalEIPs]));

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 px-4 pb-12 pt-8 sm:px-6">
      {/* Hero */}
      <header>
        <h1 className="dec-title persona-title text-balance text-3xl font-semibold tracking-tight leading-[1.1] sm:text-4xl">
          Ethereum upgrades, tracked live
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          What&apos;s shipping in each network upgrade, where every EIP stands, and how it got
          there — parsed automatically from meta-EIP commits.
        </p>
      </header>

      {/* Roadmap strip */}
      <section aria-label="Upgrade roadmap">
        <UpgradeTimelineStrip />
      </section>

      {/* Network upgrades */}
      <section id="network-upgrades">
        <div className="mb-4">
          <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Network upgrades
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Where each upgrade stands right now.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((entry, index) => (
            <UpgradeCard
              key={entry.slug}
              entry={entry}
              counts={stageCounts(compositions[index] ?? [])}
              today={today}
            />
          ))}
        </div>
      </section>

      {/* Latest changes */}
      {activity.length > 0 && (
        <section id="latest-changes">
          <div className="mb-4">
            <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Latest changes
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Every EIP movement across all upgrades, straight from the meta-EIP commit history.
            </p>
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-card/60">
            <ul className="divide-y divide-border/60">
              {activity.map((event, index) => (
                <li
                  key={`${event.commit_date}-${event.eip_number}-${index}`}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm"
                >
                  <GitCommit className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {event.eip_number && (
                    <Link
                      href={`/eip/${event.eip_number}`}
                      className="font-mono text-xs font-semibold text-primary hover:underline"
                    >
                      EIP-{event.eip_number}
                    </Link>
                  )}
                  <span className="hidden max-w-56 truncate text-xs text-muted-foreground md:inline">
                    {event.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {event.event_type === 'removed' ? 'removed from' : `${event.event_type} to`}
                  </span>
                  <StageBadge bucket={event.bucket} abbreviated />
                  {event.upgrade_slug && (
                    <>
                      <span className="text-xs text-muted-foreground">in</span>
                      <Link
                        href={`/upgrade/${event.upgrade_slug}`}
                        className="text-xs font-medium text-foreground hover:text-primary"
                      >
                        {event.upgrade_name ?? event.upgrade_slug}
                      </Link>
                    </>
                  )}
                  <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                    {event.commit_date ? timeAgo(event.commit_date) : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Protocol calls */}
      {(recentCalls.length > 0 || upcomingCalls.length > 0) && (
        <section id="protocol-calls">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                Protocol calls
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Where upgrade decisions happen — agendas, recordings, and summaries.
              </p>
            </div>
            <Link
              href="/upgrade/calls"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              All calls
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {upcomingCalls.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-border bg-card/60">
                <h3 className="border-b border-border/60 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Upcoming
                </h3>
                <ul className="divide-y divide-border/60">
                  {upcomingCalls.slice(0, 4).map((call) => (
                    <li key={call.issue_number} className="flex items-center gap-3 px-4 py-2.5">
                      <span
                        className={cn(
                          'inline-flex w-14 shrink-0 items-center justify-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold',
                          call.series
                            ? callSeriesBadgeClass(call.series)
                            : 'border-border bg-muted text-muted-foreground'
                        )}
                      >
                        {call.series ? callSeriesShort(call.series) : '—'}
                      </span>
                      <a
                        href={call.issue_url ?? '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-w-0 flex-1 truncate text-sm text-foreground transition-colors hover:text-primary"
                      >
                        {call.title}
                      </a>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {call.occurs_on ?? 'TBD'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {recentCalls.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-border bg-card/60">
                <h3 className="border-b border-border/60 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Recent
                </h3>
                <ul className="divide-y divide-border/60">
                  {recentCalls.slice(0, 4).map((call) => (
                    <li
                      key={`${call.series}-${call.call_id}`}
                      className="flex items-center gap-3 px-4 py-2.5"
                    >
                      <span
                        className={cn(
                          'inline-flex w-14 shrink-0 items-center justify-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold',
                          callSeriesBadgeClass(call.series)
                        )}
                      >
                        {callSeriesShort(call.series)}
                      </span>
                      <Link
                        href="/upgrade/calls"
                        className="min-w-0 flex-1 truncate text-sm text-foreground transition-colors hover:text-primary"
                      >
                        {callDisplayName(call)}
                      </Link>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {call.occurred_on}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* How inclusion works */}
      <section id="how-inclusion-works">
        <div className="mb-4">
          <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            How EIPs get into an upgrade
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Proposals move through inclusion stages as client teams evaluate them.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="overflow-hidden rounded-xl border border-border bg-card/60">
            <EipInclusionProcessGraph />
          </div>
          <div className="rounded-xl border border-border bg-card/60 p-4 sm:p-5">
            <ul className="space-y-3">
              {STAGE_ORDER.map((bucket) => (
                <li key={bucket} className="flex items-start gap-3">
                  <StageBadge bucket={bucket} abbreviated className="mt-0.5 w-16 shrink-0 justify-center" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{stageLabel(bucket)}</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {stageDefinition(bucket)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Live upgrades */}
      <section id="live">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Live on mainnet
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Activated network upgrades, newest first.
            </p>
          </div>
          <Link
            href="/upgrade/archive"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            <Archive className="h-3.5 w-3.5" />
            Full archive
          </Link>
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-card/60">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/70 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Upgrade</th>
                  <th className="px-4 py-3">Activated</th>
                  <th className="hidden px-4 py-3 sm:table-cell">EIPs</th>
                  <th className="hidden px-4 py-3 md:table-cell">Highlights</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {live.map((entry) => (
                  <tr
                    key={entry.slug}
                    className="border-b border-border/60 last:border-0 hover:bg-muted/40"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      <Link href={`/upgrade/${entry.slug}`} className="text-primary hover:underline">
                        {entry.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{entry.activationDate}</td>
                    <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                      {eipCountBySlug.get(entry.slug) || '—'}
                    </td>
                    <td className="hidden max-w-md px-4 py-3 text-muted-foreground md:table-cell">
                      {entry.tagline}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Stats + deep-dive link */}
      <section aria-label="Statistics">
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/60 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <div>
              <p className="text-2xl font-semibold text-foreground">{stats?.totalUpgrades ?? '—'}</p>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Tracked upgrades</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{stats?.totalCoreEIPs ?? '—'}</p>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Core EIPs deployed</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">
                {stats?.independentIncludedAuthors ?? '—'}
              </p>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Included EIP authors</p>
            </div>
          </div>
          <Link
            href="/upgrade/analytics"
            className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
          >
            <BarChart2 className="h-4 w-4" />
            Upgrade analytics
          </Link>
        </div>
      </section>
    </div>
  );
}
