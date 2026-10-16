import "server-only";

import { getDocumentStorageCapability } from "@/modules/document-assets/infra/document-storage-registry";
import { WARNING_LETTER_PDF_STORAGE_BLOCKED_HE } from "@/modules/warning-letters/domain/warning-letter-operative-policy";
import type { WarningLetterContentSnapshot } from "@/modules/warning-letters/snapshot/warning-letter-snapshot.types";

export type WarningLetterPdfGenerationResult =
  | { ok: true; contentSha256: string; storageKey: string }
  | { ok: false; reasonHe: string };

/**
 * Server-side PDF for operative warning letters.
 * CP7 storage is not configured — generation remains disabled in production.
 */
export async function generateWarningLetterFinalPdf(input: {
  snapshot: WarningLetterContentSnapshot;
  contentSha256: string;
}): Promise<WarningLetterPdfGenerationResult> {
  void input;
  const capability = getDocumentStorageCapability();
  if (capability.state !== "configured") {
    return { ok: false, reasonHe: WARNING_LETTER_PDF_STORAGE_BLOCKED_HE };
  }
  return { ok: false, reasonHe: WARNING_LETTER_PDF_STORAGE_BLOCKED_HE };
}
