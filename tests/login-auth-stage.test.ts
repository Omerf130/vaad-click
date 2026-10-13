import { describe, expect, it } from "vitest";

import { SessionAuthStage } from "@/modules/auth/domain/session-types";
import { authStageAfterPasswordLogin } from "@/modules/auth/services/login.service";
import { UserRole } from "@/modules/users/domain/user-role";

describe("authStageAfterPasswordLogin", () => {
  it("keeps lawyer sessions in primary until MFA is implemented", () => {
    expect(authStageAfterPasswordLogin(UserRole.LAWYER_ADMIN)).toBe(
      SessionAuthStage.PRIMARY,
    );
  });

  it("marks rep/mgmt sessions complete after password login", () => {
    expect(authStageAfterPasswordLogin(UserRole.BUILDING_REP)).toBe(
      SessionAuthStage.MFA_COMPLETE,
    );
    expect(authStageAfterPasswordLogin(UserRole.MANAGEMENT_COMPANY)).toBe(
      SessionAuthStage.MFA_COMPLETE,
    );
  });
});
