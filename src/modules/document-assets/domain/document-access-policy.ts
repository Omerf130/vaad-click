import { DocumentClassification } from "@/modules/document-assets/domain/document-classification";

/** Per-asset access flags; defaults derived from classification when creating assets. */
export type DocumentAccessPolicy = {
  /** When true, management company users with building assignment may list/read (future portal). */
  managementCompanyMayView: boolean;
  /** When true, building representatives may upload (future portal). */
  buildingOperatorsMayUpload: boolean;
  /** When true, only lawyer-admin may read/download (overrides MC/BR read). */
  lawyerAdminOnlyRead: boolean;
};

export function defaultAccessPolicyForClassification(
  classification: DocumentClassification,
): DocumentAccessPolicy {
  switch (classification) {
    case DocumentClassification.BANK_ACCOUNT_OWNERSHIP_PROOF:
      return {
        managementCompanyMayView: false,
        buildingOperatorsMayUpload: false,
        lawyerAdminOnlyRead: true,
      };
    case DocumentClassification.BUILDING_COMMITTEE_AUTHORIZATION:
      return {
        managementCompanyMayView: false,
        buildingOperatorsMayUpload: false,
        lawyerAdminOnlyRead: false,
      };
    default:
      return {
        managementCompanyMayView: false,
        buildingOperatorsMayUpload: false,
        lawyerAdminOnlyRead: true,
      };
  }
}
