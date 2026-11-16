import "server-only";

import { BuildingOrganizationalStatus } from "@/modules/buildings/domain/building-status";
import { Building } from "@/modules/buildings/infra/building.model";
import {
  computeDebtCaseBalanceSummary,
  resolveLetterTotalDueMinor,
} from "@/modules/debt-cases/domain/debt-case-payment-ledger.compute";
import type { DebtCaseRecord } from "@/modules/debt-cases/domain/debt-case-record.types";
import { DebtCaseManualPayment } from "@/modules/debt-cases/infra/debt-case-manual-payment.model";
import { DebtCaseDebtorResponse } from "@/modules/debt-cases/infra/debt-case-debtor-response.model";
import {
  formatDebtPeriodDisplayHe,
  formatLegalDebtorHe,
  formatMinorUnitsToNisDisplay,
} from "@/modules/debt-cases/presentation/debt-case-labels.he";
import type { DevelopmentStatementOfClaimTemplateRevision } from "@/modules/statement-of-claim-drafts/services/statement-of-claim-template-resolution.service";
import {
  STATEMENT_OF_CLAIM_DRAFT_CONTENT_FORMAT_VERSION,
  type StatementOfClaimDraftContentSnapshot,
} from "@/modules/statement-of-claim-drafts/domain/statement-of-claim-draft-content-snapshot.types";
import {
  buildDebtorResponsesFingerprint,
  buildDeliveryRecordsFingerprint,
  buildPaymentLedgerFingerprint,
  buildStatementOfClaimDraftMaterialInputs,
  computeStatementOfClaimDraftContentSha256,
  computeStatementOfClaimDraftMaterialInputsSha256,
} from "@/modules/statement-of-claim-drafts/domain/statement-of-claim-draft-material-input";
import {
  StatementOfClaimPlaceholderId,
  substituteStatementOfClaimFactualPlaceholders,
} from "@/modules/statement-of-claim-templates/domain/statement-of-claim-placeholder-registry";
import { parseStatementOfClaimTemplateBody } from "@/modules/statement-of-claim-templates/domain/statement-of-claim-template-body";
import {
  STATEMENT_OF_CLAIM_TEMPLATE_SECTION_ORDER,
  type StatementOfClaimTemplateSectionId,
} from "@/modules/statement-of-claim-templates/domain/statement-of-claim-template-section";
import type { WarningLetterContentSnapshot } from "@/modules/warning-letters/snapshot/warning-letter-snapshot.types";
import type { WarningLetterDeliveryRecordView } from "@/modules/warning-letters/services/warning-letter-delivery.service";
import { connectMongo } from "@/shared/db/connect";

export type StatementOfClaimDraftBuildBundle = {
  snapshot: StatementOfClaimDraftContentSnapshot;
  contentSha256: string;
  materialInputsSha256: string;
};

type FinalDocRow = {
  finalDocumentId: string;
  contentSha256: string;
  materialInputsSha256: string;
  contentSnapshot: unknown;
  letterCaseReference: string;
};

function formatBuildingAddressHe(input: {
  street?: string;
  houseNumber?: string;
  city?: string;
}): string {
  const parts = [input.street, input.houseNumber, input.city].filter(Boolean);
  return parts.join(" ").trim() || "—";
}

function formatWarningLetterDateHe(letterDateIso: string | null | undefined): string {
  if (!letterDateIso) {
    return "—";
  }
  const [y, m, d] = letterDateIso.split("-");
  if (!y || !m || !d) {
    return letterDateIso;
  }
  return `${d}.${m}.${y}`;
}

function summarizeDeliveryHe(records: readonly WarningLetterDeliveryRecordView[]): {
  hasConfirmedDelivery: boolean;
  channelsSummaryHe: string;
} {
  if (records.length === 0) {
    return { hasConfirmedDelivery: false, channelsSummaryHe: "אין רשומות משלוח" };
  }
  const hasConfirmedDelivery = records.some((r) => r.confirmedDeliveredAtIso != null);
  const channels = [...new Set(records.map((r) => r.statusHe))].join(" · ");
  return { hasConfirmedDelivery, channelsSummaryHe: channels };
}

export async function buildStatementOfClaimDraftBundle(input: {
  debtCase: DebtCaseRecord;
  templateRevision: DevelopmentStatementOfClaimTemplateRevision;
  finalDocument: FinalDocRow;
  deliveryRecords: readonly WarningLetterDeliveryRecordView[];
  buildingAddressHe: string;
  hasEvidenceAssets: boolean;
}): Promise<StatementOfClaimDraftBuildBundle> {
  await connectMongo();

  const parsedTemplate = parseStatementOfClaimTemplateBody(input.templateRevision.bodyText);
  if (!parsedTemplate.ok) {
    throw new Error("Invalid development statement of claim template body");
  }

  const payments = await DebtCaseManualPayment.find({ debtCaseId: input.debtCase.debtCaseId }).lean();
  const paymentViews = payments.map((row) => ({
    paymentEntryId: row.paymentEntryId,
    entryType: row.entryType,
    signedEffectMinor: row.signedEffectMinor,
  }));

  const debtorResponses = await DebtCaseDebtorResponse.find({
    debtCaseId: input.debtCase.debtCaseId,
  }).lean();

  const wlSnapshot = input.finalDocument.contentSnapshot as WarningLetterContentSnapshot;
  const letterTotalDueMinor = resolveLetterTotalDueMinor({
    finalSnapshotTotalDueMinor: wlSnapshot.totalDueMinor ?? null,
    finalSnapshotPrincipalMinor: wlSnapshot.principalAmountMinor ?? null,
    casePrincipalMinor: input.debtCase.principalAmountMinor,
  });

  const balance = computeDebtCaseBalanceSummary({
    letterTotalDueMinor,
    casePrincipalMinor: input.debtCase.principalAmountMinor,
    entries: paymentViews,
  });

  const factualPlaceholders: Record<string, string> = {
    [StatementOfClaimPlaceholderId.DEBT_CASE_REFERENCE]: input.finalDocument.letterCaseReference,
    [StatementOfClaimPlaceholderId.BUILDING_ADDRESS]: input.buildingAddressHe,
    [StatementOfClaimPlaceholderId.DEBTOR_NAME]: formatLegalDebtorHe(
      input.debtCase.parties.legalDebtorDesignation,
    ),
    [StatementOfClaimPlaceholderId.DEBT_PERIOD]: formatDebtPeriodDisplayHe(
      input.debtCase.periodStartMonth,
      input.debtCase.periodEndMonth,
    ),
    [StatementOfClaimPlaceholderId.ORIGINAL_PRINCIPAL_NIS]: formatMinorUnitsToNisDisplay(
      input.debtCase.principalAmountMinor,
    ),
    [StatementOfClaimPlaceholderId.WARNING_LETTER_DATE]: formatWarningLetterDateHe(
      wlSnapshot.letterDateIso,
    ),
    [StatementOfClaimPlaceholderId.WARNING_LETTER_AMOUNT_NIS]: formatMinorUnitsToNisDisplay(
      balance.letterTotalDueMinor,
    ),
    [StatementOfClaimPlaceholderId.REPORTED_PAYMENTS_NIS]: formatMinorUnitsToNisDisplay(
      balance.netReportedPaymentsMinor,
    ),
    [StatementOfClaimPlaceholderId.OUTSTANDING_BALANCE_NIS]: formatMinorUnitsToNisDisplay(
      balance.outstandingBalanceMinor,
    ),
  };

  const sections: StatementOfClaimDraftContentSnapshot["sections"] = [];
  const lawyerIncomplete = new Set<string>();

  for (const sectionId of STATEMENT_OF_CLAIM_TEMPLATE_SECTION_ORDER) {
    const section = parsedTemplate.body.sections[sectionId];
    if (!section) {
      continue;
    }
    const { rendered, incompleteLawyerTokens } = substituteStatementOfClaimFactualPlaceholders(
      section.bodyTemplate,
      factualPlaceholders,
    );
    for (const token of incompleteLawyerTokens) {
      lawyerIncomplete.add(token);
    }
    sections.push({
      sectionId: sectionId as StatementOfClaimTemplateSectionId,
      titleHe: section.titleHe,
      bodySystemBaseline: rendered,
      bodyRendered: rendered,
      titleLawyerOverride: null,
      lawyerBodyOverride: null,
      hasIncompleteLawyerFields: incompleteLawyerTokens.length > 0,
    });
  }

  const deliverySummary = summarizeDeliveryHe(input.deliveryRecords);

  const snapshot: StatementOfClaimDraftContentSnapshot = {
    formatVersion: STATEMENT_OF_CLAIM_DRAFT_CONTENT_FORMAT_VERSION,
    developmentOnly: true,
    manuallyEdited: false,
    editedSectionIds: [],
    templateRevisionId: input.templateRevision.revisionId,
    templateContentSha256: input.templateRevision.contentSha256,
    warningLetterFinalDocumentId: input.finalDocument.finalDocumentId,
    warningLetterFinalContentSha256: input.finalDocument.contentSha256,
    letterCaseReference: input.finalDocument.letterCaseReference,
    factualPlaceholders,
    lawyerControlledIncompleteTokens: [...lawyerIncomplete],
    sections,
    sourceSummary: {
      debtCaseRevision: input.debtCase.revision,
      buildingId: input.debtCase.buildingId,
      buildingAddressHe: input.buildingAddressHe,
      debtorDisplayNameHe: formatLegalDebtorHe(input.debtCase.parties.legalDebtorDesignation),
      debtPeriodHe: formatDebtPeriodDisplayHe(
        input.debtCase.periodStartMonth,
        input.debtCase.periodEndMonth,
      ),
      letterTotalDueDisplay: `${formatMinorUnitsToNisDisplay(balance.letterTotalDueMinor)} ₪`,
      outstandingBalanceDisplay: `${formatMinorUnitsToNisDisplay(balance.outstandingBalanceMinor)} ₪`,
      hasDisputedResponse: debtorResponses.some((r) => r.responseType === "debt_disputed"),
      delivery: {
        recordCount: input.deliveryRecords.length,
        hasConfirmedDelivery: deliverySummary.hasConfirmedDelivery,
        channelsSummaryHe: deliverySummary.channelsSummaryHe,
      },
    },
  };

  const material = buildStatementOfClaimDraftMaterialInputs({
    debtCase: input.debtCase,
    warningLetterFinalDocumentId: input.finalDocument.finalDocumentId,
    warningLetterFinalContentSha256: input.finalDocument.contentSha256,
    warningLetterMaterialInputsSha256: input.finalDocument.materialInputsSha256,
    templateRevisionId: input.templateRevision.revisionId,
    templateContentSha256: input.templateRevision.contentSha256,
    paymentLedgerFingerprint: buildPaymentLedgerFingerprint(paymentViews),
    deliveryRecordsFingerprint: buildDeliveryRecordsFingerprint(
      input.deliveryRecords.map((r) => ({
        deliveryRecordId: r.deliveryRecordId,
        status: r.status,
        confirmedDeliveredAtIso: r.confirmedDeliveredAtIso,
      })),
    ),
    debtorResponsesFingerprint: buildDebtorResponsesFingerprint(
      debtorResponses.map((r) => ({
        debtorResponseId: r.debtorResponseId,
        responseType: r.responseType,
      })),
    ),
  });

  return {
    snapshot,
    contentSha256: computeStatementOfClaimDraftContentSha256(snapshot),
    materialInputsSha256: computeStatementOfClaimDraftMaterialInputsSha256(material),
  };
}

export async function loadBuildingAddressHeForDebtCase(buildingId: string): Promise<string> {
  await connectMongo();
  const building = await Building.findOne({
    buildingId,
    organizationalStatus: BuildingOrganizationalStatus.ACTIVE,
  })
    .select("address displayName")
    .lean();
  if (!building?.address) {
    return building?.displayName?.trim() ?? "—";
  }
  return formatBuildingAddressHe(building.address);
}
