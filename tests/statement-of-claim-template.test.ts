import { describe, expect, it } from "vitest";

import { LegalDocumentTemplateCategory } from "@/modules/legal-document-templates/domain/legal-document-template-category";
import { LegalDocumentTemplateErrorCode } from "@/modules/legal-document-templates/domain/legal-document-template-errors";
import {
  evaluateApprovalEligibility,
  evaluatePublishEligibility,
} from "@/modules/legal-document-templates/domain/legal-document-template-lifecycle.rules";
import { LegalDocumentTemplateOperativeStatus } from "@/modules/legal-document-templates/domain/legal-document-template-operative-status";
import { LegalDocumentTemplateRevisionStatus } from "@/modules/legal-document-templates/domain/legal-document-template-revision-status";
import {
  escapeStatementOfClaimPreviewValue,
  validateStatementOfClaimPlaceholderTokens,
} from "@/modules/statement-of-claim-templates/domain/statement-of-claim-placeholder-registry";
import {
  buildDevelopmentStatementOfClaimTemplateBody,
  parseStatementOfClaimTemplateBody,
  serializeStatementOfClaimTemplateBody,
  validateStatementOfClaimTemplateBodyStructure,
} from "@/modules/statement-of-claim-templates/domain/statement-of-claim-template-body";
import { BUILDING_LEGAL_DOCUMENT_TEMPLATE_CATEGORIES } from "@/modules/legal-document-templates/domain/legal-document-template-category";

describe("statement of claim template body", () => {
  it("round-trips development structural template", () => {
    const body = buildDevelopmentStatementOfClaimTemplateBody();
    const raw = serializeStatementOfClaimTemplateBody(body);
    const parsed = parseStatementOfClaimTemplateBody(raw);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(validateStatementOfClaimTemplateBodyStructure(parsed.body)).toHaveLength(0);
    }
  });

  it("rejects unknown placeholders", () => {
    const body = buildDevelopmentStatementOfClaimTemplateBody();
    body.sections.court_jurisdiction!.bodyTemplate += " {{unknown_token}}";
    const check = validateStatementOfClaimPlaceholderTokens(
      body.sections.court_jurisdiction!.bodyTemplate,
    );
    expect(check.ok).toBe(false);
  });
});

describe("statement of claim placeholder preview escape", () => {
  it("escapes HTML in preview values", () => {
    expect(escapeStatementOfClaimPreviewValue("<script>")).toBe("&lt;script&gt;");
  });
});

describe("operative development safeguards", () => {
  it("blocks approval and publish for development_only revisions", () => {
    const base = {
      category: LegalDocumentTemplateCategory.STATEMENT_OF_CLAIM,
      operativeStatus: LegalDocumentTemplateOperativeStatus.DEVELOPMENT_ONLY,
      lifecycleStatus: LegalDocumentTemplateRevisionStatus.DRAFT,
      isCurrentDraft: true,
      contentSha256: "a".repeat(64),
      approvalContentSha256: "a".repeat(64),
    };
    expect(evaluateApprovalEligibility(base).ok).toBe(false);
    const publish = evaluatePublishEligibility(base);
    expect(publish.ok).toBe(false);
    if (!publish.ok) {
      expect(publish.code).toBe(LegalDocumentTemplateErrorCode.NON_OPERATIVE_REVISION);
    }
  });

  it("keeps building onboarding categories without statement of claim", () => {
    expect(BUILDING_LEGAL_DOCUMENT_TEMPLATE_CATEGORIES).not.toContain(
      LegalDocumentTemplateCategory.STATEMENT_OF_CLAIM,
    );
    expect(BUILDING_LEGAL_DOCUMENT_TEMPLATE_CATEGORIES).toHaveLength(3);
  });
});