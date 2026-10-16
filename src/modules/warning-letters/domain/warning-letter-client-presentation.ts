/** Who appears as the client in the letter introduction (lawyer answers Q3–Q4). */
export const WarningLetterClientPresentation = {
  /** Committee representation only — opening variant "נציגות". */
  COMMITTEE: "committee",
  /** Management company as מרשה, committee as מיופת כוח — sample DOCX path. */
  MANAGEMENT_COMPANY: "management_company",
} as const;

export type WarningLetterClientPresentation =
  (typeof WarningLetterClientPresentation)[keyof typeof WarningLetterClientPresentation];
