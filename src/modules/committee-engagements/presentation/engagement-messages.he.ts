import { CommitteeEngagementErrorCode } from "@/modules/committee-engagements/domain/engagement-errors";

export function mapCommitteeEngagementErrorToHebrew(
  code: CommitteeEngagementErrorCode,
): string {
  switch (code) {
    case CommitteeEngagementErrorCode.FORBIDDEN:
      return "אין הרשאה לביצוע הפעולה.";
    case CommitteeEngagementErrorCode.NOT_FOUND:
      return "הבניין לא נמצא או אינו פעיל.";
    case CommitteeEngagementErrorCode.VALIDATION:
      return "הנתונים אינם תקינים.";
    case CommitteeEngagementErrorCode.CONFLICT:
      return "מצב הרשומה השתנה. רעננו את הדף.";
    case CommitteeEngagementErrorCode.FINANCIAL_VERSION_INCOMPLETE:
      return "אין גרסה כספית בתוקף עם עמלות פלטפורמה. פרסמו גרסה מעודכנת בהגדרות כספיות.";
    case CommitteeEngagementErrorCode.ALREADY_SIGNED:
      return "תנאים חתומים אינם ניתנים להחלפה.";
    case CommitteeEngagementErrorCode.AUDIT_PERSISTENCE:
      return "הפעולה לא הושלמה — רישום ביקורת נכשל.";
    default:
      return "לא ניתן להשלים את הפעולה.";
  }
}

export const COMMITTEE_ENGAGEMENT_UI_COPY = {
  sectionTitle: "תנאים כספיים — ועד (טיוטה)",
  notCaptured: "טרם נלכדו תנאים מוצעים לבניין זה.",
  proposedDisclaimer:
    "התנאים המוצגים הם טיוטה מוצעת בלבד — לא חתימה משפטית. לאחר חתימה דיגיטלית (שלב עתידי) התנאים יהיו סופיים ולא ניתנים לדריסה.",
  transfersBlocked: "העברות יוצאות מהנאמנות: חסומות (נדרשים חשבון בנק מאושר וחתימה).",
  captureAction: "לכידת / עדכון תנאים מוצעים מגרסה גלובלית",
  versionLine: "מבוסס על גרסה כספית",
  trustFee: "עמלת נאמנות",
  transferFee: "עמלת העברה לוועד",
  successFee: "דמי הצלחה",
} as const;
