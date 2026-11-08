import { describe, expect, it } from "vitest";

import { registrationConsentState } from "@/content/registration-consent";

describe("registration consent (CP18C)", () => {
  it("remains informational without server-side acceptance", () => {
    expect(registrationConsentState.status).toBe("informational_only");
    expect(registrationConsentState.notice).toMatch(/תנאי השימוש/);
  });

  it("links to legal routes without implying binding acceptance in-app", () => {
    expect(registrationConsentState.privacyPath).toBe("/privacy");
    expect(registrationConsentState.termsPath).toBe("/terms");
  });
});
