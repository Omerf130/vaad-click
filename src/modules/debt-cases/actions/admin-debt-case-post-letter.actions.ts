"use server";

import { revalidatePath } from "next/cache";

import type { AdminDebtCasePostLetterActionState } from "@/modules/debt-cases/presentation/admin-debt-case-post-letter-action-state";
import { mapLawyerDebtCaseReviewActionError } from "@/modules/debt-cases/presentation/lawyer-debt-case-review-error-map";
import { parseNisInputToMinorUnits } from "@/modules/debt-cases/presentation/debt-case-labels.he";
import { DebtCaseDebtorResponseType } from "@/modules/debt-cases/domain/debt-case-debtor-response-type";
import { DebtCaseManualPaymentMethod } from "@/modules/debt-cases/domain/debt-case-manual-payment-method";
import { DebtCaseResolutionKind } from "@/modules/debt-cases/domain/debt-case-resolution-kind";
import { recordDebtCaseDebtorResponse } from "@/modules/debt-cases/services/debt-case-debtor-response.service";
import {
  recordDebtCaseManualPayment,
  reverseDebtCaseManualPayment,
} from "@/modules/debt-cases/services/debt-case-manual-payment.service";
import {
  reopenDebtCaseAfterManualClosure,
  resolveDebtCaseManually,
} from "@/modules/debt-cases/services/debt-case-resolution.service";
import { resolveAuditCorrelationId } from "@/modules/audit/services/audit-correlation";
import { requireLawyerAdminPortal } from "@/shared/auth/require-access";
import { assertSameOriginMutationRequest } from "@/shared/security/request-origin";

function adminDebtCaseDetailPath(debtCaseId: string) {
  return `/app/admin/debt-cases/${debtCaseId}`;
}

function handleError(error: unknown): AdminDebtCasePostLetterActionState {
  return mapLawyerDebtCaseReviewActionError(error);
}

function parseLocalDatetime(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function recordDebtCaseManualPaymentFormAction(
  _prev: AdminDebtCasePostLetterActionState,
  formData: FormData,
): Promise<AdminDebtCasePostLetterActionState> {
  try {
    await assertSameOriginMutationRequest();
    const context = await requireLawyerAdminPortal();
    const debtCaseId = String(formData.get("debtCaseId") ?? "").trim();
    const amountMinor = parseNisInputToMinorUnits(String(formData.get("amountNis") ?? ""));
    const paymentDate = parseLocalDatetime(String(formData.get("paymentDate") ?? ""));
    const paymentMethodRaw = String(formData.get("paymentMethod") ?? "").trim();
    const idempotencyKey = String(formData.get("idempotencyKey") ?? "").trim() || null;
    const acceptOverpayment = formData.get("acceptOverpaymentAcknowledged") === "on";

    if (!debtCaseId || amountMinor == null || !paymentDate) {
      return { ok: false, message: "יש למלא סכום חיובי ותאריך תשלום." };
    }

    const paymentMethod = Object.values(DebtCaseManualPaymentMethod).includes(
      paymentMethodRaw as DebtCaseManualPaymentMethod,
    )
      ? (paymentMethodRaw as DebtCaseManualPaymentMethod)
      : null;

    const correlationId = await resolveAuditCorrelationId();
    const result = await recordDebtCaseManualPayment({
      context,
      debtCaseId,
      amountMinor,
      paymentDate,
      paymentMethod,
      reference: String(formData.get("reference") ?? "").trim() || null,
      lawyerNotes: String(formData.get("lawyerNotes") ?? "").trim() || null,
      evidenceDocumentAssetId: String(formData.get("evidenceDocumentAssetId") ?? "").trim() || null,
      idempotencyKey,
      acceptOverpaymentAcknowledged: acceptOverpayment,
      correlationId,
    });

    revalidatePath(adminDebtCaseDetailPath(debtCaseId));
    return {
      ok: true,
      message: result.idempotentReplay ? "תשלום כבר תועד (מפתח ייחודיות)." : "תשלום תועד ביומן.",
    };
  } catch (error) {
    return handleError(error);
  }
}

export async function reverseDebtCaseManualPaymentFormAction(
  _prev: AdminDebtCasePostLetterActionState,
  formData: FormData,
): Promise<AdminDebtCasePostLetterActionState> {
  try {
    await assertSameOriginMutationRequest();
    const context = await requireLawyerAdminPortal();
    const debtCaseId = String(formData.get("debtCaseId") ?? "").trim();
    const reversesPaymentEntryId = String(formData.get("reversesPaymentEntryId") ?? "").trim();
    const correctionReasonHe = String(formData.get("correctionReasonHe") ?? "").trim();
    const idempotencyKey = String(formData.get("idempotencyKey") ?? "").trim() || null;

    if (!debtCaseId || !reversesPaymentEntryId) {
      return { ok: false, message: "רשומת תשלום לביטול לא צוינה." };
    }

    const correlationId = await resolveAuditCorrelationId();
    const result = await reverseDebtCaseManualPayment({
      context,
      debtCaseId,
      reversesPaymentEntryId,
      correctionReasonHe,
      idempotencyKey,
      correlationId,
    });

    revalidatePath(adminDebtCaseDetailPath(debtCaseId));
    return {
      ok: true,
      message: result.idempotentReplay ? "ביטול כבר תועד." : "בוצע ביטול תיעוד תשלום.",
    };
  } catch (error) {
    return handleError(error);
  }
}

export async function recordDebtCaseDebtorResponseFormAction(
  _prev: AdminDebtCasePostLetterActionState,
  formData: FormData,
): Promise<AdminDebtCasePostLetterActionState> {
  try {
    await assertSameOriginMutationRequest();
    const context = await requireLawyerAdminPortal();
    const debtCaseId = String(formData.get("debtCaseId") ?? "").trim();
    const responseTypeRaw = String(formData.get("responseType") ?? "").trim();
    const responseDate = parseLocalDatetime(String(formData.get("responseDate") ?? ""));
    const idempotencyKey = String(formData.get("idempotencyKey") ?? "").trim() || null;

    if (!debtCaseId || !responseDate) {
      return { ok: false, message: "יש לבחור סוג תגובה ותאריך." };
    }
    if (
      !Object.values(DebtCaseDebtorResponseType).includes(
        responseTypeRaw as DebtCaseDebtorResponseType,
      )
    ) {
      return { ok: false, message: "סוג תגובה לא תקין." };
    }

    const correlationId = await resolveAuditCorrelationId();
    await recordDebtCaseDebtorResponse({
      context,
      debtCaseId,
      responseType: responseTypeRaw as DebtCaseDebtorResponseType,
      responseDate,
      lawyerNotes: String(formData.get("lawyerNotes") ?? "").trim() || null,
      idempotencyKey,
      correlationId,
    });

    revalidatePath(adminDebtCaseDetailPath(debtCaseId));
    return { ok: true, message: "תגובת חייב תועדה." };
  } catch (error) {
    return handleError(error);
  }
}

export async function resolveDebtCasePostLetterFormAction(
  _prev: AdminDebtCasePostLetterActionState,
  formData: FormData,
): Promise<AdminDebtCasePostLetterActionState> {
  try {
    await assertSameOriginMutationRequest();
    const context = await requireLawyerAdminPortal();
    const debtCaseId = String(formData.get("debtCaseId") ?? "").trim();
    const expectedRevision = Number(formData.get("revision") ?? -1);
    const resolutionKindRaw = String(formData.get("resolutionKind") ?? "").trim();
    const resolutionReasonHe = String(formData.get("resolutionReasonHe") ?? "").trim();

    if (
      !Object.values(DebtCaseResolutionKind).includes(resolutionKindRaw as DebtCaseResolutionKind)
    ) {
      return { ok: false, message: "סוג סגירה לא תקין." };
    }

    const correlationId = await resolveAuditCorrelationId();
    await resolveDebtCaseManually({
      context,
      debtCaseId,
      expectedRevision,
      resolutionKind: resolutionKindRaw as DebtCaseResolutionKind,
      resolutionReasonHe: resolutionReasonHe || null,
      correlationId,
    });

    revalidatePath(adminDebtCaseDetailPath(debtCaseId));
    return { ok: true, message: "התיק נסגר ידנית — לא נסגר אוטומטית בגלל יתרה." };
  } catch (error) {
    return handleError(error);
  }
}

export async function reopenDebtCasePostLetterFormAction(
  _prev: AdminDebtCasePostLetterActionState,
  formData: FormData,
): Promise<AdminDebtCasePostLetterActionState> {
  try {
    await assertSameOriginMutationRequest();
    const context = await requireLawyerAdminPortal();
    const debtCaseId = String(formData.get("debtCaseId") ?? "").trim();
    const expectedRevision = Number(formData.get("revision") ?? -1);

    const correlationId = await resolveAuditCorrelationId();
    await reopenDebtCaseAfterManualClosure({
      context,
      debtCaseId,
      expectedRevision,
      correlationId,
    });

    revalidatePath(adminDebtCaseDetailPath(debtCaseId));
    return { ok: true, message: "התיק נפתח מחדש לשלב לאחר משלוח מכתב." };
  } catch (error) {
    return handleError(error);
  }
}