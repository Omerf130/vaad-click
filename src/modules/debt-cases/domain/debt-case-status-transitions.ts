import type { DebtCaseActorContext } from "@/modules/debt-cases/domain/debt-case-actor";
import {
  assertAccountMaySubmitDebtCase,
  isLawyerAdminActor,
} from "@/modules/debt-cases/domain/debt-case-actor";
import { DebtCaseError, DebtCaseErrorCode } from "@/modules/debt-cases/domain/debt-case-errors";
import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import {
  DebtCaseWorkflowStatus,
  isTerminalDebtCaseWorkflowStatus,
} from "@/modules/debt-cases/domain/debt-case-workflow-status";

export type DebtCaseWorkflowTransitionActor = "operator" | "lawyer_admin" | "system";

const WORKFLOW_TRANSITIONS: Readonly<
  Record<
    DebtCaseWorkflowStatus,
    Readonly<Partial<Record<DebtCaseWorkflowStatus, readonly DebtCaseWorkflowTransitionActor[]>>>
  >
> = {
  [DebtCaseWorkflowStatus.DRAFT]: {
    [DebtCaseWorkflowStatus.DRAFT]: ["operator", "lawyer_admin"],
    [DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW]: ["operator", "lawyer_admin"],
  },
  [DebtCaseWorkflowStatus.AWAITING_BUILDING_VERIFICATION]: {
    [DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW]: ["system", "lawyer_admin"],
    [DebtCaseWorkflowStatus.DRAFT]: ["lawyer_admin"],
  },
  [DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW]: {
    [DebtCaseWorkflowStatus.RETURNED_FOR_COMPLETION]: ["lawyer_admin"],
    [DebtCaseWorkflowStatus.REJECTED]: ["lawyer_admin"],
    [DebtCaseWorkflowStatus.CLOSED_MANUAL]: ["lawyer_admin"],
    [DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW]: ["operator", "lawyer_admin"],
  },
  [DebtCaseWorkflowStatus.RETURNED_FOR_COMPLETION]: {
    [DebtCaseWorkflowStatus.RETURNED_FOR_COMPLETION]: ["operator", "lawyer_admin"],
    [DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW]: ["operator", "lawyer_admin"],
    [DebtCaseWorkflowStatus.CLOSED_MANUAL]: ["lawyer_admin"],
  },
  [DebtCaseWorkflowStatus.REJECTED]: {},
  [DebtCaseWorkflowStatus.CLOSED_MANUAL]: {},
  [DebtCaseWorkflowStatus.LETTER_SENT]: {
    [DebtCaseWorkflowStatus.CLOSED_MANUAL]: ["lawyer_admin"],
  },
};

const REVIEW_TRANSITIONS: Readonly<
  Record<
    DebtCaseLawyerReviewStatus,
    readonly DebtCaseLawyerReviewStatus[]
  >
> = {
  [DebtCaseLawyerReviewStatus.NOT_SUBMITTED]: [
    DebtCaseLawyerReviewStatus.NOT_SUBMITTED,
    DebtCaseLawyerReviewStatus.PENDING,
  ],
  [DebtCaseLawyerReviewStatus.PENDING]: [
    DebtCaseLawyerReviewStatus.PENDING,
    DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP,
    DebtCaseLawyerReviewStatus.REJECTED,
    DebtCaseLawyerReviewStatus.RETURNED,
  ],
  [DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP]: [
    DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP,
    DebtCaseLawyerReviewStatus.PENDING,
    DebtCaseLawyerReviewStatus.RETURNED,
  ],
  [DebtCaseLawyerReviewStatus.REJECTED]: [DebtCaseLawyerReviewStatus.REJECTED],
  [DebtCaseLawyerReviewStatus.RETURNED]: [
    DebtCaseLawyerReviewStatus.RETURNED,
    DebtCaseLawyerReviewStatus.PENDING,
  ],
};

export function resolveWorkflowTransitionActor(
  context: DebtCaseActorContext,
): DebtCaseWorkflowTransitionActor {
  if (isLawyerAdminActor(context)) {
    return "lawyer_admin";
  }
  return "operator";
}

export function assertDebtCaseWorkflowTransition(input: {
  from: DebtCaseWorkflowStatus;
  to: DebtCaseWorkflowStatus;
  context: DebtCaseActorContext;
}): void {
  if (isTerminalDebtCaseWorkflowStatus(input.from) && input.from !== input.to) {
    throw new DebtCaseError(
      DebtCaseErrorCode.INVALID_STATUS_TRANSITION,
      "Terminal workflow status cannot change",
    );
  }

  const actor = resolveWorkflowTransitionActor(input.context);
  const allowedActors = WORKFLOW_TRANSITIONS[input.from]?.[input.to];
  if (!allowedActors?.includes(actor)) {
    throw new DebtCaseError(
      DebtCaseErrorCode.INVALID_STATUS_TRANSITION,
      `Workflow transition from ${input.from} to ${input.to} is not allowed for ${actor}`,
    );
  }

  if (
    input.from === DebtCaseWorkflowStatus.DRAFT &&
    input.to === DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW
  ) {
    assertAccountMaySubmitDebtCase(input.context);
  }

  if (
    input.from === DebtCaseWorkflowStatus.RETURNED_FOR_COMPLETION &&
    input.to === DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW
  ) {
    assertAccountMaySubmitDebtCase(input.context);
  }
}

export function assertDebtCaseLawyerReviewTransition(
  from: DebtCaseLawyerReviewStatus,
  to: DebtCaseLawyerReviewStatus,
): void {
  const allowed = REVIEW_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new DebtCaseError(
      DebtCaseErrorCode.INVALID_REVIEW_TRANSITION,
      `Invalid lawyer review transition from ${from} to ${to}`,
    );
  }
}

/** Review state after operator submits from draft or returned. */
export function lawyerReviewStatusAfterOperatorSubmit(): DebtCaseLawyerReviewStatus {
  return DebtCaseLawyerReviewStatus.PENDING;
}

/** Review state after lawyer approves for letter preparation (CP8 — no send). */
export function lawyerReviewStatusAfterLawyerApprove(): DebtCaseLawyerReviewStatus {
  return DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP;
}
