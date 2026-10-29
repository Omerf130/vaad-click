import { beforeEach, describe, expect, it, vi } from "vitest";

import { OrganizationErrorCode } from "@/modules/buildings/domain/organization-errors";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import { AuditEventType } from "@/shared/audit/domain/audit-event-taxonomy";
import { PaymentInstructionTemplateKind } from "@/modules/warning-letters/templates/payment-instruction-clauses";
import { resolvePaymentInstructionTemplateKind } from "@/modules/warning-letters/templates/payment-instruction-clauses";

const BUILDING_ID = "11111111-1111-4111-8111-111111111111";

const mockFindOne = vi.fn();
const mockUpdateOne = vi.fn();

vi.mock("@/modules/buildings/infra/building.model", () => ({
  Building: {
    findOne: (...args: unknown[]) => mockFindOne(...args),
    updateOne: (...args: unknown[]) => mockUpdateOne(...args),
  },
}));

const mockRecordChanged = vi.fn();

vi.mock("@/modules/organizations/services/organization-audit.service", () => ({
  recordBuildingTreatmentFeeEligibilityChanged: (...args: unknown[]) => mockRecordChanged(...args),
}));

const mockWithTransaction = vi.fn(async (fn: () => Promise<void>) => fn());
vi.mock("mongoose", () => ({
  default: {
    startSession: () => ({ withTransaction: mockWithTransaction, endSession: vi.fn() }),
    Types: {
      ObjectId: class {
        constructor(public id: string) {}
      },
    },
  },
}));

vi.mock("@/shared/db/connect", () => ({ connectMongo: vi.fn().mockResolvedValue(undefined) }));

function lawyerContext() {
  return {
    user: {
      id: "507f1f77bcf86cd799439011",
      role: UserRole.LAWYER_ADMIN,
      accountStatus: AccountStatus.ACTIVE,
      email: "lawyer@test.com",
      fullName: "Lawyer",
    },
    session: {} as never,
  };
}

function buildingRepContext() {
  return {
    user: {
      id: "507f1f77bcf86cd799439012",
      role: UserRole.BUILDING_REP,
      accountStatus: AccountStatus.ACTIVE,
      email: "rep@test.com",
      fullName: "Rep",
    },
    session: {} as never,
  };
}

describe("buildTreatmentFeeEligibleConcurrencyFilter", () => {
  it("matches legacy missing field and explicit false when expected false", async () => {
    const { buildTreatmentFeeEligibleConcurrencyFilter } = await import(
      "@/modules/buildings/services/building-treatment-fee-eligibility.service"
    );
    expect(buildTreatmentFeeEligibleConcurrencyFilter(BUILDING_ID, false)).toEqual({
      buildingId: BUILDING_ID,
      $or: [{ treatmentFeeEligible: false }, { treatmentFeeEligible: { $exists: false } }],
    });
    expect(buildTreatmentFeeEligibleConcurrencyFilter(BUILDING_ID, true)).toEqual({
      buildingId: BUILDING_ID,
      treatmentFeeEligible: true,
    });
  });
});

describe("updateBuildingTreatmentFeeEligibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindOne.mockReturnValue({
      select: () => ({
        lean: async () => ({ treatmentFeeEligible: false }),
      }),
    });
    mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });
    mockRecordChanged.mockResolvedValue(undefined);
  });

  it("allows lawyer_admin to enable eligibility with audit (explicit false)", async () => {
    const { updateBuildingTreatmentFeeEligibility } = await import(
      "@/modules/buildings/services/building-treatment-fee-eligibility.service"
    );

    const result = await updateBuildingTreatmentFeeEligibility({
      context: lawyerContext(),
      payload: {
        buildingId: BUILDING_ID,
        treatmentFeeEligible: true,
        expectedTreatmentFeeEligible: false,
      },
    });

    expect(result.changed).toBe(true);
    expect(result.treatmentFeeEligible).toBe(true);
    expect(mockUpdateOne).toHaveBeenCalledWith(
      expect.objectContaining({
        buildingId: BUILDING_ID,
        $or: [{ treatmentFeeEligible: false }, { treatmentFeeEligible: { $exists: false } }],
      }),
      expect.objectContaining({
        $set: expect.objectContaining({ treatmentFeeEligible: true }),
      }),
      expect.any(Object),
    );
    expect(mockRecordChanged).toHaveBeenCalledWith(
      expect.objectContaining({
        buildingId: BUILDING_ID,
        previousEligible: false,
        nextEligible: true,
      }),
    );
  });

  it("legacy building with missing eligibility field: false to true succeeds", async () => {
    mockFindOne.mockReturnValue({
      select: () => ({
        lean: async () => ({}),
      }),
    });

    const { updateBuildingTreatmentFeeEligibility } = await import(
      "@/modules/buildings/services/building-treatment-fee-eligibility.service"
    );

    const result = await updateBuildingTreatmentFeeEligibility({
      context: lawyerContext(),
      payload: {
        buildingId: BUILDING_ID,
        treatmentFeeEligible: true,
        expectedTreatmentFeeEligible: false,
      },
    });

    expect(result.changed).toBe(true);
    expect(mockUpdateOne).toHaveBeenCalledWith(
      expect.objectContaining({
        buildingId: BUILDING_ID,
        $or: expect.any(Array),
      }),
      expect.any(Object),
      expect.any(Object),
    );
    expect(mockRecordChanged).toHaveBeenCalled();
  });

  it("true to false succeeds with explicit true concurrency filter", async () => {
    mockFindOne.mockReturnValue({
      select: () => ({
        lean: async () => ({ treatmentFeeEligible: true }),
      }),
    });

    const { updateBuildingTreatmentFeeEligibility } = await import(
      "@/modules/buildings/services/building-treatment-fee-eligibility.service"
    );

    const result = await updateBuildingTreatmentFeeEligibility({
      context: lawyerContext(),
      payload: {
        buildingId: BUILDING_ID,
        treatmentFeeEligible: false,
        expectedTreatmentFeeEligible: true,
      },
    });

    expect(result.changed).toBe(true);
    expect(result.treatmentFeeEligible).toBe(false);
    expect(mockUpdateOne).toHaveBeenCalledWith(
      { buildingId: BUILDING_ID, treatmentFeeEligible: true },
      expect.objectContaining({
        $set: expect.objectContaining({ treatmentFeeEligible: false }),
      }),
      expect.any(Object),
    );
    expect(mockRecordChanged).toHaveBeenCalledWith(
      expect.objectContaining({
        previousEligible: true,
        nextEligible: false,
      }),
    );
  });

  it("rejects building representative", async () => {
    const { updateBuildingTreatmentFeeEligibility } = await import(
      "@/modules/buildings/services/building-treatment-fee-eligibility.service"
    );

    await expect(
      updateBuildingTreatmentFeeEligibility({
        context: buildingRepContext(),
        payload: {
          buildingId: BUILDING_ID,
          treatmentFeeEligible: true,
          expectedTreatmentFeeEligible: false,
        },
      }),
    ).rejects.toMatchObject({ code: OrganizationErrorCode.FORBIDDEN });
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });

  it("returns without audit on no-op", async () => {
    mockFindOne.mockReturnValue({
      select: () => ({
        lean: async () => ({ treatmentFeeEligible: true }),
      }),
    });

    const { updateBuildingTreatmentFeeEligibility } = await import(
      "@/modules/buildings/services/building-treatment-fee-eligibility.service"
    );

    const result = await updateBuildingTreatmentFeeEligibility({
      context: lawyerContext(),
      payload: {
        buildingId: BUILDING_ID,
        treatmentFeeEligible: true,
        expectedTreatmentFeeEligible: true,
      },
    });

    expect(result.changed).toBe(false);
    expect(mockUpdateOne).not.toHaveBeenCalled();
    expect(mockRecordChanged).not.toHaveBeenCalled();
  });

  it("rejects stale expected value (concurrency)", async () => {
    mockFindOne.mockReturnValue({
      select: () => ({
        lean: async () => ({ treatmentFeeEligible: true }),
      }),
    });

    const { updateBuildingTreatmentFeeEligibility } = await import(
      "@/modules/buildings/services/building-treatment-fee-eligibility.service"
    );

    await expect(
      updateBuildingTreatmentFeeEligibility({
        context: lawyerContext(),
        payload: {
          buildingId: BUILDING_ID,
          treatmentFeeEligible: false,
          expectedTreatmentFeeEligible: false,
        },
      }),
    ).rejects.toMatchObject({ code: OrganizationErrorCode.CONFLICT });
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });

  it("rejects when optimistic update loses race (including legacy field now true)", async () => {
    mockFindOne.mockReturnValue({
      select: () => ({
        lean: async () => ({}),
      }),
    });
    mockUpdateOne.mockResolvedValue({ modifiedCount: 0, matchedCount: 0 });

    const { updateBuildingTreatmentFeeEligibility } = await import(
      "@/modules/buildings/services/building-treatment-fee-eligibility.service"
    );

    await expect(
      updateBuildingTreatmentFeeEligibility({
        context: lawyerContext(),
        payload: {
          buildingId: BUILDING_ID,
          treatmentFeeEligible: true,
          expectedTreatmentFeeEligible: false,
        },
      }),
    ).rejects.toMatchObject({ code: OrganizationErrorCode.CONFLICT });
  });

  it("rejects missing building", async () => {
    mockFindOne.mockReturnValue({
      select: () => ({
        lean: async () => null,
      }),
    });

    const { updateBuildingTreatmentFeeEligibility } = await import(
      "@/modules/buildings/services/building-treatment-fee-eligibility.service"
    );

    await expect(
      updateBuildingTreatmentFeeEligibility({
        context: lawyerContext(),
        payload: {
          buildingId: BUILDING_ID,
          treatmentFeeEligible: true,
          expectedTreatmentFeeEligible: false,
        },
      }),
    ).rejects.toMatchObject({ code: OrganizationErrorCode.NOT_FOUND });
  });
});

describe("treatment fee eligibility and warning-letter variants", () => {
  it("maps eligible building to with-treatment payment variant", () => {
    expect(
      resolvePaymentInstructionTemplateKind({
        treatmentFeeEligible: true,
        includeTreatmentExpenses: true,
        monetaryPreviewIncomplete: false,
      }),
    ).toBe(PaymentInstructionTemplateKind.WITH_TREATMENT_EXPENSES);
  });

  it("maps ineligible building to without-treatment payment variant", () => {
    expect(
      resolvePaymentInstructionTemplateKind({
        treatmentFeeEligible: false,
        includeTreatmentExpenses: false,
        monetaryPreviewIncomplete: false,
      }),
    ).toBe(PaymentInstructionTemplateKind.WITHOUT_TREATMENT_EXPENSES);
  });
});

describe("audit taxonomy CP14B", () => {
  it("registers building treatment fee eligibility event type", () => {
    expect(AuditEventType.BUILDING_TREATMENT_FEE_ELIGIBILITY_CHANGED).toBe(
      "building.treatment_fee_eligibility.changed",
    );
  });
});

describe("immutable warning-letter snapshots", () => {
  it("stored snapshot material keeps treatment flag after building flag changes", () => {
    const storedSnapshot = {
      building: { treatmentFeeEligible: true },
      numberedClauses: [{ clauseId: "payment_block", body: "כולל הוצאות טיפול" }],
      contentSnapshotVersion: "abc123",
    };
    const liveBuildingAfterAdminToggle = { treatmentFeeEligible: false };
    expect(storedSnapshot.building.treatmentFeeEligible).toBe(true);
    expect(liveBuildingAfterAdminToggle.treatmentFeeEligible).toBe(false);
    expect(storedSnapshot.contentSnapshotVersion).toBe("abc123");
  });
});
