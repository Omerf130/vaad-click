import { createHash } from "node:crypto";

import { getTemplateVariantCatalogEntry } from "@/modules/warning-letters/domain/warning-letter-template-variant-catalog";

export function computeWarningLetterTemplateVariantContentSha256(input: {
  variantId: string;
  templateVersionId: string;
}): string {
  const entry = getTemplateVariantCatalogEntry(input.variantId);
  if (!entry || entry.templateVersionId !== input.templateVersionId) {
    throw new Error(`Unknown template variant ${input.variantId}`);
  }
  if (entry.requiresLawyerClarification) {
    throw new Error(`Template variant ${input.variantId} lacks authoritative wording`);
  }
  const canonical = [
    input.templateVersionId,
    input.variantId,
    entry.wordingHe.normalize("NFC"),
  ].join("\n");
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
