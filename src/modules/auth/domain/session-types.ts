export const SessionAuthStage = {
  /** Primary credential verified; MFA still required for lawyer admin. */
  PRIMARY: "primary",
  /** Fully authenticated session (MFA complete for lawyer, OTP complete for others). */
  MFA_COMPLETE: "mfa_complete",
} as const;

export type SessionAuthStage = (typeof SessionAuthStage)[keyof typeof SessionAuthStage];

export type SessionRecord = {
  userId: string;
  authStage: SessionAuthStage;
  expiresAt: Date;
  revokedAt: Date | null;
};

/** Default lifetimes — lawyer MFA-pending sessions are short; completed sessions are longer. */
export const SESSION_TTL_PRIMARY_SECONDS = 60 * 60;
export const SESSION_TTL_MFA_COMPLETE_SECONDS = 60 * 60 * 24 * 7;

export function sessionTtlSecondsForStage(stage: SessionAuthStage): number {
  return stage === SessionAuthStage.PRIMARY
    ? SESSION_TTL_PRIMARY_SECONDS
    : SESSION_TTL_MFA_COMPLETE_SECONDS;
}
