import { afterEach, describe, expect, it } from "vitest";

import {
  consumeMemoryRateLimit,
  resetMemoryRateLimitersForTests,
} from "@/shared/security/rate-limit/memory-rate-limiter";
import { RateLimitExceededError } from "@/shared/security/rate-limit/mongo-rate-limiter";

const config = {
  keyPrefix: "test-login",
  points: 2,
  durationSeconds: 60,
  blockDurationSeconds: 60,
};

describe("memory rate limiter", () => {
  afterEach(() => {
    resetMemoryRateLimitersForTests();
  });

  it("blocks after exceeding points", async () => {
    await consumeMemoryRateLimit(config, "ip-1");
    await consumeMemoryRateLimit(config, "ip-1");
    await expect(consumeMemoryRateLimit(config, "ip-1")).rejects.toBeInstanceOf(
      RateLimitExceededError,
    );
  });
});
