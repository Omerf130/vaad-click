import { createHash } from "node:crypto";

import type { LegalDocumentTemplateCategory } from "@/modules/legal-document-templates/domain/legal-document-template-category";

export function computeLegalDocumentTemplateContentSha256(input: {
  category: LegalDocumentTemplateCategory;
  revisionId: string;
  bodyText: string;
}): string {
  const canonical = [
    input.category,
    input.revisionId,
    input.bodyText.normalize("NFC"),
  ].join("\n");
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
