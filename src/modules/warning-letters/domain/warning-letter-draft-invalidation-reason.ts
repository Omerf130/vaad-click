export const WarningLetterDraftInvalidationReason = {
  DEBT_CASE_MATERIAL_EDIT: "debt_case_material_edit",
  BUILDING_MATERIAL_CHANGE: "building_material_change",
  FINANCIAL_SETTINGS_PUBLISHED: "financial_settings_published",
  DEBT_CASE_REVIEW_INVALIDATED: "debt_case_review_invalidated",
} as const;

export type WarningLetterDraftInvalidationReason =
  (typeof WarningLetterDraftInvalidationReason)[keyof typeof WarningLetterDraftInvalidationReason];
