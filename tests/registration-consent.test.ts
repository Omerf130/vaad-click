import { describe, expect, it } from "vitest";

import { registrationConsentState } from "@/content/registration-consent";

describe("registration consent (CP10)", () => {
  it("remains pending until legal documents are approved", () => {
    expect(registrationConsentState.status).toBe("pending_legal_approval");
    expect(registrationConsentState.notice).toMatch(/אינה מהווה הסכמה/);
  });

  it("links to draft legal routes without implying binding acceptance", () => {
    expect(registrationConsentState.privacyPath).toBe("/privacy");
    expect(registrationConsentState.termsPath).toBe("/terms");
  });
});
