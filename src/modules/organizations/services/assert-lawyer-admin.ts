import "server-only";

import {
  OrganizationError,
  OrganizationErrorCode,
} from "@/modules/buildings/domain/organization-errors";
import { UserRole } from "@/modules/users/domain/user-role";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";

export function assertLawyerAdminOrganization(context: AuthenticatedContext): void {
  if (context.user.role !== UserRole.LAWYER_ADMIN) {
    throw new OrganizationError(OrganizationErrorCode.FORBIDDEN, "Lawyer admin required");
  }
}
