import { z } from "zod";

import {
  BuildingLegalDocumentPdfError,
  BuildingLegalDocumentPdfErrorCode,
} from "@/modules/building-legal-documents/pdf/building-legal-document-pdf.errors";
import {
  legalDocumentTemplateBodyTextSchema,
  legalDocumentTemplateCategorySchema,
} from "@/modules/legal-document-templates/validation/legal-document-template.schema";

export const buildingLegalDocumentPdfInputSchema = z.object({
  titleHe: z.string().trim().min(1).max(500),
  renderedContentSnapshot: legalDocumentTemplateBodyTextSchema,
  category: legalDocumentTemplateCategorySchema,
  /** ISO-8601 generation timestamp shown in metadata (defaults in layout when omitted). */
  generatedAtIso: z.string().datetime({ offset: true }).optional(),
  /** Optional stable id for PDF metadata only — never logged on failure. */
  documentReferenceId: z.string().uuid().optional(),
});

export type BuildingLegalDocumentPdfInput = z.infer<typeof buildingLegalDocumentPdfInputSchema>;

export function parseBuildingLegalDocumentPdfInput(input: unknown): BuildingLegalDocumentPdfInput {
  const result = buildingLegalDocumentPdfInputSchema.safeParse(input);
  if (!result.success) {
    throw new BuildingLegalDocumentPdfError(
      BuildingLegalDocumentPdfErrorCode.INVALID_INPUT,
      "Invalid PDF generation input.",
    );
  }
  return result.data;
}
