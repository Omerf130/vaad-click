import "server-only";

import { DebtCaseError, DebtCaseErrorCode } from "@/modules/debt-cases/domain/debt-case-errors";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import type { DebtCaseDocument } from "@/modules/debt-cases/infra/debt-case.model";
import { loadWarningLetterFinalDocumentForCase } from "@/modules/warning-letters/services/warning-letter-finalization.service";

export function assertDebtCasePostLetterMutationsAllowed(doc: DebtCaseDocument): void {
  if (doc.workflowStatus !== DebtCaseWorkflowStatus.LETTER_SENT) {
    throw new DebtCaseError(
      DebtCaseErrorCode.INVALID_STATUS_TRANSITION,
      "Post-letter actions require letter_sent workflow",
    );
  }
}

export async function assertFinalWarningLetterExists(debtCaseId: string): Promise<void> {
  const finalDocument = await loadWarningLetterFinalDocumentForCase(debtCaseId);
  if (!finalDocument) {
    throw new DebtCaseError(
      DebtCaseErrorCode.VALIDATION,
      "Final warning letter is required before post-letter finance tracking",
    );
  }
}