export type AdminDebtCaseReviewActionState = {
  ok: boolean;
  message?: string;
  code?: string;
};

export const adminDebtCaseReviewActionInitialState: AdminDebtCaseReviewActionState = {
  ok: false,
};
