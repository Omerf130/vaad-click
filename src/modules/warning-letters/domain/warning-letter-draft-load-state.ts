export const WarningLetterDraftLoadState = {
  /** Active draft matches current case material inputs. */
  ACTIVE_CURRENT: "active_current",
  /** Active draft exists but case material inputs changed — do not treat as current. */
  ACTIVE_STALE: "active_stale",
  /** No active draft; prior revision invalidated — regeneration required. */
  NEEDS_REGENERATION: "needs_regeneration",
  /** Approved case with no draft rows yet (creation happens on lawyer approve). */
  NO_DRAFT_YET: "no_draft_yet",
} as const;

export type WarningLetterDraftLoadState =
  (typeof WarningLetterDraftLoadState)[keyof typeof WarningLetterDraftLoadState];
