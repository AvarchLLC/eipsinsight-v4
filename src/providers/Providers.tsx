"use client";

import * as React from "react";
import { PersonaProvider } from "@/providers/PersonaProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { OnboardingRedirect } from "@/components/onboarding-redirect";
import { ThemeLoading } from "@/components/theme-loading";

interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * Client-side providers wrapper
 * Add all client-side context providers here
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider>
      <ThemeLoading />
      <PersonaProvider>
        <OnboardingRedirect />
        {children}
      </PersonaProvider>
    </ThemeProvider>
  );
}
