import { describe, expect, it } from "vitest";

import { LawyerVerificationStatus } from "@/modules/buildings/domain/building-status";
import { evaluateBuildingLegalReadiness } from "@/modules/debt-cases/domain/debt-case-legal-readiness";
import { DebtCaseOccupancyType } from "@/modules/debt-cases/domain/debt-case-occupancy-type";
import {
  LegalDebtorDesignation,
  type DebtCasePartyStructure,
} from "@/modules/debt-cases/domain/debt-case-parties";
import {
  collectDebtCaseSubmissionFlags,
  hasBlockingValidationFlags,
} from "@/modules/debt-cases/domain/debt-case-validation";
import { DebtCaseValidationFlagCode } from "@/modules/debt-cases/domain/debt-case-validation-flag";

const BUILDING_ID = "11111111-1111-4111-8111-111111111111";

function ownerOccupiedParties(mobileE164: string): DebtCasePartyStructure {
  return {
    propertyOwners: [
      {
        fullName: "Test Owner",
        identityDocumentType: null,
        identityNumber: null,
        mobileE164,
        email: null,
      },
    ],
    occupancyType: DebtCaseOccupancyType.OWNER,
    legalDebtorDesignation: LegalDebtorDesignation.PROPERTY_OWNERS,
    tenant: null,
    postalAddress: null,
  };
}

describe("collectDebtCaseSubmissionFlags", () => {
  it("blocks when debtor phone matches operator phone", () => {
    const flags = collectDebtCaseSubmissionFlags({
      buildingId: BUILDING_ID,
      apartmentKeyNormalized: "12",
      parties: ownerOccupiedParties("+972501234567"),
      principalAmountMinor: 10000,
      periodStartMonth: "2024-01",
      periodEndMonth: "2024-02",
      operatorMobileE164: "+972501234567",
    });
    expect(hasBlockingValidationFlags(flags)).toBe(true);
    expect(flags.some((f) => f.code === DebtCaseValidationFlagCode.DEBTOR_PHONE_MATCHES_OPERATOR)).toBe(
      true,
    );
  });

  it("warns on legal readiness incomplete without blocking submit", () => {
    const readiness = evaluateBuildingLegalReadiness({
      lawyerVerificationStatus: LawyerVerificationStatus.NOT_STARTED,
      engagementSigned: false,
      poaSigned: false,
      legacyFastTrackEligible: true,
    });
    expect(readiness.legalTreatmentAllowed).toBe(false);
    expect(readiness.streamlinedReviewEligible).toBe(false);

    const flags = collectDebtCaseSubmissionFlags({
      buildingId: BUILDING_ID,
      apartmentKeyNormalized: "12",
      parties: ownerOccupiedParties("+972501234567"),
      principalAmountMinor: 10000,
      periodStartMonth: "2024-01",
      periodEndMonth: "2024-02",
      legalReadiness: readiness,
    });
    expect(hasBlockingValidationFlags(flags)).toBe(false);
    expect(flags.some((f) => f.code === DebtCaseValidationFlagCode.LEGAL_READINESS_INCOMPLETE)).toBe(
      true,
    );
  });

  it("does not warn on high amount without configured anomaly policy", () => {
    const flags = collectDebtCaseSubmissionFlags({
      buildingId: BUILDING_ID,
      apartmentKeyNormalized: "12",
      parties: ownerOccupiedParties("+972501234567"),
      principalAmountMinor: 500000,
      periodStartMonth: "2024-01",
      periodEndMonth: "2024-02",
      buildingAverageMonthlyVaadFeeMinor: 50000,
      amountAnomalyPolicy: { enabled: false },
    });
    expect(hasBlockingValidationFlags(flags)).toBe(false);
    expect(flags.some((f) => f.code === DebtCaseValidationFlagCode.AMOUNT_ABOVE_BUILDING_AVERAGE)).toBe(
      false,
    );
  });

  it("warns on high amount when policy is explicitly enabled", () => {
    const flags = collectDebtCaseSubmissionFlags({
      buildingId: BUILDING_ID,
      apartmentKeyNormalized: "12",
      parties: ownerOccupiedParties("+972501234567"),
      principalAmountMinor: 500000,
      periodStartMonth: "2024-01",
      periodEndMonth: "2024-02",
      buildingAverageMonthlyVaadFeeMinor: 50000,
      amountAnomalyPolicy: { enabled: true, maxMultipleOfBuildingAverage: 3 },
    });
    expect(hasBlockingValidationFlags(flags)).toBe(false);
    expect(flags.some((f) => f.code === DebtCaseValidationFlagCode.AMOUNT_ABOVE_BUILDING_AVERAGE)).toBe(
      true,
    );
  });
});
