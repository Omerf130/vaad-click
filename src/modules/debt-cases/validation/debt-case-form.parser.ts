import { DebtCaseIdentityDocumentType } from "@/modules/debt-cases/domain/debt-case-identity-document";
import { DebtCaseOccupancyType } from "@/modules/debt-cases/domain/debt-case-occupancy-type";
import { LegalDebtorDesignation } from "@/modules/debt-cases/domain/debt-case-parties";
import { DebtCaseDebtType } from "@/modules/debt-cases/domain/debt-case-debt-type";
import { parseNisInputToMinorUnits } from "@/modules/debt-cases/presentation/debt-case-labels.he";

function readString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function readOptionalIdentityType(raw: string): DebtCaseIdentityDocumentType | null {
  if (raw === DebtCaseIdentityDocumentType.ISRAELI_ID) {
    return DebtCaseIdentityDocumentType.ISRAELI_ID;
  }
  if (raw === DebtCaseIdentityDocumentType.COMPANY_HP) {
    return DebtCaseIdentityDocumentType.COMPANY_HP;
  }
  return null;
}

function parseOwner(formData: FormData, index: 0 | 1) {
  const prefix = `propertyOwners.${index}`;
  const fullName = readString(formData, `${prefix}.fullName`);
  const mobile = readString(formData, `${prefix}.mobile`);
  const identityNumber = readString(formData, `${prefix}.identityNumber`);
  const identityDocumentType = readOptionalIdentityType(
    readString(formData, `${prefix}.identityDocumentType`),
  );
  const email = readString(formData, `${prefix}.email`);
  if (!fullName && !mobile && !identityNumber && !email) {
    return null;
  }
  return {
    fullName: fullName || null,
    mobile: mobile || null,
    identityNumber: identityNumber || null,
    identityDocumentType,
    email: email || null,
  };
}

export function parseDebtCaseFormDataToDraftPayload(input: {
  formData: FormData;
  buildingId: string;
}) {
  const owner0 = parseOwner(input.formData, 0);
  const owner1 = parseOwner(input.formData, 1);
  const propertyOwners = [owner0, owner1].filter(Boolean);

  const occupancyRaw = readString(input.formData, "occupancyType");
  const occupancyType =
    occupancyRaw === DebtCaseOccupancyType.TENANT
      ? DebtCaseOccupancyType.TENANT
      : occupancyRaw === DebtCaseOccupancyType.OWNER
        ? DebtCaseOccupancyType.OWNER
        : null;

  const legalRaw = readString(input.formData, "legalDebtorDesignation");
  const legalDebtorDesignation =
    legalRaw === LegalDebtorDesignation.TENANT
      ? LegalDebtorDesignation.TENANT
      : legalRaw === LegalDebtorDesignation.PROPERTY_OWNERS
        ? LegalDebtorDesignation.PROPERTY_OWNERS
        : null;

  const tenantFullName = readString(input.formData, "tenant.fullName");
  const tenantMobile = readString(input.formData, "tenant.mobile");
  const tenant =
    tenantFullName || tenantMobile
      ? {
          fullName: tenantFullName || null,
          mobile: tenantMobile || null,
          identityNumber: readString(input.formData, "tenant.identityNumber") || null,
          identityDocumentType: readOptionalIdentityType(
            readString(input.formData, "tenant.identityDocumentType"),
          ),
          email: readString(input.formData, "tenant.email") || null,
        }
      : null;

  const debtTypeRaw = readString(input.formData, "debtType");
  const debtType =
    debtTypeRaw === DebtCaseDebtType.SPECIAL_ASSESSMENT
      ? DebtCaseDebtType.SPECIAL_ASSESSMENT
      : debtTypeRaw === DebtCaseDebtType.REGULAR_VAAD
        ? DebtCaseDebtType.REGULAR_VAAD
        : null;

  const principalNis = readString(input.formData, "principalAmountNis");
  const principalMinor = parseNisInputToMinorUnits(principalNis);

  return {
    buildingId: input.buildingId,
    apartmentNumber: readString(input.formData, "apartmentNumber"),
    propertyOwners: propertyOwners.length > 0 ? propertyOwners : undefined,
    occupancyType,
    legalDebtorDesignation,
    tenant,
    postalAddress: readString(input.formData, "postalAddress") || null,
    debtType,
    specialAssessmentDescription:
      readString(input.formData, "specialAssessmentDescription") || null,
    principalAmountMinor: principalMinor,
    periodStartMonth: readString(input.formData, "periodStartMonth") || null,
    periodEndMonth: readString(input.formData, "periodEndMonth") || null,
    predecessorDebtCaseId: readString(input.formData, "predecessorDebtCaseId") || null,
  };
}

export function parseDebtCaseFormDataToSubmitPayload(input: {
  formData: FormData;
  buildingId: string;
}) {
  const draft = parseDebtCaseFormDataToDraftPayload(input);
  const owner0 = parseOwner(input.formData, 0);
  const owner1 = parseOwner(input.formData, 1);
  const propertyOwners = [owner0, owner1].filter(
    (owner): owner is NonNullable<typeof owner0> => owner != null && Boolean(owner.fullName),
  );

  return {
    ...draft,
    propertyOwners: propertyOwners.map((owner) => ({
      fullName: owner.fullName ?? "",
      mobile: owner.mobile,
      identityDocumentType: owner.identityDocumentType,
      identityNumber: owner.identityNumber,
      email: owner.email,
    })),
    principalAmountMinor: draft.principalAmountMinor ?? undefined,
  };
}
