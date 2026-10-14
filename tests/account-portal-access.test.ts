import { describe, expect, it } from "vitest";

import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import {
  canAccessAccountStatusPage,
  canAccessOperationalPortal,
} from "@/shared/auth/account-portal-access";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";

function context(
  partial: Partial<AuthenticatedContext["user"]> & Pick<AuthenticatedContext["user"], "role">,
): AuthenticatedContext {
  return {
    user: {
      id: "user-1",
      email: "u@example.com",
      fullName: "User",
      accountStatus: AccountStatus.ACTIVE,
      ...partial,
    },
    session: {} as AuthenticatedContext["session"],
  };
}

describe("account portal access (CP6A)", () => {
  it("allows pending and rejected users on account-status only", () => {
    const pending = context({
      role: UserRole.BUILDING_REP,
      accountStatus: AccountStatus.PENDING_APPROVAL,
    });
    expect(canAccessAccountStatusPage(pending)).toBe(true);
    expect(canAccessOperationalPortal(pending)).toBe(false);

    const rejected = context({
      role: UserRole.MANAGEMENT_COMPANY,
      accountStatus: AccountStatus.REJECTED,
    });
    expect(canAccessAccountStatusPage(rejected)).toBe(true);
    expect(canAccessOperationalPortal(rejected)).toBe(false);
  });

  it("allows active non-lawyer users on operational portal (building scope is CP6B)", () => {
    const activeRep = context({
      role: UserRole.BUILDING_REP,
      accountStatus: AccountStatus.ACTIVE,
    });
    expect(canAccessOperationalPortal(activeRep)).toBe(true);
  });

  it("denies lawyer admin the account-status page", () => {
    const lawyer = context({
      role: UserRole.LAWYER_ADMIN,
      accountStatus: AccountStatus.ACTIVE,
    });
    expect(canAccessAccountStatusPage(lawyer)).toBe(false);
    expect(canAccessOperationalPortal(lawyer)).toBe(true);
  });
});
