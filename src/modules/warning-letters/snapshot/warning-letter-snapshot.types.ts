import type { WarningLetterClientPresentation } from "@/modules/warning-letters/domain/warning-letter-client-presentation";
import type { WarningLetterMonetaryCompleteness } from "@/modules/warning-letters/domain/warning-letter-monetary-completeness";
import type { WarningLetterType } from "@/modules/warning-letters/domain/warning-letter-type";
import type { InitialWarningClauseId } from "@/modules/warning-letters/templates/initial-warning-clause-manifest";
import type { LetterRecipient } from "@/modules/debt-cases/domain/debt-case-parties";

export type WarningLetterFinancialSnapshot = {
  settingsVersionId: string | null;
  monetaryCompleteness: WarningLetterMonetaryCompleteness;
  principalAmountMinor: number;
  treatmentFeeEligible: boolean;
  treatmentFeeGrossMinor: number | null;
  treatmentFeeNetMinor: number | null;
  treatmentFeeVatMinor: number | null;
  totalDueMinor: number | null;
};

export type WarningLetterRenderedClause = {
  clauseId: InitialWarningClauseId;
  displayNumber: number;
  body: string;
};

export type WarningLetterContentSnapshot = {
  letterType: WarningLetterType;
  templateVersionId: string;
  /** Stable human-readable reference shown on the letter (not the internal debt-case UUID). */
  letterCaseReference: string;
  letterDateIso: string;
  printedDeadlineDateIso: string;
  clientPresentation: WarningLetterClientPresentation;
  deliveryChannelLabel: string;
  subjectLine: string;
  introductionParagraph: string;
  addresseeLines: string[];
  apartmentAddressLine: string;
  debtorNamesLine: string;
  debtMonthsCount: number;
  settingsVersionId: string | null;
  monetaryCompleteness: WarningLetterMonetaryCompleteness;
  /** False for incomplete preview snapshots (not approvable/dispatchable). */
  isOperativeSnapshot: boolean;
  /** Hebrew explanation when preview is incomplete; null when complete. */
  previewWarningHe: string | null;
  principalAmountMinor: number;
  totalDueMinor: number | null;
  principalDisplay: string;
  totalDisplay: string;
  treatmentFeeGrossDisplay: string | null;
  totalWithTreatmentDisplay: string | null;
  treatmentDisplayClause: string;
  paymentLinkPlaceholder: string;
  printedDeadlineDateDisplay: string;
  numberedClauses: WarningLetterRenderedClause[];
  evidenceDisclaimer: string;
  inquiriesMobileDisplay: string;
  signatoryName: string;
  barRegistrationNumber: string;
  recipients: LetterRecipient[];
  ownerCopyRecipients: LetterRecipient[];
  contentSha256: string;
  snapshotCreatedAtIso: string;
};
