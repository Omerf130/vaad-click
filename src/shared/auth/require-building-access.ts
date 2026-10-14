import "server-only";

import { redirect } from "next/navigation";

import { recordAuthAccessForbidden } from "@/modules/audit/services/auth-audit.service";
import { resolveAuditCorrelationId } from "@/modules/audit/services/audit-correlation";
import { findAccessibleBuildingByPublicId } from "@/shared/auth/building-access/assert-building-access";
import { requireOperationalPortalAccess } from "@/shared/auth/require-access";

export async function requireBuildingPortalAccess(buildingPublicId: string) {
  const context = await requireOperationalPortalAccess();
  const building = await findAccessibleBuildingByPublicId({
    context,
    buildingPublicId,
  });

  if (!building) {
    const correlationId = await resolveAuditCorrelationId();
    await recordAuthAccessForbidden({
      context,
      reasonCode: "building_access_denied",
      correlationId,
      buildingPublicId,
    });
    redirect("/forbidden?reason=building");
  }

  return { context, building };
}
