export const BuildingLegalDocumentErrorCode = {
  FORBIDDEN: "forbidden",
  BUILDING_NOT_FOUND: "building_not_found",
  BUILDING_NOT_ACTIVE: "building_not_active",
  TEMPLATE_NOT_PUBLISHED: "template_not_published",
  TEMPLATE_NOT_APPROVED: "template_not_approved",
  TEMPLATE_REVISION_INVALID: "template_revision_invalid",
  UNKNOWN_CATEGORY: "unknown_category",
  CONCURRENT_GENERATION: "concurrent_generation",
  DOCUMENT_NOT_FOUND: "document_not_found",
} as const;

export type BuildingLegalDocumentErrorCode =
  (typeof BuildingLegalDocumentErrorCode)[keyof typeof BuildingLegalDocumentErrorCode];

export class BuildingLegalDocumentError extends Error {
  readonly code: BuildingLegalDocumentErrorCode;

  constructor(code: BuildingLegalDocumentErrorCode, message: string) {
    super(message);
    this.name = "BuildingLegalDocumentError";
    this.code = code;
  }
}
