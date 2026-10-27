import type { WarningLetterClientPresentation } from "@/modules/warning-letters/domain/warning-letter-client-presentation";
import {
  resolvePaymentInstructionClauseTemplate,
} from "@/modules/warning-letters/templates/payment-instruction-clauses";
import {
  INITIAL_WARNING_FIXED_CLAUSES,
  INITIAL_WARNING_MC_MAINTENANCE_CLAUSE,
  INITIAL_WARNING_OCCUPANCY_CLAUSES,
  INITIAL_WARNING_TREATMENT_CLAUSE,
  type InitialWarningClauseId,
} from "@/modules/warning-letters/templates/initial-warning-clause-manifest";
import { substituteTemplate } from "@/modules/warning-letters/snapshot/substitute-template";
import type { WarningLetterRenderedClause } from "@/modules/warning-letters/snapshot/warning-letter-snapshot.types";

export type InitialWarningClauseSelectionInput = {
  clientPresentation: WarningLetterClientPresentation;
  isTenantLegalDebtor: boolean;
  jointOwners: boolean;
  includeTreatmentExpenses: boolean;
  /** Treatment clause with unavailable placeholders (eligible building, missing settings). */
  includeIncompleteTreatmentClause: boolean;
  monetaryPreviewIncomplete: boolean;
  templateValues: Record<string, string>;
};

const ORDERED_CLAUSE_SEQUENCE: InitialWarningClauseId[] = [
  "occupancy_owner_single",
  "occupancy_owner_joint",
  "occupancy_tenant",
  "mc_maintenance_role",
  "non_payment_despite_contact",
  "debt_table_intro",
  "legal_basis_section_58",
  "grace_period_receipt_wording",
  "treatment_expenses",
  "lawsuit_threat",
  "good_faith_opportunity",
  "prior_contacts_documented",
  "printed_deadline_lawsuit",
  "no_second_warning",
  "payment_block",
];

function resolveOccupancyClause(input: InitialWarningClauseSelectionInput): InitialWarningClauseId {
  if (input.isTenantLegalDebtor) {
    return "occupancy_tenant";
  }
  return input.jointOwners ? "occupancy_owner_joint" : "occupancy_owner_single";
}

function shouldIncludeClause(
  clauseId: InitialWarningClauseId,
  input: InitialWarningClauseSelectionInput,
): boolean {
  if (
    clauseId === "occupancy_owner_single" ||
    clauseId === "occupancy_owner_joint" ||
    clauseId === "occupancy_tenant"
  ) {
    return clauseId === resolveOccupancyClause(input);
  }
  if (clauseId === "mc_maintenance_role") {
    return input.clientPresentation === "management_company";
  }
  if (clauseId === "treatment_expenses") {
    return input.includeTreatmentExpenses || input.includeIncompleteTreatmentClause;
  }
  return true;
}

function clauseTemplate(
  clauseId: InitialWarningClauseId,
  input: InitialWarningClauseSelectionInput,
): string {
  if (clauseId === "occupancy_owner_single") {
    return INITIAL_WARNING_OCCUPANCY_CLAUSES.owner_single.template;
  }
  if (clauseId === "occupancy_owner_joint") {
    return INITIAL_WARNING_OCCUPANCY_CLAUSES.owner_joint.template;
  }
  if (clauseId === "occupancy_tenant") {
    return INITIAL_WARNING_OCCUPANCY_CLAUSES.tenant.template;
  }
  if (clauseId === "mc_maintenance_role") {
    return INITIAL_WARNING_MC_MAINTENANCE_CLAUSE.template;
  }
  if (clauseId === "treatment_expenses") {
    return INITIAL_WARNING_TREATMENT_CLAUSE.template;
  }
  if (clauseId === "payment_block") {
    return resolvePaymentInstructionClauseTemplate({
      treatmentFeeEligible:
        input.includeTreatmentExpenses || input.includeIncompleteTreatmentClause,
      includeTreatmentExpenses: input.includeTreatmentExpenses,
      monetaryPreviewIncomplete: input.monetaryPreviewIncomplete,
    });
  }
  const fixed = INITIAL_WARNING_FIXED_CLAUSES[clauseId as keyof typeof INITIAL_WARNING_FIXED_CLAUSES];
  return fixed.template;
}

export function buildNumberedInitialWarningClauses(
  input: InitialWarningClauseSelectionInput,
): WarningLetterRenderedClause[] {
  const selected: WarningLetterRenderedClause[] = [];
  let displayNumber = 0;

  for (const clauseId of ORDERED_CLAUSE_SEQUENCE) {
    if (!shouldIncludeClause(clauseId, input)) {
      continue;
    }
    displayNumber += 1;
    const body = substituteTemplate(clauseTemplate(clauseId, input), input.templateValues);
    selected.push({ clauseId, displayNumber, body });
  }

  return selected;
}
