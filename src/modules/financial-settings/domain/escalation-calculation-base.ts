export const EscalationCalculationBase = {
  UNSPECIFIED: "unspecified",
  COLLECTED_PRINCIPAL_AND_INDEXATION_INTEREST_AFTER_LAWSUIT_FILED:
    "collected_principal_indexation_interest_after_lawsuit_filed",
} as const;

export type EscalationCalculationBase =
  (typeof EscalationCalculationBase)[keyof typeof EscalationCalculationBase];

export const ESCALATION_CALCULATION_BASES: readonly EscalationCalculationBase[] =
  Object.values(EscalationCalculationBase);
