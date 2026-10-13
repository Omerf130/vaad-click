import { describe, expect, it } from "vitest";

import { registerInputSchema } from "@/modules/auth/validation/register.schema";
import {
  assertPublicRegistrationRole,
  RoleAssignmentError,
} from "@/modules/users/domain/role-assignment";
import { UserRole } from "@/modules/users/domain/user-role";

describe("assertPublicRegistrationRole", () => {
  it("allows committee and management roles", () => {
    expect(() => assertPublicRegistrationRole(UserRole.BUILDING_REP)).not.toThrow();
    expect(() =>
      assertPublicRegistrationRole(UserRole.MANAGEMENT_COMPANY),
    ).not.toThrow();
  });

  it("rejects lawyer admin self-registration", () => {
    expect(() => assertPublicRegistrationRole(UserRole.LAWYER_ADMIN)).toThrow(
      RoleAssignmentError,
    );
  });
});

describe("registerInputSchema", () => {
  it("rejects lawyer role in payload", () => {
    const result = registerInputSchema.safeParse({
      fullName: "Test User",
      email: "user@example.com",
      password: "valid-password-12",
      role: UserRole.LAWYER_ADMIN,
    });
    expect(result.success).toBe(false);
  });
});
