import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";

import { WARNING_LETTER_REVIEW_PDF_BANNER_HE } from "@/modules/warning-letters/pdf/warning-letter-pdf.constants";
import { WarningLetterPdfRenderMode } from "@/modules/warning-letters/pdf/warning-letter-pdf-mode";
import { buildNotoSansHebrewPrintFontFaceCss } from "@/modules/warning-letters/pdf/warning-letter-print-font";
import { buildWarningLetterDocumentSegments } from "@/modules/warning-letters/render/warning-letter-document-segments";
import {
  escapeWarningLetterHtml,
  renderWarningLetterBodyHtml,
  type WarningLetterHtmlRenderVariant,
} from "@/modules/warning-letters/render/warning-letter-document-html";
import type { WarningLetterContentSnapshot } from "@/modules/warning-letters/snapshot/warning-letter-snapshot.types";

const PRINT_CSS = readFileSync(
  path.join(process.cwd(), "src/modules/warning-letters/pdf/render/warning-letter-review-print.css"),
  "utf8",
);

export type WarningLetterPrintHtmlInput = {
  snapshot: WarningLetterContentSnapshot;
  draftRevision: number;
  mode: WarningLetterPdfRenderMode;
};

function htmlVariantForMode(mode: WarningLetterPdfRenderMode): WarningLetterHtmlRenderVariant {
  return mode === WarningLetterPdfRenderMode.FINAL ? "operativePrint" : "reviewPrint";
}

export function renderWarningLetterPrintHtmlDocument(input: WarningLetterPrintHtmlInput): string {
  const segments = buildWarningLetterDocumentSegments(input.snapshot);
  const body = renderWarningLetterBodyHtml(segments, htmlVariantForMode(input.mode));

  const titlePrefix =
    input.mode === WarningLetterPdfRenderMode.FINAL ? "מכתב התראה — סופי" : "מכתב התראה — בדיקה";
  const title = escapeWarningLetterHtml(
    `${titlePrefix} — ${input.snapshot.letterCaseReference} (גרסה ${input.draftRevision})`,
  );

  const reviewExtras =
    input.mode === WarningLetterPdfRenderMode.REVIEW
      ? (() => {
          const adminNotice = input.snapshot.previewWarningHe?.trim()
            ? `<aside class="adminNotice" role="note">${escapeWarningLetterHtml(input.snapshot.previewWarningHe.trim())}</aside>`
            : "";
          return `<p class="reviewBanner" role="status">${escapeWarningLetterHtml(WARNING_LETTER_REVIEW_PDF_BANNER_HE)}</p>${adminNotice}`;
        })()
      : "";

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
  <main class="documentRoot">
    ${reviewExtras}
    ${body}
  </main>
</body>
</html>`;
}