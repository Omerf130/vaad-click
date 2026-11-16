import "server-only";

import { WarningLetterPdfRenderMode } from "@/modules/warning-letters/pdf/warning-letter-pdf-mode";
import { renderWarningLetterPrintHtmlDocument } from "@/modules/warning-letters/pdf/render/render-warning-letter-print-html";
import type { WarningLetterContentSnapshot } from "@/modules/warning-letters/snapshot/warning-letter-snapshot.types";

export type WarningLetterReviewPrintHtmlInput = {
  snapshot: WarningLetterContentSnapshot;
  draftRevision: number;
  generatedAtIso: string;
};

export function renderWarningLetterReviewPrintHtmlDocument(
  input: WarningLetterReviewPrintHtmlInput,
): string {
  void input.generatedAtIso;
  return renderWarningLetterPrintHtmlDocument({
    snapshot: input.snapshot,
    draftRevision: input.draftRevision,
    mode: WarningLetterPdfRenderMode.REVIEW,
  });
}