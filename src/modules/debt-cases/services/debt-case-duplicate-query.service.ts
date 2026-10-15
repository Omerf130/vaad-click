import "server-only";

import type { DebtCaseDuplicateCandidate } from "@/modules/debt-cases/domain/debt-case-duplicate-detection";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import { DebtCase } from "@/modules/debt-cases/infra/debt-case.model";
import { mapDocumentToDuplicateCandidate } from "@/modules/debt-cases/persistence/debt-case.mapper";
import { connectMongo } from "@/shared/db/connect";

const NON_DRAFT_OPEN_STATUSES = [
  DebtCaseWorkflowStatus.AWAITING_BUILDING_VERIFICATION,
  DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW,
  DebtCaseWorkflowStatus.RETURNED_FOR_COMPLETION,
  DebtCaseWorkflowStatus.LETTER_SENT,
] as const;

export async function loadDebtCaseDuplicateCandidates(input: {
  buildingId: string;
  apartmentKeyNormalized: string;
  excludeDebtCaseId?: string;
}): Promise<DebtCaseDuplicateCandidate[]> {
  await connectMongo();
  const filter: Record<string, unknown> = {
    buildingId: input.buildingId,
    apartmentKeyNormalized: input.apartmentKeyNormalized,
    workflowStatus: { $in: NON_DRAFT_OPEN_STATUSES },
  };
  if (input.excludeDebtCaseId) {
    filter.debtCaseId = { $ne: input.excludeDebtCaseId };
  }

  const rows = await DebtCase.find(filter).lean();
  return rows.map((row) => mapDocumentToDuplicateCandidate(row as import("@/modules/debt-cases/infra/debt-case.model").DebtCaseDocument));
}
