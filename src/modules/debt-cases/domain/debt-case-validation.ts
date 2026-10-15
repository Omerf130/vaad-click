import { evaluateConfiguredAmountAnomalyFlag } from "@/modules/debt-cases/domain/debt-case-amount-anomaly-policy";
import type { DebtCaseAmountAnomalyPolicyInput } from "@/modules/debt-cases/domain/debt-case-amount-anomaly-policy";
import type { BuildingLegalReadinessResult } from "@/modules/debt-cases/domain/debt-case-legal-readiness";
import { DebtCaseOccupancyType } from "@/modules/debt-cases/domain/debt-case-occupancy-type";
import type { DebtCasePartyStructure } from "@/modules/debt-cases/domain/debt-case-parties";
import {
  resolveLegalDebtorMatchingLabel,
  resolvePrimaryDebtorContactMobileE164,
} from "@/modules/debt-cases/domain/debt-case-parties";
import { mobileNumbersEqual } from "@/modules/debt-cases/domain/debt-case-phone";
import {
  detectRepeatDebtorWarning,
  findOverlappingOpenCase,
  overlappingOpenCaseFlag,
  type DebtCaseDuplicateCandidate,
} from "@/modules/debt-cases/domain/debt-case-duplicate-detection";
import {
  DebtCaseValidationFlagCode,
  DebtCaseValidationFlagSeverity,
  type DebtCaseValidationFlag,
} from "@/modules/debt-cases/domain/debt-case-validation-flag";
import type { DebtPeriodMonth } from "@/modules/debt-cases/domain/debt-period";

export type DebtCaseValidationContext = {
  buildingId: string;
  debtCaseId?: string;
  apartmentKeyNormalized: string;
  parties: DebtCasePartyStructure;
  principalAmountMinor: number;
  periodStartMonth: DebtPeriodMonth;
  periodEndMonth: DebtPeriodMonth;
  operatorMobileE164?: string | null;
  buildingAverageMonthlyVaadFeeMinor?: number | null;
  amountAnomalyPolicy?: DebtCaseAmountAnomalyPolicyInput | null;
  legalReadiness?: BuildingLegalReadinessResult;
  duplicateCandidates?: readonly DebtCaseDuplicateCandidate[];
};

export function collectDebtCaseSubmissionFlags(
  input: DebtCaseValidationContext,
): DebtCaseValidationFlag[] {
  const flags: DebtCaseValidationFlag[] = [];
  const primaryMobile = resolvePrimaryDebtorContactMobileE164(input.parties);

  if (
    primaryMobile &&
    input.operatorMobileE164 &&
    mobileNumbersEqual(primaryMobile, input.operatorMobileE164)
  ) {
    flags.push({
      code: DebtCaseValidationFlagCode.DEBTOR_PHONE_MATCHES_OPERATOR,
      severity: DebtCaseValidationFlagSeverity.BLOCK,
      messageHe: "מספר הנייד של החייב זהה למספר הנציג — לא ניתן להמשיך",
    });
  }

  if (
    input.parties.occupancyType === DebtCaseOccupancyType.TENANT &&
    input.parties.tenant
  ) {
    for (const owner of input.parties.propertyOwners) {
      if (
        owner.mobileE164 &&
        mobileNumbersEqual(input.parties.tenant.mobileE164, owner.mobileE164)
      ) {
        flags.push({
          code: DebtCaseValidationFlagCode.TENANT_OWNER_PHONE_SAME,
          severity: DebtCaseValidationFlagSeverity.WARN,
          messageHe: "מספר הנייד של השוכר והבעלים זהים — יש לוודא מספר נוסף לבעלים",
        });
        break;
      }
    }
  }

  const amountFlag = evaluateConfiguredAmountAnomalyFlag({
    principalAmountMinor: input.principalAmountMinor,
    periodStartMonth: input.periodStartMonth,
    periodEndMonth: input.periodEndMonth,
    buildingAverageMonthlyVaadFeeMinor: input.buildingAverageMonthlyVaadFeeMinor,
    policy: input.amountAnomalyPolicy,
  });
  if (amountFlag) {
    flags.push(amountFlag);
  }

  if (input.legalReadiness && !input.legalReadiness.legalTreatmentAllowed) {
    flags.push({
      code: DebtCaseValidationFlagCode.LEGAL_READINESS_INCOMPLETE,
      severity: DebtCaseValidationFlagSeverity.WARN,
      messageHe: "הבניין טרם מוכן לטיפול משפטי — התיק ייכנס לבדיקה אך לא לשליחת מכתב",
    });
  }

  if (input.duplicateCandidates) {
    const overlap = findOverlappingOpenCase({
      buildingId: input.buildingId,
      apartmentKeyNormalized: input.apartmentKeyNormalized,
      periodStartMonth: input.periodStartMonth,
      periodEndMonth: input.periodEndMonth,
      excludeDebtCaseId: input.debtCaseId,
      candidates: input.duplicateCandidates,
    });
    if (overlap.isBlockingOverlap && overlap.conflictingCaseId) {
      flags.push(overlappingOpenCaseFlag(overlap.conflictingCaseId));
    }

    const repeat = detectRepeatDebtorWarning({
      buildingId: input.buildingId,
      apartmentKeyNormalized: input.apartmentKeyNormalized,
      legalDebtorMatchingLabel: resolveLegalDebtorMatchingLabel(input.parties),
      candidates: input.duplicateCandidates,
    });
    if (repeat.isRepeatWarning) {
      flags.push({
        code: DebtCaseValidationFlagCode.REPEAT_DEBTOR,
        severity: DebtCaseValidationFlagSeverity.WARN,
        messageHe: "זוהה חייב עם היסטוריית תיקים סגורים בדירה זו",
      });
    }
  }

  return flags;
}

export function hasBlockingValidationFlags(
  flags: readonly DebtCaseValidationFlag[],
): boolean {
  return flags.some((f) => f.severity === DebtCaseValidationFlagSeverity.BLOCK);
}
