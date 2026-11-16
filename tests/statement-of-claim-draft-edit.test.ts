import { describe, expect, it } from "vitest";

import {
  buildActiveStatementOfClaimDraftEditConcurrencyQuery,
  statementOfClaimDraftConcurrencyMatchesExpected,
} from "@/modules/statement-of-claim-drafts/domain/statement-of-claim-draft-concurrency";
import {
  sanitizeStatementOfClaimSectionBody,
  sanitizeStatementOfClaimSectionTitle,
} from "@/modules/statement-of-claim-drafts/domain/sanitize-statement-of-claim-section-text";
import { renderStatementOfClaimReviewPrintHtmlDocument } from "@/modules/statement-of-claim-drafts/pdf/render/render-statement-of-claim-review-print-html";
import { STATEMENT_OF_CLAIM_REVIEW_PDF_WATERMARK_HE } from "@/modules/statement-of-claim-drafts/pdf/statement-of-claim-pdf.constants";
import type { StatementOfClaimDraftContentSnapshot } from "@/modules/statement-of-claim-drafts/domain/statement-of-claim-draft-content-snapshot.types";
import { StatementOfClaimTemplateSectionId } from "@/modules/statement-of-claim-templates/domain/statement-of-claim-template-section";

const minimalSnapshot: StatementOfClaimDraftContentSnapshot = {
  formatVersion: 1,
  developmentOnly: true,
  templateRevisionId: "tpl",
  templateContentSha256: "a".repeat(64),
  warningLetterFinalDocumentId: "fin",
  warningLetterFinalContentSha256: "b".repeat(64),
  letterCaseReference: "WH-1",
  factualPlaceholders: {},
  lawyerControlledIncompleteTokens: [],
  sections: [
    {
      sectionId: StatementOfClaimTemplateSectionId.DEFENDANT,
      titleHe: "נתבע",
      bodySystemBaseline: "נתבע: ישראל",
      bodyRendered: "נתבע: ישראל",
      hasIncompleteLawyerFields: false,
    },
  ],
  sourceSummary: {
    debtCaseRevision: 1,
    buildingId: "b1",
    buildingAddressHe: "רחוב 1",
    debtorDisplayNameHe: "ישראל",
    debtPeriodHe: "2024",
    letterTotalDueDisplay: "100 ₪",
    outstandingBalanceDisplay: "80 ₪",
    hasDisputedResponse: false,
    delivery: { recordCount: 0, hasConfirmedDelivery: false, channelsSummaryHe: "—" },
  },
};

describe("statement of claim section sanitize", () => {
  it("rejects HTML in body", () => {
    expect(sanitizeStatementOfClaimSectionBody("<b>x</b>").ok).toBe(false);
  });

  it("escapes content in review print html", () => {
    const snapshot: StatementOfClaimDraftContentSnapshot = {
      ...minimalSnapshot,
      sections: [
        {
          ...minimalSnapshot.sections[0]!,
          lawyerBodyOverride: '<script>alert(1)</script>',
        },
      ],
    };
    const html = renderStatementOfClaimReviewPrintHtmlDocument({
      snapshot,
      draftRevision: 2,
      generatedAtIso: "2026-04-19T10:00:00.000Z",
    });
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });

  it("includes watermark text", () => {
    const html = renderStatementOfClaimReviewPrintHtmlDocument({
      snapshot: minimalSnapshot,
      draftRevision: 1,
      generatedAtIso: "2026-04-19T10:00:00.000Z",
    });
    expect(html).toContain(STATEMENT_OF_CLAIM_REVIEW_PDF_WATERMARK_HE);
  });
});

describe("statement of claim draft concurrency", () => {
  it("matches legacy missing concurrency as 1", () => {
    expect(
      statementOfClaimDraftConcurrencyMatchesExpected({ storedRaw: undefined, expected: 1 }),
    ).toBe(true);
    expect(buildActiveStatementOfClaimDraftEditConcurrencyQuery(1)).toHaveProperty("$or");
  });
});

describe("portal isolation", () => {
  it("does not expose statement of claim draft UI in operator workspace", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const operator = readFileSync(
      join(process.cwd(), "src/modules/debt-cases/ui/OperatorDebtCaseWorkspace.tsx"),
      "utf8",
    );
    expect(operator).not.toMatch(/StatementOfClaim/);
  });
});

describe("statement of claim title sanitize", () => {
  it("rejects placeholders in title", () => {
    expect(sanitizeStatementOfClaimSectionTitle("{{debtor_name}}").ok).toBe(false);
  });
});