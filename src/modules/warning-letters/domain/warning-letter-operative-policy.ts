/**
 * Operative (non-preview) warning-letter integration policy gates.
 * Manual finalization (CP20B) does not require payment/storage/dispatch integrations.
 */

export {
  WARNING_LETTER_OPERATIVE_DEADLINE_POLICY_BLOCKED_HE,
} from "@/modules/warning-letters/domain/warning-letter-operative-deadline-policy";

export const WARNING_LETTER_PAYMENT_COLLECTION_BLOCKED_HE =
  "גביית תשלום מקוונת (קישור אישי / חשבון נאמנות) אינה פעילה — אין אינטגרציית תשלום מאושרת.";

export const WARNING_LETTER_ELECTRONIC_SIGNING_BLOCKED_HE =
  "חתימה/הצהרה אלקטרונית מלאה (OTP, חותמת זמן, hash, ראיות) אינה מיושמת — לא ניתן לסמן מסמך כחתום.";

export const WARNING_LETTER_PDF_STORAGE_BLOCKED_HE =
  "אחסון מסמכים פרטי וייצור PDF מבצעי אינם מוגדרים (CP7) — הורדת PDF סופי חסומה.";

export const WARNING_LETTER_WHATSAPP_DISPATCH_BLOCKED_HE =
  "שליחת ווטסאפ אוטומטית/איסוף הוכחות דרך הפלטפורמה אינה מאושרת — רק תיעוד ידני בלוח הבקרה.";

/** @deprecated Use isOperativeDeadlinePolicyConfirmed() — sync helper for review PDF deadline placeholder only. */
export function isWarningLetterOperativeDeadlinePolicyResolved(): boolean {
  return false;
}
