/**
 * Fixed legal metadata — not derived from build time.
 * CP18C: publication date and jurisdiction §5.6 confirmed by counsel.
 */

/** Official document date for Terms of Use and Accessibility Statement. */
export const LEGAL_OFFICIAL_DOCUMENT_DATE_DISPLAY = "06.11.2026" as const;

/** Confirmed replacement text for Terms of Use section 5.6 (jurisdiction). */
export const TERMS_OF_USE_SECTION_5_6_JURISDICTION =
  "על תנאים אלה חל הדין הישראלי בלבד. סמכות השיפוט הייחודית נתונה לבתי המשפט המוסמכים בחיפה." as const;

/**
 * Accessibility statement fields that remain unresolved — do not invent values.
 * Internal review only — see docs/cp18c-legal-review-checklist.md.
 */
export const accessibilityStatementPendingReview = {
  coordinatorName: null,
  testingDate: null,
  testingOrganization: null,
  inquiryResponseTime: null,
  browserDeviceVerification: null,
} as const satisfies Record<
  | "coordinatorName"
  | "testingDate"
  | "testingOrganization"
  | "inquiryResponseTime"
  | "browserDeviceVerification",
  string | null
>;

export const accessibilityPendingFieldLabels: Record<
  keyof typeof accessibilityStatementPendingReview,
  string
> = {
  coordinatorName: "שם רכז/ת נגישות",
  testingDate: "תאריך בדיקת נגישות",
  testingOrganization: "גורם / ארגון שביצע את הבדיקה",
  inquiryResponseTime: "זמן מענה לפניות נגישות",
  browserDeviceVerification: "אימות תאימות דפדפנים ומכשירים",
};

/**
 * Operational notice — not a substitute for lawyer clauses.
 * Shown when Terms body references payment features not live in production.
 */
export const termsProductImplementationNotice = {
  title: "הבהרה תפעולית (מצב המערכת)",
  body:
    "ייתכן שתנאי השימוש מתייחסים לתשלומים מקוונים, שמירת אמצעי תשלום או גבייה אוטומטית. בשלב הפיתוח הנוכחי אין שער תשלום מחובר; בחירת אופן תשלום במסלול פתיחת תיק משמשת לתיעוד ולעבודה פנימית בלבד ואינה מפעילה חיוב.",
} as const;
