import "server-only";

import mongoose from "mongoose";
import { RateLimiterMongo, RateLimiterRes } from "rate-limiter-flexible";

import { connectMongo } from "@/shared/db/connect";

type LimiterConfig = {
  keyPrefix: string;
  points: number;
  durationSeconds: number;
  blockDurationSeconds: number;
};

const limiterCache = new Map<string, RateLimiterMongo>();

async function getLimiter(config: LimiterConfig): Promise<RateLimiterMongo> {
  const cacheKey = config.keyPrefix;
  const existing = limiterCache.get(cacheKey);
  if (existing) {
    return existing;
  }

  await connectMongo();
  const client = mongoose.connection.getClient();

  const limiter = new RateLimiterMongo({
    storeClient: client,
    keyPrefix: `vc_rl_${config.keyPrefix}`,
    points: config.points,
    duration: config.durationSeconds,
    blockDuration: config.blockDurationSeconds,
    execEvenly: false,
  });

  limiterCache.set(cacheKey, limiter);
  return limiter;
}

export class RateLimitExceededError extends Error {
  readonly code = "RATE_LIMIT_EXCEEDED";
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("Rate limit exceeded");
    this.name = "RateLimitExceededError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export async function consumeMongoRateLimit(
  config: LimiterConfig,
  key: string,
): Promise<void> {
  const limiter = await getLimiter(config);
  try {
    await limiter.consume(key, 1);
  } catch (error) {
    if (error instanceof RateLimiterRes) {
      throw new RateLimitExceededError(Math.ceil(error.msBeforeNext / 1000));
    }
    throw error;
  }
}

/** Test-only reset hook */
export function resetRateLimiterCacheForTests(): void {
  limiterCache.clear();
}
