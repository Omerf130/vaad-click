import type { LegalDocumentDefinition } from "@/content/legal-pages";

/** Link label for registration / footer when document may still be pre-publication. */
export function legalDocumentLinkLabel(
  document: Pick<LegalDocumentDefinition, "title" | "hasAuthoritativeBody" | "publicationStatus">,
): string {
  if (document.hasAuthoritativeBody) {
    return document.title;
  }
  if (document.publicationStatus === "draft_pending_approval") {
    return `${document.title} (טיוטה)`;
  }
  return document.title;
}
