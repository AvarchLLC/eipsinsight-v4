import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

const WINDOW_MS = 3 * 60 * 60 * 1000;
const DEFAULT_REQUEST_LIMIT = 10000;
const USER_LIMIT_CACHE_TTL_SECONDS = 300;

export type RateLimitResult = {
  allowed: boolean;
  limit: number | null;
  remaining: number | null;
  resetAt: number | null;
};

const RATE_LIMIT_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]
local ttlSeconds = tonumber(ARGV[5])

redis.call('ZREMRANGEBYSCORE', key, 0, now - windowMs)
redis.call('ZADD', key, now, member)
local count = redis.call('ZCARD', key)
redis.call('EXPIRE', key, ttlSeconds)

if count > limit then
  return {0, count}
end

return {1, count}
`;

function getRateLimitKey(userId: string, apiTokenId?: string | null) {
  if (apiTokenId) {
    return `rl:token:${apiTokenId}:${WINDOW_MS}`;
  }
  return `rl:user:${userId}:${WINDOW_MS}`;
}

async function getCachedUserLimit(userId: string) {
  const redisClient = redis();
  const cached = await redisClient.get(`rl:user-limit:${userId}`);
  if (!cached) return null;

  const value = Number(cached);
  return Number.isFinite(value) ? value : null;
}

async function setCachedUserLimit(userId: string, limit: number) {
  const redisClient = redis();
  await redisClient.setex(`rl:user-limit:${userId}`, USER_LIMIT_CACHE_TTL_SECONDS, String(limit));
}

async function getUserRequestLimit(userId: string) {
  const cached = await getCachedUserLimit(userId);
  if (cached !== null) return cached;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { membershipTier: true, membershipExpiresAt: true },
  });

  const now = new Date();
  const isExpired = !!user?.membershipExpiresAt && user.membershipExpiresAt < now;
  const tierSlug = isExpired ? "free" : user?.membershipTier ?? "free";

  const tier = await prisma.membershipTier.findUnique({
    where: { slug: tierSlug },
    select: { requestLimit: true },
  });

  const limit = tier?.requestLimit ?? DEFAULT_REQUEST_LIMIT;
  await setCachedUserLimit(userId, limit);

  return limit;
}

export async function enforceRateLimit(params: {
  userId?: string | null;
  apiTokenId?: string | null;
}) {
  const { userId, apiTokenId } = params;

  if (!userId) {
    return {
      allowed: true,
      limit: null,
      remaining: null,
      resetAt: null,
    } satisfies RateLimitResult;
  }

  const limit = await getUserRequestLimit(userId);
  if (!Number.isFinite(limit) || limit <= 0) {
    return {
      allowed: true,
      limit: null,
      remaining: null,
      resetAt: null,
    } satisfies RateLimitResult;
  }

  const key = getRateLimitKey(userId, apiTokenId ?? null);
  const now = Date.now();
  const member = `${now}-${Math.random().toString(36).slice(2, 10)}`;
  const ttlSeconds = Math.ceil(WINDOW_MS / 1000) + 60;

  const redisClient = redis();
  const [allowedFlag, count] = (await redisClient.eval(
    RATE_LIMIT_LUA,
    1,
    key,
    now,
    WINDOW_MS,
    limit,
    member,
    ttlSeconds
  )) as [number, number];

  const remaining = Math.max(0, limit - count);
  let resetAt = now + WINDOW_MS;

  const oldest = (await redisClient.zrange(key, 0, 0, "WITHSCORES")) as string[];
  if (oldest.length >= 2) {
    const oldestScore = Number(oldest[1]);
    if (Number.isFinite(oldestScore)) {
      resetAt = oldestScore + WINDOW_MS;
    }
  }

  return {
    allowed: allowedFlag === 1,
    limit,
    remaining,
    resetAt,
  } satisfies RateLimitResult;
}

export function buildRateLimitHeaders(result: RateLimitResult) {
  if (result.limit === null || result.remaining === null || result.resetAt === null) {
    return {} as Record<string, string>;
  }

  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}
