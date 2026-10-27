import { describe, expect, it } from "vitest";

import { computeWarningLetterTemplateVariantContentSha256 } from "@/modules/warning-letters/domain/warning-letter-template-variant-content-hash";
import {
  collectApplicableTemplateVariantIds,
  filterPendingTemplateVariantIds,
} from "@/modules/warning-letters/domain/warning-letter-unapproved-template-variant";
import { WarningLetterClientPresentation } from "@/modules/warning-letters/domain/warning-letter-client-presentation";
import { WarningLetterUnapprovedTemplateVariant } from "@/modules/warning-letters/domain/warning-letter-unapproved-template-variant";
import { INITIAL_WARNING_TEMPLATE_VERSION_ID } from "@/modules/warning-letters/domain/warning-letter-type";

describe("warning letter template variant approval", () => {
  it("computes stable content hash per variant", () => {
    const hashA = computeWarningLetterTemplateVariantContentSha256({
      variantId: WarningLetterUnapprovedTemplateVariant.COMMITTEE_INTRO,
      templateVersionId: INITIAL_WARNING_TEMPLATE_VERSION_ID,
    });
    const hashB = computeWarningLetterTemplateVariantContentSha256({
      variantId: WarningLetterUnapprovedTemplateVariant.COMMITTEE_INTRO,
      templateVersionId: INITIAL_WARNING_TEMPLATE_VERSION_ID,
    });
    expect(hashA).toBe(hashB);
    expect(hashA).toMatch(/^[a-f0-9]{64}$/);
  });

  it("excludes globally approved variants from pending list only at snapshot time", () => {
    const applicable = collectApplicableTemplateVariantIds({
      clientPresentation: WarningLetterClientPresentation.COMMITTEE,
      includeTreatmentExpenses: false,
    });
    const approved = new Set([WarningLetterUnapprovedTemplateVariant.COMMITTEE_INTRO]);
    const pending = filterPendingTemplateVariantIds({
      applicableVariantIds: applicable,
      globallyApprovedVariantIds: approved,
    });
    expect(pending).not.toContain(WarningLetterUnapprovedTemplateVariant.COMMITTEE_INTRO);
    expect(pending.length).toBe(applicable.length - 1);
  });

  it("has distinct content hashes for split payment-block variants", () => {
    const withTreatment = computeWarningLetterTemplateVariantContentSha256({
      variantId: WarningLetterUnapprovedTemplateVariant.PAYMENT_BLOCK_WITH_TREATMENT,
      templateVersionId: INITIAL_WARNING_TEMPLATE_VERSION_ID,
    });
    const withoutTreatment = computeWarningLetterTemplateVariantContentSha256({
      variantId: WarningLetterUnapprovedTemplateVariant.PAYMENT_BLOCK_WITHOUT_TREATMENT,
      templateVersionId: INITIAL_WARNING_TEMPLATE_VERSION_ID,
    });
    expect(withTreatment).not.toBe(withoutTreatment);
  });
});
