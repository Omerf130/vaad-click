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
  authorizeWarningLetterDeliveryAttempt,
  recordWarningLetterDeliveryAttemptDetails,
} from "@/modules/warning-letters/services/warning-letter-delivery.service";
import { finalizeWarningLetterForDebtCase } from "@/modules/warning-letters/services/warning-letter-finalization.service";
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

export async function authorizeWarningLetterDeliveryFormAction(
  _prev: WarningLetterLifecycleActionState,
  formData: FormData,
): Promise<WarningLetterLifecycleActionState> {
  try {
    await assertSameOriginMutationRequest();
    const context = await requireLawyerAdminPortal();
    const debtCaseId = String(formData.get("debtCaseId") ?? "").trim();
    const buildingId = String(formData.get("buildingId") ?? "").trim();
    const finalDocumentId = String(formData.get("finalDocumentId") ?? "").trim();
    const channel = String(formData.get("channel") ?? "").trim();
    const recipientDisplayName = String(formData.get("recipientDisplayName") ?? "").trim();
    const recipientContactHint = String(formData.get("recipientContactHint") ?? "").trim();
    if (!debtCaseId || !finalDocumentId || !recipientDisplayName) {
      return { ok: false, message: "פרטי הגשה חסרים." };
    }
    const legalReadiness = await loadBuildingLegalReadinessForDebtCase(buildingId);
    const correlationId = await resolveAuditCorrelationId();
    await authorizeWarningLetterDeliveryAttempt({
      context,
      debtCaseId,
      finalDocumentId,
      channel,
      recipientDisplayName,
      recipientContactHint: recipientContactHint || undefined,
      legalReadiness,
      correlationId,
    });
    revalidatePath(adminDebtCaseDetailPath(debtCaseId));
    return {
      ok: true,
      message: "נרשמה הרשאה לתיעוד הגשה ידני (לא נשלח דבר אוטומטית).",
    };
  } catch (error) {
    return mapLifecycleError(error, "לא ניתן לרשום הגשה.");
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
