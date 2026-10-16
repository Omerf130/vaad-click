import { describe, expect, it } from "vitest";

import {
  buildInitialClauseDraftMap,
  pickChangedClauseOverrides,
} from "@/modules/warning-letters/domain/pick-changed-clause-overrides";
import { buildWarningLetterDocumentSegments } from "@/modules/warning-letters/render/warning-letter-document-segments";
import { renderWarningLetterPreviewHtml } from "@/modules/warning-letters/render/render-warning-letter-html";
import { WarningLetterClientPresentation } from "@/modules/warning-letters/domain/warning-letter-client-presentation";
import { WarningLetterMonetaryCompleteness } from "@/modules/warning-letters/domain/warning-letter-monetary-completeness";
import { WarningLetterType } from "@/modules/warning-letters/domain/warning-letter-type";
import { sanitizeLawyerClauseOverrideText } from "@/modules/warning-letters/domain/sanitize-lawyer-clause-text";

function minimalSnapshot() {
  return {
    letterType: WarningLetterType.INITIAL_WARNING,
    templateVersionId: "initial_warning_he_v1",
    letterCaseReference: "WH-2026-000001",
    letterDateIso: "2026-04-19",
    printedDeadlineDateIso: "2026-04-29",
    clientPresentation: WarningLetterClientPresentation.COMMITTEE,
    deliveryChannelLabel: "רשום/הודעת ווטסאפ",
    subjectLine: "הנידון: test",
    introductionParagraph: "intro fixed",
    addresseeLines: ["לכבוד:"],
    apartmentAddressLine: "addr",
    debtorNamesLine: "debtor",
    debtMonthsCount: 2,
    settingsVersionId: null,
    monetaryCompleteness: WarningLetterMonetaryCompleteness.PRINCIPAL_ONLY,
    isOperativeSnapshot: true,
    previewWarningHe: null,
    principalAmountMinor: 120_000,
    totalDueMinor: 120_000,
    principalDisplay: "1,200.00 ₪",
    totalDisplay: "1,200.00 ₪",
    treatmentFeeGrossDisplay: null,
    totalWithTreatmentDisplay: null,
    treatmentDisplayClause: "",
    paymentLinkPlaceholder: "[link]",
    printedDeadlineDateDisplay: "29.4.26",
    numberedClauses: [
      {
        clauseId: "non_payment_despite_contact" as const,
        displayNumber: 1,
        body: "clause one",
      },
      {
        clauseId: "debt_table_intro" as const,
        displayNumber: 2,
        body: "table intro",
      },
      {
        clauseId: "payment_block" as const,
        displayNumber: 8,
        body: "pay block",
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

describe("warning letter inline edit document model", () => {
  it("marks only allowlisted clauses editable", () => {
    const segments = buildWarningLetterDocumentSegments(minimalSnapshot());
    const clauses = segments.filter((s) => s.kind === "clause");
    expect(clauses.find((c) => c.clauseId === "non_payment_despite_contact")?.editable).toBe(true);
    expect(clauses.find((c) => c.clauseId === "debt_table_intro")?.editable).toBe(false);
    expect(segments.some((s) => s.kind === "debtTable")).toBe(true);
    expect(segments.some((s) => s.kind === "paymentBlock")).toBe(true);
  });

  it("html renderer and segment builder share clause count", () => {
    const snapshot = minimalSnapshot();
    const segments = buildWarningLetterDocumentSegments(snapshot);
    const html = renderWarningLetterPreviewHtml(snapshot);
    const clauseSegments = segments.filter((s) => s.kind === "clause").length;
    const htmlClauseCount = (html.match(/class="clause"/g) ?? []).length;
    expect(htmlClauseCount).toBe(clauseSegments);
  });

  it("does not expose technical clause ids in html output", () => {
    const html = renderWarningLetterPreviewHtml(minimalSnapshot());
    expect(html).not.toContain("non_payment_despite_contact");
    expect(html).not.toContain("debt_table_intro");
  });

  it("pickChangedClauseOverrides returns empty for no-op edits", () => {
    const snapshot = minimalSnapshot();
    const drafts = buildInitialClauseDraftMap(snapshot);
    const changed = pickChangedClauseOverrides({
      snapshot,
      overrides: {
        non_payment_despite_contact: drafts.non_payment_despite_contact!,
      },
    });
    expect(Object.keys(changed)).toHaveLength(0);
  });

  it("rejects script injection in clause sanitization", () => {
    expect(sanitizeLawyerClauseOverrideText("<img onerror=alert(1)>").ok).toBe(false);
  });
});
