/**
 * Operative (non-preview) warning-letter policy gates.
 * Lawyer answers acknowledge both receipt-based and letter-date+10 deadline wordings;
 * product/legal reconciliation for final dispatch is not decided — keep blocked.
 */

export const WARNING_LETTER_OPERATIVE_DEADLINE_POLICY_BLOCKED_HE =
  "מועד לתשלום בגרסה מבצעית: קיימים שני ניסוחים (10 ימים מקבלת המכתב לעומת תאריך מפורש מחושב מתאריך המכתב). לא נקבעה החלטה משפטית מחייבת לסגירה — סגירת מסמך סופי והגשה חסומות עד להכרעת עורך הדין.";

export const WARNING_LETTER_PAYMENT_COLLECTION_BLOCKED_HE =
  "גביית תשלום מקוונת (קישור אישי / חשבון נאמנות) אינה פעילה — אין אינטגרציית תשלום מאושרת.";

export const WARNING_LETTER_ELECTRONIC_SIGNING_BLOCKED_HE =
  "חתימה/הצהרה אלקטרונית מלאה (OTP, חותמת זמן, hash, ראיות) אינה מיושמת — לא ניתן לסמן מסמך כחתום.";

export const WARNING_LETTER_PDF_STORAGE_BLOCKED_HE =
  "אחסון מסמכים פרטי וייצור PDF מבצעי אינם מוגדרים (CP7) — הורדת PDF סופי חסומה.";

export const WARNING_LETTER_WHATSAPP_DISPATCH_BLOCKED_HE =
  "שליחת ווטסאפ אוטומטית/איסוף הוכחות דרך הפלטפורמה אינה מאושרת — רק תיעוד ידני בלוח הבקרה.";

export function isWarningLetterOperativeDeadlinePolicyResolved(): boolean {
  return false;
}
