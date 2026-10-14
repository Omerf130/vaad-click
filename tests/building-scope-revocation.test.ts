import { describe, expect, it } from "vitest";

import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import { deriveBuildingAccessScope } from "@/shared/auth/building-access/derive-building-access-scope";
import { isBuildingPublicIdAuthorized } from "@/shared/auth/building-access/building-scope-query";

const BUILDING_A = "11111111-1111-4111-8111-111111111111";

describe("CP6B scope after relationship removal (logical)", () => {
  it("management company user loses building when company building list shrinks", () => {
    const before = deriveBuildingAccessScope({
      role: UserRole.MANAGEMENT_COMPANY,
      accountStatus: AccountStatus.ACTIVE,
      representativeBuildingPublicId: null,
      managementCompanyBuildingPublicIds: [BUILDING_A],
    });
    const after = deriveBuildingAccessScope({
      role: UserRole.MANAGEMENT_COMPANY,
      accountStatus: AccountStatus.ACTIVE,
      representativeBuildingPublicId: null,
      managementCompanyBuildingPublicIds: [],
    });
    expect(isBuildingPublicIdAuthorized(before, BUILDING_A)).toBe(true);
    expect(isBuildingPublicIdAuthorized(after, BUILDING_A)).toBe(false);
  });
});
