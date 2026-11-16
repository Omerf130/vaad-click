import "server-only";

import { randomUUID } from "node:crypto";

import mongoose, { Types } from "mongoose";

import type { DebtCaseDebtorResponseType } from "@/modules/debt-cases/domain/debt-case-debtor-response-type";
import { DebtCaseError, DebtCaseErrorCode } from "@/modules/debt-cases/domain/debt-case-errors";
import { DebtCase } from "@/modules/debt-cases/infra/debt-case.model";
import { DebtCaseDebtorResponse } from "@/modules/debt-cases/infra/debt-case-debtor-response.model";
import { assertLawyerAdminDebtCaseReview } from "@/modules/debt-cases/services/debt-case-authorization.service";
import { recordDebtCaseDebtorResponseEvent } from "@/modules/debt-cases/services/debt-case-payment-audit.service";
import {
  assertDebtCasePostLetterMutationsAllowed,
  assertFinalWarningLetterExists,
} from "@/modules/debt-cases/services/debt-case-post-letter-guards";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { connectMongo } from "@/shared/db/connect";

export type DebtCaseDebtorResponseView = {
  debtorResponseId: string;
  responseType: string;
  responseDateIso: string;
  recordedAtIso: string;
  lawyerNotes: string | null;
};

export async function recordDebtCaseDebtorResponse(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
  responseType: DebtCaseDebtorResponseType;
  responseDate: Date;
  lawyerNotes?: string | null;
  idempotencyKey?: string | null;
  correlationId?: string;
}): Promise<{ debtorResponseId: string; idempotentReplay: boolean }> {
  await assertLawyerAdminDebtCaseReview({ context: input.context });
  await connectMongo();
  await assertFinalWarningLetterExists(input.debtCaseId);

  if (input.idempotencyKey?.trim()) {
    const existing = await DebtCaseDebtorResponse.findOne({
      debtCaseId: input.debtCaseId,
      idempotencyKey: input.idempotencyKey.trim(),
    }).lean();
    if (existing) {
      return { debtorResponseId: existing.debtorResponseId, idempotentReplay: true };
    }
  }

  const session = await mongoose.startSession();
  try {
    let debtorResponseId = "";
    let idempotentReplay = false;

    await session.withTransaction(async () => {
      const doc = await DebtCase.findOne({ debtCaseId: input.debtCaseId }).session(session);
      if (!doc) {
        throw new DebtCaseError(DebtCaseErrorCode.NOT_FOUND, "Debt case not found");
      }
      assertDebtCasePostLetterMutationsAllowed(doc);

      if (input.idempotencyKey?.trim()) {
        const existing = await DebtCaseDebtorResponse.findOne({
          debtCaseId: input.debtCaseId,
          idempotencyKey: input.idempotencyKey.trim(),
        })
          .session(session)
          .lean();
        if (existing) {
          debtorResponseId = existing.debtorResponseId;
          idempotentReplay = true;
          return;
        }
      }

      debtorResponseId = randomUUID();
      const now = new Date();
      await DebtCaseDebtorResponse.create(
        [
          {
            debtorResponseId,
            debtCaseId: input.debtCaseId,
            buildingId: doc.buildingId,
            responseType: input.responseType,
            responseDate: input.responseDate,
            recordedAt: now,
            recordedByUserId: new Types.ObjectId(input.context.user.id),
            lawyerNotes: input.lawyerNotes?.trim() || null,
            idempotencyKey: input.idempotencyKey?.trim() || null,
          },
        ],
        { session },
      );

      doc.updatedByUserId = new Types.ObjectId(input.context.user.id);
      doc.revision += 1;
      await doc.save({ session });

      await recordDebtCaseDebtorResponseEvent(
        {
          context: input.context,
          debtCaseId: input.debtCaseId,
          buildingId: doc.buildingId,
          debtorResponseId,
          responseType: input.responseType,
          correlationId: input.correlationId,
        },
        session,
      );
    });

    return { debtorResponseId, idempotentReplay };
  } catch (error) {
    if (isMongoDuplicateIdempotency(error) && input.idempotencyKey?.trim()) {
      const existing = await DebtCaseDebtorResponse.findOne({
        debtCaseId: input.debtCaseId,
        idempotencyKey: input.idempotencyKey.trim(),
      }).lean();
      if (existing) {
        return { debtorResponseId: existing.debtorResponseId, idempotentReplay: true };
      }
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

function isMongoDuplicateIdempotency(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error != null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}