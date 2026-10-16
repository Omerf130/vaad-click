import { describe, expect, it } from "vitest";

import { WarningLetterClientPresentation } from "@/modules/warning-letters/domain/warning-letter-client-presentation";
import { WarningLetterMonetaryCompleteness } from "@/modules/warning-letters/domain/warning-letter-monetary-completeness";
import { WarningLetterType } from "@/modules/warning-letters/domain/warning-letter-type";
import type { WarningLetterContentSnapshot } from "@/modules/warning-letters/snapshot/warning-letter-snapshot.types";
import {
  computeLawyerDraftHasUnsavedChanges,
  resolveSaveUiPhaseAfterServerResponse,
  shouldShowLawyerDraftUnsavedIndicator,
} from "@/modules/warning-letters/ui/warning-letter-lawyer-save-ui";

function snapshot(clauseBody: string): WarningLetterContentSnapshot {
  return {
    letterType: WarningLetterType.INITIAL_WARNING,
    templateVersionId: "initial_warning_he_v1",
    letterCaseReference: "WH-1",
    letterDateIso: "2026-04-19",
    printedDeadlineDateIso: "2026-04-29",
    clientPresentation: WarningLetterClientPresentation.COMMITTEE,
    deliveryChannelLabel: "x",
    subjectLine: "s",
    introductionParagraph: "i",
    addresseeLines: ["לכבוד:"],
    apartmentAddressLine: "a",
    debtorNamesLine: "n",
    debtMonthsCount: 1,
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
    paymentLinkPlaceholder: "l",
    printedDeadlineDateDisplay: "d",
    numberedClauses: [
      { clauseId: "legal_basis_section_58", displayNumber: 2, body: clauseBody },
    ],
    evidenceDisclaimer: "e",
    inquiriesMobileDisplay: "050",
    signatoryName: "s",
    barRegistrationNumber: "b",
    recipients: [],
    ownerCopyRecipients: [],
    contentSha256: "abc",
    snapshotCreatedAtIso: "2026-04-19T00:00:00.000Z",
  };
}

describe("lawyer draft save UI state", () => {
  it("hides unsaved indicator while awaiting persisted draft after success", () => {
    expect(
      shouldShowLawyerDraftUnsavedIndicator({
        isEditing: true,
        hasUnsavedChanges: true,
        saveUiPhase: "awaitingPersistedDraft",
      }),
    ).toBe(false);
  });

  it("shows unsaved again after failed save", () => {
    expect(
      shouldShowLawyerDraftUnsavedIndicator({
        isEditing: true,
        hasUnsavedChanges: true,
        saveUiPhase: "failed",
      }),
    ).toBe(true);
  });

  it("resolveSaveUiPhaseAfterServerResponse marks persisted success", () => {
    expect(
      resolveSaveUiPhaseAfterServerResponse({
        ok: true,
        savedDraftRevision: 3,
        unchanged: false,
      }),
    ).toBe("awaitingPersistedDraft");
  });

  it("computeLawyerDraftHasUnsavedChanges uses edit baseline snapshot", () => {
    const base = snapshot("baseline");
    expect(
      computeLawyerDraftHasUnsavedChanges({
        baselineSnapshot: base,
        isEditing: true,
        clauseDrafts: { legal_basis_section_58: "edited" },
      }),
    ).toBe(true);
  });
});
