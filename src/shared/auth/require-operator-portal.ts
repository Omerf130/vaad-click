import "server-only";

import { redirect } from "next/navigation";

import { recordAuthAccessForbidden } from "@/modules/audit/services/auth-audit.service";
import { resolveAuditCorrelationId } from "@/modules/audit/services/audit-correlation";
import { UserRole } from "@/modules/users/domain/user-role";
import { requireOperationalPortalAccess } from "@/shared/auth/require-access";

/** Active building rep or management company — operator debt-case portal (CP8.3A). */
export async function requireOperatorPortalAccess() {
  const context = await requireOperationalPortalAccess();
  if (
    context.user.role !== UserRole.BUILDING_REP &&
    context.user.role !== UserRole.MANAGEMENT_COMPANY
  ) {
    const correlationId = await resolveAuditCorrelationId();
    await recordAuthAccessForbidden({
      context,
      reasonCode: "role_mismatch",
      correlationId,
    });
    redirect("/forbidden?reason=role");
  }
  return context;
}
