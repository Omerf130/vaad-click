import { beforeEach, describe, expect, it, vi } from "vitest";

import { OrganizationErrorCode } from "@/modules/buildings/domain/organization-errors";
import { PendingBuildingOnboardingStatus } from "@/modules/debt-cases/domain/pending-building-onboarding-status";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import { AuditEventType } from "@/shared/audit/domain/audit-event-taxonomy";
import { BuildingScopeMode } from "@/shared/auth/building-access/building-access-scope.types";
import { deriveBuildingAccessScope } from "@/shared/auth/building-access/derive-building-access-scope";

const BUILDING_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_BUILDING_ID = "22222222-2222-4222-8222-222222222222";
const ONBOARDING_ID = "33333333-3333-4333-8333-333333333333";
const USER_ID = "507f1f77bcf86cd799439011";
const LAWYER_ID = "507f1f77bcf86cd799439012";

const mockPendingFindOne = vi.fn();
const mockPendingUpdateOne = vi.fn();
const mockBuildingFindOne = vi.fn();
const mockUserFindById = vi.fn();

vi.mock("@/modules/debt-cases/infra/pending-building-onboarding-request.model", () => ({
  PendingBuildingOnboardingRequest: {
    findOne: (...args: unknown[]) => mockPendingFindOne(...args),
    updateOne: (...args: unknown[]) => mockPendingUpdateOne(...args),
    create: vi.fn(),
    updateMany: vi.fn(),
  },
}));

vi.mock("@/modules/buildings/infra/building.model", () => ({
  Building: {
    findOne: (...args: unknown[]) => mockBuildingFindOne(...args),
    find: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock("@/modules/users/infra/user.model", () => ({
  User: {
    findById: (...args: unknown[]) => mockUserFindById(...args),
  },
}));

const mockRecordBound = vi.fn();
vi.mock("@/modules/organizations/services/organization-audit.service", () => ({
  recordPendingOnboardingBound: (...args: unknown[]) => mockRecordBound(...args),
}));

const mockAssignRep = vi.fn();
const mockLinkMc = vi.fn();
vi.mock("@/modules/buildings/services/building-assignment.service", () => ({
  assignBuildingRepresentative: (...args: unknown[]) => mockAssignRep(...args),
  linkBuildingToManagementCompany: (...args: unknown[]) => mockLinkMc(...args),
}));

const mockWithTransaction = vi.fn(async (fn: () => Promise<void>) => fn());
vi.mock("mongoose", async (importOriginal) => {
  const actual = await importOriginal<typeof import("mongoose")>();
  return {
    ...actual,
    default: {
      ...actual.default,
      startSession: () => ({ withTransaction: mockWithTransaction, endSession: vi.fn() }),
    },
  };
});

vi.mock("@/modules/management-companies/infra/management-company.model", () => ({
  ManagementCompany: {
    findById: vi.fn(),
  },
}));

vi.mock("@/shared/db/connect", () => ({ connectMongo: vi.fn().mockResolvedValue(undefined) }));

function lawyerContext() {
  return {
    user: {
      id: LAWYER_ID,
      role: UserRole.LAWYER_ADMIN,
      accountStatus: AccountStatus.ACTIVE,
      email: "lawyer@test.com",
      fullName: "Lawyer",
    },
    session: {} as never,
  };
}

describe("bindPendingOnboardingToBuilding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuildingFindOne.mockReturnValue({
      lean: async () => ({ buildingId: BUILDING_ID }),
    });
    mockPendingFindOne.mockReturnValue({
      lean: async () => ({
        onboardingRequestId: ONBOARDING_ID,
        userId: USER_ID,
        status: PendingBuildingOnboardingStatus.OPEN,
        buildingId: null,
      }),
    });
    mockPendingUpdateOne.mockResolvedValue({ modifiedCount: 1 });
    mockRecordBound.mockResolvedValue(undefined);
  });

  it("binds open onboarding request with mandatory audit", async () => {
    const { bindPendingOnboardingToBuilding } = await import(
      "@/modules/debt-cases/services/pending-building-onboarding.service"
    );

    const result = await bindPendingOnboardingToBuilding({
      context: lawyerContext(),
      targetUserId: USER_ID,
      onboardingRequestId: ONBOARDING_ID,
      buildingId: BUILDING_ID,
      expectedOnboardingStatus: PendingBuildingOnboardingStatus.OPEN,
    });

    expect(result.changed).toBe(true);
    expect(mockPendingUpdateOne).toHaveBeenCalled();
    expect(mockRecordBound).toHaveBeenCalledWith(
      expect.objectContaining({
        targetUserId: USER_ID,
        buildingId: BUILDING_ID,
        previousBuildingId: null,
      }),
    );
  });

  it("skips audit on no-op when already bound to same building", async () => {
    mockPendingFindOne.mockReturnValue({
      lean: async () => ({
        onboardingRequestId: ONBOARDING_ID,
        userId: USER_ID,
        status: PendingBuildingOnboardingStatus.BOUND,
        buildingId: BUILDING_ID,
      }),
    });

    const { bindPendingOnboardingToBuilding } = await import(
      "@/modules/debt-cases/services/pending-building-onboarding.service"
    );

    const result = await bindPendingOnboardingToBuilding({
      context: lawyerContext(),
      targetUserId: USER_ID,
      onboardingRequestId: ONBOARDING_ID,
      buildingId: BUILDING_ID,
      expectedOnboardingStatus: PendingBuildingOnboardingStatus.BOUND,
      expectedBoundBuildingId: BUILDING_ID,
    });

    expect(result.changed).toBe(false);
    expect(mockRecordBound).not.toHaveBeenCalled();
  });

  it("rejects concurrent update when modifiedCount is zero", async () => {
    mockPendingUpdateOne.mockResolvedValue({ modifiedCount: 0 });

    const { bindPendingOnboardingToBuilding } = await import(
      "@/modules/debt-cases/services/pending-building-onboarding.service"
    );

    await expect(
      bindPendingOnboardingToBuilding({
        context: lawyerContext(),
        targetUserId: USER_ID,
        onboardingRequestId: ONBOARDING_ID,
        buildingId: BUILDING_ID,
        expectedOnboardingStatus: PendingBuildingOnboardingStatus.OPEN,
      }),
    ).rejects.toMatchObject({ code: "DEBT_CASE_FORBIDDEN" });
  });
});

describe("bindUserPendingOnboardingBuilding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuildingFindOne.mockImplementation((query: Record<string, unknown>) => {
      if (query.designatedRepresentativeUserId && query.buildingId) {
        return { lean: async () => null };
      }
      return {
        lean: async () => ({
          buildingId: BUILDING_ID,
          designatedRepresentativeUserId: null,
          organizationalStatus: "active",
        }),
      };
    });
    mockPendingFindOne.mockReturnValue({
      lean: async () => ({
        onboardingRequestId: ONBOARDING_ID,
        userId: USER_ID,
        status: PendingBuildingOnboardingStatus.OPEN,
        buildingId: null,
      }),
    });
    mockPendingUpdateOne.mockResolvedValue({ modifiedCount: 1 });
    mockRecordBound.mockResolvedValue(undefined);
    mockAssignRep.mockResolvedValue(undefined);
    mockLinkMc.mockResolvedValue(undefined);
  });

  it("rejects building_rep with existing assignment to another building", async () => {
    const mongoose = await import("mongoose");
    const userObjectId = new mongoose.Types.ObjectId(USER_ID);

    mockUserFindById.mockReturnValue({
      lean: async () => ({
        _id: userObjectId,
        email: "rep@test.com",
        role: UserRole.BUILDING_REP,
        accountStatus: AccountStatus.ACTIVE,
      }),
    });

    mockBuildingFindOne.mockImplementation((query: Record<string, unknown>) => {
      if (query.designatedRepresentativeUserId && query.buildingId) {
        return { lean: async () => ({ buildingId: OTHER_BUILDING_ID }) };
      }
      return {
        lean: async () => ({
          buildingId: BUILDING_ID,
          designatedRepresentativeUserId: null,
        }),
      };
    });

    const { bindUserPendingOnboardingBuilding } = await import(
      "@/modules/users/services/admin-user-onboarding.service"
    );

    await expect(
      bindUserPendingOnboardingBuilding({
        context: lawyerContext(),
        payload: {
          targetUserId: USER_ID,
          onboardingRequestId: ONBOARDING_ID,
          buildingId: BUILDING_ID,
          expectedOnboardingStatus: PendingBuildingOnboardingStatus.OPEN,
          expectedBoundBuildingId: null,
        },
      }),
    ).rejects.toMatchObject({ code: OrganizationErrorCode.REP_ALREADY_ASSIGNED });
  });

  it("binds pending user without operational assignment", async () => {
    const mongoose = await import("mongoose");
    mockUserFindById.mockReturnValue({
      lean: async () => ({
        _id: new mongoose.Types.ObjectId(USER_ID),
        email: "rep@test.com",
        role: UserRole.BUILDING_REP,
        accountStatus: AccountStatus.PENDING_APPROVAL,
      }),
    });
    const { bindUserPendingOnboardingBuilding } = await import(
      "@/modules/users/services/admin-user-onboarding.service"
    );

    const result = await bindUserPendingOnboardingBuilding({
      context: lawyerContext(),
      payload: {
        targetUserId: USER_ID,
        onboardingRequestId: ONBOARDING_ID,
        buildingId: BUILDING_ID,
        expectedOnboardingStatus: PendingBuildingOnboardingStatus.OPEN,
        expectedBoundBuildingId: null,
      },
    });

    expect(result.onboardingChanged).toBe(true);
    expect(result.operationalAssignmentApplied).toBe(false);
    expect(mockAssignRep).not.toHaveBeenCalled();
  });

  it("applies representative assignment for active building_rep", async () => {
    const mongoose = await import("mongoose");
    mockUserFindById.mockReturnValue({
      lean: async () => ({
        _id: new mongoose.Types.ObjectId(USER_ID),
        email: "rep@test.com",
        role: UserRole.BUILDING_REP,
        accountStatus: AccountStatus.ACTIVE,
      }),
    });
    const { bindUserPendingOnboardingBuilding } = await import(
      "@/modules/users/services/admin-user-onboarding.service"
    );

    const result = await bindUserPendingOnboardingBuilding({
      context: lawyerContext(),
      payload: {
        targetUserId: USER_ID,
        onboardingRequestId: ONBOARDING_ID,
        buildingId: BUILDING_ID,
        expectedOnboardingStatus: PendingBuildingOnboardingStatus.OPEN,
        expectedBoundBuildingId: null,
      },
    });

    expect(result.operationalAssignmentApplied).toBe(true);
    expect(mockAssignRep).toHaveBeenCalled();
  });

  it("rejects self-assignment by lawyer", async () => {
    const { bindUserPendingOnboardingBuilding } = await import(
      "@/modules/users/services/admin-user-onboarding.service"
    );

    await expect(
      bindUserPendingOnboardingBuilding({
        context: lawyerContext(),
        payload: {
          targetUserId: LAWYER_ID,
          onboardingRequestId: ONBOARDING_ID,
          buildingId: BUILDING_ID,
          expectedOnboardingStatus: PendingBuildingOnboardingStatus.OPEN,
          expectedBoundBuildingId: null,
        },
      }),
    ).rejects.toMatchObject({ code: OrganizationErrorCode.FORBIDDEN });
  });
});

describe("portal access scope CP14C", () => {
  it("pending accounts remain denied for building portal scope", () => {
    const scope = deriveBuildingAccessScope({
      role: UserRole.BUILDING_REP,
      accountStatus: AccountStatus.PENDING_APPROVAL,
      representativeBuildingPublicId: null,
      managementCompanyBuildingPublicIds: [],
    });
    expect(scope.mode).toBe(BuildingScopeMode.DENIED);
  });

  it("active assigned rep receives assigned scope", () => {
    const scope = deriveBuildingAccessScope({
      role: UserRole.BUILDING_REP,
      accountStatus: AccountStatus.ACTIVE,
      representativeBuildingPublicId: BUILDING_ID,
      managementCompanyBuildingPublicIds: [],
    });
    expect(scope.mode).toBe(BuildingScopeMode.ASSIGNED);
    expect(scope.buildingIds).toEqual([BUILDING_ID]);
  });
});

describe("audit taxonomy CP14C", () => {
  it("registers pending onboarding bound event", () => {
    expect(AuditEventType.USER_ADMIN_PENDING_ONBOARDING_BOUND).toBe(
      "user_admin.pending_onboarding.bound",
    );
  });
});
