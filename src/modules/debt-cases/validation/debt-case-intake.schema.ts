import { z } from "zod";

import { WarningLetterPlatformFeePaymentPreference } from "@/modules/debt-cases/domain/warning-letter-platform-fee-payment-preference";
import { buildingAddressSchema } from "@/modules/buildings/validation/building.schema";
import {
  debtCaseIntakeCaseDraftFieldsSchema,
  debtCaseIntakeCaseDraftSaveSchema,
} from "@/modules/debt-cases/validation/debt-case.schema";

/** Draft saves: empty strings are treated as unset; max lengths still enforced when non-empty. */
function optionalDraftString(max: number) {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(max).optional(),
  );
}

const intakeBuildingAddressDraftSaveSchema = z.object({
  city: optionalDraftString(120),
  street: optionalDraftString(200),
  houseNumber: optionalDraftString(32),
  postalCode: optionalDraftString(16),
});

export const intakeBuildingNewSchema = z.object({
  mode: z.literal("new"),
  displayName: z.string().trim().min(1, "יש להזין שם בניין").max(200),
  address: buildingAddressSchema,
});

export const intakeBuildingExistingSchema = z.object({
  mode: z.literal("existing"),
  buildingId: z.string().uuid("מזהה בניין לא תקין"),
});

export const intakeBuildingSchema = z.discriminatedUnion("mode", [
  intakeBuildingNewSchema,
  intakeBuildingExistingSchema,
]);

const intakeBuildingDraftSaveSchema = z.discriminatedUnion("mode", [
  intakeBuildingExistingSchema,
  z.object({
    mode: z.literal("new"),
    displayName: optionalDraftString(200),
    address: intakeBuildingAddressDraftSaveSchema.optional(),
  }),
]);

const platformFeePreferenceDraftSchema = z
  .enum(
    Object.values(WarningLetterPlatformFeePaymentPreference) as [
      WarningLetterPlatformFeePaymentPreference,
      ...WarningLetterPlatformFeePaymentPreference[],
    ],
  )
  .optional()
  .nullable();

const platformFeePreferenceSubmitSchema = z.enum(
  Object.values(WarningLetterPlatformFeePaymentPreference) as [
    WarningLetterPlatformFeePaymentPreference,
    ...WarningLetterPlatformFeePaymentPreference[],
  ],
  { message: "יש לבחור אופן תשלום עבור מכתב ההתראה" },
);

export const debtCaseIntakeDraftSaveSchema = z.object({
  intakeDraftId: z.string().uuid().optional().nullable(),
  expectedRevision: z.coerce.number().int().nonnegative().optional().nullable(),
  building: intakeBuildingDraftSaveSchema,
  caseDraft: debtCaseIntakeCaseDraftSaveSchema,
  platformFeePreference: platformFeePreferenceDraftSchema,
});

export const debtCaseIntakeSubmitSchema = z.object({
  intakeDraftId: z.string().uuid(),
  expectedRevision: z.coerce.number().int().nonnegative(),
  submitIdempotencyKey: z.string().trim().min(8).max(128),
  building: intakeBuildingSchema,
  caseDraft: debtCaseIntakeCaseDraftFieldsSchema,
  platformFeePreference: platformFeePreferenceSubmitSchema,
});

export type DebtCaseIntakeDraftSaveInput = z.infer<typeof debtCaseIntakeDraftSaveSchema>;
export type DebtCaseIntakeSubmitInput = z.infer<typeof debtCaseIntakeSubmitSchema>;
