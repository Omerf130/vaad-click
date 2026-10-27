import { describe, expect, it } from "vitest";

import { WarningLetterClientPresentation } from "@/modules/warning-letters/domain/warning-letter-client-presentation";
import {
  collectApplicableTemplateVariantIds,
  WarningLetterUnapprovedTemplateVariant,
} from "@/modules/warning-letters/domain/warning-letter-unapproved-template-variant";
import {
  listActiveTemplateVariantCatalogEntries,
  WARNING_LETTER_TEMPLATE_VARIANT_CATALOG,
} from "@/modules/warning-letters/domain/warning-letter-template-variant-catalog";
import { WARNING_LETTER_PAYMENT_LINK_PREVIEW_PLACEHOLDER } from "@/modules/warning-letters/config/lawyer-office-letter-config";
import { buildNumberedInitialWarningClauses } from "@/modules/warning-letters/snapshot/build-initial-warning-clauses";
import { substituteTemplate } from "@/modules/warning-letters/snapshot/substitute-template";
import {
  INITIAL_WARNING_PAYMENT_BLOCK_WITHOUT_TREATMENT,
  INITIAL_WARNING_PAYMENT_BLOCK_WITH_TREATMENT,
  PaymentInstructionTemplateKind,
  resolvePaymentInstructionClauseTemplate,
  resolvePaymentInstructionTemplateKind,
} from "@/modules/warning-letters/templates/payment-instruction-clauses";

describe("payment instruction clauses (CP12)", () => {
  it("exposes exactly two lawyer wordings in active catalog (no triple duplicate manifest)", () => {
    const active = listActiveTemplateVariantCatalogEntries();
    const paymentEntries = active.filter((e) => e.titleHe.includes("בלוק הנחיות תשלום"));
    expect(paymentEntries).toHaveLength(2);
    expect(paymentEntries.map((e) => e.variantId)).toEqual([
      WarningLetterUnapprovedTemplateVariant.PAYMENT_BLOCK_WITH_TREATMENT,
      WarningLetterUnapprovedTemplateVariant.PAYMENT_BLOCK_WITHOUT_TREATMENT,
    ]);
    const deprecated = WARNING_LETTER_TEMPLATE_VARIANT_CATALOG.find(
      (e) => e.variantId === WarningLetterUnapprovedTemplateVariant.PAYMENT_BLOCK_MANIFEST,
    );
    expect(deprecated?.deprecated).toBe(true);
  });

  it("requires approval for both payment variants", () => {
    const applicable = collectApplicableTemplateVariantIds({
      clientPresentation: WarningLetterClientPresentation.COMMITTEE,
      includeTreatmentExpenses: true,
    });
    expect(applicable).toContain(
      WarningLetterUnapprovedTemplateVariant.PAYMENT_BLOCK_WITH_TREATMENT,
    );
    expect(applicable).toContain(
      WarningLetterUnapprovedTemplateVariant.PAYMENT_BLOCK_WITHOUT_TREATMENT,
    );
    expect(applicable).not.toContain(
      WarningLetterUnapprovedTemplateVariant.PAYMENT_BLOCK_MANIFEST,
    );
  });

  it("selects with-treatment template when expenses apply", () => {
    expect(
      resolvePaymentInstructionTemplateKind({
        treatmentFeeEligible: true,
        includeTreatmentExpenses: true,
        monetaryPreviewIncomplete: false,
      }),
    ).toBe(PaymentInstructionTemplateKind.WITH_TREATMENT_EXPENSES);
    const body = substituteTemplate(
      resolvePaymentInstructionClauseTemplate({
        treatmentFeeEligible: true,
        includeTreatmentExpenses: true,
        monetaryPreviewIncomplete: false,
      }),
      {
        totalDisplay: "1,000 ₪",
        principalDisplay: "800 ₪",
        treatmentDisplayClause: "200 ₪",
        paymentLinkPlaceholder: WARNING_LETTER_PAYMENT_LINK_PREVIEW_PLACEHOLDER,
      },
    );
    expect(body).toContain("הוצאות טיפול");
    expect(body).not.toContain("(קרן החוב),");
  });

  it("selects without-treatment template when building not eligible", () => {
    expect(
      resolvePaymentInstructionTemplateKind({
        treatmentFeeEligible: false,
        includeTreatmentExpenses: false,
        monetaryPreviewIncomplete: false,
      }),
    ).toBe(PaymentInstructionTemplateKind.WITHOUT_TREATMENT_EXPENSES);
    const body = substituteTemplate(
      resolvePaymentInstructionClauseTemplate({
        treatmentFeeEligible: false,
        includeTreatmentExpenses: false,
        monetaryPreviewIncomplete: false,
      }),
      {
        totalDisplay: "800 ₪",
        principalDisplay: "800 ₪",
        treatmentDisplayClause: "",
        paymentLinkPlaceholder: WARNING_LETTER_PAYMENT_LINK_PREVIEW_PLACEHOLDER,
      },
    );
    expect(body).toContain("(קרן החוב)");
    expect(body).not.toContain("הוצאות טיפול");
  });

  it("uses with-treatment wording for incomplete preview (not a third duplicate template)", () => {
    const template = resolvePaymentInstructionClauseTemplate({
      treatmentFeeEligible: true,
      includeTreatmentExpenses: false,
      monetaryPreviewIncomplete: true,
    });
    expect(template).toBe(INITIAL_WARNING_PAYMENT_BLOCK_WITH_TREATMENT);
    expect(template).not.toBe(INITIAL_WARNING_PAYMENT_BLOCK_WITHOUT_TREATMENT);
  });

  it("renders exactly one payment_block clause in numbered output", () => {
    const clauses = buildNumberedInitialWarningClauses({
      clientPresentation: WarningLetterClientPresentation.COMMITTEE,
      isTenantLegalDebtor: false,
      jointOwners: false,
      includeTreatmentExpenses: true,
      includeIncompleteTreatmentClause: false,
      monetaryPreviewIncomplete: false,
      templateValues: {
        totalDisplay: "1 ₪",
        principalDisplay: "1 ₪",
        treatmentDisplayClause: "0 ₪",
        paymentLinkPlaceholder: WARNING_LETTER_PAYMENT_LINK_PREVIEW_PLACEHOLDER,
      },
    });
    const paymentBlocks = clauses.filter((c) => c.clauseId === "payment_block");
    expect(paymentBlocks).toHaveLength(1);
  });

  it("never substitutes a real https payment URL in placeholders", () => {
    const body = substituteTemplate(INITIAL_WARNING_PAYMENT_BLOCK_WITH_TREATMENT, {
      totalDisplay: "1 ₪",
      principalDisplay: "1 ₪",
      treatmentDisplayClause: "0 ₪",
      paymentLinkPlaceholder: WARNING_LETTER_PAYMENT_LINK_PREVIEW_PLACEHOLDER,
    });
    expect(body).toContain(WARNING_LETTER_PAYMENT_LINK_PREVIEW_PLACEHOLDER);
    expect(body).not.toMatch(/https?:\/\//);
  });
});
