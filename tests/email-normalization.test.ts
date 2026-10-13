import { describe, expect, it } from "vitest";

import { emailInputSchema, normalizeEmail } from "@/shared/validation/email";

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  User@Example.COM  ")).toBe("user@example.com");
  });
});

describe("emailInputSchema", () => {
  it("normalizes valid input", () => {
    expect(emailInputSchema.parse("  User@Example.com  ")).toBe("user@example.com");
  });

  it("rejects invalid email", () => {
    expect(() => emailInputSchema.parse("not-an-email")).toThrow();
  });
});
