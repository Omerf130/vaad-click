import { LegalDebtorDesignation } from "@/modules/debt-cases/domain/debt-case-parties";
import { countMonthsInclusive } from "@/modules/debt-cases/domain/debt-period";
import { WarningLetterClientPresentation } from "@/modules/warning-letters/domain/warning-letter-client-presentation";
import {
  WarningLetterError,
  WarningLetterErrorCode,
} from "@/modules/warning-letters/domain/warning-letter-errors";
import {
  INITIAL_WARNING_TEMPLATE_VERSION_ID,
  WarningLetterType,
} from "@/modules/warning-letters/domain/warning-letter-type";
import {
  computePrintedDeadlineDateIso,
  formatLetterDateDisplayHe,
} from "@/modules/warning-letters/snapshot/compute-letter-dates";
import { buildNumberedInitialWarningClauses } from "@/modules/warning-letters/snapshot/build-initial-warning-clauses";
import { formatMinorUnitsForLetterDisplay } from "@/modules/warning-letters/snapshot/format-letter-money";
import {
  WARNING_LETTER_MONETARY_UNAVAILABLE_DISPLAY,
  WarningLetterMonetaryCompleteness,
} from "@/modules/warning-letters/domain/warning-letter-monetary-completeness";
import {
  combineWarningLetterPreviewWarningsHe,
  formatIncompletePreviewWarningHe,
  WARNING_LETTER_PREVIEW_DEADLINE_PROVISIONAL_HE,
} from "@/modules/warning-letters/presentation/warning-letter-preview-warnings.he";
import { resolveWarningLetterFinancialSnapshot } from "@/modules/warning-letters/snapshot/resolve-financial-letter-amounts";
import { substituteTemplate } from "@/modules/warning-letters/snapshot/substitute-template";
import type { WarningLetterSnapshotBuildInput } from "@/modules/warning-letters/snapshot/warning-letter-snapshot-input";
import type { WarningLetterContentSnapshot } from "@/modules/warning-letters/snapshot/warning-letter-snapshot.types";
import { computeWarningLetterContentSha256 } from "@/modules/warning-letters/snapshot/warning-letter-canonical-hash";
import {
  INITIAL_WARNING_FIXED_CLAUSES,
  INITIAL_WARNING_INTRO_TEMPLATES,
  INITIAL_WARNING_SUBJECT_TEMPLATE,
} from "@/modules/warning-letters/templates/initial-warning-clause-manifest";
import {
  resolveLetterRecipients,
  type LetterRecipient,
} from "@/modules/debt-cases/domain/debt-case-parties";

function resolveDebtorNamesLine(input: WarningLetterSnapshotBuildInput): string {
  const { parties } = input.debtCase;
  if (parties.legalDebtorDesignation === LegalDebtorDesignation.TENANT && parties.tenant) {
    return parties.tenant.fullName.trim();
  }
  const names = parties.propertyOwners.map((o) => o.fullName.trim()).filter(Boolean);
  if (names.length === 0) {
    throw new WarningLetterError(
      WarningLetterErrorCode.MISSING_DEBTOR_NAME,
      "At least one property owner name is required",
    );
  }
  return names.join(" ");
}

function resolveApartmentAddressLine(input: WarningLetterSnapshotBuildInput): string {
  const { street, houseNumber, city } = input.building;
  if (!street.trim() || !houseNumber.trim() || !city.trim()) {
    throw new WarningLetterError(
      WarningLetterErrorCode.MISSING_BUILDING_ADDRESS,
      "Building street, house number, and city are required",
    );
  }
  const apartment = input.debtCase.apartmentNumberDisplay?.trim();
  if (!apartment) {
    throw new WarningLetterError(
      WarningLetterErrorCode.MISSING_APARTMENT,
      "Apartment number is required",
    );
  }
  return `${street} ${houseNumber} דירה מס' ${apartment}\n${city}`;
}

export function buildInitialWarningLetterSnapshot(
  input: WarningLetterSnapshotBuildInput,
): WarningLetterContentSnapshot {
  const debtCase = input.debtCase;
  const parties = debtCase.parties;

  if (
    input.building.clientPresentation === WarningLetterClientPresentation.MANAGEMENT_COMPANY &&
    !input.building.managementCompanyLegalName?.trim()
  ) {
    throw new WarningLetterError(
      WarningLetterErrorCode.MISSING_MANAGEMENT_COMPANY_NAME,
      "Management company legal name is required for MC client presentation",
    );
  }

  if (!debtCase.periodStartMonth || !debtCase.periodEndMonth) {
    throw new WarningLetterError(
      WarningLetterErrorCode.MISSING_DEBT_PERIOD,
      "Debt period is required",
    );
  }

  const financial = resolveWarningLetterFinancialSnapshot({
    financialSettings: input.financialSettings,
    principalAmountMinor: debtCase.principalAmountMinor,
    treatmentFeeEligible: input.building.treatmentFeeEligible,
    requireOperativeMonetaryData: input.requireOperativeMonetaryData,
  });

  const monetaryIncomplete =
    financial.monetaryCompleteness ===
    WarningLetterMonetaryCompleteness.INCOMPLETE_MISSING_PUBLISHED_SETTINGS;

  const unavailable = WARNING_LETTER_MONETARY_UNAVAILABLE_DISPLAY;
  const principalDisplay = formatMinorUnitsForLetterDisplay(financial.principalAmountMinor);
  const totalDisplay =
    financial.totalDueMinor != null
      ? formatMinorUnitsForLetterDisplay(financial.totalDueMinor)
      : unavailable;
  const treatmentFeeGrossDisplay =
    financial.treatmentFeeGrossMinor != null
      ? formatMinorUnitsForLetterDisplay(financial.treatmentFeeGrossMinor)
      : monetaryIncomplete
        ? unavailable
        : null;
  const totalWithTreatmentDisplay = financial.treatmentFeeEligible
    ? totalDisplay
    : null;

  const treatmentDisplayClause =
    monetaryIncomplete && financial.treatmentFeeEligible
      ? unavailable
      : financial.treatmentFeeEligible && treatmentFeeGrossDisplay
        ? treatmentFeeGrossDisplay
        : "";

  const includeTreatmentExpenses =
    financial.treatmentFeeEligible &&
    financial.monetaryCompleteness === WarningLetterMonetaryCompleteness.COMPLETE;
  const includeIncompleteTreatmentClause = monetaryIncomplete && financial.treatmentFeeEligible;

  const isOperativeSnapshot =
    financial.monetaryCompleteness === WarningLetterMonetaryCompleteness.COMPLETE ||
    financial.monetaryCompleteness === WarningLetterMonetaryCompleteness.PRINCIPAL_ONLY;

  const previewWarningHe = combineWarningLetterPreviewWarningsHe([
    monetaryIncomplete
      ? formatIncompletePreviewWarningHe({ treatmentFeeEligible: true })
      : null,
    WARNING_LETTER_PREVIEW_DEADLINE_PROVISIONAL_HE,
  ]);

  const printedDeadlineDateIso = computePrintedDeadlineDateIso(input.letterDateIso);
  const printedDeadlineDateDisplay = formatLetterDateDisplayHe(printedDeadlineDateIso);

  const introKey =
    input.building.clientPresentation === WarningLetterClientPresentation.MANAGEMENT_COMPANY
      ? "management_company"
      : "committee";

  const introductionParagraph = substituteTemplate(
    INITIAL_WARNING_INTRO_TEMPLATES[introKey].template,
    {
      managementCompanyLegalName: input.building.managementCompanyLegalName?.trim() ?? "",
      street: input.building.street.trim(),
      houseNumber: input.building.houseNumber.trim(),
      city: input.building.city.trim(),
    },
  );

  const buildingStreetLine = `${input.building.street.trim()} ${input.building.houseNumber.trim()}– דירה ${debtCase.apartmentNumberDisplay.trim()}`;
  const subjectLine = substituteTemplate(INITIAL_WARNING_SUBJECT_TEMPLATE, {
    buildingStreetLine,
  });

  const debtMonthsCount = countMonthsInclusive({
    periodStartMonth: debtCase.periodStartMonth,
    periodEndMonth: debtCase.periodEndMonth,
  });

  const templateValues: Record<string, string> = {
    printedDeadlineDateDisplay,
    totalDisplay,
    principalDisplay,
    treatmentDisplayClause,
    treatmentFeeGrossDisplay: treatmentFeeGrossDisplay ?? "",
    totalWithTreatmentDisplay: totalWithTreatmentDisplay ?? totalDisplay,
    paymentLinkPlaceholder: input.paymentLinkPlaceholder,
  };

  const isTenantLegalDebtor =
    parties.legalDebtorDesignation === LegalDebtorDesignation.TENANT;
  const jointOwners =
    !isTenantLegalDebtor && parties.propertyOwners.filter((o) => o.fullName.trim()).length > 1;

  const numberedClauses = buildNumberedInitialWarningClauses({
    clientPresentation: input.building.clientPresentation,
    isTenantLegalDebtor,
    jointOwners,
    includeTreatmentExpenses,
    includeIncompleteTreatmentClause,
    monetaryPreviewIncomplete: monetaryIncomplete,
    templateValues,
  });

  const allRecipients = resolveLetterRecipients(parties);
  const ownerCopyRecipients: LetterRecipient[] = isTenantLegalDebtor
    ? allRecipients.filter((r) => r.role === "property_owner")
    : [];

  const evidenceDisclaimer = INITIAL_WARNING_FIXED_CLAUSES.evidence_disclaimer.template;

  const snapshotCreatedAtIso = new Date().toISOString();

  const withoutHash: Omit<WarningLetterContentSnapshot, "contentSha256"> = {
    letterType: WarningLetterType.INITIAL_WARNING,
    templateVersionId: INITIAL_WARNING_TEMPLATE_VERSION_ID,
    letterCaseReference: input.letterCaseReference.trim(),
    letterDateIso: input.letterDateIso,
    printedDeadlineDateIso,
    clientPresentation: input.building.clientPresentation,
    deliveryChannelLabel: input.deliveryChannelLabel,
    subjectLine,
    introductionParagraph,
    addresseeLines: ["לכבוד:"],
    apartmentAddressLine: resolveApartmentAddressLine(input),
    debtorNamesLine: resolveDebtorNamesLine(input),
    debtMonthsCount,
    settingsVersionId: financial.settingsVersionId,
    monetaryCompleteness: financial.monetaryCompleteness,
    isOperativeSnapshot,
    previewWarningHe,
    principalAmountMinor: financial.principalAmountMinor,
    totalDueMinor: financial.totalDueMinor,
    principalDisplay,
    totalDisplay,
    treatmentFeeGrossDisplay,
    totalWithTreatmentDisplay,
    treatmentDisplayClause,
    paymentLinkPlaceholder: input.paymentLinkPlaceholder,
    printedDeadlineDateDisplay,
    numberedClauses,
    evidenceDisclaimer,
    inquiriesMobileDisplay: input.inquiriesMobileDisplay,
    signatoryName: input.signatoryName,
    barRegistrationNumber: input.barRegistrationNumber,
    recipients: allRecipients,
    ownerCopyRecipients,
    snapshotCreatedAtIso,
  };

  const hashPayload = { ...withoutHash };
  delete (hashPayload as { snapshotCreatedAtIso?: string }).snapshotCreatedAtIso;
  const contentSha256 = computeWarningLetterContentSha256(hashPayload);

  return { ...withoutHash, contentSha256 };
}

/** Legally operative snapshot — throws when monetary data is incomplete (CP8.4C+). */
export function buildStrictOperativeInitialWarningLetterSnapshot(
  input: Omit<WarningLetterSnapshotBuildInput, "requireOperativeMonetaryData">,
): WarningLetterContentSnapshot {
  return buildInitialWarningLetterSnapshot({
    ...input,
    requireOperativeMonetaryData: true,
  });
}

/** Non-operative HTML preview — allows incomplete treatment-fee data with explicit placeholders. */
export function buildInitialWarningLetterPreviewSnapshot(
  input: Omit<WarningLetterSnapshotBuildInput, "requireOperativeMonetaryData">,
): WarningLetterContentSnapshot {
  return buildInitialWarningLetterSnapshot({
    ...input,
    requireOperativeMonetaryData: false,
  });
}
