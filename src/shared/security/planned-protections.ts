/**
 * Documented security controls planned for CP3B+ — not enforced in CP3A.
 * Do not reference these as active mitigations in user-facing copy.
 */
export const PLANNED_SECURITY_CONTROLS = {
  rateLimitOtp: "CP17 — SMS OTP send and verify throttling",
  lawyerMfaEnrollment: "Future CP — TOTP/SMS MFA before production legal workflows",
  bruteForceLockout: "Future CP — progressive lockout counters persisted per account/IP",
  webhookVerification: "Integration CPs — signature verification on provider webhooks",
} as const;
