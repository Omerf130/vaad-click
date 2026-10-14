import "server-only";

import { UserRole } from "@/modules/users/domain/user-role";
import { FinancialSettingsForbiddenError } from "@/modules/financial-settings/domain/financial-settings-errors";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";

export function assertLawyerAdmin(context: AuthenticatedContext): void {
  if (context.user.role !== UserRole.LAWYER_ADMIN) {
    throw new FinancialSettingsForbiddenError();
  }
}
