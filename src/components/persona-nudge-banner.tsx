"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePersonaStore } from "@/stores/personaStore";
import { FEATURES } from "@/lib/features";
import { PERSONAS, PERSONA_LIST } from "@/lib/persona";

interface PersonaNudgeBannerProps {
  className?: string;
  /** Variant style */
  variant?: "default" | "compact" | "card";
}

/**
 * Gentle nudge banner for persona selection
 * Only shown to users who haven't selected a persona yet
 */
export function PersonaNudgeBanner({
  className,
  variant = "default",
}: PersonaNudgeBannerProps) {
  const { isOnboarded, isHydrated } = usePersonaStore();
  const [isDismissed, setIsDismissed] = React.useState(false);

  // Check if dismissed in this session (using sessionStorage)
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const dismissed = sessionStorage.getItem("persona-nudge-dismissed");
      if (dismissed === "true") {
        setIsDismissed(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("persona-nudge-dismissed", "true");
    }
  };

  // Don't show if:
  // - Feature is disabled
  // - User already onboarded
  // - Not hydrated yet
  // - User dismissed the banner
  if (
    !FEATURES.PERSONA_SWITCHER ||
    isOnboarded ||
    !isHydrated ||
    isDismissed
  ) {
    return null;
  }

  if (variant === "compact") {
    return <CompactBanner onDismiss={handleDismiss} className={className} />;
  }

  if (variant === "card") {
    return <CardBanner onDismiss={handleDismiss} className={className} />;
  }

  return <DefaultBanner onDismiss={handleDismiss} className={className} />;
}

// =============================================================================
// Banner Variants
// =============================================================================

interface BannerVariantProps {
  onDismiss: () => void;
  className?: string;
}

function DefaultBanner({ onDismiss, className }: BannerVariantProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "relative overflow-hidden rounded-xl",
          "bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-blue-500/10",
          "border border-cyan-400/20",
          "p-4 sm:p-5",
          className
        )}
      >
        {/* Background decoration */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_right,_rgba(34,211,238,0.1),_transparent_50%)]" />

        <div className="relative flex items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            {/* Icon */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-cyan-400/20">
              <Sparkles className="h-5 w-5 text-cyan-400" />
            </div>

            {/* Content */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">
                Want a tailored experience?
              </h3>
              <p className="text-xs text-slate-400 max-w-md">
                Pick a persona to customize navigation, highlights, and defaults
                based on how you use EIPsInsight.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/p"
              className={cn(
                "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium",
                "bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500",
                "text-white shadow-lg shadow-cyan-500/20",
                "hover:shadow-cyan-500/30 hover:scale-105",
                "transition-all duration-200"
              )}
            >
              Choose persona
              <ArrowRight className="h-4 w-4" />
            </Link>

            <button
              onClick={onDismiss}
              className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800/50 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function CompactBanner({ onDismiss, className }: BannerVariantProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg",
          "bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-blue-500/10",
          "border border-cyan-400/20",
          className
        )}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cyan-400" />
          <span className="text-sm text-slate-300">
            Personalize your experience
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/p"
            className="text-sm font-medium text-cyan-400 hover:text-emerald-400 transition-colors"
          >
            Choose persona
          </Link>
          <button
            onClick={onDismiss}
            className="p-1 rounded text-slate-500 hover:text-white transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function CardBanner({ onDismiss, className }: BannerVariantProps) {
  // Show a few persona icons as preview
  const previewPersonas = PERSONA_LIST.slice(0, 4);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "relative overflow-hidden rounded-2xl",
          "bg-gradient-to-br from-slate-900/90 to-slate-950/90",
          "border border-cyan-400/20",
          "p-6",
          className
        )}
      >
        {/* Dismiss button */}
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800/50 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Content */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-400/20 mb-4">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-xs font-medium text-cyan-300">
              Personalized Experience
            </span>
          </div>

          <h3 className="text-lg font-semibold text-white mb-2">
            How do you use EIPsInsight?
          </h3>
          <p className="text-sm text-slate-400 mb-6 max-w-sm mx-auto">
            Select your role to get tailored navigation, highlights, and
            defaults.
          </p>

          {/* Persona preview icons */}
          <div className="flex items-center justify-center gap-3 mb-6">
            {previewPersonas.map((personaId) => {
              const persona = PERSONAS[personaId];
              const Icon = persona.icon;
              return (
                <div
                  key={personaId}
                  className="w-10 h-10 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center"
                  title={persona.shortLabel}
                >
                  <Icon className="h-5 w-5 text-slate-400" />
                </div>
              );
            })}
            <div className="w-10 h-10 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center text-xs text-slate-500">
              +2
            </div>
          </div>

          <Link
            href="/p"
            className={cn(
              "inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium",
              "bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500",
              "text-white shadow-lg shadow-cyan-500/20",
              "hover:shadow-cyan-500/30 hover:scale-105",
              "transition-all duration-200"
            )}
          >
            Choose your persona
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
