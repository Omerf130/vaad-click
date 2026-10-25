import { SessionAuthStage } from "@/modules/auth/domain/session-types";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";

/** Must be exactly `true` to enable (fail closed). */
export const LAWYER_DEMO_ACCESS_ENABLED_ENV = "LAWYER_DEMO_ACCESS_ENABLED";

/** MongoDB ObjectId (24 hex) of the sole authorized demo lawyer admin. */
export const LAWYER_DEMO_USER_ID_ENV = "LAWYER_DEMO_USER_ID";

const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;

export type LawyerDemoAccessConfig = {
  enabled: boolean;
  authorizedUserId: string | null;
};

export function parseLawyerDemoAccessConfig(
  env: Record<string, string | undefined> = process.env,
): LawyerDemoAccessConfig {
  const enabled = env[LAWYER_DEMO_ACCESS_ENABLED_ENV]?.trim() === "true";
  const rawUserId = env[LAWYER_DEMO_USER_ID_ENV]?.trim() ?? "";
  const authorizedUserId =
    enabled && OBJECT_ID_PATTERN.test(rawUserId) ? rawUserId : null;

  return { enabled, authorizedUserId };
}

/**
 * Temporary production-only exception for lawyer admin development portal access
 * (password PRIMARY session). Does not apply to production_legal_workflows.
 */
export function lawyerDemoGrantsLawyerDevelopmentPortal(input: {
  userId: string;
  userRole: UserRole;
  accountStatus: AccountStatus;
  sessionAuthStage: SessionAuthStage;
  isProductionEnvironment: boolean;
  config: LawyerDemoAccessConfig;
}): boolean {
  if (!input.isProductionEnvironment) {
    return false;
  }
  if (!input.config.enabled || !input.config.authorizedUserId) {
    return false;
  }
  if (input.userRole !== UserRole.LAWYER_ADMIN) {
    return false;
  }
  if (input.accountStatus !== AccountStatus.ACTIVE) {
    return false;
  }
  if (input.userId !== input.config.authorizedUserId) {
    return false;
  }
  if (input.sessionAuthStage !== SessionAuthStage.PRIMARY) {
    return false;
  }
  return true;
}
