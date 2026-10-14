"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { OrganizationError } from "@/modules/buildings/domain/organization-errors";
import { mapOrganizationErrorToHebrew } from "@/modules/buildings/presentation/organization-messages.he";
import { resolveAuditCorrelationId } from "@/modules/audit/services/audit-correlation";
import {
  createManagementCompanyRecord,
  updateManagementCompanyRecord,
} from "@/modules/management-companies/services/management-company-lifecycle.service";
import {
  createManagementCompanyFormSchema,
  updateManagementCompanyFormSchema,
} from "@/modules/management-companies/validation/management-company.schema";
import { requireLawyerAdminPortal } from "@/shared/auth/require-access";
import { assertSameOriginMutationRequest } from "@/shared/security/request-origin";

const ADMIN_COMPANIES_PATH = "/app/admin/management-companies";

export type AdminManagementCompanyActionState = {
  ok: boolean;
  message?: string;
  managementCompanyId?: string;
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

function handleError(error: unknown): AdminManagementCompanyActionState {
  if (error instanceof OrganizationError) {
    return { ok: false, message: mapOrganizationErrorToHebrew(error.code) };
  }
  return { ok: false, message: "לא ניתן להשלים את הפעולה." };
}

function revalidateCompany(managementCompanyId: string) {
  revalidatePath(ADMIN_COMPANIES_PATH);
  revalidatePath(`${ADMIN_COMPANIES_PATH}/${managementCompanyId}`);
  revalidatePath("/app/admin/buildings");
}

export async function createManagementCompanyFormAction(
  _prev: AdminManagementCompanyActionState,
  formData: FormData,
): Promise<AdminManagementCompanyActionState> {
  try {
    const context = await guard();
    const payload = createManagementCompanyFormSchema.parse({
      displayName: formData.get("displayName"),
      companyRegistrationNumber: formData.get("companyRegistrationNumber") || undefined,
      contactEmail: formData.get("contactEmail") || undefined,
      contactPhone: formData.get("contactPhone") || undefined,
      primaryUserId: formData.get("primaryUserId"),
    });

    const correlationId = await resolveAuditCorrelationId();
    const created = await createManagementCompanyRecord({
      context,
      payload,
      correlationId,
    });
    if (!created?.managementCompanyId) {
      return { ok: false, message: "יצירת החברה נכשלה." };
    }
    revalidateCompany(created.managementCompanyId);
    redirect(`${ADMIN_COMPANIES_PATH}/${created.managementCompanyId}`);
  } catch (error) {
    rethrowNextRedirect(error);
    return handleError(error);
  }
}

export async function updateManagementCompanyFormAction(
  _prev: AdminManagementCompanyActionState,
  formData: FormData,
): Promise<AdminManagementCompanyActionState> {
  try {
    const context = await guard();
    const payload = updateManagementCompanyFormSchema.parse({
      managementCompanyId: formData.get("managementCompanyId"),
      displayName: formData.get("displayName"),
      companyRegistrationNumber: formData.get("companyRegistrationNumber") || undefined,
      contactEmail: formData.get("contactEmail") || undefined,
      contactPhone: formData.get("contactPhone") || undefined,
    });

    const correlationId = await resolveAuditCorrelationId();
    await updateManagementCompanyRecord({ context, payload, correlationId });
    revalidateCompany(payload.managementCompanyId);
    return {
      ok: true,
      message: "פרטי החברה עודכנו.",
      managementCompanyId: payload.managementCompanyId,
    };
  } catch (error) {
    return handleError(error);
  }
}
