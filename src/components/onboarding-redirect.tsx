"use client";

import * as React from "react";
import { usePersonaStore } from "@/stores/personaStore";

/**
 * Component that handles persona hydration and sync
 * 
 * NOTE: We use a "soft-first" approach - no hard redirects.
 * Instead, we show gentle nudges in the UI (navbar, banners).
 * This component just ensures the store is properly hydrated.
 */
export function OnboardingRedirect() {
  const { isHydrated } = usePersonaStore();

  // This component doesn't render anything or redirect
  // It's kept for backward compatibility and can be extended
  // for analytics tracking of onboarding state
  
  React.useEffect(() => {
    if (isHydrated) {
      // Could track analytics here: "user_session_started"
      // with persona state for funnel analysis
    }
  }, [isHydrated]);

  return null;
}
