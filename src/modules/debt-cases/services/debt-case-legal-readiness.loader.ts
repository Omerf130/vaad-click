import "server-only";

import { LawyerVerificationStatus } from "@/modules/buildings/domain/building-status";
import { BuildingOrganizationalStatus } from "@/modules/buildings/domain/building-status";
import { Building } from "@/modules/buildings/infra/building.model";
import { CommitteeEngagementStatus } from "@/modules/committee-engagements/domain/engagement-status";
import { CommitteeEngagement } from "@/modules/committee-engagements/infra/committee-engagement.model";
import {
  evaluateBuildingLegalReadiness,
  type BuildingLegalReadinessResult,
} from "@/modules/debt-cases/domain/debt-case-legal-readiness";
import { DebtCaseError, DebtCaseErrorCode } from "@/modules/debt-cases/domain/debt-case-errors";
import { connectMongo } from "@/shared/db/connect";

export async function loadBuildingLegalReadinessForDebtCase(
  buildingId: string,
): Promise<BuildingLegalReadinessResult & { averageMonthlyVaadFeeMinor: number | null }> {
  await connectMongo();
  const building = await Building.findOne({
    buildingId,
    organizationalStatus: BuildingOrganizationalStatus.ACTIVE,
  }).lean();

  if (!building) {
    throw new DebtCaseError(DebtCaseErrorCode.NOT_FOUND, "Building not found");
  }

  const engagement = await CommitteeEngagement.findOne({
    buildingId,
    status: CommitteeEngagementStatus.PROPOSED_TERMS,
  }).lean();

  const engagementSigned = engagement?.signedAt != null;
  /** POA signature is not modeled in CP6D — never treat proposed terms as signed. */
  const poaSigned = false;

  const readiness = evaluateBuildingLegalReadiness({
    lawyerVerificationStatus: building.lawyerVerificationStatus as LawyerVerificationStatus,
    engagementSigned,
    poaSigned,
    legacyFastTrackEligible: Boolean(building.legacyFastTrackEligible),
  });

  return {
    ...readiness,
    averageMonthlyVaadFeeMinor: building.averageMonthlyVaadFeeMinor ?? null,
  };
}
