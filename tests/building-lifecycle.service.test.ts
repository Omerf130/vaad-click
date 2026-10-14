import { beforeEach, describe, expect, it, vi } from "vitest";

import { OrganizationErrorCode } from "@/modules/buildings/domain/organization-errors";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { AuditWriteFailedError } from "@/shared/audit/errors/audit-errors";

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

const mockFindOne = vi.fn();
const mockCreate = vi.fn();

vi.mock("@/modules/buildings/infra/building.model", () => ({
  Building: {
    findOne: (...args: unknown[]) => mockFindOne(...args),
    create: (...args: unknown[]) => mockCreate(...args),
  },
}));

const mockRecordCreated = vi.fn();
const mockRecordDuplicate = vi.fn();

vi.mock("@/modules/organizations/services/organization-audit.service", () => ({
  recordBuildingCreated: (...args: unknown[]) => mockRecordCreated(...args),
  recordDuplicateAddressException: (...args: unknown[]) => mockRecordDuplicate(...args),
}));

vi.mock("@/shared/db/connect", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

function lawyerContext(): AuthenticatedContext {
  return {
    user: {
      id: "507f1f77bcf86cd799439011",
      email: "lawyer@firm.com",
      fullName: "Lawyer",
      role: UserRole.LAWYER_ADMIN,
      accountStatus: AccountStatus.ACTIVE,
    },
    session: {} as AuthenticatedContext["session"],
  };
}

const payload = {
  displayName: "Building A",
  address: { city: "Tel Aviv", street: "Herzl", houseNumber: "1" },
};

describe("createBuildingRecord", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindOne
      .mockReturnValueOnce({ lean: async () => null })
      .mockReturnValue({ lean: async () => ({ buildingId: "b-1" }) });
    mockCreate.mockResolvedValue([{ buildingId: "b-1" }]);
    mockRecordCreated.mockResolvedValue(undefined);
    mockRecordDuplicate.mockResolvedValue(undefined);
  });

  it("rejects duplicate address without lawyer exception reason", async () => {
    mockFindOne.mockReset();
    mockFindOne.mockReturnValue({
      lean: async () => ({ buildingId: "existing", normalizedAddressKey: "tel aviv|herzl|1" }),
    });

    const { createBuildingRecord } = await import(
      "@/modules/buildings/services/building-lifecycle.service"
    );

    await expect(
      createBuildingRecord({ context: lawyerContext(), payload }),
    ).rejects.toMatchObject({ code: OrganizationErrorCode.DUPLICATE_ADDRESS });
  });

  it("records duplicate-address exception audit when reason is provided", async () => {
    mockFindOne.mockReset();
    mockFindOne
      .mockReturnValueOnce({ lean: async () => ({ buildingId: "existing" }) })
      .mockReturnValue({ lean: async () => ({ buildingId: "b-1" }) });

    const { createBuildingRecord } = await import(
      "@/modules/buildings/services/building-lifecycle.service"
    );

    await createBuildingRecord({
      context: lawyerContext(),
      payload: { ...payload, duplicateAddressExceptionReason: "Distinct entrances" },
    });

    expect(mockRecordDuplicate).toHaveBeenCalled();
    expect(mockCreate).toHaveBeenCalled();
  });

  it("rolls back when building audit fails", async () => {
    mockFindOne.mockReset();
    mockFindOne.mockReturnValue({ lean: async () => null });
    mockRecordCreated.mockRejectedValue(new AuditWriteFailedError());

    const { createBuildingRecord } = await import(
      "@/modules/buildings/services/building-lifecycle.service"
    );

    await expect(
      createBuildingRecord({ context: lawyerContext(), payload }),
    ).rejects.toMatchObject({ code: OrganizationErrorCode.AUDIT_PERSISTENCE });
  });
});
