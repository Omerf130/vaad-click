import { OrganizationErrorCode } from "@/modules/buildings/domain/organization-errors";

export function mapOrganizationErrorToHebrew(code: OrganizationErrorCode): string {
  switch (code) {
    case OrganizationErrorCode.FORBIDDEN:
      return "אין הרשאה לביצוע הפעולה.";
    case OrganizationErrorCode.NOT_FOUND:
      return "הרשומה לא נמצאה.";
    case OrganizationErrorCode.VALIDATION:
      return "הנתונים שהוזנו אינם תקינים.";
    case OrganizationErrorCode.DUPLICATE_ADDRESS:
      return "כבר קיים בניין פעיל עם כתובת זו. ניתן ליצור חריג עם נימוק מפורש.";
    case OrganizationErrorCode.REP_ALREADY_ASSIGNED:
      return "לנציג כבר משויך בניין אחר.";
    case OrganizationErrorCode.BUILDING_ALREADY_HAS_REP:
      return "לבניין כבר משויך נציג.";
    case OrganizationErrorCode.INVALID_ACCOUNT_STATUS:
      return "סטטוס החשבון אינו מאפשר פעולה זו.";
    case OrganizationErrorCode.INVALID_ROLE:
      return "סוג המשתמש אינו מתאים לפעולה.";
    case OrganizationErrorCode.CONFLICT:
      return "מצב הרשומה השתנה. רעננו את הדף ונסו שוב.";
    case OrganizationErrorCode.MANAGEMENT_COMPANY_INACTIVE:
      return "חברת הניהול אינה פעילה. בחרו חברה פעילה או הפעילו את הרשומה.";
    case OrganizationErrorCode.AUDIT_PERSISTENCE:
      return "הפעולה לא הושלמה — רישום ביקורת נכשל.";
    case OrganizationErrorCode.VERIFICATION_NOT_AVAILABLE:
      return "אימות משפטי אינו זמין בשלב זה.";
    default:
      return "לא ניתן להשלים את הפעולה.";
  }
}
