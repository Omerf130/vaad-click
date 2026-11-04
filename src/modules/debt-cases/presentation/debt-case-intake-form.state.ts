import type { WarningLetterPlatformFeePaymentPreference } from "@/modules/debt-cases/domain/warning-letter-platform-fee-payment-preference";
import { DebtCaseDebtType } from "@/modules/debt-cases/domain/debt-case-debt-type";
import { DebtCaseIdentityDocumentType } from "@/modules/debt-cases/domain/debt-case-identity-document";
import { DebtCaseOccupancyType } from "@/modules/debt-cases/domain/debt-case-occupancy-type";
import { LegalDebtorDesignation } from "@/modules/debt-cases/domain/debt-case-parties";
import {
  emptyDebtCaseFormDefaults,
  type DebtCaseFormDefaults,
} from "@/modules/debt-cases/presentation/debt-case-form.defaults";
import {
  formatMinorUnitsToNisDisplay,
  parseNisInputToMinorUnits,
} from "@/modules/debt-cases/presentation/debt-case-labels.he";

export const INTAKE_WIZARD_STEPS = [
  { id: 0, label: "פרטי הבניין" },
  { id: 1, label: "פרטי החייב" },
  { id: 2, label: "פרטי החוב" },
  { id: 3, label: "מסמכים מצורפים" },
  { id: 4, label: "אופן תשלום" },
  { id: 5, label: "בדיקה ושליחה" },
] as const;

export type IntakeWizardStepId = (typeof INTAKE_WIZARD_STEPS)[number]["id"];

export const INTAKE_WIZARD_STEP_COUNT = INTAKE_WIZARD_STEPS.length;

export function nextIntakeWizardStep(current: IntakeWizardStepId): IntakeWizardStepId {
  return Math.min(current + 1, INTAKE_WIZARD_STEP_COUNT - 1) as IntakeWizardStepId;
}

export function prevIntakeWizardStep(current: IntakeWizardStepId): IntakeWizardStepId {
  return Math.max(current - 1, 0) as IntakeWizardStepId;
}

export type IntakeBuildingFormState = {
  displayName: string;
  city: string;
  street: string;
  houseNumber: string;
  postalCode: string;
};

export function emptyIntakeBuildingFormState(): IntakeBuildingFormState {
  return {
    displayName: "",
    city: "",
    street: "",
    houseNumber: "",
    postalCode: "",
  };
}

export function intakeBuildingFromSnapshot(snapshot?: {
  displayName?: string;
  city?: string;
  street?: string;
  houseNumber?: string;
  postalCode?: string | null;
}): IntakeBuildingFormState {
  return {
    displayName: snapshot?.displayName ?? "",
    city: snapshot?.city ?? "",
    street: snapshot?.street ?? "",
    houseNumber: snapshot?.houseNumber ?? "",
    postalCode: snapshot?.postalCode ?? "",
  };
}

function readOwnerFromJson(
  owner: Record<string, unknown> | undefined,
  index: 0 | 1,
): Partial<DebtCaseFormDefaults> {
  if (!owner) {
    return {};
  }
  const prefix = index === 0 ? "owner0" : "owner1";
  return {
    [`${prefix}FullName`]: String(owner.fullName ?? ""),
    [`${prefix}Mobile`]: String(owner.mobile ?? ""),
    [`${prefix}IdentityType`]: String(owner.identityDocumentType ?? ""),
    [`${prefix}IdentityNumber`]: String(owner.identityNumber ?? ""),
    [`${prefix}Email`]: String(owner.email ?? ""),
  } as Partial<DebtCaseFormDefaults>;
}

export function caseDraftJsonToFormDefaults(json: Record<string, unknown>): DebtCaseFormDefaults {
  const defaults = emptyDebtCaseFormDefaults();
  if (typeof json.apartmentNumber === "string") {
    defaults.apartmentNumber = json.apartmentNumber;
  }
  if (Array.isArray(json.propertyOwners)) {
    Object.assign(defaults, readOwnerFromJson(json.propertyOwners[0] as Record<string, unknown>, 0));
    Object.assign(defaults, readOwnerFromJson(json.propertyOwners[1] as Record<string, unknown>, 1));
  }
  if (json.occupancyType === DebtCaseOccupancyType.TENANT || json.occupancyType === "tenant") {
    defaults.occupancyType = DebtCaseOccupancyType.TENANT;
  }
  if (json.occupancyType === DebtCaseOccupancyType.OWNER || json.occupancyType === "owner") {
    defaults.occupancyType = DebtCaseOccupancyType.OWNER;
  }
  if (
    json.legalDebtorDesignation === LegalDebtorDesignation.TENANT ||
    json.legalDebtorDesignation === "tenant"
  ) {
    defaults.legalDebtorDesignation = LegalDebtorDesignation.TENANT;
  }
  if (
    json.legalDebtorDesignation === LegalDebtorDesignation.PROPERTY_OWNERS ||
    json.legalDebtorDesignation === "property_owners"
  ) {
    defaults.legalDebtorDesignation = LegalDebtorDesignation.PROPERTY_OWNERS;
  }
  const tenant = json.tenant as Record<string, unknown> | null | undefined;
  if (tenant && typeof tenant === "object") {
    defaults.tenantFullName = String(tenant.fullName ?? "");
    defaults.tenantMobile = String(tenant.mobile ?? "");
    defaults.tenantIdentityType = String(tenant.identityDocumentType ?? "");
    defaults.tenantIdentityNumber = String(tenant.identityNumber ?? "");
    defaults.tenantEmail = String(tenant.email ?? "");
  }
  if (typeof json.postalAddress === "string") {
    defaults.postalAddress = json.postalAddress;
  }
  if (json.debtType === DebtCaseDebtType.SPECIAL_ASSESSMENT || json.debtType === "special_assessment") {
    defaults.debtType = DebtCaseDebtType.SPECIAL_ASSESSMENT;
  }
  if (json.debtType === DebtCaseDebtType.REGULAR_VAAD || json.debtType === "regular_vaad") {
    defaults.debtType = DebtCaseDebtType.REGULAR_VAAD;
  }
  if (typeof json.specialAssessmentDescription === "string") {
    defaults.specialAssessmentDescription = json.specialAssessmentDescription;
  }
  if (typeof json.periodStartMonth === "string") {
    defaults.periodStartMonth = json.periodStartMonth;
  }
  if (typeof json.periodEndMonth === "string") {
    defaults.periodEndMonth = json.periodEndMonth;
  }
  if (typeof json.principalAmountMinor === "number" && json.principalAmountMinor > 0) {
    defaults.principalAmountNis = formatMinorUnitsToNisDisplay(json.principalAmountMinor);
  }
  return defaults;
}

function optionalIdentityType(raw: string): DebtCaseIdentityDocumentType | null | undefined {
  if (raw === DebtCaseIdentityDocumentType.ISRAELI_ID) {
    return DebtCaseIdentityDocumentType.ISRAELI_ID;
  }
  if (raw === DebtCaseIdentityDocumentType.COMPANY_HP) {
    return DebtCaseIdentityDocumentType.COMPANY_HP;
  }
  if (!raw.trim()) {
    return undefined;
  }
  return null;
}

function ownerPayload(
  fullName: string,
  mobile: string,
  identityType: string,
  identityNumber: string,
  email: string,
) {
  if (!fullName.trim() && !mobile.trim() && !identityNumber.trim() && !email.trim()) {
    return null;
  }
  return {
    fullName: fullName.trim() || undefined,
    mobile: mobile.trim() || undefined,
    identityDocumentType: optionalIdentityType(identityType),
    identityNumber: identityNumber.trim() || undefined,
    email: email.trim() || undefined,
  };
}

export function buildCaseDraftPayloadFromFormValues(form: DebtCaseFormDefaults): Record<string, unknown> {
  const owners = [
    ownerPayload(
      form.owner0FullName,
      form.owner0Mobile,
      form.owner0IdentityType,
      form.owner0IdentityNumber,
      form.owner0Email,
    ),
    ownerPayload(
      form.owner1FullName,
      form.owner1Mobile,
      form.owner1IdentityType,
      form.owner1IdentityNumber,
      form.owner1Email,
    ),
  ].filter(Boolean);

  const tenant =
    form.tenantFullName.trim() || form.tenantMobile.trim()
      ? {
          fullName: form.tenantFullName.trim() || undefined,
          mobile: form.tenantMobile.trim() || undefined,
          identityDocumentType: optionalIdentityType(form.tenantIdentityType),
          identityNumber: form.tenantIdentityNumber.trim() || undefined,
          email: form.tenantEmail.trim() || undefined,
        }
      : undefined;

  const principalMinor = parseNisInputToMinorUnits(form.principalAmountNis);

  return {
    apartmentNumber: form.apartmentNumber.trim() || undefined,
    propertyOwners: owners.length > 0 ? owners : undefined,
    occupancyType: form.occupancyType,
    legalDebtorDesignation: form.legalDebtorDesignation,
    tenant,
    postalAddress: form.postalAddress.trim() || undefined,
    debtType: form.debtType,
    specialAssessmentDescription: form.specialAssessmentDescription.trim() || undefined,
    principalAmountMinor: principalMinor ?? undefined,
    periodStartMonth: form.periodStartMonth.trim() || undefined,
    periodEndMonth: form.periodEndMonth.trim() || undefined,
  };
}

export type IntakeSavePayloadInput = {
  intakeDraftId?: string;
  expectedRevision: number;
  lockedBuilding: boolean;
  buildingMode: "new" | "existing";
  existingBuildingId: string;
  buildingFields: IntakeBuildingFormState;
  caseForm: DebtCaseFormDefaults;
  platformFeePreference: WarningLetterPlatformFeePaymentPreference | null;
};

export function buildIntakeSavePayload(input: IntakeSavePayloadInput): Record<string, unknown> {
  const building = input.lockedBuilding || input.buildingMode === "existing"
    ? { mode: "existing" as const, buildingId: input.existingBuildingId }
    : {
        mode: "new" as const,
        displayName: input.buildingFields.displayName,
        address: {
          city: input.buildingFields.city,
          street: input.buildingFields.street,
          houseNumber: input.buildingFields.houseNumber,
          postalCode: input.buildingFields.postalCode.trim() || undefined,
        },
      };

  return {
    intakeDraftId: input.intakeDraftId || undefined,
    expectedRevision: input.expectedRevision,
    building,
    caseDraft: buildCaseDraftPayloadFromFormValues(input.caseForm),
    platformFeePreference: input.platformFeePreference ?? undefined,
  };
}

export function buildIntakeSubmitPayload(
  input: IntakeSavePayloadInput & { submitIdempotencyKey: string; intakeDraftId: string },
): Record<string, unknown> {
  return {
    ...buildIntakeSavePayload(input),
    intakeDraftId: input.intakeDraftId,
    submitIdempotencyKey: input.submitIdempotencyKey,
  };
}
