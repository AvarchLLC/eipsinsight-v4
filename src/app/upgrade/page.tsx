import type { ReactNode } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight, ArrowUpRight, Archive, CalendarClock, GitCommit, Info, LineChart, Package, PieChart, Search, Zap } from 'lucide-react';
import { CopyLinkButton } from '@/components/header';
import { ShareButtons } from '@/components/share-buttons';
import '@/lib/orpc.server';
import { cn } from '@/lib/utils';
import { statusBadgeClass } from '@/lib/proposal-status';
import { getInProgressUpgrades, upgradeRegistry } from '@/data/upgrade-registry';
import type { UpgradeRegistryEntry } from '@/data/upgrade-registry';
import { rawData, pairedUpgradeNames, upgradeDescriptions, upgradeMetaEIPs } from '@/data/network-upgrades';
import { STAGE_ORDER, stageDefinition, stageLabel } from '@/lib/upgrade-stages';
import { getCachedRecentActivity } from '@/lib/upgrade-data.server';
import { UpgradeTimelineStrip } from '@/components/upgrade/upgrade-timeline-strip';
import { EipDirectorySearch } from '@/components/upgrade/eip-directory-search';
import { ScheduleTimelinePreview } from '@/components/upgrade/schedule-timeline-preview';
import { UpgradeChartsTabs } from '@/components/upgrade/upgrade-charts-tabs';
import { UpgradeStatsPanel } from '@/components/upgrade/upgrade-stats-panel';
import { StageBadge } from '@/components/upgrade/stage-badge';
import { EipInclusionProcessGraph } from '@/components/upgrade/eip-inclusion-process-graph';

export const revalidate = 300;

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return 'just now';
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Per-section accent tints for the header icon chips. */
const ACCENTS = {
  blue: { chip: 'bg-blue-500/10 ring-blue-500/20', icon: 'text-blue-500' },
  violet: { chip: 'bg-violet-500/10 ring-violet-500/20', icon: 'text-violet-500' },
  amber: { chip: 'bg-amber-500/10 ring-amber-500/20', icon: 'text-amber-500' },
  cyan: { chip: 'bg-cyan-500/10 ring-cyan-500/20', icon: 'text-cyan-500' },
  emerald: { chip: 'bg-emerald-500/10 ring-emerald-500/20', icon: 'text-emerald-500' },
  rose: { chip: 'bg-rose-500/10 ring-rose-500/20', icon: 'text-rose-500' },
  green: { chip: 'bg-green-500/10 ring-green-500/20', icon: 'text-green-500' },
  indigo: { chip: 'bg-indigo-500/10 ring-indigo-500/20', icon: 'text-indigo-500' },
} as const;

/**
 * Consistent section header: a colored icon chip, the title (optionally a link
 * out), a copy-link button, and a description aligned under the title. An
 * optional `action` slot floats to the right (e.g. the Live "Full archive" pill).
 */
function SectionHeader({
  icon: Icon,
  accent,
  title,
  sectionId,
  description,
  href,
  action,
}: {
  icon: LucideIcon;
  accent: keyof typeof ACCENTS;
  title: string;
  sectionId: string;
  description: string;
  href?: string;
  action?: ReactNode;
}) {
  const a = ACCENTS[accent];
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset',
              a.chip
            )}
          >
            <Icon className={cn('h-[18px] w-[18px]', a.icon)} />
          </span>
          {href ? (
            <Link
              href={href}
              className="dec-title inline-flex items-center gap-1 text-xl font-semibold tracking-tight text-foreground transition-colors hover:text-primary sm:text-2xl"
            >
              {title}
              <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
            </Link>
          ) : (
            <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {title}
            </h2>
          )}
          <CopyLinkButton sectionId={sectionId} tooltipLabel="Copy link" />
        </div>
        <p className="mt-1.5 pl-[46px] text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

/**
 * The complete list of activated mainnet upgrades (all 22 distinct activation
 * dates in the static timeline), newest first. Same-date EL/CL forks collapse
 * into one row. Where a fork has a dedicated registry page we link to it and use
 * its curated tagline; older forks (Bellatrix, the Glaciers, Altair, Phase 0,
 * Frontier Thawing …) fall back to their raw name and one-line description.
 */
interface LiveUpgradeRow {
  date: string;
  name: string;
  slug?: string;
  metaEip?: string;
  eipCount: number;
  tagline: string;
}

function isRealEip(eip: string): boolean {
  return eip.startsWith('EIP-') && !eip.endsWith('-removed');
}

function buildLiveUpgrades(): LiveUpgradeRow[] {
  const registryByDate = new Map<string, UpgradeRegistryEntry>();
  for (const entry of Object.values(upgradeRegistry)) {
    if (entry.activationDate) registryByDate.set(entry.activationDate, entry);
  }

  const byDate = new Map<string, typeof rawData>();
  for (const row of rawData) {
    const bucket = byDate.get(row.date);
    if (bucket) bucket.push(row);
    else byDate.set(row.date, [row]);
  }

  const rows: LiveUpgradeRow[] = [...byDate.entries()].map(([date, entries]) => {
    const reg = registryByDate.get(date);
    const forkNames = [...new Set(entries.map((e) => e.upgrade))];
    const name =
      pairedUpgradeNames[date] ??
      (forkNames.length > 1 ? forkNames.join(' / ') : (reg?.name ?? forkNames[0]));
    const eipCount = new Set(entries.flatMap((e) => e.eips).filter(isRealEip)).size;
    const tagline = reg?.tagline ?? upgradeDescriptions[forkNames[0]] ?? '';
    const metaEip = entries.map((e) => upgradeMetaEIPs[e.upgrade]).find(Boolean);
    return { date, name, slug: reg?.slug, metaEip, eipCount, tagline };
  });

  rows.sort((a, b) => (a.date < b.date ? 1 : -1));
  return rows;
}

const liveUpgrades = buildLiveUpgrades();

export default async function UpgradeIndexPage() {
  const today = new Date().toISOString().slice(0, 10);
  const inProgress = getInProgressUpgrades();
  const activity = await getCachedRecentActivity(10);

  return (
    <div className="mx-auto w-full max-w-6xl divide-y divide-border/50 px-4 pb-12 pt-8 sm:px-6 [&>*:first-child]:pt-0 [&>*]:py-10">
      {/* Hero */}
      <header className="space-y-2.5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="dec-title persona-title text-balance text-3xl font-semibold tracking-tight leading-[1.1] sm:text-4xl">
              Ethereum upgrades, tracked live
            </h1>
          </div>
          <ShareButtons
            text="Ethereum upgrades, tracked live: what's shipping in each network upgrade and where every EIP stands, on EIPsInsight"
            hashtags={['Ethereum', 'EIPs']}
            className="shrink-0"
          />
        </div>
        <p className="w-full text-sm leading-relaxed text-muted-foreground sm:text-base">
          What&apos;s shipping in each network upgrade, where every EIP stands, and how it got
          there, parsed automatically from meta-EIP commits.
        </p>
      </header>

      {/* Upgrade Directory — top of page */}
      <section id="eip-directory">
        <SectionHeader
          icon={Search}
          accent="blue"
          title="Upgrade EIP Directory"
          sectionId="eip-directory"
          href="/upgrade/eips"
          description="Search every EIP across all upgrades, or jump straight to a filtered view."
        />
        <EipDirectorySearch
          upgradeChips={inProgress
            .slice(0, 2)
            .map((entry) => ({ label: entry.name, href: `/upgrade/eips?upgrade=${entry.slug}` }))}
        />
      </section>

      {/* Network upgrades — roadmap timeline (the cards moved to the stats panel below) */}
      <section id="network-upgrades">
        <SectionHeader
          icon={Package}
          accent="violet"
          title="Network upgrades"
          sectionId="network-upgrades"
          description="The last shipped fork, the one being built now, and what's next, showing where each stands today."
        />
        <UpgradeTimelineStrip liveCount={4} />
      </section>

      {/* Timeline View — schedule preview */}
      <section id="timeline-view">
        <SectionHeader
          icon={CalendarClock}
          accent="amber"
          title="Timeline View"
          sectionId="timeline-view"
          href="/upgrade/schedule"
          description="Upgrade phases and milestones across forks, on a shared calendar. Expand a fork for the detail."
        />
        <ScheduleTimelinePreview today={today} />
      </section>

      {/* Upgrade charts — Ethereum timeline + EIP distribution (tabbed) */}
      <section id="upgrade-charts">
        <SectionHeader
          icon={LineChart}
          accent="cyan"
          title="Upgrade timelines"
          sectionId="upgrade-charts"
          description="The full historical timeline, and how EIPs are distributed across upgrades."
        />
        <UpgradeChartsTabs />
      </section>

      {/* Latest changes */}
      {activity.length > 0 && (
        <section id="latest-changes">
          <SectionHeader
            icon={GitCommit}
            accent="emerald"
            title="Latest changes"
            sectionId="latest-changes"
            description="Every EIP movement across all upgrades, straight from the meta-EIP commit history."
          />
          <div className="overflow-hidden rounded-xl border border-border bg-card/60">
            <ul className="divide-y divide-border/60">
              {activity.map((event, index) => (
                <li
                  key={`${event.commit_date}-${event.eip_number}-${index}`}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm"
                >
                  <GitCommit className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {event.eip_number && (
                    <Link
                      href={`/eip/${event.eip_number}`}
                      className="font-mono text-sm font-semibold text-primary hover:underline"
                    >
                      EIP-{event.eip_number}
                    </Link>
                  )}
                  <span className="hidden max-w-72 truncate text-sm text-muted-foreground md:inline">
                    {event.title}
                  </span>

                  {/* The verb's object is the UPGRADE, so the clause has to close on the
                      upgrade name. Putting the badges inside it read as "added to Draft
                      CFI" - but Draft is the proposal's lifecycle status, not something
                      an EIP is added to. Badges follow as trailing metadata instead. */}
                  {event.upgrade_slug ? (
                    <>
                      <span className="text-sm text-muted-foreground">
                        {event.event_type === 'removed' ? 'removed from' : `${event.event_type} to`}
                      </span>
                      <Link
                        href={`/upgrade/${event.upgrade_slug}`}
                        className="text-sm font-medium text-foreground hover:text-primary"
                      >
                        {event.upgrade_name ?? event.upgrade_slug}
                      </Link>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">{event.event_type}</span>
                  )}

                  <span className="inline-flex shrink-0 items-center gap-1.5">
                    {event.status && (
                      <span
                        title={`Proposal status: ${event.status}`}
                        className={cn(
                          'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium',
                          statusBadgeClass(event.status, 'outline')
                        )}
                      >
                        {event.status}
                      </span>
                    )}
                    <StageBadge bucket={event.bucket} abbreviated />
                  </span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {event.commit_date ? timeAgo(event.commit_date) : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* How inclusion works */}
      <section id="how-inclusion-works">
        <SectionHeader
          icon={Info}
          accent="rose"
          title="How EIPs get into an upgrade"
          sectionId="how-inclusion-works"
          description="Proposals move through inclusion stages as client teams evaluate them."
        />
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
        <SectionHeader
          icon={Zap}
          accent="green"
          title="Live on mainnet"
          sectionId="live"
          description={`All ${liveUpgrades.length} activated network upgrades, newest first.`}
          action={
            <Link
              href="/upgrade/archive"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              <Archive className="h-3.5 w-3.5" />
              Full archive
            </Link>
          }
        />
        <div className="overflow-hidden rounded-xl border border-border bg-card/60">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/70 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Upgrade</th>
                  <th className="px-4 py-3">Activated</th>
                  <th className="px-4 py-3">Meta EIP</th>
                  <th className="hidden px-4 py-3 sm:table-cell">EIPs</th>
                  <th className="hidden px-4 py-3 md:table-cell">Highlights</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {liveUpgrades.map((entry) => (
                  <tr
                    key={entry.date}
                    className="border-b border-border/60 last:border-0 hover:bg-muted/40"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {entry.slug ? (
                        <Link
                          href={`/upgrade/${entry.slug}`}
                          className="text-primary hover:underline"
                        >
                          {entry.name}
                        </Link>
                      ) : (
                        entry.name
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{entry.date}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {entry.metaEip ? (
                        <Link
                          href={`/eip/${entry.metaEip.replace('EIP-', '')}`}
                          className="font-mono text-xs text-primary hover:underline"
                        >
                          {entry.metaEip}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                      {entry.eipCount || '—'}
                    </td>
                    <td className="hidden max-w-md px-4 py-3 text-muted-foreground md:table-cell">
                      {entry.tagline}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {entry.slug && (
                        <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Analytics stats: cards (click to reveal each dataset) + EIP/author tables */}
      <section id="analytics">
        <SectionHeader
          icon={PieChart}
          accent="indigo"
          title="Upgrade analytics"
          sectionId="analytics"
          description="The numbers behind the upgrades. Click any card to see the EIPs, meta EIPs, or authors behind it."
        />
        <UpgradeStatsPanel />
      </section>
    </div>
  );
}
