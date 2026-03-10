"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { toast } from "sonner";

interface PricingTier {
  name: string;
  slug: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
  popular?: boolean;
  cta: string;
}

const PRICING_TIERS: PricingTier[] = [
  {
    name: "Free",
    slug: "free",
    description: "Perfect for getting started with EIP data",
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      "1,000 API requests/month",
      "Basic EIP data access",
      "Community support",
      "Standard analytics",
    ],
    cta: "Get Started",
  },
  {
    name: "Pro",
    slug: "pro",
    description: "For developers and teams building on Ethereum",
    priceMonthly: 29,
    priceYearly: 290,
    features: [
      "50,000 API requests/month",
      "Advanced analytics",
      "Priority support",
      "Export capabilities",
      "Custom integrations",
      "API webhooks",
    ],
    stripePriceIdMonthly: "price_1T3z7RATJNEiu6uCl16uk65s",
    stripePriceIdYearly: "price_1T3zDrATJNEiu6uCvmFt2ao5",
    popular: true,
    cta: "Start Pro Trial",
  },
  {
    name: "Enterprise",
    slug: "enterprise",
    description: "Advanced features for large organizations",
    priceMonthly: 99,
    priceYearly: 990,
    features: [
      "500,000 API requests/month",
      "Dedicated support",
      "Custom rate limits",
      "SLA guarantee",
      "Advanced security",
      "Custom contracts",
      "White-label options",
    ],
    stripePriceIdMonthly: "price_1T3z7wATJNEiu6uC4Q9ZPh0i",
    stripePriceIdYearly: "price_1T3zE7ATJNEiu6uC5Ver6TZd",
    cta: "Contact Sales",
  },
];

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "monthly"
  );
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const router = useRouter();
  const { data: session } = useSession();

  const handleSubscribe = async (tier: PricingTier) => {
    // Redirect to sign in if not authenticated
    if (!session?.user) {
      router.push("/login?callbackUrl=/premium");
      return;
    }

    // Free tier - just update user
    if (tier.slug === "free") {
      router.push("/dashboard");
      return;
    }

    // Enterprise - contact sales
    if (tier.slug === "enterprise") {
      window.location.href = "mailto:sales@eipsinsight.com";
      return;
    }

    // Get the appropriate price ID
    const priceId =
      billingPeriod === "monthly"
        ? tier.stripePriceIdMonthly
        : tier.stripePriceIdYearly;

    if (!priceId || priceId === "price_xxxxxxxxxxxxx") {
      toast.error("Stripe Price ID not configured");
      return;
    }

    setLoadingPlan(tier.slug);

    try {
      // Create checkout session
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          tierSlug: tier.slug,
          billingPeriod,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create checkout session");
      }

      const { url } = await response.json();

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error) {
      console.error("Error creating checkout session:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to start checkout. Please try again."
      );
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-50 via-slate-100 to-slate-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.08),_transparent_58%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.16),_transparent_58%)]" />
        <div className="absolute left-1/2 top-0 h-[640px] w-[640px] -translate-x-1/2 rounded-full bg-cyan-400/6 blur-3xl dark:bg-cyan-300/10" />
      </div>

      <div className="relative mx-auto w-full max-w-full px-4 py-14 sm:px-6 lg:px-8 xl:px-12">
        {/* Header */}
        <div className="mb-9 text-center">
          <h1 className="dec-title bg-linear-to-br from-emerald-700 via-slate-700 to-cyan-700 dark:from-emerald-300 dark:via-slate-100 dark:to-cyan-200 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
            Choose Your Plan
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Unlock powerful EIP insights and API access. Start free, upgrade as
            you grow.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="mb-10 flex items-center justify-center">
          <div className="inline-flex items-center gap-4 rounded-full border border-slate-200 bg-white/85 px-4 py-2 shadow-[0_8px_22px_rgba(15,23,42,0.08)] dark:border-slate-700/50 dark:bg-slate-900/70 dark:shadow-none">
          <span
            className={`text-sm font-medium ${billingPeriod === "monthly" ? "text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"}`}
          >
            Monthly
          </span>
          <button
            onClick={() =>
              setBillingPeriod(billingPeriod === "monthly" ? "yearly" : "monthly")
            }
            className="relative inline-flex h-6 w-11 items-center rounded-full border border-slate-300 bg-white/90 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/40 dark:border-slate-700/50 dark:bg-slate-900/70"
            aria-label="Toggle billing period"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-linear-to-r from-emerald-500 to-cyan-500 transition-transform ${billingPeriod === "yearly" ? "translate-x-6" : "translate-x-1"}`}
            />
          </button>
          <span
            className={`text-sm font-medium ${billingPeriod === "yearly" ? "text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"}`}
          >
            Yearly
            <span className="ml-1 text-xs text-emerald-600 dark:text-emerald-400">(Save ~17%)</span>
          </span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
          {PRICING_TIERS.map((tier) => {
            const price =
              billingPeriod === "monthly"
                ? tier.priceMonthly
                : tier.priceYearly / 12;
            const isLoading = loadingPlan === tier.slug;

            return (
              <div
                key={tier.slug}
                className={`relative flex h-full flex-col overflow-visible rounded-xl p-6 backdrop-blur-sm transition-all duration-300 ${
                  tier.popular
                    ? "border border-cyan-400/50 bg-white shadow-[0_14px_36px_rgba(8,145,178,0.16)] dark:bg-slate-900/60 dark:shadow-[0_14px_32px_rgba(8,145,178,0.2)]"
                    : "border border-slate-200 bg-white/95 shadow-[0_10px_24px_rgba(15,23,42,0.07)] dark:border-slate-700/50 dark:bg-slate-900/50 dark:shadow-none"
                }`}
              >
                {tier.popular && (
                  <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/40 bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-1 text-xs font-semibold text-slate-950">
                    Most Popular
                  </div>
                )}

                <div className={tier.popular ? "absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-cyan-500/12 to-transparent" : "absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-slate-300 to-transparent dark:via-cyan-400/30"} />

                <div className="mb-6">
                  <h3 className="dec-title mb-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{tier.name}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {tier.description}
                  </p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-bold tracking-tight text-slate-900 dark:text-white">
                      ${price.toFixed(0)}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">/month</span>
                  </div>
                  {billingPeriod === "yearly" && tier.priceYearly > 0 && (
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      ${tier.priceYearly} billed annually
                    </p>
                  )}
                </div>

                <ul className="mb-8 space-y-3">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(tier)}
                  disabled={isLoading}
                  className={`mt-auto flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-all ${
                    tier.popular
                      ? "bg-linear-to-r from-emerald-500 to-cyan-500 text-black hover:from-emerald-400 hover:to-cyan-400"
                      : "border border-slate-300 bg-slate-50 text-slate-800 hover:border-cyan-400/40 hover:bg-white dark:border-slate-700/50 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:border-cyan-400/40 dark:hover:bg-slate-800"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    tier.cta
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* FAQ or Additional Info */}
        <div className="mt-12 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            All plans include access to historical EIP data and standard
            analytics.
            <br />
            Need a custom plan?{" "}
            <a
              href="mailto:sales@eipsinsight.com"
              className="text-cyan-700 hover:underline dark:text-cyan-300"
            >
              Contact our sales team
            </a>
            .
          </p>
        </div>

      </div>
    </div>
  );
}
