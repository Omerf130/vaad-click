import { beforeEach, describe, expect, it, vi } from "vitest";

import { OrganizationErrorCode } from "@/modules/buildings/domain/organization-errors";
import { LawyerVerificationStatus } from "@/modules/buildings/domain/building-status";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";

const mockWithTransaction = vi.fn(async (fn: () => Promise<void>) => fn());
const mockEndSession = vi.fn();

vi.mock("mongoose", () => ({
  default: {
    startSession: () => ({
      withTransaction: mockWithTransaction,
      endSession: mockEndSession,
    }),
    Types: {
      ObjectId: class {
        constructor(public id: string) {}
      },
    },
  },
}));

const mockBuildingFindOne = vi.fn();
const mockBuildingCreate = vi.fn();
const mockUserFindById = vi.fn();
const mockCompanyFindById = vi.fn();

vi.mock("@/modules/buildings/infra/building.model", () => ({
  Building: {
    findOne: (...args: unknown[]) => mockBuildingFindOne(...args),
    create: (...args: unknown[]) => mockBuildingCreate(...args),
  },
}));

vi.mock("@/modules/users/infra/user.model", () => ({
  User: {
    findById: (...args: unknown[]) => mockUserFindById(...args),
  },
}));

vi.mock("@/modules/management-companies/infra/management-company.model", () => ({
  ManagementCompany: {
    findById: (...args: unknown[]) => mockCompanyFindById(...args),
  },
}));

const mockRecordCreated = vi.fn();
const mockRecordLinked = vi.fn();

vi.mock("@/modules/organizations/services/organization-audit.service", () => ({
  recordBuildingCreated: (...args: unknown[]) => mockRecordCreated(...args),
  recordManagementCompanyLinked: (...args: unknown[]) => mockRecordLinked(...args),
}));

vi.mock("@/shared/db/connect", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

const COMPANY_PUBLIC_ID = "22222222-2222-4222-8222-222222222222";
const COMPANY_DOC_ID = "507f1f77bcf86cd799439012";

const mcContext: AuthenticatedContext = {
  user: {
    id: "507f1f77bcf86cd799439011",
    email: "mc@test.com",
    fullName: "MC User",
    role: UserRole.MANAGEMENT_COMPANY,
    accountStatus: AccountStatus.ACTIVE,
  },
  session: {} as AuthenticatedContext["session"],
};

const payload = {
  displayName: "בניין חדש",
  address: { city: "תל אביב", street: "הרצל", houseNumber: "10" },
};

describe("createBuildingForManagementCompany", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuildingFindOne.mockReturnValue({ lean: async () => null });
    mockBuildingCreate.mockResolvedValue([{ buildingId: "new-id" }]);
    mockUserFindById.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({ managementCompanyId: COMPANY_DOC_ID }),
    });
    mockCompanyFindById.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({
        managementCompanyId: COMPANY_PUBLIC_ID,
        displayName: "חברה",
        status: "active",
      }),
    });
    mockRecordCreated.mockResolvedValue(undefined);
    mockRecordLinked.mockResolvedValue(undefined);
  });

  it("creates building linked to authenticated management company with not_started verification", async () => {
    const { createBuildingForManagementCompany } = await import(
      "@/modules/buildings/services/management-company-building.service"
    );
    const result = await createBuildingForManagementCompany({
      context: mcContext,
      payload,
    });
    expect(result.buildingId).toBeTruthy();
    expect(mockBuildingCreate).toHaveBeenCalled();
    const createArg = mockBuildingCreate.mock.calls[0]?.[0]?.[0];
    expect(createArg.lawyerVerificationStatus).toBe(LawyerVerificationStatus.NOT_STARTED);
    expect(createArg.managementCompanyId).toBeTruthy();
    expect(mockRecordCreated).toHaveBeenCalled();
    expect(mockRecordLinked).toHaveBeenCalledWith(
      expect.objectContaining({ managementCompanyId: COMPANY_PUBLIC_ID }),
    );
  });

  it("rejects building rep", async () => {
    const { createBuildingForManagementCompany } = await import(
      "@/modules/buildings/services/management-company-building.service"
    );
    await expect(
      createBuildingForManagementCompany({
        context: {
          ...mcContext,
          user: { ...mcContext.user, role: UserRole.BUILDING_REP },
        },
        payload,
      }),
    ).rejects.toMatchObject({ code: OrganizationErrorCode.FORBIDDEN });
  });

  it("rejects pending management company user", async () => {
    const { createBuildingForManagementCompany } = await import(
      "@/modules/buildings/services/management-company-building.service"
    );
    await expect(
      createBuildingForManagementCompany({
        context: {
          ...mcContext,
          user: { ...mcContext.user, accountStatus: AccountStatus.PENDING_APPROVAL },
        },
        payload,
      }),
    ).rejects.toMatchObject({ code: OrganizationErrorCode.INVALID_ACCOUNT_STATUS });
  });

  it("rejects duplicate active address without exception path", async () => {
    mockBuildingFindOne.mockReturnValue({
      lean: async () => ({ buildingId: "existing" }),
    });
    const { createBuildingForManagementCompany } = await import(
      "@/modules/buildings/services/management-company-building.service"
    );
    await expect(
      createBuildingForManagementCompany({ context: mcContext, payload }),
    ).rejects.toMatchObject({ code: OrganizationErrorCode.DUPLICATE_ADDRESS });
    expect(mockBuildingCreate).not.toHaveBeenCalled();
  });
});
