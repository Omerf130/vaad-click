import { describe, expect, it } from "vitest";

import {
  computeSetupTokenExpiresAt,
  isSetupTokenActive,
  LAWYER_ADMIN_SETUP_TOKEN_TTL_MS,
} from "@/modules/auth/domain/lawyer-admin-setup-token-lifecycle";

describe("lawyer admin setup token lifecycle", () => {
  it("expires after TTL", () => {
    const now = new Date("2026-01-01T12:00:00.000Z");
    const expiresAt = computeSetupTokenExpiresAt(now);
    expect(expiresAt.getTime() - now.getTime()).toBe(LAWYER_ADMIN_SETUP_TOKEN_TTL_MS);
  });

  it("rejects used tokens", () => {
    expect(
      isSetupTokenActive(
        {
          userId: "u1",
          expiresAt: new Date("2026-01-02T12:00:00.000Z"),
          usedAt: new Date("2026-01-01T12:00:00.000Z"),
        },
        new Date("2026-01-01T12:30:00.000Z"),
      ),
    ).toBe(false);
  });

  it("rejects expired tokens", () => {
    expect(
      isSetupTokenActive(
        {
          userId: "u1",
          expiresAt: new Date("2026-01-01T11:00:00.000Z"),
          usedAt: null,
        },
        new Date("2026-01-01T12:00:00.000Z"),
      ),
    ).toBe(false);
  });

  it("accepts active unused tokens", () => {
    expect(
      isSetupTokenActive(
        {
          userId: "u1",
          expiresAt: new Date("2026-01-01T13:00:00.000Z"),
          usedAt: null,
        },
        new Date("2026-01-01T12:00:00.000Z"),
      ),
    ).toBe(true);
  });
});
