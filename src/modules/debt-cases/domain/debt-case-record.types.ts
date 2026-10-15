import type { DebtCaseDebtType } from "@/modules/debt-cases/domain/debt-case-debt-type";
import type { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import type { DebtCaseLetterDeliveryStatus } from "@/modules/debt-cases/domain/debt-case-letter-delivery-status";
import type { DebtCaseLegalHoldReason } from "@/modules/debt-cases/domain/debt-case-legal-hold-reason";
import type { DebtCasePartyStructure } from "@/modules/debt-cases/domain/debt-case-parties";
import type { DebtCasePaymentStatus } from "@/modules/debt-cases/domain/debt-case-payment-status";
import type { DebtCaseValidationFlag } from "@/modules/debt-cases/domain/debt-case-validation-flag";
import type { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import type { DebtPeriodMonth } from "@/modules/debt-cases/domain/debt-period";

export type DebtCaseFinancialFields = {
  debtType: DebtCaseDebtType;
  specialAssessmentDescription: string | null;
  principalAmountMinor: number;
  periodStartMonth: DebtPeriodMonth;
  periodEndMonth: DebtPeriodMonth;
};

export type DebtCaseApartmentFields = {
  apartmentNumberDisplay: string;
  apartmentKeyNormalized: string;
};

export type DebtCaseLifecycleDimensions = {
  workflowStatus: DebtCaseWorkflowStatus;
  lawyerReviewStatus: DebtCaseLawyerReviewStatus;
  letterDeliveryStatus: DebtCaseLetterDeliveryStatus;
  paymentStatus: DebtCasePaymentStatus;
  legalHoldReasons: DebtCaseLegalHoldReason[];
};

/** Core persisted shape (CP8.1 types only — persistence in CP8.2). */
export type DebtCaseRecord = {
  debtCaseId: string;
  buildingId: string;
  revision: number;
  predecessorDebtCaseId: string | null;
  letterSentAtIso: string | null;
  validationFlags: DebtCaseValidationFlag[];
  createdByUserId: string;
  updatedByUserId: string;
  submittedAtIso: string | null;
  createdAtIso: string;
  updatedAtIso: string;
  parties: DebtCasePartyStructure;
} & DebtCaseApartmentFields &
  DebtCaseFinancialFields &
  DebtCaseLifecycleDimensions;

/** Fields frozen when a warning letter is sent (future). */
export type DebtCaseLetterSnapshot = DebtCaseApartmentFields &
  DebtCaseFinancialFields & {
    parties: DebtCasePartyStructure;
  };
