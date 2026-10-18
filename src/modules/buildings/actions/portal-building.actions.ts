"use server";

import { revalidatePath } from "next/cache";

import {
  OrganizationError,
  OrganizationErrorCode,
} from "@/modules/buildings/domain/organization-errors";
import { mapOrganizationErrorToHebrew } from "@/modules/buildings/presentation/organization-messages.he";
import { createBuildingForManagementCompany } from "@/modules/buildings/services/management-company-building.service";
import { managementCompanyCreateBuildingInputSchema } from "@/modules/buildings/validation/building.schema";
import { resolveAuditCorrelationId } from "@/modules/audit/services/audit-correlation";
import { requireOperatorPortalAccess } from "@/shared/auth/require-operator-portal";
import { UserRole } from "@/modules/users/domain/user-role";
import { assertSameOriginMutationRequest } from "@/shared/security/request-origin";
import { ZodError } from "zod";

export type PortalBuildingActionState = {
  ok: boolean;
  message?: string;
  code?: string;
  buildingId?: string;
};

function handleError(error: unknown): PortalBuildingActionState {
  if (error instanceof OrganizationError) {
    return {
      ok: false,
      code: error.code,
      message: mapOrganizationErrorToHebrew(error.code),
    };
  }
  if (error instanceof ZodError) {
    const first = error.issues[0]?.message;
    return {
      ok: false,
      code: OrganizationErrorCode.VALIDATION,
      message: typeof first === "string" ? first : mapOrganizationErrorToHebrew(OrganizationErrorCode.VALIDATION),
    };
  }
  if (error instanceof Error && error.message === "Cross-origin request rejected") {
    return {
      ok: false,
      code: OrganizationErrorCode.FORBIDDEN,
      message: mapOrganizationErrorToHebrew(OrganizationErrorCode.FORBIDDEN),
    };
  }
  return { ok: false, message: "לא ניתן להשלים את הפעולה." };
}

export async function managementCompanyCreateBuildingFormAction(
  _prev: PortalBuildingActionState,
  formData: FormData,
): Promise<PortalBuildingActionState> {
  try {
    await assertSameOriginMutationRequest();
    const context = await requireOperatorPortalAccess();
    if (context.user.role !== UserRole.MANAGEMENT_COMPANY) {
      return {
        ok: false,
        code: OrganizationErrorCode.FORBIDDEN,
        message: mapOrganizationErrorToHebrew(OrganizationErrorCode.FORBIDDEN),
      };
    }

    const payload = managementCompanyCreateBuildingInputSchema.parse({
      displayName: formData.get("displayName"),
      address: {
        city: formData.get("city"),
        street: formData.get("street"),
        houseNumber: formData.get("houseNumber"),
        postalCode: formData.get("postalCode") || undefined,
      },
    });

    const correlationId = await resolveAuditCorrelationId();
    const { buildingId } = await createBuildingForManagementCompany({
      context,
      payload,
      correlationId,
    });

    revalidatePath("/app");
    revalidatePath("/app/buildings");
    revalidatePath(`/app/buildings/${buildingId}`);

    return {
      ok: true,
      buildingId,
      message:
        "הבניין נוסף לרשימת הבניינים שלכם. הוא אינו מאומת משפטית — משרד עורך הדין ימשיך בתהליך האימות.",
    };
  } catch (error) {
    const result = handleError(error);
    if (result.code === OrganizationErrorCode.DUPLICATE_ADDRESS) {
      return {
        ...result,
        message: "כבר קיים בניין פעיל בכתובת זו. בדקו את הכתובת או פנו למשרד עורך הדין.",
      };
    }
    return result;
  }
}
