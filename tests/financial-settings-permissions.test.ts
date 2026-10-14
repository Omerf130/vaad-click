import { describe, expect, it } from "vitest";

import { SessionAuthStage } from "@/modules/auth/domain/session-types";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import { FinancialSettingsForbiddenError } from "@/modules/financial-settings/domain/financial-settings-errors";
import { assertLawyerAdmin } from "@/modules/financial-settings/services/assert-lawyer-admin";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";

const lawyerContext: AuthenticatedContext = {
  user: {
    id: "lawyer-id",
    fullName: "Lawyer",
    email: "lawyer@example.com",
    role: UserRole.LAWYER_ADMIN,
    accountStatus: AccountStatus.ACTIVE,
  },
  session: {
    userId: "lawyer-id",
    authStage: SessionAuthStage.MFA_COMPLETE,
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
  },
};

describe("financial settings authorization", () => {
  it("allows lawyer administrators", () => {
    expect(() => assertLawyerAdmin(lawyerContext)).not.toThrow();
  });

  it("rejects non-lawyer roles at the service layer", () => {
    expect(() =>
      assertLawyerAdmin({
        ...lawyerContext,
        user: { ...lawyerContext.user, role: UserRole.BUILDING_REP },
      }),
    ).toThrow(FinancialSettingsForbiddenError);
  });
});
