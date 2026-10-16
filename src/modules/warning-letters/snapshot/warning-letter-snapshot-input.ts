import type { DebtCaseRecord } from "@/modules/debt-cases/domain/debt-case-record.types";
import type { WarningLetterClientPresentation } from "@/modules/warning-letters/domain/warning-letter-client-presentation";
import type { PublishedFinancialSettingsVersion } from "@/modules/financial-settings/domain/published-financial-settings-version";

export type WarningLetterBuildingInput = {
  street: string;
  houseNumber: string;
  city: string;
  clientPresentation: WarningLetterClientPresentation;
  managementCompanyLegalName: string | null;
  /** Lawyer-marked: יש בסיס להוצאות טיפול (answer Q28). */
  treatmentFeeEligible: boolean;
};

export type WarningLetterSnapshotBuildInput = {
  debtCase: DebtCaseRecord;
  building: WarningLetterBuildingInput;
  /** Required for strict operative snapshots; optional for non-operative preview when treatment not eligible. */
  financialSettings: PublishedFinancialSettingsVersion | null;
  letterDateIso: string;
  /** Stable human-readable reference printed on the letter. */
  letterCaseReference: string;
  /** When true, incomplete monetary data throws instead of preview placeholders. */
  requireOperativeMonetaryData: boolean;
  deliveryChannelLabel: string;
  paymentLinkPlaceholder: string;
  inquiriesMobileDisplay: string;
  signatoryName: string;
  barRegistrationNumber: string;
};
