/**
 * Lawyer-proposed payment instruction blocks (CP12) — pending explicit approval per variant.
 * Single source for snapshot rendering and template-variant catalog entries.
 */

import { WarningLetterMonetaryCompleteness } from "@/modules/warning-letters/domain/warning-letter-monetary-completeness";

/** Variant A — with attorney treatment expenses in the debt total breakdown. */
export const INITIAL_WARNING_PAYMENT_BLOCK_WITH_TREATMENT =
  'לתשומת ליבך – את מלוא החוב, בסך כולל של {totalDisplay} (קרן החוב בסך {principalDisplay} בתוספת הוצאות טיפול עו"ד בסך {treatmentDisplayClause}), יש לשלם בתשלום אחד, לחשבון הנאמנות של משרדנו, באמצעות קישור התשלום האישי שנשלח אלייך בהודעת הווטסאפ: {paymentLinkPlaceholder}. ניתן לשלם בכרטיס אשראי או בהעברה בנקאית.\nאין לשלם את החוב, או כל חלק ממנו, ישירות לוועד הבית או לחברת הניהול. תשלום חלקי, בכל דרך שהיא, לא יביא לסגירת התיק עד לתשלום מלוא היתרה.';

/** Variant B — principal-only debt total (no treatment expense clause in this block). */
export const INITIAL_WARNING_PAYMENT_BLOCK_WITHOUT_TREATMENT =
  'לתשומת ליבך – את מלוא החוב, בסך כולל של {totalDisplay} (קרן החוב), יש לשלם בתשלום אחד, לחשבון הנאמנות של משרדנו, באמצעות קישור התשלום האישי שנשלח אלייך בהודעת הווטסאפ: {paymentLinkPlaceholder}. ניתן לשלם בכרטיס אשראי או בהעברה בנקאית.\nאין לשלם את החוב, או כל חלק ממנו, ישירות לוועד הבית או לחברת הניהול. תשלום חלקי, בכל דרך שהיא, לא יביא לסגירת התיק עד לתשלום מלוא היתרה.';

export const PaymentInstructionTemplateKind = {
  WITH_TREATMENT_EXPENSES: "with_treatment_expenses",
  WITHOUT_TREATMENT_EXPENSES: "without_treatment_expenses",
} as const;

export type PaymentInstructionTemplateKind =
  (typeof PaymentInstructionTemplateKind)[keyof typeof PaymentInstructionTemplateKind];

export type PaymentInstructionSelectionInput = {
  treatmentFeeEligible: boolean;
  includeTreatmentExpenses: boolean;
  monetaryPreviewIncomplete: boolean;
};

/**
 * Selects variant A vs B from validated flags (not from formatted display strings).
 * Incomplete monetary preview uses variant A wording with unresolved placeholders — not a third legal variant.
 */
export function resolvePaymentInstructionTemplateKind(
  input: PaymentInstructionSelectionInput,
): PaymentInstructionTemplateKind {
  if (
    input.includeTreatmentExpenses ||
    (input.monetaryPreviewIncomplete && input.treatmentFeeEligible)
  ) {
    return PaymentInstructionTemplateKind.WITH_TREATMENT_EXPENSES;
  }
  return PaymentInstructionTemplateKind.WITHOUT_TREATMENT_EXPENSES;
}

export function resolvePaymentInstructionClauseTemplate(
  input: PaymentInstructionSelectionInput,
): string {
  const kind = resolvePaymentInstructionTemplateKind(input);
  return kind === PaymentInstructionTemplateKind.WITH_TREATMENT_EXPENSES
    ? INITIAL_WARNING_PAYMENT_BLOCK_WITH_TREATMENT
    : INITIAL_WARNING_PAYMENT_BLOCK_WITHOUT_TREATMENT;
}

export type PaymentInstructionPreviewDescriptor = {
  templateKind: PaymentInstructionTemplateKind;
  /** True when monetary data is incomplete — placeholders may show unavailable tokens. */
  monetaryDisplayIncomplete: boolean;
};

export function describePaymentInstructionPreview(input: {
  monetaryCompleteness: WarningLetterMonetaryCompleteness;
  treatmentFeeEligible: boolean;
  includeTreatmentExpenses: boolean;
}): PaymentInstructionPreviewDescriptor {
  const monetaryDisplayIncomplete =
    input.monetaryCompleteness ===
    WarningLetterMonetaryCompleteness.INCOMPLETE_MISSING_PUBLISHED_SETTINGS;
  return {
    templateKind: resolvePaymentInstructionTemplateKind({
      treatmentFeeEligible: input.treatmentFeeEligible,
      includeTreatmentExpenses: input.includeTreatmentExpenses,
      monetaryPreviewIncomplete: monetaryDisplayIncomplete,
    }),
    monetaryDisplayIncomplete,
  };
}

export function formatPaymentInstructionPreviewLabelHe(
  descriptor: PaymentInstructionPreviewDescriptor,
): string {
  const variantLabel =
    descriptor.templateKind === PaymentInstructionTemplateKind.WITH_TREATMENT_EXPENSES
      ? "ניסוח עם הוצאות טיפול עו״ד"
      : "ניסוח ללא הוצאות טיפול בבלוק התשלום";
  if (descriptor.monetaryDisplayIncomplete) {
    return `${variantLabel} · תצוגה לא שלמה (סכומים/הגדרות חסרים — לא לשליחה)`;
  }
  return `${variantLabel} · תצוגה שלמה`;
}

/** Payment link / WhatsApp collection is not operational — preview only. */
export const WARNING_LETTER_PAYMENT_INFRASTRUCTURE_NOTICE_HE =
  "קישור תשלום, ווטסאפ וסליקה — טרם מחוברים; הניסוח לסקירה בלבד.";
