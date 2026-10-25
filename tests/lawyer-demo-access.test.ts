import { describe, expect, it } from "vitest";

import { SessionAuthStage } from "@/modules/auth/domain/session-types";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import { sessionGrantsAccess } from "@/shared/auth/access-policy";
import {
  LAWYER_DEMO_ACCESS_ENABLED_ENV,
  LAWYER_DEMO_USER_ID_ENV,
  lawyerDemoGrantsLawyerDevelopmentPortal,
  parseLawyerDemoAccessConfig,
} from "@/shared/auth/lawyer-demo-access";

const DEMO_USER_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";
const OTHER_LAWYER_ID = "bbbbbbbbbbbbbbbbbbbbbbbb";

const activePrimarySession = {
  userId: DEMO_USER_ID,
  authStage: SessionAuthStage.PRIMARY,
  expiresAt: new Date(Date.now() + 60_000),
  revokedAt: null,
};

const demoConfig = {
  enabled: true,
  authorizedUserId: DEMO_USER_ID,
};

describe("parseLawyerDemoAccessConfig", () => {
  it("is disabled by default", () => {
    expect(parseLawyerDemoAccessConfig({})).toEqual({
      enabled: false,
      authorizedUserId: null,
    });
  });

  it("fails closed when enabled without valid user id", () => {
    expect(
      parseLawyerDemoAccessConfig({
        [LAWYER_DEMO_ACCESS_ENABLED_ENV]: "true",
      }),
    ).toEqual({ enabled: true, authorizedUserId: null });
  });

  it("accepts enabled with valid object id", () => {
    expect(
      parseLawyerDemoAccessConfig({
        [LAWYER_DEMO_ACCESS_ENABLED_ENV]: "true",
        [LAWYER_DEMO_USER_ID_ENV]: DEMO_USER_ID,
      }),
    ).toEqual({ enabled: true, authorizedUserId: DEMO_USER_ID });
  });

  it("does not enable on truthy non-true values", () => {
    expect(
      parseLawyerDemoAccessConfig({
        [LAWYER_DEMO_ACCESS_ENABLED_ENV]: "1",
        [LAWYER_DEMO_USER_ID_ENV]: DEMO_USER_ID,
      }).enabled,
    ).toBe(false);
  });
});

describe("lawyerDemoGrantsLawyerDevelopmentPortal", () => {
  it("grants only configured active lawyer in production with primary session", () => {
    expect(
      lawyerDemoGrantsLawyerDevelopmentPortal({
        userId: DEMO_USER_ID,
        userRole: UserRole.LAWYER_ADMIN,
        accountStatus: AccountStatus.ACTIVE,
        sessionAuthStage: SessionAuthStage.PRIMARY,
        isProductionEnvironment: true,
        config: demoConfig,
      }),
    ).toBe(true);
  });

  it("denies other lawyer ids", () => {
    expect(
      lawyerDemoGrantsLawyerDevelopmentPortal({
        userId: OTHER_LAWYER_ID,
        userRole: UserRole.LAWYER_ADMIN,
        accountStatus: AccountStatus.ACTIVE,
        sessionAuthStage: SessionAuthStage.PRIMARY,
        isProductionEnvironment: true,
        config: demoConfig,
      }),
    ).toBe(false);
  });

  it("denies rejected or disabled accounts", () => {
    for (const status of [AccountStatus.REJECTED, AccountStatus.DISABLED, AccountStatus.PENDING_APPROVAL]) {
      expect(
        lawyerDemoGrantsLawyerDevelopmentPortal({
          userId: DEMO_USER_ID,
          userRole: UserRole.LAWYER_ADMIN,
          accountStatus: status,
          sessionAuthStage: SessionAuthStage.PRIMARY,
          isProductionEnvironment: true,
          config: demoConfig,
        }),
      ).toBe(false);
    }
  });

  it("does not apply outside production", () => {
    expect(
      lawyerDemoGrantsLawyerDevelopmentPortal({
        userId: DEMO_USER_ID,
        userRole: UserRole.LAWYER_ADMIN,
        accountStatus: AccountStatus.ACTIVE,
        sessionAuthStage: SessionAuthStage.PRIMARY,
        isProductionEnvironment: false,
        config: demoConfig,
      }),
    ).toBe(false);
  });
});

describe("sessionGrantsAccess with lawyer demo", () => {
  it("blocks production lawyer primary when demo disabled", () => {
    expect(
      sessionGrantsAccess({
        session: activePrimarySession,
        userRole: UserRole.LAWYER_ADMIN,
        surface: "development_portal",
        isProductionEnvironment: true,
        userId: DEMO_USER_ID,
        accountStatus: AccountStatus.ACTIVE,
        lawyerDemoConfig: { enabled: false, authorizedUserId: null },
      }),
    ).toBe(false);
  });

  it("allows production lawyer primary when demo configured", () => {
    expect(
      sessionGrantsAccess({
        session: activePrimarySession,
        userRole: UserRole.LAWYER_ADMIN,
        surface: "development_portal",
        isProductionEnvironment: true,
        userId: DEMO_USER_ID,
        accountStatus: AccountStatus.ACTIVE,
        lawyerDemoConfig: demoConfig,
      }),
    ).toBe(true);
  });

  it("still blocks production legal workflows for demo primary session", () => {
    expect(
      sessionGrantsAccess({
        session: activePrimarySession,
        userRole: UserRole.LAWYER_ADMIN,
        surface: "production_legal_workflows",
        isProductionEnvironment: true,
        userId: DEMO_USER_ID,
        accountStatus: AccountStatus.ACTIVE,
        lawyerDemoConfig: demoConfig,
      }),
    ).toBe(false);
  });

  it("does not change building rep production access rules", () => {
    expect(
      sessionGrantsAccess({
        session: {
          ...activePrimarySession,
          authStage: SessionAuthStage.MFA_COMPLETE,
        },
        userRole: UserRole.BUILDING_REP,
        surface: "development_portal",
        isProductionEnvironment: true,
        userId: "cccccccccccccccccccccccc",
        accountStatus: AccountStatus.ACTIVE,
        lawyerDemoConfig: demoConfig,
      }),
    ).toBe(true);
  });
});
