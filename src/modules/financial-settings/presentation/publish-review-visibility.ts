export function shouldShowPublishReviewDialog(reviewOpen: boolean): boolean {
  return reviewOpen;
}

export type PublishReviewEligibility = {
  allowed: boolean;
  reasonHe?: string;
};

export function evaluatePublishReviewEligibility(input: {
  isDirty: boolean;
  requiresGrossAmountReentry?: boolean;
}): PublishReviewEligibility {
  if (input.isDirty) {
    return {
      allowed: false,
      reasonHe: "יש לשמור את הטיוטה לפני המשך לסקירה לפני פרסום.",
    };
  }
  if (input.requiresGrossAmountReentry) {
    return {
      allowed: false,
      reasonHe: "יש להזין דמי טיפול כסכום כולל מע\"מ ולשמור לפני פרסום.",
    };
  }
  return { allowed: true };
}
