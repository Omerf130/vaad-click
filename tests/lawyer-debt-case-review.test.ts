import { beforeEach, describe, expect, it, vi } from "vitest";

import { Types } from "mongoose";

import { DebtCaseErrorCode } from "@/modules/debt-cases/domain/debt-case-errors";
import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";

const mockFind = vi.fn();
const mockCount = vi.fn();
const mockDistinct = vi.fn();
const mockBuildingFind = vi.fn();
const mockBuildingFindOne = vi.fn();
const mockFindOne = vi.fn();
const mockFindOneAndUpdate = vi.fn();
const mockSession = vi.fn();
const mockGetDebtCase = vi.fn();
const mockLoadReadiness = vi.fn();
const mockRecordReturned = vi.fn();
const mockRecordRejected = vi.fn();
const mockRecordApproved = vi.fn();
const mockReleaseClaims = vi.fn();

vi.mock("@/shared/db/connect", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/modules/debt-cases/infra/debt-case.model", () => ({
  DebtCase: {
    find: (...args: unknown[]) => mockFind(...args),
    countDocuments: (...args: unknown[]) => mockCount(...args),
    distinct: (...args: unknown[]) => mockDistinct(...args),
    findOne: (...args: unknown[]) => mockFindOne(...args),
    findOneAndUpdate: (...args: unknown[]) => mockFindOneAndUpdate(...args),
  },
}));

vi.mock("@/modules/buildings/infra/building.model", () => ({
  Building: {
    find: (...args: unknown[]) => mockBuildingFind(...args),
    findOne: (...args: unknown[]) => mockBuildingFindOne(...args),
  },
}));

vi.mock("mongoose", async () => {
  const actual = await vi.importActual<typeof import("mongoose")>("mongoose");
  return {
    ...actual,
    default: {
      ...actual.default,
      startSession: (...args: unknown[]) => mockSession(...args),
    },
    startSession: (...args: unknown[]) => mockSession(...args),
  };
});

vi.mock("@/modules/debt-cases/services/debt-case.service", () => ({
  getDebtCase: (...args: unknown[]) => mockGetDebtCase(...args),
}));

vi.mock("@/modules/debt-cases/services/debt-case-legal-readiness.loader", () => ({
  loadBuildingLegalReadinessForDebtCase: (...args: unknown[]) => mockLoadReadiness(...args),
}));

vi.mock("@/modules/debt-cases/services/debt-case-audit.service", () => ({
  recordDebtCaseReturned: (...args: unknown[]) => mockRecordReturned(...args),
  recordDebtCaseRejected: (...args: unknown[]) => mockRecordRejected(...args),
  recordDebtCaseApprovedForLetterPrep: (...args: unknown[]) => mockRecordApproved(...args),
}));

vi.mock("@/modules/debt-cases/services/debt-case-period-claim.service", () => ({
  releaseClaimsForTerminalCase: (...args: unknown[]) => mockReleaseClaims(...args),
}));

const mockSyncWarningLetterDraft = vi.fn().mockResolvedValue({
  draftId: "draft-1",
  created: true,
  draftRevision: 1,
});

vi.mock("@/modules/warning-letters/services/warning-letter-draft.service", () => ({
  syncInitialWarningLetterDraftForApprovedCase: (...args: unknown[]) =>
    mockSyncWarningLetterDraft(...args),
}));

const mockNotifyOutcome = vi.fn().mockResolvedValue(undefined);

vi.mock("@/modules/notifications/services/notification-dispatch.service", () => ({
  notifyOperatorsDebtCaseReviewOutcome: (...args: unknown[]) => mockNotifyOutcome(...args),
}));

const lawyerContext: AuthenticatedContext = {
  user: {
    id: "aaaaaaaaaaaaaaaaaaaaaaaa",
    email: "lawyer@test.com",
    role: UserRole.LAWYER_ADMIN,
    accountStatus: AccountStatus.ACTIVE,
  },
} as AuthenticatedContext;

const repContext: AuthenticatedContext = {
  user: {
    id: "bbbbbbbbbbbbbbbbbbbbbbbb",
    email: "rep@test.com",
    role: UserRole.BUILDING_REP,
    accountStatus: AccountStatus.ACTIVE,
  },
} as AuthenticatedContext;

const CASE_ID = "33333333-3333-4333-8333-333333333333";
const BUILDING_ID = "11111111-1111-4111-8111-111111111111";
const USER_OID = new Types.ObjectId("507f1f77bcf86cd799439011");

function mockUpdatedApprovedDoc(revision: number) {
  return {
    debtCaseId: CASE_ID,
    buildingId: BUILDING_ID,
    workflowStatus: DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW,
    lawyerReviewStatus: DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP,
    revision,
    apartmentNumberDisplay: "12",
    apartmentKeyNormalized: "12",
    validationFlags: [],
    legalHoldReasons: [],
    debtType: "regular_vaad",
    principalAmountMinor: 50_000,
    periodStartMonth: "2024-01",
    periodEndMonth: "2024-06",
    letterDeliveryStatus: "not_sent",
    paymentStatus: "unpaid",
    createdByUserId: USER_OID,
    updatedByUserId: USER_OID,
    submittedAt: new Date("2024-06-01T10:00:00.000Z"),
    createdAt: new Date("2024-05-01T10:00:00.000Z"),
    updatedAt: new Date("2024-06-02T10:00:00.000Z"),
    parties: {
      propertyOwners: [
        {
          fullName: "ישראל ישראלי",
          identityDocumentType: null,
          identityNumber: null,
          mobileE164: "+972501111111",
          email: null,
        },
      ],
      occupancyType: "owner",
      legalDebtorDesignation: "property_owners",
      tenant: null,
      postalAddress: null,
    },
  };
}

function chainLean(rows: unknown[]) {
  return {
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(rows),
  };
}

describe("lawyer debt case review workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.mockResolvedValue({
      withTransaction: async (fn: (session: unknown) => Promise<void>) => fn({}),
      endSession: vi.fn(),
    });
  });

  it("denies queue access to non-lawyer users", async () => {
    const { listLawyerDebtCasesForReview } = await import(
      "@/modules/debt-cases/services/lawyer-debt-case-query.service"
    );
    await expect(
      listLawyerDebtCasesForReview({
        context: repContext,
        params: {
          page: 1,
          workflowStatus: "all",
          lawyerReviewStatus: DebtCaseLawyerReviewStatus.PENDING,
        },
      }),
    ).rejects.toMatchObject({ code: DebtCaseErrorCode.FORBIDDEN });
    expect(mockFind).not.toHaveBeenCalled();
  });

  it("lists pending review cases with server-side pagination defaults", async () => {
    mockCount.mockResolvedValue(1);
    mockFind.mockReturnValue(
      chainLean([
        {
          debtCaseId: CASE_ID,
          buildingId: BUILDING_ID,
          apartmentNumberDisplay: "12",
          parties: {
            propertyOwners: [{ fullName: "ישראל ישראלי", mobileE164: "+972501111111" }],
            occupancyType: "owner",
            legalDebtorDesignation: "property_owners",
            tenant: null,
            postalAddress: null,
          },
          principalAmountMinor: 50000,
          periodStartMonth: "2024-01",
          periodEndMonth: "2024-06",
          workflowStatus: DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW,
          lawyerReviewStatus: DebtCaseLawyerReviewStatus.PENDING,
          submittedAt: new Date("2024-06-01T10:00:00.000Z"),
          revision: 2,
        },
      ]),
    );
    mockBuildingFind.mockReturnValue(
      chainLean([{ buildingId: BUILDING_ID, displayName: "בניין הרimon" }]),
    );

    const { listLawyerDebtCasesForReview } = await import(
      "@/modules/debt-cases/services/lawyer-debt-case-query.service"
    );

    const result = await listLawyerDebtCasesForReview({
      context: lawyerContext,
      params: {
        page: 1,
        workflowStatus: "all",
        lawyerReviewStatus: DebtCaseLawyerReviewStatus.PENDING,
      },
    });

    expect(result.totalCount).toBe(1);
    expect(result.items[0]?.debtorDisplayName).toContain("ישראל");
    expect(result.items[0]?.buildingDisplayName).toBe("בניין הרimon");
    expect(mockFind).toHaveBeenCalled();
  });

  it("loads detail bundle with legal readiness and review action flag", async () => {
    mockGetDebtCase.mockResolvedValue({
      debtCaseId: CASE_ID,
      buildingId: BUILDING_ID,
      apartmentNumberDisplay: "12",
      workflowStatus: DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW,
      lawyerReviewStatus: DebtCaseLawyerReviewStatus.PENDING,
      revision: 2,
      parties: { propertyOwners: [], occupancyType: "owner", legalDebtorDesignation: "property_owners" },
      validationFlags: [],
      legalHoldReasons: [],
    });
    mockBuildingFindOne.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({ displayName: "בניין א", address: { city: "תל אביב" } }),
    });
    mockLoadReadiness.mockResolvedValue({
      legalTreatmentAllowed: false,
      holdReasons: ["poa_not_signed"],
      streamlinedReviewEligible: false,
    });

    const { loadLawyerDebtCaseDetailBundle } = await import(
      "@/modules/debt-cases/services/lawyer-debt-case-query.service"
    );

    const bundle = await loadLawyerDebtCaseDetailBundle({
      context: lawyerContext,
      debtCaseId: CASE_ID,
    });

    expect(bundle.canPerformReviewActions).toBe(true);
    expect(bundle.legalReadiness.legalTreatmentAllowed).toBe(false);
    expect(bundle.buildingDisplayName).toBe("בניין א");
  });

  it("hides review actions when case is no longer pending review", async () => {
    mockGetDebtCase.mockResolvedValue({
      debtCaseId: CASE_ID,
      buildingId: BUILDING_ID,
      apartmentNumberDisplay: "12",
      workflowStatus: DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW,
      lawyerReviewStatus: DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP,
      revision: 3,
      parties: { propertyOwners: [], occupancyType: "owner", legalDebtorDesignation: "property_owners" },
      validationFlags: [],
      legalHoldReasons: [],
    });
    mockBuildingFindOne.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({ displayName: "בניין א", address: { city: "תל אביב" } }),
    });
    mockLoadReadiness.mockResolvedValue({
      legalTreatmentAllowed: false,
      holdReasons: ["poa_not_signed"],
      streamlinedReviewEligible: false,
    });

    const { loadLawyerDebtCaseDetailBundle } = await import(
      "@/modules/debt-cases/services/lawyer-debt-case-query.service"
    );

    const bundle = await loadLawyerDebtCaseDetailBundle({
      context: lawyerContext,
      debtCaseId: CASE_ID,
    });

    expect(bundle.canPerformReviewActions).toBe(false);
    expect(bundle.record.lawyerReviewStatus).toBe(
      DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP,
    );
  });

  it("requires review comment for reject", async () => {
    mockFindOne.mockResolvedValue({
      debtCaseId: CASE_ID,
      buildingId: BUILDING_ID,
      workflowStatus: DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW,
      lawyerReviewStatus: DebtCaseLawyerReviewStatus.PENDING,
      revision: 1,
    });

    const { rejectDebtCase } = await import(
      "@/modules/debt-cases/services/debt-case-review.service"
    );

    await expect(
      rejectDebtCase({
        context: lawyerContext,
        debtCaseId: CASE_ID,
        expectedRevision: 1,
        reviewCommentHe: "  ",
      }),
    ).rejects.toMatchObject({ code: DebtCaseErrorCode.VALIDATION });
  });

  it("returns revision conflict when optimistic lock fails", async () => {
    mockFindOne.mockResolvedValue({
      debtCaseId: CASE_ID,
      buildingId: BUILDING_ID,
      workflowStatus: DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW,
      lawyerReviewStatus: DebtCaseLawyerReviewStatus.PENDING,
      revision: 1,
      validationFlags: [],
    });
    mockFindOneAndUpdate.mockResolvedValue(null);
    mockLoadReadiness.mockResolvedValue({
      legalTreatmentAllowed: true,
      holdReasons: [],
      streamlinedReviewEligible: false,
    });

    const { approveDebtCaseForLetterPrep } = await import(
      "@/modules/debt-cases/services/debt-case-review.service"
    );

    await expect(
      approveDebtCaseForLetterPrep({
        context: lawyerContext,
        debtCaseId: CASE_ID,
        expectedRevision: 1,
      }),
    ).rejects.toMatchObject({ code: DebtCaseErrorCode.REVISION_CONFLICT });
  });

  it("records audit on successful approve", async () => {
    mockFindOne.mockResolvedValue({
      debtCaseId: CASE_ID,
      buildingId: BUILDING_ID,
      workflowStatus: DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW,
      lawyerReviewStatus: DebtCaseLawyerReviewStatus.PENDING,
      revision: 1,
      validationFlags: [],
    });
    mockFindOneAndUpdate.mockResolvedValue(mockUpdatedApprovedDoc(2));
    mockLoadReadiness.mockResolvedValue({
      legalTreatmentAllowed: false,
      holdReasons: ["poa_not_signed"],
      streamlinedReviewEligible: false,
    });

    const { approveDebtCaseForLetterPrep } = await import(
      "@/modules/debt-cases/services/debt-case-review.service"
    );

    await approveDebtCaseForLetterPrep({
      context: lawyerContext,
      debtCaseId: CASE_ID,
      expectedRevision: 1,
    });

    expect(mockRecordApproved).toHaveBeenCalled();
    expect(mockSyncWarningLetterDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        debtCaseRecord: expect.objectContaining({
          lawyerReviewStatus: DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP,
        }),
      }),
    );
    expect(mockNotifyOutcome).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "approved", debtCaseId: CASE_ID }),
    );
  });

  it("does not notify operators when approve transaction fails", async () => {
    mockFindOne.mockResolvedValue({
      debtCaseId: CASE_ID,
      buildingId: BUILDING_ID,
      workflowStatus: DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW,
      lawyerReviewStatus: DebtCaseLawyerReviewStatus.PENDING,
      revision: 1,
      validationFlags: [],
      apartmentNumberDisplay: "12",
    });
    mockFindOneAndUpdate.mockResolvedValue(null);
    mockLoadReadiness.mockResolvedValue({
      legalTreatmentAllowed: true,
      holdReasons: [],
      streamlinedReviewEligible: false,
    });

    const { approveDebtCaseForLetterPrep } = await import(
      "@/modules/debt-cases/services/debt-case-review.service"
    );

    await expect(
      approveDebtCaseForLetterPrep({
        context: lawyerContext,
        debtCaseId: CASE_ID,
        expectedRevision: 1,
      }),
    ).rejects.toMatchObject({ code: DebtCaseErrorCode.REVISION_CONFLICT });

    expect(mockNotifyOutcome).not.toHaveBeenCalled();
  });
});

describe("lawyer debt case list params", () => {
  it("defaults to pending review filter", async () => {
    const { parseLawyerDebtCaseListSearchParams } = await import(
      "@/modules/debt-cases/validation/lawyer-debt-case-list.schema"
    );
    const params = parseLawyerDebtCaseListSearchParams({});
    expect(params.lawyerReviewStatus).toBe(DebtCaseLawyerReviewStatus.PENDING);
    expect(params.page).toBe(1);
  });

  it("parses explicit review-status all without reverting to pending", async () => {
    const { parseLawyerDebtCaseListSearchParams } = await import(
      "@/modules/debt-cases/validation/lawyer-debt-case-list.schema"
    );
    const params = parseLawyerDebtCaseListSearchParams({
      lawyerReviewStatus: "all",
      workflowStatus: "all",
    });
    expect(params.lawyerReviewStatus).toBe("all");
    expect(params.workflowStatus).toBe("all");
  });
});

describe("lawyer debt case list query filter", () => {
  it("does not restrict review status when filter is all", async () => {
    mockCount.mockResolvedValue(0);
    mockFind.mockReturnValue(chainLean([]));

    const { listLawyerDebtCasesForReview } = await import(
      "@/modules/debt-cases/services/lawyer-debt-case-query.service"
    );

    await listLawyerDebtCasesForReview({
      context: lawyerContext,
      params: {
        q: undefined,
        buildingId: undefined,
        workflowStatus: "all",
        lawyerReviewStatus: "all",
        page: 1,
      },
    });

    const filterArg = mockFind.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(filterArg.lawyerReviewStatus).toBeUndefined();
    expect(filterArg.workflowStatus).toBeUndefined();
  });
});
