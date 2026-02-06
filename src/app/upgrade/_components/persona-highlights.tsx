"use client";

import * as React from "react";
import { motion } from "motion/react";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Clock,
  GitBranch,
  FileCode2,
  AlertTriangle,
  BookOpen,
  TrendingUp,
  Calendar,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePersonaStore } from "@/stores/personaStore";
import {
  getUpgradeHighlights,
  getPersonaMeta,
  getPersonaPageConfig,
  type Persona,
} from "@/lib/persona";
import { FEATURES } from "@/lib/features";

interface PersonaHighlightsProps {
  className?: string;
}

// =============================================================================
// Persona-specific intro content configuration
// =============================================================================

interface PersonaIntro {
  headline: string;
  subheadline: string;
  ctaLabel?: string;
  ctaLink?: string;
  stats?: Array<{
    label: string;
    value: string;
    icon: React.ElementType;
  }>;
}

const PERSONA_INTROS: Record<Persona, PersonaIntro> = {
  developer: {
    headline: "Track Network Forks & Implementation Details",
    subheadline:
      "Monitor activation epochs, client readiness status, and required consensus changes. Stay ahead of breaking changes and deprecations.",
    stats: [
      { label: "Next Fork", value: "Glamsterdam", icon: GitBranch },
      { label: "Target Epoch", value: "Q2 2026", icon: Clock },
      { label: "Core EIPs", value: "12", icon: FileCode2 },
    ],
  },
  editor: {
    headline: "Upgrade Pipeline & Editorial Status",
    subheadline:
      "Track which proposals are being considered for inclusion, monitor CFI status, and review the editorial queue for upgrade-bound EIPs.",
    ctaLabel: "Review Queue",
    ctaLink: "/all?status=review,last-call",
    stats: [
      { label: "CFI Proposals", value: "8", icon: FileCode2 },
      { label: "Pending Review", value: "3", icon: Clock },
      { label: "Recently Finalized", value: "5", icon: Sparkles },
    ],
  },
  researcher: {
    headline: "Upgrade Governance & Historical Analysis",
    subheadline:
      "Analyze how upgrade decisions are made, explore historical patterns in EIP inclusion, and track governance evolution across network forks.",
    ctaLabel: "View Analytics",
    ctaLink: "/analytics/prs",
    stats: [
      { label: "Total Upgrades", value: "18", icon: TrendingUp },
      { label: "Avg EIPs/Upgrade", value: "7.2", icon: FileCode2 },
      { label: "Avg Time to Fork", value: "8 mo", icon: Calendar },
    ],
  },
  builder: {
    headline: "What Changes Affect Your Project",
    subheadline:
      "Understand which upcoming protocol changes might impact your smart contracts or applications. Focus on breaking changes and new capabilities.",
    ctaLabel: "View ERCs",
    ctaLink: "/erc",
    stats: [
      { label: "New Opcodes", value: "3", icon: Zap },
      { label: "Gas Changes", value: "2", icon: AlertTriangle },
      { label: "New Precompiles", value: "1", icon: FileCode2 },
    ],
  },
  enterprise: {
    headline: "What's Changing & When",
    subheadline:
      "Plain-English summaries of upcoming Ethereum upgrades. Understand the timeline, business implications, and what actions you might need to take.",
    stats: [
      { label: "Next Upgrade", value: "Q2 2026", icon: Calendar },
      { label: "Risk Level", value: "Low", icon: AlertTriangle },
      { label: "Action Required", value: "Minimal", icon: Zap },
    ],
  },
  newcomer: {
    headline: "Understanding Ethereum Upgrades",
    subheadline:
      "Learn how Ethereum evolves through coordinated network upgrades. Explore the history of forks and understand how the community decides what changes to make.",
    ctaLabel: "Start Learning",
    ctaLink: "/resources/getting-started",
    stats: [
      { label: "What is a Fork?", value: "→", icon: BookOpen },
      { label: "Upgrade History", value: "→", icon: Clock },
      { label: "How EIPs Work", value: "→", icon: FileCode2 },
    ],
  },
};

export function PersonaHighlights({ className }: PersonaHighlightsProps) {
  const { persona, isOnboarded, isHydrated } = usePersonaStore();

  // Don't render if feature flags are disabled
  if (!FEATURES.PERSONA_CONTEXT_HEADERS && !FEATURES.PERSONA_SWITCHER) {
    return null;
  }

  // Show skeleton while hydrating
  if (!isHydrated) {
    return (
      <div
        className={cn(
          "container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6",
          className
        )}
      >
        <div className="h-24 rounded-xl bg-slate-800/50 animate-pulse mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 rounded-xl bg-slate-800/50 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  const highlights = getUpgradeHighlights(persona);
  const personaMeta = getPersonaMeta(persona);
  const pageConfig = getPersonaPageConfig(persona);
  const intro = PERSONA_INTROS[persona];
  const PersonaIcon = personaMeta.icon;

  return (
    <section className={cn("relative w-full", className)}>
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {/* Persona Context Header */}
        {isOnboarded && (
          <PersonaContextHeader
            personaMeta={personaMeta}
            intro={intro}
            pageConfig={pageConfig}
          />
        )}

        {/* Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {highlights.map((highlight, index) => (
            <motion.div
              key={highlight.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className={cn(
                "group relative p-5 rounded-xl",
                "bg-gradient-to-br from-slate-900/80 to-slate-950/80",
                "border border-slate-700/50",
                "hover:border-cyan-400/30 hover:shadow-lg hover:shadow-cyan-500/10",
                "transition-all duration-300"
              )}
            >
              {/* Gradient overlay on hover */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-500/5 via-cyan-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="relative z-10">
                <h3 className="text-sm font-semibold text-white mb-2 group-hover:text-cyan-100 transition-colors">
                  {highlight.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-3">
                  {highlight.description}
                </p>

                {highlight.ctaLabel && highlight.ctaLink && (
                  <Link
                    href={highlight.ctaLink}
                    className={cn(
                      "inline-flex items-center gap-1.5 text-xs font-medium",
                      "text-cyan-400 hover:text-emerald-400",
                      "transition-colors duration-200"
                    )}
                  >
                    {highlight.ctaLabel}
                    <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                )}
              </div>

              {/* Corner accent */}
              <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden rounded-tr-xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-cyan-500/10 to-transparent transform rotate-45 translate-x-16 -translate-y-16" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// Persona Context Header - Shows headline, stats, and "Viewing as" label
// =============================================================================

interface PersonaContextHeaderProps {
  personaMeta: ReturnType<typeof getPersonaMeta>;
  intro: PersonaIntro;
  pageConfig: ReturnType<typeof getPersonaPageConfig>;
}

function PersonaContextHeader({
  personaMeta,
  intro,
  pageConfig,
}: PersonaContextHeaderProps) {
  const PersonaIcon = personaMeta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-6"
    >
      {/* Viewing as badge */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-blue-500/10 border border-cyan-400/20">
          <PersonaIcon className="h-4 w-4 text-cyan-400" />
          <span className="text-xs text-slate-400">Viewing as:</span>
          <span className="text-xs font-medium text-cyan-300">
            {personaMeta.shortLabel}
          </span>
        </div>

        {/* Technical terms indicator */}
        {pageConfig.showTechnicalTerms && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
            <FileCode2 className="h-3 w-3" />
            <span>Technical details shown</span>
          </div>
        )}
      </div>

      {/* Intro section */}
      <div
        className={cn(
          "rounded-xl p-5",
          "bg-gradient-to-br from-slate-900/60 to-slate-950/60",
          "border border-slate-800/50"
        )}
      >
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-white mb-2">
              {intro.headline}
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              {intro.subheadline}
            </p>

            {intro.ctaLabel && intro.ctaLink && (
              <Link
                href={intro.ctaLink}
                className={cn(
                  "inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg text-sm font-medium",
                  "bg-cyan-500/10 text-cyan-400 border border-cyan-400/20",
                  "hover:bg-cyan-500/20 hover:border-cyan-400/40",
                  "transition-all duration-200"
                )}
              >
                {intro.ctaLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>

          {/* Quick stats */}
          {intro.stats && (
            <div className="flex flex-wrap lg:flex-nowrap gap-3">
              {intro.stats.map((stat) => {
                const StatIcon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg",
                      "bg-slate-800/50 border border-slate-700/50",
                      "min-w-[120px]"
                    )}
                  >
                    <StatIcon className="h-4 w-4 text-slate-500 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs text-slate-500 truncate">
                        {stat.label}
                      </div>
                      <div className="text-sm font-medium text-white">
                        {stat.value}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
