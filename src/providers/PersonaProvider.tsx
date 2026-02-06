"use client";

import * as React from "react";
import { usePersonaStore } from "@/stores/personaStore";
import { usePersonaSync } from "@/hooks/usePersonaSync";
import { FEATURES } from "@/lib/features";
import {
  type Persona,
  PERSONAS,
  PERSONA_DEFAULTS,
  getPersonaMeta,
} from "@/lib/persona";

export interface PersonaContextValue {
  // Current persona state
  persona: Persona;
  personaMeta: ReturnType<typeof getPersonaMeta>;
  isOnboarded: boolean;
  isHydrated: boolean;

  // Feature flags
  isPersonaEnabled: boolean;
  isOnboardingEnabled: boolean;
  isSwitcherEnabled: boolean;
  isNavReorderEnabled: boolean;

  // Actions
  setPersona: (persona: Persona) => void;

  // Computed
  getDefaultRoute: () => string;
}

const PersonaContext = React.createContext<PersonaContextValue | null>(null);

interface PersonaProviderProps {
  children: React.ReactNode;
}

export function PersonaProvider({ children }: PersonaProviderProps) {
  const {
    persona,
    isOnboarded,
    isHydrated,
    setPersona,
    getDefaultRoute,
  } = usePersonaStore();

  // Initialize server sync
  usePersonaSync();

  const value = React.useMemo<PersonaContextValue>(
    () => ({
      // State
      persona,
      personaMeta: getPersonaMeta(persona),
      isOnboarded,
      isHydrated,

      // Feature flags
      isPersonaEnabled:
        FEATURES.PERSONA_ONBOARDING ||
        FEATURES.PERSONA_SWITCHER ||
        FEATURES.PERSONA_NAV_REORDER,
      isOnboardingEnabled: FEATURES.PERSONA_ONBOARDING,
      isSwitcherEnabled: FEATURES.PERSONA_SWITCHER,
      isNavReorderEnabled: FEATURES.PERSONA_NAV_REORDER,

      // Actions
      setPersona,

      // Computed
      getDefaultRoute,
    }),
    [persona, isOnboarded, isHydrated, setPersona, getDefaultRoute]
  );

  return (
    <PersonaContext.Provider value={value}>{children}</PersonaContext.Provider>
  );
}

/**
 * Hook to access persona context
 * Throws if used outside of PersonaProvider
 */
export function usePersona(): PersonaContextValue {
  const context = React.useContext(PersonaContext);
  if (!context) {
    throw new Error("usePersona must be used within a PersonaProvider");
  }
  return context;
}

/**
 * Hook to check if a specific persona is active
 */
export function useIsPersona(targetPersona: Persona): boolean {
  const { persona } = usePersona();
  return persona === targetPersona;
}

/**
 * Hook to get persona-specific content
 * Returns the content for the current persona, or fallback if not found
 */
export function usePersonaContent<T>(
  contentMap: Partial<Record<Persona, T>>,
  fallback: T
): T {
  const { persona } = usePersona();
  return contentMap[persona] ?? fallback;
}
