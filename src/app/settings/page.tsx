"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/hooks/useSession";
import { ProfileAvatar } from "@/components/profile-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { client } from "@/lib/orpc";

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
      </div>
    </div>
  );
}
