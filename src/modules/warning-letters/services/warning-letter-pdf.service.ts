import "server-only";

import {
  generateWarningLetterFinalPdfBuffer,
  sha256PdfBuffer,
} from "@/modules/warning-letters/pdf/warning-letter-pdf.service";
import type { WarningLetterContentSnapshot } from "@/modules/warning-letters/snapshot/warning-letter-snapshot.types";

export type WarningLetterPdfGenerationResult =
  | { ok: true; contentSha256: string; storageKey: null; byteLength: number }
  | { ok: false; reasonHe: string };

/**
 * Operative final PDF — Chromium HTML print. No blob storage (regenerate from frozen snapshot).
 */
export async function generateWarningLetterFinalPdf(input: {
  snapshot: WarningLetterContentSnapshot;
  contentSha256: string;
  draftRevision: number;
}): Promise<WarningLetterPdfGenerationResult> {
  void input.contentSha256;
  try {
    const buffer = await generateWarningLetterFinalPdfBuffer({
      snapshot: input.snapshot,
      draftRevision: input.draftRevision,
    });
    return {
      ok: true,
      contentSha256: sha256PdfBuffer(buffer),
      storageKey: null,
      byteLength: buffer.length,
    };
  } catch (error) {
    return {
      ok: false,
      reasonHe: error instanceof Error ? error.message : "Final PDF generation failed.",
    };
  }
}