/**
 * UI/action-layer suggested defaults when creating the first draft (zero published versions).
 * Not legal rules and not persisted except through normal draft save/publish.
 */
export const SUGGESTED_ESCALATION_RECOVERY_BASIS_POINTS = 2_000;
/** 2.3% — suggested for new drafts only; must be saved explicitly before publish. */
export const SUGGESTED_TRUST_ACCOUNT_PROCESSING_FEE_BASIS_POINTS = 230;
/** 0.5% — suggested for new drafts only; must be saved explicitly before publish. */
export const SUGGESTED_COMMITTEE_TRANSFER_FEE_BASIS_POINTS = 50;
