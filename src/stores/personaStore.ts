import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  type Persona,
  DEFAULT_PERSONA,
  isValidPersona,
  PERSONA_DEFAULTS,
} from "@/lib/persona";

export interface DefaultView {
  upgradesView?: string;
  analyticsView?: string;
  standardsView?: string;
}

interface PersonaState {
  // State - persona can be null when not selected
  persona: Persona | null;
  defaultView: DefaultView;
  isOnboarded: boolean;
  isHydrated: boolean;
  hasSyncedFromServer: boolean; // Track if we've already synced from server

  // Actions
  setPersona: (persona: Persona, options?: { redirect?: boolean; syncToServer?: boolean }) => void;
  setPersonaFromServer: (persona: Persona) => void; // For server sync only
  setDefaultView: (view: Partial<DefaultView>) => void;
  setOnboarded: (onboarded: boolean) => void;
  setHydrated: (hydrated: boolean) => void;
  setHasSyncedFromServer: (synced: boolean) => void;
  reset: () => void;

  // Computed helpers
  getDefaultRoute: () => string;
  getEffectivePersona: () => Persona; // Returns persona or default if null
}

const initialState = {
  persona: null as Persona | null, // null = not selected yet
  defaultView: {},
  isOnboarded: false,
  isHydrated: false,
  hasSyncedFromServer: false,
};

export const usePersonaStore = create<PersonaState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setPersona: (persona: Persona, options?: { redirect?: boolean; syncToServer?: boolean }) => {
        const { redirect = true, syncToServer = true } = options || {};
        
        if (isValidPersona(persona)) {
          set({ persona, isOnboarded: true });
          
          // Redirect to persona's default landing page
          if (redirect && typeof window !== "undefined") {
            const landingPage = PERSONA_DEFAULTS[persona];
            if (landingPage) {
              // Delay to ensure localStorage is written before navigation
              setTimeout(() => {
                window.location.href = landingPage;
              }, 100);
            }
          }
        }
      },

      // Separate method for server sync - doesn't redirect or trigger server update
      setPersonaFromServer: (persona: Persona) => {
        if (isValidPersona(persona)) {
          set({ persona, isOnboarded: true, hasSyncedFromServer: true });
        }
      },

      setDefaultView: (view: Partial<DefaultView>) => {
        set((state) => ({
          defaultView: { ...state.defaultView, ...view },
        }));
      },

      setOnboarded: (onboarded: boolean) => {
        set({ isOnboarded: onboarded });
      },

      setHydrated: (hydrated: boolean) => {
        set({ isHydrated: hydrated });
      },

      setHasSyncedFromServer: (synced: boolean) => {
        set({ hasSyncedFromServer: synced });
      },

      reset: () => {
        set(initialState);
      },

      getDefaultRoute: () => {
        const { persona } = get();
        if (persona) {
          return PERSONA_DEFAULTS[persona];
        }
        return "/"; // Home if no persona selected
      },

      getEffectivePersona: () => {
        const { persona } = get();
        return persona || DEFAULT_PERSONA;
      },
    }),
    {
      name: "eipsinsight-persona",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        persona: state.persona,
        defaultView: state.defaultView,
        isOnboarded: state.isOnboarded,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated(true);
        }
      },
    }
  )
);

// Hook to sync persona with server when user is authenticated
export function useSyncPersonaWithServer() {
  const { persona, defaultView, setPersona, setDefaultView, setOnboarded } =
    usePersonaStore();

  const syncFromServer = async (serverPreferences: {
    persona?: string | null;
    default_view?: DefaultView | null;
  }) => {
    // Server preferences override local if they exist
    if (serverPreferences.persona && isValidPersona(serverPreferences.persona)) {
      // Don't redirect or re-sync to server when applying server preferences locally
      setPersona(serverPreferences.persona, { redirect: false, syncToServer: false });
    }
    if (serverPreferences.default_view) {
      setDefaultView(serverPreferences.default_view);
    }
    setOnboarded(true);
  };

  const prepareForSync = () => {
    return {
      persona,
      default_view: defaultView,
    };
  };

  return {
    syncFromServer,
    prepareForSync,
  };
}

// Selector hooks for common use cases
export const usePersona = () => usePersonaStore((state) => state.persona);
export const useEffectivePersona = () => usePersonaStore((state) => state.getEffectivePersona());
export const useIsOnboarded = () => usePersonaStore((state) => state.isOnboarded);
export const useIsHydrated = () => usePersonaStore((state) => state.isHydrated);
export const useHasPersona = () => usePersonaStore((state) => state.persona !== null);