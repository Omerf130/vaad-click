export function shouldShowPublishReviewDialog(reviewOpen: boolean): boolean {
  return reviewOpen;
}

export type PublishReviewEligibility = {
  allowed: boolean;
  reasonHe?: string;
};

export function evaluatePublishReviewEligibility(input: {
  isDirty: boolean;
}): PublishReviewEligibility {
  if (input.isDirty) {
    return {
      allowed: false,
      reasonHe: "יש לשמור את הטיוטה לפני המשך לסקירה לפני פרסום.",
    };
  }
  return { allowed: true };
}
