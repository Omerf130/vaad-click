"use server";

import { revalidatePath } from "next/cache";

import { resolveAuditCorrelationId } from "@/modules/audit/services/audit-correlation";
import { BuildingLegalDocumentError } from "@/modules/building-legal-documents/domain/building-legal-document-errors";
import { formatBuildingLegalDocumentErrorHe } from "@/modules/building-legal-documents/presentation/building-legal-document-messages.he";
import { generateBuildingLegalDocument } from "@/modules/building-legal-documents/services/building-legal-document.service";
import { generateBuildingLegalDocumentSchema } from "@/modules/building-legal-documents/validation/building-legal-document.schema";
import { requireLawyerAdminPortal } from "@/shared/auth/require-access";
import { assertSameOriginMutationRequest } from "@/shared/security/request-origin";

export type BuildingLegalDocumentActionState = {
  ok: boolean;
  message?: string;
};

function adminBuildingPath(buildingId: string) {
  return `/app/admin/buildings/${buildingId}`;
}

export async function generateBuildingLegalDocumentFormAction(
  _prev: BuildingLegalDocumentActionState,
  formData: FormData,
): Promise<BuildingLegalDocumentActionState> {
  try {
    await assertSameOriginMutationRequest();
    const context = await requireLawyerAdminPortal();
    const parsed = generateBuildingLegalDocumentSchema.safeParse({
      buildingId: String(formData.get("buildingId") ?? "").trim(),
      category: String(formData.get("category") ?? "").trim(),
    });
    if (!parsed.success) {
      return { ok: false, message: "נתוני הבקשה אינם תקינים." };
    }
    const correlationId = await resolveAuditCorrelationId();
    await generateBuildingLegalDocument({
      context,
      buildingId: parsed.data.buildingId,
      category: parsed.data.category,
      correlationId,
    });
    revalidatePath(adminBuildingPath(parsed.data.buildingId));
    revalidatePath(`/app/buildings/${parsed.data.buildingId}`);
    return { ok: true, message: "המסמך הופק ונשמר כממתין לחתימה." };
  } catch (error) {
    if (error instanceof BuildingLegalDocumentError) {
      return { ok: false, message: formatBuildingLegalDocumentErrorHe(error.code) };
    }
    if (error instanceof Error && error.message === "Cross-origin request rejected") {
      return { ok: false, message: "הבקשה נדחתה." };
    }
    return { ok: false, message: "לא ניתן להפיק את המסמך." };
  }
}
