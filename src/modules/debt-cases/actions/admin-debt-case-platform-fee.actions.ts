"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { WarningLetterPlatformFeeCollectionStatus } from "@/modules/debt-cases/domain/warning-letter-platform-fee-collection-status";
import { DebtCaseError } from "@/modules/debt-cases/domain/debt-case-errors";
import { mapDebtCaseErrorToHebrew } from "@/modules/debt-cases/presentation/debt-case-messages.he";
import { updateWarningLetterPlatformFeeCollectionStatus } from "@/modules/debt-cases/services/warning-letter-platform-fee.service";
import { resolveAuditCorrelationId } from "@/modules/audit/services/audit-correlation";
import { requireLawyerAdminPortal } from "@/shared/auth/require-access";
import { assertSameOriginMutationRequest } from "@/shared/security/request-origin";

const updateSchema = z.object({
  debtCaseId: z.string().uuid(),
  nextStatus: z.enum(
    Object.values(WarningLetterPlatformFeeCollectionStatus) as [
      WarningLetterPlatformFeeCollectionStatus,
      ...WarningLetterPlatformFeeCollectionStatus[],
    ],
  ),
  internalNote: z.string().trim().max(500).optional().nullable(),
});

export type PlatformFeeActionState = { ok: boolean; message?: string };

export async function updatePlatformFeeCollectionStatusAction(
  _prev: PlatformFeeActionState,
  formData: FormData,
): Promise<PlatformFeeActionState> {
  try {
    await assertSameOriginMutationRequest();
    const context = await requireLawyerAdminPortal();
    const parsed = updateSchema.parse({
      debtCaseId: formData.get("debtCaseId"),
      nextStatus: formData.get("nextStatus"),
      internalNote: formData.get("internalNote") || null,
    });
    const correlationId = await resolveAuditCorrelationId();
    await updateWarningLetterPlatformFeeCollectionStatus({
      context,
      debtCaseId: parsed.debtCaseId,
      nextStatus: parsed.nextStatus,
      internalNote: parsed.internalNote,
      correlationId,
    });
    revalidatePath(`/app/admin/debt-cases/${parsed.debtCaseId}`);
    return { ok: true, message: "סטטוס התשלום עודכן." };
  } catch (error) {
    if (error instanceof DebtCaseError) {
      return { ok: false, message: mapDebtCaseErrorToHebrew(error.code) };
    }
    if (error instanceof z.ZodError) {
      return { ok: false, message: "יש לתקן את השדות." };
    }
    return { ok: false, message: "לא ניתן לעדכן את הסטטוס." };
  }
}
