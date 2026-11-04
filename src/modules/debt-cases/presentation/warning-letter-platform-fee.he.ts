import { WarningLetterPlatformFeeCollectionStatus } from "@/modules/debt-cases/domain/warning-letter-platform-fee-collection-status";
import { WarningLetterPlatformFeePaymentPreference } from "@/modules/debt-cases/domain/warning-letter-platform-fee-payment-preference";
import { formatMinorUnitsToNisDisplay } from "@/modules/debt-cases/presentation/debt-case-labels.he";
import { WARNING_LETTER_PLATFORM_FEE_AMOUNT_MINOR } from "@/modules/debt-cases/domain/warning-letter-platform-fee.constants";

export const WARNING_LETTER_PLATFORM_FEE_ONLINE_UNAVAILABLE_HE =
  "התשלום המקוון עדיין אינו זמין. פרטי התשלום יופיעו כאן לאחר הפעלת השירות.";

export function formatWarningLetterPlatformFeeAmountHe(
  amountMinor: number | null | undefined,
): string {
  const minor = amountMinor ?? WARNING_LETTER_PLATFORM_FEE_AMOUNT_MINOR;
  return `${formatMinorUnitsToNisDisplay(minor)} ₪`;
}

export function formatPlatformFeePaymentPreferenceHe(
  preference: WarningLetterPlatformFeePaymentPreference | null | undefined,
): string {
  if (!preference) {
    return "לא נבחר (תיק קודם)";
  }
  if (preference === WarningLetterPlatformFeePaymentPreference.IMMEDIATE_PAYMENT) {
    return "תשלום מיידי";
  }
  return "ניסיון גבייה מהחייב";
}

export function formatPlatformFeeCollectionStatusHe(
  status: WarningLetterPlatformFeeCollectionStatus | null | undefined,
): string {
  if (!status) {
    return "—";
  }
  switch (status) {
    case WarningLetterPlatformFeeCollectionStatus.AWAITING_ONLINE_PAYMENT:
      return "ממתין לתשלום מקוון";
    case WarningLetterPlatformFeeCollectionStatus.DEBTOR_COLLECTION_REQUESTED:
      return "נדרשת גבייה מהחייב";
    case WarningLetterPlatformFeeCollectionStatus.COLLECTION_IN_PROGRESS:
      return "גבייה בתהליך";
    case WarningLetterPlatformFeeCollectionStatus.PAID_SETTLED:
      return "שולם / הוסדר";
    case WarningLetterPlatformFeeCollectionStatus.MANUAL_FOLLOW_UP_REQUIRED:
      return "נדרשת מעקב ידני";
    default:
      return status;
  }
}

export const PLATFORM_FEE_PREFERENCE_OPTIONS = [
  {
    value: WarningLetterPlatformFeePaymentPreference.IMMEDIATE_PAYMENT,
    label: "תשלום מיידי",
    description: "אני מעוניין לשלם בעצמי את עלות מכתב ההתראה בסך 327 ₪.",
  },
  {
    value: WarningLetterPlatformFeePaymentPreference.ATTEMPT_DEBTOR_COLLECTION,
    label: "ניסיון גבייה מהחייב",
    description:
      "אני מבקש שעורך הדין ינסה לגבות את עלות מכתב ההתראה מהחייב. אם לא ניתן יהיה לגבות את הסכום, המשך הטיפול בתשלום יתבצע מול נציג הבניין בהתאם לתנאים שיאושרו.",
  },
] as const;
