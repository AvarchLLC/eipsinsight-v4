"use client";

import { useEffect, useCallback, useRef } from "react";
import { client } from "@/lib/orpc";
import { useSession } from "@/hooks/useSession";
import { usePersonaStore } from "@/stores/personaStore";
import { isValidPersona, type Persona } from "@/lib/persona";

/**
 * Hook to sync persona preferences between client state and server
 * - On FIRST login only: fetches server preferences (not on every page load)
 * - On persona change (when logged in): syncs to server
 */
export function usePersonaSync() {
  const { data: session, loading: sessionLoading } = useSession();
  const {
    persona,
    defaultView,
    setPersonaFromServer,
    setDefaultView,
    setOnboarded,
    setHasSyncedFromServer,
    isHydrated,
    hasSyncedFromServer,
  } = usePersonaStore();
  
  const hasFetched = useRef(false);

  // Fetch preferences from server on FIRST login only
  const syncFromServer = useCallback(async () => {
    if (!session?.user) return;
    if (hasFetched.current) return; // Prevent multiple fetches
    
    hasFetched.current = true;

    try {
      const serverPrefs = await client.preferences.get();

      if (serverPrefs) {
        // Server preferences exist - use them (only if we haven't synced before)
        if (serverPrefs.persona && isValidPersona(serverPrefs.persona)) {
          setPersonaFromServer(serverPrefs.persona as Persona);
        }
        if (serverPrefs.default_view) {
          setDefaultView(serverPrefs.default_view);
        }
        setOnboarded(true);
      }
      setHasSyncedFromServer(true);
    } catch (error) {
      // Silent fail - user might not have preferences yet
      console.debug("No server preferences found or fetch failed:", error);
      setHasSyncedFromServer(true); // Mark as synced even on error to prevent loops
    }
  }, [session?.user, setPersonaFromServer, setDefaultView, setOnboarded, setHasSyncedFromServer]);

  // Sync to server when persona changes (if logged in)
  const syncToServer = useCallback(
    async (newPersona: Persona) => {
      if (!session?.user) return;

      try {
        await client.preferences.setPersona({ persona: newPersona });
      } catch (error) {
        console.error("Failed to sync persona to server:", error);
      }
    },
    [session?.user]
  );

  // Sync from server on initial login ONLY (not on every page load)
  useEffect(() => {
    // Only sync from server if:
    // 1. Session is loaded and user is logged in
    // 2. Store is hydrated from localStorage
    // 3. We haven't already synced from server in this session
    if (!sessionLoading && session?.user && isHydrated && !hasSyncedFromServer) {
      syncFromServer();
    }
  }, [sessionLoading, session?.user, isHydrated, hasSyncedFromServer, syncFromServer]);

  return {
    syncFromServer,
    syncToServer,
    isAuthenticated: !!session?.user,
    isLoading: sessionLoading || !isHydrated,
  };
}

/**
 * Hook to sync persona on change (for use in PersonaSwitcher)
 * Syncs to server immediately when persona changes
 */
export function usePersonaSyncOnChange() {
  const { data: session } = useSession();

  const syncPersonaToServer = useCallback(
    async (newPersona: Persona) => {
      if (!session?.user) return;

      try {
        await client.preferences.setPersona({ persona: newPersona });
      } catch (error) {
        console.error("Failed to sync persona to server:", error);
      }
    },
    [session?.user]
  );

  return { syncPersonaToServer, isAuthenticated: !!session?.user };
}
