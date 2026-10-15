import { startTransition, type TransitionStartFunction } from "react";

import type { AdminDebtCaseReviewActionState } from "@/modules/debt-cases/presentation/admin-debt-case-review-action-state";

export type LawyerReviewConfirmKind = "approve" | "return" | "reject";

export type LawyerReviewActionDispatch = (formData: FormData) => void;

const MIN_REVIEW_COMMENT_LENGTH = 3;

export function buildLawyerDebtCaseReviewFormData(input: {
  debtCaseId: string;
  revision: number;
  reviewCommentHe?: string;
}): FormData {
  const formData = new FormData();
  formData.set("debtCaseId", input.debtCaseId);
  formData.set("revision", String(input.revision));
  if (input.reviewCommentHe !== undefined) {
    formData.set("reviewCommentHe", input.reviewCommentHe);
  }
  return formData;
}

export function runLawyerDebtCaseReviewActionInTransition(
  action: LawyerReviewActionDispatch,
  formData: FormData,
  scheduleTransition: TransitionStartFunction = startTransition,
): void {
  scheduleTransition(() => {
    action(formData);
  });
}

export function lawyerReviewCommentMeetsMinimum(comment: string): boolean {
  return comment.trim().length >= MIN_REVIEW_COMMENT_LENGTH;
}

export type LawyerReviewConfirmDispatchPlan =
  | { kind: "dispatch"; confirm: LawyerReviewConfirmKind; formData: FormData }
  | { kind: "blocked"; reason: "comment" | "unknown_confirm" };

export function planLawyerReviewConfirmDispatch(input: {
  confirm: LawyerReviewConfirmKind | null;
  debtCaseId: string;
  revision: number;
  comment: string;
}): LawyerReviewConfirmDispatchPlan {
  if (input.confirm === null) {
    return { kind: "blocked", reason: "unknown_confirm" };
  }

  if (input.confirm === "approve") {
    return {
      kind: "dispatch",
      confirm: "approve",
      formData: buildLawyerDebtCaseReviewFormData({
        debtCaseId: input.debtCaseId,
        revision: input.revision,
      }),
    };
  }

  if (!lawyerReviewCommentMeetsMinimum(input.comment)) {
    return { kind: "blocked", reason: "comment" };
  }

  const trimmed = input.comment.trim();
  return {
    kind: "dispatch",
    confirm: input.confirm,
    formData: buildLawyerDebtCaseReviewFormData({
      debtCaseId: input.debtCaseId,
      revision: input.revision,
      reviewCommentHe: trimmed,
    }),
  };
}

export function pickLawyerDebtCaseReviewActionFeedback(
  states: AdminDebtCaseReviewActionState[],
): AdminDebtCaseReviewActionState | undefined {
  return states.find((state) => state.message);
}

export function isLawyerDebtCaseReviewInteractionLocked(input: {
  actionPending: boolean;
  confirmDispatchStarted: boolean;
}): boolean {
  return input.actionPending || input.confirmDispatchStarted;
}
