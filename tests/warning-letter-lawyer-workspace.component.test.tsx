/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WarningLetterDraftLegalApprovalStatus } from "@/modules/warning-letters/domain/warning-letter-draft-legal-approval-status";
import { WarningLetterDraftLoadState } from "@/modules/warning-letters/domain/warning-letter-draft-load-state";
import { WarningLetterDraftStatus } from "@/modules/warning-letters/domain/warning-letter-draft-status";
import { WarningLetterClientPresentation } from "@/modules/warning-letters/domain/warning-letter-client-presentation";
import { WarningLetterMonetaryCompleteness } from "@/modules/warning-letters/domain/warning-letter-monetary-completeness";
import { WarningLetterType } from "@/modules/warning-letters/domain/warning-letter-type";
import type { WarningLetterDraftDetailResult } from "@/modules/warning-letters/services/warning-letter-draft.service";
import type { WarningLetterContentSnapshot } from "@/modules/warning-letters/snapshot/warning-letter-snapshot.types";

const mockRefresh = vi.fn();
let capturedSaveFormData: FormData | null = null;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

vi.mock("@/modules/warning-letters/actions/lawyer-warning-letter-draft.actions", () => ({
  regenerateWarningLetterDraftFormAction: vi.fn(async () => ({ ok: false })),
  approveWarningLetterWordingFormAction: vi.fn(async () => ({ ok: false })),
  returnWarningLetterForCorrectionFormAction: vi.fn(async () => ({ ok: false })),
  saveWarningLetterDraftEditsFormAction: vi.fn(async (_prev: unknown, formData: FormData) => {
    capturedSaveFormData = formData;
    return {
      ok: true,
      unchanged: false,
      savedDraftRevision: 2,
      message: "נשמרה גרסת טיוטה 2 עם העריכה.",
    };
  }),
}));

function buildSnapshot(clauseBody: string): WarningLetterContentSnapshot {
  return {
    letterType: WarningLetterType.INITIAL_WARNING,
    templateVersionId: "initial_warning_he_v1",
    letterCaseReference: "WH-2026-000001",
    letterDateIso: "2026-04-19",
    printedDeadlineDateIso: "2026-04-29",
    clientPresentation: WarningLetterClientPresentation.COMMITTEE,
    deliveryChannelLabel: "registered",
    subjectLine: "subject",
    introductionParagraph: "intro",
    addresseeLines: ["לכבוד:"],
    apartmentAddressLine: "addr",
    debtorNamesLine: "debtor",
    debtMonthsCount: 2,
    settingsVersionId: null,
    monetaryCompleteness: WarningLetterMonetaryCompleteness.PRINCIPAL_ONLY,
    isOperativeSnapshot: true,
    previewWarningHe: null,
    principalAmountMinor: 140_000,
    totalDueMinor: 140_000,
    principalDisplay: "1,400.00 ₪",
    totalDisplay: "1,400.00 ₪",
    treatmentFeeGrossDisplay: null,
    totalWithTreatmentDisplay: null,
    treatmentDisplayClause: "",
    paymentLinkPlaceholder: "[link]",
    printedDeadlineDateDisplay: "29.4.26",
    numberedClauses: [
      {
        clauseId: "non_payment_despite_contact",
        displayNumber: 1,
        body: "clause one",
      },
      {
        clauseId: "legal_basis_section_58",
        displayNumber: 2,
        body: clauseBody,
      },
      {
        clauseId: "debt_table_intro",
        displayNumber: 3,
        body: "table intro",
      },
      {
        clauseId: "payment_block",
        displayNumber: 8,
        body: "pay",
      },
    ],
    evidenceDisclaimer: "evidence",
    inquiriesMobileDisplay: "050",
    signatoryName: "sig",
    barRegistrationNumber: "bar",
    recipients: [],
    ownerCopyRecipients: [],
    contentSha256: "abc",
    snapshotCreatedAtIso: "2026-04-19T00:00:00.000Z",
  };
}

function buildDetail(revision: number, clauseBody: string): WarningLetterDraftDetailResult {
  const snap = buildSnapshot(clauseBody);
  return {
    loadState: WarningLetterDraftLoadState.ACTIVE_CURRENT,
    letterCaseReference: snap.letterCaseReference,
    latestDraftRevision: revision,
    invalidationReason: null,
    invalidatedAtIso: null,
    legalWordingApprovalStatus: WarningLetterDraftLegalApprovalStatus.NONE,
    draft: {
      draftId: "draft-v1",
      debtCaseId: "case-1",
      buildingId: "building-1",
      letterType: WarningLetterType.INITIAL_WARNING,
      templateVersionId: snap.templateVersionId,
      draftRevision: revision,
      priorDraftId: null,
      letterCaseReference: snap.letterCaseReference,
      status: WarningLetterDraftStatus.ACTIVE,
      contentSha256: snap.contentSha256,
      unapprovedTemplateVariantIds: [],
      approvalReady: true,
      invalidationReason: null,
      invalidatedAtIso: null,
      createdAtIso: "2026-04-19T00:00:00.000Z",
      updatedAtIso: "2026-04-19T00:00:00.000Z",
      snapshot: snap,
      html: "<p>html</p>",
      previewWarningHe: null,
      isCurrentForCase: true,
      manuallyEdited: false,
      editedClauseIds: [],
      concurrencyRevision: 1,
      legalWordingApprovalStatus: WarningLetterDraftLegalApprovalStatus.NONE,
      legalWordingApprovedAtIso: null,
      editableClauses: [
        {
          clauseId: "legal_basis_section_58",
          displayNumber: 2,
          body: clauseBody,
        },
      ],
    },
  };
}

describe("WarningLetterLawyerDraftWorkspace inline save (component)", () => {
  beforeEach(() => {
    capturedSaveFormData = null;
    mockRefresh.mockReset();
  });

  it(
    "submits flushed contentEditable text via FormData and clears dirty state after refresh",
    async () => {
    const user = userEvent.setup();
    const { WarningLetterLawyerDraftWorkspace } = await import(
      "@/modules/warning-letters/ui/WarningLetterLawyerDraftWorkspace"
    );

    const initialDetail = buildDetail(1, "baseline clause 2");
    const { rerender } = render(
      <WarningLetterLawyerDraftWorkspace
        detail={initialDetail}
        debtCaseId="case-1"
        buildingId="building-1"
        approvalBlockersHe={[]}
        revisionHistory={[]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "עריכת טיוטה" }));

    const clauseEditor = screen.getByRole("textbox", { name: "סעיף 2" });
    clauseEditor.textContent = "עריכה חדשה לסעיף 2";
    fireEvent.input(clauseEditor, {
      target: { innerText: "עריכה חדשה לסעיף 2" },
    });
    expect(screen.getByText("יש שינויים שלא נשמרו")).toBeTruthy();

    const saveButton = screen.getByRole("button", { name: "שמירת שינויים" });
    expect(saveButton.hasAttribute("disabled")).toBe(false);
    await user.click(saveButton);

    await waitFor(() => {
      expect(capturedSaveFormData).not.toBeNull();
    });

    expect(capturedSaveFormData!.get("clause__legal_basis_section_58")).toBe("עריכה חדשה לסעיף 2");
    expect(capturedSaveFormData!.get("sourceDraftId")).toBe("draft-v1");

    await waitFor(() => {
      expect(screen.queryByText("יש שינויים שלא נשמרו")).toBeNull();
    });

    expect(mockRefresh).toHaveBeenCalled();

    const updatedSnapshot = buildSnapshot("עריכה חדשה לסעיף 2");
    rerender(
      <WarningLetterLawyerDraftWorkspace
        detail={buildDetail(2, "עריכה חדשה לסעיף 2")}
        debtCaseId="case-1"
        buildingId="building-1"
        approvalBlockersHe={[]}
        revisionHistory={[]}
      />,
    );

    expect(screen.queryByText("עריכת טיוטה")).toBeTruthy();
    expect(screen.getByText(/גרסה 2/)).toBeTruthy();
    expect(updatedSnapshot.numberedClauses[1]?.body).toBe("עריכה חדשה לסעיף 2");
    },
    15_000,
  );
});
