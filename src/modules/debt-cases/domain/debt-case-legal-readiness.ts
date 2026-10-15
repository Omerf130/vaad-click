import { LawyerVerificationStatus } from "@/modules/buildings/domain/building-status";
import { DebtCaseLegalHoldReason } from "@/modules/debt-cases/domain/debt-case-legal-hold-reason";

export type BuildingLegalReadinessInput = {
  lawyerVerificationStatus: LawyerVerificationStatus;
  engagementSigned: boolean;
  poaSigned: boolean;
  legacyFastTrackEligible: boolean;
  manualHoldReasons?: readonly DebtCaseLegalHoldReason[];
};

export type BuildingLegalReadinessResult = {
  /** Legal letters / treatment may proceed when true. Fast-track never bypasses this. */
  legalTreatmentAllowed: boolean;
  holdReasons: DebtCaseLegalHoldReason[];
  /** UI tier for streamlined lawyer review prep (Clarification A). */
  streamlinedReviewEligible: boolean;
};

export function evaluateBuildingLegalReadiness(
  input: BuildingLegalReadinessInput,
): BuildingLegalReadinessResult {
  const holdReasons: DebtCaseLegalHoldReason[] = [...(input.manualHoldReasons ?? [])];

  if (input.lawyerVerificationStatus !== LawyerVerificationStatus.VERIFIED) {
    holdReasons.push(DebtCaseLegalHoldReason.BUILDING_NOT_APPROVED);
  }
  if (!input.engagementSigned) {
    holdReasons.push(DebtCaseLegalHoldReason.ENGAGEMENT_NOT_SIGNED);
  }
  if (!input.poaSigned) {
    holdReasons.push(DebtCaseLegalHoldReason.POA_NOT_SIGNED);
  }

  const uniqueHolds = [...new Set(holdReasons)];
  const legalTreatmentAllowed = uniqueHolds.length === 0;

  /**
   * CP8.1A: explicit lawyer-admin flag only (admin UI deferred).
   * Future automatic eligibility may be added when product approves.
   */
  const streamlinedReviewEligible =
    legalTreatmentAllowed && input.legacyFastTrackEligible;

  return {
    legalTreatmentAllowed,
    holdReasons: uniqueHolds,
    streamlinedReviewEligible,
  };
}
