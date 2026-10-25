import { isSessionActive } from "@/modules/auth/domain/session-lifecycle";
import type { SessionRecord } from "@/modules/auth/domain/session-types";
import { SessionAuthStage } from "@/modules/auth/domain/session-types";
import type { AccountStatus } from "@/modules/users/domain/account-status";
import { lawyerAdminRequiresMfa } from "@/modules/users/domain/mfa-state";
import type { UserRole } from "@/modules/users/domain/user-role";
import {
  lawyerDemoGrantsLawyerDevelopmentPortal,
  parseLawyerDemoAccessConfig,
  type LawyerDemoAccessConfig,
} from "@/shared/auth/lawyer-demo-access";

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
  userId?: string;
  accountStatus?: AccountStatus;
  lawyerDemoConfig?: LawyerDemoAccessConfig;
  now?: Date;
}): boolean {
  const { session, userRole, surface, isProductionEnvironment } = input;
  const now = input.now ?? new Date();
  const lawyerDemoConfig = input.lawyerDemoConfig ?? parseLawyerDemoAccessConfig(process.env);

  if (!session || !isSessionActive(session, now)) {
    return false;
  }

  if (surface === "development_portal") {
    if (lawyerAdminRequiresMfa(userRole)) {
      if (isProductionEnvironment) {
        if (session.authStage === SessionAuthStage.MFA_COMPLETE) {
          return true;
        }
        if (
          input.userId &&
          input.accountStatus &&
          lawyerDemoGrantsLawyerDevelopmentPortal({
            userId: input.userId,
            userRole,
            accountStatus: input.accountStatus,
            sessionAuthStage: session.authStage,
            isProductionEnvironment,
            config: lawyerDemoConfig,
          })
        ) {
          return true;
        }
        return false;
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
