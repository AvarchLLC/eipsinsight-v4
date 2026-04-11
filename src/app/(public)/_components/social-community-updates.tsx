'use client';

import React from 'react';
import { motion } from 'motion/react';
import {
  Calendar,
  ExternalLink,
  Github,
  Hash,
  MessageCircle,
  MessageSquare,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CopyLinkButton } from '@/components/header';

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
    name: 'Ethereum Magicians (EIPs)',
    description: 'Primary forum for EIP proposal discussions and feedback.',
    meta: 'Forum',
    url: 'https://ethereum-magicians.org/c/eips/14',
    icon: Hash,
    color: 'violet',
  },
  {
    name: 'Ethereum Research (Protocol)',
    description: 'Deep protocol research threads connected to standards work.',
    meta: 'Research',
    url: 'https://ethresear.ch/c/protocol/14',
    icon: MessageSquare,
    color: 'indigo',
  },
  {
    name: 'Ethereum PM (AllCoreDevs)',
    description: 'Official meeting agendas, updates, and coordination issues.',
    meta: 'Agendas',
    url: 'https://github.com/ethereum/pm/issues',
    icon: Github,
    color: 'slate',
  },
];

const communityStats = [
  {
    label: 'Active Contributors',
    value: '1,247',
    trend: '+12%',
    icon: Users,
    color: 'emerald',
    url: 'https://github.com/ethereum/EIPs/discussions',
  },
  {
    label: 'Monthly Discussions',
    value: '856',
    trend: '+24%',
    icon: MessageSquare,
    color: 'cyan',
    url: 'https://ethereum-magicians.org/',
  },
  {
    label: 'Community Events',
    value: '32',
    trend: '+8%',
    icon: Calendar,
    color: 'violet',
    url: 'https://github.com/ethereum/pm/issues/',
  },
];

const getColorClasses = (color: string) => {
  const colors: Record<string, { border: string; bg: string; icon: string }> = {
    emerald: { border: 'border-primary/30', bg: 'bg-primary/10', icon: 'text-primary' },
    cyan: { border: 'border-primary/30', bg: 'bg-primary/10', icon: 'text-primary' },
    violet: { border: 'border-primary/30', bg: 'bg-primary/10', icon: 'text-primary' },
    indigo: { border: 'border-primary/30', bg: 'bg-primary/10', icon: 'text-primary' },
    slate: { border: 'border-border', bg: 'bg-muted/60', icon: 'text-muted-foreground' },
  };
  return colors[color] || colors.cyan;
};

type SocialCommunityUpdatesProps = {
  showCommunityResources?: boolean;
  sectionTitleClass?: string;
  sectionSubtitleClass?: string;
};

export default function SocialCommunityUpdates({
  showCommunityResources = true,
  sectionTitleClass = 'text-4xl font-semibold tracking-tight sm:text-5xl',
  sectionSubtitleClass = 'text-sm text-muted-foreground',
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
        const payload = await res.json() as { events?: UpcomingEvent[]; syncedAt?: string };
        if (!cancelled) {
          setUpcomingEvents(payload.events ?? []);
          setEventsSyncedAt(payload.syncedAt ?? new Date().toISOString());
        }
      } catch (err) {
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
    <section className="w-full" id="social-community">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2">
            <h2 className={sectionTitleClass}>Social & Community Updates</h2>
            <CopyLinkButton sectionId="social-community" tooltipLabel="Copy link" className="h-8 w-8 rounded-md" />
          </div>
          <p className={cn('mt-1 leading-relaxed', sectionSubtitleClass)}>
            Discussions, channels, and events across the Ethereum standards ecosystem.
          </p>
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {communityStats.map((stat) => {
          const Icon = stat.icon;
          const colors = getColorClasses(stat.color);
          return (
            <a
              key={stat.label}
              href={stat.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-lg border border-border bg-card/60 p-3 transition hover:border-primary/40 hover:bg-muted/60"
            >
              <div className={cn('rounded-lg border p-2', colors.bg, colors.border)}>
                <Icon className={cn('h-4 w-4', colors.icon)} />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold leading-none text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
              <span className="ml-auto text-xs font-semibold text-primary">{stat.trend}</span>
            </a>
          );
        })}
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Discussions</h3>
          {sortedDiscussions.map((discussion) => (
            <motion.a
              key={discussion.id}
              href={discussion.url}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ y: -1 }}
              className="group flex flex-col rounded-lg border border-border bg-card/60 p-3 transition hover:border-primary/40"
            >
              <div className="mb-1 flex items-center gap-2">
                {discussion.isHot && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    <Zap className="h-3 w-3" /> Hot
                  </span>
                )}
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {discussion.category}
                </span>
              </div>
              <p className="text-sm font-medium text-foreground transition group-hover:text-primary">
                {discussion.title}
              </p>
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><MessageCircle className="h-3 w-3" />{discussion.replies}</span>
                <span className="inline-flex items-center gap-1"><TrendingUp className="h-3 w-3" />{discussion.views}</span>
                <span className="ml-auto">{discussion.lastActive}</span>
              </div>
            </motion.a>
          ))}
          <div className="rounded-lg border border-border bg-card/60 p-3">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Watchlist Topics</h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {['Account Abstraction', 'Rollup Standards (RIP/RRC)', 'Pectra Follow-ups', 'EIP Process & Tooling'].map((topic) => (
                <a
                  key={topic}
                  href="https://ethereum-magicians.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border border-border bg-muted/50 px-2.5 py-2 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-primary"
                >
                  {topic}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Community Channels</h3>
          {communityChannels.map((channel) => {
            const Icon = channel.icon;
            const colors = getColorClasses(channel.color);
            return (
              <a key={channel.name} href={channel.url} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-3 rounded-lg border border-border bg-card/60 p-3 transition hover:border-primary/40">
                <div className={cn('rounded-lg border p-2', colors.bg, colors.border)}>
                  <Icon className={cn('h-4 w-4', colors.icon)} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{channel.name}</p>
                  <p className="text-xs text-muted-foreground">{channel.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{channel.meta}</p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
              </a>
            );
          })}
          <h3 className="pt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Protocol Meetings</h3>
          <a
            href="https://calendar.google.com/calendar/embed?src=c_upaofong8mgrmrkegn7ic7hk5s%40group.calendar.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 transition hover:border-primary/45"
          >
            <div className="rounded-lg border border-primary/30 bg-primary/10 p-2">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">Upcoming protocol calendar</p>
              <p className="text-xs text-muted-foreground">
                Track AllCoreDevs, breakout rooms, and protocol coordination calls from the shared Ethereum PM calendar.
              </p>
            </div>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
          </a>
          {eventsSyncedAt ? (
            <p className="text-[11px] text-muted-foreground">
              Last synced {new Date(eventsSyncedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          ) : null}
          {eventsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={`upcoming-event-skeleton-${i}`} className="h-16 animate-pulse rounded-md border border-border bg-muted/40" />
              ))}
            </div>
          ) : upcomingEvents.length === 0 ? (
            <div className="rounded-md border border-border bg-muted/40 px-3 py-4 text-xs text-muted-foreground">
              No upcoming meeting agendas found right now. Check the full PM issue list.
            </div>
          ) : upcomingEvents.map((event) => {
            const Icon = event.type === 'Consensus'
              ? Users
              : event.type === 'Testing'
                ? MessageSquare
                : Calendar;
            return (
              <a key={event.id} href={event.url} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-3 rounded-lg border border-border bg-card/60 p-3 transition hover:border-primary/40">
                <div className="rounded-lg border border-primary/30 bg-primary/10 p-2">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{event.title}</p>
                  <p className="text-xs text-muted-foreground">{event.date} · {event.time} · {event.type}</p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
              </a>
            );
          })}

          {showCommunityResources && (
            <>
              <h3 className="pt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Community Resources</h3>
              <div className="rounded-lg border border-border bg-card/60 p-3">
                <div className="space-y-2 text-sm">
                  <a
                    href="https://eips.ethereum.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between text-muted-foreground transition hover:text-primary"
                  >
                    <span>Official EIPs Website</span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                  </a>
                  <a
                    href="https://github.com/ethereum/EIPs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between text-muted-foreground transition hover:text-primary"
                  >
                    <span>EIPs GitHub Repository</span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                  </a>
                  <a
                    href="https://github.com/ethereum/pm"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between text-muted-foreground transition hover:text-primary"
                  >
                    <span>Ethereum PM Repository</span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                  </a>
                  <a
                    href="https://ethresear.ch/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between text-muted-foreground transition hover:text-primary"
                  >
                    <span>Ethereum Research</span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                  </a>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
