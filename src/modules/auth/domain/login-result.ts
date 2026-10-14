import type { SessionAuthStage } from "@/modules/auth/domain/session-types";
import type { AccountStatus } from "@/modules/users/domain/account-status";
import type { UserRole } from "@/modules/users/domain/user-role";

export type LoginSuccess = {
  ok: true;
  userId: string;
  role: UserRole;
  authStage: SessionAuthStage;
  accountStatus: AccountStatus;
};

export type LoginFailure = {
  ok: false;
  code:
    | "INVALID_CREDENTIALS"
    | "ACCOUNT_DISABLED"
    | "ACCOUNT_LOCKED"
    | "RATE_LIMITED";
  message: string;
  retryAfterSeconds?: number;
};

export type LoginResult = LoginSuccess | LoginFailure;
