export const DocumentOwnerEntityType = {
  BUILDING: "building",
  COMMITTEE_ENGAGEMENT: "committee_engagement",
  DEBT_CASE: "debt_case",
  DEBT_CASE_INTAKE_DRAFT: "debt_case_intake_draft",
  PAYMENT_RECORD: "payment_record",
} as const;

export type DocumentOwnerEntityType =
  (typeof DocumentOwnerEntityType)[keyof typeof DocumentOwnerEntityType];

export const DOCUMENT_OWNER_ENTITY_TYPES: readonly DocumentOwnerEntityType[] =
  Object.values(DocumentOwnerEntityType);
