import { z } from "zod";

import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";

export const LAWYER_DEBT_CASE_LIST_PAGE_SIZE = 20;

const workflowFilterSchema = z.enum([
  "all",
  DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW,
  DebtCaseWorkflowStatus.RETURNED_FOR_COMPLETION,
  DebtCaseWorkflowStatus.REJECTED,
  DebtCaseWorkflowStatus.DRAFT,
  DebtCaseWorkflowStatus.CLOSED_MANUAL,
]);

const reviewFilterSchema = z.enum([
  "all",
  DebtCaseLawyerReviewStatus.PENDING,
  DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP,
  DebtCaseLawyerReviewStatus.RETURNED,
  DebtCaseLawyerReviewStatus.REJECTED,
  DebtCaseLawyerReviewStatus.NOT_SUBMITTED,
]);

export const lawyerDebtCaseListParamsSchema = z.object({
  q: z.string().trim().max(120).optional(),
  buildingId: z.string().uuid().optional(),
  workflowStatus: workflowFilterSchema.default("all"),
  lawyerReviewStatus: reviewFilterSchema.default(DebtCaseLawyerReviewStatus.PENDING),
  page: z.coerce.number().int().min(1).default(1),
});

export type LawyerDebtCaseListParams = z.infer<typeof lawyerDebtCaseListParamsSchema>;

function singleQueryValue(raw: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const value = raw[key];
  const text = Array.isArray(value) ? value[0] : value;
  if (text === undefined) {
    return undefined;
  }
  const trimmed = text.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function parseLawyerDebtCaseListSearchParams(
  raw: Record<string, string | string[] | undefined>,
): LawyerDebtCaseListParams {
  return lawyerDebtCaseListParamsSchema.parse({
    q: singleQueryValue(raw, "q"),
    buildingId: singleQueryValue(raw, "buildingId"),
    workflowStatus: singleQueryValue(raw, "workflowStatus") ?? "all",
    lawyerReviewStatus: singleQueryValue(raw, "lawyerReviewStatus") ?? DebtCaseLawyerReviewStatus.PENDING,
    page: singleQueryValue(raw, "page") ?? "1",
  });
}
