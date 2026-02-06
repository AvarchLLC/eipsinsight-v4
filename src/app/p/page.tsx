"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { usePersonaStore } from "@/stores/personaStore";
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
          <Image
            src="/brand/logo/EIPsInsights.gif"
            alt="Loading"
            width={64}
            height={64}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12 md:py-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 animate-pulse rounded-full bg-cyan-400/20 blur-xl" />
              <Image
                src="/brand/logo/EIPsInsights.gif"
                alt="EIPsInsight"
                width={72}
                height={72}
                className="relative z-10"
              />
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            Welcome to{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
              EIPsInsight
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-4">
            How do you use Ethereum standards? Select your role to personalize
            your experience.
          </p>

          {/* Why we ask - microcopy */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700/50">
            <svg
              className="w-4 h-4 text-cyan-400"
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
            <span className="text-xs text-slate-400">
              Your persona helps us tailor navigation, defaults, and highlights.
            </span>
          </div>
        </motion.div>

        {/* Persona Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto mb-12"
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
                  "group relative p-6 rounded-2xl text-left transition-all duration-300",
                  "border-2 bg-slate-900/50 backdrop-blur-sm",
                  "hover:bg-slate-800/50 hover:border-cyan-400/50",
                  "focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:ring-offset-2 focus:ring-offset-slate-950",
                  isSelected
                    ? "border-cyan-400 bg-gradient-to-br from-cyan-500/10 via-emerald-500/10 to-blue-500/10 shadow-[0_0_30px_rgba(34,211,238,0.2)]"
                    : "border-slate-700/50"
                )}
              >
                {/* Selected indicator */}
                {isSelected && (
                  <motion.div
                    layoutId="selected-indicator"
                    className="absolute inset-0 rounded-2xl border-2 border-cyan-400"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}

                <div className="relative z-10">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-300",
                      isSelected
                        ? "bg-gradient-to-br from-emerald-500/30 to-cyan-500/30"
                        : "bg-slate-800 group-hover:bg-slate-700"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-6 h-6 transition-colors duration-300",
                        isSelected
                          ? "text-cyan-300"
                          : "text-slate-400 group-hover:text-cyan-400"
                      )}
                    />
                  </div>

                  <h3
                    className={cn(
                      "text-lg font-semibold mb-2 transition-colors duration-300",
                      isSelected ? "text-white" : "text-slate-200"
                    )}
                  >
                    {persona.label}
                  </h3>

                  <p
                    className={cn(
                      "text-sm transition-colors duration-300",
                      isSelected ? "text-slate-300" : "text-slate-500"
                    )}
                  >
                    {persona.description}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Continue Button */}
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
              "px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300",
              "focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:ring-offset-2 focus:ring-offset-slate-950",
              selectedPersona
                ? "bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500 text-white shadow-[0_0_30px_rgba(34,211,238,0.3)] hover:shadow-[0_0_40px_rgba(34,211,238,0.4)] hover:scale-105"
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
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

          {/* Skip for now */}
          <div className="mt-6 flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-slate-700" />
            <button
              onClick={() => {
                // Set default persona (newcomer) and mark as onboarded
                setPersona("newcomer");
                router.push("/");
              }}
              disabled={isNavigating}
              className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              Skip for now →
            </button>
            <div className="h-px w-12 bg-slate-700" />
          </div>

          <p className="mt-4 text-sm text-slate-500">
            You can change this anytime from the navigation menu
          </p>
        </motion.div>
      </div>
    </div>
  );
}
