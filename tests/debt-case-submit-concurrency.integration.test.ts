import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { submitDebtCaseForLawyerReview } from "@/modules/debt-cases/services/debt-case.service";
import { createDebtCaseDraft } from "@/modules/debt-cases/services/debt-case.service";
import { DebtCasePeriodClaim } from "@/modules/debt-cases/infra/debt-case-period-claim.model";
import { DebtCaseDebtType } from "@/modules/debt-cases/domain/debt-case-debt-type";
import { DebtCaseOccupancyType } from "@/modules/debt-cases/domain/debt-case-occupancy-type";
import { LegalDebtorDesignation } from "@/modules/debt-cases/domain/debt-case-parties";
import { DebtCaseErrorCode } from "@/modules/debt-cases/domain/debt-case-errors";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import { User } from "@/modules/users/infra/user.model";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { connectMongo } from "@/shared/db/connect";

const runIntegration = Boolean(
  process.env.MONGODB_URI && process.env.RUN_DEBT_CASE_INTEGRATION === "1",
);

describe.runIf(runIntegration)("debt case submit concurrency (real MongoDB transaction)", () => {
  beforeAll(async () => {
    await connectMongo();
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it("allows only one overlapping submit to claim apartment months", async () => {
    const buildingId = process.env.TEST_DEBT_CASE_BUILDING_ID;
    expect(buildingId).toBeTruthy();

    const rep = await User.findOne({
      role: UserRole.BUILDING_REP,
      accountStatus: AccountStatus.ACTIVE,
    }).lean();
    expect(rep).toBeTruthy();

    const context: AuthenticatedContext = {
      user: {
        id: rep!._id.toString(),
        email: rep!.email ?? "rep@test",
        role: UserRole.BUILDING_REP,
        accountStatus: AccountStatus.ACTIVE,
      },
    } as AuthenticatedContext;

    const draftA = await createDebtCaseDraft({
      context,
      payload: { buildingId },
    });
    const draftB = await createDebtCaseDraft({
      context,
      payload: { buildingId },
    });

    const submitPayload = {
      buildingId,
      apartmentNumber: "99z",
      propertyOwners: [
        {
          fullName: "Owner A",
          mobile: "0501234567",
          identityDocumentType: null,
          identityNumber: null,
          email: null,
        },
      ],
      occupancyType: DebtCaseOccupancyType.OWNER,
      legalDebtorDesignation: LegalDebtorDesignation.PROPERTY_OWNERS,
      tenant: null,
      postalAddress: null,
      debtType: DebtCaseDebtType.REGULAR_VAAD,
      specialAssessmentDescription: null,
      principalAmountMinor: 10000,
      periodStartMonth: "2024-01",
      periodEndMonth: "2024-02",
      predecessorDebtCaseId: null,
    };

    const results = await Promise.allSettled([
      submitDebtCaseForLawyerReview({
        context,
        debtCaseId: draftA.debtCaseId,
        expectedRevision: draftA.revision,
        payload: submitPayload,
      }),
      submitDebtCaseForLawyerReview({
        context,
        debtCaseId: draftB.debtCaseId,
        expectedRevision: draftB.revision,
        payload: submitPayload,
      }),
    ]);

    const successes = results.filter((r) => r.status === "fulfilled");
    const failures = results.filter((r) => r.status === "rejected");
    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    const rejected = failures[0] as PromiseRejectedResult;
    expect((rejected.reason as { code?: string }).code).toBe(DebtCaseErrorCode.DUPLICATE_OVERLAP);

    await DebtCasePeriodClaim.deleteMany({ debtCaseId: draftA.debtCaseId });
    await DebtCasePeriodClaim.deleteMany({ debtCaseId: draftB.debtCaseId });
  });
});
