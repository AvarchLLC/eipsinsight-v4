"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/hooks/useSession";
import { ProfileAvatar } from "@/components/profile-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { client } from "@/lib/orpc";
import { SubscriptionsPanel } from "@/components/subscriptions-panel";
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

        <SubscriptionsPanel />
      </div>
    </div>
  );
}
