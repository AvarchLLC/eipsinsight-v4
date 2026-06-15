import { env } from "@/env";
import type StripeLib from "stripe";

/**
 * Lazy Stripe client initializer to avoid requiring the `stripe` package at
 * top-level (which can break builds when it's not installed).
 */
let _stripe: StripeLib | null = null;
async function stripeClient() {
  if (_stripe) return _stripe;
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  const Stripe = (await import("stripe")).default;
  _stripe = new Stripe(env.STRIPE_SECRET_KEY as string, {
    apiVersion: "2026-01-28.clover",
    typescript: true,
  });
  return _stripe;
}

/**
 * Membership tier configuration that maps to Stripe products
 * Update these with your actual Stripe Product and Price IDs
 */
export const STRIPE_PLANS = {
  free: {
    name: "Free",
    slug: "free",
    priceMonthly: 0,
    priceYearly: 0,
    requestLimit: 1000,
    features: [
      "1,000 API requests/month",
      "Basic EIP data access",
      "Community support",
      "Standard analytics",
    ],
  },
  pro: {
    name: "Pro",
    slug: "pro",
    priceMonthly: 29,
    priceYearly: 290, // ~17% discount
    requestLimit: 50000,
    features: [
      "50,000 API requests/month",
      "Advanced analytics",
      "Priority support",
      "Export capabilities",
      "Custom integrations",
      "API webhooks",
    ],
    // Add your Stripe Product and Price IDs here
    stripeProductId: "prod_U23DtoM1jcOkOw",
    stripePriceIdMonthly: "price_1T3z7RATJNEiu6uCl16uk65s",
    stripePriceIdYearly: "price_1T3zDrATJNEiu6uCvmFt2ao5",
  },
  enterprise: {
    name: "Enterprise",
    slug: "enterprise",
    priceMonthly: 99,
    priceYearly: 990,
    requestLimit: 500000,
    features: [
      "500,000 API requests/month",
      "Dedicated support",
      "Custom rate limits",
      "SLA guarantee",
      "Advanced security",
      "Custom contracts",
      "White-label options",
    ],
    // Add your Stripe Product and Price IDs here
    stripeProductId: "prod_U23EzfqOtDsC1E",
    stripePriceIdMonthly: "price_1T3z7wATJNEiu6uC4Q9ZPh0i",
    stripePriceIdYearly: "price_1T3zE7ATJNEiu6uC5Ver6TZd",
  },
} as const;

export type PlanSlug = keyof typeof STRIPE_PLANS;

/**
 * Create or retrieve a Stripe customer for a user
 */
function isDeletedStripeCustomer(
  customer: StripeLib.Customer | StripeLib.DeletedCustomer
): customer is StripeLib.DeletedCustomer {
  return "deleted" in customer && customer.deleted === true;
}

function isStripeResourceMissing(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    (error as { type?: string }).type === "StripeInvalidRequestError" &&
    "code" in error &&
    (error as { code?: string }).code === "resource_missing"
  );
}

export async function getOrCreateStripeCustomer(params: {
  userId: string;
  email: string;
  name: string;
  stripeCustomerId?: string | null;
}) {
  const { userId, email, name, stripeCustomerId } = params;
  const stripe = await stripeClient();

  // Verify stored ID still exists in Stripe
  if (stripeCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(stripeCustomerId);
      if (!isDeletedStripeCustomer(customer)) {
        return stripeCustomerId;
      }
    } catch (error) {
      if (!isStripeResourceMissing(error)) {
        throw error;
      }
      // Stale or missing customer ID — fall through to search/create
    }
  }

  // Reuse an existing Stripe customer linked via metadata (e.g. DB not yet updated)
  const search = await stripe.customers.search({
    query: `metadata['userId']:'${userId}'`,
    limit: 1,
  });
  const existing = search.data[0];
  if (existing && !isDeletedStripeCustomer(existing)) {
    return existing.id;
  }

  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      userId,
    },
  });

  return customer.id;
}

/**
 * Create a checkout session for a subscription
 */
export async function createCheckoutSession(params: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}) {
  const { customerId, priceId, successUrl, cancelUrl, metadata } = params;
  const stripe = await stripeClient();
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    customer_update: {
      address: "auto",
      name: "auto",
    },
  });

  return session;
}

/**
 * Create a portal session for managing subscriptions
 */
export async function createPortalSession(params: {
  customerId: string;
  returnUrl: string;
}) {
  const { customerId, returnUrl } = params;
  const stripe = await stripeClient();
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

/** Retrieve a Stripe customer by ID */
export async function retrieveCustomer(customerId: string) {
  const stripe = await stripeClient();
  return stripe.customers.retrieve(customerId);
}

/** Retrieve a checkout session */
export async function retrieveCheckoutSession(sessionId: string, expand?: string[]) {
  const stripe = await stripeClient();
  return stripe.checkout.sessions.retrieve(sessionId, { expand });
}

/** Retrieve a subscription */
export async function retrieveSubscription(subscriptionId: string) {
  const stripe = await stripeClient();
  return stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * Get subscription status
 */
export async function getSubscription(subscriptionId: string) {
  try {
    const stripe = await stripeClient();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    console.error("Error retrieving subscription:", error);
    return null;
  }
}

/**
 * Cancel a subscription at period end
 */
export async function cancelSubscription(subscriptionId: string) {
  const stripe = await stripeClient();
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
  return subscription;
}

/**
 * Resume a cancelled subscription
 */
export async function resumeSubscription(subscriptionId: string) {
  const stripe = await stripeClient();
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
  return subscription;
}

/**
 * Verify Stripe webhook signature
 */
export async function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }
  const stripe = await stripeClient();
  return stripe.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET as string);
}
