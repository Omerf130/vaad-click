import "server-only";

import { renderStatementOfClaimReviewPrintHtmlDocument } from "@/modules/statement-of-claim-drafts/pdf/render/render-statement-of-claim-review-print-html";
import { STATEMENT_OF_CLAIM_REVIEW_PDF_WATERMARK_HE } from "@/modules/statement-of-claim-drafts/pdf/statement-of-claim-pdf.constants";
import type { StatementOfClaimDraftContentSnapshot } from "@/modules/statement-of-claim-drafts/domain/statement-of-claim-draft-content-snapshot.types";
import { printHtmlToPdfBuffer } from "@/modules/warning-letters/pdf/warning-letter-chromium-pdf";
import { WarningLetterPdfRenderMode } from "@/modules/warning-letters/pdf/warning-letter-pdf-mode";
import {
  WarningLetterPdfError,
  WarningLetterPdfErrorCode,
} from "@/modules/warning-letters/pdf/warning-letter-pdf.errors";

export type StatementOfClaimReviewPdfInput = {
  snapshot: StatementOfClaimDraftContentSnapshot;
  draftRevision: number;
  generatedAtIso?: string;
};

export async function generateStatementOfClaimReviewPdfBuffer(
  input: StatementOfClaimReviewPdfInput,
): Promise<Buffer> {
  const generatedAtIso = input.generatedAtIso ?? new Date().toISOString();

  let html: string;
  try {
    html = renderStatementOfClaimReviewPrintHtmlDocument({
      snapshot: input.snapshot,
      draftRevision: input.draftRevision,
      generatedAtIso,
    });
  } catch (error) {
    throw new WarningLetterPdfError(
      WarningLetterPdfErrorCode.GENERATION_FAILED,
      error instanceof Error ? error.message : "Failed to build print HTML.",
    );
  }

  const watermark = STATEMENT_OF_CLAIM_REVIEW_PDF_WATERMARK_HE;
  try {
    const buffer = await printHtmlToPdfBuffer({
      html,
      draftRevision: input.draftRevision,
      mode: WarningLetterPdfRenderMode.REVIEW,
      chromeLabels: {
        headerHtml: `<div style="font-size:8px;width:100%;padding:0 14px;color:#b45309;text-align:center;direction:rtl;font-weight:700;">
          ${watermark} · גרסה ${input.draftRevision}
        </div>`,
        footerHtml: `<div style="font-size:8px;width:100%;padding:0 14px;color:#6b7280;text-align:center;direction:rtl;">
          ${watermark} · <span class="pageNumber"></span> / <span class="totalPages"></span>
        </div>`,
      },
    });
    if (!buffer?.length) {
      throw new WarningLetterPdfError(
        WarningLetterPdfErrorCode.GENERATION_FAILED,
        "PDF generation produced empty output.",
      );
    }
    return buffer;
  } catch (error) {
    if (error instanceof WarningLetterPdfError) {
      throw error;
    }
    throw new WarningLetterPdfError(
      WarningLetterPdfErrorCode.GENERATION_FAILED,
      "PDF generation failed.",
    );
  }
}