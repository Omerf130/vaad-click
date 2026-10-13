import { UserRole } from "@/modules/users/domain/user-role";
import { SessionAuthStage } from "@/modules/auth/domain/session-types";

export const MfaMethod = {
  TOTP: "totp",
  SMS: "sms",
} as const;

export type MfaMethod = (typeof MfaMethod)[keyof typeof MfaMethod];

export type UserMfaEnrollment = {
  /** Preferred / configured second factor once enrolled (CP3B+). */
  method: MfaMethod | null;
  /** Set only after successful enrollment ceremony — never by default. */
  enrolledAt: Date | null;
};

export function lawyerAdminRequiresMfa(role: UserRole): boolean {
  return role === UserRole.LAWYER_ADMIN;
}

/**
 * CP3A: MFA verification is never implied without a real challenge.
 * Call sites that would mark MFA verified must use dedicated verification flows in later checkpoints.
 */
export function canPersistMfaEnrollmentCompletion(): boolean {
  return false;
}

export function sessionSatisfiesAuthenticationPolicy(input: {
  userRole: UserRole;
  sessionAuthStage: SessionAuthStage;
}): boolean {
  if (lawyerAdminRequiresMfa(input.userRole)) {
    return input.sessionAuthStage === SessionAuthStage.MFA_COMPLETE;
  }

  // CP3B: email/password accounts receive a completed session after password verification.
  return input.sessionAuthStage === SessionAuthStage.MFA_COMPLETE;
}
