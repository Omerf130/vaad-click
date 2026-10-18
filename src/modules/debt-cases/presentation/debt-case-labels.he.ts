import { DebtCaseDebtType } from "@/modules/debt-cases/domain/debt-case-debt-type";
import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import { LegalDebtorDesignation } from "@/modules/debt-cases/domain/debt-case-parties";
import { DebtCaseOccupancyType } from "@/modules/debt-cases/domain/debt-case-occupancy-type";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import { DebtCaseIdentityDocumentType } from "@/modules/debt-cases/domain/debt-case-identity-document";
import { DebtCaseLegalHoldReason } from "@/modules/debt-cases/domain/debt-case-legal-hold-reason";
import { DebtCaseValidationFlagSeverity } from "@/modules/debt-cases/domain/debt-case-validation-flag";

export function formatWorkflowStatusHe(status: DebtCaseWorkflowStatus): string {
  switch (status) {
    case DebtCaseWorkflowStatus.DRAFT:
      return "טיוטה";
    case DebtCaseWorkflowStatus.AWAITING_BUILDING_VERIFICATION:
      return "ממתין לאימות בניין";
    case DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW:
      return "ממתין לבדיקת עורך דין";
    case DebtCaseWorkflowStatus.RETURNED_FOR_COMPLETION:
      return "הוחזר להשלמה";
    case DebtCaseWorkflowStatus.REJECTED:
      return "נדחה";
    case DebtCaseWorkflowStatus.CLOSED_MANUAL:
      return "נסגר ידנית";
    case DebtCaseWorkflowStatus.LETTER_SENT:
      return "מכתב נשלח";
    default:
      return status;
  }
}

export function formatLawyerReviewStatusHe(status: DebtCaseLawyerReviewStatus): string {
  switch (status) {
    case DebtCaseLawyerReviewStatus.NOT_SUBMITTED:
      return "טרם הוגש";
    case DebtCaseLawyerReviewStatus.PENDING:
      return "ממתין לבדיקה";
    case DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP:
      return "אושר להכנת מכתב";
    case DebtCaseLawyerReviewStatus.REJECTED:
      return "נדחה";
    case DebtCaseLawyerReviewStatus.RETURNED:
      return "הוחזר";
    default:
      return status;
  }
}

export function formatOccupancyTypeHe(value: DebtCaseOccupancyType): string {
  return value === DebtCaseOccupancyType.TENANT ? "שוכר בדירה" : "בעלות";
}

export function formatLegalDebtorHe(value: LegalDebtorDesignation): string {
  return value === LegalDebtorDesignation.TENANT ? "השוכר" : "בעלי הדירה";
}

export function formatDebtTypeHe(value: DebtCaseDebtType): string {
  return value === DebtCaseDebtType.SPECIAL_ASSESSMENT ? "חיוב מיוחד" : "דמי ועד שוטפים";
}

export function formatValidationSeverityHe(
  severity: DebtCaseValidationFlagSeverity,
): string {
  return severity === DebtCaseValidationFlagSeverity.BLOCK ? "חסימה" : "אזהרה";
}

export function formatMinorUnitsToNisDisplay(minor: number | null): string {
  if (minor == null) {
    return "—";
  }
  return (minor / 100).toLocaleString("he-IL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function formatIdentityDocumentTypeHe(
  value: DebtCaseIdentityDocumentType | null | undefined,
): string {
  if (!value) {
    return "—";
  }
  return value === DebtCaseIdentityDocumentType.ISRAELI_ID ? "ת.ז." : "ח.פ.";
}

export function formatMobileE164ForDisplayHe(mobileE164: string | null | undefined): string {
  if (!mobileE164) {
    return "—";
  }
  if (mobileE164.startsWith("+972")) {
    return `0${mobileE164.slice(4)}`;
  }
  return mobileE164;
}

export function formatLegalHoldReasonHe(reason: DebtCaseLegalHoldReason): string {
  switch (reason) {
    case DebtCaseLegalHoldReason.BUILDING_NOT_APPROVED:
      return "הבניין טרם אושר על ידי עורך הדין";
    case DebtCaseLegalHoldReason.ENGAGEMENT_NOT_SIGNED:
      return "הסכם ועד לא נחתם";
    case DebtCaseLegalHoldReason.POA_NOT_SIGNED:
      return "ייפוי כוח לא נחתם";
    case DebtCaseLegalHoldReason.DEBTOR_DISPUTE:
      return "מחלוקת חייב";
    case DebtCaseLegalHoldReason.DEBTOR_INSOLVENCY:
      return "חייב בהליך חדלות פירעון";
    case DebtCaseLegalHoldReason.DEBTOR_DECEASED:
      return "חייב נפטר";
    case DebtCaseLegalHoldReason.BANK_ACCOUNT_CHANGE_UNAPPROVED:
      return "שינוי חשבון בנק לא אושר";
    default:
      return reason;
  }
}

export function formatDebtPeriodDisplayHe(start: string | null, end: string | null): string {
  if (!start || !end || start === "1970-01" || end === "1970-01") {
    return "—";
  }
  return `${start} – ${end}`;
}

/** Stable SSR/client formatting for debt-case timestamps (Israel timezone). */
export function formatDebtCaseInstantHe(iso: string): string {
  return new Intl.DateTimeFormat("he-IL", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Jerusalem",
  }).format(new Date(iso));
}

export function parseNisInputToMinorUnits(value: string): number | null {
  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) {
    return null;
  }
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }
  return Math.round(amount * 100);
}
