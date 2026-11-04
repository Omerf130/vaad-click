"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";

import { DebtCaseError } from "@/modules/debt-cases/domain/debt-case-errors";
import { mapDebtCaseErrorToHebrew } from "@/modules/debt-cases/presentation/debt-case-messages.he";
import {
  saveDebtCaseIntakeDraft,
  submitDebtCaseIntake,
} from "@/modules/debt-cases/services/debt-case-intake.service";
import { resolveAuditCorrelationId } from "@/modules/audit/services/audit-correlation";
import { requireOperatorPortalAccess } from "@/shared/auth/require-operator-portal";
import { assertSameOriginMutationRequest } from "@/shared/security/request-origin";

export type IntakeActionState = {
  ok: boolean;
  message?: string;
  code?: string;
  intakeDraftId?: string;
  revision?: number;
  debtCaseId?: string;
  buildingId?: string;
  pendingBuildingReview?: boolean;
};

function handleError(error: unknown): IntakeActionState {
  if (error instanceof DebtCaseError) {
    return { ok: false, code: error.code, message: mapDebtCaseErrorToHebrew(error.code) };
  }
  if (error instanceof ZodError) {
    return { ok: false, message: "יש לתקן את השדות המסומנים." };
  }
  if (error instanceof Error && error.message === "Cross-origin request rejected") {
    return { ok: false, message: "הבקשה נדחתה." };
  }
  return { ok: false, message: "לא ניתן להשלים את הפעולה." };
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

export async function saveDebtCaseIntakeDraftAction(
  _prev: IntakeActionState,
  formData: FormData,
): Promise<IntakeActionState> {
  try {
    await assertSameOriginMutationRequest();
    const context = await requireOperatorPortalAccess();
    const payload = JSON.parse(String(formData.get("payload") ?? "{}"));
    const correlationId = await resolveAuditCorrelationId();
    const result = await saveDebtCaseIntakeDraft({ context, payload, correlationId });
    revalidatePath("/app");
    revalidatePath("/app/debt-cases/new");
    if (payload.intakeDraftId) {
      revalidatePath(`/app/debt-cases/intake/${payload.intakeDraftId}`);
    }
    return {
      ok: true,
      message: "הטיוטה נשמרה.",
      intakeDraftId: result.intakeDraftId,
      revision: result.revision,
    };
  } catch (error) {
    return handleError(error);
  }
}

export async function submitDebtCaseIntakeAction(
  _prev: IntakeActionState,
  formData: FormData,
): Promise<IntakeActionState> {
  try {
    await assertSameOriginMutationRequest();
    const context = await requireOperatorPortalAccess();
    const payload = JSON.parse(String(formData.get("payload") ?? "{}"));
    const correlationId = await resolveAuditCorrelationId();
    const result = await submitDebtCaseIntake({ context, payload, correlationId });
    revalidatePath("/app");

    if (result.kind === "pending_building_review") {
      return {
        ok: true,
        pendingBuildingReview: true,
        intakeDraftId: result.intakeDraftId,
        message: "הבקשה התקבלה ונדרשת בדיקה נוספת של פרטי הבניין.",
      };
    }

    revalidatePath(`/app/buildings/${result.buildingId}`);
    redirect(`/app/buildings/${result.buildingId}/debt-cases/${result.debtCaseId}`);
  } catch (error) {
    rethrowNextRedirect(error);
    return handleError(error);
  }
}
