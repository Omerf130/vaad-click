import { createHash } from "node:crypto";

import type { DebtCaseRecord } from "@/modules/debt-cases/domain/debt-case-record.types";

export type StatementOfClaimDraftMaterialInputs = {
  debtCaseId: string;
  debtCaseRevision: number;
  workflowStatus: string;
  principalAmountMinor: number;
  periodStartMonth: string;
  periodEndMonth: string;
  partiesCanonicalJson: string;
  warningLetterFinalDocumentId: string;
  warningLetterFinalContentSha256: string;
  warningLetterMaterialInputsSha256: string;
  templateRevisionId: string;
  templateContentSha256: string;
  paymentLedgerFingerprint: string;
  deliveryRecordsFingerprint: string;
  debtorResponsesFingerprint: string;
};

function buildPartiesCanonicalJson(debtCase: DebtCaseRecord): string {
  const { parties } = debtCase;
  return JSON.stringify({
    occupancyType: parties.occupancyType,
    legalDebtorDesignation: parties.legalDebtorDesignation,
    postalAddress: parties.postalAddress?.trim() ?? null,
  });
}

export function buildPaymentLedgerFingerprint(
  entries: readonly { paymentEntryId: string; signedEffectMinor: number; entryType: string }[],
): string {
  const sorted = [...entries].sort((a, b) => a.paymentEntryId.localeCompare(b.paymentEntryId));
  return sorted.map((e) => `${e.paymentEntryId}:${e.entryType}:${e.signedEffectMinor}`).join("|");
}

export function buildDeliveryRecordsFingerprint(
  rows: readonly { deliveryRecordId: string; status: string; confirmedDeliveredAtIso: string | null }[],
): string {
  const sorted = [...rows].sort((a, b) => a.deliveryRecordId.localeCompare(b.deliveryRecordId));
  return sorted
    .map((r) => `${r.deliveryRecordId}:${r.status}:${r.confirmedDeliveredAtIso ?? ""}`)
    .join("|");
}

export function buildDebtorResponsesFingerprint(
  rows: readonly { debtorResponseId: string; responseType: string }[],
): string {
  const sorted = [...rows].sort((a, b) => a.debtorResponseId.localeCompare(b.debtorResponseId));
  return sorted.map((r) => `${r.debtorResponseId}:${r.responseType}`).join("|");
}

export function buildStatementOfClaimDraftMaterialInputs(input: {
  debtCase: DebtCaseRecord;
  warningLetterFinalDocumentId: string;
  warningLetterFinalContentSha256: string;
  warningLetterMaterialInputsSha256: string;
  templateRevisionId: string;
  templateContentSha256: string;
  paymentLedgerFingerprint: string;
  deliveryRecordsFingerprint: string;
  debtorResponsesFingerprint: string;
}): StatementOfClaimDraftMaterialInputs {
  return {
    debtCaseId: input.debtCase.debtCaseId,
    debtCaseRevision: input.debtCase.revision,
    workflowStatus: input.debtCase.workflowStatus,
    principalAmountMinor: input.debtCase.principalAmountMinor,
    periodStartMonth: input.debtCase.periodStartMonth ?? "",
    periodEndMonth: input.debtCase.periodEndMonth ?? "",
    partiesCanonicalJson: buildPartiesCanonicalJson(input.debtCase),
    warningLetterFinalDocumentId: input.warningLetterFinalDocumentId,
    warningLetterFinalContentSha256: input.warningLetterFinalContentSha256,
    warningLetterMaterialInputsSha256: input.warningLetterMaterialInputsSha256,
    templateRevisionId: input.templateRevisionId,
    templateContentSha256: input.templateContentSha256,
    paymentLedgerFingerprint: input.paymentLedgerFingerprint,
    deliveryRecordsFingerprint: input.deliveryRecordsFingerprint,
    debtorResponsesFingerprint: input.debtorResponsesFingerprint,
  };
}

export function computeStatementOfClaimDraftMaterialInputsSha256(
  material: StatementOfClaimDraftMaterialInputs,
): string {
  const canonical = JSON.stringify(material);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

export function computeStatementOfClaimDraftContentSha256(
  snapshot: unknown,
): string {
  const canonical = JSON.stringify(snapshot);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}