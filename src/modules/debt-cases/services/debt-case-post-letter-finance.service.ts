import "server-only";

import type { DebtCaseRecord } from "@/modules/debt-cases/domain/debt-case-record.types";
import {
  computeDebtCaseBalanceSummary,
  resolveLetterTotalDueMinor,
} from "@/modules/debt-cases/domain/debt-case-payment-ledger.compute";
import { DebtCase } from "@/modules/debt-cases/infra/debt-case.model";
import { DebtCaseManualPayment } from "@/modules/debt-cases/infra/debt-case-manual-payment.model";
import { DebtCaseDebtorResponse } from "@/modules/debt-cases/infra/debt-case-debtor-response.model";
import type { DebtCaseDebtorResponseView } from "@/modules/debt-cases/services/debt-case-debtor-response.service";
import type { DebtCaseManualPaymentView } from "@/modules/debt-cases/services/debt-case-manual-payment.service";
import type { WarningLetterContentSnapshot } from "@/modules/warning-letters/snapshot/warning-letter-snapshot.types";
import { connectMongo } from "@/shared/db/connect";
import { formatMinorUnitsToNisDisplay } from "@/modules/debt-cases/presentation/debt-case-labels.he";

export type DebtCasePostLetterFinanceBundle = {
  letterTotalDueMinor: number;
  letterTotalDueDisplay: string;
  letterPrincipalMinor: number | null;
  casePrincipalMinor: number;
  netReportedPaymentsMinor: number;
  outstandingBalanceMinor: number;
  overpaymentMinor: number;
  payments: DebtCaseManualPaymentView[];
  debtorResponses: DebtCaseDebtorResponseView[];
  hasDisputedResponse: boolean;
};

export type PortalDebtCasePaymentSummary = {
  paymentStatus: string;
  letterTotalDueDisplay: string;
  outstandingBalanceDisplay: string;
  reportedPaymentsTotalDisplay: string;
};

export async function loadDebtCasePostLetterFinanceBundle(
  debtCaseId: string,
): Promise<DebtCasePostLetterFinanceBundle | null> {
  await connectMongo();
  const { WarningLetterFinalDocument } = await import(
    "@/modules/warning-letters/infra/warning-letter-final-document.model"
  );
  const finalDoc = await WarningLetterFinalDocument.findOne({ debtCaseId })
    .sort({ finalizedAt: -1 })
    .lean();
  if (!finalDoc?.contentSnapshot) {
    return null;
  }

  const snapshot = finalDoc.contentSnapshot as WarningLetterContentSnapshot;
  const debtCase = await DebtCase.findOne({ debtCaseId }).select("principalAmountMinor").lean();

  const payments = await DebtCaseManualPayment.find({ debtCaseId })
    .sort({ recordedAt: -1 })
    .lean();
  const paymentViews: DebtCaseManualPaymentView[] = payments.map(mapPaymentRow);
  const debtorResponses = await DebtCaseDebtorResponse.find({ debtCaseId })
    .sort({ recordedAt: -1 })
    .lean();

  const letterTotalDueMinor = resolveLetterTotalDueMinor({
    finalSnapshotTotalDueMinor: snapshot.totalDueMinor ?? null,
    finalSnapshotPrincipalMinor: snapshot.principalAmountMinor ?? null,
    casePrincipalMinor: debtCase?.principalAmountMinor ?? 0,
  });

  const summary = computeDebtCaseBalanceSummary({
    letterTotalDueMinor,
    casePrincipalMinor: debtCase?.principalAmountMinor ?? 0,
    entries: paymentViews,
  });

  return {
    letterTotalDueMinor: summary.letterTotalDueMinor,
    letterTotalDueDisplay: formatMinorUnitsToNisDisplay(summary.letterTotalDueMinor),
    letterPrincipalMinor: snapshot.principalAmountMinor ?? null,
    casePrincipalMinor: summary.principalOnCaseMinor,
    netReportedPaymentsMinor: summary.netReportedPaymentsMinor,
    outstandingBalanceMinor: summary.outstandingBalanceMinor,
    overpaymentMinor: summary.overpaymentMinor,
    payments: paymentViews,
    debtorResponses: debtorResponses.map(mapDebtorResponseRow),
    hasDisputedResponse: debtorResponses.some((row) => row.responseType === "debt_disputed"),
  };
}

function mapPaymentRow(row: {
  paymentEntryId: string;
  entryType: string;
  amountMinor: number;
  signedEffectMinor: number;
  paymentDate: Date;
  recordedAt: Date;
  paymentMethod?: string | null;
  reference?: string | null;
  lawyerNotes?: string | null;
  evidenceDocumentAssetId?: string | null;
  reversesPaymentEntryId?: string | null;
  correctionReasonHe?: string | null;
}): DebtCaseManualPaymentView {
  return {
    paymentEntryId: row.paymentEntryId,
    entryType: row.entryType,
    amountMinor: row.amountMinor,
    signedEffectMinor: row.signedEffectMinor,
    paymentDateIso: row.paymentDate.toISOString(),
    recordedAtIso: row.recordedAt.toISOString(),
    paymentMethod: row.paymentMethod ?? null,
    reference: row.reference ?? null,
    lawyerNotes: row.lawyerNotes ?? null,
    evidenceDocumentAssetId: row.evidenceDocumentAssetId ?? null,
    reversesPaymentEntryId: row.reversesPaymentEntryId ?? null,
    correctionReasonHe: row.correctionReasonHe ?? null,
  };
}

function mapDebtorResponseRow(row: {
  debtorResponseId: string;
  responseType: string;
  responseDate: Date;
  recordedAt: Date;
  lawyerNotes?: string | null;
}): DebtCaseDebtorResponseView {
  return {
    debtorResponseId: row.debtorResponseId,
    responseType: row.responseType,
    responseDateIso: row.responseDate.toISOString(),
    recordedAtIso: row.recordedAt.toISOString(),
    lawyerNotes: row.lawyerNotes ?? null,
  };
}

export function buildPortalDebtCasePaymentSummary(input: {
  record: DebtCaseRecord;
  bundle: DebtCasePostLetterFinanceBundle;
}): PortalDebtCasePaymentSummary {
  return {
    paymentStatus: input.record.paymentStatus,
    letterTotalDueDisplay: input.bundle.letterTotalDueDisplay,
    outstandingBalanceDisplay: formatMinorUnitsToNisDisplay(input.bundle.outstandingBalanceMinor),
    reportedPaymentsTotalDisplay: formatMinorUnitsToNisDisplay(input.bundle.netReportedPaymentsMinor),
  };
}

export async function loadPortalDebtCasePaymentSummary(input: {
  record: DebtCaseRecord;
}): Promise<PortalDebtCasePaymentSummary | null> {
  const bundle = await loadDebtCasePostLetterFinanceBundle(input.record.debtCaseId);
  if (!bundle) {
    return null;
  }
  return buildPortalDebtCasePaymentSummary({ record: input.record, bundle });
}