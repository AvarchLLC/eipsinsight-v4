import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Archive, GitCommit } from 'lucide-react';
import { CopyLinkButton } from '@/components/header';
import { ShareButtons } from '@/components/share-buttons';
import { PageHead } from '@/components/ledger/page-head';
import { SectionHead } from '@/components/ledger/section-head';
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

function UpgradeSection({
  eyebrow,
  title,
  sectionId,
  description,
  href,
  action,
}: {
  eyebrow: string;
  title: string;
  sectionId: string;
  description: string;
  href?: string;
  action?: ReactNode;
}) {
  return (
    <SectionHead
      eyebrow={eyebrow}
      title={
        <span className="inline-flex items-center gap-2">
          {href ? (
            <Link href={href} className="inline-flex items-center gap-1 hover:text-[var(--brand-strong)] transition-colors">
              {title}
              <ArrowUpRight className="h-4 w-4 shrink-0 text-[var(--ink-faint)]" />
            </Link>
          ) : (
            <span>{title}</span>
          )}
          <CopyLinkButton sectionId={sectionId} tooltipLabel="Copy link" />
        </span>
      }
      description={description}
      action={action}
    />
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
    <div data-ledger className="min-h-screen bg-[var(--paper)] text-[var(--ink)] pb-16">
      <PageHead
        eyebrow="NETWORK UPGRADES"
        title={
          <>
            Ethereum upgrades, <span className="accent">tracked live</span>
          </>
        }
        lead="What's shipping in each network upgrade, where every EIP stands, and how it got there, parsed automatically from meta-EIP commits."
      >
        <div className="mt-3">
          <ShareButtons
            text="Ethereum upgrades, tracked live: what's shipping in each network upgrade and where every EIP stands, on EIPsInsight"
            hashtags={['Ethereum', 'EIPs']}
            className="shrink-0"
          />
        </div>
      </PageHead>

      <div className="wrap space-y-12 py-8">
      {/* Upgrade Directory - top of page */}
      <section id="eip-directory" className="scroll-mt-24">
        <UpgradeSection
          eyebrow="EIP DIRECTORY"
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

      {/* Network upgrades - roadmap timeline */}
      <section id="network-upgrades" className="scroll-mt-24">
        <UpgradeSection
          eyebrow="ROADMAP"
          title="Network upgrades"
          sectionId="network-upgrades"
          description="The last shipped fork, the one being built now, and what's next, showing where each stands today."
        />
        <UpgradeTimelineStrip liveCount={4} />
      </section>

      {/* Timeline View - schedule preview */}
      <section id="timeline-view" className="scroll-mt-24">
        <UpgradeSection
          eyebrow="SCHEDULE"
          title="Timeline View"
          sectionId="timeline-view"
          href="/upgrade/schedule"
          description="Upgrade phases and milestones across forks, on a shared calendar. Expand a fork for the detail."
        />
        <ScheduleTimelinePreview today={today} />
      </section>

      {/* Upgrade charts - Ethereum timeline + EIP distribution */}
      <section id="upgrade-charts" className="scroll-mt-24">
        <UpgradeSection
          eyebrow="CHARTS"
          title="Upgrade timelines"
          sectionId="upgrade-charts"
          description="The full historical timeline, and how EIPs are distributed across upgrades."
        />
        <UpgradeChartsTabs />
      </section>

      {/* Latest changes */}
      {activity.length > 0 && (
        <section id="latest-changes" className="scroll-mt-24">
          <UpgradeSection
            eyebrow="COMMIT ACTIVITY"
            title="Latest changes"
            sectionId="latest-changes"
            description="Every EIP movement across all upgrades, straight from the meta-EIP commit history."
          />
          <div className="overflow-hidden rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)]">
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
      <section id="how-inclusion-works" className="scroll-mt-24">
        <UpgradeSection
          eyebrow="PROCESS"
          title="How EIPs get into an upgrade"
          sectionId="how-inclusion-works"
          description="Proposals move through inclusion stages as client teams evaluate them."
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="overflow-hidden rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)]">
            <EipInclusionProcessGraph />
          </div>
          <div className="rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
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
      <section id="live" className="scroll-mt-24">
        <UpgradeSection
          eyebrow="MAINNET HISTORY"
          title="Live on mainnet"
          sectionId="live"
          description={`All ${liveUpgrades.length} activated network upgrades, newest first.`}
          action={
            <Link
              href="/upgrade/archive"
              className="btn h-8 px-3 text-xs font-medium"
            >
              <Archive className="h-3.5 w-3.5" />
              Full archive
            </Link>
          }
        />
        <div className="overflow-hidden rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)]">
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
                        '-'
                      )}
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                      {entry.eipCount || '-'}
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
      <section id="analytics" className="scroll-mt-24">
        <UpgradeSection
          eyebrow="UPGRADE ANALYTICS"
          title="Upgrade analytics"
          sectionId="analytics"
          description="The numbers behind the upgrades. Click any card to see the EIPs, meta EIPs, or authors behind it."
        />
        <UpgradeStatsPanel />
      </section>
      </div>
    </div>
  );
}
