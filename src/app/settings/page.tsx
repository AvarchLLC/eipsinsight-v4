"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, Check } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { ProfileAvatar } from "@/components/profile-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { client } from "@/lib/orpc";
import { usePersonaStore } from "@/stores/personaStore";
import { usePersonaSyncOnChange } from "@/hooks/usePersonaSync";
import { PERSONAS, PERSONA_LIST, getPersonaMeta, type Persona } from "@/lib/persona";
import { FEATURES } from "@/lib/features";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name ?? "");
    }
  }, [session?.user]);

  async function save() {
    setSaving(true);
    setMessage(null);
    setStatus("idle");
    try {
      await client.account.update({ name: name || undefined });
      setMessage("Saved!");
      setStatus("success");
      toast.success("Profile updated");
    } catch {
      setMessage("Failed to save");
      setStatus("error");
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  function handleAvatarUploaded() {
    setMessage("Avatar updated!");
    setStatus("success");
    toast.success("Avatar updated");
  }

  if (!session?.user) {
    return (
      <div className="page-shell-narrow py-10">
        <h1 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Settings</h1>
        <p className="text-muted-foreground">You must be signed in to edit settings.</p>
      </div>
    );
  }

  return (
    <div className="page-shell-narrow py-10">
      <div className="mb-8 flex flex-col gap-2">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs uppercase tracking-wide text-primary">
          Account
        </div>
        <h1 className="dec-title persona-title text-balance text-3xl font-semibold tracking-tight leading-[1.1] sm:text-4xl">
          Account Settings
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">Polish your public profile and keep your credentials in sync.</p>
      </div>

      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card/60 p-6">
          <div className="grid gap-6 md:grid-cols-[auto,1fr] md:items-center">
            <div className="flex items-center gap-3">
              <ProfileAvatar user={session.user} size="lg" editable onUploadComplete={handleAvatarUploaded} />
              <div className="text-xs text-muted-foreground">Tap the badge to replace, we auto crop to a clean square.</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Signed in as</div>
              <div className="text-lg font-medium text-foreground">{session.user.email}</div>
              <p className="text-sm text-muted-foreground">We keep uploads center-cropped so your avatar stays aligned across the navbar and profile cards.</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card/60 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground">Profile Details</h2>
              <p className="text-sm text-muted-foreground">Update your display name; changes reflect immediately in navigation and cards.</p>
            </div>
            {message && (
              <span
                className={
                  status === "success"
                    ? "rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-200"
                    : "rounded-full bg-rose-500/15 px-3 py-1 text-xs font-medium text-rose-700 dark:text-rose-200"
                }
              >
                {message}
              </span>
            )}
          </div>

          <div className="mt-4 grid gap-4">
            <div>
              <label className="mb-1 block text-sm text-foreground">Display name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="border-border bg-background/60 text-foreground focus-visible:ring-primary/30"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={save}
                disabled={saving}
                className="rounded-full border border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
              >
                {saving ? "Saving..." : "Save changes"}
              </Button>
              <span className="text-sm text-muted-foreground">We never show your email publicly.</span>
            </div>
          </div>
        </div>

        {/* Persona Preferences Section */}
        {FEATURES.PERSONA_SWITCHER && <PersonaPreferencesSection />}
      </div>
    </div>
  );
}

// =============================================================================
// Persona Preferences Section Component
// =============================================================================

function PersonaPreferencesSection() {
  const { persona, setPersona, isHydrated } = usePersonaStore();
  const { syncPersonaToServer, isAuthenticated } = usePersonaSyncOnChange();
  const [savingPersona, setSavingPersona] = useState(false);

  const handleSelectPersona = async (newPersona: Persona) => {
    if (newPersona === persona) return;
    
    setSavingPersona(true);
    setPersona(newPersona, { redirect: false });
    
    // Sync to server if authenticated
    if (isAuthenticated) {
      try {
        await syncPersonaToServer(newPersona);
        toast.success(`Persona set to ${PERSONAS[newPersona].shortLabel}`);
      } catch (error) {
        console.error("Failed to sync persona:", error);
        toast.error("Persona updated locally, but sync failed");
      }
    } else {
      toast.success(`Persona set to ${PERSONAS[newPersona].shortLabel}`);
    }
    
    setSavingPersona(false);
  };

  if (!isHydrated) {
    return (
      <div className="rounded-xl border border-border bg-card/60 p-6">
        <div className="animate-pulse">
          <div className="mb-4 h-6 w-48 rounded bg-muted" />
          <div className="mb-6 h-4 w-72 rounded bg-muted" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-muted" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const currentPersonaMeta = getPersonaMeta(persona);
  const CurrentIcon = currentPersonaMeta.icon;

  return (
    <div className="rounded-xl border border-border bg-card/60 p-6">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground">Persona Preferences</h2>
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            Your persona customizes navigation, highlights, and default views across the site.
          </p>
        </div>

        {/* Current persona badge */}
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2">
          <CurrentIcon className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">
            {currentPersonaMeta.shortLabel}
          </span>
        </div>
      </div>

      {/* Persona Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {PERSONA_LIST.map((personaId) => {
          const personaMeta = PERSONAS[personaId];
          const Icon = personaMeta.icon;
          const isSelected = personaId === persona;

          return (
            <button
              key={personaId}
              onClick={() => handleSelectPersona(personaId)}
              disabled={savingPersona}
              className={cn(
                "relative p-4 rounded-xl text-left transition-all duration-200",
                "border border-border bg-background/60",
                "hover:bg-muted/60",
                "focus:outline-none focus:ring-2 focus:ring-primary/30",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                isSelected
                  ? "border-primary/50 bg-primary/10"
                  : "hover:border-primary/30"
              )}
            >
              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <Check className="h-4 w-4 text-primary" />
                </div>
              )}

              <div
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center mb-2",
                  isSelected
                    ? "bg-primary/20"
                    : "bg-muted"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4",
                    isSelected ? "text-primary" : "text-muted-foreground"
                  )}
                />
              </div>

              <div className="mb-0.5 text-sm font-medium text-foreground">
                {personaMeta.shortLabel}
              </div>
              <div className="line-clamp-2 text-xs text-muted-foreground">
                {personaMeta.description}
              </div>
            </button>
          );
        })}
      </div>

      {/* Help text */}
      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>Changes apply immediately across the site</span>
        <Link
          href="/p"
          className="flex items-center gap-1 text-primary transition-colors hover:text-primary/80"
        >
          Full persona guide
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
