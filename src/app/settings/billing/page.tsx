"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/hooks/useSession";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CreditCard, Calendar, TrendingUp, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export default function BillingPage() {
  const { data: session, loading } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(
    null
  );
  const [dataLoading, setDataLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<"cancel" | "resume" | null>(
    null
  );
  const [message, setMessage] = useState("");

  const refreshSubscription = async () => {
    try {
      const response = await fetch("/api/stripe/subscription");
      if (response.ok) {
        const data = await response.json();
        setSubscription(data);
      }
    } catch (error) {
      console.error("Error fetching subscription:", error);
    }
  };

  useEffect(() => {
    // Sync subscription if redirected from Stripe checkout
    const sessionId = searchParams.get("session_id");
    if (!sessionId || loading || !session?.user) return;

    const syncCheckoutSession = async () => {
      try {
        const response = await fetch("/api/stripe/checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error("Checkout session sync error:", error);
        } else {
          setMessage(
            "Subscription activated successfully! Thank you for subscribing."
          );
          toast.success("Subscription activated");
        }

        // Refetch subscription data after sync
        await new Promise((resolve) => setTimeout(resolve, 500));
        await refreshSubscription();
      } catch (error) {
        console.error("Error syncing checkout session:", error);
      } finally {
        // Remove session_id from URL
        window.history.replaceState({}, "", "/settings/billing");
      }
    };

    syncCheckoutSession();
  }, [searchParams, loading, session?.user]);

  useEffect(() => {
    if (loading) return;

    if (!session?.user) {
      router.push("/login?callbackUrl=/settings/billing");
      return;
    }

    // Fetch subscription data
    const fetchSubscription = async () => {
      try {
        await refreshSubscription();
      } finally {
        setDataLoading(false);
      }
    };

    fetchSubscription();
  }, [session, loading, router]);

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      });

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

  if (loading || dataLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const tier = subscription?.tier || "free";
  const isFreeTier = tier === "free";

  return (
    <div className="page-shell-narrow space-y-8 py-10">
      <div className="flex flex-col gap-2">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs uppercase tracking-wide text-primary">
          Billing
        </div>
        <h1 className="dec-title persona-title text-balance text-3xl font-semibold tracking-tight leading-[1.1] sm:text-4xl">
          Billing & Subscription
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Manage your subscription and billing information
        </p>
      </div>

      {message && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-emerald-700 dark:text-emerald-300">
          {message}
        </div>
      )}

      {/* Current Plan */}
      <div className="rounded-xl border border-border bg-card/60 p-6">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground">Current Plan</h2>
            <p className="text-muted-foreground text-sm">
              Your current subscription tier and status
            </p>
          </div>
          {!isFreeTier && subscription && (
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                subscription.status === "active"
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : subscription.status === "trialing"
                    ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
              }`}
            >
              {subscription.status.charAt(0).toUpperCase() +
                subscription.status.slice(1)}
            </span>
          )}
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Plan</p>
              <p className="font-semibold capitalize">{tier}</p>
            </div>
          </div>

          {!isFreeTier && subscription && (
            <>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Price</p>
                  <p className="font-semibold">
                    ${subscription.priceAmount / 100}/{subscription.billingInterval}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {subscription.cancelAtPeriodEnd
                      ? "Cancels on"
                      : "Renews on"}
                  </p>
                  <p className="font-semibold">
                    {subscription.currentPeriodEnd
                      ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {subscription?.cancelAtPeriodEnd && (
          <div className="mb-6 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-amber-700 dark:text-amber-300">
            Your subscription will be cancelled on{" "}
            {subscription.currentPeriodEnd
              ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
              : "the end of the current period"}
            . You&apos;ll be reverted to the Free plan.
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {isFreeTier ? (
            <Button
              onClick={() => router.push("/pricing")}
              className="rounded-full border border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
            >
              Upgrade Plan
            </Button>
          ) : (
            <>
              <Button
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 text-primary hover:bg-primary/15 disabled:opacity-50"
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
                  onClick={handleResumeSubscription}
                  disabled={actionLoading === "resume"}
                  variant="secondary"
                  className="rounded-full"
                >
                  {actionLoading === "resume" ? "Resuming..." : "Resume Plan"}
                </Button>
              ) : (
                <Button
                  onClick={handleCancelSubscription}
                  disabled={actionLoading === "cancel"}
                  variant="secondary"
                  className="rounded-full"
                >
                  {actionLoading === "cancel" ? "Cancelling..." : "Cancel Plan"}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Plan Features */}
      <div className="rounded-xl border border-border bg-card/60 p-6">
        <h2 className="dec-title mb-4 text-xl font-semibold tracking-tight text-foreground">Plan Features</h2>
        <div className="space-y-3">
          {tier === "free" && (
            <>
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span>1,000 API requests/month</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span>Basic EIP data access</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span>Community support</span>
              </div>
            </>
          )}

          {tier === "pro" && (
            <>
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span>50,000 API requests/month</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span>Advanced analytics</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span>Priority support</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span>Export capabilities</span>
              </div>
            </>
          )}

          {tier === "enterprise" && (
            <>
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span>500,000 API requests/month</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span>Dedicated support</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span>Custom rate limits</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span>SLA guarantee</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Billing History - Future Enhancement */}
      <div className="rounded-xl border border-border bg-card/60 p-6">
        <h2 className="dec-title mb-2 text-xl font-semibold tracking-tight text-foreground">Billing History</h2>
        <p className="text-muted-foreground text-sm mb-4">
          View and download your past invoices
        </p>
        <p className="text-sm text-muted-foreground italic">
          Billing history will be available after your first payment. You can
          also access invoices through the Stripe customer portal.
        </p>
      </div>
    </div>
  );
}
