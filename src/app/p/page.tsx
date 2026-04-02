"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { usePersonaStore } from "@/stores/personaStore";
import { ThemedLogoGif } from "@/components/themed-logo-gif";
import {
  PERSONAS,
  PERSONA_LIST,
  PERSONA_DEFAULTS,
  type Persona,
} from "@/lib/persona";

export default function PersonaOnboardingPage() {
  const router = useRouter();
  const { setPersona, isHydrated } = usePersonaStore();
  const [selectedPersona, setSelectedPersona] = React.useState<Persona | null>(
    null
  );
  const [isNavigating, setIsNavigating] = React.useState(false);

  const handleSelectPersona = (persona: Persona) => {
    setSelectedPersona(persona);
  };

  const handleContinue = () => {
    if (!selectedPersona) return;

    setIsNavigating(true);
    setPersona(selectedPersona);

    // Navigate to persona default route
    const defaultRoute = PERSONA_DEFAULTS[selectedPersona];
    router.push(defaultRoute);
  };

  // Wait for hydration to avoid flash
  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse">
          <ThemedLogoGif
            alt="Loading"
            width={64}
            height={64}
            unoptimized
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="page-shell relative py-8 sm:py-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center sm:mb-10"
        >
          <div className="flex justify-center mb-6">
            <div className="relative rounded-full border border-border bg-card/60 p-3 persona-glow">
              <ThemedLogoGif
                alt="EIPsInsight"
                width={56}
                height={56}
                unoptimized
              />
            </div>
          </div>

          <h1 className="dec-title persona-title text-balance text-3xl font-semibold tracking-tight leading-[1.1] sm:text-4xl">
            Welcome to EIPsInsight
          </h1>

          <p className="mt-1.5 mx-auto max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Choose your role and we&apos;ll shape navigation, defaults, and highlights around how you work.
          </p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5">
            <svg
              className="h-4 w-4 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-xs text-muted-foreground">
              Your persona helps us tailor navigation, defaults, and highlights.
            </span>
          </div>
        </motion.div>

        <hr className="mb-6 border-border/70" />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mx-auto mb-8 grid max-w-6xl grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
        >
          {PERSONA_LIST.map((personaId, index) => {
            const persona = PERSONAS[personaId];
            const isSelected = selectedPersona === personaId;
            const Icon = persona.icon;

            return (
              <motion.button
                key={personaId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 * index }}
                onClick={() => handleSelectPersona(personaId)}
                className={cn(
                  "group relative rounded-xl border p-4 text-left transition-all duration-300",
                  "bg-card/60 hover:border-primary/40 hover:bg-primary/[0.05]",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                  isSelected
                    ? "border-primary/55 persona-gradient-soft persona-glow"
                    : "border-border"
                )}
              >
                {/* Selected indicator */}
                {isSelected && (
                  <motion.div
                    layoutId="selected-indicator"
                    className="absolute inset-0 rounded-xl border border-primary/60"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}

                <div className="relative z-10">
                  <div
                    className={cn(
                      "mb-3 flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-300",
                      isSelected
                        ? "bg-primary/15"
                        : "bg-muted/80 group-hover:bg-primary/10"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 transition-colors duration-300",
                        isSelected
                          ? "text-primary"
                          : "text-muted-foreground group-hover:text-primary"
                      )}
                    />
                  </div>

                  <h3
                    className={cn(
                      "mb-1 text-base font-semibold transition-colors duration-300",
                      isSelected ? "text-foreground" : "text-foreground"
                    )}
                  >
                    {persona.shortLabel}
                  </h3>

                  <p
                    className={cn(
                      "text-sm leading-relaxed transition-colors duration-300",
                      isSelected ? "text-muted-foreground" : "text-muted-foreground"
                    )}
                  >
                    {persona.description}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </motion.div>

        <hr className="mb-6 border-border/70" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center"
        >
          <button
            onClick={handleContinue}
            disabled={!selectedPersona || isNavigating}
            className={cn(
              "inline-flex h-11 items-center justify-center rounded-lg px-6 text-sm font-semibold transition-all duration-300",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              selectedPersona
                ? "persona-gradient text-black hover:opacity-95"
                : "cursor-not-allowed bg-muted text-muted-foreground"
            )}
          >
            {isNavigating ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Setting up...
              </span>
            ) : (
              "Continue"
            )}
          </button>

          <div className="mt-6 flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-border" />
            <button
              onClick={() => {
                // Set default persona (newcomer) and mark as onboarded
                setPersona("newcomer");
                router.push("/");
              }}
              disabled={isNavigating}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Skip for now →
            </button>
            <div className="h-px w-12 bg-border" />
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            You can change this anytime from the navigation menu
          </p>
        </motion.div>
      </div>
    </div>
  );
}
