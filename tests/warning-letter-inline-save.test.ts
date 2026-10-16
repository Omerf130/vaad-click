/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";

import { parseClauseOverridesFromFormData } from "@/modules/warning-letters/domain/parse-clause-overrides-form";
import { WarningLetterClientPresentation } from "@/modules/warning-letters/domain/warning-letter-client-presentation";
import { WarningLetterMonetaryCompleteness } from "@/modules/warning-letters/domain/warning-letter-monetary-completeness";
import { WarningLetterType } from "@/modules/warning-letters/domain/warning-letter-type";
import type { WarningLetterContentSnapshot } from "@/modules/warning-letters/snapshot/warning-letter-snapshot.types";
import {
  applyChangedClauseFieldsToForm,
  buildWarningLetterDraftSaveFormData,
  collectClauseDraftsFromInlineEditors,
  mergeClauseDraftMaps,
  prepareInlineWarningLetterSaveSubmission,
} from "@/modules/warning-letters/ui/warning-letter-inline-save-form";

function minimalSnapshot(overrides?: {
  legal_basis?: string;
}): WarningLetterContentSnapshot {
  return {
    letterType: WarningLetterType.INITIAL_WARNING,
    templateVersionId: "initial_warning_he_v1",
    letterCaseReference: "WH-2026-000001",
    letterDateIso: "2026-04-19",
    printedDeadlineDateIso: "2026-04-29",
    clientPresentation: WarningLetterClientPresentation.COMMITTEE,
    deliveryChannelLabel: "x",
    subjectLine: "subject",
    introductionParagraph: "intro",
    addresseeLines: ["לכבוד:"],
    apartmentAddressLine: "addr",
    debtorNamesLine: "name",
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
        body: overrides?.legal_basis ?? "legal basis original",
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

describe("inline warning letter save form pipeline", () => {
  it("collectClauseDraftsFromInlineEditors reads contentEditable DOM text", () => {
    const root = document.createElement("div");
    const span = document.createElement("span");
    span.className = "clauseEditableBody";
    span.setAttribute("data-clause-id", "legal_basis_section_58");
    span.innerText = "ניסוח מעודכן לסעיף 2";
    root.appendChild(span);

    const flushed = collectClauseDraftsFromInlineEditors(root);
    expect(flushed.legal_basis_section_58).toBe("ניסוח מעודכן לסעיף 2");
  });

  it("mergeClauseDraftMaps prefers flushed inline values over stale react state", () => {
    const merged = mergeClauseDraftMaps(
      { legal_basis_section_58: "stale react value" },
      { legal_basis_section_58: "from dom flush" },
    );
    expect(merged.legal_basis_section_58).toBe("from dom flush");
  });

  it("buildWarningLetterDraftSaveFormData sends only changed allowlisted clauses", () => {
    const snapshot = minimalSnapshot();
    const formData = buildWarningLetterDraftSaveFormData({
      debtCaseId: "case-1",
      sourceDraftId: "draft-1",
      expectedConcurrencyRevision: 3,
      snapshot,
      clauseDrafts: {
        ...Object.fromEntries(snapshot.numberedClauses.map((c) => [c.clauseId, c.body])),
        legal_basis_section_58: "ניסוח מעודכן לסעיף 2",
      },
    });

    expect(formData).not.toBeNull();
    const parsed = parseClauseOverridesFromFormData(formData!);
    expect(parsed).toEqual({ legal_basis_section_58: "ניסוח מעודכן לסעיף 2" });
    expect(formData!.get("sourceDraftId")).toBe("draft-1");
    expect(formData!.get("expectedConcurrencyRevision")).toBe("3");
  });

  it("returns null FormData for no-op save (unchanged text)", () => {
    const snapshot = minimalSnapshot();
    const formData = buildWarningLetterDraftSaveFormData({
      debtCaseId: "case-1",
      sourceDraftId: "draft-1",
      expectedConcurrencyRevision: 1,
      snapshot,
      clauseDrafts: Object.fromEntries(snapshot.numberedClauses.map((c) => [c.clauseId, c.body])),
    });
    expect(formData).toBeNull();
  });

  it("prepareInlineWarningLetterSaveSubmission detects real edits after DOM flush", () => {
    const snapshot = minimalSnapshot();
    const prep = prepareInlineWarningLetterSaveSubmission({
      snapshot,
      clauseDrafts: Object.fromEntries(snapshot.numberedClauses.map((c) => [c.clauseId, c.body])),
      flushedFromDom: { legal_basis_section_58: "עריכה חדשה" },
    });
    expect(prep.kind).toBe("submit");
    if (prep.kind === "submit") {
      expect(prep.changed.legal_basis_section_58).toBe("עריכה חדשה");
    }
  });

  it("applyChangedClauseFieldsToForm injects hidden inputs for native formAction submit", () => {
    const form = document.createElement("form");
    form.innerHTML =
      '<input type="hidden" name="debtCaseId" value="c1" /><input type="hidden" name="clause__old" value="remove-me" />';
    applyChangedClauseFieldsToForm(form, {
      legal_basis_section_58: "נשלח ב-formAction",
    });
    expect(form.querySelector('input[name="clause__old"]')).toBeNull();
    const field = form.querySelector<HTMLInputElement>(
      'input[name="clause__legal_basis_section_58"]',
    );
    expect(field?.value).toBe("נשלח ב-formAction");
    const fd = new FormData(form);
    expect(fd.get("clause__legal_basis_section_58")).toBe("נשלח ב-formAction");
  });

  it("simulates stale react state corrected by DOM flush before submit", () => {
    const snapshot = minimalSnapshot();
    const root = document.createElement("div");
    const span = document.createElement("span");
    span.className = "clauseEditableBody";
    span.setAttribute("data-clause-id", "legal_basis_section_58");
    span.innerText = "עריכה שלא הגיעה ל-state";
    root.appendChild(span);

    const staleReact = Object.fromEntries(snapshot.numberedClauses.map((c) => [c.clauseId, c.body]));
    const merged = mergeClauseDraftMaps(staleReact, collectClauseDraftsFromInlineEditors(root));
    const formData = buildWarningLetterDraftSaveFormData({
      debtCaseId: "c",
      sourceDraftId: "d",
      expectedConcurrencyRevision: 1,
      snapshot,
      clauseDrafts: merged,
    });
    expect(parseClauseOverridesFromFormData(formData!)).toEqual({
      legal_basis_section_58: "עריכה שלא הגיעה ל-state",
    });
  });
});
