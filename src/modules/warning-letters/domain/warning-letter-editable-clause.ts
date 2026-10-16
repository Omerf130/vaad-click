import type { InitialWarningClauseId } from "@/modules/warning-letters/templates/initial-warning-clause-manifest";

/**
 * Clauses a lawyer may override per-debt-case (exceptional wording).
 * Structural, financial, identity, and payment clauses are never editable here.
 */
export const WARNING_LETTER_LAWYER_EDITABLE_CLAUSE_IDS = [
  "non_payment_despite_contact",
  "legal_basis_section_58",
  "grace_period_receipt_wording",
  "lawsuit_threat",
  "good_faith_opportunity",
  "prior_contacts_documented",
  "no_second_warning",
  "evidence_disclaimer",
] as const satisfies readonly InitialWarningClauseId[];

export type WarningLetterLawyerEditableClauseId =
  (typeof WARNING_LETTER_LAWYER_EDITABLE_CLAUSE_IDS)[number];

export function isLawyerEditableClauseId(
  clauseId: string,
): clauseId is WarningLetterLawyerEditableClauseId {
  return (WARNING_LETTER_LAWYER_EDITABLE_CLAUSE_IDS as readonly string[]).includes(clauseId);
}
