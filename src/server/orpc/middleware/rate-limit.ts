import { os, ORPCError } from "@orpc/server";
import type { Ctx } from "../procedures/types";
import { enforceRateLimit, buildRateLimitHeaders } from "@/lib/rate-limit";

export type RateLimitedContext = Ctx & {
  rateLimitHeaders: Record<string, string>;
};

export const withRateLimit = os
  .$context<Ctx>()
  .use(async ({ context, next }) => {
    const result = await enforceRateLimit({
      userId: context.user?.id,
      apiTokenId: context.apiToken?.id,
    });

    const rateLimitHeaders = buildRateLimitHeaders(result);

    if (!result.allowed) {
      throw new ORPCError("TOO_MANY_REQUESTS", {
        message: `Rate limit exceeded. Limit: ${result.limit}, Remaining: ${result.remaining}, Reset at: ${result.resetAt}`,
      });
    }

    return next({
      context: {
        ...context,
        rateLimitHeaders,
      },
    });
  });
