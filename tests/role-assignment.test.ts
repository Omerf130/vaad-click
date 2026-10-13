import { describe, expect, it } from "vitest";

import {
  assertPublicRegistrationRole,
  assertRoleAssignmentPermitted,
  RoleAssignmentError,
} from "@/modules/users/domain/role-assignment";
import { UserRole } from "@/modules/users/domain/user-role";

describe("role assignment restrictions", () => {
  it("rejects self-assignment of any role", () => {
    expect(() =>
      assertRoleAssignmentPermitted(UserRole.BUILDING_REP, { assignerRole: null }),
    ).toThrow(RoleAssignmentError);
  });

  it("rejects non-lawyer assigners creating lawyer admin", () => {
    expect(() =>
      assertRoleAssignmentPermitted(UserRole.LAWYER_ADMIN, {
        assignerRole: UserRole.MANAGEMENT_COMPANY,
      }),
    ).toThrow(RoleAssignmentError);
  });

  it("allows lawyer admin to assign lawyer admin", () => {
    expect(() =>
      assertRoleAssignmentPermitted(UserRole.LAWYER_ADMIN, {
        assignerRole: UserRole.LAWYER_ADMIN,
      }),
    ).not.toThrow();
  });

  it("allows lawyer admin to assign building rep", () => {
    expect(() =>
      assertRoleAssignmentPermitted(UserRole.BUILDING_REP, {
        assignerRole: UserRole.LAWYER_ADMIN,
      }),
    ).not.toThrow();
  });
});

describe("assertPublicRegistrationRole", () => {
  it("rejects lawyer admin via public registration helper", () => {
    expect(() => assertPublicRegistrationRole(UserRole.LAWYER_ADMIN)).toThrow(
      RoleAssignmentError,
    );
  });
});
