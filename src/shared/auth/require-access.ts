import "server-only";

import { redirect } from "next/navigation";

import { recordAuthAccessForbidden } from "@/modules/audit/services/auth-audit.service";
import { resolveAuditCorrelationId } from "@/modules/audit/services/audit-correlation";
import { UserRole } from "@/modules/users/domain/user-role";
import { sessionGrantsAccess } from "@/shared/auth/access-policy";
import { getAuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { isProduction } from "@/shared/config/env.server";

export async function requireDevelopmentPortalAccess(): Promise<
  NonNullable<Awaited<ReturnType<typeof getAuthenticatedContext>>>
> {
  const context = await getAuthenticatedContext();
  if (!context) {
    redirect("/login");
  }

  const allowed = sessionGrantsAccess({
    session: context.session,
    userRole: context.user.role,
    surface: "development_portal",
    isProductionEnvironment: isProduction(),
  });

  if (!allowed) {
    const correlationId = await resolveAuditCorrelationId();
    await recordAuthAccessForbidden({
      context,
      reasonCode: "production_mfa_required",
      correlationId,
    });
    redirect("/forbidden?reason=production-mfa-required");
  }

  return context;
}

export async function requireLawyerAdminPortal(): Promise<
  NonNullable<Awaited<ReturnType<typeof getAuthenticatedContext>>>
> {
  const context = await requireDevelopmentPortalAccess();
  if (context.user.role !== UserRole.LAWYER_ADMIN) {
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
