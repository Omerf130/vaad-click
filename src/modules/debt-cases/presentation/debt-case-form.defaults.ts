import type { DebtCaseRecord } from "@/modules/debt-cases/domain/debt-case-record.types";
import { DebtCaseDebtType } from "@/modules/debt-cases/domain/debt-case-debt-type";
import { DebtCaseOccupancyType } from "@/modules/debt-cases/domain/debt-case-occupancy-type";
import { LegalDebtorDesignation } from "@/modules/debt-cases/domain/debt-case-parties";
import { formatMinorUnitsToNisDisplay } from "@/modules/debt-cases/presentation/debt-case-labels.he";

export type DebtCaseFormDefaults = {
  apartmentNumber: string;
  owner0FullName: string;
  owner0Mobile: string;
  owner0IdentityType: string;
  owner0IdentityNumber: string;
  owner0Email: string;
  owner1FullName: string;
  owner1Mobile: string;
  owner1IdentityType: string;
  owner1IdentityNumber: string;
  owner1Email: string;
  occupancyType: DebtCaseOccupancyType;
  legalDebtorDesignation: LegalDebtorDesignation;
  tenantFullName: string;
  tenantMobile: string;
  tenantIdentityType: string;
  tenantIdentityNumber: string;
  tenantEmail: string;
  postalAddress: string;
  debtType: DebtCaseDebtType;
  specialAssessmentDescription: string;
  principalAmountNis: string;
  periodStartMonth: string;
  periodEndMonth: string;
};

export function debtCaseRecordToFormDefaults(record: DebtCaseRecord): DebtCaseFormDefaults {
  const owners = record.parties.propertyOwners;
  const tenant = record.parties.tenant;

  return {
    apartmentNumber: record.apartmentNumberDisplay,
    owner0FullName: owners[0]?.fullName ?? "",
    owner0Mobile: owners[0]?.mobileE164?.replace("+972", "0") ?? "",
    owner0IdentityType: owners[0]?.identityDocumentType ?? "",
    owner0IdentityNumber: owners[0]?.identityNumber ?? "",
    owner0Email: owners[0]?.email ?? "",
    owner1FullName: owners[1]?.fullName ?? "",
    owner1Mobile: owners[1]?.mobileE164?.replace("+972", "0") ?? "",
    owner1IdentityType: owners[1]?.identityDocumentType ?? "",
    owner1IdentityNumber: owners[1]?.identityNumber ?? "",
    owner1Email: owners[1]?.email ?? "",
    occupancyType: record.parties.occupancyType,
    legalDebtorDesignation: record.parties.legalDebtorDesignation,
    tenantFullName: tenant?.fullName ?? "",
    tenantMobile: tenant?.mobileE164?.replace("+972", "0") ?? "",
    tenantIdentityType: tenant?.identityDocumentType ?? "",
    tenantIdentityNumber: tenant?.identityNumber ?? "",
    tenantEmail: tenant?.email ?? "",
    postalAddress: record.parties.postalAddress ?? "",
    debtType: record.debtType,
    specialAssessmentDescription: record.specialAssessmentDescription ?? "",
    principalAmountNis:
      record.principalAmountMinor > 0
        ? formatMinorUnitsToNisDisplay(record.principalAmountMinor)
        : "",
    periodStartMonth: record.periodStartMonth !== "1970-01" ? record.periodStartMonth : "",
    periodEndMonth: record.periodEndMonth !== "1970-01" ? record.periodEndMonth : "",
  };
}

export function emptyDebtCaseFormDefaults(): DebtCaseFormDefaults {
  return {
    apartmentNumber: "",
    owner0FullName: "",
    owner0Mobile: "",
    owner0IdentityType: "",
    owner0IdentityNumber: "",
    owner0Email: "",
    owner1FullName: "",
    owner1Mobile: "",
    owner1IdentityType: "",
    owner1IdentityNumber: "",
    owner1Email: "",
    occupancyType: DebtCaseOccupancyType.OWNER,
    legalDebtorDesignation: LegalDebtorDesignation.PROPERTY_OWNERS,
    tenantFullName: "",
    tenantMobile: "",
    tenantIdentityType: "",
    tenantIdentityNumber: "",
    tenantEmail: "",
    postalAddress: "",
    debtType: DebtCaseDebtType.REGULAR_VAAD,
    specialAssessmentDescription: "",
    principalAmountNis: "",
    periodStartMonth: "",
    periodEndMonth: "",
  };
}
