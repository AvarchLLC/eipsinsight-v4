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
    } catch {
      setMessage("Failed to save");
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }

  function handleAvatarUploaded() {
    setMessage("Avatar updated!");
    setStatus("success");
  }

  if (!session?.user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-slate-400">You must be signed in to edit settings.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8 flex flex-col gap-2">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs uppercase tracking-wide text-emerald-200">
          Account
        </div>
        <h1 className="text-3xl font-semibold text-slate-50">Account settings</h1>
        <p className="text-slate-400">Polish your public profile and keep your credentials in sync.</p>
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl border border-cyan-400/20 bg-slate-950/60 p-6 shadow-[0_20px_70px_rgba(6,182,212,0.12)]">
          <div className="grid gap-6 md:grid-cols-[auto,1fr] md:items-center">
            <div className="flex items-center gap-3">
              <ProfileAvatar user={session.user} size="lg" editable onUploadComplete={handleAvatarUploaded} />
              <div className="text-xs text-slate-400">Tap the badge to replace, we auto crop to a clean square.</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-slate-300">Signed in as</div>
              <div className="text-lg font-medium text-slate-50">{session.user.email}</div>
              <p className="text-sm text-slate-400">We keep uploads center-cropped so your avatar stays aligned across the navbar and profile cards.</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-400/20 bg-slate-950/60 p-6 shadow-[0_20px_70px_rgba(6,182,212,0.12)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-50">Profile details</h2>
              <p className="text-sm text-slate-400">Update your display name; changes reflect immediately in navigation and cards.</p>
            </div>
            {message && (
              <span
                className={
                  status === "success"
                    ? "rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-200"
                    : "rounded-full bg-rose-500/15 px-3 py-1 text-xs font-medium text-rose-200"
                }
              >
                {message}
              </span>
            )}
          </div>

          <div className="mt-4 grid gap-4">
            <div>
              <label className="mb-1 block text-sm text-slate-300">Display name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="border-cyan-400/30 bg-black/30 focus-visible:ring-emerald-400/40"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={save}
                disabled={saving}
                className="rounded-full bg-linear-to-r from-emerald-500 to-cyan-500 text-black hover:from-emerald-400 hover:to-cyan-400"
              >
                {saving ? "Saving..." : "Save changes"}
              </Button>
              <span className="text-sm text-slate-400">We never show your email publicly.</span>
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
  const { persona, setPersona, isHydrated, isOnboarded } = usePersonaStore();
  const { syncPersonaToServer, isAuthenticated } = usePersonaSyncOnChange();
  const [savingPersona, setSavingPersona] = useState(false);

  const handleSelectPersona = async (newPersona: Persona) => {
    if (newPersona === persona) return;
    
    setSavingPersona(true);
    setPersona(newPersona);
    
    // Sync to server if authenticated
    if (isAuthenticated) {
      try {
        await syncPersonaToServer(newPersona);
      } catch (error) {
        console.error("Failed to sync persona:", error);
      }
    }
    
    setSavingPersona(false);
  };

  if (!isHydrated) {
    return (
      <div className="rounded-2xl border border-cyan-400/20 bg-slate-950/60 p-6 shadow-[0_20px_70px_rgba(6,182,212,0.12)]">
        <div className="animate-pulse">
          <div className="h-6 w-48 bg-slate-800 rounded mb-4" />
          <div className="h-4 w-72 bg-slate-800 rounded mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-20 bg-slate-800 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const currentPersonaMeta = getPersonaMeta(persona);
  const CurrentIcon = currentPersonaMeta.icon;

  return (
    <div className="rounded-2xl border border-cyan-400/20 bg-slate-950/60 p-6 shadow-[0_20px_70px_rgba(6,182,212,0.12)]">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-semibold text-slate-50">Persona preferences</h2>
            <Sparkles className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-sm text-slate-400">
            Your persona customizes navigation, highlights, and default views across the site.
          </p>
        </div>

        {/* Current persona badge */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-blue-500/10 border border-cyan-400/20">
          <CurrentIcon className="h-4 w-4 text-cyan-400" />
          <span className="text-sm font-medium text-cyan-300">
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
                "border bg-slate-900/50",
                "hover:bg-slate-800/50",
                "focus:outline-none focus:ring-2 focus:ring-cyan-400/30",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                isSelected
                  ? "border-cyan-400/50 bg-gradient-to-br from-cyan-500/10 to-emerald-500/10"
                  : "border-slate-700/50 hover:border-slate-600/50"
              )}
            >
              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <Check className="h-4 w-4 text-cyan-400" />
                </div>
              )}

              <div
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center mb-2",
                  isSelected
                    ? "bg-gradient-to-br from-emerald-500/30 to-cyan-500/30"
                    : "bg-slate-800"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4",
                    isSelected ? "text-cyan-300" : "text-slate-400"
                  )}
                />
              </div>

              <div className="text-sm font-medium text-slate-200 mb-0.5">
                {personaMeta.shortLabel}
              </div>
              <div className="text-xs text-slate-500 line-clamp-2">
                {personaMeta.description}
              </div>
            </button>
          );
        })}
      </div>

      {/* Help text */}
      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
        <span>Changes apply immediately across the site</span>
        <Link
          href="/p"
          className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          Full persona guide
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
