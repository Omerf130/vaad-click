import { beforeEach, describe, expect, it, vi } from "vitest";

import { OrganizationErrorCode } from "@/modules/buildings/domain/organization-errors";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";

const mockFindOne = vi.fn();
const mockFindOneAndUpdate = vi.fn();
const mockCreate = vi.fn();

vi.mock("@/modules/buildings/infra/building.model", () => ({
  Building: {
    findOne: (...args: unknown[]) => mockFindOne(...args),
    findOneAndUpdate: (...args: unknown[]) => mockFindOneAndUpdate(...args),
    create: (...args: unknown[]) => mockCreate(...args),
  },
}));

const mockRecordUpdated = vi.fn();
const mockRecordDuplicate = vi.fn();

vi.mock("@/modules/organizations/services/organization-audit.service", () => ({
  recordBuildingUpdated: (...args: unknown[]) => mockRecordUpdated(...args),
  recordDuplicateAddressException: (...args: unknown[]) => mockRecordDuplicate(...args),
  recordBuildingCreated: vi.fn(),
}));

const mockWithTransaction = vi.fn(async (fn: () => Promise<void>) => fn());
vi.mock("mongoose", () => ({
  default: {
    startSession: () => ({ withTransaction: mockWithTransaction, endSession: vi.fn() }),
    Types: { ObjectId: class { constructor(public id: string) {} } },
  },
}));

vi.mock("@/shared/db/connect", () => ({ connectMongo: vi.fn().mockResolvedValue(undefined) }));

const BUILDING_ID = "11111111-1111-4111-8111-111111111111";

describe("updateBuildingRecord", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindOne.mockResolvedValue({
      lean: async () => ({
        buildingId: BUILDING_ID,
        normalizedAddressKey: "tel aviv|herzl|1",
        organizationalStatus: "active",
      }),
    });
    mockFindOneAndUpdate.mockResolvedValue({ lean: async () => ({}) });
    mockRecordUpdated.mockResolvedValue(undefined);
  });

  it("rejects duplicate address without exception reason", async () => {
    mockFindOne
      .mockReturnValueOnce({
        lean: async () => ({
          buildingId: BUILDING_ID,
          normalizedAddressKey: "old",
        }),
      })
      .mockReturnValueOnce({
        lean: async () => ({ buildingId: "other" }),
      });

    const { updateBuildingRecord } = await import(
      "@/modules/buildings/services/building-lifecycle.service"
    );

    await expect(
      updateBuildingRecord({
        context: {
          user: {
            id: "507f1f77bcf86cd799439011",
            role: UserRole.LAWYER_ADMIN,
            accountStatus: AccountStatus.ACTIVE,
            email: "lawyer@test.com",
            fullName: "Lawyer",
          },
          session: {} as never,
        },
        payload: {
          buildingId: BUILDING_ID,
          displayName: "B",
          address: { city: "Tel Aviv", street: "Herzl", houseNumber: "2" },
        },
      }),
    ).rejects.toMatchObject({ code: OrganizationErrorCode.DUPLICATE_ADDRESS });
  });
});
