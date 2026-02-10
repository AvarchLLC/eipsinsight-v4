"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePersonaStore } from "@/stores/personaStore";
import { usePersonaSyncOnChange } from "@/hooks/usePersonaSync";
import {
  PERSONAS,
  PERSONA_LIST,
  type Persona,
} from "@/lib/persona";
import { FEATURES } from "@/lib/features";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PersonaSwitcherProps {
  className?: string;
  compact?: boolean;
}

export function PersonaSwitcher({ className, compact = false }: PersonaSwitcherProps) {
  const { persona, setPersona, isOnboarded, isHydrated } = usePersonaStore();
  const { syncPersonaToServer, isAuthenticated } = usePersonaSyncOnChange();

  // Don't render if feature is disabled
  if (!FEATURES.PERSONA_SWITCHER) {
    return null;
  }

  // Show skeleton while hydrating
  if (!isHydrated) {
    return (
      <div
        className={cn(
          "h-9 rounded-lg bg-slate-800/50 animate-pulse",
          compact ? "w-9" : "w-32",
          className
        )}
      />
    );
  }

  // If persona is not yet set, don't try to index into PERSONAS
  if (!persona) {
    return null;
  }

  const currentPersona = PERSONAS[persona];
  const CurrentIcon = currentPersona.icon;

  const handleSelectPersona = (newPersona: Persona) => {
    if (newPersona !== persona) {
      setPersona(newPersona);
      // Sync to server if user is authenticated
      if (isAuthenticated) {
        syncPersonaToServer(newPersona);
      }
    }
  };

  // Show "Choose your persona" prompt for new users who haven't onboarded
  if (!isOnboarded && !compact) {
    return (
      <Link
        href="/p"
        className={cn(
          "group relative flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200",
          "bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-blue-500/10",
          "border border-cyan-400/30 hover:border-cyan-400/50",
          "hover:shadow-[0_0_20px_rgba(34,211,238,0.15)]",
          "focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:ring-offset-2 focus:ring-offset-slate-950",
          className
        )}
      >
        {/* Animated indicator */}
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
        </span>

        <Sparkles className="h-4 w-4 text-cyan-400 group-hover:text-emerald-400 transition-colors" />
        <span className="text-sm font-medium text-slate-200 group-hover:text-white">
          Choose persona
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-400" />
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200",
            "bg-gradient-to-r from-slate-800/80 to-slate-800/50 hover:from-slate-700/80 hover:to-slate-700/50",
            "border border-slate-700/50 hover:border-cyan-400/30",
            "focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:ring-offset-2 focus:ring-offset-slate-950",
            "group",
            className
          )}
        >
          <CurrentIcon className="h-4 w-4 text-cyan-400 shrink-0" />
          {!compact && (
            <>
              <div className="flex flex-col items-start leading-tight">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                  Mode
                </span>
                <span className="text-sm font-medium text-slate-200 group-hover:text-white truncate">
                  {currentPersona.shortLabel}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-400 transition-transform group-data-[state=open]:rotate-180 ml-1" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-72 bg-slate-900/95 backdrop-blur-xl border-slate-700/50"
      >
        <DropdownMenuLabel className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          Switch Persona
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-slate-700/50" />

        {PERSONA_LIST.map((personaId) => {
          const personaMeta = PERSONAS[personaId];
          const Icon = personaMeta.icon;
          const isSelected = personaId === persona;

          return (
            <DropdownMenuItem
              key={personaId}
              onClick={() => handleSelectPersona(personaId)}
              className={cn(
                "flex items-start gap-3 p-3 cursor-pointer rounded-lg transition-colors",
                "focus:bg-slate-800/50 focus:text-white",
                isSelected
                  ? "bg-gradient-to-r from-cyan-500/10 to-emerald-500/10"
                  : "hover:bg-slate-800/50"
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                  isSelected
                    ? "bg-gradient-to-br from-emerald-500/30 to-cyan-500/30"
                    : "bg-slate-800"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4",
                    isSelected ? "text-cyan-300" : "text-slate-400"
                  )}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      isSelected ? "text-white" : "text-slate-200"
                    )}
                  >
                    {personaMeta.shortLabel}
                  </span>
                  {isSelected && (
                    <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                  {personaMeta.description}
                </p>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
