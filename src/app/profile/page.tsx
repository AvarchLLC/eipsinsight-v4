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
import { toast } from "sonner";

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
      toast.error("Failed to open subscription management");
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
      toast.success("Subscription cancellation scheduled");
      await refreshSubscription();
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      toast.error("Failed to cancel subscription");
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
      toast.success("Subscription resumed");
      await refreshSubscription();
    } catch (error) {
      console.error("Error resuming subscription:", error);
      toast.error("Failed to resume subscription");
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading || tierLoading) {
    return (
      <div className="page-shell py-10">
        <div className="animate-pulse space-y-6">
          <div className="h-32 w-32 rounded-full bg-muted" />
          <div className="h-8 w-72 rounded-lg bg-muted" />
          <div className="h-5 w-96 rounded-lg bg-muted" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-40 rounded-xl bg-muted" />
            <div className="h-40 rounded-xl bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="page-shell py-10">
        <div className="rounded-xl border border-border bg-card/60 p-8">
          <h1 className="mb-2 dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">You are not signed in</h1>
          <p className="mb-6 text-muted-foreground">Please log in to view your profile.</p>
          <div className="flex gap-2">
            <Button
              asChild
              className="rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary/15"
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
    <div className="page-shell py-10">
      <div className="mb-8 flex flex-col gap-2">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs uppercase tracking-wide text-primary">
          Profile
        </div>
        <h1 className="dec-title persona-title text-balance text-3xl font-semibold tracking-tight leading-[1.1] sm:text-4xl">Your Account</h1>
        <p className="text-sm text-muted-foreground sm:text-base">Manage your identity, credentials, and preferences.</p>
      </div>

      {message && (
        <div className="mb-6 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          {message}
        </div>
      )}

      <div className="space-y-6">
        {/* Profile Header Card */}
        <div className="relative overflow-hidden rounded-xl border border-border bg-card/60 p-6">
          <div className="absolute right-4 top-4">
            {isPaid && (
              <div className="flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                <Crown className="h-3.5 w-3.5" />
                {membershipTier.charAt(0).toUpperCase() + membershipTier.slice(1)}
              </div>
            )}
            {membershipTier === "free" && (
              <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground">
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
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>

            <div className="flex-1">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                {user.name ?? user.email}
              </h2>
              {user.email && (
                <div className="mt-1 flex items-center gap-2 text-muted-foreground">
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
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
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
          <div className="rounded-xl border border-border bg-card/60 p-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-lg bg-emerald-500/15 p-2">
                <User className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Identity</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">User ID</span>
                <span className="font-mono text-xs text-foreground">{user.id.slice(0, 12)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Display Name</span>
                <span className="text-foreground">{user.name ?? "Not set"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email Status</span>
                <span className={isVerified ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground"}>
                  {isVerified ? "Verified" : "Pending"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card/60 p-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-lg bg-cyan-500/15 p-2">
                <Crown className="h-5 w-5 text-cyan-700 dark:text-cyan-300" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Membership</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Plan</span>
                <span className="capitalize text-foreground">{membershipTier}</span>
              </div>
              {subscription && isPaid && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price</span>
                  <span className="text-foreground">
                    ${subscription.priceAmount / 100}/{subscription.billingInterval}
                  </span>
                </div>
              )}
              {subscription && isPaid && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {subscription.cancelAtPeriodEnd ? "Cancels on" : "Renews on"}
                  </span>
                  <span className="text-foreground">
                    {subscription.currentPeriodEnd
                      ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Features</span>
                <span className="text-foreground">{membershipTier === "premium" ? "Unlimited" : "Standard"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Support</span>
                <span className="text-foreground">{membershipTier === "premium" ? "Priority" : "Community"}</span>
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
            className="flex h-auto items-center justify-start gap-3 rounded-xl border-border bg-card/60 p-4 hover:border-primary/40 hover:bg-primary/10"
          >
            <Link href="/settings">
              <div className="rounded-lg bg-cyan-500/15 p-2">
                <Settings2 className="h-5 w-5 text-cyan-700 dark:text-cyan-300" />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-semibold text-foreground">Edit Profile</span>
                <span className="text-xs text-muted-foreground">Update name and avatar</span>
              </div>
            </Link>
          </Button>

          <Button
            variant="secondary"
            asChild
            className="flex h-auto items-center justify-start gap-3 rounded-xl border-border bg-card/60 p-4 hover:border-primary/40 hover:bg-primary/10"
          >
            <Link href="/api-tokens">
              <div className="rounded-lg bg-emerald-500/15 p-2">
                <Key className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-semibold text-foreground">API Tokens</span>
                <span className="text-xs text-muted-foreground">Manage access keys</span>
              </div>
            </Link>
          </Button>

          <Button
            variant="secondary"
            asChild
            className="flex h-auto items-center justify-start gap-3 rounded-xl border-border bg-card/60 p-4 hover:border-primary/40 hover:bg-primary/10"
          >
            <Link href="/settings/billing">
              <div className="rounded-lg bg-cyan-500/15 p-2">
                <Calendar className="h-5 w-5 text-cyan-700 dark:text-cyan-300" />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-semibold text-foreground">Billing & Subscription</span>
                <span className="text-xs text-muted-foreground">Invoices and payment details</span>
              </div>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
