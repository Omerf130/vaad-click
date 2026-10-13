import { describe, expect, it } from "vitest";

import { sanitizeReturnPath } from "@/shared/security/safe-redirect";

describe("sanitizeReturnPath", () => {
  it("allows internal paths", () => {
    expect(sanitizeReturnPath("/app")).toBe("/app");
  });

  it("rejects external URLs", () => {
    expect(sanitizeReturnPath("https://evil.example/phish")).toBeNull();
  });

  it("rejects protocol-relative paths", () => {
    expect(sanitizeReturnPath("//evil.example")).toBeNull();
  });
});
