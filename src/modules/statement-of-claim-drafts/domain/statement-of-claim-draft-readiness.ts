import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import type { BuildingLegalReadinessResult } from "@/modules/debt-cases/domain/debt-case-legal-readiness";
import { DebtCaseLegalHoldReason } from "@/modules/debt-cases/domain/debt-case-legal-hold-reason";
import type { DebtCaseRecord } from "@/modules/debt-cases/domain/debt-case-record.types";
import { formatLegalDebtorHe } from "@/modules/debt-cases/presentation/debt-case-labels.he";

export type StatementOfClaimDraftReadinessInput = {
  authorized: boolean;
  debtCase: DebtCaseRecord | null;
  buildingAddressPresent: boolean;
  debtorDesignationPresent: boolean;
  finalWarningLetterPresent: boolean;
  templateRevisionPresent: boolean;
  legalReadiness: BuildingLegalReadinessResult | null;
  hasDisputedResponse: boolean;
  hasDeliveryConfirmation: boolean;
  hasEvidenceAssets: boolean;
  lawyerControlledFieldsIncomplete: boolean;
};

export type StatementOfClaimDraftReadiness = {
  hardBlockersHe: string[];
  legalWarningsHe: string[];
};

export function collectStatementOfClaimDraftReadinessBlockersHe(
  input: StatementOfClaimDraftReadinessInput,
): StatementOfClaimDraftReadiness {
  const hardBlockersHe: string[] = [];
  const legalWarningsHe: string[] = [];

  if (!input.authorized) {
    hardBlockersHe.push("אין הרשאת עורך דין לפעולה זו.");
  }
  if (!input.debtCase) {
    hardBlockersHe.push("תיק חוב לא נמצא.");
  }
  if (input.debtCase && !input.buildingAddressPresent) {
    hardBlockersHe.push("חסרה כתובת בניין.");
  }
  if (input.debtCase && !input.debtorDesignationPresent) {
    hardBlockersHe.push("חסרים פרטי חייב חיוניים.");
  }
  if (!input.finalWarningLetterPresent) {
    hardBlockersHe.push("חסר מכתב התראה סופי ומאושר לתיק.");
  }
  if (!input.templateRevisionPresent) {
    hardBlockersHe.push("תבנית כתב תביעה לפיתוח אינה זמינה (טיוטת תבנית מבנה).");
  }

  if (input.legalReadiness) {
    if (!input.legalReadiness.legalTreatmentAllowed) {
      for (const reason of input.legalReadiness.holdReasons) {
        if (reason === DebtCaseLegalHoldReason.POA_NOT_SIGNED) {
          legalWarningsHe.push("ייפוי כוח חתום חסר — לא יופק כתב תביעה מבצעי.");
        } else if (reason === DebtCaseLegalHoldReason.ENGAGEMENT_NOT_SIGNED) {
          legalWarningsHe.push("הסכם התקשרות חתום חסר.");
        } else if (reason === DebtCaseLegalHoldReason.BUILDING_NOT_APPROVED) {
          legalWarningsHe.push("בניין לא מאושר לטיפול משפטי.");
        } else {
          legalWarningsHe.push(`מניעת טיפול משפטי: ${reason}`);
        }
      }
    }
  }

  if (input.debtCase) {
    if (
      input.debtCase.workflowStatus === DebtCaseWorkflowStatus.CLOSED_MANUAL ||
      input.debtCase.workflowStatus === DebtCaseWorkflowStatus.REJECTED
    ) {
      legalWarningsHe.push("התיק סגור או נדחה — הטיוטה לצפייה פנימית בלבד.");
    }
    if (!formatLegalDebtorHe(input.debtCase.parties.legalDebtorDesignation).trim()) {
      legalWarningsHe.push("ייעוד חייב משפטי חסר או לא שלם.");
    }
  }

  if (!input.hasDeliveryConfirmation) {
    legalWarningsHe.push("אין אישור משלוח מכתב התראה מתועד.");
  }
  if (input.hasDisputedResponse) {
    legalWarningsHe.push("תיעוד מחלוקת/הכחשת חוב מהחייב.");
  }
  if (!input.hasEvidenceAssets) {
    legalWarningsHe.push("ייתכן שחסרים נספחי ראיה בתיק.");
  }
  if (input.lawyerControlledFieldsIncomplete) {
    legalWarningsHe.push(
      "שדות תביעה מבוקשים (סכום, ריבית, הוצאות, סעד) טרם הושלמו על ידי עורך הדין.",
    );
  }
  legalWarningsHe.push("ניסוח משפטי וסעד מבוקש — ממתין לתבנית מאושרת מעורך הדין.");

  return { hardBlockersHe, legalWarningsHe };
}