"use server";

import { revalidatePath } from "next/cache";

import { resolveAuditCorrelationId } from "@/modules/audit/services/audit-correlation";
import { loadBuildingLegalReadinessForDebtCase } from "@/modules/debt-cases/services/debt-case-legal-readiness.loader";
import {
  WarningLetterDraftError,
} from "@/modules/warning-letters/domain/warning-letter-draft-errors";
import { formatWarningLetterDraftErrorHe } from "@/modules/warning-letters/presentation/warning-letter-draft-messages.he";
import { approveWarningLetterTemplateVariant } from "@/modules/warning-letters/services/warning-letter-template-variant-approval.service";
import {
  confirmWarningLetterDeliveryDelivered,
  recordManualWarningLetterDelivery,
  recordWarningLetterDeliveryAttemptDetails,
} from "@/modules/warning-letters/services/warning-letter-delivery.service";
import { finalizeWarningLetterForDebtCase } from "@/modules/warning-letters/services/warning-letter-finalization.service";
import { confirmOperativeDeadlinePolicyForLawyerAdmin } from "@/modules/warning-letters/services/warning-letter-operative-deadline-policy.service";
import { requireLawyerAdminPortal } from "@/shared/auth/require-access";
import { assertSameOriginMutationRequest } from "@/shared/security/request-origin";

export type WarningLetterLifecycleActionState = {
  ok: boolean;
  message?: string;
};

function adminDebtCaseDetailPath(debtCaseId: string) {
  return `/app/admin/debt-cases/${debtCaseId}`;
}

function mapLifecycleError(error: unknown, fallbackHe: string): WarningLetterLifecycleActionState {
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
  return { ok: false, message: fallbackHe };
}

export async function approveWarningLetterTemplateVariantFormAction(
  _prev: WarningLetterLifecycleActionState,
  formData: FormData,
): Promise<WarningLetterLifecycleActionState> {
  try {
    await assertSameOriginMutationRequest();
    const context = await requireLawyerAdminPortal();
    const variantId = String(formData.get("variantId") ?? "").trim();
    const templateVersionId = String(formData.get("templateVersionId") ?? "").trim() || undefined;
    const revalidateDebtCaseId = String(formData.get("debtCaseId") ?? "").trim();
    if (!variantId) {
      return { ok: false, message: "מזהה גרסת ניסוח חסר." };
    }
    const correlationId = await resolveAuditCorrelationId();
    const result = await approveWarningLetterTemplateVariant({
      context,
      variantId,
      templateVersionId,
      correlationId,
    });
    revalidatePath("/app/admin/warning-letter-templates");
    if (revalidateDebtCaseId) {
      revalidatePath(adminDebtCaseDetailPath(revalidateDebtCaseId));
    }
    return {
      ok: true,
      message: result.alreadyApproved
        ? "גרסת הניסוח כבר אושרה בעבר."
        : "גרסת הניסוח אושרה ונרשמה בביקורת.",
    };
  } catch (error) {
    return mapLifecycleError(error, "לא ניתן לאשר את גרסת הניסוח.");
  }
}

export async function confirmOperativeDeadlinePolicyFormAction(
  _prev: WarningLetterLifecycleActionState,
  formData: FormData,
): Promise<WarningLetterLifecycleActionState> {
  try {
    await assertSameOriginMutationRequest();
    const context = await requireLawyerAdminPortal();
    const revalidateDebtCaseId = String(formData.get("debtCaseId") ?? "").trim();
    const result = await confirmOperativeDeadlinePolicyForLawyerAdmin({ context });
    revalidatePath("/app/admin/warning-letter-templates");
    if (revalidateDebtCaseId) {
      revalidatePath(adminDebtCaseDetailPath(revalidateDebtCaseId));
    }
    return {
      ok: true,
      message: result.alreadyConfirmed
        ? "מדיניות המועד כבר אושרה במערכת."
        : "מדיניות המועד אושרה לצורך סגירת מסמכים סופיים (בכפוף לאישור משפטי סופי).",
    };
  } catch (error) {
    return mapLifecycleError(error, "לא ניתן לאשר את מדיניות המועד.");
  }
}

export async function finalizeWarningLetterFormAction(
  _prev: WarningLetterLifecycleActionState,
  formData: FormData,
): Promise<WarningLetterLifecycleActionState> {
  try {
    await assertSameOriginMutationRequest();
    const context = await requireLawyerAdminPortal();
    const debtCaseId = String(formData.get("debtCaseId") ?? "").trim();
    const draftId = String(formData.get("draftId") ?? "").trim();
    const buildingId = String(formData.get("buildingId") ?? "").trim();
    if (!debtCaseId || !draftId) {
      return { ok: false, message: "פרטי תיק/טיוטה חסרים." };
    }
    const legalReadiness = await loadBuildingLegalReadinessForDebtCase(buildingId);
    const correlationId = await resolveAuditCorrelationId();
    const result = await finalizeWarningLetterForDebtCase({
      context,
      debtCaseId,
      draftId,
      legalReadiness,
      correlationId,
    });
    revalidatePath(adminDebtCaseDetailPath(debtCaseId));
    return {
      ok: true,
      message: result.created
        ? "נוצר רישום סגירת מסמך (ייתכנו חסימות מבצעיות — ראו לוח מוכנות)."
        : "רישום הסגירה כבר קיים לגרסת טיוטה זו.",
    };
  } catch (error) {
    return mapLifecycleError(error, "לא ניתן לסגור מסמך סופי.");
  }
}

export async function recordManualWarningLetterDeliveryFormAction(
  _prev: WarningLetterLifecycleActionState,
  formData: FormData,
): Promise<WarningLetterLifecycleActionState> {
  try {
    await assertSameOriginMutationRequest();
    const context = await requireLawyerAdminPortal();
    const debtCaseId = String(formData.get("debtCaseId") ?? "").trim();
    const finalDocumentId = String(formData.get("finalDocumentId") ?? "").trim();
    const channel = String(formData.get("channel") ?? "").trim();
    const deliveryStatus = String(formData.get("deliveryStatus") ?? "").trim();
    const sentAtIsoLocal = String(formData.get("sentAtIsoLocal") ?? "").trim();
    const recipientDisplayName = String(formData.get("recipientDisplayName") ?? "").trim();
    const recipientContactHint = String(formData.get("recipientContactHint") ?? "").trim();
    const trackingReference = String(formData.get("trackingReference") ?? "").trim();
    const internalNotes = String(formData.get("internalNotes") ?? "").trim();
    const evidenceDocumentAssetId = String(formData.get("evidenceDocumentAssetId") ?? "").trim();
    const idempotencyKey = String(formData.get("idempotencyKey") ?? "").trim();
    if (!debtCaseId || !finalDocumentId || !recipientDisplayName || !sentAtIsoLocal) {
      return { ok: false, message: "פרטי משלוח חסרים." };
    }
    const correlationId = await resolveAuditCorrelationId();
    const result = await recordManualWarningLetterDelivery({
      context,
      debtCaseId,
      finalDocumentId,
      channel,
      deliveryStatus,
      sentAtIsoLocal,
      recipientDisplayName,
      recipientContactHint: recipientContactHint || undefined,
      trackingReference: trackingReference || undefined,
      internalNotes: internalNotes || undefined,
      evidenceDocumentAssetId: evidenceDocumentAssetId || undefined,
      idempotencyKey: idempotencyKey || undefined,
      correlationId,
    });
    revalidatePath(adminDebtCaseDetailPath(debtCaseId));
    const sentNote = result.caseLetterSent
      ? " סטטוס התיק עודכן ל«מכתב נשלח» (תיעוד בלבד)."
      : "";
    return {
      ok: true,
      message: result.created
        ? `נרשם משלוח ידני.${sentNote}`
        : `רישום משלוח כבר קיים (מפתח idempotency).${sentNote}`,
    };
  } catch (error) {
    return mapLifecycleError(error, "לא ניתן לרשום משלוח ידני.");
  }
}

/** @deprecated — CP21 uses recordManualWarningLetterDeliveryFormAction */
export async function authorizeWarningLetterDeliveryFormAction(
  _prev: WarningLetterLifecycleActionState,
  formData: FormData,
): Promise<WarningLetterLifecycleActionState> {
  return recordManualWarningLetterDeliveryFormAction(_prev, formData);
}

export async function confirmWarningLetterDeliveryFormAction(
  _prev: WarningLetterLifecycleActionState,
  formData: FormData,
): Promise<WarningLetterLifecycleActionState> {
  try {
    await assertSameOriginMutationRequest();
    const context = await requireLawyerAdminPortal();
    const debtCaseId = String(formData.get("debtCaseId") ?? "").trim();
    const deliveryRecordId = String(formData.get("deliveryRecordId") ?? "").trim();
    const confirmedDeliveredAtIsoLocal = String(
      formData.get("confirmedDeliveredAtIsoLocal") ?? "",
    ).trim();
    const internalNotes = String(formData.get("internalNotes") ?? "").trim();
    if (!debtCaseId || !deliveryRecordId || !confirmedDeliveredAtIsoLocal) {
      return { ok: false, message: "פרטי אישור קבלה חסרים." };
    }
    const correlationId = await resolveAuditCorrelationId();
    await confirmWarningLetterDeliveryDelivered({
      context,
      debtCaseId,
      deliveryRecordId,
      confirmedDeliveredAtIsoLocal,
      internalNotes: internalNotes || undefined,
      correlationId,
    });
    revalidatePath(adminDebtCaseDetailPath(debtCaseId));
    return { ok: true, message: "נרשמה אישור קבלה (נפרד משליחה)." };
  } catch (error) {
    return mapLifecycleError(error, "לא ניתן לאשר קבלה.");
  }
}

export async function recordWarningLetterDeliveryDetailsFormAction(
  _prev: WarningLetterLifecycleActionState,
  formData: FormData,
): Promise<WarningLetterLifecycleActionState> {
  try {
    await assertSameOriginMutationRequest();
    const context = await requireLawyerAdminPortal();
    const debtCaseId = String(formData.get("debtCaseId") ?? "").trim();
    const deliveryRecordId = String(formData.get("deliveryRecordId") ?? "").trim();
    const trackingReference = String(formData.get("trackingReference") ?? "").trim();
    const evidenceNote = String(formData.get("evidenceNote") ?? "").trim();
    const markFailed = formData.get("markFailed") === "1";
    const failureNote = String(formData.get("failureNote") ?? "").trim();
    if (!deliveryRecordId) {
      return { ok: false, message: "מזהה רשומת הגשה חסר." };
    }
    await recordWarningLetterDeliveryAttemptDetails({
      context,
      deliveryRecordId,
      trackingReference: trackingReference || undefined,
      evidenceNote: evidenceNote || undefined,
      markFailed,
      failureNote: failureNote || undefined,
    });
    if (debtCaseId) {
      revalidatePath(adminDebtCaseDetailPath(debtCaseId));
    }
    return { ok: true, message: "פרטי ההגשה עודכנו (תיעוד בלבד)." };
  } catch (error) {
    return mapLifecycleError(error, "לא ניתן לעדכן תיעוד הגשה.");
  }
}
