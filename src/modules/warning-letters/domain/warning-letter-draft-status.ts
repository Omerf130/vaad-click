export const WarningLetterDraftStatus = {
  ACTIVE: "active",
  INVALIDATED: "invalidated",
  SUPERSEDED: "superseded",
} as const;

export type WarningLetterDraftStatus =
  (typeof WarningLetterDraftStatus)[keyof typeof WarningLetterDraftStatus];

export const WARNING_LETTER_DRAFT_STATUS_VALUES: readonly WarningLetterDraftStatus[] =
  Object.values(WarningLetterDraftStatus);
