import "server-only";

import { isSessionActive } from "@/modules/auth/domain/session-lifecycle";
import type { SessionRecord } from "@/modules/auth/domain/session-types";
import { findServerSessionByToken } from "@/modules/auth/services/session.service";
import type { AccountStatus } from "@/modules/users/domain/account-status";
import type { UserRole } from "@/modules/users/domain/user-role";
import { User } from "@/modules/users/infra/user.model";
import { readSessionTokenFromCookies } from "@/shared/auth/session-cookie-store";

export type AuthenticatedUser = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  accountStatus: AccountStatus;
};

export type AuthenticatedContext = {
  user: AuthenticatedUser;
  session: SessionRecord;
};

export async function getAuthenticatedContext(): Promise<AuthenticatedContext | null> {
  const token = await readSessionTokenFromCookies();
  if (!token) {
    return null;
  }

  const session = await findServerSessionByToken(token);
  if (!session || !isSessionActive(session)) {
    return null;
  }

  const user = await User.findById(session.userId).lean();
  if (!user?.email) {
    return null;
  }

  return {
    session,
    user: {
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      role: user.role as UserRole,
      accountStatus: user.accountStatus as AccountStatus,
    },
  };
}
