/** Server-controlled onboarding association for pending accounts (no client building self-auth). */
export const PendingBuildingOnboardingStatus = {
  OPEN: "open",
  BOUND: "bound",
  CLOSED: "closed",
} as const;

export type PendingBuildingOnboardingStatus =
  (typeof PendingBuildingOnboardingStatus)[keyof typeof PendingBuildingOnboardingStatus];
