import "server-only";

import { getAppEnv } from "@/shared/config/env.server";
import {
  consumeMemoryRateLimit,
  resetMemoryRateLimitersForTests,
} from "@/shared/security/rate-limit/memory-rate-limiter";
import {
  consumeMongoRateLimit,
  RateLimitExceededError,
  resetRateLimiterCacheForTests,
} from "@/shared/security/rate-limit/mongo-rate-limiter";

export { RateLimitExceededError };

type LimiterConfig = {
  keyPrefix: string;
  points: number;
  durationSeconds: number;
  blockDurationSeconds: number;
};

export async function consumeRateLimit(
  config: LimiterConfig,
  key: string,
): Promise<void> {
  if (getAppEnv() === "test") {
    await consumeMemoryRateLimit(config, key);
    return;
  }
  await consumeMongoRateLimit(config, key);
}

export function resetRateLimitersForTests(): void {
  resetMemoryRateLimitersForTests();
  resetRateLimiterCacheForTests();
}
