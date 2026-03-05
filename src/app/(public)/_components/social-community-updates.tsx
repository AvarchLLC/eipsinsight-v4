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
];

const upcomingEvents = [
  {
    id: 1,
    title: 'All Core Devs Call #184',
    date: 'Feb 27, 2026',
    time: '14:00 UTC',
    url: 'https://github.com/ethereum/pm/issues/',
    icon: Users,
  },
  {
    id: 2,
    title: 'EIP Editors Meeting',
    date: 'Feb 28, 2026',
    time: '15:00 UTC',
    url: 'https://github.com/ethereum/pm/issues/',
    icon: MessageSquare,
  },
  {
    id: 3,
    title: 'Community Office Hours',
    date: 'Mar 1, 2026',
    time: '16:00 UTC',
    url: 'https://ethereum-magicians.org/',
    icon: Calendar,
  },
];

const communityChannels = [
  {
    name: 'Discord',
    description: 'Real-time governance and standards discussions',
    members: '12.5k',
    url: 'https://discord.gg/ethereum',
    icon: MessageCircle,
    color: 'indigo',
  },
  {
    name: 'GitHub Discussions',
    description: 'Proposal feedback and technical design debate',
    members: '8.3k',
    url: 'https://github.com/ethereum/EIPs/discussions',
    icon: Github,
    color: 'slate',
  },
  {
    name: 'Ethereum Magicians',
    description: 'Long-form EIP and governance conversations',
    members: '15.2k',
    url: 'https://ethereum-magicians.org/',
    icon: Hash,
    color: 'violet',
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

export default function SocialCommunityUpdates() {
  return (
    <section className="w-full" id="social-community">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="dec-title persona-title text-2xl font-semibold tracking-tight sm:text-3xl">
          Social & Community Updates
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Discussions, channels, and events across the Ethereum standards ecosystem.
          </p>
        </div>
        <CopyLinkButton sectionId="social-community" className="h-8 w-8 rounded-md" />
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
          {communityDiscussions.map((discussion) => (
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
                  <p className="mt-1 text-xs text-muted-foreground">{channel.members}</p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
              </a>
            );
          })}
          <h3 className="pt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Upcoming Events</h3>
          {upcomingEvents.map((event) => {
            const Icon = event.icon;
            return (
              <a key={event.id} href={event.url} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-3 rounded-lg border border-border bg-card/60 p-3 transition hover:border-primary/40">
                <div className="rounded-lg border border-primary/30 bg-primary/10 p-2">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{event.title}</p>
                  <p className="text-xs text-muted-foreground">{event.date} · {event.time}</p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
              </a>
            );
          })}

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
        </div>
      </div>
    </section>
  );
}
