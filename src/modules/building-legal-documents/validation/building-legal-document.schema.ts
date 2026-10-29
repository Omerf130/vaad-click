import { z } from "zod";

import { legalDocumentTemplateCategorySchema } from "@/modules/legal-document-templates/validation/legal-document-template.schema";

export const generateBuildingLegalDocumentSchema = z.object({
  buildingId: z.string().min(1).max(128),
  category: legalDocumentTemplateCategorySchema,
});
