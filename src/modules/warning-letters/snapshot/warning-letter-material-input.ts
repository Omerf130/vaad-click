import { createHash } from "node:crypto";

import type { DebtCaseRecord } from "@/modules/debt-cases/domain/debt-case-record.types";
import type { WarningLetterClientPresentation } from "@/modules/warning-letters/domain/warning-letter-client-presentation";

export type WarningLetterBuildingMaterialContext = {
  street: string;
  houseNumber: string;
  city: string;
  clientPresentation: WarningLetterClientPresentation;
  managementCompanyLegalName: string | null;
  treatmentFeeEligible: boolean;
};

export type WarningLetterMaterialInputs = {
  apartmentKeyNormalized: string;
  apartmentNumberDisplay: string;
  buildingAddressKey: string;
  clientPresentation: WarningLetterClientPresentation;
  managementCompanyLegalName: string | null;
  treatmentFeeEligible: boolean;
  principalAmountMinor: number;
  periodStartMonth: string;
  periodEndMonth: string;
  settingsVersionId: string | null;
  debtType: string;
  partiesCanonicalJson: string;
};

function normalizePart(value: string): string {
  return value.trim().toLowerCase();
}

function buildBuildingAddressKey(building: WarningLetterBuildingMaterialContext): string {
  return [
    normalizePart(building.street),
    normalizePart(building.houseNumber),
    normalizePart(building.city),
  ].join("|");
}

function buildPartiesCanonicalJson(debtCase: DebtCaseRecord): string {
  const { parties } = debtCase;
  return JSON.stringify({
    occupancyType: parties.occupancyType,
    legalDebtorDesignation: parties.legalDebtorDesignation,
    postalAddress: parties.postalAddress?.trim() ?? null,
    propertyOwners: parties.propertyOwners.map((o) => ({
      fullName: o.fullName.trim(),
      identityDocumentType: o.identityDocumentType,
      identityNumber: o.identityNumber?.trim() ?? null,
      mobileE164: o.mobileE164?.trim() ?? null,
      email: o.email?.trim() ?? null,
    })),
    tenant: parties.tenant
      ? {
          fullName: parties.tenant.fullName.trim(),
          identityDocumentType: parties.tenant.identityDocumentType,
          identityNumber: parties.tenant.identityNumber?.trim() ?? null,
          mobileE164: parties.tenant.mobileE164.trim(),
          email: parties.tenant.email?.trim() ?? null,
        }
      : null,
  });
}

export function buildWarningLetterMaterialInputs(input: {
  debtCase: DebtCaseRecord;
  building: WarningLetterBuildingMaterialContext;
  settingsVersionId: string | null;
}): WarningLetterMaterialInputs {
  const { debtCase, building } = input;
  return {
    apartmentKeyNormalized: debtCase.apartmentKeyNormalized ?? "",
    apartmentNumberDisplay: debtCase.apartmentNumberDisplay?.trim() ?? "",
    buildingAddressKey: buildBuildingAddressKey(building),
    clientPresentation: building.clientPresentation,
    managementCompanyLegalName: building.managementCompanyLegalName?.trim() ?? null,
    treatmentFeeEligible: building.treatmentFeeEligible,
    principalAmountMinor: debtCase.principalAmountMinor,
    periodStartMonth: debtCase.periodStartMonth ?? "",
    periodEndMonth: debtCase.periodEndMonth ?? "",
    settingsVersionId: input.settingsVersionId,
    debtType: debtCase.debtType,
    partiesCanonicalJson: buildPartiesCanonicalJson(debtCase),
  };
}

export function computeWarningLetterMaterialInputsSha256(
  material: WarningLetterMaterialInputs,
): string {
  const canonical = JSON.stringify(material);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
