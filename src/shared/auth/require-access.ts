import "server-only";

import { redirect } from "next/navigation";

import { recordAuthAccessForbidden } from "@/modules/audit/services/auth-audit.service";
import { resolveAuditCorrelationId } from "@/modules/audit/services/audit-correlation";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import {
  canAccessAccountStatusPage,
  canAccessOperationalPortal,
} from "@/shared/auth/account-portal-access";
import { sessionGrantsAccess } from "@/shared/auth/access-policy";
import { getAuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { isProduction } from "@/shared/config/env.server";

async function requireAuthenticatedSession(): Promise<
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
    userId: context.user.id,
    accountStatus: context.user.accountStatus,
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

/** Session + MFA gate without account-approval or building-scope checks. */
export async function requireAuthenticatedPortalSession(): Promise<
  NonNullable<Awaited<ReturnType<typeof getAuthenticatedContext>>>
> {
  return requireAuthenticatedSession();
}

/**
 * Operational /app routes — pending and rejected users are redirected to account status.
 * CP6B adds building-scope enforcement for active users.
 */
export async function requireOperationalPortalAccess(): Promise<
  NonNullable<Awaited<ReturnType<typeof getAuthenticatedContext>>>
> {
  const context = await requireAuthenticatedSession();

  if (!canAccessOperationalPortal(context)) {
    if (canAccessAccountStatusPage(context)) {
      redirect("/app/account-status");
    }
    const correlationId = await resolveAuditCorrelationId();
    await recordAuthAccessForbidden({
      context,
      reasonCode: "account_not_operational",
      correlationId,
    });
    redirect("/forbidden?reason=account-status");
  }

  return context;
}

/** @deprecated Use requireOperationalPortalAccess for /app or requireAuthenticatedPortalSession for status pages. */
export async function requireDevelopmentPortalAccess(): Promise<
  NonNullable<Awaited<ReturnType<typeof getAuthenticatedContext>>>
> {
  return requireOperationalPortalAccess();
}

export async function requireAccountStatusPageAccess(): Promise<
  NonNullable<Awaited<ReturnType<typeof getAuthenticatedContext>>>
> {
  const context = await requireAuthenticatedSession();
  if (!canAccessAccountStatusPage(context)) {
    if (context.user.role === UserRole.LAWYER_ADMIN) {
      redirect("/app/admin");
    }
    const correlationId = await resolveAuditCorrelationId();
    await recordAuthAccessForbidden({
      context,
      reasonCode: "account_status_page_denied",
      correlationId,
    });
    redirect("/forbidden?reason=account-status");
  }
  return context;
}

export async function requireLawyerAdminPortal(): Promise<
  NonNullable<Awaited<ReturnType<typeof getAuthenticatedContext>>>
> {
  const context = await requireAuthenticatedSession();

  if (context.user.role !== UserRole.LAWYER_ADMIN) {
    const correlationId = await resolveAuditCorrelationId();
    await recordAuthAccessForbidden({
      context,
      reasonCode: "role_mismatch",
      correlationId,
    });
    redirect("/forbidden?reason=role");
  }

  if (context.user.accountStatus !== AccountStatus.ACTIVE) {
    const correlationId = await resolveAuditCorrelationId();
    await recordAuthAccessForbidden({
      context,
      reasonCode: "account_not_operational",
      correlationId,
    });
    redirect("/forbidden?reason=account-status");
  }

  const allowed = sessionGrantsAccess({
    session: context.session,
    userRole: context.user.role,
    surface: "development_portal",
    isProductionEnvironment: isProduction(),
    userId: context.user.id,
    accountStatus: context.user.accountStatus,
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
