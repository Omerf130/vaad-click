import "server-only";

import { BuildingOrganizationalStatus } from "@/modules/buildings/domain/building-status";
import { Building } from "@/modules/buildings/infra/building.model";
import { DebtCase } from "@/modules/debt-cases/infra/debt-case.model";
import { NotificationEntityType } from "@/modules/notifications/domain/notification-event-type";
import { UserRole } from "@/modules/users/domain/user-role";
import { getAccessibleBuildingPublicIds } from "@/shared/auth/building-access";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { connectMongo } from "@/shared/db/connect";

const ALLOWED_PREFIXES = ["/app/admin", "/app/buildings", "/app/account-status", "/app"] as const;

function isSafeInternalPath(path: string): boolean {
  if (!path.startsWith("/app") || path.includes("://") || path.includes("..")) {
    return false;
  }
  return ALLOWED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export async function assertCanAccessNotificationDestination(input: {
  context: AuthenticatedContext;
  entityType: string;
  entityId: string;
  buildingId?: string | null;
  fallbackPath: string;
}): Promise<string> {
  if (!isSafeInternalPath(input.fallbackPath)) {
    return input.context.user.role === UserRole.LAWYER_ADMIN ? "/app/admin" : "/app";
  }

  await connectMongo();

  if (input.entityType === NotificationEntityType.ADMIN_QUEUE) {
    if (input.context.user.role !== UserRole.LAWYER_ADMIN) {
      return "/app";
    }
    return "/app/admin/users?view=pending";
  }

  if (input.entityType === NotificationEntityType.USER) {
    if (input.entityId !== input.context.user.id) {
      return input.context.user.role === UserRole.LAWYER_ADMIN ? "/app/admin" : "/app/account-status";
    }
    return input.fallbackPath;
  }

  if (input.entityType === NotificationEntityType.DEBT_CASE) {
    const debtCase = await DebtCase.findOne({ debtCaseId: input.entityId })
      .select("buildingId")
      .lean();
    if (!debtCase) {
      return input.context.user.role === UserRole.LAWYER_ADMIN ? "/app/admin/debt-cases" : "/app";
    }
    if (input.context.user.role === UserRole.LAWYER_ADMIN) {
      return `/app/admin/debt-cases/${input.entityId}`;
    }
    const allowed = await getAccessibleBuildingPublicIds(input.context);
    if (!allowed.includes(debtCase.buildingId)) {
      return "/app";
    }
    return `/app/buildings/${debtCase.buildingId}/debt-cases/${input.entityId}`;
  }

  if (input.entityType === NotificationEntityType.BUILDING) {
    const building = await Building.findOne({
      buildingId: input.entityId,
      organizationalStatus: BuildingOrganizationalStatus.ACTIVE,
    })
      .select("buildingId")
      .lean();
    if (!building) {
      return input.context.user.role === UserRole.LAWYER_ADMIN ? "/app/admin/buildings" : "/app";
    }
    if (input.context.user.role === UserRole.LAWYER_ADMIN) {
      return `/app/admin/buildings/${input.entityId}`;
    }
    const allowed = await getAccessibleBuildingPublicIds(input.context);
    if (!allowed.includes(input.entityId)) {
      return "/app";
    }
    return `/app/buildings/${input.entityId}`;
  }

  return input.fallbackPath;
}
