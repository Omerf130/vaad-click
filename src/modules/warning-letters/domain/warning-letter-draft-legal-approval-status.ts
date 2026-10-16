export const WarningLetterDraftLegalApprovalStatus = {
  NONE: "none",
  APPROVED: "approved",
  RETURNED_FOR_CORRECTION: "returned_for_correction",
} as const;

export type WarningLetterDraftLegalApprovalStatus =
  (typeof WarningLetterDraftLegalApprovalStatus)[keyof typeof WarningLetterDraftLegalApprovalStatus];
