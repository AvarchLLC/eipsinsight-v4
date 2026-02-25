import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { cancelSubscription } from "@/lib/stripe";

/**
 * POST /api/stripe/cancel
 * Cancels the current user's subscription at period end
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        stripeSubscriptionId: true,
      },
    });

    if (!user?.stripeSubscriptionId) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      );
    }

    const subscription = await cancelSubscription(user.stripeSubscriptionId);
    const rawPeriodEnd = (subscription as any).current_period_end;
    const currentPeriodEnd =
      rawPeriodEnd && !isNaN(rawPeriodEnd)
        ? new Date(rawPeriodEnd * 1000)
        : null;

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        stripeCurrentPeriodEnd: currentPeriodEnd,
      },
    });

    return NextResponse.json({
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: currentPeriodEnd?.toISOString() || null,
    });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    return NextResponse.json(
      {
        error: "Failed to cancel subscription",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
