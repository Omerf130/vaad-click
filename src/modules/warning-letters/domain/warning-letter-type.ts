export const WarningLetterType = {
  INITIAL_WARNING: "initial_warning",
  BALANCE_LETTER: "balance_letter",
} as const;

export type WarningLetterType =
  (typeof WarningLetterType)[keyof typeof WarningLetterType];

/** Published template bundle id (immutable prose set). */
export const INITIAL_WARNING_TEMPLATE_VERSION_ID = "initial_warning_he_v1";
