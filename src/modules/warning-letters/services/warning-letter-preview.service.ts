import "server-only";

import { BuildingOrganizationalStatus } from "@/modules/buildings/domain/building-status";
import { Building } from "@/modules/buildings/infra/building.model";
import { ManagementCompany } from "@/modules/management-companies/infra/management-company.model";
import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import { assertLawyerAdminDebtCaseReview } from "@/modules/debt-cases/services/debt-case-authorization.service";
import { getDebtCase } from "@/modules/debt-cases/services/debt-case.service";
import { resolveApplicableFinancialSettingsVersion } from "@/modules/financial-settings/services/financial-settings-query.service";
import {
  LAWYER_OFFICE_LETTER_CONFIG,
  WARNING_LETTER_DEFAULT_DELIVERY_CHANNEL_LABEL,
  WARNING_LETTER_EPHEMERAL_PREVIEW_CASE_REFERENCE,
  WARNING_LETTER_PAYMENT_LINK_PREVIEW_PLACEHOLDER,
} from "@/modules/warning-letters/config/lawyer-office-letter-config";
import { WarningLetterClientPresentation } from "@/modules/warning-letters/domain/warning-letter-client-presentation";
import {
  WarningLetterError,
  WarningLetterErrorCode,
} from "@/modules/warning-letters/domain/warning-letter-errors";
import { buildInitialWarningLetterPreviewSnapshot } from "@/modules/warning-letters/snapshot/build-warning-letter-snapshot";
import type { WarningLetterContentSnapshot } from "@/modules/warning-letters/snapshot/warning-letter-snapshot.types";
import { renderWarningLetterPreviewHtml } from "@/modules/warning-letters/render/render-warning-letter-html";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { connectMongo } from "@/shared/db/connect";

export type WarningLetterPreviewResult = {
  snapshot: WarningLetterContentSnapshot;
  html: string;
  previewWarningHe: string | null;
};

export async function loadWarningLetterPreviewForDebtCase(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
}): Promise<WarningLetterPreviewResult> {
  await assertLawyerAdminDebtCaseReview({ context: input.context });

  const record = await getDebtCase({
    context: input.context,
    debtCaseId: input.debtCaseId,
  });

  if (record.lawyerReviewStatus !== DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP) {
    throw new WarningLetterError(
      WarningLetterErrorCode.CASE_NOT_APPROVED_FOR_LETTER_PREP,
      "Warning letter preview is available only after approval for letter preparation",
    );
  }

  await connectMongo();
  const building = await Building.findOne({
    buildingId: record.buildingId,
    organizationalStatus: BuildingOrganizationalStatus.ACTIVE,
  })
    .select("address managementCompanyId treatmentFeeEligible")
    .lean();

  if (!building?.address) {
    throw new WarningLetterError(
      WarningLetterErrorCode.MISSING_BUILDING_ADDRESS,
      "Building address is missing",
    );
  }

  let managementCompanyLegalName: string | null = null;
  let clientPresentation: WarningLetterClientPresentation =
    WarningLetterClientPresentation.COMMITTEE;
  if (building.managementCompanyId) {
    clientPresentation = WarningLetterClientPresentation.MANAGEMENT_COMPANY;
    const mc = await ManagementCompany.findById(building.managementCompanyId)
      .select("displayName")
      .lean();
    managementCompanyLegalName = mc?.displayName ?? null;
  }

  const letterDateIso = new Date().toISOString().slice(0, 10);
  const treatmentFeeEligible = Boolean(building.treatmentFeeEligible);

  const financialSettings = treatmentFeeEligible
    ? await resolveApplicableFinancialSettingsVersion({
        context: input.context,
        asOf: new Date(`${letterDateIso}T12:00:00.000Z`),
      })
    : null;

  const snapshot = buildInitialWarningLetterPreviewSnapshot({
    debtCase: record,
    letterCaseReference: WARNING_LETTER_EPHEMERAL_PREVIEW_CASE_REFERENCE,
    building: {
      street: building.address.street,
      houseNumber: building.address.houseNumber,
      city: building.address.city,
      clientPresentation,
      managementCompanyLegalName,
      treatmentFeeEligible,
    },
    financialSettings,
    letterDateIso,
    deliveryChannelLabel: WARNING_LETTER_DEFAULT_DELIVERY_CHANNEL_LABEL,
    paymentLinkPlaceholder: WARNING_LETTER_PAYMENT_LINK_PREVIEW_PLACEHOLDER,
    inquiriesMobileDisplay: LAWYER_OFFICE_LETTER_CONFIG.inquiriesMobileDisplay,
    signatoryName: LAWYER_OFFICE_LETTER_CONFIG.lawyerSignatoryName,
    barRegistrationNumber: LAWYER_OFFICE_LETTER_CONFIG.barRegistrationNumber,
  });

  const html = renderWarningLetterPreviewHtml(snapshot);
  return {
    snapshot,
    html,
    previewWarningHe: snapshot.previewWarningHe,
  };
}
