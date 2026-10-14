import { describe, expect, it } from "vitest";

import {
  CP7_ENABLED_DOCUMENT_CLASSIFICATIONS,
  DocumentClassification,
  isCp7EnabledClassification,
} from "@/modules/document-assets/domain/document-classification";
import { defaultAccessPolicyForClassification } from "@/modules/document-assets/domain/document-access-policy";

describe("document classifications (CP7)", () => {
  it("enables only committee authorization and bank proof in CP7", () => {
    expect(CP7_ENABLED_DOCUMENT_CLASSIFICATIONS).toEqual([
      DocumentClassification.BUILDING_COMMITTEE_AUTHORIZATION,
      DocumentClassification.BANK_ACCOUNT_OWNERSHIP_PROOF,
    ]);
    expect(isCp7EnabledClassification(DocumentClassification.DEBT_CASE_ATTACHMENT)).toBe(false);
  });

  it("marks bank ownership proof as lawyer-admin-only read", () => {
    const policy = defaultAccessPolicyForClassification(
      DocumentClassification.BANK_ACCOUNT_OWNERSHIP_PROOF,
    );
    expect(policy.lawyerAdminOnlyRead).toBe(true);
    expect(policy.managementCompanyMayView).toBe(false);
  });
});
