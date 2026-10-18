import { describe, expect, it } from "vitest";

import { LawyerVerificationStatus } from "@/modules/buildings/domain/building-status";
import {
  adminBuildingVerificationFilter,
  parseAdminBuildingListSearchParams,
} from "@/modules/buildings/validation/admin-building-list.schema";

describe("admin building list verification filter", () => {
  it("parses pending and verified verification query", () => {
    const pending = parseAdminBuildingListSearchParams({
      verification: adminBuildingVerificationFilter.PENDING,
    });
    expect(pending.verification).toBe("pending");

    const verified = parseAdminBuildingListSearchParams({
      verification: adminBuildingVerificationFilter.VERIFIED,
    });
    expect(verified.verification).toBe("verified");
  });

  it("uses lawyer verification enum values in filter contract", () => {
    expect(LawyerVerificationStatus.VERIFIED).toBe("verified");
    expect(adminBuildingVerificationFilter.ALL).toBe("all");
  });
});
