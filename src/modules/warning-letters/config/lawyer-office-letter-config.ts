/** Static letterhead / signature metadata for preview (not production PDF assets in CP8.4B). */
export const LAWYER_OFFICE_LETTER_CONFIG = {
  firmDisplayName: 'משרד עו"ד צבי הרשל אשכנזי',
  lawyerSignatoryName: 'עו"ד צבי הרשל אשכנזי',
  barRegistrationNumber: "3901440190500",
  inquiriesMobileDisplay: "054-9001774",
} as const;

/** Non-operative placeholder — no payment integration in CP8.4B. */
export const WARNING_LETTER_PAYMENT_LINK_PREVIEW_PLACEHOLDER =
  "[קישור תשלום — יופעל לאחר חיבור סליקה]";

/** Preview-only label; dispatch channel chosen later (CP8.4E+). */
export const WARNING_LETTER_DEFAULT_DELIVERY_CHANNEL_LABEL = "רשום/הודעת ווטסאפ";

/** Ephemeral preview only — persisted drafts use allocated WH-YYYY-NNNNNN references. */
export const WARNING_LETTER_EPHEMERAL_PREVIEW_CASE_REFERENCE = "PREVIEW-ONLY";
