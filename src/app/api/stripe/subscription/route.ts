import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getSubscription } from "@/lib/stripe";

/**
 * GET /api/stripe/subscription
 * Gets the current user's subscription status and details
 */
export async function GET(request: NextRequest) {
  try {
    // Get session from better-auth
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        membershipTier: true,
        stripeSubscriptionId: true,
        stripeCurrentPeriodEnd: true,
        stripePriceId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If no subscription, return free tier
    if (!user.stripeSubscriptionId) {
      return NextResponse.json({
        tier: user.membershipTier || "free",
        status: "free",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        priceAmount: 0,
        priceCurrency: "usd",
        billingInterval: "month",
      });
    }

    // Fetch subscription from Stripe
    const subscription = await getSubscription(user.stripeSubscriptionId);

    if (!subscription) {
      return NextResponse.json({
        tier: user.membershipTier || "free",
        status: "free",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        priceAmount: 0,
        priceCurrency: "usd",
        billingInterval: "month",
      });
    }

    // Get price information
    const price = subscription.items.data[0]?.price;
    const priceId = price?.id;

    // If user doesn't have tier set but has a subscription, infer tier from price ID
    let tier = user.membershipTier || "free";
    if (!user.membershipTier && priceId) {
      const dbTier = await prisma.membershipTier.findFirst({
        where: {
          OR: [
            { stripePriceIdMonthly: priceId },
            { stripePriceIdYearly: priceId },
          ],
        },
      });

      if (dbTier?.slug) {
        tier = dbTier.slug;
        // Update the user record with the inferred tier
        await prisma.user.update({
          where: { id: session.user.id },
          data: { membershipTier: tier },
        });
      }
    }

    const rawPeriodEnd = (subscription as any).current_period_end;
    const rawAnchor = (subscription as any).billing_cycle_anchor;
    const rawEndedAt = (subscription as any).ended_at;
    const recurring = price?.recurring;

    const computePeriodEndFromAnchor = () => {
      if (!rawAnchor || isNaN(rawAnchor) || !recurring?.interval) return null;
      const intervalCount = recurring.interval_count ?? 1;
      const anchorDate = new Date(rawAnchor * 1000);
      const endDate = new Date(anchorDate.getTime());

      switch (recurring.interval) {
        case "day":
          endDate.setDate(endDate.getDate() + intervalCount);
          break;
        case "week":
          endDate.setDate(endDate.getDate() + intervalCount * 7);
          break;
        case "month":
          endDate.setMonth(endDate.getMonth() + intervalCount);
          break;
        case "year":
          endDate.setFullYear(endDate.getFullYear() + intervalCount);
          break;
        default:
          return null;
      }

      return endDate;
    };

    const currentPeriodEndDate =
      rawPeriodEnd && !isNaN(rawPeriodEnd)
        ? new Date(rawPeriodEnd * 1000)
        : rawEndedAt && !isNaN(rawEndedAt)
          ? new Date(rawEndedAt * 1000)
          : computePeriodEndFromAnchor();

    const currentPeriodEnd =
      currentPeriodEndDate?.toISOString() ||
      user.stripeCurrentPeriodEnd?.toISOString() ||
      null;

    if (currentPeriodEnd && !user.stripeCurrentPeriodEnd) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { stripeCurrentPeriodEnd: new Date(currentPeriodEnd) },
      });
    }

    return NextResponse.json({
      tier,
      status: subscription.status,
      currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      priceAmount: price?.unit_amount || 0,
      priceCurrency: price?.currency || "usd",
      billingInterval: price?.recurring?.interval || "month",
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch subscription",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
