import { describe, expect, it } from "vitest";

import { SessionAuthStage } from "@/modules/auth/domain/session-types";
import {
  canPersistMfaEnrollmentCompletion,
  lawyerAdminRequiresMfa,
  sessionSatisfiesAuthenticationPolicy,
} from "@/modules/users/domain/mfa-state";
import { UserRole } from "@/modules/users/domain/user-role";

describe("MFA state boundaries", () => {
  it("requires MFA for lawyer admin accounts", () => {
    expect(lawyerAdminRequiresMfa(UserRole.LAWYER_ADMIN)).toBe(true);
    expect(lawyerAdminRequiresMfa(UserRole.BUILDING_REP)).toBe(false);
  });

  it("does not allow persisting MFA verification without proof in CP3A", () => {
    expect(canPersistMfaEnrollmentCompletion()).toBe(false);
  });

  it("blocks lawyer access on primary-only sessions", () => {
    expect(
      sessionSatisfiesAuthenticationPolicy({
        userRole: UserRole.LAWYER_ADMIN,
        sessionAuthStage: SessionAuthStage.PRIMARY,
      }),
    ).toBe(false);
  });

  it("allows lawyer access only after MFA-complete session", () => {
    expect(
      sessionSatisfiesAuthenticationPolicy({
        userRole: UserRole.LAWYER_ADMIN,
        sessionAuthStage: SessionAuthStage.MFA_COMPLETE,
      }),
    ).toBe(true);
  });
});
