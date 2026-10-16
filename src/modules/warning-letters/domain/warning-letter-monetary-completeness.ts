export const WarningLetterMonetaryCompleteness = {
  /** All monetary fields resolved; suitable for future approval/dispatch pipelines. */
  COMPLETE: "complete",
  /** Principal only — building not eligible for treatment fee; no settings required. */
  PRINCIPAL_ONLY: "principal_only",
  /** Treatment fee expected but published settings or fee amount missing. */
  INCOMPLETE_MISSING_PUBLISHED_SETTINGS: "incomplete_missing_published_settings",
} as const;

export type WarningLetterMonetaryCompleteness =
  (typeof WarningLetterMonetaryCompleteness)[keyof typeof WarningLetterMonetaryCompleteness];

/** Shown in letter body when amounts cannot be resolved (never a numeric substitute). */
export const WARNING_LETTER_MONETARY_UNAVAILABLE_DISPLAY =
  "[לא זמין — חסרות הגדרות כספיות מפורסמות]";
