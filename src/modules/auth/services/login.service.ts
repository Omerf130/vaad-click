import "server-only";

import { SessionAuthStage } from "@/modules/auth/domain/session-types";
import type { LoginResult } from "@/modules/auth/domain/login-result";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import { User } from "@/modules/users/infra/user.model";
import { connectMongo } from "@/shared/db/connect";
import {
  genericAuthenticationFailureMessage,
  getAccountLoginBlockReason,
  isLawyerAdminLoginAllowed,
  isPortalPasswordLoginAllowed,
} from "@/shared/security/account-login";
import { verifyPassword } from "@/shared/security/password";
import { normalizeEmail } from "@/shared/validation/email";

export function authStageAfterPasswordLogin(role: UserRole): SessionAuthStage {
  if (role === UserRole.LAWYER_ADMIN) {
    return SessionAuthStage.PRIMARY;
  }
  return SessionAuthStage.MFA_COMPLETE;
}

export async function loginWithEmailPassword(input: {
  email: string;
  password: string;
}): Promise<LoginResult> {
  await connectMongo();

  const email = normalizeEmail(input.email);
  const user = await User.findOne({ email }).select("+passwordHash").lean();

  if (!user?.passwordHash) {
    return {
      ok: false,
      code: "INVALID_CREDENTIALS",
      message: genericAuthenticationFailureMessage(),
    };
  }

  const status = user.accountStatus as AccountStatus;
  const role = user.role as UserRole;
  const blockReason = getAccountLoginBlockReason(status);
  if (blockReason) {
    return {
      ok: false,
      code: blockReason === "disabled" ? "ACCOUNT_DISABLED" : "ACCOUNT_LOCKED",
      message: genericAuthenticationFailureMessage(),
    };
  }

  const loginAllowed =
    role === UserRole.LAWYER_ADMIN
      ? isLawyerAdminLoginAllowed(status)
      : isPortalPasswordLoginAllowed(status);

  if (!loginAllowed) {
    return {
      ok: false,
      code: "INVALID_CREDENTIALS",
      message: genericAuthenticationFailureMessage(),
    };
  }

  const passwordValid = await verifyPassword(input.password, user.passwordHash);
  if (!passwordValid) {
    return {
      ok: false,
      code: "INVALID_CREDENTIALS",
      message: genericAuthenticationFailureMessage(),
    };
  }

  const userId = user._id.toString();
  const authStage = authStageAfterPasswordLogin(user.role as UserRole);

  return {
    ok: true,
    userId,
    role,
    authStage,
    accountStatus: status,
  };
}
