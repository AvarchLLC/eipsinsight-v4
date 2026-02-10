"use client";

import * as React from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePersonaStore } from "@/stores/personaStore";
import {
  getPersonaMeta,
  getUpgradeHighlights,
  type Persona,
  type UpgradeHighlight,
} from "@/lib/persona";
import { FEATURES } from "@/lib/features";

// =============================================================================
// PersonaView - Main wrapper component
// =============================================================================

interface PersonaViewProps {
  children: React.ReactNode;
  /** Page type for persona-specific highlights */
  page?: "upgrades" | "analytics" | "standards" | "tools";
  /** Custom highlights override */
  highlights?: UpgradeHighlight[];
  /** Additional class name for the wrapper */
  className?: string;
  /** Whether to show the persona badge */
  showBadge?: boolean;
}

/**
 * PersonaView wraps page content and adds persona-specific highlights
 * 
 * Usage:
 * ```tsx
 * <PersonaView page="upgrades">
 *   <UpgradeContent />
 * </PersonaView>
 * ```
 */
export function PersonaView({
  children,
  page,
  highlights: customHighlights,
  className,
  showBadge = true,
}: PersonaViewProps) {
  const { persona, isOnboarded, isHydrated } = usePersonaStore();

  // Don't show persona features if not enabled
  const showPersonaFeatures =
    (FEATURES.PERSONA_CONTEXT_HEADERS || FEATURES.PERSONA_SWITCHER) &&
    isHydrated &&
    isOnboarded;

  if (!showPersonaFeatures) {
    return <>{children}</>;
  }

  // Get highlights based on page type or use custom
  const highlights = customHighlights ?? (page === "upgrades" ? getUpgradeHighlights(persona) : undefined);
  const personaMeta = getPersonaMeta(persona);

  if (!persona) {
    return <>{children}</>;
  }

  return (
    <div className={className}>
      {/* Persona badge + highlights section */}
      {highlights && highlights.length > 0 && (
        <PersonaHighlightsSection
          persona={persona}
          personaMeta={personaMeta}
          highlights={highlights}
          showBadge={showBadge}
        />
      )}

      {/* Page content */}
      {children}
    </div>
  );
}

// =============================================================================
// PersonaHighlightsSection - Reusable highlights component
// =============================================================================

interface PersonaHighlightsSectionProps {
  persona: Persona;
  personaMeta: ReturnType<typeof getPersonaMeta>;
  highlights: UpgradeHighlight[];
  showBadge?: boolean;
  className?: string;
}

export function PersonaHighlightsSection({
  persona,
  personaMeta,
  highlights,
  showBadge = true,
  className,
}: PersonaHighlightsSectionProps) {
  const PersonaIcon = personaMeta.icon;

  return (
    <section className={cn("relative w-full bg-slate-950/30", className)}>
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {/* Persona badge */}
        {showBadge && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2 mb-4"
          >
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-blue-500/10 border border-cyan-400/20">
              <PersonaIcon className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-medium text-cyan-300">
                {personaMeta.shortLabel} View
              </span>
              <Sparkles className="h-3 w-3 text-emerald-400" />
            </div>
          </motion.div>
        )}

        {/* Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {highlights.map((highlight, index) => (
            <HighlightCard key={highlight.title} highlight={highlight} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// HighlightCard - Individual highlight card
// =============================================================================

interface HighlightCardProps {
  highlight: UpgradeHighlight;
  index: number;
}

function HighlightCard({ highlight, index }: HighlightCardProps) {
  return (
    <motion.div
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
  );
}

// =============================================================================
// Persona-specific content components (for direct use in pages)
// =============================================================================

interface PersonaContentProps<T> {
  /** Content map by persona */
  content: Partial<Record<Persona, T>>;
  /** Default content if persona not found */
  fallback: T;
  /** Render function */
  render: (content: T) => React.ReactNode;
}

/**
 * Render different content based on current persona
 * 
 * Usage:
 * ```tsx
 * <PersonaContent
 *   content={{
 *     developer: { title: "For Developers", ... },
 *     enterprise: { title: "Executive Summary", ... },
 *   }}
 *   fallback={{ title: "Overview", ... }}
 *   render={(content) => <Header title={content.title} />}
 * />
 * ```
 */
export function PersonaContent<T>({
  content,
  fallback,
  render,
}: PersonaContentProps<T>) {
  const { persona, isHydrated } = usePersonaStore();

  if (!isHydrated) {
    return render(fallback);
  }

  const personaContent = content[persona] ?? fallback;
  return render(personaContent);
}

// =============================================================================
// usePersonaContent hook (alternative to component)
// =============================================================================

/**
 * Hook to get persona-specific content
 * 
 * Usage:
 * ```tsx
 * const headerContent = usePersonaContent({
 *   developer: { title: "Technical Details" },
 *   enterprise: { title: "Business Impact" },
 * }, { title: "Overview" });
 * ```
 */
export function usePersonaContentHook<T>(
  contentMap: Partial<Record<Persona, T>>,
  fallback: T
): T {
  const { persona, isHydrated } = usePersonaStore();

  if (!isHydrated) {
    return fallback;
  }

  return contentMap[persona] ?? fallback;
}
