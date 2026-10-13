import { isSessionActive } from "@/modules/auth/domain/session-lifecycle";
import type { SessionRecord } from "@/modules/auth/domain/session-types";
import { SessionAuthStage } from "@/modules/auth/domain/session-types";
import { lawyerAdminRequiresMfa } from "@/modules/users/domain/mfa-state";
import type { UserRole } from "@/modules/users/domain/user-role";

export type AccessSurface =
  | "development_portal"
  | "production_legal_workflows";

/**
 * CP3B: Password-only sessions may use the development portal (including lawyer admin landing locally).
 * Production-sensitive legal workflows remain blocked until MFA is completed (original CP0 requirement).
 */
export function sessionGrantsAccess(input: {
  session: SessionRecord | null;
  userRole: UserRole;
  surface: AccessSurface;
  isProductionEnvironment: boolean;
  now?: Date;
}): boolean {
  const { session, userRole, surface, isProductionEnvironment } = input;
  const now = input.now ?? new Date();

  if (!session || !isSessionActive(session, now)) {
    return false;
  }

  if (surface === "development_portal") {
    if (lawyerAdminRequiresMfa(userRole)) {
      if (isProductionEnvironment) {
        return session.authStage === SessionAuthStage.MFA_COMPLETE;
      }
      return (
        session.authStage === SessionAuthStage.PRIMARY ||
        session.authStage === SessionAuthStage.MFA_COMPLETE
      );
    }

    return session.authStage === SessionAuthStage.MFA_COMPLETE;
  }

  if (surface === "production_legal_workflows") {
    return session.authStage === SessionAuthStage.MFA_COMPLETE;
  }

  return false;
}
