export type AdminDebtCaseReviewActionState = {
  ok: boolean;
  message?: string;
  code?: string;
  /** Actionable missing/invalid items for lawyer review (especially approve). */
  requirements?: string[];
  /** Optional section element ids for in-page navigation hints. */
  sectionIds?: string[];
};

export const adminDebtCaseReviewActionInitialState: AdminDebtCaseReviewActionState = {
  ok: false,
};
