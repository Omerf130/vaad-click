import { z } from "zod";

import { CourtCostsPolicy, COURT_COSTS_POLICIES } from "@/modules/financial-settings/domain/court-costs-policy";
import {
  EscalationCalculationBase,
  ESCALATION_CALCULATION_BASES,
} from "@/modules/financial-settings/domain/escalation-calculation-base";
import { CurrencyCode, CURRENCY_CODES } from "@/shared/financial/currency";
import { moneyAmountSchema } from "@/shared/financial/money.schema";
import { basisPointsSchema } from "@/shared/financial/percentage.schema";
import { startOfDayJerusalem } from "@/shared/time/jerusalem-calendar";

export const vatScheduleEntryInputSchema = z.object({
  effectiveFromIso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rateBasisPoints: basisPointsSchema,
});

export type VatScheduleEntryInput = z.infer<typeof vatScheduleEntryInputSchema>;

export const financialSettingsAmountsSchema = z.object({
  debtorTreatmentFeeExVat: moneyAmountSchema,
  committeeTreatmentFeeWhenDebtorWaivedExVat: moneyAmountSchema,
});

export const financialSettingsEscalationSchema = z.object({
  recoveryFeeRateBasisPoints: basisPointsSchema,
  calculationBase: z.enum(
    ESCALATION_CALCULATION_BASES as [
      EscalationCalculationBase,
      ...EscalationCalculationBase[],
    ],
  ),
  courtCostsPolicy: z.enum(
    COURT_COSTS_POLICIES as [CourtCostsPolicy, ...CourtCostsPolicy[]],
  ),
});

export const draftFinancialSettingsContentSchema = z.object({
  currency: z.enum(CURRENCY_CODES as [CurrencyCode, ...CurrencyCode[]]),
  amounts: financialSettingsAmountsSchema.partial().optional(),
  vatSchedule: z.array(vatScheduleEntryInputSchema).optional(),
  escalation: financialSettingsEscalationSchema.partial().optional(),
  notesInternal: z.string().max(2000).optional(),
});

export type DraftFinancialSettingsContentInput = z.infer<
  typeof draftFinancialSettingsContentSchema
>;

export const publishFinancialSettingsInputSchema = z
  .object({
    revision: z.number().int().positive(),
    effectiveFromIso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    currency: z.enum(CURRENCY_CODES as [CurrencyCode, ...CurrencyCode[]]),
    amounts: financialSettingsAmountsSchema,
    vatSchedule: z.array(vatScheduleEntryInputSchema).min(1),
    escalation: financialSettingsEscalationSchema,
    notesInternal: z.string().max(2000).optional(),
  })
  .superRefine((value, ctx) => {
    const effectiveFrom = startOfDayJerusalem(value.effectiveFromIso);
    const entries = value.vatSchedule.map((entry) => ({
      iso: entry.effectiveFromIso,
      instant: startOfDayJerusalem(entry.effectiveFromIso),
      rateBasisPoints: entry.rateBasisPoints,
    }));

    for (let index = 1; index < entries.length; index += 1) {
      if (entries[index].instant.getTime() <= entries[index - 1].instant.getTime()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "VAT schedule effective dates must be strictly increasing",
          path: ["vatSchedule", index, "effectiveFromIso"],
        });
      }
    }

    const uniqueIsos = new Set(entries.map((entry) => entry.iso));
    if (uniqueIsos.size !== entries.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "VAT schedule contains duplicate effective dates",
        path: ["vatSchedule"],
      });
    }

    if (value.amounts.debtorTreatmentFeeExVat.currency !== value.currency) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Amount currency must match version currency",
        path: ["amounts", "debtorTreatmentFeeExVat"],
      });
    }
    if (value.amounts.committeeTreatmentFeeWhenDebtorWaivedExVat.currency !== value.currency) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Amount currency must match version currency",
        path: ["amounts", "committeeTreatmentFeeWhenDebtorWaivedExVat"],
      });
    }

    void effectiveFrom;
  });

export type PublishFinancialSettingsInput = z.infer<
  typeof publishFinancialSettingsInputSchema
>;

export function mapVatScheduleInputToDates(
  entries: VatScheduleEntryInput[],
): { effectiveFrom: Date; rateBasisPoints: number }[] {
  return entries.map((entry) => ({
    effectiveFrom: startOfDayJerusalem(entry.effectiveFromIso),
    rateBasisPoints: entry.rateBasisPoints,
  }));
}
