"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersonaProvider } from "@/providers/PersonaProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { OnboardingRedirect } from "@/components/onboarding-redirect";
import { ThemeLoading } from "@/components/theme-loading";

interface ProvidersProps {
  children: React.ReactNode;
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === "undefined") return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

export function Providers({ children }: ProvidersProps) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ThemeLoading />
        <PersonaProvider>
          <OnboardingRedirect />
          {children}
        </PersonaProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
