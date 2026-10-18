import { DebtCaseError } from "@/modules/debt-cases/domain/debt-case-errors";
import { mapDebtCaseErrorToHebrew } from "@/modules/debt-cases/presentation/debt-case-messages.he";
import type { AdminDebtCaseReviewActionState } from "@/modules/debt-cases/presentation/admin-debt-case-review-action-state";
import {
  WarningLetterError,
  WarningLetterErrorCode,
} from "@/modules/warning-letters/domain/warning-letter-errors";
import {
  WarningLetterDraftError,
  WarningLetterDraftErrorCode,
} from "@/modules/warning-letters/domain/warning-letter-draft-errors";
import { formatWarningLetterErrorHe } from "@/modules/warning-letters/presentation/warning-letter-messages.he";

const APPROVAL_BLOCKED_INTRO =
  "לא ניתן לאשר את התיק להכנת מכתב. יש להשלים את הפרטים הבאים:";

const TECHNICAL_FAILURE_MESSAGE =
  "לא הצלחנו להשלים את האישור עקב תקלה טכנית. נסה שוב. אם התקלה נמשכת, פנה למנהל המערכת.";

function warningLetterRequirement(code: WarningLetterErrorCode): {
  text: string;
  sectionId?: string;
} {
  switch (code) {
    case WarningLetterErrorCode.MISSING_DEBTOR_NAME:
      return { text: "חסר שם חייב (בעלים או שוכר, לפי הגדרת החייב המשפטי).", sectionId: "case-parties" };
    case WarningLetterErrorCode.MISSING_BUILDING_ADDRESS:
      return { text: "חסרה כתובת בניין מלאה.", sectionId: "case-building" };
    case WarningLetterErrorCode.MISSING_APARTMENT:
      return { text: "חסר מספר דירה בתיק.", sectionId: "case-overview" };
    case WarningLetterErrorCode.MISSING_DEBT_PERIOD:
      return { text: "חסרה תקופת חוב בתיק.", sectionId: "case-debt" };
    case WarningLetterErrorCode.MISSING_PRINCIPAL:
      return { text: "חסר סכום קרן החוב.", sectionId: "case-debt" };
    case WarningLetterErrorCode.MISSING_MANAGEMENT_COMPANY_NAME:
      return { text: "חסר שם חברת ניהול לנוסח המכתב.", sectionId: "case-building" };
    case WarningLetterErrorCode.MISSING_PUBLISHED_FINANCIAL_SETTINGS:
      return {
        text: "לא נמצאו הגדרות כספיות מפורסמות לתאריך המכתב.",
        sectionId: "case-legal-readiness",
      };
    case WarningLetterErrorCode.INCOMPATIBLE_FINANCIAL_SETTINGS:
      return {
        text: "גרסת ההגדרות הכספיות אינה תואמת למכתב התראה.",
        sectionId: "case-legal-readiness",
      };
    case WarningLetterErrorCode.MISSING_TREATMENT_FEE_WHEN_ELIGIBLE:
      return {
        text: "חסר סכום הוצאות טיפול בהגדרות המפורסמות.",
        sectionId: "case-legal-readiness",
      };
    case WarningLetterErrorCode.INCOMPLETE_OPERATIVE_SNAPSHOT:
      return { text: "נתוני המכתב אינם שלמים — יש להשלים פרטי תיק או בניין.", sectionId: "case-overview" };
    default:
      return { text: formatWarningLetterErrorHe(code) };
  }
}

function mapDraftErrorToState(error: WarningLetterDraftError): AdminDebtCaseReviewActionState {
  switch (error.code) {
    case WarningLetterDraftErrorCode.AUDIT_PERSISTENCE:
      return {
        ok: false,
        code: error.code,
        message: "הפעולה לא הושלמה — רישום ביקורת נכשל.",
      };
    case WarningLetterDraftErrorCode.CONCURRENT_DRAFT_CONFLICT:
    case WarningLetterDraftErrorCode.LEGACY_REFERENCE_UNIQUE_INDEX:
      return { ok: false, code: error.code, message: TECHNICAL_FAILURE_MESSAGE };
    default:
      return { ok: false, code: error.code, message: TECHNICAL_FAILURE_MESSAGE };
  }
}

export function mapLawyerDebtCaseReviewActionError(error: unknown): AdminDebtCaseReviewActionState {
  if (error instanceof DebtCaseError) {
    return {
      ok: false,
      code: error.code,
      message: mapDebtCaseErrorToHebrew(error.code),
    };
  }

  if (error instanceof WarningLetterError) {
    const req = warningLetterRequirement(error.code);
    return {
      ok: false,
      code: error.code,
      message: APPROVAL_BLOCKED_INTRO,
      requirements: [req.text],
      sectionIds: req.sectionId ? [req.sectionId] : undefined,
    };
  }

  if (error instanceof WarningLetterDraftError) {
    return mapDraftErrorToState(error);
  }

  if (error instanceof Error && error.message === "Cross-origin request rejected") {
    return { ok: false, message: "הבקשה נדחתה." };
  }

  if (process.env.NODE_ENV !== "production") {
    console.error("[lawyer-debt-case-review] unexpected action error", error);
  } else {
    console.error("[lawyer-debt-case-review] unexpected action error");
  }

  return { ok: false, message: TECHNICAL_FAILURE_MESSAGE };
}
