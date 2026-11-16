import "server-only";

import { createHash } from "node:crypto";

import { adaptSnapshotForReviewPdf } from "@/modules/warning-letters/pdf/adapt-snapshot-for-review-pdf";
import { renderWarningLetterPrintHtmlDocument } from "@/modules/warning-letters/pdf/render/render-warning-letter-print-html";
import { WarningLetterPdfRenderMode } from "@/modules/warning-letters/pdf/warning-letter-pdf-mode";
import { printHtmlToPdfBuffer } from "@/modules/warning-letters/pdf/warning-letter-chromium-pdf";
import { renderWarningLetterReviewPrintHtmlDocument } from "@/modules/warning-letters/pdf/render/render-warning-letter-review-print-html";
import { assertOperativeWarningLetterSnapshot } from "@/modules/warning-letters/snapshot/assert-operative-warning-letter-snapshot";
import {
  WarningLetterPdfError,
  WarningLetterPdfErrorCode,
} from "@/modules/warning-letters/pdf/warning-letter-pdf.errors";
import type { WarningLetterContentSnapshot } from "@/modules/warning-letters/snapshot/warning-letter-snapshot.types";

export type WarningLetterReviewPdfInput = {
  snapshot: WarningLetterContentSnapshot;
  draftRevision: number;
  generatedAtIso?: string;
};

export async function generateWarningLetterReviewPdfBuffer(
  input: WarningLetterReviewPdfInput,
): Promise<Buffer> {
  const generatedAtIso = input.generatedAtIso ?? new Date().toISOString();
  const adaptedSnapshot = adaptSnapshotForReviewPdf(input.snapshot);

  let html: string;
  try {
    html = renderWarningLetterReviewPrintHtmlDocument({
      snapshot: adaptedSnapshot,
      draftRevision: input.draftRevision,
      generatedAtIso,
    });
  } catch (error) {
    if (error instanceof WarningLetterPdfError) {
      throw error;
    }
    throw new WarningLetterPdfError(
      WarningLetterPdfErrorCode.GENERATION_FAILED,
      "Failed to build print HTML.",
    );
  }

  try {
    const buffer = await printHtmlToPdfBuffer({
      html,
      draftRevision: input.draftRevision,
      mode: WarningLetterPdfRenderMode.REVIEW,
    });
    if (!buffer || buffer.length === 0) {
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

export async function generateWarningLetterFinalPdfBuffer(input: {
  snapshot: WarningLetterContentSnapshot;
  draftRevision: number;
}): Promise<Buffer> {
  assertOperativeWarningLetterSnapshot(input.snapshot);

  let html: string;
  try {
    html = renderWarningLetterPrintHtmlDocument({
      snapshot: input.snapshot,
      draftRevision: input.draftRevision,
      mode: WarningLetterPdfRenderMode.FINAL,
    });
  } catch (error) {
    if (error instanceof WarningLetterPdfError) {
      throw error;
    }
    throw new WarningLetterPdfError(
      WarningLetterPdfErrorCode.GENERATION_FAILED,
      "Failed to build final print HTML.",
    );
  }

  const buffer = await printHtmlToPdfBuffer({
    html,
    draftRevision: input.draftRevision,
    mode: WarningLetterPdfRenderMode.FINAL,
  });

  if (!buffer || buffer.length === 0) {
    throw new WarningLetterPdfError(
      WarningLetterPdfErrorCode.GENERATION_FAILED,
      "Final PDF generation produced empty output.",
    );
  }

  return buffer;
}

export function sha256PdfBuffer(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}