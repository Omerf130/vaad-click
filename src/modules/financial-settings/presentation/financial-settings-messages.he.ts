import { FinancialSettingsErrorCode } from "@/modules/financial-settings/domain/financial-settings-errors";

export const FINANCIAL_SETTINGS_UI_COPY = {
  pageTitle: "הגדרות כספיות",
  pageSubtitle:
    "ניהול גרסאות תעריפים לפלטפורמה. פרסום גרסה אינו גובה תשלום אוטומטית — יש לסקור ולאשר לפני פרסום.",
  suggestedBanner:
    "חלק מהערכים הוצעו לסקירה בלבד. יש לוודא שהם מתאימים לפני פרסום — עריכה אינה מהווה אישור משפטי.",
  suggestedFieldHint: "ערך מוצע לסקירה",
  noApplicableVersion: "אין גרסה בתוקף כרגע. לאחר פרסום, גרסה עתידית תיכנס לתוקף במועד שנקבע.",
  futureOnlyHint: "קיימת גרסה מתוזמנת שתיכנס לתוקף במועד התחילה שלה.",
  saveDraft: "שמירת טיוטה",
  discardDraft: "מחיקת טיוטה",
  discardConfirmTitle: "מחיקת טיוטה?",
  discardConfirmBody:
    "הטיוטה תימחק לצמיתות. לא יבוצע פרסום ולא יחולו שינויים שלא נשמרו. להמשיך?",
  discardConfirmAction: "כן, מחק טיוטה",
  discardConfirmCancel: "ביטול",
  createDraft: "יצירת טיוטה חדשה",
  cloneDraft: "שכפול לטיוטה",
  openPublishReview: "המשך לסקירה לפני פרסום",
  publishVersion: "פרסום גרסה",
  publishConfirmLabel:
    "אני מאשר/ת שסקרתי את ההגדרות ומבין/ה שגרסה שפורסמה אינה ניתנת לעריכה.",
  publishEffectiveDate: "תאריך תחילת תוקף (לוח עברי/לועזי — ישראל)",
  courtCostsUnresolved: "מדיניות עלויות משפט: טרם הוגדרה (יוגדר בהמשך)",
  escalationBaseUnresolved:
    "דמי הצלחה (20%): על קרן, הצמדה וריבית שנגבו בפועל לאחר הגשת התביעה — ללא שכ\"ט, הוצאות משפט, אגרות או הוצאות מכתב התראה. גבייה חלקית: הוצאות ואז קרן.",
  grossInclusiveFieldLabel: "כולל מע\"מ",
  legacyDraftGrossReentryBanner:
    "טיוטה זו נשענת על סכומים נטו (לפני מע\"מ) מגרסה היסטורית. יש להזין מחדש את דמי הטיפול כסכום כולל מע\"מ לפני פרסום — לא יבוצע המרה אוטומטית.",
  legacyPublishedAmountBadge: "לפני מע\"מ (גרסה היסטורית)",
  grossPublishedAmountBadge: "כולל מע\"מ",
  platformFeesNote:
    "שתי העמלות נשמרות בנפרד — לא מחברים לתצוגה או לחיוב עד לשלב התשלומים.",
  mustSaveBeforePublish: "יש לשמור את הטיוטה לפני פרסום.",
  unsavedDraftHint: "יש שינויים שלא נשמרו — שמור/י לפני פרסום.",
  publishReviewTitle: "סקירה לפני פרסום",
} as const;

export function mapFinancialSettingsErrorToHebrew(
  code: FinancialSettingsErrorCode,
): string {
  switch (code) {
    case FinancialSettingsErrorCode.FORBIDDEN:
      return "אין הרשאה לפעולה זו.";
    case FinancialSettingsErrorCode.DRAFT_ALREADY_EXISTS:
      return "כבר קיימת טיוטה פתוחה.";
    case FinancialSettingsErrorCode.NO_DRAFT:
      return "לא נמצאה טיוטה לעריכה.";
    case FinancialSettingsErrorCode.DRAFT_REVISION_CONFLICT:
      return "הטיוטה עודכנה במקום אחר. רעננ/י את הדף ונסה/י שוב.";
    case FinancialSettingsErrorCode.RETROACTIVE_EFFECTIVE_DATE:
      return "תאריך תחילת התוקף חייב להיות מהיום והלאה.";
    case FinancialSettingsErrorCode.EFFECTIVE_DATE_CONFLICT:
      return "כבר קיימת גרסה עם אותו תאריך תחילת תוקף.";
    case FinancialSettingsErrorCode.VALIDATION:
      return "נתונים לא תקינים. בדק/י את השדות ונסה/י שוב.";
    case FinancialSettingsErrorCode.LEGACY_DRAFT_REQUIRES_GROSS_AMOUNTS:
      return "יש להזין דמי טיפול כסכום כולל מע\"מ ולשמור לפני פרסום.";
    case FinancialSettingsErrorCode.AUDIT_PERSISTENCE:
      return "לא ניתן להשלים את הפעולה. נסה/י שוב מאוחר יותר.";
    case FinancialSettingsErrorCode.SOURCE_NOT_PUBLISHED:
      return "הגרסה לשכפול לא נמצאה.";
    default:
      return "אירעה שגיאה. נסה/י שוב.";
  }
}
