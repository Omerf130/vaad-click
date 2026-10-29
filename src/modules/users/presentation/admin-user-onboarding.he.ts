import { PendingBuildingOnboardingStatus } from "@/modules/debt-cases/domain/pending-building-onboarding-status";

export function formatPendingOnboardingStatusHe(status: string): string {
  switch (status) {
    case PendingBuildingOnboardingStatus.OPEN:
      return "ממתין לשיוך בניין";
    case PendingBuildingOnboardingStatus.BOUND:
      return "שויך בניין לבקשת ההרשמה";
    case PendingBuildingOnboardingStatus.CLOSED:
      return "הושלם / נסגר";
    default:
      return status;
  }
}

export const ADMIN_USER_ONBOARDING_BIND_SUCCESS_HE =
  "הבניין שויך לבקשת ההרשמה. לאחר אישור החשבון יש לוודא שיוך תפעולי (נציג או חברת ניהול) אם עדיין חסר.";

export const ADMIN_USER_ONBOARDING_BIND_SUCCESS_ACTIVE_HE =
  "הבניין שויך והשיוך התפעולי עודכן בהתאם לתפקיד המשתמש.";

export const ADMIN_USER_ONBOARDING_PENDING_ACCOUNT_NOTE_HE =
  "ניתן לשייך בניין לבקשת ההרשמה גם לפני אישור החשבון. אישור החשבון והשיוך התפעולי (נציג/חברת ניהול) נשארים שלבים נפרדים.";

export const ADMIN_USER_BUILDING_REP_SINGLE_BUILDING_HE =
  "נציג בית משותף יכול להיות משויך לבניין פעיל אחד בלבד. להחלפת בניין יש להסיר קודם את השיוך הקיים בדף הבניין.";

export const ADMIN_USER_MC_DUPLICATE_BUILDING_HE =
  "הבניין כבר משויך לחברת הניהול של משתמש זה.";

export const ADMIN_USER_MC_NO_COMPANY_HE =
  "למשתמש חברת ניהול אין עדיין רשומת חברה במערכת. יש לקשר את המשתמש לחברת ניהול לפני שיוך בניינים תפעולי.";
