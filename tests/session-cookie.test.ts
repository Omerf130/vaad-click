import { describe, expect, it } from "vitest";

import {
  buildSessionClearCookieOptions,
  buildSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/modules/auth/domain/session-cookie-policy";
import { SessionAuthStage } from "@/modules/auth/domain/session-types";

describe("session cookie configuration", () => {
  it("uses HttpOnly, SameSite=Lax, and path /", () => {
    const options = buildSessionCookieOptions(SessionAuthStage.MFA_COMPLETE, true);
    expect(options.name).toBe(SESSION_COOKIE_NAME);
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
  });

  it("sets Secure in production-like config", () => {
    const secure = buildSessionCookieOptions(SessionAuthStage.PRIMARY, true);
    const insecure = buildSessionCookieOptions(SessionAuthStage.PRIMARY, false);
    expect(secure.secure).toBe(true);
    expect(insecure.secure).toBe(false);
  });

  it("clears cookie with maxAge 0", () => {
    const cleared = buildSessionClearCookieOptions(true);
    expect(cleared.maxAge).toBe(0);
    expect(cleared.httpOnly).toBe(true);
  });
});
