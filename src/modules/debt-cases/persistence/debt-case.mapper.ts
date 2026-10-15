import type { DebtCaseDocument } from "@/modules/debt-cases/infra/debt-case.model";
import type { DebtCaseDebtType } from "@/modules/debt-cases/domain/debt-case-debt-type";
import type { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import type { DebtCaseLegalHoldReason } from "@/modules/debt-cases/domain/debt-case-legal-hold-reason";
import type { DebtCaseLetterDeliveryStatus } from "@/modules/debt-cases/domain/debt-case-letter-delivery-status";
import {
  LegalDebtorDesignation,
  normalizePartyNameForMatching,
  resolveLegalDebtorMatchingLabel,
  type DebtCasePartyStructure,
} from "@/modules/debt-cases/domain/debt-case-parties";
import { DebtCaseOccupancyType } from "@/modules/debt-cases/domain/debt-case-occupancy-type";
import type { DebtCasePaymentStatus } from "@/modules/debt-cases/domain/debt-case-payment-status";
import type { DebtCaseDuplicateCandidate } from "@/modules/debt-cases/domain/debt-case-duplicate-detection";
import type { DebtCaseRecord } from "@/modules/debt-cases/domain/debt-case-record.types";
import type { DebtCaseValidationFlag } from "@/modules/debt-cases/domain/debt-case-validation-flag";
import type { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import type { DebtPeriodMonth } from "@/modules/debt-cases/domain/debt-period";

export type DebtCaseListItem = {
  debtCaseId: string;
  buildingId: string;
  workflowStatus: DebtCaseWorkflowStatus;
  lawyerReviewStatus: DebtCaseLawyerReviewStatus;
  apartmentNumberDisplay: string;
  principalAmountMinor: number | null;
  periodStartMonth: string | null;
  periodEndMonth: string | null;
  revision: number;
  updatedAtIso: string;
  createdByUserId: string;
};

export function mapPartiesFromDocument(doc: DebtCaseDocument): DebtCasePartyStructure {
  const parties = doc.parties;
  if (!parties) {
    return {
      propertyOwners: [],
      occupancyType: DebtCaseOccupancyType.OWNER,
      legalDebtorDesignation: LegalDebtorDesignation.PROPERTY_OWNERS,
      tenant: null,
      postalAddress: null,
    };
  }
  return {
    propertyOwners: parties.propertyOwners.map((o) => ({
      fullName: o.fullName,
      identityDocumentType: o.identityDocumentType ?? null,
      identityNumber: o.identityNumber ?? null,
      mobileE164: o.mobileE164 ?? null,
      email: o.email ?? null,
    })),
    occupancyType: parties.occupancyType as DebtCasePartyStructure["occupancyType"],
    legalDebtorDesignation:
      parties.legalDebtorDesignation as DebtCasePartyStructure["legalDebtorDesignation"],
    tenant: parties.tenant
      ? {
          fullName: parties.tenant.fullName,
          identityDocumentType: parties.tenant.identityDocumentType ?? null,
          identityNumber: parties.tenant.identityNumber ?? null,
          mobileE164: parties.tenant.mobileE164,
          email: parties.tenant.email ?? null,
        }
      : null,
    postalAddress: parties.postalAddress ?? null,
  };
}

export function mapDocumentToDuplicateCandidate(doc: DebtCaseDocument): DebtCaseDuplicateCandidate {
  const parties = mapPartiesFromDocument(doc);
  return {
    debtCaseId: doc.debtCaseId,
    buildingId: doc.buildingId,
    apartmentKeyNormalized: doc.apartmentKeyNormalized ?? "",
    periodStartMonth: (doc.periodStartMonth ?? "1970-01") as DebtPeriodMonth,
    periodEndMonth: (doc.periodEndMonth ?? "1970-01") as DebtPeriodMonth,
    workflowStatus: doc.workflowStatus as DebtCaseDuplicateCandidate["workflowStatus"],
    letterSentAtIso: doc.letterSentAt ? doc.letterSentAt.toISOString() : null,
    debtorNameNormalized: resolveDebtorNameNormalizedForMatching(parties),
  };
}

export function mapDebtCaseDocumentToRecord(doc: DebtCaseDocument): DebtCaseRecord {
  const parties = mapPartiesFromDocument(doc);
  return {
    debtCaseId: doc.debtCaseId,
    buildingId: doc.buildingId,
    revision: doc.revision,
    predecessorDebtCaseId: doc.predecessorDebtCaseId ?? null,
    letterSentAtIso: doc.letterSentAt ? doc.letterSentAt.toISOString() : null,
    validationFlags: (doc.validationFlags ?? []).map((flag) => ({
      code: flag.code as DebtCaseValidationFlag["code"],
      severity: flag.severity as DebtCaseValidationFlag["severity"],
      messageHe: String(flag.messageHe ?? ""),
    })),
    createdByUserId: doc.createdByUserId.toString(),
    updatedByUserId: doc.updatedByUserId.toString(),
    submittedAtIso: doc.submittedAt ? doc.submittedAt.toISOString() : null,
    createdAtIso: doc.createdAt.toISOString(),
    updatedAtIso: doc.updatedAt.toISOString(),
    parties,
    apartmentNumberDisplay: doc.apartmentNumberDisplay ?? "",
    apartmentKeyNormalized: doc.apartmentKeyNormalized ?? "",
    debtType: (doc.debtType ?? "regular_vaad") as DebtCaseDebtType,
    specialAssessmentDescription: doc.specialAssessmentDescription ?? null,
    principalAmountMinor: doc.principalAmountMinor ?? 0,
    periodStartMonth: (doc.periodStartMonth ?? "1970-01") as DebtPeriodMonth,
    periodEndMonth: (doc.periodEndMonth ?? "1970-01") as DebtPeriodMonth,
    workflowStatus: doc.workflowStatus as DebtCaseWorkflowStatus,
    lawyerReviewStatus: doc.lawyerReviewStatus as DebtCaseLawyerReviewStatus,
    letterDeliveryStatus: doc.letterDeliveryStatus as DebtCaseLetterDeliveryStatus,
    paymentStatus: doc.paymentStatus as DebtCasePaymentStatus,
    legalHoldReasons: (doc.legalHoldReasons ?? []) as DebtCaseLegalHoldReason[],
  };
}

export function mapDebtCaseDocumentToListItem(doc: DebtCaseDocument): DebtCaseListItem {
  return {
    debtCaseId: doc.debtCaseId,
    buildingId: doc.buildingId,
    workflowStatus: doc.workflowStatus as DebtCaseWorkflowStatus,
    lawyerReviewStatus: doc.lawyerReviewStatus as DebtCaseLawyerReviewStatus,
    apartmentNumberDisplay: doc.apartmentNumberDisplay ?? "",
    principalAmountMinor: doc.principalAmountMinor ?? null,
    periodStartMonth: doc.periodStartMonth ?? null,
    periodEndMonth: doc.periodEndMonth ?? null,
    revision: doc.revision,
    updatedAtIso: doc.updatedAt.toISOString(),
    createdByUserId: doc.createdByUserId.toString(),
  };
}

/** Soft duplicate hint only — not a legal identity key. */
export function resolveDebtorNameNormalizedForMatching(
  parties: DebtCasePartyStructure | null,
): string | null {
  if (!parties || parties.propertyOwners.length === 0) {
    return null;
  }
  const label = resolveLegalDebtorMatchingLabel(parties);
  const normalized = normalizePartyNameForMatching(label);
  return normalized || null;
}
