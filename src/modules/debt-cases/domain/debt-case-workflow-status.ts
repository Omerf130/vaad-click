/** Primary case workflow (CP8 subset; extended in later checkpoints). */
export const DebtCaseWorkflowStatus = {
  DRAFT: "draft",
  AWAITING_BUILDING_VERIFICATION: "awaiting_building_verification",
  AWAITING_LAWYER_REVIEW: "awaiting_lawyer_review",
  RETURNED_FOR_COMPLETION: "returned_for_completion",
  REJECTED: "rejected",
  CLOSED_MANUAL: "closed_manual",
  /** Reserved — letter module (not reachable in CP8). */
  LETTER_SENT: "letter_sent",
} as const;

export type DebtCaseWorkflowStatus =
  (typeof DebtCaseWorkflowStatus)[keyof typeof DebtCaseWorkflowStatus];

export const CP8_DEBT_CASE_WORKFLOW_STATUSES: readonly DebtCaseWorkflowStatus[] =
  Object.values(DebtCaseWorkflowStatus);

/** Statuses that block opening another overlapping case on the same apartment. */
export const OPEN_DEBT_CASE_WORKFLOW_STATUSES: readonly DebtCaseWorkflowStatus[] = [
  DebtCaseWorkflowStatus.DRAFT,
  DebtCaseWorkflowStatus.AWAITING_BUILDING_VERIFICATION,
  DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW,
  DebtCaseWorkflowStatus.RETURNED_FOR_COMPLETION,
  DebtCaseWorkflowStatus.LETTER_SENT,
];

export const TERMINAL_DEBT_CASE_WORKFLOW_STATUSES: readonly DebtCaseWorkflowStatus[] = [
  DebtCaseWorkflowStatus.REJECTED,
  DebtCaseWorkflowStatus.CLOSED_MANUAL,
];

export function isOpenDebtCaseWorkflowStatus(status: DebtCaseWorkflowStatus): boolean {
  return (OPEN_DEBT_CASE_WORKFLOW_STATUSES as readonly string[]).includes(status);
}

export function isTerminalDebtCaseWorkflowStatus(status: DebtCaseWorkflowStatus): boolean {
  return (TERMINAL_DEBT_CASE_WORKFLOW_STATUSES as readonly string[]).includes(status);
}
