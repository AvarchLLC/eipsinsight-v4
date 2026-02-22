import { env } from "@/env";

// Lazy load Redis only when needed (avoids edge runtime issues)
let Redis: any;
let redis: any;

function getRedis() {
  if (!redis) {
    // Import ioredis dynamically to avoid bundling in edge runtime
    Redis = require("ioredis").default;
    
    if (!env.REDIS_URL) {
      throw new Error("REDIS_URL is required for rate limiting");
    }

    const globalForRedis = globalThis as unknown as {
      redis?: any;
    };

    redis = globalForRedis.redis ?? new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      lazyConnect: false,
    });

    globalForRedis.redis = redis;
  }
  
  return redis;
}

export { getRedis as redis };
