export const BuildingOrganizationalStatus = {
  ACTIVE: "active",
  ARCHIVED: "archived",
} as const;

export type BuildingOrganizationalStatus =
  (typeof BuildingOrganizationalStatus)[keyof typeof BuildingOrganizationalStatus];

export const LawyerVerificationStatus = {
  NOT_STARTED: "not_started",
  PENDING_DOCUMENTS: "pending_documents",
  PENDING_LAWYER_REVIEW: "pending_lawyer_review",
  VERIFIED: "verified",
} as const;

export type LawyerVerificationStatus =
  (typeof LawyerVerificationStatus)[keyof typeof LawyerVerificationStatus];

/** CP6A: legal verification is not available in product workflows. */
export const CP6_ALLOWED_VERIFICATION_STATUSES: readonly LawyerVerificationStatus[] = [
  LawyerVerificationStatus.NOT_STARTED,
  LawyerVerificationStatus.PENDING_DOCUMENTS,
  LawyerVerificationStatus.PENDING_LAWYER_REVIEW,
];

export function assertCp6VerificationTransition(
  nextStatus: LawyerVerificationStatus,
): void {
  if (nextStatus === LawyerVerificationStatus.VERIFIED) {
    throw new Error("Legal building verification is not available in CP6A");
  }
  if (!CP6_ALLOWED_VERIFICATION_STATUSES.includes(nextStatus)) {
    throw new Error("Invalid verification status");
  }
}
