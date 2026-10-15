import { describe, expect, it } from "vitest";

import { DebtCase } from "@/modules/debt-cases/infra/debt-case.model";
import { DebtCasePeriodClaim } from "@/modules/debt-cases/infra/debt-case-period-claim.model";
import { PendingBuildingOnboardingRequest } from "@/modules/debt-cases/infra/pending-building-onboarding-request.model";

describe("debt case mongoose models", () => {
  it("defines debt case schema paths and indexes", () => {
    const paths = Object.keys(DebtCase.schema.paths);
    expect(paths).toContain("debtCaseId");
    expect(paths).toContain("parties");
    expect(paths).toContain("revision");
    expect(paths).toContain("pendingOnboardingRequestId");
    const indexNames = DebtCase.schema.indexes().map((entry) => JSON.stringify(entry[0]));
    expect(indexNames.some((name) => name.includes("buildingId"))).toBe(true);
  });

  it("defines period claim unique apartment month index", () => {
    const indexes = DebtCasePeriodClaim.schema.indexes();
    const uniqueApartmentMonth = indexes.find(
      (entry) =>
        JSON.stringify(entry[0]).includes("apartmentKeyNormalized") &&
        JSON.stringify(entry[0]).includes("periodMonth"),
    );
    expect(uniqueApartmentMonth?.[1]?.unique).toBe(true);
  });

  it("defines pending onboarding request schema", () => {
    const paths = Object.keys(PendingBuildingOnboardingRequest.schema.paths);
    expect(paths).toContain("onboardingRequestId");
    expect(paths).toContain("buildingId");
    expect(paths).toContain("userId");
  });
});
