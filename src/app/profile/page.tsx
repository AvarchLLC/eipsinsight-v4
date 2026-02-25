"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/hooks/useSession";
import { ProfileAvatar } from "@/components/profile-avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  User,
  Settings2,
  Key,
  Mail,
  Shield,
  Crown,
  CheckCircle2,
  XCircle,
  Calendar,
  TrendingUp,
  ExternalLink,
  Loader2,
} from "lucide-react";

interface SubscriptionData {
  tier: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  priceAmount: number;
  priceCurrency: string;
  billingInterval: string;
}

export default function ProfilePage() {
  const { data: session, loading: isLoading } = useSession();
  const [membershipTier, setMembershipTier] = useState<string>("free");
  const [tierLoading, setTierLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(
    null
  );
  const [portalLoading, setPortalLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<"cancel" | "resume" | null>(
    null
  );
  const [message, setMessage] = useState("");

  const refreshSubscription = async () => {
    const response = await fetch("/api/stripe/subscription");
    if (!response.ok) return;
    const data = await response.json();
    setSubscription(data);
    setMembershipTier(data?.tier || "free");
  };

  useEffect(() => {
    if (session?.user) {
      refreshSubscription()
        .catch(() => setMembershipTier("free"))
        .finally(() => setTierLoading(false));
    } else if (!isLoading) {
      setTierLoading(false);
    }
  }, [session?.user, isLoading]);

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const response = await fetch("/api/stripe/portal", { method: "POST" });
      if (!response.ok) {
        throw new Error("Failed to create portal session");
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error("Error opening customer portal:", error);
      alert("Failed to open subscription management. Please try again.");
    } finally {
      setPortalLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm("Cancel your subscription at period end?")) return;

    setActionLoading("cancel");
    setMessage("");
    try {
      const response = await fetch("/api/stripe/cancel", { method: "POST" });
      if (!response.ok) {
        throw new Error("Failed to cancel subscription");
      }

      setMessage(
        "Subscription will cancel at the end of the current billing period."
      );
      await refreshSubscription();
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      alert("Failed to cancel subscription. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResumeSubscription = async () => {
    setActionLoading("resume");
    setMessage("");
    try {
      const response = await fetch("/api/stripe/resume", { method: "POST" });
      if (!response.ok) {
        throw new Error("Failed to resume subscription");
      }

      setMessage("Subscription resumed successfully.");
      await refreshSubscription();
    } catch (error) {
      console.error("Error resuming subscription:", error);
      alert("Failed to resume subscription. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading || tierLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="animate-pulse space-y-6">
          <div className="h-32 w-32 rounded-full bg-slate-300/70 dark:bg-slate-700/40 shadow-[0_0_40px_rgba(6,182,212,0.15)]" />
          <div className="h-8 w-72 rounded-lg bg-slate-300/70 dark:bg-slate-700/40" />
          <div className="h-5 w-96 rounded-lg bg-slate-300/70 dark:bg-slate-700/40" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-40 rounded-2xl bg-slate-300/70 dark:bg-slate-700/40" />
            <div className="h-40 rounded-2xl bg-slate-300/70 dark:bg-slate-700/40" />
          </div>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white/80 dark:border-cyan-400/20 dark:bg-slate-950/60 p-8 shadow-[0_20px_70px_rgba(6,182,212,0.12)]">
          <h1 className="mb-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">You are not signed in</h1>
          <p className="mb-6 text-slate-600 dark:text-slate-400">Please log in to view your profile.</p>
          <div className="flex gap-2">
            <Button
              asChild
              className="rounded-full bg-linear-to-r from-emerald-500 to-cyan-500 text-black hover:from-emerald-400 hover:to-cyan-400"
            >
              <Link href="/login">Login</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/signup">Sign up</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const user = session.user;
  const isVerified = user.emailVerified ?? false;
  const isPaid = membershipTier !== "free";

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8 flex flex-col gap-2">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1 text-xs uppercase tracking-wide text-cyan-700 dark:text-cyan-200">
          Profile
        </div>
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-50">Your Account</h1>
        <p className="text-slate-600 dark:text-slate-400">Manage your identity, credentials, and preferences.</p>
      </div>

      {message && (
        <div className="mb-6 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          {message}
        </div>
      )}

      <div className="space-y-6">
        {/* Profile Header Card */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white/80 dark:border-cyan-400/20 dark:bg-slate-950/60 p-6 shadow-[0_20px_70px_rgba(6,182,212,0.12)]">
          <div className="absolute right-4 top-4">
            {isPaid && (
              <div className="flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-200">
                <Crown className="h-3.5 w-3.5" />
                {membershipTier.charAt(0).toUpperCase() + membershipTier.slice(1)}
              </div>
            )}
            {membershipTier === "free" && (
              <div className="flex items-center gap-1.5 rounded-full border border-slate-300 dark:border-slate-400/30 bg-slate-100 dark:bg-slate-500/10 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                Free
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className="relative">
              <ProfileAvatar user={user} size="lg" />
              <div className="absolute -bottom-1 -right-1 rounded-full bg-white dark:bg-slate-950 p-1 border border-slate-200 dark:border-slate-800">
                {isVerified ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <XCircle className="h-5 w-5 text-slate-500 dark:text-slate-500" />
                )}
              </div>
            </div>

            <div className="flex-1">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                {user.name ?? user.email}
              </h2>
              {user.email && (
                <div className="mt-1 flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Mail className="h-4 w-4" />
                  <span>{user.email}</span>
                </div>
              )}
              <div className="mt-2 flex items-center gap-2">
                {isVerified ? (
                  <span className="flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-300">
                    <Shield className="h-4 w-4" />
                    Email verified
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-500">
                    <Shield className="h-4 w-4" />
                    Email not verified
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Account Details Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white/80 dark:border-cyan-400/20 dark:bg-slate-950/60 p-6 shadow-[0_20px_70px_rgba(6,182,212,0.12)]">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-lg bg-emerald-500/15 p-2">
                <User className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Identity</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">User ID</span>
                <span className="font-mono text-xs text-slate-700 dark:text-slate-300">{user.id.slice(0, 12)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Display Name</span>
                <span className="text-slate-700 dark:text-slate-300">{user.name ?? "Not set"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Email Status</span>
                <span className={isVerified ? "text-emerald-700 dark:text-emerald-300" : "text-slate-600 dark:text-slate-500"}>
                  {isVerified ? "Verified" : "Pending"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/80 dark:border-cyan-400/20 dark:bg-slate-950/60 p-6 shadow-[0_20px_70px_rgba(6,182,212,0.12)]">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-lg bg-cyan-500/15 p-2">
                <Crown className="h-5 w-5 text-cyan-700 dark:text-cyan-300" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Membership</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Current Plan</span>
                <span className="capitalize text-slate-700 dark:text-slate-300">{membershipTier}</span>
              </div>
              {subscription && isPaid && (
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Price</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    ${subscription.priceAmount / 100}/{subscription.billingInterval}
                  </span>
                </div>
              )}
              {subscription && isPaid && (
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">
                    {subscription.cancelAtPeriodEnd ? "Cancels on" : "Renews on"}
                  </span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {subscription.currentPeriodEnd
                      ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Features</span>
                <span className="text-slate-700 dark:text-slate-300">{membershipTier === "premium" ? "Unlimited" : "Standard"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Support</span>
                <span className="text-slate-700 dark:text-slate-300">{membershipTier === "premium" ? "Priority" : "Community"}</span>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {isPaid ? (
                <>
                  <Button
                    onClick={handleManageSubscription}
                    disabled={portalLoading}
                    className="gap-2"
                  >
                    {portalLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        Manage Subscription
                        <ExternalLink className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                  {subscription?.cancelAtPeriodEnd ? (
                    <Button
                      variant="secondary"
                      onClick={handleResumeSubscription}
                      disabled={actionLoading === "resume"}
                    >
                      {actionLoading === "resume" ? "Resuming..." : "Resume Plan"}
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={handleCancelSubscription}
                      disabled={actionLoading === "cancel"}
                    >
                      {actionLoading === "cancel" ? "Cancelling..." : "Cancel Plan"}
                    </Button>
                  )}
                </>
              ) : (
                <Button asChild className="gap-2">
                  <Link href="/pricing">
                    Upgrade Plan
                    <TrendingUp className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <Button
            variant="secondary"
            asChild
            className="flex h-auto items-center justify-start gap-3 rounded-xl border-slate-300 dark:border-cyan-400/30 bg-white/80 dark:bg-slate-950/60 p-4 hover:border-cyan-500/40 dark:hover:border-cyan-400/50 hover:bg-slate-100 dark:hover:bg-slate-900/70"
          >
            <Link href="/settings">
              <div className="rounded-lg bg-cyan-500/15 p-2">
                <Settings2 className="h-5 w-5 text-cyan-700 dark:text-cyan-300" />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-semibold text-slate-900 dark:text-slate-50">Edit Profile</span>
                <span className="text-xs text-slate-600 dark:text-slate-400">Update name and avatar</span>
              </div>
            </Link>
          </Button>

          <Button
            variant="secondary"
            asChild
            className="flex h-auto items-center justify-start gap-3 rounded-xl border-slate-300 dark:border-cyan-400/30 bg-white/80 dark:bg-slate-950/60 p-4 hover:border-cyan-500/40 dark:hover:border-cyan-400/50 hover:bg-slate-100 dark:hover:bg-slate-900/70"
          >
            <Link href="/api-tokens">
              <div className="rounded-lg bg-emerald-500/15 p-2">
                <Key className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-semibold text-slate-900 dark:text-slate-50">API Tokens</span>
                <span className="text-xs text-slate-600 dark:text-slate-400">Manage access keys</span>
              </div>
            </Link>
          </Button>

          <Button
            variant="secondary"
            asChild
            className="flex h-auto items-center justify-start gap-3 rounded-xl border-slate-300 dark:border-cyan-400/30 bg-white/80 dark:bg-slate-950/60 p-4 hover:border-cyan-500/40 dark:hover:border-cyan-400/50 hover:bg-slate-100 dark:hover:bg-slate-900/70"
          >
            <Link href="/settings/billing">
              <div className="rounded-lg bg-cyan-500/15 p-2">
                <Calendar className="h-5 w-5 text-cyan-700 dark:text-cyan-300" />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-semibold text-slate-900 dark:text-slate-50">Billing & Subscription</span>
                <span className="text-xs text-slate-600 dark:text-slate-400">Invoices and payment details</span>
              </div>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}