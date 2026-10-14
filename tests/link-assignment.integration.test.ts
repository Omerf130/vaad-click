import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { linkBuildingToManagementCompany } from "@/modules/buildings/services/building-assignment.service";
import { Building } from "@/modules/buildings/infra/building.model";
import { ManagementCompany } from "@/modules/management-companies/infra/management-company.model";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import { User } from "@/modules/users/infra/user.model";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { connectMongo } from "@/shared/db/connect";

const uri = process.env.MONGODB_URI;
const runIntegration = Boolean(uri && process.env.RUN_LINK_INTEGRATION === "1");

describe.runIf(runIntegration)("link assignment integration", () => {
  beforeAll(async () => {
    await connectMongo();
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it("links building to management company by public UUID", async () => {
    const buildingId = process.env.TEST_BUILDING_ID;
    const managementCompanyId = process.env.TEST_MANAGEMENT_COMPANY_ID;
    expect(buildingId).toBeTruthy();
    expect(managementCompanyId).toBeTruthy();

    const lawyer = await User.findOne({
      role: UserRole.LAWYER_ADMIN,
      accountStatus: AccountStatus.ACTIVE,
    }).lean();
    expect(lawyer).toBeTruthy();

    const context: AuthenticatedContext = {
      user: {
        id: lawyer!._id.toString(),
        email: lawyer!.email ?? "lawyer@test",
        fullName: lawyer!.fullName,
        role: UserRole.LAWYER_ADMIN,
        accountStatus: AccountStatus.ACTIVE,
      },
      session: {} as AuthenticatedContext["session"],
    };

    await linkBuildingToManagementCompany({
      context,
      buildingId: buildingId!,
      managementCompanyId: managementCompanyId!,
    });

    const company = await ManagementCompany.findOne({ managementCompanyId }).lean();
    const building = await Building.findOne({ buildingId }).lean();
    expect(building?.managementCompanyId?.toString()).toBe(company?._id.toString());
  });
});
