import { WarningLetterClientPresentation } from "@/modules/warning-letters/domain/warning-letter-client-presentation";

/**
 * Legal-text branches present in CP8.4B manifest that still require explicit lawyer sign-off
 * before a draft may be marked approval-ready (CP8.4C+). Do not invent replacement wording.
 */
export const WarningLetterUnapprovedTemplateVariant = {
  MANAGEMENT_COMPANY_INTRO: "management_company_intro_v1",
  COMMITTEE_INTRO: "committee_intro_v1",
  OCCUPANCY_SPLIT_BRANCHES: "occupancy_split_branches_v1",
  PRINTED_DEADLINE_WITHOUT_TREATMENT: "printed_deadline_without_treatment_v1",
  PAYMENT_BLOCK_MANIFEST: "payment_block_manifest_v1",
} as const;

export type WarningLetterUnapprovedTemplateVariantId =
  (typeof WarningLetterUnapprovedTemplateVariant)[keyof typeof WarningLetterUnapprovedTemplateVariant];

export type UnapprovedVariantSelectionInput = {
  clientPresentation: WarningLetterClientPresentation;
  includeTreatmentExpenses: boolean;
};

export function collectApplicableTemplateVariantIds(
  input: UnapprovedVariantSelectionInput,
): WarningLetterUnapprovedTemplateVariantId[] {
  const ids: WarningLetterUnapprovedTemplateVariantId[] = [
    WarningLetterUnapprovedTemplateVariant.OCCUPANCY_SPLIT_BRANCHES,
    WarningLetterUnapprovedTemplateVariant.PAYMENT_BLOCK_MANIFEST,
  ];

  if (input.clientPresentation === WarningLetterClientPresentation.MANAGEMENT_COMPANY) {
    ids.push(WarningLetterUnapprovedTemplateVariant.MANAGEMENT_COMPANY_INTRO);
  } else {
    ids.push(WarningLetterUnapprovedTemplateVariant.COMMITTEE_INTRO);
  }

  if (!input.includeTreatmentExpenses) {
    ids.push(WarningLetterUnapprovedTemplateVariant.PRINTED_DEADLINE_WITHOUT_TREATMENT);
  }

  return ids;
}

/** @deprecated use collectApplicableTemplateVariantIds */
export const collectUnapprovedTemplateVariantIds = collectApplicableTemplateVariantIds;

export function filterPendingTemplateVariantIds(input: {
  applicableVariantIds: readonly string[];
  globallyApprovedVariantIds: ReadonlySet<string>;
}): string[] {
  return input.applicableVariantIds.filter((id) => !input.globallyApprovedVariantIds.has(id));
}

export function isWarningLetterDraftApprovalReady(input: {
  isOperativeSnapshot: boolean;
  unapprovedTemplateVariantIds: readonly string[];
}): boolean {
  return input.isOperativeSnapshot && input.unapprovedTemplateVariantIds.length === 0;
}
