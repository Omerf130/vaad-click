import { beforeEach, describe, expect, it, vi } from "vitest";

import { AccountStatus } from "@/modules/users/domain/account-status";
import { DebtCaseError } from "@/modules/debt-cases/domain/debt-case-errors";

const USER_ID = "507f1f77bcf86cd799439011";
const mockSession = { id: "mongo-session" };

const mockLean = vi.fn();
const mockQuerySession = vi.fn();
const mockFindById = vi.fn();
const mockOnboardingCreate = vi.fn();

vi.mock("@/shared/db/connect", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/modules/buildings/infra/building.model", () => ({
  Building: { findOne: vi.fn() },
}));

vi.mock("@/modules/organizations/services/organization-audit.service", () => ({
  recordPendingOnboardingBound: vi.fn(),
}));

vi.mock("@/modules/users/infra/user.model", () => ({
  User: {
    findById: (...args: unknown[]) => mockFindById(...args),
  },
}));

vi.mock("@/modules/debt-cases/infra/pending-building-onboarding-request.model", () => ({
  PendingBuildingOnboardingRequest: {
    create: (...args: unknown[]) => mockOnboardingCreate(...args),
  },
}));

describe("createPendingBuildingOnboardingRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuerySession.mockReturnValue({ lean: mockLean });
    mockFindById.mockReturnValue({ session: mockQuerySession, lean: mockLean });
    mockLean.mockResolvedValue({
      _id: USER_ID,
      accountStatus: AccountStatus.PENDING_APPROVAL,
    });
    mockOnboardingCreate.mockResolvedValue(undefined);
  });

  it("reads the user within the same MongoDB session when provided", async () => {
    const { createPendingBuildingOnboardingRequest } = await import(
      "@/modules/debt-cases/services/pending-building-onboarding.service"
    );

    await createPendingBuildingOnboardingRequest({
      targetUserId: USER_ID,
      createdByUserId: USER_ID,
      session: mockSession as never,
    });

    expect(mockFindById).toHaveBeenCalledWith(USER_ID);
    expect(mockQuerySession).toHaveBeenCalledWith(mockSession);
    expect(mockOnboardingCreate).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ session: mockSession }),
    );
  });

  it("allows active operator accounts to open onboarding", async () => {
    mockLean.mockResolvedValue({
      _id: USER_ID,
      accountStatus: AccountStatus.ACTIVE,
    });

    const { createPendingBuildingOnboardingRequest } = await import(
      "@/modules/debt-cases/services/pending-building-onboarding.service"
    );

    await createPendingBuildingOnboardingRequest({
      targetUserId: USER_ID,
      createdByUserId: USER_ID,
    });
    expect(mockOnboardingCreate).toHaveBeenCalled();
  });

  it("rejects rejected accounts", async () => {
    mockLean.mockResolvedValue({
      _id: USER_ID,
      accountStatus: AccountStatus.REJECTED,
    });

    const { createPendingBuildingOnboardingRequest } = await import(
      "@/modules/debt-cases/services/pending-building-onboarding.service"
    );

    await expect(
      createPendingBuildingOnboardingRequest({
        targetUserId: USER_ID,
        createdByUserId: USER_ID,
      }),
    ).rejects.toBeInstanceOf(DebtCaseError);
    expect(mockOnboardingCreate).not.toHaveBeenCalled();
  });
});
