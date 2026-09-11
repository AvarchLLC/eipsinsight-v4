"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Compass,
  ExternalLink,
  FolderSearch,
  Hammer,
  Lightbulb,
  LineChart,
  RefreshCw,
  Sparkles,
  UserCheck,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import { CopyLinkButton } from "@/components/header";
import { cn } from "@/lib/utils";

const USER_CHANGES = [
  {
    icon: Compass,
    title: "Intent-Based Navigation",
    description:
      "Seamlessly switch between Explore, Insights, Tools, Resources, and People without getting lost in nested menus.",
    badge: "Structure",
    link: "/explore",
    linkText: "Explore Platform",
  },
  {
    icon: Users,
    title: "Role-Focused Workflows",
    description:
      "Whether you're an EIP editor, proposal author, researcher, or core dev, find relevant tools and metrics instantly.",
    badge: "Workflows",
    link: "/explore/roles",
    linkText: "View Roles",
  },
  {
    icon: LineChart,
    title: "Contributor & Reviewer Analytics",
    description:
      "Transparent reviewer workload metrics, contributor profiles, and historical activity tracking.",
    badge: "Analytics",
    link: "/analytics/contributors",
    linkText: "See Analytics",
  },
  {
    icon: Hammer,
    title: "Unified Workspace & Tools",
    description:
      "Access EIP Builder, All Board Meetings agenda, timelines, and proposal dependency graphs in one hub.",
    badge: "Developer Tools",
    link: "/tools",
    linkText: "Open Tools",
  },
  {
    icon: Lightbulb,
    title: "Centralized Resource Hub",
    description:
      "Explore blogs, video walkthroughs, documentation, and educational content organized in one place.",
    badge: "Learning",
    link: "/resources",
    linkText: "Browse Resources",
  },
  {
    icon: Sparkles,
    title: "Integrated Account & API Access",
    description:
      "Manage subscriptions, generate API tokens, customize billing, and sync preferences effortlessly.",
    badge: "Account & API",
    link: "/api-tokens",
    linkText: "Manage Tokens",
  },
];

const NAV_MAP = [
  {
    name: "Explore",
    icon: FolderSearch,
    description: "Browse by proposal status, categories, draft years, and trending EIPs.",
    href: "/explore",
    highlights: ["Status Filter", "Years Archive", "Trending Proposals"],
  },
  {
    name: "Insights",
    icon: LineChart,
    description: "Deep analytics on editorial throughput, governance health, and consensus process.",
    href: "/insights",
    highlights: ["Reviewer Queue", "Monthly Recap", "Process Health"],
  },
  {
    name: "Tools",
    icon: Wrench,
    description: "Operate with EIP Builder, Board Meetings, timeline views, and dependency graphs.",
    href: "/tools",
    highlights: ["EIP Builder", "Board Agenda", "Dependencies"],
  },
  {
    name: "Resources",
    icon: BookOpen,
    description: "Articles, technical documentation, video guides, and ecosystem updates.",
    href: "/resources",
    highlights: ["Blogs & News", "Video Guides", "Documentation"],
  },
  {
    name: "People",
    icon: UserCheck,
    description: "Dedicated profiles for EIP authors, core contributors, and editorial reviewers.",
    href: "/people/SamWilsn",
    highlights: ["Contributor Cards", "Review Activity", "Actor Profiles"],
  },
];

const MOVED_PAGES = [
  {
    from: "Old Draft, Review, Final Status Pages",
    to: "Explore → Status",
    description: "Filter all Ethereum standards by official status with live status counters.",
    href: "/explore/status",
  },
  {
    from: "Board Meetings & EIP Builder",
    to: "Tools Hub",
    description: "Access builder wizards and board meeting agendas in the Tools workspace.",
    href: "/tools",
  },
  {
    from: "Contributor & Author Directories",
    to: "People & Analytics Hub",
    description: "Inspect reviewer metrics, author contributions, and actor profiles.",
    href: "/analytics/contributors",
  },
  {
    from: "Blogs, Video Tutorials & Documentation",
    to: "Resources Hub",
    description: "Read technical breakdown blogs, watch tutorials, and view guides.",
    href: "/resources",
  },
];

const TOUR_PANELS = [
  {
    icon: Compass,
    title: "Seamless Navigation & Clear Hierarchy",
    subtitle: "Navigate by Intent",
    text: "EIPsInsight organizes all Ethereum standards, contributor signals, and governance tools into five clear hubs: Explore, Insights, Tools, Resources, and People.",
    actionLink: "/explore",
    actionText: "Explore Hubs",
  },
  {
    icon: Zap,
    title: "Faster Discovery & Powerful Search",
    subtitle: "Instant Lookup",
    text: "Find any EIP, ERC, or RIP instantly using global search (⌘K / Ctrl+K), search by author, or filter by category and consensus status.",
    actionLink: "/search",
    actionText: "Try Search",
  },
  {
    icon: Wrench,
    title: "Developer & Contributor Workflows",
    subtitle: "Built for Contributors",
    text: "Draft standard proposals with EIP Builder, inspect proposal dependency graphs, and track All Core Devs (ACD) board agendas in real-time.",
    actionLink: "/tools",
    actionText: "Open Tools",
  },
  {
    icon: Sparkles,
    title: "Real-Time Signals & Ecosystem Analytics",
    subtitle: "Governance Intelligence",
    text: "Track editorial review queues, author velocity, and consensus upgrades with live analytics backed by continuous blockchain and GitHub indexing.",
    actionLink: "/insights",
    actionText: "View Insights",
  },
];

export default function WhatsNewPage() {
  const [tourIndex, setTourIndex] = useState(0);

  const isFirst = tourIndex === 0;
  const isLast = tourIndex === TOUR_PANELS.length - 1;
  const activeStep = TOUR_PANELS[tourIndex];

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      {/* Background radial glow following theme accent */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_at_top,rgba(var(--persona-accent-rgb),0.15),transparent_70%)]" />

      <div className="relative mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 space-y-12">
        {/* ─── Hero Section ─── */}
        <section id="whats-new-hero">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="persona-glow relative overflow-hidden rounded-3xl border border-border bg-card/80 p-6 shadow-2xl backdrop-blur-xl sm:p-10"
          >
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wider text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  What&apos;s New
                </span>
                <CopyLinkButton sectionId="whats-new-hero" className="h-8 w-8 rounded-lg border border-border bg-background/60" />
              </div>

              <h1 className="dec-title persona-title text-balance text-3xl font-bold tracking-tight leading-[1.1] text-foreground sm:text-5xl lg:text-6xl">
                What&apos;s New in EIPsInsight
              </h1>

              <p className="max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Explore Ethereum standards, contributor metrics, governance activity, and tools with a clear, intuitive structure built for developers, editors, and researchers.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/explore"
                  className="inline-flex items-center gap-2 rounded-xl persona-gradient px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:opacity-90 hover:scale-[1.02]"
                >
                  Start Exploring
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/insights"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/80 px-5 py-2.5 text-sm font-medium text-foreground backdrop-blur-md transition-all hover:border-primary/40 hover:bg-primary/5"
                >
                  View Analytics
                </Link>
                <Link
                  href="/tools"
                  className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-muted/40 px-4 py-2.5 text-sm text-muted-foreground transition-all hover:bg-muted/80 hover:text-foreground"
                >
                  <Wrench className="h-4 w-4 text-primary" />
                  Open Tools
                </Link>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ─── Interactive Overview (Guided Tour) ─── */}
        <section id="guided-tour" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="dec-title persona-title text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Platform Walkthrough
              </h2>
              <CopyLinkButton sectionId="guided-tour" className="h-7 w-7" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground">
              Step {tourIndex + 1} of {TOUR_PANELS.length}
            </span>
          </div>

          <p className="text-sm text-muted-foreground">
            Click through the core highlights below to understand key workflows and improvements.
          </p>

          <div className="rounded-3xl border border-border bg-card/70 p-6 shadow-xl backdrop-blur-md space-y-6">
            {/* Step trigger pills */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TOUR_PANELS.map((step, idx) => {
                const Icon = step.icon;
                const isActive = idx === tourIndex;
                return (
                  <button
                    key={step.title}
                    type="button"
                    onClick={() => setTourIndex(idx)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all duration-200",
                      isActive
                        ? "border-primary/50 bg-primary/10 shadow-[0_0_0_1px_rgb(var(--persona-accent-rgb)/0.2)]"
                        : "border-border/70 bg-background/50 hover:border-primary/30 hover:bg-muted/40"
                    )}
                  >
                    <div className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                      isActive ? "border-primary/30 bg-primary/15 text-primary" : "border-border bg-muted/60 text-muted-foreground"
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Step {idx + 1}</p>
                      <p className="truncate text-xs font-semibold text-foreground">{step.subtitle}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Step Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={tourIndex}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="rounded-2xl border border-border/80 bg-background/70 p-6 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
                      <activeStep.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                        {activeStep.subtitle}
                      </span>
                      <h3 className="text-xl font-bold text-foreground sm:text-2xl">
                        {activeStep.title}
                      </h3>
                    </div>
                  </div>

                  <Link
                    href={activeStep.actionLink}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                  >
                    {activeStep.actionText}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {activeStep.text}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-1.5">
                {TOUR_PANELS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setTourIndex(i)}
                    aria-label={`Go to step ${i + 1}`}
                    className={cn(
                      "h-2 rounded-full transition-all duration-300",
                      i === tourIndex ? "w-8 bg-primary" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/60"
                    )}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTourIndex((prev) => Math.max(prev - 1, 0))}
                  disabled={isFirst}
                  className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-3.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => setTourIndex((prev) => Math.min(prev + 1, TOUR_PANELS.length - 1))}
                  disabled={isLast}
                  className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-3.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Platform Features & Improvements ─── */}
        <section id="whats-new" className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="dec-title persona-title text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Key Enhancements
            </h2>
            <CopyLinkButton sectionId="whats-new" className="h-7 w-7" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {USER_CHANGES.map((item, idx) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ duration: 0.3, delay: idx * 0.04 }}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card/70 p-5 shadow-lg backdrop-blur-md transition-all duration-300 hover:border-primary/40 hover:bg-card/90 hover:shadow-xl"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <span className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                      {item.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/50">
                  <Link
                    href={item.link}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary transition-all group-hover:translate-x-0.5"
                  >
                    {item.linkText}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ─── Navigation Map ─── */}
        <section id="navigation-map" className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="dec-title persona-title text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Navigation Map
            </h2>
            <CopyLinkButton sectionId="navigation-map" className="h-7 w-7" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {NAV_MAP.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card/70 p-5 shadow-lg backdrop-blur-md transition-all duration-300 hover:border-primary/40 hover:bg-card/90 hover:shadow-xl"
                >
                  <div className="space-y-3">
                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                      <Icon className="h-4 w-4" />
                    </div>

                    <div>
                      <p className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                        {item.name}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/50 space-y-1.5">
                    {item.highlights.map((tag) => (
                      <div key={tag} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                        <span>{tag}</span>
                      </div>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ─── Quick Page Directory ─── */}
        <section id="moved-pages" className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="dec-title persona-title text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Quick Page Directory
            </h2>
            <CopyLinkButton sectionId="moved-pages" className="h-7 w-7" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {MOVED_PAGES.map((item) => (
              <Link
                key={item.from}
                href={item.href}
                className="group flex flex-col justify-between rounded-2xl border border-border bg-card/70 p-4 backdrop-blur-md transition-all hover:border-primary/40 hover:bg-card/90"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">{item.from}</span>
                    <span className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      {item.to}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground/90">{item.description}</p>
                </div>
                <div className="mt-3 flex items-center justify-end text-xs font-medium text-primary group-hover:underline">
                  Jump to page <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ─── Footer CTA / What's Next ─── */}
        <section id="whats-next">
          <div className="persona-glow rounded-3xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 shadow-xl backdrop-blur-md sm:p-8 space-y-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground sm:text-2xl">
                Continuous Enhancements
              </h2>
            </div>

            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              EIPsInsight is continuously updated with real-time GitHub indexing, live ACD board agendas, and deep Ethereum governance analytics.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 rounded-xl persona-gradient px-4 py-2 text-xs font-semibold text-primary-foreground shadow-md transition-all hover:opacity-90"
              >
                Start Exploring Platform
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/resources/docs"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/80 px-4 py-2 text-xs font-medium text-foreground transition-all hover:border-primary/40"
              >
                View Documentation
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}



