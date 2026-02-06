"use client";

import * as React from "react";
import { PersonaProvider } from "@/providers/PersonaProvider";
import { OnboardingRedirect } from "@/components/onboarding-redirect";

interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * Client-side providers wrapper
 * Add all client-side context providers here
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <PersonaProvider>
      <OnboardingRedirect />
      {children}
    </PersonaProvider>
  );
}
