import {
  buildWarningLetterDocumentSegments,
} from "@/modules/warning-letters/render/warning-letter-document-segments";
import {
  renderWarningLetterBodyHtml,
} from "@/modules/warning-letters/render/warning-letter-document-html";
import type { WarningLetterContentSnapshot } from "@/modules/warning-letters/snapshot/warning-letter-snapshot.types";

export function renderWarningLetterPreviewHtml(snapshot: WarningLetterContentSnapshot): string {
  const segments = buildWarningLetterDocumentSegments(snapshot);
  const body = renderWarningLetterBodyHtml(segments, "workspacePreview");
  return `<article class="warningLetterDocument" dir="rtl" lang="he">\n${body}\n</article>`;
}