export const DocumentClassification = {
  BUILDING_COMMITTEE_AUTHORIZATION: "building_committee_authorization",
  BANK_ACCOUNT_OWNERSHIP_PROOF: "bank_account_ownership_proof",
  /** Reserved — not enabled in CP7 UI or uploads */
  LEGAL_ENGAGEMENT_AGREEMENT: "legal_engagement_agreement",
  SIGNED_ENGAGEMENT_AGREEMENT: "signed_engagement_agreement",
  DEBT_CASE_ATTACHMENT: "debt_case_attachment",
  GENERATED_WARNING_LETTER: "generated_warning_letter",
  PAYMENT_TRANSFER_PROOF: "payment_transfer_proof",
} as const;

export type DocumentClassification =
  (typeof DocumentClassification)[keyof typeof DocumentClassification];

export const DOCUMENT_CLASSIFICATIONS: readonly DocumentClassification[] =
  Object.values(DocumentClassification);

/** Classifications exposed in CP7 lawyer-admin building documents UI. */
export const CP7_ENABLED_DOCUMENT_CLASSIFICATIONS: readonly DocumentClassification[] = [
  DocumentClassification.BUILDING_COMMITTEE_AUTHORIZATION,
  DocumentClassification.BANK_ACCOUNT_OWNERSHIP_PROOF,
];

export function isCp7EnabledClassification(
  value: DocumentClassification,
): value is (typeof CP7_ENABLED_DOCUMENT_CLASSIFICATIONS)[number] {
  return (CP7_ENABLED_DOCUMENT_CLASSIFICATIONS as readonly DocumentClassification[]).includes(
    value,
  );
}
