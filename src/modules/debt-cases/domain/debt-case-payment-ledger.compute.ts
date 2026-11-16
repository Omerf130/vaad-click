import type { DebtCaseManualPaymentEntryType } from "@/modules/debt-cases/domain/debt-case-manual-payment-entry-type";

export type LedgerEntryLike = {
  entryType: DebtCaseManualPaymentEntryType | string;
  signedEffectMinor: number;
  reversesPaymentEntryId?: string | null;
};

export type DebtCaseBalanceSummary = {
  letterTotalDueMinor: number;
  principalOnCaseMinor: number;
  netReportedPaymentsMinor: number;
  outstandingBalanceMinor: number;
  overpaymentMinor: number;
};

export function resolveLetterTotalDueMinor(input: {
  finalSnapshotTotalDueMinor: number | null;
  finalSnapshotPrincipalMinor: number | null;
  casePrincipalMinor: number;
}): number {
  if (input.finalSnapshotTotalDueMinor != null && input.finalSnapshotTotalDueMinor > 0) {
    return input.finalSnapshotTotalDueMinor;
  }
  if (input.finalSnapshotPrincipalMinor != null && input.finalSnapshotPrincipalMinor > 0) {
    return input.finalSnapshotPrincipalMinor;
  }
  return Math.max(0, input.casePrincipalMinor);
}

export function sumLedgerNetPaymentsMinor(entries: readonly LedgerEntryLike[]): number {
  return entries.reduce((sum, row) => sum + row.signedEffectMinor, 0);
}

export function computeDebtCaseBalanceSummary(input: {
  letterTotalDueMinor: number;
  casePrincipalMinor: number;
  entries: readonly LedgerEntryLike[];
}): DebtCaseBalanceSummary {
  const netReportedPaymentsMinor = sumLedgerNetPaymentsMinor(input.entries);
  const rawOutstanding = input.letterTotalDueMinor - netReportedPaymentsMinor;
  const outstandingBalanceMinor = Math.max(0, rawOutstanding);
  const overpaymentMinor = rawOutstanding < 0 ? -rawOutstanding : 0;

  return {
    letterTotalDueMinor: input.letterTotalDueMinor,
    principalOnCaseMinor: input.casePrincipalMinor,
    netReportedPaymentsMinor,
    outstandingBalanceMinor,
    overpaymentMinor,
  };
}

export function wouldOverpayLedger(input: {
  letterTotalDueMinor: number;
  entries: readonly LedgerEntryLike[];
  additionalPaymentMinor: number;
}): boolean {
  if (input.additionalPaymentMinor <= 0) {
    return false;
  }
  const net = sumLedgerNetPaymentsMinor(input.entries) + input.additionalPaymentMinor;
  return net > input.letterTotalDueMinor;
}