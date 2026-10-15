import { describe, expect, it } from "vitest";

import { DebtCaseOccupancyType } from "@/modules/debt-cases/domain/debt-case-occupancy-type";
import { parseDebtCaseFormDataToDraftPayload } from "@/modules/debt-cases/validation/debt-case-form.parser";

const BUILDING_ID = "11111111-1111-4111-8111-111111111111";

describe("parseDebtCaseFormDataToDraftPayload", () => {
  it("parses two owners and tenant when tenant-occupied", () => {
    const formData = new FormData();
    formData.set("occupancyType", DebtCaseOccupancyType.TENANT);
    formData.set("propertyOwners.0.fullName", "Owner One");
    formData.set("propertyOwners.0.mobile", "0501111111");
    formData.set("propertyOwners.1.fullName", "Owner Two");
    formData.set("tenant.fullName", "Tenant");
    formData.set("tenant.mobile", "0502222222");

    const payload = parseDebtCaseFormDataToDraftPayload({ formData, buildingId: BUILDING_ID });
    expect(payload.propertyOwners).toHaveLength(2);
    expect(payload.tenant?.fullName).toBe("Tenant");
    expect(payload.occupancyType).toBe(DebtCaseOccupancyType.TENANT);
  });

  it("converts NIS input to minor units", () => {
    const formData = new FormData();
    formData.set("principalAmountNis", "1,250.5");

    const payload = parseDebtCaseFormDataToDraftPayload({ formData, buildingId: BUILDING_ID });
    expect(payload.principalAmountMinor).toBe(125050);
  });
});
