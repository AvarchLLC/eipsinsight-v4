"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, RefreshCcw, Sparkles, X } from "lucide-react";
import { FEATURES } from "@/lib/features";
import {
  PERSONA_PAGE_CONFIG,
  PERSONAS,
  PERSONA_LIST,
  type Persona,
} from "@/lib/persona";
import { usePersonaStore } from "@/stores/personaStore";
import { usePersonaSyncOnChange } from "@/hooks/usePersonaSync";
import { useSession } from "@/hooks/useSession";
import { cn } from "@/lib/utils";
import { client } from "@/lib/orpc";

function isRestrictedPath(pathname: string) {
  return (
    pathname.startsWith("/p") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signin") ||
    pathname.startsWith("/signup")
  );
}

export function OnboardingRedirect() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, loading: sessionLoading } = useSession();
  const { syncPersonaToServer, isAuthenticated } = usePersonaSyncOnChange();
  const {
    persona,
    isOnboarded,
    isHydrated,
    hasSyncedFromServer,
    setPersona,
    setPersonaFromServer,
    setOnboarded,
  } = usePersonaStore();

  const [showPicker, setShowPicker] = React.useState(false);
  const [showNudge, setShowNudge] = React.useState(false);
  const [selectedPersona, setSelectedPersona] = React.useState<Persona | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [showRecommendedCta, setShowRecommendedCta] = React.useState(false);
  const [serverPersona, setServerPersona] = React.useState<Persona | null>(null);
  const [showMismatchPrompt, setShowMismatchPrompt] = React.useState(false);
  const [resolvingMismatch, setResolvingMismatch] = React.useState(false);
  const prevPersonaRef = React.useRef<Persona | null>(null);
  const personaInitDoneRef = React.useRef(false);

  const isAuthed = !!session?.user;
  const ready = isHydrated && !sessionLoading && (!isAuthed || hasSyncedFromServer);
  const firstTime = ready && !persona && !isOnboarded;
  const onHome = pathname === "/";
  const recommendedHome = "/";

  React.useEffect(() => {
    if (!ready || !persona) return;

    if (!personaInitDoneRef.current) {
      personaInitDoneRef.current = true;
      prevPersonaRef.current = persona;
      return;
    }

    if (prevPersonaRef.current && prevPersonaRef.current !== persona) {
      setShowRecommendedCta(true);
      const timeout = window.setTimeout(() => setShowRecommendedCta(false), 5500);
      prevPersonaRef.current = persona;
      return () => window.clearTimeout(timeout);
    }
    prevPersonaRef.current = persona;
  }, [persona, ready]);

  React.useEffect(() => {
    if (!FEATURES.PERSONA_ONBOARDING || !firstTime || isRestrictedPath(pathname)) {
      setShowPicker(false);
      setShowNudge(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      if (onHome) {
        setShowPicker(true);
      } else {
        setShowNudge(true);
      }
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [firstTime, onHome, pathname]);

  React.useEffect(() => {
    if (!ready || !persona || isRestrictedPath(pathname)) return;

    const config = PERSONA_PAGE_CONFIG[persona];
    const current = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : ""
    );

    const routeScope = pathname.startsWith("/standards")
      ? "standards"
      : pathname.startsWith("/analytics")
        ? "analytics"
        : pathname.startsWith("/upgrade")
          ? "upgrade"
          : null;

    if (!routeScope) return;

    const key = `persona-default-applied:${persona}:${routeScope}`;
    if (sessionStorage.getItem(key)) return;

    let nextPath: string | null = null;

    if (routeScope === "standards" && pathname === "/standards") {
      const desiredRepo =
        config.standardsFocus === "eip"
          ? "eips"
          : config.standardsFocus === "erc"
            ? "ercs"
            : config.standardsFocus === "rip"
              ? "rips"
              : "all";

      if (!current.get("repo") && desiredRepo !== "all") {
        current.set("repo", desiredRepo);
        nextPath = `${pathname}?${current.toString()}`;
      }
    }

    if (routeScope === "analytics" && pathname === "/analytics") {
      const page = config.analyticsDefault || "prs";
      nextPath = `/analytics/${page}`;
    }

    // The /upgrade page doesn't read a `view` param, so appending ?view=technical
    // (from the persona default) only cluttered the URL with a no-op. Removed.

    sessionStorage.setItem(key, "1");
    if (nextPath) {
      router.replace(nextPath);
    }
  }, [pathname, persona, ready, router]);

  React.useEffect(() => {
    if (!ready || !isAuthed) return;
    let cancelled = false;

    client.preferences
      .get()
      .then((prefs) => {
        if (cancelled) return;
        const sp = (prefs?.persona as Persona | null) ?? null;
        setServerPersona(sp);
        setShowMismatchPrompt(!!sp && !!persona && sp !== persona);
      })
      .catch(() => {
        if (!cancelled) {
          setServerPersona(null);
          setShowMismatchPrompt(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthed, persona, ready]);

  const handleContinue = React.useCallback(async () => {
    if (!selectedPersona) return;
    setSaving(true);
    setPersona(selectedPersona, { redirect: false });

    if (isAuthenticated) {
      await syncPersonaToServer(selectedPersona);
    }

    setShowPicker(false);
    setShowNudge(false);
    setSaving(false);
    router.push("/");
  }, [isAuthenticated, router, selectedPersona, setPersona, syncPersonaToServer]);

  const handleSkip = React.useCallback(() => {
    setOnboarded(true);
    setShowPicker(false);
    setShowNudge(false);
  }, [setOnboarded]);

  const handleSyncLocalToServer = React.useCallback(async () => {
    if (!persona) return;
    setResolvingMismatch(true);
    try {
      await syncPersonaToServer(persona);
      setServerPersona(persona);
      setShowMismatchPrompt(false);
    } finally {
      setResolvingMismatch(false);
    }
  }, [persona, syncPersonaToServer]);

  const handleUseServerPersona = React.useCallback(() => {
    if (!serverPersona) return;
    setPersonaFromServer(serverPersona);
    setShowMismatchPrompt(false);
  }, [serverPersona, setPersonaFromServer]);

  if (!FEATURES.PERSONA_ONBOARDING || !ready || isRestrictedPath(pathname)) {
    return null;
  }

  return (
    <>
      {showNudge && !showPicker && (
        <div className="fixed bottom-4 right-4 z-[80] w-[320px] rounded-xl border border-border bg-card/95 p-4 shadow-xl backdrop-blur-md">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Personalize
              </p>
              <p className="mt-1 text-sm text-foreground">
                Pick a persona to reorder navigation and defaults.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSkip}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              aria-label="Dismiss persona prompt"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="rounded-md border border-primary/35 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
            >
              Pick persona
            </button>
            {!isAuthed && (
              <Link
                href="/login"
                className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              >
                Sign in for sync
              </Link>
            )}
          </div>
        </div>
      )}

      {showRecommendedCta && persona && (
        <div className="fixed bottom-4 left-4 z-[80] w-[360px] rounded-xl border border-primary/25 bg-card/95 p-4 shadow-xl backdrop-blur-md">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Persona Updated
              </p>
              <p className="mt-1 text-sm text-foreground">
                Go to your recommended home for <span className="font-medium">{PERSONAS[persona].shortLabel}</span>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowRecommendedCta(false)}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              aria-label="Dismiss recommendation"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3">
            <button
              type="button"
              onClick={() => {
                setShowRecommendedCta(false);
                router.push(recommendedHome);
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-primary/35 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/15"
            >
              Go to recommended home
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {showMismatchPrompt && persona && serverPersona && (
        <div className="fixed bottom-4 right-4 z-[81] w-[380px] rounded-xl border border-border bg-card/95 p-4 shadow-xl backdrop-blur-md">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Persona Sync
              </p>
              <p className="mt-1 text-sm text-foreground">
                Account persona is <span className="font-medium">{PERSONAS[serverPersona].shortLabel}</span>, local is{" "}
                <span className="font-medium">{PERSONAS[persona].shortLabel}</span>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowMismatchPrompt(false)}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              aria-label="Dismiss sync prompt"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSyncLocalToServer}
              disabled={resolvingMismatch}
              className="inline-flex items-center gap-1.5 rounded-md border border-primary/35 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/15 disabled:opacity-50"
            >
              <RefreshCcw className={cn("h-3.5 w-3.5", resolvingMismatch && "animate-spin")} />
              Sync local to account
            </button>
            <button
              type="button"
              onClick={handleUseServerPersona}
              className="rounded-md border border-border bg-muted/60 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            >
              Use account persona
            </button>
          </div>
        </div>
      )}

      {showPicker && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-background/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl rounded-xl border border-border bg-card/95 p-5 shadow-2xl sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  Persona Setup
                </div>
                <h2 className="mt-2 dec-title text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  Are you here as a...
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  We tailor nav priority and defaults based on your role. You can change this anytime.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSkip}
                className="rounded-lg border border-border bg-muted/60 p-2 text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                aria-label="Close persona picker"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {PERSONA_LIST.map((personaId) => {
                const meta = PERSONAS[personaId];
                const Icon = meta.icon;
                const isSelected = selectedPersona === personaId;
                return (
                  <button
                    key={personaId}
                    type="button"
                    onClick={() => setSelectedPersona(personaId)}
                    className={cn(
                      "rounded-xl border bg-background/60 p-4 text-left transition-all duration-200",
                      "hover:border-primary/40 hover:bg-muted/60",
                      isSelected
                        ? "border-primary/45 bg-primary/10 shadow-[0_0_0_1px_rgb(var(--persona-accent-rgb)/0.2)]"
                        : "border-border"
                    )}
                  >
                    <div className="mb-2 inline-flex rounded-lg border border-primary/25 bg-primary/10 p-2">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">{meta.shortLabel}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{meta.description}</p>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Starts at <span className="font-medium text-foreground/90">/</span>
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
              <div className="text-xs text-muted-foreground">
                {isAuthed
                  ? "Selection is saved to your account and synced across devices."
                  : "Selection is saved locally. Sign in to sync across devices."}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="rounded-md border border-border bg-muted/60 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                >
                  Skip for now
                </button>
                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={!selectedPersona || saving}
                  className="rounded-md border border-primary/35 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary disabled:cursor-not-allowed disabled:opacity-50 hover:bg-primary/15"
                >
                  {saving ? "Saving..." : "Continue"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
