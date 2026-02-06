"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { usePersonaStore } from "@/stores/personaStore";
import { getPersonaPageConfig } from "@/lib/persona";
import { FEATURES } from "@/lib/features";

/**
 * Analytics index page - redirects to persona-appropriate default view
 */
export default function AnalyticsIndexPage() {
  const router = useRouter();
  const { persona, isHydrated } = usePersonaStore();

  React.useEffect(() => {
    if (!isHydrated) return;

    // Get persona-specific default analytics view
    const pageConfig = getPersonaPageConfig(persona);
    
    // Redirect to appropriate analytics page based on persona (if feature enabled)
    // or default to PR Analytics
    if (FEATURES.PERSONA_NAV_REORDER || FEATURES.PERSONA_SWITCHER) {
      const defaultTab = pageConfig.analyticsDefault;
      switch (defaultTab) {
        case "editors":
          router.replace("/analytics/editors");
          break;
        case "contributors":
          router.replace("/analytics/contributors");
          break;
        case "prs":
        default:
          router.replace("/analytics/prs");
          break;
      }
    } else {
      // Feature disabled - default to PR Analytics
      router.replace("/analytics/prs");
    }
  }, [isHydrated, persona, router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
        <p className="text-sm text-slate-400">Loading analytics...</p>
      </div>
    </div>
  );
}
