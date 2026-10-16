"use server";

import { revalidatePath } from "next/cache";

import { resolveAuditCorrelationId } from "@/modules/audit/services/audit-correlation";
import {
  WarningLetterDraftError,
} from "@/modules/warning-letters/domain/warning-letter-draft-errors";
import { formatWarningLetterDraftErrorHe } from "@/modules/warning-letters/presentation/warning-letter-draft-messages.he";
import type { WarningLetterLawyerEditableClauseId } from "@/modules/warning-letters/domain/warning-letter-editable-clause";
import { parseClauseOverridesFromFormData } from "@/modules/warning-letters/domain/parse-clause-overrides-form";
import { loadBuildingLegalReadinessForDebtCase } from "@/modules/debt-cases/services/debt-case-legal-readiness.loader";
import {
  approveWarningLetterDraftWording,
  returnWarningLetterDraftForCorrection,
} from "@/modules/warning-letters/services/warning-letter-draft-approval.service";
import { saveWarningLetterDraftClauseEdits } from "@/modules/warning-letters/services/warning-letter-draft-edit.service";
import {
  mapMongoDraftWriteError,
  regenerateWarningLetterDraftForApprovedCase,
} from "@/modules/warning-letters/services/warning-letter-draft.service";
import { requireLawyerAdminPortal } from "@/shared/auth/require-access";
import { assertSameOriginMutationRequest } from "@/shared/security/request-origin";

export type WarningLetterDraftActionState = {
  ok: boolean;
  message?: string;
  /** Set when a new immutable draft revision was persisted. */
  savedDraftRevision?: number;
  unchanged?: boolean;
};

function adminDebtCaseDetailPath(debtCaseId: string) {
  return `/app/admin/debt-cases/${debtCaseId}`;
}

function mapDraftActionError(error: unknown, fallbackHe: string): WarningLetterDraftActionState {
  if (error instanceof WarningLetterDraftError) {
    const message =
      error.code === "approval_blocked" && error.message.includes("|")
        ? error.message.split("|").map((part) => part.trim()).join("\n")
        : formatWarningLetterDraftErrorHe(error.code);
    return { ok: false, message };
  }
  if (error instanceof Error && error.message === "Cross-origin request rejected") {
    return { ok: false, message: "הבקשה נדחתה." };
  }
  try {
    mapMongoDraftWriteError(error);
  } catch (mapped) {
    if (mapped instanceof WarningLetterDraftError) {
      return { ok: false, message: formatWarningLetterDraftErrorHe(mapped.code) };
    }
  }
  return { ok: false, message: fallbackHe };
}

export async function regenerateWarningLetterDraftFormAction(
  _prev: WarningLetterDraftActionState,
  formData: FormData,
): Promise<WarningLetterDraftActionState> {
  try {
    await assertSameOriginMutationRequest();
    const context = await requireLawyerAdminPortal();
    const debtCaseId = String(formData.get("debtCaseId") ?? "").trim();
    if (!debtCaseId) {
      return { ok: false, message: "מזהה תיק חסר." };
    }

    const correlationId = await resolveAuditCorrelationId();
    await regenerateWarningLetterDraftForApprovedCase({
      context,
      debtCaseId,
      correlationId,
    });

    revalidatePath(adminDebtCaseDetailPath(debtCaseId));
    return { ok: true, message: "נוצרה טיוטת מכתב מעודכנת (גרסה חדשה)." };
  } catch (error) {
    return mapDraftActionError(error, "לא ניתן ליצור מחדש את הטיוטה.");
  }
}

export async function saveWarningLetterDraftEditsFormAction(
  _prev: WarningLetterDraftActionState,
  formData: FormData,
): Promise<WarningLetterDraftActionState> {
  try {
    await assertSameOriginMutationRequest();
    const context = await requireLawyerAdminPortal();
    const debtCaseId = String(formData.get("debtCaseId") ?? "").trim();
    const sourceDraftId = String(formData.get("sourceDraftId") ?? "").trim();
    const expectedConcurrencyRevision = Number(formData.get("expectedConcurrencyRevision") ?? "0");
    if (!debtCaseId || !sourceDraftId || !Number.isFinite(expectedConcurrencyRevision)) {
      return { ok: false, message: "נתוני טופס חסרים." };
    }

    const parsed = parseClauseOverridesFromFormData(formData);
    const clauseOverrides = parsed as Partial<
      Record<WarningLetterLawyerEditableClauseId, string>
    >;

    const correlationId = await resolveAuditCorrelationId();
    const result = await saveWarningLetterDraftClauseEdits({
      context,
      debtCaseId,
      sourceDraftId,
      expectedConcurrencyRevision,
      clauseOverrides,
      correlationId,
    });

    if (result.unchanged) {
      return {
        ok: true,
        unchanged: true,
        message: "לא נמצאו שינויים — לא נוצרה גרסה חדשה.",
      };
    }

    revalidatePath(adminDebtCaseDetailPath(debtCaseId));
    return {
      ok: true,
      unchanged: false,
      savedDraftRevision: result.draftRevision,
      message: `נשמרה גרסת טיוטה ${result.draftRevision} עם העריכה.`,
    };
  } catch (error) {
    return mapDraftActionError(error, "לא ניתן לשמור את העריכה.");
  }
}

export async function approveWarningLetterWordingFormAction(
  _prev: WarningLetterDraftActionState,
  formData: FormData,
): Promise<WarningLetterDraftActionState> {
  try {
    await assertSameOriginMutationRequest();
    const context = await requireLawyerAdminPortal();
    const debtCaseId = String(formData.get("debtCaseId") ?? "").trim();
    const draftId = String(formData.get("draftId") ?? "").trim();
    const buildingId = String(formData.get("buildingId") ?? "").trim();
    const manualOverrideAcknowledged = formData.get("manualOverrideAcknowledged") === "on";
    if (!debtCaseId || !draftId || !buildingId) {
      return { ok: false, message: "נתוני טופס חסרים." };
    }

    const legalReadiness = await loadBuildingLegalReadinessForDebtCase(buildingId);
    const correlationId = await resolveAuditCorrelationId();
    await approveWarningLetterDraftWording({
      context,
      debtCaseId,
      draftId,
      manualOverrideAcknowledged,
      legalReadiness,
      correlationId,
    });

    revalidatePath(adminDebtCaseDetailPath(debtCaseId));
    return { ok: true, message: "נוסח המכתב אושר (ללא שליחה)." };
  } catch (error) {
    return mapDraftActionError(error, "לא ניתן לאשר את הנוסח.");
  }
}

export async function returnWarningLetterForCorrectionFormAction(
  _prev: WarningLetterDraftActionState,
  formData: FormData,
): Promise<WarningLetterDraftActionState> {
  try {
    await assertSameOriginMutationRequest();
    const context = await requireLawyerAdminPortal();
    const debtCaseId = String(formData.get("debtCaseId") ?? "").trim();
    const draftId = String(formData.get("draftId") ?? "").trim();
    const returnReason = String(formData.get("returnReason") ?? "").trim();
    if (!debtCaseId || !draftId) {
      return { ok: false, message: "נתוני טופס חסרים." };
    }

    const correlationId = await resolveAuditCorrelationId();
    await returnWarningLetterDraftForCorrection({
      context,
      debtCaseId,
      draftId,
      returnReason,
      correlationId,
    });

    revalidatePath(adminDebtCaseDetailPath(debtCaseId));
    return { ok: true, message: "הטיוטה הוחזרה לתיקון — ניתן ליצור גרסה חדשה בעריכה." };
  } catch (error) {
    return mapDraftActionError(error, "לא ניתן להחזיר לתיקון.");
  }
}
