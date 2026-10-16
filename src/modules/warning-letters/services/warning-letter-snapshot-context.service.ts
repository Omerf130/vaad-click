import "server-only";

import { BuildingOrganizationalStatus } from "@/modules/buildings/domain/building-status";
import { Building } from "@/modules/buildings/infra/building.model";
import { ManagementCompany } from "@/modules/management-companies/infra/management-company.model";
import type { DebtCaseRecord } from "@/modules/debt-cases/domain/debt-case-record.types";
import { resolveApplicableFinancialSettingsVersion } from "@/modules/financial-settings/services/financial-settings-query.service";
import {
  LAWYER_OFFICE_LETTER_CONFIG,
  WARNING_LETTER_DEFAULT_DELIVERY_CHANNEL_LABEL,
  WARNING_LETTER_PAYMENT_LINK_PREVIEW_PLACEHOLDER,
} from "@/modules/warning-letters/config/lawyer-office-letter-config";
import { WarningLetterClientPresentation } from "@/modules/warning-letters/domain/warning-letter-client-presentation";
import {
  WarningLetterError,
  WarningLetterErrorCode,
} from "@/modules/warning-letters/domain/warning-letter-errors";
import { buildInitialWarningLetterPreviewSnapshot } from "@/modules/warning-letters/snapshot/build-warning-letter-snapshot";
import type { WarningLetterBuildingMaterialContext } from "@/modules/warning-letters/snapshot/warning-letter-material-input";
import {
  buildWarningLetterMaterialInputs,
  computeWarningLetterMaterialInputsSha256,
} from "@/modules/warning-letters/snapshot/warning-letter-material-input";
import type { WarningLetterContentSnapshot } from "@/modules/warning-letters/snapshot/warning-letter-snapshot.types";
import { WarningLetterMonetaryCompleteness } from "@/modules/warning-letters/domain/warning-letter-monetary-completeness";
import { resolveWarningLetterFinancialSnapshot } from "@/modules/warning-letters/snapshot/resolve-financial-letter-amounts";
import {
  collectApplicableTemplateVariantIds,
  filterPendingTemplateVariantIds,
  isWarningLetterDraftApprovalReady,
} from "@/modules/warning-letters/domain/warning-letter-unapproved-template-variant";
import { loadGloballyApprovedTemplateVariantIds } from "@/modules/warning-letters/services/warning-letter-template-variant-approval.service";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { connectMongo } from "@/shared/db/connect";

export type WarningLetterSnapshotBuildBundle = {
  snapshot: WarningLetterContentSnapshot;
  materialInputsSha256: string;
  unapprovedTemplateVariantIds: string[];
  approvalReady: boolean;
  buildingMaterial: WarningLetterBuildingMaterialContext;
};

export async function loadBuildingWarningLetterContext(buildingId: string): Promise<{
  buildingMaterial: WarningLetterBuildingMaterialContext;
}> {
  await connectMongo();
  const building = await Building.findOne({
    buildingId,
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

  return {
    buildingMaterial: {
      street: building.address.street,
      houseNumber: building.address.houseNumber,
      city: building.address.city,
      clientPresentation,
      managementCompanyLegalName,
      treatmentFeeEligible: Boolean(building.treatmentFeeEligible),
    },
  };
}

/** Material fingerprint only — avoids full letter snapshot build on read paths. */
export async function computeCurrentMaterialInputsSha256ForDebtCase(input: {
  context: AuthenticatedContext;
  debtCase: DebtCaseRecord;
}): Promise<string> {
  const letterDateIso = new Date().toISOString().slice(0, 10);
  const { buildingMaterial } = await loadBuildingWarningLetterContext(input.debtCase.buildingId);

  const financialSettings = buildingMaterial.treatmentFeeEligible
    ? await resolveApplicableFinancialSettingsVersion({
        context: input.context,
        asOf: new Date(`${letterDateIso}T12:00:00.000Z`),
      })
    : null;

  const financial = resolveWarningLetterFinancialSnapshot({
    principalAmountMinor: input.debtCase.principalAmountMinor,
    treatmentFeeEligible: buildingMaterial.treatmentFeeEligible,
    financialSettings,
    requireOperativeMonetaryData: false,
  });

  return computeWarningLetterMaterialInputsSha256(
    buildWarningLetterMaterialInputs({
      debtCase: input.debtCase,
      building: buildingMaterial,
      settingsVersionId: financial.settingsVersionId,
    }),
  );
}

export async function buildPersistedInitialWarningLetterSnapshotBundle(input: {
  context: AuthenticatedContext;
  debtCase: DebtCaseRecord;
  letterCaseReference: string;
  letterDateIso?: string;
}): Promise<WarningLetterSnapshotBuildBundle> {
  const letterDateIso = input.letterDateIso ?? new Date().toISOString().slice(0, 10);
  const { buildingMaterial } = await loadBuildingWarningLetterContext(input.debtCase.buildingId);

  const financialSettings = buildingMaterial.treatmentFeeEligible
    ? await resolveApplicableFinancialSettingsVersion({
        context: input.context,
        asOf: new Date(`${letterDateIso}T12:00:00.000Z`),
      })
    : null;

  const snapshot = buildInitialWarningLetterPreviewSnapshot({
    debtCase: input.debtCase,
    building: buildingMaterial,
    financialSettings,
    letterDateIso,
    letterCaseReference: input.letterCaseReference,
    deliveryChannelLabel: WARNING_LETTER_DEFAULT_DELIVERY_CHANNEL_LABEL,
    paymentLinkPlaceholder: WARNING_LETTER_PAYMENT_LINK_PREVIEW_PLACEHOLDER,
    inquiriesMobileDisplay: LAWYER_OFFICE_LETTER_CONFIG.inquiriesMobileDisplay,
    signatoryName: LAWYER_OFFICE_LETTER_CONFIG.lawyerSignatoryName,
    barRegistrationNumber: LAWYER_OFFICE_LETTER_CONFIG.barRegistrationNumber,
  });

  const financial = resolveWarningLetterFinancialSnapshot({
    principalAmountMinor: input.debtCase.principalAmountMinor,
    treatmentFeeEligible: buildingMaterial.treatmentFeeEligible,
    financialSettings,
    requireOperativeMonetaryData: false,
  });

  const includeTreatmentExpenses =
    financial.treatmentFeeEligible &&
    financial.monetaryCompleteness === WarningLetterMonetaryCompleteness.COMPLETE &&
    financial.treatmentFeeGrossMinor != null;

  const applicableTemplateVariantIds = collectApplicableTemplateVariantIds({
    clientPresentation: buildingMaterial.clientPresentation,
    includeTreatmentExpenses,
  });
  const globallyApprovedVariantIds = await loadGloballyApprovedTemplateVariantIds();
  const unapprovedTemplateVariantIds = filterPendingTemplateVariantIds({
    applicableVariantIds: applicableTemplateVariantIds,
    globallyApprovedVariantIds,
  });

  const materialInputsSha256 = computeWarningLetterMaterialInputsSha256(
    buildWarningLetterMaterialInputs({
      debtCase: input.debtCase,
      building: buildingMaterial,
      settingsVersionId: financial.settingsVersionId,
    }),
  );

  const approvalReady = isWarningLetterDraftApprovalReady({
    isOperativeSnapshot: snapshot.isOperativeSnapshot,
    unapprovedTemplateVariantIds,
  });

  return {
    snapshot,
    materialInputsSha256,
    unapprovedTemplateVariantIds,
    approvalReady,
    buildingMaterial,
  };
}
