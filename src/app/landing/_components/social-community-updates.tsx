"use client";

import React from "react";
import { motion } from "motion/react";
import { 
  MessageCircle, 
  Users, 
  Calendar,
  ExternalLink,
  Github,
  MessageSquare,
  Hash,
  TrendingUp,
  Zap
} from "lucide-react";
import { PageHeader } from "@/components/header";
import { cn } from "@/lib/utils";

// Community discussions data
const communityDiscussions = [
  {
    id: 1,
    title: "EIP-7702: Set EOA account code for one transaction",
    platform: "Ethereum Magicians",
    category: "Core",
    replies: 87,
    views: 2340,
    lastActive: "2 hours ago",
    url: "https://ethereum-magicians.org/t/eip-7702-set-eoa-account-code-for-one-transaction/19923",
    isHot: true,
  },
  {
    id: 2,
    title: "Account Abstraction roadmap discussion",
    platform: "Ethereum Research",
    category: "ERC",
    replies: 156,
    views: 4820,
    lastActive: "5 hours ago",
    url: "https://ethresear.ch/t/account-abstraction-roadmap/",
    isHot: true,
  },
  {
    id: 3,
    title: "EIP Review Process Improvements",
    platform: "AllCoreDevs",
    category: "Meta",
    replies: 43,
    views: 1230,
    lastActive: "1 day ago",
    url: "https://github.com/ethereum/pm/issues/",
    isHot: false,
  },
  {
    id: 4,
    title: "Verkle Trees Implementation Updates",
    platform: "Ethereum Research",
    category: "Core",
    replies: 92,
    views: 3150,
    lastActive: "3 days ago",
    url: "https://ethresear.ch/",
    isHot: false,
  },
];

// Community events
const upcomingEvents = [
  {
    id: 1,
    title: "All Core Devs Call #184",
    date: "Feb 27, 2026",
    time: "14:00 UTC",
    type: "Call",
    url: "https://github.com/ethereum/pm/issues/",
    icon: Users,
  },
  {
    id: 2,
    title: "EIP Editors Meeting",
    date: "Feb 28, 2026",
    time: "15:00 UTC",
    type: "Meeting",
    url: "https://github.com/ethereum/pm/issues/",
    icon: MessageSquare,
  },
  {
    id: 3,
    title: "Community Office Hours",
    date: "Mar 1, 2026",
    time: "16:00 UTC",
    type: "Community",
    url: "https://ethereum-magicians.org/",
    icon: Calendar,
  },
];

// Community channels
const communityChannels = [
  {
    name: "Discord",
    description: "Join our Discord server for real-time discussions",
    members: "12.5k",
    url: "https://discord.gg/ethereum",
    icon: MessageCircle,
    color: "indigo",
  },
  {
    name: "GitHub Discussions",
    description: "Technical discussions and proposal feedback",
    members: "8.3k",
    url: "https://github.com/ethereum/EIPs/discussions",
    icon: Github,
    color: "slate",
  },
  {
    name: "Ethereum Magicians",
    description: "Community forum for EIP discussions",
    members: "15.2k",
    url: "https://ethereum-magicians.org/",
    icon: Hash,
    color: "violet",
  },
];

// Community stats
const communityStats = [
  {
    label: "Active Contributors",
    value: "1,247",
    trend: "+12%",
    icon: Users,
    color: "emerald",
  },
  {
    label: "Monthly Discussions",
    value: "856",
    trend: "+24%",
    icon: MessageSquare,
    color: "cyan",
  },
  {
    label: "Community Events",
    value: "32",
    trend: "+8%",
    icon: Calendar,
    color: "violet",
  },
];

const getColorClasses = (color: string) => {
  const colors: Record<string, { border: string; bg: string; text: string; icon: string }> = {
    emerald: {
      border: "border-emerald-400/30",
      bg: "bg-emerald-500/10",
      text: "text-emerald-700 dark:text-emerald-300",
      icon: "text-emerald-500",
    },
    cyan: {
      border: "border-cyan-400/30",
      bg: "bg-cyan-500/10",
      text: "text-cyan-700 dark:text-cyan-300",
      icon: "text-cyan-500",
    },
    violet: {
      border: "border-violet-400/30",
      bg: "bg-violet-500/10",
      text: "text-violet-700 dark:text-violet-300",
      icon: "text-violet-500",
    },
    indigo: {
      border: "border-indigo-400/30",
      bg: "bg-indigo-500/10",
      text: "text-indigo-700 dark:text-indigo-300",
      icon: "text-indigo-500",
    },
    slate: {
      border: "border-slate-400/30",
      bg: "bg-slate-500/10",
      text: "text-slate-700 dark:text-slate-300",
      icon: "text-slate-500",
    },
  };
  return colors[color] || colors.cyan;
};

const DiscussionCard = ({ discussion }: { discussion: typeof communityDiscussions[0] }) => {
  return (
    <motion.a
      href={discussion.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.3 }}
      className="group relative flex flex-col rounded-lg border border-slate-200 dark:border-slate-700/50 bg-linear-to-br from-white via-slate-50 to-white dark:from-slate-900/60 dark:via-slate-900/50 dark:to-slate-900/60 p-4 backdrop-blur-sm transition-all duration-300 hover:border-cyan-400/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {discussion.isHot && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 border border-orange-400/30 px-2 py-0.5 text-xs font-semibold text-orange-600 dark:text-orange-400">
                <Zap className="h-3 w-3" />
                Hot
              </span>
            )}
            <span className="rounded-full bg-cyan-500/10 border border-cyan-400/30 px-2 py-0.5 text-xs font-semibold text-cyan-700 dark:text-cyan-300">
              {discussion.category}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
            {discussion.title}
          </h3>
        </div>
        <ExternalLink className="h-4 w-4 text-slate-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1">
          <MessageCircle className="h-3 w-3" />
          {discussion.replies}
        </span>
        <span className="flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          {discussion.views}
        </span>
        <span className="ml-auto">{discussion.lastActive}</span>
      </div>

      <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
        {discussion.platform}
      </div>
    </motion.a>
  );
};

const EventCard = ({ event }: { event: typeof upcomingEvents[0] }) => {
  const Icon = event.icon;
  return (
    <motion.a
      href={event.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, x: -10 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.3 }}
      className="group flex items-start gap-3 rounded-lg border border-slate-200 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/30 p-3 backdrop-blur-sm transition-all duration-200 hover:border-cyan-400/40 hover:bg-white dark:hover:bg-slate-900/50"
    >
      <div className="rounded-lg bg-cyan-500/10 border border-cyan-400/30 p-2">
        <Icon className="h-4 w-4 text-cyan-500" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-1 mb-1">
          {event.title}
        </h4>
        <div className="text-xs text-slate-600 dark:text-slate-400">
          <span className="font-medium">{event.date}</span>
          <span className="mx-1">·</span>
          <span>{event.time}</span>
        </div>
      </div>
      <ExternalLink className="h-3.5 w-3.5 text-slate-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </motion.a>
  );
};

const ChannelCard = ({ channel }: { channel: typeof communityChannels[0] }) => {
  const Icon = channel.icon;
  const colors = getColorClasses(channel.color);

  return (
    <motion.a
      href={channel.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.3 }}
      className="group relative flex items-start gap-3 rounded-lg border border-slate-200 dark:border-slate-700/50 bg-linear-to-br from-white via-slate-50 to-white dark:from-slate-900/60 dark:via-slate-900/50 dark:to-slate-900/60 p-4 backdrop-blur-sm transition-all duration-300 hover:border-cyan-400/40 hover:shadow-md"
    >
      <div className={cn("rounded-lg border p-2", colors.bg, colors.border)}>
        <Icon className={cn("h-4 w-4", colors.icon)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {channel.name}
          </h4>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {channel.members}
          </span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
          {channel.description}
        </p>
      </div>
      <ExternalLink className="h-3.5 w-3.5 text-slate-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </motion.a>
  );
};

const StatCard = ({ stat }: { stat: typeof communityStats[0] }) => {
  const Icon = stat.icon;
  const colors = getColorClasses(stat.color);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.3 }}
      className="relative flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700/50 bg-linear-to-br from-white via-slate-50 to-white dark:from-slate-900/60 dark:via-slate-900/50 dark:to-slate-900/60 p-4 backdrop-blur-sm"
    >
      <div className={cn("rounded-lg border p-2", colors.bg, colors.border)}>
        <Icon className={cn("h-5 w-5", colors.icon)} />
      </div>
      <div className="flex-1">
        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {stat.value}
        </div>
        <div className="text-xs text-slate-600 dark:text-slate-400">
          {stat.label}
        </div>
      </div>
      <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
        {stat.trend}
      </div>
    </motion.div>
  );
};

export default function SocialCommunityUpdates() {
  return (
    <>
      <PageHeader
        title="Social & Community Updates"
        description="Connect with the Ethereum governance community"
        sectionId="social-community"
        className="bg-linear-to-b from-slate-50/50 to-white dark:from-slate-950/50 dark:to-slate-900/30"
      />
      <section className="relative w-full bg-linear-to-b from-white to-slate-50/50 dark:from-slate-900/30 dark:to-slate-950/50">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12">
          
          {/* Community Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
          >
            {communityStats.map((stat, index) => (
              <StatCard key={index} stat={stat} />
            ))}
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Active Discussions - Left Column (2/3) */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                    Active Discussions
                  </h3>
                  <a
                    href="https://ethereum-magicians.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors"
                  >
                    View all →
                  </a>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {communityDiscussions.map((discussion) => (
                    <DiscussionCard key={discussion.id} discussion={discussion} />
                  ))}
                </div>
              </div>

              {/* Community Channels */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
                  Join the Community
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {communityChannels.map((channel, index) => (
                    <ChannelCard key={index} channel={channel} />
                  ))}
                </div>
              </div>
            </div>

            {/* Upcoming Events - Right Column (1/3) */}
            <div className="lg:col-span-1">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
                Upcoming Events
              </h3>
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>

              {/* Community Resources */}
              <div className="mt-6 rounded-lg border border-slate-200 dark:border-slate-700/50 bg-linear-to-br from-cyan-50/50 via-white to-cyan-50/30 dark:from-cyan-950/20 dark:via-slate-900/50 dark:to-cyan-950/10 p-4 backdrop-blur-sm">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
                  Community Resources
                </h4>
                <div className="space-y-2 text-sm">
                  <a
                    href="https://eips.ethereum.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between group text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                  >
                    <span>Official EIPs Website</span>
                    <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                  <a
                    href="https://github.com/ethereum/EIPs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between group text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                  >
                    <span>EIPs GitHub Repository</span>
                    <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                  <a
                    href="https://github.com/ethereum/pm"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between group text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                  >
                    <span>Project Management</span>
                    <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                  <a
                    href="https://ethresear.ch/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between group text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                  >
                    <span>Ethereum Research</span>
                    <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
