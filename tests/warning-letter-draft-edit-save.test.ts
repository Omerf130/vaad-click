import { beforeEach, describe, expect, it, vi } from "vitest";

import { WarningLetterDraftLegalApprovalStatus } from "@/modules/warning-letters/domain/warning-letter-draft-legal-approval-status";
import { WarningLetterDraftStatus } from "@/modules/warning-letters/domain/warning-letter-draft-status";
import { WarningLetterType } from "@/modules/warning-letters/domain/warning-letter-type";
import { WarningLetterClientPresentation } from "@/modules/warning-letters/domain/warning-letter-client-presentation";

const mockFindOne = vi.fn();
const mockFindOneAndUpdate = vi.fn();
const mockCreate = vi.fn();
const mockSession = {
  withTransaction: vi.fn(async (fn: () => Promise<void>) => fn()),
  endSession: vi.fn(),
};

vi.mock("mongoose", async (importOriginal) => {
  const actual = await importOriginal<typeof import("mongoose")>();
  return {
    default: {
      startSession: vi.fn(async () => mockSession),
    },
    Types: actual.Types,
  };
});

vi.mock("@/modules/warning-letters/infra/warning-letter-draft.model", () => ({
  WarningLetterDraft: {
    findOne: (...args: unknown[]) => mockFindOne(...args),
    findOneAndUpdate: (...args: unknown[]) => mockFindOneAndUpdate(...args),
    create: (...args: unknown[]) => mockCreate(...args),
  },
}));

vi.mock("@/modules/debt-cases/services/debt-case-authorization.service", () => ({
  assertLawyerAdminDebtCaseReview: vi.fn(),
}));

vi.mock("@/modules/debt-cases/services/debt-case.service", () => ({
  getDebtCase: vi.fn().mockResolvedValue({
    lawyerReviewStatus: "approved_for_letter_prep",
  }),
}));

vi.mock("@/shared/db/connect", () => ({
  connectMongo: vi.fn(),
}));

vi.mock("@/modules/warning-letters/services/warning-letter-draft-audit.service", () => ({
  recordWarningLetterDraftEdited: vi.fn(),
}));

vi.mock("@/modules/warning-letters/services/warning-letter-draft.service", () => ({
  loadWarningLetterDraftDetailForApprovedCaseReadOnly: vi.fn().mockResolvedValue({
    draft: { concurrencyRevision: 1 },
  }),
  mapMongoDraftWriteError: vi.fn(),
}));

function activeDraftDoc(options?: { omitConcurrencyRevision?: boolean; concurrencyRevision?: number }) {
  const doc = {
    draftId: "draft-v1",
    debtCaseId: "case-1",
    buildingId: "b1",
    letterType: WarningLetterType.INITIAL_WARNING,
    templateVersionId: "initial_warning_he_v1",
    draftRevision: 4,
    letterCaseReference: "WH-2026-000001",
    status: WarningLetterDraftStatus.ACTIVE,
    contentSnapshot: {
      letterType: WarningLetterType.INITIAL_WARNING,
      templateVersionId: "initial_warning_he_v1",
      letterCaseReference: "WH-2026-000001",
      letterDateIso: "2026-04-19",
      printedDeadlineDateIso: "2026-04-29",
      clientPresentation: WarningLetterClientPresentation.COMMITTEE,
      deliveryChannelLabel: "x",
      subjectLine: "s",
      introductionParagraph: "i",
      addresseeLines: [],
      apartmentAddressLine: "a",
      debtorNamesLine: "n",
      debtMonthsCount: 1,
      settingsVersionId: null,
      monetaryCompleteness: "principal_only",
      isOperativeSnapshot: true,
      previewWarningHe: null,
      principalAmountMinor: 140_000,
      totalDueMinor: 140_000,
      principalDisplay: "1,400.00 ₪",
      totalDisplay: "1,400.00 ₪",
      treatmentFeeGrossDisplay: null,
      totalWithTreatmentDisplay: null,
      treatmentDisplayClause: "",
      paymentLinkPlaceholder: "l",
      printedDeadlineDateDisplay: "d",
      numberedClauses: [
        {
          clauseId: "legal_basis_section_58",
          displayNumber: 2,
          body: "original clause 2",
        },
      ],
      evidenceDisclaimer: "e",
      inquiriesMobileDisplay: "050",
      signatoryName: "s",
      barRegistrationNumber: "b",
      recipients: [],
      ownerCopyRecipients: [],
      contentSha256: "hash-old",
      snapshotCreatedAtIso: "2026-04-19T00:00:00.000Z",
    },
    contentSha256: "hash-old",
    materialInputsSha256: "mat",
    unapprovedTemplateVariantIds: [],
    approvalReady: true,
    manuallyEdited: false,
    concurrencyRevision: options?.concurrencyRevision ?? 2,
    legalWordingApprovalStatus: WarningLetterDraftLegalApprovalStatus.NONE,
  };
  if (options?.omitConcurrencyRevision) {
    delete (doc as { concurrencyRevision?: number }).concurrencyRevision;
  }
  return doc;
}

describe("saveWarningLetterDraftClauseEdits persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindOne.mockReset();
    mockFindOneAndUpdate.mockReset();
    mockCreate.mockReset();
  });

  it("creates a new revision when clause text changes", async () => {
    vi.resetModules();
    const active = activeDraftDoc();
    mockFindOne.mockImplementation(() => ({
      lean: () => Promise.resolve(active),
      session: () => ({
        lean: () => Promise.resolve(active),
      }),
    }));
    mockFindOneAndUpdate.mockReturnValue({
      lean: () => Promise.resolve({ ...active, status: WarningLetterDraftStatus.SUPERSEDED }),
    });
    mockCreate.mockResolvedValue(undefined);

    const { saveWarningLetterDraftClauseEdits } = await import(
      "@/modules/warning-letters/services/warning-letter-draft-edit.service"
    );

    const result = await saveWarningLetterDraftClauseEdits({
      context: { user: { id: "507f1f77bcf86cd799439011" } } as never,
      debtCaseId: "case-1",
      sourceDraftId: "draft-v1",
      expectedConcurrencyRevision: 2,
      clauseOverrides: { legal_basis_section_58: "updated clause 2 text" },
    });

    expect(result.unchanged).toBe(false);
    expect(result.draftRevision).toBe(5);
    expect(mockCreate).toHaveBeenCalled();
    const createdPayload = mockCreate.mock.calls[0]?.[0]?.[0];
    expect(createdPayload.draftRevision).toBe(5);
    expect(createdPayload.letterCaseReference).toBe("WH-2026-000001");
    expect(createdPayload.priorDraftId).toBe("draft-v1");
    const updatedClause = createdPayload.contentSnapshot.numberedClauses.find(
      (c: { clauseId: string }) => c.clauseId === "legal_basis_section_58",
    );
    expect(updatedClause.body).toBe("updated clause 2 text");
    expect(createdPayload.contentSnapshot.principalDisplay).toBe("1,400.00 ₪");
  });

  it("saves legacy draft revision 1 when concurrencyRevision is absent in Mongo (expected 1)", async () => {
    vi.resetModules();
    const active = activeDraftDoc({ omitConcurrencyRevision: true, concurrencyRevision: 1 });
    active.draftRevision = 1;
    mockFindOne.mockImplementation(() => ({
      lean: () => Promise.resolve(active),
      session: () => ({
        lean: () => Promise.resolve(active),
      }),
    }));
    mockFindOneAndUpdate.mockReturnValue({
      lean: () => Promise.resolve({ ...active, status: WarningLetterDraftStatus.SUPERSEDED }),
    });
    mockCreate.mockResolvedValue(undefined);

    const { saveWarningLetterDraftClauseEdits } = await import(
      "@/modules/warning-letters/services/warning-letter-draft-edit.service"
    );

    const result = await saveWarningLetterDraftClauseEdits({
      context: { user: { id: "507f1f77bcf86cd799439011" } } as never,
      debtCaseId: "case-1",
      sourceDraftId: "draft-v1",
      expectedConcurrencyRevision: 1,
      clauseOverrides: { legal_basis_section_58: "legacy edit saved" },
    });

    expect(result.unchanged).toBe(false);
    expect(result.draftRevision).toBe(2);
    expect(mockCreate).toHaveBeenCalledTimes(1);
    const supersedeFilter = mockFindOneAndUpdate.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(supersedeFilter).toHaveProperty("$or");
  });

  it("rejects save when stored concurrency is 2 but client sends 1", async () => {
    vi.resetModules();
    const active = activeDraftDoc({ concurrencyRevision: 2 });
    mockFindOne.mockImplementation(() => ({
      lean: () => Promise.resolve(active),
      session: () => ({
        lean: () => Promise.resolve(active),
      }),
    }));

    const { saveWarningLetterDraftClauseEdits } = await import(
      "@/modules/warning-letters/services/warning-letter-draft-edit.service"
    );
    const { WarningLetterDraftError } = await import(
      "@/modules/warning-letters/domain/warning-letter-draft-errors"
    );

    await expect(
      saveWarningLetterDraftClauseEdits({
        context: { user: { id: "507f1f77bcf86cd799439011" } } as never,
        debtCaseId: "case-1",
        sourceDraftId: "draft-v1",
        expectedConcurrencyRevision: 1,
        clauseOverrides: { legal_basis_section_58: "stale client" },
      }),
    ).rejects.toBeInstanceOf(WarningLetterDraftError);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("returns unchanged without creating a document when text matches snapshot", async () => {
    vi.resetModules();
    const active = activeDraftDoc();
    mockFindOne.mockReturnValue({ lean: () => Promise.resolve(active) });

    const { saveWarningLetterDraftClauseEdits } = await import(
      "@/modules/warning-letters/services/warning-letter-draft-edit.service"
    );

    const result = await saveWarningLetterDraftClauseEdits({
      context: { user: { id: "507f1f77bcf86cd799439011" } } as never,
      debtCaseId: "case-1",
      sourceDraftId: "draft-v1",
      expectedConcurrencyRevision: 2,
      clauseOverrides: { legal_basis_section_58: "original clause 2" },
    });

    expect(result.unchanged).toBe(true);
    expect(result.draftRevision).toBe(4);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
