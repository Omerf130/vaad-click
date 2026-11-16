import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";

import {
  normalizeLegacyStatementOfClaimSection,
  resolveStatementOfClaimSectionDisplayBody,
  resolveStatementOfClaimSectionDisplayTitle,
  type StatementOfClaimDraftContentSnapshot,
} from "@/modules/statement-of-claim-drafts/domain/statement-of-claim-draft-content-snapshot.types";
import {
  STATEMENT_OF_CLAIM_REVIEW_PDF_BANNER_HE,
  STATEMENT_OF_CLAIM_REVIEW_PDF_WATERMARK_HE,
} from "@/modules/statement-of-claim-drafts/pdf/statement-of-claim-pdf.constants";
import { escapeStatementOfClaimPreviewValue } from "@/modules/statement-of-claim-templates/domain/statement-of-claim-placeholder-registry";
import { buildNotoSansHebrewPrintFontFaceCss } from "@/modules/warning-letters/pdf/warning-letter-print-font";

const PRINT_CSS = readFileSync(
  path.join(
    process.cwd(),
    "src/modules/statement-of-claim-drafts/pdf/render/statement-of-claim-review-print.css",
  ),
  "utf8",
);

export type StatementOfClaimReviewPrintHtmlInput = {
  snapshot: StatementOfClaimDraftContentSnapshot;
  draftRevision: number;
  generatedAtIso: string;
};

function escapePrintText(value: string): string {
  return escapeStatementOfClaimPreviewValue(value);
}

export function renderStatementOfClaimReviewPrintHtmlDocument(
  input: StatementOfClaimReviewPrintHtmlInput,
): string {
  const generatedAtHe = escapePrintText(
    new Date(input.generatedAtIso).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" }),
  );
  const ref = escapePrintText(input.snapshot.letterCaseReference);
  const title = escapePrintText(
    `כתב תביעה — טיוטת בדיקה · ${input.snapshot.letterCaseReference} (גרסה ${input.draftRevision})`,
  );

  const sectionsHtml = input.snapshot.sections
    .map((rawSection, index) => {
      const section = normalizeLegacyStatementOfClaimSection(rawSection);
      const displayTitle = resolveStatementOfClaimSectionDisplayTitle(section);
      const displayBody = resolveStatementOfClaimSectionDisplayBody(section);
      const hasLawyerEdit =
        Boolean(section.lawyerBodyOverride?.trim()) ||
        Boolean(section.titleLawyerOverride?.trim());
      const baselineNote =
        hasLawyerEdit && section.bodySystemBaseline !== displayBody
          ? `<p class="systemBaselineNote">נתוני מערכת (בסיס): ${escapePrintText(section.bodySystemBaseline)}</p>`
          : "";

      return `<section class="socSection">
  <h2 class="socSectionTitle"><span class="socSectionIndex">${index + 1}.</span>${escapePrintText(displayTitle)}</h2>
  <p class="socSectionBody">${escapePrintText(displayBody)}</p>
  ${baselineNote}
</section>`;
    })
    .join("\n");

  const fontFace = buildNotoSansHebrewPrintFontFaceCss();

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
${fontFace}
${PRINT_CSS}
  </style>
</head>
<body>
  <div class="pageWatermark" aria-hidden="true">${escapePrintText(STATEMENT_OF_CLAIM_REVIEW_PDF_WATERMARK_HE)}</div>
  <main class="documentRoot">
    <p class="reviewBanner" role="status">${escapePrintText(STATEMENT_OF_CLAIM_REVIEW_PDF_BANNER_HE)}</p>
    <p class="metaRow">סימוכין: ${ref} · גרסת טיוטה: ${input.draftRevision} · הופק: ${generatedAtHe}</p>
    ${sectionsHtml}
  </main>
</body>
</html>`;
}