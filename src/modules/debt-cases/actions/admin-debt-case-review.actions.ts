"use server";

import { revalidatePath } from "next/cache";

import type { AdminDebtCaseReviewActionState } from "@/modules/debt-cases/presentation/admin-debt-case-review-action-state";
import { mapLawyerDebtCaseReviewActionError } from "@/modules/debt-cases/presentation/lawyer-debt-case-review-error-map";
import {
  approveDebtCaseForLetterPrep,
  rejectDebtCase,
  returnDebtCaseForCompletion,
} from "@/modules/debt-cases/services/debt-case-review.service";
import { resolveAuditCorrelationId } from "@/modules/audit/services/audit-correlation";
import { requireLawyerAdminPortal } from "@/shared/auth/require-access";
import { assertSameOriginMutationRequest } from "@/shared/security/request-origin";

function adminDebtCaseDetailPath(debtCaseId: string) {
  return `/app/admin/debt-cases/${debtCaseId}`;
}

function adminDebtCaseQueuePath() {
  return "/app/admin/debt-cases";
}

function handleError(error: unknown): AdminDebtCaseReviewActionState {
  return mapLawyerDebtCaseReviewActionError(error);
}

async function runReviewMutation(input: {
  debtCaseId: string;
  formData: FormData;
  mutate: (args: {
    context: Awaited<ReturnType<typeof requireLawyerAdminPortal>>;
    debtCaseId: string;
    expectedRevision: number;
    reviewCommentHe?: string;
    correlationId?: string;
  }) => Promise<void>;
  requireComment: boolean;
  successMessage: string;
}): Promise<AdminDebtCaseReviewActionState> {
  try {
    await assertSameOriginMutationRequest();
    const context = await requireLawyerAdminPortal();
    const expectedRevision = Number(input.formData.get("revision") ?? -1);
    const reviewCommentHe = String(input.formData.get("reviewCommentHe") ?? "").trim();
    if (input.requireComment && reviewCommentHe.length < 3) {
      return { ok: false, message: "נדרשת סיבה או הערה (לפחות 3 תווים)." };
    }

    const correlationId = await resolveAuditCorrelationId();
    await input.mutate({
      context,
      debtCaseId: input.debtCaseId,
      expectedRevision,
      reviewCommentHe: reviewCommentHe || undefined,
      correlationId,
    });

    revalidatePath(adminDebtCaseQueuePath());
    revalidatePath(adminDebtCaseDetailPath(input.debtCaseId));

    return { ok: true, message: input.successMessage };
  } catch (error) {
    return handleError(error);
  }
}

export async function approveDebtCaseReviewFormAction(
  _prev: AdminDebtCaseReviewActionState,
  formData: FormData,
): Promise<AdminDebtCaseReviewActionState> {
  const debtCaseId = String(formData.get("debtCaseId") ?? "").trim();
  return runReviewMutation({
    debtCaseId,
    formData,
    requireComment: false,
    successMessage: "התיק אושר להכנת מכתב. אישור זה אינו שליחת מכתב משפטי.",
    mutate: async (args) => {
      await approveDebtCaseForLetterPrep({
        context: args.context,
        debtCaseId: args.debtCaseId,
        expectedRevision: args.expectedRevision,
        correlationId: args.correlationId,
      });
    },
  });
}

export async function returnDebtCaseReviewFormAction(
  _prev: AdminDebtCaseReviewActionState,
  formData: FormData,
): Promise<AdminDebtCaseReviewActionState> {
  const debtCaseId = String(formData.get("debtCaseId") ?? "").trim();
  return runReviewMutation({
    debtCaseId,
    formData,
    requireComment: true,
    successMessage: "התיק הוחזר לנציג להשלמת פרטים.",
    mutate: async (args) => {
      await returnDebtCaseForCompletion({
        context: args.context,
        debtCaseId: args.debtCaseId,
        expectedRevision: args.expectedRevision,
        reviewCommentHe: args.reviewCommentHe,
        correlationId: args.correlationId,
      });
    },
  });
}

export async function rejectDebtCaseReviewFormAction(
  _prev: AdminDebtCaseReviewActionState,
  formData: FormData,
): Promise<AdminDebtCaseReviewActionState> {
  const debtCaseId = String(formData.get("debtCaseId") ?? "").trim();
  return runReviewMutation({
    debtCaseId,
    formData,
    requireComment: true,
    successMessage: "התיק נדחה.",
    mutate: async (args) => {
      await rejectDebtCase({
        context: args.context,
        debtCaseId: args.debtCaseId,
        expectedRevision: args.expectedRevision,
        reviewCommentHe: args.reviewCommentHe ?? "",
        correlationId: args.correlationId,
      });
    },
  });
}
