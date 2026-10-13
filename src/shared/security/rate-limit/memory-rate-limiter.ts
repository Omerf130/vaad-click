import { RateLimiterMemory, RateLimiterRes } from "rate-limiter-flexible";

import { RateLimitExceededError } from "@/shared/security/rate-limit/mongo-rate-limiter";

type LimiterConfig = {
  keyPrefix: string;
  points: number;
  durationSeconds: number;
  blockDurationSeconds: number;
};

const memoryLimiters = new Map<string, RateLimiterMemory>();

function getMemoryLimiter(config: LimiterConfig): RateLimiterMemory {
  const existing = memoryLimiters.get(config.keyPrefix);
  if (existing) {
    return existing;
  }

  const limiter = new RateLimiterMemory({
    keyPrefix: config.keyPrefix,
    points: config.points,
    duration: config.durationSeconds,
    blockDuration: config.blockDurationSeconds,
  });
  memoryLimiters.set(config.keyPrefix, limiter);
  return limiter;
}

export async function consumeMemoryRateLimit(
  config: LimiterConfig,
  key: string,
): Promise<void> {
  const limiter = getMemoryLimiter(config);
  try {
    await limiter.consume(key, 1);
  } catch (error) {
    if (error instanceof RateLimiterRes) {
      throw new RateLimitExceededError(Math.ceil(error.msBeforeNext / 1000));
    }
    throw error;
  }
}

export function resetMemoryRateLimitersForTests(): void {
  memoryLimiters.clear();
}
