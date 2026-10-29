export const BuildingLegalDocumentGenerationBlockCode = {
  NO_APPROVED_PUBLISHED_TEMPLATE: "no_approved_published_template",
  BUILDING_NOT_ACTIVE: "building_not_active",
  BUILDING_NOT_FOUND: "building_not_found",
} as const;

export type BuildingLegalDocumentGenerationBlockCode =
  (typeof BuildingLegalDocumentGenerationBlockCode)[keyof typeof BuildingLegalDocumentGenerationBlockCode];
