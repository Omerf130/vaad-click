export const EscalationCalculationBase = {
  UNSPECIFIED: "unspecified",
} as const;

export type EscalationCalculationBase =
  (typeof EscalationCalculationBase)[keyof typeof EscalationCalculationBase];

export const ESCALATION_CALCULATION_BASES: readonly EscalationCalculationBase[] =
  Object.values(EscalationCalculationBase);
