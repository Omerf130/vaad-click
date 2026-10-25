import { describe, expect, it } from "vitest";

import { SessionAuthStage } from "@/modules/auth/domain/session-types";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import { sessionGrantsAccess } from "@/shared/auth/access-policy";

const activeSession = (authStage: SessionAuthStage) => ({
  userId: "u1",
  authStage,
  expiresAt: new Date(Date.now() + 60_000),
  revokedAt: null,
});

describe("sessionGrantsAccess", () => {
  it("allows rep password session on development portal", () => {
    expect(
      sessionGrantsAccess({
        session: activeSession(SessionAuthStage.MFA_COMPLETE),
        userRole: UserRole.BUILDING_REP,
        surface: "development_portal",
        isProductionEnvironment: false,
      }),
    ).toBe(true);
  });

  it("blocks lawyer primary session on production development portal when demo off", () => {
    expect(
      sessionGrantsAccess({
        session: activeSession(SessionAuthStage.PRIMARY),
        userRole: UserRole.LAWYER_ADMIN,
        surface: "development_portal",
        isProductionEnvironment: true,
        userId: "aaaaaaaaaaaaaaaaaaaaaaaa",
        accountStatus: AccountStatus.ACTIVE,
        lawyerDemoConfig: { enabled: false, authorizedUserId: null },
      }),
    ).toBe(false);
  });

  it("allows lawyer primary session on non-production development portal", () => {
    expect(
      sessionGrantsAccess({
        session: activeSession(SessionAuthStage.PRIMARY),
        userRole: UserRole.LAWYER_ADMIN,
        surface: "development_portal",
        isProductionEnvironment: false,
      }),
    ).toBe(true);
  });

  it("blocks all password-only sessions from production legal workflows", () => {
    expect(
      sessionGrantsAccess({
        session: activeSession(SessionAuthStage.PRIMARY),
        userRole: UserRole.LAWYER_ADMIN,
        surface: "production_legal_workflows",
        isProductionEnvironment: false,
      }),
    ).toBe(false);
  });
});
