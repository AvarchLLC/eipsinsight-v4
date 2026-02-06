"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { usePersonaStore } from "@/stores/personaStore";
import {
  isValidPersona,
  PERSONA_DEFAULTS,
  DEFAULT_PERSONA,
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center">
          <div className="mb-6">
            <Image
              src="/brand/logo/EIPsInsights.gif"
              alt="EIPsInsight"
              width={64}
              height={64}
            />
          </div>
          <h1 className="text-xl font-semibold text-white mb-2">
            Unknown Persona
          </h1>
          <p className="text-slate-400 mb-4">{error}</p>
          <p className="text-sm text-slate-500">
            Redirecting to persona selection...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="text-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 animate-pulse rounded-full bg-cyan-400/20 blur-xl" />
          <Image
            src="/brand/logo/EIPsInsights.gif"
            alt="Loading"
            width={64}
            height={64}
            className="relative z-10 animate-pulse"
          />
        </div>
        <p className="text-slate-400">
          Setting up your personalized experience...
        </p>
      </div>
    </div>
  );
}
