import { describe, expect, it } from "vitest";

import {
  createOpaqueSessionToken,
  hashSessionTokenWithSecret,
} from "@/shared/security/session-token";

describe("session token utilities", () => {
  it("creates high-entropy opaque tokens", () => {
    const a = createOpaqueSessionToken();
    const b = createOpaqueSessionToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(20);
  });

  it("hashes tokens deterministically with AUTH_SECRET", () => {
    const token = "sample-token-value";
    const secret = process.env.AUTH_SECRET ?? "";
    expect(hashSessionTokenWithSecret(token, secret)).toBe(
      hashSessionTokenWithSecret(token, secret),
    );
    expect(hashSessionTokenWithSecret(token, secret)).not.toBe(token);
  });
});
