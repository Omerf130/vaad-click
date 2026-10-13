import { AccountStatus } from "@/modules/users/domain/account-status";
import {
  ACCOUNT_DISABLED_MESSAGE,
  ACCOUNT_LOCKED_MESSAGE,
  GENERIC_AUTH_FAILURE_MESSAGE,
} from "@/shared/security/auth-messages";

export type AccountLoginBlockReason = "disabled" | "locked";

export function getAccountLoginBlockReason(
  status: AccountStatus,
): AccountLoginBlockReason | null {
  if (status === AccountStatus.DISABLED) {
    return "disabled";
  }
  if (status === AccountStatus.LOCKED) {
    return "locked";
  }
  return null;
}

/** Maps account state to a safe user-facing message (no internal details). */
export function accountLoginBlockMessage(reason: AccountLoginBlockReason): string {
  if (reason === "disabled") {
    return ACCOUNT_DISABLED_MESSAGE;
  }
  return ACCOUNT_LOCKED_MESSAGE;
}

/** Use for unknown user vs bad password — same outward message. */
export function genericAuthenticationFailureMessage(): string {
  return GENERIC_AUTH_FAILURE_MESSAGE;
}
