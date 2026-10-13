import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/shared/security/password";
import { passwordInputSchema } from "@/shared/security/password.schema";

describe("passwordInputSchema", () => {
  it("enforces minimum length", () => {
    expect(() => passwordInputSchema.parse("short")).toThrow();
  });

  it("accepts strong length passwords", () => {
    expect(passwordInputSchema.parse("valid-password-12")).toBe("valid-password-12");
  });
});

describe("hashPassword / verifyPassword", () => {
  it("hashes and verifies without storing plaintext", async () => {
    const plain = "correct-horse-battery-staple";
    const hash = await hashPassword(plain);

    expect(hash).not.toContain(plain);
    expect(hash.startsWith("$argon2")).toBe(true);
    await expect(verifyPassword(plain, hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password-value", hash)).resolves.toBe(false);
  });

  it("returns false for empty hash", async () => {
    await expect(verifyPassword("any-password-here", "")).resolves.toBe(false);
  });
});
