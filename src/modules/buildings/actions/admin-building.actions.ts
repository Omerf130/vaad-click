"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  OrganizationError,
  OrganizationErrorCode,
} from "@/modules/buildings/domain/organization-errors";
import { mapOrganizationErrorToHebrew } from "@/modules/buildings/presentation/organization-messages.he";
import {
  assignBuildingRepresentative,
  clearBuildingRepresentative,
  linkBuildingToManagementCompany,
  unlinkBuildingFromManagementCompany,
} from "@/modules/buildings/services/building-assignment.service";
import {
  archiveBuildingRecord,
  createBuildingRecord,
  updateBuildingRecord,
} from "@/modules/buildings/services/building-lifecycle.service";
import { updateBuildingTreatmentFeeEligibility } from "@/modules/buildings/services/building-treatment-fee-eligibility.service";
import { formatTreatmentFeeEligibilitySavedMessageHe } from "@/modules/buildings/presentation/building-treatment-fee.he";
import { createBuildingInputSchema } from "@/modules/buildings/validation/building.schema";
import { updateBuildingInputSchema } from "@/modules/buildings/validation/building.schema";
import { updateBuildingTreatmentFeeEligibilitySchema } from "@/modules/buildings/validation/building.schema";
import { resolveAuditCorrelationId } from "@/modules/audit/services/audit-correlation";
import { requireLawyerAdminPortal } from "@/shared/auth/require-access";
import { assertSameOriginMutationRequest } from "@/shared/security/request-origin";
import { ZodError } from "zod";

const ADMIN_BUILDINGS_PATH = "/app/admin/buildings";
const ADMIN_COMPANIES_PATH = "/app/admin/management-companies";

export type AdminBuildingActionState = {
  ok: boolean;
  message?: string;
  code?: string;
  buildingId?: string;
};

async function guard() {
  await assertSameOriginMutationRequest();
  return requireLawyerAdminPortal();
}

function rethrowNextRedirect(error: unknown): void {
  if (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  ) {
    throw error;
  }
}

function handleError(error: unknown): AdminBuildingActionState {
  if (error instanceof OrganizationError) {
    return {
      ok: false,
      code: error.code,
      message: mapOrganizationErrorToHebrew(error.code),
    };
  }
  if (error instanceof ZodError) {
    return {
      ok: false,
      code: OrganizationErrorCode.VALIDATION,
      message: mapOrganizationErrorToHebrew(OrganizationErrorCode.VALIDATION),
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

function revalidateBuilding(buildingId: string) {
  revalidatePath(ADMIN_BUILDINGS_PATH);
  revalidatePath(`${ADMIN_BUILDINGS_PATH}/${buildingId}`);
  revalidatePath("/app/buildings");
}

function readOptionalInt(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function createBuildingFormAction(
  _prev: AdminBuildingActionState,
  formData: FormData,
): Promise<AdminBuildingActionState> {
  try {
    const context = await guard();
    const payload = createBuildingInputSchema.parse({
      displayName: formData.get("displayName"),
      address: {
        city: formData.get("city"),
        street: formData.get("street"),
        houseNumber: formData.get("houseNumber"),
        postalCode: formData.get("postalCode") || undefined,
      },
      unitCount: readOptionalInt(formData.get("unitCount")),
      averageMonthlyVaadFeeMinor: readOptionalInt(formData.get("averageMonthlyVaadFeeMinor")),
      duplicateAddressExceptionReason:
        (formData.get("duplicateAddressExceptionReason") as string) || undefined,
    });

    const correlationId = await resolveAuditCorrelationId();
    const created = await createBuildingRecord({ context, payload, correlationId });
    if (!created?.buildingId) {
      return { ok: false, message: "יצירת הבניין נכשלה." };
    }
    revalidateBuilding(created.buildingId);
    redirect(`${ADMIN_BUILDINGS_PATH}/${created.buildingId}`);
  } catch (error) {
    rethrowNextRedirect(error);
    const result = handleError(error);
    if (result.code === OrganizationErrorCode.DUPLICATE_ADDRESS) {
      return {
        ...result,
        message:
          "כבר קיים בניין פעיל בכתובת זו. הזינו נימוק חריג למטה ושלחו שוב.",
      };
    }
    return result;
  }
}

export async function updateBuildingFormAction(
  _prev: AdminBuildingActionState,
  formData: FormData,
): Promise<AdminBuildingActionState> {
  try {
    const context = await guard();
    const payload = updateBuildingInputSchema.parse({
      buildingId: formData.get("buildingId"),
      displayName: formData.get("displayName"),
      address: {
        city: formData.get("city"),
        street: formData.get("street"),
        houseNumber: formData.get("houseNumber"),
        postalCode: formData.get("postalCode") || undefined,
      },
      unitCount: readOptionalInt(formData.get("unitCount")),
      averageMonthlyVaadFeeMinor: readOptionalInt(formData.get("averageMonthlyVaadFeeMinor")),
      duplicateAddressExceptionReason:
        (formData.get("duplicateAddressExceptionReason") as string) || undefined,
    });

    const correlationId = await resolveAuditCorrelationId();
    await updateBuildingRecord({ context, payload, correlationId });
    revalidateBuilding(payload.buildingId);
    return { ok: true, message: "פרטי הבניין עודכנו.", buildingId: payload.buildingId };
  } catch (error) {
    const result = handleError(error);
    if (result.code === OrganizationErrorCode.DUPLICATE_ADDRESS) {
      return {
        ...result,
        message: "כתובת זו תפוסה על ידי בניין פעיל אחר. הזינו נימוק חריג ושלחו שוב.",
      };
    }
    return result;
  }
}

export async function archiveBuildingFormAction(
  _prev: AdminBuildingActionState,
  formData: FormData,
): Promise<AdminBuildingActionState> {
  try {
    const context = await guard();
    const buildingId = String(formData.get("buildingId") ?? "");
    const correlationId = await resolveAuditCorrelationId();
    await archiveBuildingRecord({ context, buildingId, correlationId });
    revalidateBuilding(buildingId);
    revalidatePath("/app/admin/management-companies");
    return { ok: true, message: "הבניין הועבר לארכיון.", buildingId };
  } catch (error) {
    return handleError(error);
  }
}

export async function assignRepresentativeFormAction(
  _prev: AdminBuildingActionState,
  formData: FormData,
): Promise<AdminBuildingActionState> {
  try {
    const context = await guard();
    const buildingId = String(formData.get("buildingId") ?? "");
    const representativeUserId = String(formData.get("representativeUserId") ?? "");
    const previousRepresentativeUserId =
      (formData.get("previousRepresentativeUserId") as string) || undefined;

    const correlationId = await resolveAuditCorrelationId();
    await assignBuildingRepresentative({
      context,
      buildingId,
      representativeUserId,
      previousRepresentativeUserId,
      correlationId,
    });
    revalidateBuilding(buildingId);
    return { ok: true, message: "הנציג שויך לבניין.", buildingId };
  } catch (error) {
    return handleError(error);
  }
}

export async function clearRepresentativeFormAction(
  _prev: AdminBuildingActionState,
  formData: FormData,
): Promise<AdminBuildingActionState> {
  try {
    const context = await guard();
    const buildingId = String(formData.get("buildingId") ?? "");
    const correlationId = await resolveAuditCorrelationId();
    await clearBuildingRepresentative({ context, buildingId, correlationId });
    revalidateBuilding(buildingId);
    return { ok: true, message: "שיוך הנציג הוסר.", buildingId };
  } catch (error) {
    return handleError(error);
  }
}

export async function linkManagementCompanyFormAction(
  _prev: AdminBuildingActionState,
  formData: FormData,
): Promise<AdminBuildingActionState> {
  try {
    const context = await guard();
    const buildingId = String(formData.get("buildingId") ?? "");
    const managementCompanyId = String(formData.get("managementCompanyId") ?? "");
    const correlationId = await resolveAuditCorrelationId();
    await linkBuildingToManagementCompany({
      context,
      buildingId,
      managementCompanyId,
      correlationId,
    });
    revalidateBuilding(buildingId);
    revalidatePath(ADMIN_COMPANIES_PATH);
    revalidatePath(`${ADMIN_COMPANIES_PATH}/${managementCompanyId}`);
    return { ok: true, message: "חברת הניהול שויכה לבניין.", buildingId };
  } catch (error) {
    return handleError(error);
  }
}

export async function unlinkManagementCompanyFormAction(
  _prev: AdminBuildingActionState,
  formData: FormData,
): Promise<AdminBuildingActionState> {
  try {
    const context = await guard();
    const buildingId = String(formData.get("buildingId") ?? "");
    const managementCompanyId = String(formData.get("managementCompanyId") ?? "");
    const correlationId = await resolveAuditCorrelationId();
    await unlinkBuildingFromManagementCompany({
      context,
      buildingId,
      managementCompanyId,
      correlationId,
    });
    revalidateBuilding(buildingId);
    revalidatePath(ADMIN_COMPANIES_PATH);
    revalidatePath(`${ADMIN_COMPANIES_PATH}/${managementCompanyId}`);
    return { ok: true, message: "שיוך חברת הניהול הוסר.", buildingId };
  } catch (error) {
    return handleError(error);
  }
}

export async function updateBuildingTreatmentFeeEligibilityFormAction(
  _prev: AdminBuildingActionState,
  formData: FormData,
): Promise<AdminBuildingActionState> {
  try {
    const context = await guard();
    const payload = updateBuildingTreatmentFeeEligibilitySchema.parse({
      buildingId: formData.get("buildingId"),
      treatmentFeeEligible: formData.get("treatmentFeeEligible"),
      expectedTreatmentFeeEligible: formData.get("expectedTreatmentFeeEligible"),
    });

    const correlationId = await resolveAuditCorrelationId();
    const result = await updateBuildingTreatmentFeeEligibility({
      context,
      payload,
      correlationId,
    });
    revalidateBuilding(payload.buildingId);
    return {
      ok: true,
      buildingId: payload.buildingId,
      message: formatTreatmentFeeEligibilitySavedMessageHe(
        result.changed,
        result.treatmentFeeEligible,
      ),
    };
  } catch (error) {
    return handleError(error);
  }
}
