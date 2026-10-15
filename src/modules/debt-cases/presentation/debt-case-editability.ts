import { assertDebtCaseContentEditable } from "@/modules/debt-cases/domain/debt-case-edit-policy";
import type { DebtCaseRecord } from "@/modules/debt-cases/domain/debt-case-record.types";

export function isOperatorDebtCaseEditable(record: DebtCaseRecord): boolean {
  try {
    assertDebtCaseContentEditable({
      workflowStatus: record.workflowStatus,
      letterSentAtIso: record.letterSentAtIso,
    });
    return true;
  } catch {
    return false;
  }
}
