"use client";

import * as React from "react";
import Link from "next/link";
import { Sparkles, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePersonaStore } from "@/stores/personaStore";
import { getPersonaMeta } from "@/lib/persona";
import { FEATURES } from "@/lib/features";

interface PersonaContextLabelProps {
  className?: string;
  /** Variant style */
  variant?: "default" | "minimal" | "inline";
  /** Show settings link */
  showSettings?: boolean;
  /** Page name for context */
  pageName?: string;
}

/**
 * Shows "Viewing as: [Persona]" label on pages
 * Provides context about how the page is personalized
 */
export function PersonaContextLabel({
  className,
  variant = "default",
  showSettings = false,
  pageName,
}: PersonaContextLabelProps) {
  const { persona, isOnboarded, isHydrated } = usePersonaStore();

  // Don't show if features disabled or not onboarded
  const showLabel =
    (FEATURES.PERSONA_CONTEXT_HEADERS || FEATURES.PERSONA_SWITCHER) &&
    isHydrated &&
    isOnboarded;

  if (!showLabel) {
    return null;
  }

  const personaMeta = getPersonaMeta(persona);
  const PersonaIcon = personaMeta.icon;

  if (variant === "minimal") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 text-xs text-slate-500",
          className
        )}
      >
        <PersonaIcon className="h-3 w-3 text-slate-500" />
        <span>{personaMeta.shortLabel} view</span>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full",
          "bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50",
          "text-xs text-slate-600 dark:text-slate-400",
          className
        )}
      >
        <PersonaIcon className="h-3 w-3 text-cyan-700 dark:text-cyan-400" />
        <span className="text-cyan-700 dark:text-cyan-300">{personaMeta.shortLabel}</span>
      </span>
    );
  }

  // Default variant
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-4 py-2 rounded-lg",
        "bg-gradient-to-r from-slate-100 to-white dark:from-slate-800/50 dark:to-slate-800/30",
        "border border-slate-300 dark:border-slate-700/50",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {pageName ? `${pageName} · ` : ""}Viewing as:
        </span>
        <div className="flex items-center gap-1.5">
          <PersonaIcon className="h-3.5 w-3.5 text-cyan-700 dark:text-cyan-400" />
          <span className="text-xs font-medium text-cyan-700 dark:text-cyan-300">
            {personaMeta.shortLabel}
          </span>
        </div>
      </div>

      {showSettings && (
        <Link
          href="/p"
          className={cn(
            "flex items-center gap-1 text-xs text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300",
            "transition-colors duration-200"
          )}
        >
          <Settings2 className="h-3 w-3" />
          <span className="hidden sm:inline">Change</span>
        </Link>
      )}
    </div>
  );
}

/**
 * Inline persona badge for use in headers/titles
 */
export function PersonaBadge({ className }: { className?: string }) {
  const { persona, isOnboarded, isHydrated } = usePersonaStore();

  const showBadge =
    (FEATURES.PERSONA_CONTEXT_HEADERS || FEATURES.PERSONA_SWITCHER) &&
    isHydrated &&
    isOnboarded;

  if (!showBadge) {
    return null;
  }

  const personaMeta = getPersonaMeta(persona);
  const PersonaIcon = personaMeta.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full",
        "bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-blue-500/10",
        "border border-cyan-400/20",
        className
      )}
    >
      <PersonaIcon className="h-3.5 w-3.5 text-cyan-700 dark:text-cyan-400" />
      <span className="text-xs font-medium text-cyan-700 dark:text-cyan-300">
        {personaMeta.shortLabel}
      </span>
    </span>
  );
}
