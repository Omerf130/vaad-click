import { z } from "zod";

import {
  LEGAL_DOCUMENT_TEMPLATE_CATEGORY_VALUES,
  LegalDocumentTemplateCategory,
} from "@/modules/legal-document-templates/domain/legal-document-template-category";

export const legalDocumentTemplateCategorySchema = z.enum(
  LEGAL_DOCUMENT_TEMPLATE_CATEGORY_VALUES as [
    LegalDocumentTemplateCategory,
    ...LegalDocumentTemplateCategory[],
  ],
);

export const legalDocumentTemplateBodyTextSchema = z
  .string()
  .max(200_000, "הניסוח ארוך מדי");

export const saveLegalDocumentTemplateDraftSchema = z.object({
  category: legalDocumentTemplateCategorySchema,
  bodyText: legalDocumentTemplateBodyTextSchema,
});

export const legalDocumentTemplateRevisionIdSchema = z.string().uuid();

export const createLegalDocumentTemplateDraftSchema = z.object({
  category: legalDocumentTemplateCategorySchema,
  useDevPlaceholder: z.boolean().optional(),
});
