import { beforeEach, describe, expect, it, vi } from "vitest";

import { OrganizationErrorCode } from "@/modules/buildings/domain/organization-errors";
import { ManagementCompanyStatus } from "@/modules/management-companies/domain/management-company-status";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { AuditWriteFailedError } from "@/shared/audit/errors/audit-errors";

const BUILDING_ID = "11111111-1111-4111-8111-111111111111";
const BUILDING_ID_2 = "22222222-2222-4222-8222-222222222222";
const COMPANY_PUBLIC_ID = "33333333-3333-4333-8333-333333333333";
const COMPANY_DOC_ID = "507f1f77bcf86cd799439011";

const mockWithTransaction = vi.fn(async (fn: () => Promise<void>) => fn());
const mockEndSession = vi.fn();

const mongooseTypes = {
  ObjectId: Object.assign(
    class MockObjectId {
      constructor(public id: string) {}
      toString() {
        return this.id;
      }
      equals(other: { toString(): string }) {
        return this.toString() === other.toString();
      }
    },
    { isValid: (id: string) => /^[a-f0-9]{24}$/i.test(id) },
  ),
};

vi.mock("mongoose", () => ({
  default: {
    startSession: () => ({
      withTransaction: mockWithTransaction,
      endSession: mockEndSession,
    }),
    Types: mongooseTypes,
  },
  Types: mongooseTypes,
}));

const buildingFindOne = vi.fn();
const buildingFindOneAndUpdate = vi.fn();
const userFindById = vi.fn();
const managementCompanyFindOne = vi.fn();

vi.mock("@/modules/buildings/infra/building.model", () => ({
  Building: {
    findOne: (...args: unknown[]) => buildingFindOne(...args),
    findOneAndUpdate: (...args: unknown[]) => buildingFindOneAndUpdate(...args),
  },
}));

vi.mock("@/modules/users/infra/user.model", () => ({
  User: {
    findById: (...args: unknown[]) => userFindById(...args),
  },
}));

vi.mock("@/modules/management-companies/infra/management-company.model", () => ({
  ManagementCompany: {
    findOne: (...args: unknown[]) => managementCompanyFindOne(...args),
  },
}));

const mockRecordLinked = vi.fn();
const mockRecordUnlinked = vi.fn();

vi.mock("@/modules/organizations/services/organization-audit.service", () => ({
  recordRepresentativeAssigned: vi.fn().mockResolvedValue(undefined),
  recordRepresentativeRemoved: vi.fn().mockResolvedValue(undefined),
  recordManagementCompanyLinked: (...args: unknown[]) => mockRecordLinked(...args),
  recordManagementCompanyUnlinked: (...args: unknown[]) => mockRecordUnlinked(...args),
}));

vi.mock("@/shared/db/connect", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

function lawyerContext(): AuthenticatedContext {
  return {
    user: {
      id: "507f1f77bcf86cd799439099",
      email: "lawyer@firm.com",
      fullName: "Lawyer",
      role: UserRole.LAWYER_ADMIN,
      accountStatus: AccountStatus.ACTIVE,
    },
    session: {} as AuthenticatedContext["session"],
  };
}

function repContext(): AuthenticatedContext {
  return {
    user: {
      id: "507f1f77bcf86cd799439088",
      email: "rep@example.com",
      fullName: "Rep",
      role: UserRole.BUILDING_REP,
      accountStatus: AccountStatus.ACTIVE,
    },
    session: {} as AuthenticatedContext["session"],
  };
}

function activeCompanyLean() {
  return {
    _id: COMPANY_DOC_ID,
    managementCompanyId: COMPANY_PUBLIC_ID,
    status: ManagementCompanyStatus.ACTIVE,
  };
}

describe("building assignment services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRecordLinked.mockResolvedValue(undefined);
    mockRecordUnlinked.mockResolvedValue(undefined);
    userFindById.mockReturnValue({
      lean: async () => ({
        _id: "507f1f77bcf86cd799439012",
        role: UserRole.BUILDING_REP,
        accountStatus: AccountStatus.ACTIVE,
      }),
    });
    buildingFindOneAndUpdate.mockReturnValue({
      lean: async () => ({ buildingId: BUILDING_ID }),
    });
    managementCompanyFindOne.mockReturnValue({
      lean: async () => activeCompanyLean(),
    });
  });

  it("blocks assigning a rep who already has another active building", async () => {
    buildingFindOne.mockImplementation((query: Record<string, unknown>) => {
      if ("buildingId" in query && query.buildingId === "b-target") {
        return {
          lean: async () => ({
            buildingId: "b-target",
            designatedRepresentativeUserId: null,
          }),
        };
      }
      if ("designatedRepresentativeUserId" in query) {
        return { lean: async () => ({ buildingId: "b-other" }) };
      }
      return { lean: async () => null };
    });

    const { assignBuildingRepresentative } = await import(
      "@/modules/buildings/services/building-assignment.service"
    );

    await expect(
      assignBuildingRepresentative({
        context: lawyerContext(),
        buildingId: "b-target",
        representativeUserId: "507f1f77bcf86cd799439012",
      }),
    ).rejects.toMatchObject({ code: OrganizationErrorCode.REP_ALREADY_ASSIGNED });
  });

  it("links a building using the public management company UUID", async () => {
    buildingFindOne.mockReturnValue({
      lean: async () => ({
        buildingId: BUILDING_ID,
        managementCompanyId: null,
        organizationalStatus: "active",
      }),
    });

    const { linkBuildingToManagementCompany } = await import(
      "@/modules/buildings/services/building-assignment.service"
    );

    await linkBuildingToManagementCompany({
      context: lawyerContext(),
      buildingId: BUILDING_ID,
      managementCompanyId: COMPANY_PUBLIC_ID,
    });

    expect(managementCompanyFindOne).toHaveBeenCalledWith({
      managementCompanyId: COMPANY_PUBLIC_ID,
    });
    expect(buildingFindOneAndUpdate).toHaveBeenCalledWith(
      { buildingId: BUILDING_ID },
      { managementCompanyId: COMPANY_DOC_ID },
      { session: expect.anything() },
    );
    expect(mockRecordLinked).toHaveBeenCalledWith(
      expect.objectContaining({
        buildingId: BUILDING_ID,
        managementCompanyId: COMPANY_PUBLIC_ID,
      }),
    );
  });

  it("allows linking multiple buildings to one management company", async () => {
    buildingFindOne.mockReturnValue({
      lean: async () => ({ buildingId: BUILDING_ID, managementCompanyId: null }),
    });

    const { linkBuildingToManagementCompany } = await import(
      "@/modules/buildings/services/building-assignment.service"
    );

    await linkBuildingToManagementCompany({
      context: lawyerContext(),
      buildingId: BUILDING_ID,
      managementCompanyId: COMPANY_PUBLIC_ID,
    });

    buildingFindOne.mockReturnValue({
      lean: async () => ({ buildingId: BUILDING_ID_2, managementCompanyId: null }),
    });

    await linkBuildingToManagementCompany({
      context: lawyerContext(),
      buildingId: BUILDING_ID_2,
      managementCompanyId: COMPANY_PUBLIC_ID,
    });

    expect(buildingFindOneAndUpdate).toHaveBeenCalledTimes(2);
  });

  it("rejects invalid id formats before lookup", async () => {
    const { linkBuildingToManagementCompany } = await import(
      "@/modules/buildings/services/building-assignment.service"
    );

    await expect(
      linkBuildingToManagementCompany({
        context: lawyerContext(),
        buildingId: "not-a-uuid",
        managementCompanyId: COMPANY_PUBLIC_ID,
      }),
    ).rejects.toMatchObject({ code: OrganizationErrorCode.VALIDATION });

    expect(managementCompanyFindOne).not.toHaveBeenCalled();
  });

  it("rejects linking to an inactive management company", async () => {
    buildingFindOne.mockReturnValue({
      lean: async () => ({ buildingId: BUILDING_ID, managementCompanyId: null }),
    });
    managementCompanyFindOne.mockReturnValue({
      lean: async () => ({
        ...activeCompanyLean(),
        status: ManagementCompanyStatus.ARCHIVED,
      }),
    });

    const { linkBuildingToManagementCompany } = await import(
      "@/modules/buildings/services/building-assignment.service"
    );

    await expect(
      linkBuildingToManagementCompany({
        context: lawyerContext(),
        buildingId: BUILDING_ID,
        managementCompanyId: COMPANY_PUBLIC_ID,
      }),
    ).rejects.toMatchObject({ code: OrganizationErrorCode.MANAGEMENT_COMPANY_INACTIVE });
  });

  it("requires lawyer admin for management company link", async () => {
    const { linkBuildingToManagementCompany } = await import(
      "@/modules/buildings/services/building-assignment.service"
    );

    await expect(
      linkBuildingToManagementCompany({
        context: repContext(),
        buildingId: BUILDING_ID,
        managementCompanyId: COMPANY_PUBLIC_ID,
      }),
    ).rejects.toMatchObject({ code: OrganizationErrorCode.FORBIDDEN });
  });

  it("rolls back link when mandatory audit fails", async () => {
    buildingFindOne.mockReturnValue({
      lean: async () => ({ buildingId: BUILDING_ID, managementCompanyId: null }),
    });
    mockRecordLinked.mockReset();
    mockRecordLinked.mockRejectedValue(new AuditWriteFailedError());

    const { linkBuildingToManagementCompany } = await import(
      "@/modules/buildings/services/building-assignment.service"
    );

    await expect(
      linkBuildingToManagementCompany({
        context: lawyerContext(),
        buildingId: BUILDING_ID,
        managementCompanyId: COMPANY_PUBLIC_ID,
      }),
    ).rejects.toMatchObject({ code: OrganizationErrorCode.AUDIT_PERSISTENCE });
  });

  it("unlinks and reassigns a building to another company", async () => {
    const otherCompanyId = "44444444-4444-4444-8444-444444444444";
    const otherDocId = "507f1f77bcf86cd799439022";

    buildingFindOne.mockReturnValue({
      lean: async () => ({
        buildingId: BUILDING_ID,
        managementCompanyId: new mongooseTypes.ObjectId(COMPANY_DOC_ID),
      }),
    });

    const { unlinkBuildingFromManagementCompany, linkBuildingToManagementCompany } = await import(
      "@/modules/buildings/services/building-assignment.service"
    );

    await unlinkBuildingFromManagementCompany({
      context: lawyerContext(),
      buildingId: BUILDING_ID,
      managementCompanyId: COMPANY_PUBLIC_ID,
    });

    expect(mockRecordUnlinked).toHaveBeenCalledWith(
      expect.objectContaining({
        buildingId: BUILDING_ID,
        managementCompanyId: COMPANY_PUBLIC_ID,
      }),
    );

    managementCompanyFindOne.mockReturnValue({
      lean: async () => ({
        _id: otherDocId,
        managementCompanyId: otherCompanyId,
        status: ManagementCompanyStatus.ACTIVE,
      }),
    });
    buildingFindOne.mockReturnValue({
      lean: async () => ({ buildingId: BUILDING_ID, managementCompanyId: null }),
    });

    await linkBuildingToManagementCompany({
      context: lawyerContext(),
      buildingId: BUILDING_ID,
      managementCompanyId: otherCompanyId,
    });

    expect(mockRecordLinked).toHaveBeenCalledWith(
      expect.objectContaining({ managementCompanyId: otherCompanyId }),
    );
  });

  it("rejects unlink when building is not linked to the company", async () => {
    buildingFindOne.mockReturnValue({
      lean: async () => ({
        buildingId: BUILDING_ID,
        managementCompanyId: new mongooseTypes.ObjectId("507f1f77bcf86cd799439033"),
      }),
    });

    const { unlinkBuildingFromManagementCompany } = await import(
      "@/modules/buildings/services/building-assignment.service"
    );

    await expect(
      unlinkBuildingFromManagementCompany({
        context: lawyerContext(),
        buildingId: BUILDING_ID,
        managementCompanyId: COMPANY_PUBLIC_ID,
      }),
    ).rejects.toMatchObject({ code: OrganizationErrorCode.CONFLICT });
  });
});
