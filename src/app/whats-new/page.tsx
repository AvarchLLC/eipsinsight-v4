"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  Compass,
  Hammer,
  Lightbulb,
  LineChart,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";
import { CopyLinkButton } from "@/components/header";

const USER_CHANGES = [
  {
    icon: Compass,
    title: "Clearer platform structure",
    description:
      "You can now navigate by intent with dedicated hubs for Explore, Insights, Tools, Resources, and People.",
  },
  {
    icon: Users,
    title: "Persona-driven discovery",
    description:
      "Editors, contributors, researchers, and ecosystem users can reach relevant pages and workflows faster.",
  },
  {
    icon: LineChart,
    title: "Better people & contributor visibility",
    description:
      "Dedicated people profiles and stronger role-based analytics improve contributor and reviewer visibility.",
  },
  {
    icon: Hammer,
    title: "Improved tools and workflows",
    description:
      "Board, dependencies, timeline, and builder experiences are grouped and easier to use together.",
  },
  {
    icon: Lightbulb,
    title: "Cleaner resources and public surfaces",
    description:
      "Landing, standards, dashboard, and resources are more consistent, readable, and easier to discover.",
  },
  {
    icon: Sparkles,
    title: "Membership and API experience",
    description:
      "Pricing, premium, billing, settings, and API token workflows are more tightly integrated.",
  },
];

const NAV_MAP = [
  {
    name: "Explore",
    description: "Browse by years, roles, status, and trending proposal activity.",
    href: "/explore",
  },
  {
    name: "Insights",
    description: "Deep analysis of governance, process health, and editorial trends.",
    href: "/insights",
  },
  {
    name: "Tools",
    description: "Board, dependencies, timeline, and EIP Builder workflows.",
    href: "/tools",
  },
  {
    name: "Resources",
    description: "Blogs, docs, videos, and learning content in one place.",
    href: "/resources",
  },
  {
    name: "People",
    description: "Contributor profiles and activity visibility by actor and role.",
    href: "/people/SamWilsn",
  },
];

const MOVED_PAGES = [
  "Status pages like Draft, Review, Final, and Stagnant are now grouped under Explore → Status.",
  "Board-focused workflows are grouped under Tools.",
  "Contributor and reviewer discovery is expanded across Explore, Insights, and People.",
  "Blog and learning content now lives under Resources.",
];

const TOUR_PANELS = [
  {
    title: "What changed for me?",
    text: "v4 makes standards, contributor signals, and workflows easier to find without jumping across disconnected pages.",
  },
  {
    title: "Why is this better?",
    text: "The new structure reduces friction: less hunting, better context, and clearer paths for different user goals.",
  },
  {
    title: "How do I use it now?",
    text: "Start in Explore for discovery, move to Insights for deeper analysis, and use Tools for operational workflows.",
  },
  {
    title: "What’s coming next?",
    text: "v4 is the foundation for richer personalization so the platform can surface more relevant pages and analytics over time.",
  },
];

export default function WhatsNewPage() {
  const [tourIndex, setTourIndex] = useState(0);

  const isFirst = tourIndex === 0;
  const isLast = tourIndex === TOUR_PANELS.length - 1;

  return (
    <div className="relative min-h-screen bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-primary/20 via-primary/5 to-transparent" />

      <div className="relative mx-auto w-full px-3 sm:px-4 lg:px-5 xl:px-6">
        <section id="whats-new-hero" className="mx-auto max-w-6xl py-10 sm:py-14">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-2xl border border-primary/25 bg-card/80 p-5 shadow-xl backdrop-blur-sm sm:p-8"
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                Introducing v4
              </span>
              <CopyLinkButton sectionId="whats-new-hero" className="h-7 w-7" />
            </div>
            <h1 className="text-balance text-3xl font-semibold leading-tight text-foreground sm:text-5xl">
              EIPsInsight v4 is here
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              A redesigned platform for exploring Ethereum standards, contributors,
              governance activity, and tools with clearer structure and a more
              personalized experience.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Link
                href="/explore"
                className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Start with Explore
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/insights"
                className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground hover:border-primary/40 hover:bg-primary/5"
              >
                Go to Insights
              </Link>
            </div>
          </motion.div>
        </section>

        <section id="guided-tour" className="mx-auto max-w-6xl pb-8 sm:pb-10">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
              Guided Tour
            </h2>
            <CopyLinkButton sectionId="guided-tour" className="h-7 w-7" />
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            A quick paginated walkthrough of what changed and how to use v4.
          </p>
          <div className="rounded-2xl border border-border bg-card/70 p-4 sm:p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={tourIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
                className="min-h-[140px]"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Step {tourIndex + 1} of {TOUR_PANELS.length}
                </p>
                <h3 className="mt-1 text-xl font-semibold text-foreground">
                  {TOUR_PANELS[tourIndex].title}
                </h3>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {TOUR_PANELS[tourIndex].text}
                </p>
              </motion.div>
            </AnimatePresence>
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                {TOUR_PANELS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setTourIndex(i)}
                    aria-label={`Go to step ${i + 1}`}
                    className={`h-2 rounded-full transition-all ${
                      i === tourIndex
                        ? "w-8 bg-primary"
                        : "w-2 bg-muted-foreground/35 hover:bg-muted-foreground/55"
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTourIndex((prev) => Math.max(prev - 1, 0))}
                  disabled={isFirst}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground hover:border-primary/40 hover:bg-primary/5 disabled:opacity-45"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    setTourIndex((prev) =>
                      Math.min(prev + 1, TOUR_PANELS.length - 1)
                    )
                  }
                  disabled={isLast}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground hover:border-primary/40 hover:bg-primary/5 disabled:opacity-45"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </section>

        <section id="whats-new" className="mx-auto max-w-6xl pb-8 sm:pb-10">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
              What&apos;s New for Users
            </h2>
            <CopyLinkButton sectionId="whats-new" className="h-7 w-7" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {USER_CHANGES.map((item, idx) => (
              <motion.article
                key={item.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.28, delay: idx * 0.03 }}
                className="rounded-xl border border-border bg-card/70 p-4"
              >
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md border border-primary/25 bg-primary/10">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </motion.article>
            ))}
          </div>
        </section>

        <section id="navigation-map" className="mx-auto max-w-6xl pb-8 sm:pb-10">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
              New Navigation Map
            </h2>
            <CopyLinkButton sectionId="navigation-map" className="h-7 w-7" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {NAV_MAP.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="group rounded-xl border border-border bg-card/70 p-4 transition-colors hover:border-primary/35 hover:bg-primary/5"
              >
                <p className="text-sm font-semibold text-foreground group-hover:text-primary">
                  {item.name}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section id="moved-pages" className="mx-auto max-w-6xl pb-8 sm:pb-10">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
              If You Used the Old Site
            </h2>
            <CopyLinkButton sectionId="moved-pages" className="h-7 w-7" />
          </div>
          <div className="rounded-xl border border-border bg-card/70 p-4 sm:p-5">
            <ul className="space-y-2.5">
              {MOVED_PAGES.map((item) => (
                <li
                  key={item}
                  className="rounded-md border border-border/80 bg-background/70 px-3 py-2 text-sm text-foreground/90"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="personas" className="mx-auto max-w-6xl pb-8 sm:pb-10">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
              Designed for Different Ways of Working
            </h2>
            <CopyLinkButton sectionId="personas" className="h-7 w-7" />
          </div>
          <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 sm:p-5">
            <p className="text-sm leading-relaxed text-foreground/90 sm:text-base">
              Whether you are an editor tracking review flow, a contributor
              following proposal momentum, a researcher exploring trend signals,
              or a broader ecosystem participant looking for context, v4 helps
              you reach the most relevant pages and workflows faster.
            </p>
          </div>
        </section>

        <section id="whats-next" className="mx-auto max-w-6xl pb-12 sm:pb-14">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
              What&apos;s Next
            </h2>
            <CopyLinkButton sectionId="whats-next" className="h-7 w-7" />
          </div>
          <div className="rounded-xl border border-border bg-card/70 p-4 sm:p-5">
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              v4 is the foundation for a more personalized EIPsInsight
              experience. Over time, we&apos;ll surface richer workflow-aware
              recommendations and more context-aware analytics tuned to how you
              use the platform.
            </p>
            <div className="mt-4">
              <div className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                <RefreshCw className="h-3.5 w-3.5" />
                Under the hood: a modernized platform foundation to support
                future features and scale.
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

