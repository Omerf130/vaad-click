import { beforeEach, describe, expect, it, vi } from "vitest";

import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import { WarningLetterDraftStatus } from "@/modules/warning-letters/domain/warning-letter-draft-status";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";

const mockFindOne = vi.fn();
const mockCreate = vi.fn();
const mockFindOneAndUpdate = vi.fn();
const mockGetDebtCase = vi.fn();
const mockBuildBundle = vi.fn();
const mockComputeMaterialSha = vi.fn();
const mockInvalidate = vi.fn();
const mockRecordCreated = vi.fn();
const mockRecordRegenerated = vi.fn();
const mockAllocateRef = vi.fn();
const mockWithTransaction = vi.fn(async (fn: () => Promise<unknown>) => fn());
const mockEndSession = vi.fn();

vi.mock("@/shared/db/connect", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/modules/debt-cases/services/debt-case-authorization.service", () => ({
  assertLawyerAdminDebtCaseReview: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/modules/debt-cases/services/debt-case.service", () => ({
  getDebtCase: (...args: unknown[]) => mockGetDebtCase(...args),
}));

function chainFindOne(resultPromise: Promise<unknown>) {
  const chain = {
    session: () => ({
      lean: () => resultPromise,
    }),
    lean: () => resultPromise,
    sort: () => chain,
  };
  return chain;
}

vi.mock("@/modules/warning-letters/infra/warning-letter-draft.model", () => ({
  WarningLetterDraft: {
    findOne: (...args: unknown[]) => chainFindOne(mockFindOne(...args)),
    create: (...args: unknown[]) => mockCreate(...args),
    findOneAndUpdate: (...args: unknown[]) => mockFindOneAndUpdate(...args),
  },
}));

vi.mock("@/modules/warning-letters/services/warning-letter-draft-invalidation.service", () => ({
  invalidateActiveWarningLetterDraft: (...args: unknown[]) => mockInvalidate(...args),
}));

vi.mock("@/modules/warning-letters/services/warning-letter-snapshot-context.service", () => ({
  buildPersistedInitialWarningLetterSnapshotBundle: (...args: unknown[]) => mockBuildBundle(...args),
  computeCurrentMaterialInputsSha256ForDebtCase: (...args: unknown[]) =>
    mockComputeMaterialSha(...args),
}));

vi.mock("@/modules/warning-letters/services/warning-letter-case-reference.service", () => ({
  allocateLetterCaseReference: (...args: unknown[]) => mockAllocateRef(...args),
  resolveLetterCaseReferenceForRegeneration: (input: { existingReference: string }) =>
    input.existingReference.trim(),
}));

vi.mock("@/modules/warning-letters/services/warning-letter-draft-audit.service", () => ({
  recordWarningLetterDraftCreated: (...args: unknown[]) => mockRecordCreated(...args),
  recordWarningLetterDraftRegenerated: (...args: unknown[]) => mockRecordRegenerated(...args),
}));

vi.mock("mongoose", () => ({
  default: {
    startSession: () => ({
      withTransaction: mockWithTransaction,
      endSession: mockEndSession,
    }),
  },
  Types: {
    ObjectId: class {
      constructor(public id: string) {}
    },
  },
}));

const lawyerContext = {
  user: {
    id: "aaaaaaaaaaaaaaaaaaaaaaaa",
    email: "lawyer@test.com",
    role: UserRole.LAWYER_ADMIN,
    accountStatus: AccountStatus.ACTIVE,
  },
} as AuthenticatedContext;

const debtCaseId = "case-abc";
const letterRef = "WH-2026-000010";

function debtCaseRecord(principalMinor: number) {
  return {
    debtCaseId,
    buildingId: "b1",
    principalAmountMinor: principalMinor,
    lawyerReviewStatus: DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP,
  };
}

function snapshotBundle(principalMinor: number, materialSha: string) {
  return {
    snapshot: {
      templateVersionId: "initial_warning_he_v1",
      letterCaseReference: letterRef,
      letterDateIso: "2026-04-19",
      contentSha256: `content-${principalMinor}`,
      principalAmountMinor: principalMinor,
      previewWarningHe: null,
      addresseeLines: ["לכבוד:"],
      debtorNamesLine: "Test",
      apartmentAddressLine: "Addr",
      deliveryChannelLabel: "x",
      subjectLine: "s",
      introductionParagraph: "i",
      numberedClauses: [],
      evidenceDisclaimer: "e",
      inquiriesMobileDisplay: "m",
      signatoryName: "s",
      barRegistrationNumber: "b",
      printedDeadlineDateDisplay: "d",
      principalDisplay: "1",
      totalDisplay: "1",
    },
    materialInputsSha256: materialSha,
    unapprovedTemplateVariantIds: ["committee_intro_v1"],
    approvalReady: false,
  };
}

describe("warning letter draft reapproval lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDebtCase.mockImplementation(async () => debtCaseRecord(140_000));
    mockCreate.mockResolvedValue(undefined);
    mockRecordCreated.mockResolvedValue(undefined);
    mockRecordRegenerated.mockResolvedValue(undefined);
    mockInvalidate.mockResolvedValue(undefined);
    mockComputeMaterialSha.mockImplementation(async (input: { debtCase: { principalAmountMinor: number } }) =>
      input.debtCase.principalAmountMinor === 120_000 ? "mat-120" : "mat-140",
    );
  });

  it("creates revision 1 on first approval", async () => {
    mockFindOne.mockImplementationOnce(async () => null);
    mockFindOne.mockImplementationOnce(async () => null);
    mockFindOne.mockImplementationOnce(async () => null);
    mockAllocateRef.mockResolvedValue(letterRef);
    mockBuildBundle.mockResolvedValue(snapshotBundle(120_000, "mat-120"));

    const { syncInitialWarningLetterDraftForApprovedCase } = await import(
      "@/modules/warning-letters/services/warning-letter-draft.service"
    );

    const result = await syncInitialWarningLetterDraftForApprovedCase({
      context: lawyerContext,
      debtCaseId,
      debtCaseRecord: debtCaseRecord(120_000) as never,
    });

    expect(result.created).toBe(true);
    expect(result.draftRevision).toBe(1);
    expect(mockRecordCreated).toHaveBeenCalled();
    expect(mockCreate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          draftRevision: 1,
          letterCaseReference: letterRef,
          status: WarningLetterDraftStatus.ACTIVE,
        }),
      ]),
      expect.any(Object),
    );
  });

  it("invalidates stale active draft and creates revision 2 with same reference after reapproval", async () => {
    const staleActive = {
      draftId: "draft-rev1",
      debtCaseId,
      buildingId: "b1",
      letterType: "initial_warning",
      draftRevision: 1,
      letterCaseReference: letterRef,
      templateVersionId: "initial_warning_he_v1",
      contentSha256: "content-120",
      materialInputsSha256: "mat-120",
      approvalReady: false,
      status: WarningLetterDraftStatus.ACTIVE,
    };

    mockFindOne.mockImplementationOnce(async () => staleActive);
    mockFindOne.mockImplementationOnce(async () => null);
    mockFindOne.mockImplementationOnce(async () => ({
      ...staleActive,
      status: WarningLetterDraftStatus.INVALIDATED,
      draftRevision: 1,
    }));

    mockBuildBundle
      .mockResolvedValueOnce(snapshotBundle(140_000, "mat-140"))
      .mockResolvedValueOnce(snapshotBundle(140_000, "mat-140"));

    const { syncInitialWarningLetterDraftForApprovedCase } = await import(
      "@/modules/warning-letters/services/warning-letter-draft.service"
    );

    const result = await syncInitialWarningLetterDraftForApprovedCase({
      context: lawyerContext,
      debtCaseId,
      debtCaseRecord: debtCaseRecord(140_000) as never,
    });

    expect(mockInvalidate).toHaveBeenCalled();
    expect(result.created).toBe(true);
    expect(result.draftRevision).toBe(2);
    expect(mockRecordRegenerated).toHaveBeenCalled();
    expect(mockCreate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          draftRevision: 2,
          letterCaseReference: letterRef,
          priorDraftId: "draft-rev1",
          contentSnapshot: expect.objectContaining({ principalAmountMinor: 140_000 }),
        }),
      ]),
      expect.any(Object),
    );
  });

  it("returns existing active draft when material hash still matches", async () => {
    const active = {
      draftId: "draft-rev2",
      debtCaseId,
      draftRevision: 2,
      letterCaseReference: letterRef,
      materialInputsSha256: "mat-140",
      status: WarningLetterDraftStatus.ACTIVE,
      letterType: "initial_warning",
      buildingId: "b1",
      templateVersionId: "t",
      contentSha256: "c",
      approvalReady: false,
      contentSnapshot: snapshotBundle(140_000, "mat-140").snapshot,
    };

    mockFindOne.mockImplementationOnce(async () => active);

    const { syncInitialWarningLetterDraftForApprovedCase } = await import(
      "@/modules/warning-letters/services/warning-letter-draft.service"
    );

    const result = await syncInitialWarningLetterDraftForApprovedCase({
      context: lawyerContext,
      debtCaseId,
      debtCaseRecord: debtCaseRecord(140_000) as never,
    });

    expect(result.created).toBe(false);
    expect(result.draftId).toBe("draft-rev2");
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockInvalidate).not.toHaveBeenCalled();
  });

  it("read-only load does not start a Mongo transaction", async () => {
    const active = {
      draftId: "draft-rev2",
      debtCaseId,
      buildingId: "b1",
      letterType: "initial_warning",
      draftRevision: 2,
      letterCaseReference: letterRef,
      templateVersionId: "initial_warning_he_v1",
      contentSha256: "content-140",
      materialInputsSha256: "mat-140",
      approvalReady: false,
      status: WarningLetterDraftStatus.ACTIVE,
      contentSnapshot: snapshotBundle(140_000, "mat-140").snapshot,
      unapprovedTemplateVariantIds: [],
    };

    mockFindOne.mockImplementationOnce(async () => active);

    const { loadWarningLetterDraftDetailForApprovedCaseReadOnly } = await import(
      "@/modules/warning-letters/services/warning-letter-draft.service"
    );

    const detail = await loadWarningLetterDraftDetailForApprovedCaseReadOnly({
      context: lawyerContext,
      debtCaseId,
      debtCaseRecord: debtCaseRecord(140_000) as never,
    });

    expect(mockWithTransaction).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
    expect(detail.loadState).toBe("active_current");
    expect(detail.draft?.draftRevision).toBe(2);
    expect(detail.draft?.isCurrentForCase).toBe(true);

    await loadWarningLetterDraftDetailForApprovedCaseReadOnly({
      context: lawyerContext,
      debtCaseId,
      debtCaseRecord: debtCaseRecord(140_000) as never,
    });
    expect(mockWithTransaction).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("read-only load surfaces invalidated chain as needs_regeneration without writes", async () => {
    mockFindOne.mockImplementationOnce(async () => null);
    mockFindOne.mockImplementationOnce(async () => ({
      draftId: "draft-rev1",
      draftRevision: 1,
      letterCaseReference: letterRef,
      status: WarningLetterDraftStatus.INVALIDATED,
      letterType: "initial_warning",
      debtCaseId,
      invalidationReason: "debt_case_material_edit",
      invalidatedAt: new Date("2026-04-19T10:00:00.000Z"),
    }));

    const { loadWarningLetterDraftDetailForApprovedCaseReadOnly } = await import(
      "@/modules/warning-letters/services/warning-letter-draft.service"
    );

    const detail = await loadWarningLetterDraftDetailForApprovedCaseReadOnly({
      context: lawyerContext,
      debtCaseId,
      debtCaseRecord: debtCaseRecord(140_000) as never,
    });

    expect(detail.loadState).toBe("needs_regeneration");
    expect(detail.draft).toBeNull();
    expect(detail.letterCaseReference).toBe(letterRef);
    expect(mockWithTransaction).not.toHaveBeenCalled();
  });

  it("read-only load marks active draft stale when material hash differs", async () => {
    const staleActive = {
      draftId: "draft-rev1",
      debtCaseId,
      buildingId: "b1",
      letterType: "initial_warning",
      draftRevision: 1,
      letterCaseReference: letterRef,
      templateVersionId: "initial_warning_he_v1",
      contentSha256: "content-120",
      materialInputsSha256: "mat-120",
      approvalReady: false,
      status: WarningLetterDraftStatus.ACTIVE,
      contentSnapshot: snapshotBundle(120_000, "mat-120").snapshot,
      unapprovedTemplateVariantIds: [],
    };

    mockFindOne.mockImplementationOnce(async () => staleActive);

    const { loadWarningLetterDraftDetailForApprovedCaseReadOnly } = await import(
      "@/modules/warning-letters/services/warning-letter-draft.service"
    );

    const detail = await loadWarningLetterDraftDetailForApprovedCaseReadOnly({
      context: lawyerContext,
      debtCaseId,
      debtCaseRecord: debtCaseRecord(140_000) as never,
    });

    expect(detail.loadState).toBe("active_stale");
    expect(detail.draft?.isCurrentForCase).toBe(false);
    expect(detail.draft?.snapshot.principalAmountMinor).toBe(120_000);
  });

  it("retries duplicate-key races with a non-session read (no aborted-transaction query)", async () => {
    const dupError = Object.assign(new Error("dup"), { code: 11000 });
    mockFindOne.mockImplementationOnce(async () => null);
    mockFindOne.mockImplementationOnce(async () => null);
    mockFindOne.mockImplementationOnce(async () => null);
    mockAllocateRef.mockResolvedValue(letterRef);
    mockBuildBundle.mockResolvedValue(snapshotBundle(140_000, "mat-140"));
    mockCreate.mockRejectedValueOnce(dupError);

    const racedActive = {
      draftId: "draft-rev1",
      debtCaseId,
      draftRevision: 1,
      letterCaseReference: letterRef,
      materialInputsSha256: "mat-140",
      status: WarningLetterDraftStatus.ACTIVE,
      letterType: "initial_warning",
      buildingId: "b1",
      templateVersionId: "t",
      contentSha256: "c",
      approvalReady: false,
      contentSnapshot: snapshotBundle(140_000, "mat-140").snapshot,
    };
    mockFindOne.mockImplementationOnce(async () => racedActive);

    const { syncInitialWarningLetterDraftForApprovedCase } = await import(
      "@/modules/warning-letters/services/warning-letter-draft.service"
    );

    const result = await syncInitialWarningLetterDraftForApprovedCase({
      context: lawyerContext,
      debtCaseId,
      debtCaseRecord: debtCaseRecord(140_000) as never,
    });

    expect(result.created).toBe(false);
    expect(result.draftId).toBe("draft-rev1");
    expect(mockWithTransaction).toHaveBeenCalledTimes(1);
  });

  it("regenerates stale active draft via explicit mutation", async () => {
    const staleActive = {
      draftId: "draft-rev1",
      debtCaseId,
      buildingId: "b1",
      letterType: "initial_warning",
      draftRevision: 1,
      letterCaseReference: letterRef,
      templateVersionId: "initial_warning_he_v1",
      contentSha256: "content-120",
      materialInputsSha256: "mat-120",
      approvalReady: false,
      status: WarningLetterDraftStatus.ACTIVE,
    };

    mockGetDebtCase.mockResolvedValue(debtCaseRecord(140_000));
    mockFindOne.mockImplementationOnce(async () => staleActive);
    mockFindOne.mockImplementationOnce(async () => null);
    mockFindOne.mockImplementationOnce(async () => ({
      ...staleActive,
      status: WarningLetterDraftStatus.INVALIDATED,
    }));
    mockBuildBundle.mockResolvedValue(snapshotBundle(140_000, "mat-140"));
    mockFindOne.mockImplementationOnce(async () => ({
      ...staleActive,
      draftId: "draft-rev2",
      draftRevision: 2,
      contentSha256: "content-140",
      materialInputsSha256: "mat-140",
      status: WarningLetterDraftStatus.ACTIVE,
      contentSnapshot: snapshotBundle(140_000, "mat-140").snapshot,
      unapprovedTemplateVariantIds: [],
    }));

    const { regenerateWarningLetterDraftForApprovedCase } = await import(
      "@/modules/warning-letters/services/warning-letter-draft.service"
    );

    const view = await regenerateWarningLetterDraftForApprovedCase({
      context: lawyerContext,
      debtCaseId,
    });

    expect(mockInvalidate).toHaveBeenCalled();
    expect(view.draftRevision).toBe(2);
    expect(view.isCurrentForCase).toBe(true);
    expect(view.snapshot.principalAmountMinor).toBe(140_000);
    expect(view.letterCaseReference).toBe(letterRef);
  });

  it("surfaces legacy letterCaseReference index errors on regeneration", async () => {
    const staleActive = {
      draftId: "draft-rev1",
      debtCaseId,
      buildingId: "b1",
      letterType: "initial_warning",
      draftRevision: 1,
      letterCaseReference: letterRef,
      templateVersionId: "t",
      contentSha256: "c",
      materialInputsSha256: "mat-120",
      approvalReady: false,
      status: WarningLetterDraftStatus.ACTIVE,
    };

    mockGetDebtCase.mockResolvedValue(debtCaseRecord(140_000));
    mockFindOne.mockImplementationOnce(async () => staleActive);
    mockFindOne.mockImplementationOnce(async () => null);
    mockFindOne.mockImplementationOnce(async () => ({
      ...staleActive,
      status: WarningLetterDraftStatus.INVALIDATED,
    }));
    mockBuildBundle.mockResolvedValue(snapshotBundle(140_000, "mat-140"));
    mockCreate.mockRejectedValue({
      code: 11000,
      keyPattern: { letterCaseReference: 1 },
      message: "E11000 duplicate key letterCaseReference",
    });

    const { regenerateWarningLetterDraftForApprovedCase } = await import(
      "@/modules/warning-letters/services/warning-letter-draft.service"
    );

    await expect(
      regenerateWarningLetterDraftForApprovedCase({
        context: lawyerContext,
        debtCaseId,
      }),
    ).rejects.toMatchObject({ code: "legacy_reference_unique_index" });
    expect(mockWithTransaction).toHaveBeenCalledTimes(1);
  });

  it("loadPersisted throws when no current active draft", async () => {
    mockFindOne.mockImplementationOnce(async () => null);
    mockFindOne.mockImplementationOnce(async () => ({
      draftId: "draft-rev1",
      draftRevision: 1,
      letterCaseReference: letterRef,
      status: WarningLetterDraftStatus.INVALIDATED,
      letterType: "initial_warning",
      debtCaseId,
    }));

    const { loadPersistedWarningLetterDraftForDebtCase } = await import(
      "@/modules/warning-letters/services/warning-letter-draft.service"
    );

    await expect(
      loadPersistedWarningLetterDraftForDebtCase({
        context: lawyerContext,
        debtCaseId,
      }),
    ).rejects.toMatchObject({ code: "not_found" });
  });
});
