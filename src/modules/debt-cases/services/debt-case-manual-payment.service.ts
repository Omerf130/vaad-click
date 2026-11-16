import "server-only";

import { randomUUID } from "node:crypto";

import mongoose, { Types } from "mongoose";

import { DebtCaseManualPaymentEntryType } from "@/modules/debt-cases/domain/debt-case-manual-payment-entry-type";
import type { DebtCaseManualPaymentMethod } from "@/modules/debt-cases/domain/debt-case-manual-payment-method";
import {
  computeDebtCaseBalanceSummary,
  resolveLetterTotalDueMinor,
  wouldOverpayLedger,
  type LedgerEntryLike,
} from "@/modules/debt-cases/domain/debt-case-payment-ledger.compute";
import { deriveDebtCasePaymentStatus } from "@/modules/debt-cases/domain/debt-case-payment-status-derive";
import { DebtCaseError, DebtCaseErrorCode } from "@/modules/debt-cases/domain/debt-case-errors";
import { DebtCase } from "@/modules/debt-cases/infra/debt-case.model";
import { DebtCaseManualPayment } from "@/modules/debt-cases/infra/debt-case-manual-payment.model";
import {
  assertLawyerAdminDebtCaseReview,
  assertCanReadDebtCase,
} from "@/modules/debt-cases/services/debt-case-authorization.service";
import { recordManualDebtCasePaymentLedgerEvent } from "@/modules/debt-cases/services/debt-case-payment-audit.service";
import {
  assertDebtCasePostLetterMutationsAllowed,
  assertFinalWarningLetterExists,
} from "@/modules/debt-cases/services/debt-case-post-letter-guards";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { connectMongo } from "@/shared/db/connect";

export type DebtCaseManualPaymentView = {
  paymentEntryId: string;
  entryType: string;
  amountMinor: number;
  signedEffectMinor: number;
  paymentDateIso: string;
  recordedAtIso: string;
  paymentMethod: string | null;
  reference: string | null;
  lawyerNotes: string | null;
  evidenceDocumentAssetId: string | null;
  reversesPaymentEntryId: string | null;
  correctionReasonHe: string | null;
};

type FinanceContext = {
  letterTotalDueMinor: number;
  entries: LedgerEntryLike[];
};

export async function loadFinanceContextForDebtCase(debtCaseId: string): Promise<FinanceContext> {
  await connectMongo();
  const debtCase = await DebtCase.findOne({ debtCaseId }).select("principalAmountMinor").lean();
  const { WarningLetterFinalDocument } = await import(
    "@/modules/warning-letters/infra/warning-letter-final-document.model"
  );
  const finalDoc = await WarningLetterFinalDocument.findOne({ debtCaseId })
    .sort({ finalizedAt: -1 })
    .lean();
  const snapshot = finalDoc?.contentSnapshot as
    | { totalDueMinor?: number; principalAmountMinor?: number }
    | undefined;

  const payments = await DebtCaseManualPayment.find({ debtCaseId }).lean();
  const entries: LedgerEntryLike[] = payments.map((row) => ({
    entryType: row.entryType,
    signedEffectMinor: row.signedEffectMinor,
    reversesPaymentEntryId: row.reversesPaymentEntryId ?? null,
  }));

  const letterTotalDueMinor = resolveLetterTotalDueMinor({
    finalSnapshotTotalDueMinor: snapshot?.totalDueMinor ?? null,
    finalSnapshotPrincipalMinor: snapshot?.principalAmountMinor ?? null,
    casePrincipalMinor: debtCase?.principalAmountMinor ?? 0,
  });

  return { letterTotalDueMinor, entries };
}

async function syncDebtCasePaymentStatus(
  debtCaseId: string,
  finance: FinanceContext,
  session: mongoose.ClientSession,
): Promise<void> {
  const summary = computeDebtCaseBalanceSummary({
    letterTotalDueMinor: finance.letterTotalDueMinor,
    casePrincipalMinor: 0,
    entries: finance.entries,
  });
  const paymentStatus = deriveDebtCasePaymentStatus({
    netReportedPaymentsMinor: summary.netReportedPaymentsMinor,
    outstandingBalanceMinor: summary.outstandingBalanceMinor,
  });
  await DebtCase.updateOne({ debtCaseId }, { $set: { paymentStatus } }, { session });
}

export async function recordDebtCaseManualPayment(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
  amountMinor: number;
  paymentDate: Date;
  paymentMethod?: DebtCaseManualPaymentMethod | null;
  reference?: string | null;
  lawyerNotes?: string | null;
  evidenceDocumentAssetId?: string | null;
  idempotencyKey?: string | null;
  acceptOverpaymentAcknowledged?: boolean;
  correlationId?: string;
}): Promise<{ paymentEntryId: string; idempotentReplay: boolean }> {
  await assertLawyerAdminDebtCaseReview({ context: input.context });
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new DebtCaseError(DebtCaseErrorCode.VALIDATION, "Payment amount must be a positive integer");
  }
  await connectMongo();
  await assertFinalWarningLetterExists(input.debtCaseId);

  if (input.idempotencyKey?.trim()) {
    const existing = await DebtCaseManualPayment.findOne({
      debtCaseId: input.debtCaseId,
      idempotencyKey: input.idempotencyKey.trim(),
    }).lean();
    if (existing) {
      return { paymentEntryId: existing.paymentEntryId, idempotentReplay: true };
    }
  }

  const session = await mongoose.startSession();
  try {
    let paymentEntryId = "";
    let idempotentReplay = false;

    await session.withTransaction(async () => {
      const doc = await DebtCase.findOne({ debtCaseId: input.debtCaseId }).session(session);
      if (!doc) {
        throw new DebtCaseError(DebtCaseErrorCode.NOT_FOUND, "Debt case not found");
      }
      assertDebtCasePostLetterMutationsAllowed(doc);

      if (input.idempotencyKey?.trim()) {
        const existing = await DebtCaseManualPayment.findOne({
          debtCaseId: input.debtCaseId,
          idempotencyKey: input.idempotencyKey.trim(),
        })
          .session(session)
          .lean();
        if (existing) {
          paymentEntryId = existing.paymentEntryId;
          idempotentReplay = true;
          return;
        }
      }

      const finance = await loadFinanceContextInSession(input.debtCaseId, session);
      if (
        wouldOverpayLedger({
          letterTotalDueMinor: finance.letterTotalDueMinor,
          entries: finance.entries,
          additionalPaymentMinor: input.amountMinor,
        }) &&
        !input.acceptOverpaymentAcknowledged
      ) {
        throw new DebtCaseError(
          DebtCaseErrorCode.VALIDATION,
          "Payment exceeds outstanding balance — explicit overpayment acknowledgment required",
        );
      }

      paymentEntryId = randomUUID();
      const signedEffectMinor = input.amountMinor;
      const now = new Date();
      await DebtCaseManualPayment.create(
        [
          {
            paymentEntryId,
            debtCaseId: input.debtCaseId,
            buildingId: doc.buildingId,
            entryType: DebtCaseManualPaymentEntryType.PAYMENT,
            amountMinor: input.amountMinor,
            signedEffectMinor,
            paymentDate: input.paymentDate,
            recordedAt: now,
            recordedByUserId: new Types.ObjectId(input.context.user.id),
            paymentMethod: input.paymentMethod ?? null,
            reference: input.reference?.trim() || null,
            lawyerNotes: input.lawyerNotes?.trim() || null,
            evidenceDocumentAssetId: input.evidenceDocumentAssetId?.trim() || null,
            idempotencyKey: input.idempotencyKey?.trim() || null,
            acceptOverpaymentAcknowledged: Boolean(input.acceptOverpaymentAcknowledged),
          },
        ],
        { session },
      );

      finance.entries.push({
        entryType: DebtCaseManualPaymentEntryType.PAYMENT,
        signedEffectMinor,
      });
      await syncDebtCasePaymentStatus(input.debtCaseId, finance, session);
      doc.updatedByUserId = new Types.ObjectId(input.context.user.id);
      doc.revision += 1;
      await doc.save({ session });

      await recordManualDebtCasePaymentLedgerEvent(
        {
          context: input.context,
          debtCaseId: input.debtCaseId,
          buildingId: doc.buildingId,
          paymentEntryId,
          entryType: DebtCaseManualPaymentEntryType.PAYMENT,
          amountMinor: input.amountMinor,
          signedEffectMinor,
          correlationId: input.correlationId,
        },
        session,
      );
    });

    return { paymentEntryId, idempotentReplay };
  } catch (error) {
    if (isMongoDuplicateIdempotency(error) && input.idempotencyKey?.trim()) {
      const existing = await DebtCaseManualPayment.findOne({
        debtCaseId: input.debtCaseId,
        idempotencyKey: input.idempotencyKey.trim(),
      }).lean();
      if (existing) {
        return { paymentEntryId: existing.paymentEntryId, idempotentReplay: true };
      }
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

export async function reverseDebtCaseManualPayment(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
  reversesPaymentEntryId: string;
  correctionReasonHe: string;
  idempotencyKey?: string | null;
  correlationId?: string;
}): Promise<{ paymentEntryId: string; idempotentReplay: boolean }> {
  await assertLawyerAdminDebtCaseReview({ context: input.context });
  const reason = input.correctionReasonHe.trim();
  if (reason.length < 3) {
    throw new DebtCaseError(DebtCaseErrorCode.VALIDATION, "Correction reason required");
  }
  await connectMongo();
  await assertFinalWarningLetterExists(input.debtCaseId);

  if (input.idempotencyKey?.trim()) {
    const existing = await DebtCaseManualPayment.findOne({
      debtCaseId: input.debtCaseId,
      idempotencyKey: input.idempotencyKey.trim(),
    }).lean();
    if (existing) {
      return { paymentEntryId: existing.paymentEntryId, idempotentReplay: true };
    }
  }

  const session = await mongoose.startSession();
  try {
    let paymentEntryId = "";
    let idempotentReplay = false;

    await session.withTransaction(async () => {
      const doc = await DebtCase.findOne({ debtCaseId: input.debtCaseId }).session(session);
      if (!doc) {
        throw new DebtCaseError(DebtCaseErrorCode.NOT_FOUND, "Debt case not found");
      }
      assertDebtCasePostLetterMutationsAllowed(doc);

      const original = await DebtCaseManualPayment.findOne({
        debtCaseId: input.debtCaseId,
        paymentEntryId: input.reversesPaymentEntryId,
      })
        .session(session)
        .lean();
      if (!original || original.entryType !== DebtCaseManualPaymentEntryType.PAYMENT) {
        throw new DebtCaseError(DebtCaseErrorCode.VALIDATION, "Original payment entry not found");
      }

      const priorReversal = await DebtCaseManualPayment.findOne({
        debtCaseId: input.debtCaseId,
        reversesPaymentEntryId: input.reversesPaymentEntryId,
        entryType: DebtCaseManualPaymentEntryType.REVERSAL,
      })
        .session(session)
        .lean();
      if (priorReversal) {
        throw new DebtCaseError(DebtCaseErrorCode.VALIDATION, "Payment already reversed");
      }

      if (input.idempotencyKey?.trim()) {
        const existing = await DebtCaseManualPayment.findOne({
          debtCaseId: input.debtCaseId,
          idempotencyKey: input.idempotencyKey.trim(),
        })
          .session(session)
          .lean();
        if (existing) {
          paymentEntryId = existing.paymentEntryId;
          idempotentReplay = true;
          return;
        }
      }

      const finance = await loadFinanceContextInSession(input.debtCaseId, session);
      paymentEntryId = randomUUID();
      const signedEffectMinor = -original.signedEffectMinor;
      const now = new Date();

      await DebtCaseManualPayment.create(
        [
          {
            paymentEntryId,
            debtCaseId: input.debtCaseId,
            buildingId: doc.buildingId,
            entryType: DebtCaseManualPaymentEntryType.REVERSAL,
            amountMinor: original.amountMinor,
            signedEffectMinor,
            paymentDate: original.paymentDate,
            recordedAt: now,
            recordedByUserId: new Types.ObjectId(input.context.user.id),
            reversesPaymentEntryId: original.paymentEntryId,
            correctionReasonHe: reason,
            idempotencyKey: input.idempotencyKey?.trim() || null,
          },
        ],
        { session },
      );

      finance.entries.push({
        entryType: DebtCaseManualPaymentEntryType.REVERSAL,
        signedEffectMinor,
        reversesPaymentEntryId: original.paymentEntryId,
      });
      await syncDebtCasePaymentStatus(input.debtCaseId, finance, session);
      doc.updatedByUserId = new Types.ObjectId(input.context.user.id);
      doc.revision += 1;
      await doc.save({ session });

      await recordManualDebtCasePaymentLedgerEvent(
        {
          context: input.context,
          debtCaseId: input.debtCaseId,
          buildingId: doc.buildingId,
          paymentEntryId,
          entryType: DebtCaseManualPaymentEntryType.REVERSAL,
          amountMinor: original.amountMinor,
          signedEffectMinor,
          correlationId: input.correlationId,
        },
        session,
      );
    });

    return { paymentEntryId, idempotentReplay };
  } catch (error) {
    if (isMongoDuplicateIdempotency(error) && input.idempotencyKey?.trim()) {
      const existing = await DebtCaseManualPayment.findOne({
        debtCaseId: input.debtCaseId,
        idempotencyKey: input.idempotencyKey.trim(),
      }).lean();
      if (existing) {
        return { paymentEntryId: existing.paymentEntryId, idempotentReplay: true };
      }
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

export async function assertOperatorMayViewPaymentSummary(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
}): Promise<void> {
  await connectMongo();
  const doc = await DebtCase.findOne({ debtCaseId: input.debtCaseId });
  if (!doc) {
    throw new DebtCaseError(DebtCaseErrorCode.NOT_FOUND, "Debt case not found");
  }
  await assertCanReadDebtCase({ context: input.context, doc });
}

async function loadFinanceContextInSession(
  debtCaseId: string,
  session: mongoose.ClientSession,
): Promise<FinanceContext> {
  const debtCase = await DebtCase.findOne({ debtCaseId })
    .select("principalAmountMinor")
    .session(session)
    .lean();
  const { WarningLetterFinalDocument } = await import(
    "@/modules/warning-letters/infra/warning-letter-final-document.model"
  );
  const finalDoc = await WarningLetterFinalDocument.findOne({ debtCaseId })
    .sort({ finalizedAt: -1 })
    .session(session)
    .lean();
  const snapshot = finalDoc?.contentSnapshot as
    | { totalDueMinor?: number; principalAmountMinor?: number }
    | undefined;

  const payments = await DebtCaseManualPayment.find({ debtCaseId }).session(session).lean();
  const entries: LedgerEntryLike[] = payments.map((row) => ({
    entryType: row.entryType,
    signedEffectMinor: row.signedEffectMinor,
    reversesPaymentEntryId: row.reversesPaymentEntryId ?? null,
  }));

  const letterTotalDueMinor = resolveLetterTotalDueMinor({
    finalSnapshotTotalDueMinor: snapshot?.totalDueMinor ?? null,
    finalSnapshotPrincipalMinor: snapshot?.principalAmountMinor ?? null,
    casePrincipalMinor: debtCase?.principalAmountMinor ?? 0,
  });

  return { letterTotalDueMinor, entries };
}

function isMongoDuplicateIdempotency(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error != null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}