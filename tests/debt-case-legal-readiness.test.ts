import { describe, expect, it } from "vitest";

import { LawyerVerificationStatus } from "@/modules/buildings/domain/building-status";
import { evaluateBuildingLegalReadiness } from "@/modules/debt-cases/domain/debt-case-legal-readiness";

describe("evaluateBuildingLegalReadiness", () => {
  it("does not allow legal treatment until verified and signed", () => {
    const result = evaluateBuildingLegalReadiness({
      lawyerVerificationStatus: LawyerVerificationStatus.PENDING_LAWYER_REVIEW,
      engagementSigned: false,
      poaSigned: false,
      legacyFastTrackEligible: true,
    });
    expect(result.legalTreatmentAllowed).toBe(false);
    expect(result.streamlinedReviewEligible).toBe(false);
  });

  it("allows legal treatment when gates pass but not streamlined without explicit flag", () => {
    const result = evaluateBuildingLegalReadiness({
      lawyerVerificationStatus: LawyerVerificationStatus.VERIFIED,
      engagementSigned: true,
      poaSigned: true,
      legacyFastTrackEligible: false,
    });
    expect(result.legalTreatmentAllowed).toBe(true);
    expect(result.streamlinedReviewEligible).toBe(false);
  });

  it("grants streamlined review only when legal readiness and explicit flag", () => {
    const result = evaluateBuildingLegalReadiness({
      lawyerVerificationStatus: LawyerVerificationStatus.VERIFIED,
      engagementSigned: true,
      poaSigned: true,
      legacyFastTrackEligible: true,
    });
    expect(result.legalTreatmentAllowed).toBe(true);
    expect(result.streamlinedReviewEligible).toBe(true);
  });
});
