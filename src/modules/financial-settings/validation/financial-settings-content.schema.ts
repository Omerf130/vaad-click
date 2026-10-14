import { z } from "zod";

import {
  CollectionAllocationOrder,
  COLLECTION_ALLOCATION_ORDERS,
} from "@/modules/financial-settings/domain/collection-allocation-order";
import { CourtCostsPolicy, COURT_COSTS_POLICIES } from "@/modules/financial-settings/domain/court-costs-policy";
import {
  EscalationCalculationBase,
  ESCALATION_CALCULATION_BASES,
} from "@/modules/financial-settings/domain/escalation-calculation-base";
import {
  SUCCESS_FEE_EXCLUSIONS,
  SuccessFeeExclusion,
} from "@/modules/financial-settings/domain/success-fee-exclusion";
import { AmountsMonetaryBasis } from "@/modules/financial-settings/domain/amounts-monetary-basis";
import { CurrencyCode, CURRENCY_CODES } from "@/shared/financial/currency";
import { moneyAmountSchema } from "@/shared/financial/money.schema";
import { basisPointsSchema } from "@/shared/financial/percentage.schema";
import { startOfDayJerusalem } from "@/shared/time/jerusalem-calendar";

export const vatScheduleEntryInputSchema = z.object({
  effectiveFromIso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rateBasisPoints: basisPointsSchema,
});

export type VatScheduleEntryInput = z.infer<typeof vatScheduleEntryInputSchema>;

/** Legacy net (ex-VAT) amounts — read-only on historical published rows. */
export const financialSettingsLegacyAmountsSchema = z.object({
  debtorTreatmentFeeExVat: moneyAmountSchema,
  committeeTreatmentFeeWhenDebtorWaivedExVat: moneyAmountSchema,
});

/** Draft save: lawyer-entered gross-inclusive treatment fees only. */
export const financialSettingsDraftGrossAmountsSchema = z.object({
  debtorTreatmentFeeGross: moneyAmountSchema,
  committeeTreatmentFeeWhenDebtorWaivedGross: moneyAmountSchema,
});

/** Publish: frozen gross/net/VAT triple derived at effective date. */
export const publishFinancialSettingsGrossAmountsSchema = z.object({
  amountsMonetaryBasis: z.literal(AmountsMonetaryBasis.GROSS_INCLUSIVE_VAT),
  debtorTreatmentFeeGross: moneyAmountSchema,
  debtorTreatmentFeeNet: moneyAmountSchema,
  debtorTreatmentFeeVat: moneyAmountSchema,
  committeeTreatmentFeeWhenDebtorWaivedGross: moneyAmountSchema,
  committeeTreatmentFeeWhenDebtorWaivedNet: moneyAmountSchema,
  committeeTreatmentFeeWhenDebtorWaivedVat: moneyAmountSchema,
  appliedVatRateBasisPoints: basisPointsSchema,
});

export type PublishFinancialSettingsAmounts = z.infer<
  typeof publishFinancialSettingsGrossAmountsSchema
>;

export const financialSettingsAmountsSchema = financialSettingsLegacyAmountsSchema;

export const financialSettingsPlatformFeesSchema = z.object({
  trustAccountProcessingFeeBasisPoints: basisPointsSchema,
  committeeTransferFeeBasisPoints: basisPointsSchema,
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
  successFeeExclusions: z
    .array(
      z.enum(SUCCESS_FEE_EXCLUSIONS as [SuccessFeeExclusion, ...SuccessFeeExclusion[]]),
    )
    .min(1),
  collectionAllocationOrder: z.enum(
    COLLECTION_ALLOCATION_ORDERS as [
      CollectionAllocationOrder,
      ...CollectionAllocationOrder[],
    ],
  ),
});

export const draftFinancialSettingsContentSchema = z.object({
  currency: z.enum(CURRENCY_CODES as [CurrencyCode, ...CurrencyCode[]]),
  amountsMonetaryBasis: z
    .enum([
      AmountsMonetaryBasis.GROSS_INCLUSIVE_VAT,
      AmountsMonetaryBasis.LEGACY_NET_EXCLUSIVE_VAT,
    ])
    .optional(),
  amounts: financialSettingsDraftGrossAmountsSchema.partial().optional(),
  vatSchedule: z.array(vatScheduleEntryInputSchema).optional(),
  escalation: financialSettingsEscalationSchema.partial().optional(),
  platformFees: financialSettingsPlatformFeesSchema.partial().optional(),
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
    amounts: publishFinancialSettingsGrossAmountsSchema,
    vatSchedule: z.array(vatScheduleEntryInputSchema).min(1),
    escalation: financialSettingsEscalationSchema,
    platformFees: financialSettingsPlatformFeesSchema,
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

    const amountFields = [
      "debtorTreatmentFeeGross",
      "debtorTreatmentFeeNet",
      "debtorTreatmentFeeVat",
      "committeeTreatmentFeeWhenDebtorWaivedGross",
      "committeeTreatmentFeeWhenDebtorWaivedNet",
      "committeeTreatmentFeeWhenDebtorWaivedVat",
    ] as const;

    for (const field of amountFields) {
      if (value.amounts[field].currency !== value.currency) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Amount currency must match version currency",
          path: ["amounts", field],
        });
      }
    }

    const debtorGross = value.amounts.debtorTreatmentFeeGross.amountMinor;
    const debtorNet = value.amounts.debtorTreatmentFeeNet.amountMinor;
    const debtorVat = value.amounts.debtorTreatmentFeeVat.amountMinor;
    if (debtorNet + debtorVat !== debtorGross) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debtor treatment fee gross must equal net plus VAT",
        path: ["amounts", "debtorTreatmentFeeGross"],
      });
    }

    const committeeGross = value.amounts.committeeTreatmentFeeWhenDebtorWaivedGross.amountMinor;
    const committeeNet = value.amounts.committeeTreatmentFeeWhenDebtorWaivedNet.amountMinor;
    const committeeVat = value.amounts.committeeTreatmentFeeWhenDebtorWaivedVat.amountMinor;
    if (committeeNet + committeeVat !== committeeGross) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Committee treatment fee gross must equal net plus VAT",
        path: ["amounts", "committeeTreatmentFeeWhenDebtorWaivedGross"],
      });
    }

    if (value.escalation.calculationBase === EscalationCalculationBase.UNSPECIFIED) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Success fee calculation base must be specified before publish",
        path: ["escalation", "calculationBase"],
      });
    }
    if (value.escalation.collectionAllocationOrder === CollectionAllocationOrder.UNSPECIFIED) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Collection allocation order must be specified before publish",
        path: ["escalation", "collectionAllocationOrder"],
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
