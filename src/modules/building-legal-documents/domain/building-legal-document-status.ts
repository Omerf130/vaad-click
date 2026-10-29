export const BuildingLegalDocumentStatus = {
  GENERATED_PENDING_SIGNATURE: "generated_pending_signature",
  SUPERSEDED: "superseded",
} as const;

export type BuildingLegalDocumentStatus =
  (typeof BuildingLegalDocumentStatus)[keyof typeof BuildingLegalDocumentStatus];

/** UI-only when no active instance exists for building/category. */
export const BuildingLegalDocumentUiStatus = {
  NOT_GENERATED: "not_generated",
  GENERATED_PENDING_SIGNATURE: "generated_pending_signature",
  SUPERSEDED: "superseded",
} as const;

export type BuildingLegalDocumentUiStatus =
  (typeof BuildingLegalDocumentUiStatus)[keyof typeof BuildingLegalDocumentUiStatus];
