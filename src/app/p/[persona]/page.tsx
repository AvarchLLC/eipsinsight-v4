"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { usePersonaStore } from "@/stores/personaStore";
import { ThemedLogoGif } from "@/components/themed-logo-gif";
import {
  isValidPersona,
  PERSONA_DEFAULTS,
  type Persona,
} from "@/lib/persona";

export default function PersonaRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const { setPersona, isHydrated } = usePersonaStore();
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isHydrated) return;

    const personaParam = params.persona as string;

    // Validate persona
    if (!isValidPersona(personaParam)) {
      setError(`Invalid persona: "${personaParam}"`);
      // Redirect to onboarding after a short delay
      const timeout = setTimeout(() => {
        router.push("/p");
      }, 2000);
      return () => clearTimeout(timeout);
    }

    // Save persona to store
    setPersona(personaParam as Persona);

    // Get default route for this persona
    const defaultRoute = PERSONA_DEFAULTS[personaParam as Persona];

    // Redirect to persona default
    router.push(defaultRoute);
  }, [isHydrated, params.persona, router, setPersona]);

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="page-shell flex min-h-screen flex-col items-center justify-center py-10 text-center">
          <div className="mb-5 rounded-full border border-border bg-card/60 p-3">
            <ThemedLogoGif
              alt="EIPsInsight"
              width={64}
              height={64}
              unoptimized
            />
          </div>
          <h1 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Unknown Persona
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <p className="mt-3 text-sm text-muted-foreground">
            Redirecting to persona selection...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="page-shell flex min-h-screen flex-col items-center justify-center py-10 text-center">
        <div className="mb-5 rounded-full border border-border bg-card/60 p-3 animate-pulse">
          <ThemedLogoGif
            alt="Loading"
            width={64}
            height={64}
            unoptimized
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Setting up your personalized experience...
        </p>
      </div>
    </div>
  );
}
