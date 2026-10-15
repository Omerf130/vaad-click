import { z } from "zod";

import { normalizeApartmentIdentifier } from "@/modules/debt-cases/domain/apartment-identifier";
import { DEBT_CASE_DEBT_TYPES, DebtCaseDebtType } from "@/modules/debt-cases/domain/debt-case-debt-type";
import {
  DebtCaseIdentityDocumentType,
  validateOptionalIdentityDocument,
} from "@/modules/debt-cases/domain/debt-case-identity-document";
import { DEBT_CASE_OCCUPANCY_TYPES, DebtCaseOccupancyType } from "@/modules/debt-cases/domain/debt-case-occupancy-type";
import {
  assertLegalDebtorDesignationConsistent,
  LegalDebtorDesignation,
} from "@/modules/debt-cases/domain/debt-case-parties";
import type { DebtCasePartyStructure, PropertyOwnerParty, TenantParty } from "@/modules/debt-cases/domain/debt-case-parties";
import {
  isValidE164Mobile,
  normalizeMobileToE164,
} from "@/modules/debt-cases/domain/debt-case-phone";
import {
  assertValidDebtPeriodRange,
  parseDebtPeriodMonth,
  type DebtPeriodMonth,
} from "@/modules/debt-cases/domain/debt-period";

const debtPeriodMonthSchema = z
  .string()
  .trim()
  .refine((v) => parseDebtPeriodMonth(v) != null, {
    message: "תקופה חייבת להיות בפורמט YYYY-MM",
  })
  .transform((v) => parseDebtPeriodMonth(v) as DebtPeriodMonth);

const optionalTrimmedString = z.string().trim().optional().nullable();

const identityDocumentTypeSchema = z.enum(
  Object.values(DebtCaseIdentityDocumentType) as [
    DebtCaseIdentityDocumentType,
    ...DebtCaseIdentityDocumentType[],
  ],
);

function refineMobileToE164(value: string, ctx: z.RefinementCtx, path: (string | number)[]): string | null {
  const normalized = normalizeMobileToE164(value);
  if (!normalized || !isValidE164Mobile(normalized)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "מספר נייד לא תקין",
      path,
    });
    return null;
  }
  return normalized;
}

function refineOptionalIdentity(
  data: {
    identityDocumentType?: DebtCaseIdentityDocumentType | null;
    identityNumber?: string | null;
  },
  ctx: z.RefinementCtx,
  pathPrefix: (string | number)[],
): void {
  const result = validateOptionalIdentityDocument({
    documentType: data.identityDocumentType,
    documentNumber: data.identityNumber,
  });
  if (!result.ok) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "מסמך זיהוי לא תקין",
      path: [...pathPrefix, "identityNumber"],
    });
  }
}

const propertyOwnerInputSchema = z.object({
  fullName: optionalTrimmedString,
  identityDocumentType: identityDocumentTypeSchema.optional().nullable(),
  identityNumber: optionalTrimmedString,
  mobile: optionalTrimmedString,
  email: z.string().trim().email("דוא\"ל לא תקין").optional().nullable().or(z.literal("")),
});

const propertyOwnerSubmitSchema = z.object({
  fullName: z.string().trim().min(1, "נדרש שם בעלים"),
  identityDocumentType: identityDocumentTypeSchema.optional().nullable(),
  identityNumber: optionalTrimmedString,
  mobile: optionalTrimmedString,
  email: z.string().trim().email("דוא\"ל לא תקין").optional().nullable().or(z.literal("")),
});

const tenantInputSchema = z.object({
  fullName: optionalTrimmedString,
  identityDocumentType: identityDocumentTypeSchema.optional().nullable(),
  identityNumber: optionalTrimmedString,
  mobile: optionalTrimmedString,
  email: z.string().trim().email("דוא\"ל לא תקין").optional().nullable().or(z.literal("")),
});

const tenantSubmitSchema = z.object({
  fullName: z.string().trim().min(1, "נדרש שם שוכר"),
  identityDocumentType: identityDocumentTypeSchema.optional().nullable(),
  identityNumber: optionalTrimmedString,
  mobile: z.string().trim().min(1, "נדרש נייד שוכר"),
  email: z.string().trim().email("דוא\"ל לא תקין").optional().nullable().or(z.literal("")),
});

const debtCaseDraftInputSchemaBase = z.object({
  buildingId: z.string().uuid(),
  apartmentNumber: z.string().trim(),
  propertyOwners: z.array(propertyOwnerInputSchema).max(2).optional().nullable(),
  occupancyType: z
    .enum(DEBT_CASE_OCCUPANCY_TYPES as [DebtCaseOccupancyType, ...DebtCaseOccupancyType[]])
    .optional()
    .nullable(),
  legalDebtorDesignation: z
    .enum(Object.values(LegalDebtorDesignation) as [LegalDebtorDesignation, ...LegalDebtorDesignation[]])
    .optional()
    .nullable(),
  tenant: tenantInputSchema.optional().nullable(),
  postalAddress: optionalTrimmedString,
  debtType: z
    .enum(DEBT_CASE_DEBT_TYPES as [DebtCaseDebtType, ...DebtCaseDebtType[]])
    .optional()
    .nullable(),
  specialAssessmentDescription: optionalTrimmedString,
  principalAmountMinor: z.coerce.number().int().nonnegative().optional().nullable(),
  periodStartMonth: z.string().trim().optional().nullable(),
  periodEndMonth: z.string().trim().optional().nullable(),
  predecessorDebtCaseId: z.string().uuid().optional().nullable(),
});

export const debtCaseDraftInputSchema = debtCaseDraftInputSchemaBase.superRefine((data, ctx) => {
  if (data.propertyOwners) {
    data.propertyOwners.forEach((owner, index) => {
      refineOptionalIdentity(owner, ctx, ["propertyOwners", index]);
    });
  }
  if (data.tenant) {
    refineOptionalIdentity(data.tenant, ctx, ["tenant"]);
  }

  if (data.periodStartMonth && data.periodEndMonth) {
    const start = parseDebtPeriodMonth(data.periodStartMonth);
    const end = parseDebtPeriodMonth(data.periodEndMonth);
    if (start && end) {
      try {
        assertValidDebtPeriodRange({ periodStartMonth: start, periodEndMonth: end });
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "תחילת התקופה חייבת להיות לפני סיומה",
          path: ["periodStartMonth"],
        });
      }
    }
  }

  if (
    data.debtType === DebtCaseDebtType.SPECIAL_ASSESSMENT &&
    data.specialAssessmentDescription?.trim() === ""
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "נדרש תיאור לחיוב מיוחד",
      path: ["specialAssessmentDescription"],
    });
  }
});

export type DebtCaseDraftInput = z.infer<typeof debtCaseDraftInputSchema>;

export const debtCaseSubmitInputSchema = debtCaseDraftInputSchemaBase
  .extend({
    apartmentNumber: z.string().trim().min(1, "נדרש מספר דירה"),
    propertyOwners: z
      .array(propertyOwnerSubmitSchema)
      .min(1, "נדרש לפחות בעלים אחד")
      .max(2, "ניתן להזין לכל היותר שני בעלי דירה"),
    occupancyType: z.enum(
      DEBT_CASE_OCCUPANCY_TYPES as [DebtCaseOccupancyType, ...DebtCaseOccupancyType[]],
    ),
    legalDebtorDesignation: z.enum(
      Object.values(LegalDebtorDesignation) as [
        LegalDebtorDesignation,
        ...LegalDebtorDesignation[],
      ],
    ),
    debtType: z.enum(DEBT_CASE_DEBT_TYPES as [DebtCaseDebtType, ...DebtCaseDebtType[]]),
    principalAmountMinor: z.coerce.number().int().positive("סכום החוב חייב להיות חיובי"),
    periodStartMonth: debtPeriodMonthSchema,
    periodEndMonth: debtPeriodMonthSchema,
    tenant: tenantSubmitSchema.nullable().optional(),
  })
  .superRefine((data, ctx) => {
    data.propertyOwners.forEach((owner, index) => {
      refineOptionalIdentity(owner, ctx, ["propertyOwners", index]);
    });

    if (data.occupancyType === DebtCaseOccupancyType.OWNER) {
      if (data.legalDebtorDesignation !== LegalDebtorDesignation.PROPERTY_OWNERS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "בבעלות ישירה החייב המשפטי הוא בעלי הדירה",
          path: ["legalDebtorDesignation"],
        });
      }
      if (data.tenant) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "לא ניתן לציין שוכר כאשר הדירה מסומנת כבעלות",
          path: ["tenant"],
        });
      }
      const hasOwnerMobile = data.propertyOwners.some((o) => o.mobile?.trim());
      if (!hasOwnerMobile) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "נדרש נייד לפחות לבעל דירה אחד",
          path: ["propertyOwners"],
        });
      }
      data.propertyOwners.forEach((owner, index) => {
        if (owner.mobile?.trim()) {
          refineMobileToE164(owner.mobile, ctx, ["propertyOwners", index, "mobile"]);
        }
      });
    }

    if (data.occupancyType === DebtCaseOccupancyType.TENANT) {
      if (!data.tenant) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "נדרשים פרטי שוכר",
          path: ["tenant"],
        });
      } else {
        refineOptionalIdentity(data.tenant, ctx, ["tenant"]);
        const tenantMobile = data.tenant.mobile.trim();
        if (!tenantMobile) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "נדרש נייד שוכר",
            path: ["tenant", "mobile"],
          });
        } else {
          refineMobileToE164(tenantMobile, ctx, ["tenant", "mobile"]);
        }
      }
      const hasOwnerMobile = data.propertyOwners.some((o) => o.mobile?.trim());
      if (!hasOwnerMobile) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "נדרש נייד לפחות לבעל דירה אחד (למען המכתב)",
          path: ["propertyOwners"],
        });
      }
      data.propertyOwners.forEach((owner, index) => {
        if (owner.mobile?.trim()) {
          refineMobileToE164(owner.mobile, ctx, ["propertyOwners", index, "mobile"]);
        }
      });
    }

    if (data.debtType === DebtCaseDebtType.SPECIAL_ASSESSMENT) {
      if (!data.specialAssessmentDescription?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "נדרש תיאור לחיוב מיוחד",
          path: ["specialAssessmentDescription"],
        });
      }
    }

    try {
      assertValidDebtPeriodRange({
        periodStartMonth: data.periodStartMonth,
        periodEndMonth: data.periodEndMonth,
      });
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "תחילת התקופה חייבת להיות לפני סיומה",
        path: ["periodStartMonth"],
      });
    }
  });

export type DebtCaseSubmitInput = z.infer<typeof debtCaseSubmitInputSchema>;

export type ParsedDebtCaseApartment = ReturnType<typeof normalizeApartmentIdentifier>;

export function parseApartmentFromDraftInput(apartmentNumber: string): ParsedDebtCaseApartment {
  return normalizeApartmentIdentifier(apartmentNumber);
}

function mapOwnerInputToParty(
  owner: z.infer<typeof propertyOwnerSubmitSchema>,
): PropertyOwnerParty {
  const mobileE164 = owner.mobile?.trim() ? normalizeMobileToE164(owner.mobile) : null;
  const identity = validateOptionalIdentityDocument({
    documentType: owner.identityDocumentType,
    documentNumber: owner.identityNumber,
  });
  return {
    fullName: owner.fullName,
    identityDocumentType: identity.documentType,
    identityNumber: identity.normalized,
    mobileE164,
    email: owner.email?.trim() ? owner.email.trim() : null,
  };
}

function mapTenantInputToParty(tenant: z.infer<typeof tenantSubmitSchema>): TenantParty {
  const mobileE164 = normalizeMobileToE164(tenant.mobile);
  if (!mobileE164) {
    throw new Error("tenant mobile normalization failed after schema validation");
  }
  const identity = validateOptionalIdentityDocument({
    documentType: tenant.identityDocumentType,
    documentNumber: tenant.identityNumber,
  });
  return {
    fullName: tenant.fullName,
    identityDocumentType: identity.documentType,
    identityNumber: identity.normalized,
    mobileE164,
    email: tenant.email?.trim() ? tenant.email.trim() : null,
  };
}

/** Maps validated submit input to domain party structure. */
export function mapSubmitInputToPartyStructure(input: DebtCaseSubmitInput): DebtCasePartyStructure {
  const propertyOwners = input.propertyOwners.map(mapOwnerInputToParty);
  const tenant =
    input.occupancyType === DebtCaseOccupancyType.TENANT && input.tenant
      ? mapTenantInputToParty(input.tenant)
      : null;

  const parties: DebtCasePartyStructure = {
    propertyOwners,
    occupancyType: input.occupancyType,
    legalDebtorDesignation: input.legalDebtorDesignation,
    tenant,
    postalAddress: input.postalAddress?.trim() ? input.postalAddress.trim() : null,
  };

  if (!assertLegalDebtorDesignationConsistent(parties)) {
    throw new Error("legal debtor designation inconsistent with occupancy");
  }

  return parties;
}
