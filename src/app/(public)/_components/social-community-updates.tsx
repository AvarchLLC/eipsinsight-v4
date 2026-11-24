'use client';

import React from 'react';
import { motion } from 'motion/react';
import {
  ArrowUpRight,
  Calendar,
  Github,
  Hash,
  MessageCircle,
  MessageSquare,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SectionHead } from '@/components/ledger/section-head';

const communityDiscussions = [
  {
    id: 1,
    title: 'EIP-7702: Set EOA account code for one transaction',
    platform: 'Ethereum Magicians',
    category: 'Core',
    replies: 87,
    views: 2340,
    lastActive: '2 hours ago',
    url: 'https://ethereum-magicians.org/t/eip-7702-set-eoa-account-code-for-one-transaction/19923',
    isHot: true,
  },
  {
    id: 2,
    title: 'Account Abstraction roadmap discussion',
    platform: 'Ethereum Research',
    category: 'ERC',
    replies: 156,
    views: 4820,
    lastActive: '5 hours ago',
    url: 'https://ethresear.ch/t/account-abstraction-roadmap/',
    isHot: true,
  },
  {
    id: 3,
    title: 'EIP Review Process Improvements',
    platform: 'AllCoreDevs',
    category: 'Meta',
    replies: 43,
    views: 1230,
    lastActive: '1 day ago',
    url: 'https://github.com/ethereum/pm/issues/',
    isHot: false,
  },
  {
    id: 4,
    title: 'Verkle Trees Implementation Updates',
    platform: 'Ethereum Research',
    category: 'Core',
    replies: 92,
    views: 3150,
    lastActive: '3 days ago',
    url: 'https://ethresear.ch/',
    isHot: false,
  },
  {
    id: 5,
    title: 'RRC naming and indexing for RIP ecosystem',
    platform: 'Ethereum Magicians',
    category: 'RIP',
    replies: 28,
    views: 860,
    lastActive: '4 days ago',
    url: 'https://ethereum-magicians.org/',
    isHot: false,
  },
  {
    id: 6,
    title: 'EIP-7823: calldata gas economics refinements',
    platform: 'Ethereum Magicians',
    category: 'Core',
    replies: 64,
    views: 1910,
    lastActive: '6 hours ago',
    url: 'https://ethereum-magicians.org/c/eips/14',
    isHot: true,
  },
  {
    id: 7,
    title: 'ERC account delegation patterns for consumer wallets',
    platform: 'Ethereum Magicians',
    category: 'ERC',
    replies: 41,
    views: 1325,
    lastActive: '10 hours ago',
    url: 'https://ethereum-magicians.org/c/eips/14',
    isHot: false,
  },
  {
    id: 8,
    title: 'EIP process notes: editorial merge policy and review cadence',
    platform: 'Ethereum PM',
    category: 'Meta',
    replies: 22,
    views: 780,
    lastActive: '1 day ago',
    url: 'https://github.com/ethereum/pm/issues',
    isHot: false,
  },
];

type UpcomingEvent = {
  id: number;
  title: string;
  date: string;
  time: string;
  url: string;
  type: 'Execution' | 'Consensus' | 'Testing' | 'Protocol';
  sortTs: number;
};

const communityChannels = [
  {
    name: 'Ethereum Magicians',
    description: 'Primary forum for EIP proposal discussions and community feedback.',
    meta: 'Forum',
    url: 'https://ethereum-magicians.org/c/eips/14',
    icon: Hash,
  },
  {
    name: 'Ethereum Research',
    description: 'Deep protocol research threads and cryptoeconomic mechanism design.',
    meta: 'Research',
    url: 'https://ethresear.ch/c/protocol/14',
    icon: MessageSquare,
  },
  {
    name: 'Ethereum PM (AllCoreDevs)',
    description: 'Official meeting agendas, decision updates, and ACD coordination.',
    meta: 'Agendas',
    url: 'https://github.com/ethereum/pm/issues',
    icon: Github,
  },
];

const communityStats = [
  {
    label: 'Active Contributors',
    value: '1,247',
    source: 'EIPs & ERCs GitHub',
    icon: Users,
    url: 'https://github.com/ethereum/EIPs/discussions',
  },
  {
    label: 'Monthly Discussions',
    value: '856',
    source: 'Ethereum Magicians',
    icon: MessageSquare,
    url: 'https://ethereum-magicians.org/',
  },
  {
    label: 'Community Events',
    value: '32',
    source: 'Ethereum PM Agendas',
    icon: Calendar,
    url: 'https://github.com/ethereum/pm/issues/',
  },
];

const categoryBadges: Record<string, string> = {
  Core: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  ERC: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  Meta: 'border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400',
  RIP: 'border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400',
  Interface: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
};

const typeBadges: Record<string, string> = {
  Execution: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  Consensus: 'border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400',
  Testing: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Protocol: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
};

function parseDateParts(dateStr: string) {
  const parts = dateStr.split(' ');
  if (parts.length >= 2) {
    return { month: parts[0], day: parts[1].replace(',', '') };
  }
  return { month: 'TBD', day: '--' };
}

type SocialCommunityUpdatesProps = {
  showCommunityResources?: boolean;
  sectionTitleClass?: string;
  sectionSubtitleClass?: string;
};

export default function SocialCommunityUpdates({
  showCommunityResources = true,
}: SocialCommunityUpdatesProps) {
  const [upcomingEvents, setUpcomingEvents] = React.useState<UpcomingEvent[]>([]);
  const [eventsLoading, setEventsLoading] = React.useState(true);
  const [eventsSyncedAt, setEventsSyncedAt] = React.useState<string | null>(null);

  const sortedDiscussions = React.useMemo(
    () =>
      [...communityDiscussions].sort((a, b) => {
        if (a.isHot !== b.isHot) return a.isHot ? -1 : 1;
        return b.replies - a.replies;
      }),
    [],
  );

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      setEventsLoading(true);
      try {
        const res = await fetch('/api/community/upcoming-protocol-events');
        if (!res.ok) throw new Error(`GitHub response ${res.status}`);
        const payload = (await res.json()) as { events?: UpcomingEvent[]; syncedAt?: string };
        if (!cancelled) {
          setUpcomingEvents(payload.events ?? []);
          setEventsSyncedAt(payload.syncedAt ?? new Date().toISOString());
        }
      } catch {
        if (!cancelled) setUpcomingEvents([]);
      } finally {
        if (!cancelled) {
          setEventsLoading(false);
          setEventsSyncedAt((prev) => prev ?? new Date().toISOString());
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="mb-12 pt-2 scroll-mt-24" id="community">
      <SectionHead
        index="10"
        eyebrow="Ecosystem engagement"
        title="Social & Community Updates"
        description="Discussions, channels, and events across the Ethereum standards ecosystem."
        action={
          <div className="flex items-center gap-2">
            <a
              href="https://ethereum-magicians.org/c/eips/14"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline h-8 px-3 text-xs font-sans font-medium inline-flex items-center gap-1.5 hover:border-[var(--ink)] cursor-pointer"
            >
              <span>Magicians Forum</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-[var(--ink-faint)]" />
            </a>
            <a
              href="https://github.com/ethereum/pm/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline h-8 px-3 text-xs font-sans font-medium inline-flex items-center gap-1.5 hover:border-[var(--ink)] cursor-pointer"
            >
              <span>PM Agendas</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-[var(--ink-faint)]" />
            </a>
          </div>
        }
      />

      {/* Directory Gateway Stats */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {communityStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <a
              key={stat.label}
              href={stat.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex flex-col justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-all duration-200 hover:border-[var(--brand)]/50 hover:bg-[var(--surface-2)] hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--ink-muted)] group-hover:border-[var(--brand)]/40 group-hover:text-[var(--brand-strong)] transition-colors">
                  <Icon className="h-4 w-4" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-[var(--ink-faint)] group-hover:text-[var(--brand-strong)] transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </div>
              <div className="mt-4">
                <p className="text-2xl sm:text-3xl font-bold font-sans tracking-tight text-[var(--ink)] tabular-nums">
                  {stat.value}
                </p>
                <p className="text-xs font-sans font-medium text-[var(--ink-muted)] mt-1">
                  {stat.label}
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-2.5 text-[11px] font-mono text-[var(--ink-faint)]">
                <span>{stat.source}</span>
                <span className="font-sans text-[11px] text-[var(--ink-muted)] group-hover:text-[var(--brand-strong)] transition-colors">
                  Explore →
                </span>
              </div>
            </a>
          );
        })}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1.75fr_1.25fr]">
        {/* Left Column: Active Discussions & Watchlist Topics */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)]">
              Active Discussions
            </h3>
            <span className="text-[11px] font-mono text-[var(--ink-faint)]">
              {sortedDiscussions.length} curated threads
            </span>
          </div>

          <div className="space-y-2.5">
            {sortedDiscussions.map((discussion) => {
              const catClass =
                categoryBadges[discussion.category] ||
                'border-[var(--border)] bg-[var(--surface-2)] text-[var(--ink-muted)]';
              return (
                <motion.a
                  key={discussion.id}
                  href={discussion.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ y: -1 }}
                  className="group relative flex flex-col justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 transition-all duration-200 hover:border-[var(--brand)]/50 hover:bg-[var(--surface-2)]"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-[10px] font-mono font-semibold',
                        catClass,
                      )}
                    >
                      {discussion.category}
                    </span>
                    {discussion.isHot && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-amber-600 dark:text-amber-400">
                        <Zap className="h-3 w-3 fill-amber-500/30" /> Hot
                      </span>
                    )}
                    <span className="ml-auto text-[11px] font-sans text-[var(--ink-faint)]">
                      {discussion.platform}
                    </span>
                  </div>

                  <p className="mt-2 text-sm font-sans font-semibold text-[var(--ink)] leading-snug group-hover:text-[var(--brand-strong)] transition-colors">
                    {discussion.title}
                  </p>

                  <div className="mt-3 flex items-center gap-3 text-xs text-[var(--ink-muted)]">
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] tabular-nums">
                      <MessageCircle className="h-3.5 w-3.5 text-[var(--ink-faint)]" />
                      {discussion.replies}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] tabular-nums">
                      <TrendingUp className="h-3.5 w-3.5 text-[var(--ink-faint)]" />
                      {discussion.views.toLocaleString()}
                    </span>
                    <span className="ml-auto font-sans text-[11px] text-[var(--ink-faint)]">
                      {discussion.lastActive}
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-[var(--ink-faint)] group-hover:text-[var(--brand-strong)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </div>
                </motion.a>
              );
            })}
          </div>

          {/* Watchlist Topics */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <h4 className="mb-3 text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)]">
              Watchlist Topics
            </h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { label: 'Account Abstraction', url: 'https://ethresear.ch/t/account-abstraction-roadmap/' },
                { label: 'Rollup Standards (RIP/RRC)', url: 'https://ethereum-magicians.org/' },
                { label: 'Pectra Follow-ups', url: 'https://github.com/ethereum/pm/issues/' },
                { label: 'EIP Process & Tooling', url: 'https://ethereum-magicians.org/c/eips/14' },
              ].map((topic) => (
                <a
                  key={topic.label}
                  href={topic.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs font-sans font-medium text-[var(--ink)] transition-all hover:border-[var(--brand)]/50 hover:bg-[var(--surface)]"
                >
                  <span className="group-hover:text-[var(--brand-strong)] transition-colors">
                    {topic.label}
                  </span>
                  <ArrowUpRight className="h-3 w-3 text-[var(--ink-faint)] group-hover:text-[var(--brand-strong)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Protocol Meetings, Channels, Resources */}
        <div className="space-y-4">
          {/* Protocol Meetings */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)]">
                Protocol Meetings
              </h3>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--brand)]/30 bg-[var(--brand-muted)] px-2.5 py-0.5 text-[11px] font-mono text-[var(--brand-strong)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand)] animate-pulse" />
                Live GitHub PM
              </span>
            </div>

            {/* Shared Protocol Calendar Card */}
            <a
              href="https://calendar.google.com/calendar/embed?src=c_upaofong8mgrmrkegn7ic7hk5s%40group.calendar.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-3 rounded-xl border border-[var(--brand)]/30 bg-[var(--brand-muted)]/20 p-3.5 transition-all hover:border-[var(--brand)]/50 hover:bg-[var(--brand-muted)]/30"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--brand)]/30 bg-[var(--surface)] text-[var(--brand-strong)]">
                <Calendar className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-sans font-semibold text-[var(--ink)] group-hover:text-[var(--brand-strong)] transition-colors">
                  Upcoming Protocol Calendar
                </p>
                <p className="mt-1 text-xs font-sans text-[var(--ink-muted)] leading-relaxed">
                  Track ACD, breakout rooms, and execution calls from the official shared calendar.
                </p>
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[var(--ink-faint)] group-hover:text-[var(--brand-strong)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>

            {eventsSyncedAt ? (
              <div className="flex items-center justify-between text-[11px] font-mono text-[var(--ink-faint)] px-1">
                <span>
                  Last synced{' '}
                  {new Date(eventsSyncedAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <a
                  href="https://github.com/ethereum/pm/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--ink)] inline-flex items-center gap-1"
                >
                  View All <ArrowUpRight className="h-3 w-3" />
                </a>
              </div>
            ) : null}

            {eventsLoading ? (
              <div className="space-y-2.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={`upcoming-event-skeleton-${i}`}
                    className="h-16 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)]"
                  />
                ))}
              </div>
            ) : upcomingEvents.length === 0 ? (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-6 text-center text-xs font-sans text-[var(--ink-muted)]">
                No upcoming meeting agendas found right now. Check the full PM issue list.
              </div>
            ) : (
              <div className="space-y-2.5">
                {upcomingEvents.map((event) => {
                  const dateParts = parseDateParts(event.date);
                  const badgeClass =
                    typeBadges[event.type] ||
                    'border-[var(--border)] bg-[var(--surface-2)] text-[var(--ink-muted)]';
                  return (
                    <a
                      key={event.id}
                      href={event.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 transition-all hover:border-[var(--brand)]/50 hover:bg-[var(--surface-2)]"
                    >
                      <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-center">
                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-[var(--brand-strong)] leading-none">
                          {dateParts.month}
                        </span>
                        <span className="text-sm font-sans font-bold leading-tight text-[var(--ink)] tabular-nums">
                          {dateParts.day}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              'rounded-full border px-1.5 py-0.2 text-[10px] font-mono font-semibold',
                              badgeClass,
                            )}
                          >
                            {event.type}
                          </span>
                          <span className="text-[11px] font-mono text-[var(--ink-faint)]">
                            {event.time}
                          </span>
                        </div>
                        <p className="mt-1 text-xs font-sans font-medium text-[var(--ink)] line-clamp-2 group-hover:text-[var(--brand-strong)] transition-colors">
                          {event.title}
                        </p>
                      </div>
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[var(--ink-faint)] opacity-0 group-hover:opacity-100 group-hover:text-[var(--brand-strong)] transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Community Channels */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)]">
              Community Channels
            </h3>
            <div className="space-y-2.5">
              {communityChannels.map((channel) => {
                const Icon = channel.icon;
                return (
                  <a
                    key={channel.name}
                    href={channel.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 transition-all duration-200 hover:border-[var(--brand)]/50 hover:bg-[var(--surface-2)]"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--ink-muted)] group-hover:border-[var(--brand)]/40 group-hover:text-[var(--brand-strong)] transition-colors">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-sans font-semibold text-[var(--ink)] group-hover:text-[var(--brand-strong)] transition-colors">
                          {channel.name}
                        </p>
                        <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-mono text-[var(--ink-muted)]">
                          {channel.meta}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-sans text-[var(--ink-muted)] leading-relaxed">
                        {channel.description}
                      </p>
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[var(--ink-faint)] group-hover:text-[var(--brand-strong)] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Community Resources */}
          {showCommunityResources && (
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)]">
                Community Resources
              </h3>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2">
                <div className="divide-y divide-[var(--border)]">
                  {[
                    {
                      name: 'Official EIPs Website',
                      desc: 'Standard specifications & index',
                      url: 'https://eips.ethereum.org/',
                    },
                    {
                      name: 'EIPs GitHub Repository',
                      desc: 'Core specifications repository',
                      url: 'https://github.com/ethereum/EIPs',
                    },
                    {
                      name: 'Ethereum PM Repository',
                      desc: 'Meeting coordination & agendas',
                      url: 'https://github.com/ethereum/pm',
                    },
                    {
                      name: 'Ethereum Research',
                      desc: 'Protocol cryptoeconomics & proposals',
                      url: 'https://ethresear.ch/',
                    },
                  ].map((res) => (
                    <a
                      key={res.name}
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-between p-2.5 rounded-lg transition-colors hover:bg-[var(--surface-2)]"
                    >
                      <div>
                        <p className="text-xs font-sans font-semibold text-[var(--ink)] group-hover:text-[var(--brand-strong)] transition-colors">
                          {res.name}
                        </p>
                        <p className="text-[11px] font-sans text-[var(--ink-faint)]">
                          {res.desc}
                        </p>
                      </div>
                      <ArrowUpRight className="h-3.5 w-3.5 text-[var(--ink-faint)] group-hover:text-[var(--brand-strong)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
