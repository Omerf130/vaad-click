import "server-only";

import mongoose, { Types } from "mongoose";

import { DebtCaseError, DebtCaseErrorCode } from "@/modules/debt-cases/domain/debt-case-errors";
import {
  LAWYER_ALLOWED_PLATFORM_FEE_STATUS_TRANSITIONS,
  type WarningLetterPlatformFeeCollectionStatus,
} from "@/modules/debt-cases/domain/warning-letter-platform-fee-collection-status";
import { DebtCase } from "@/modules/debt-cases/infra/debt-case.model";
import { assertLawyerAdminOrganization } from "@/modules/organizations/services/assert-lawyer-admin";
import { writeAuditEventMandatory } from "@/modules/audit/services/audit-writer.service";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { buildUserAuditActor } from "@/shared/audit/build-audit-actor";
import { AuditEventType } from "@/shared/audit/domain/audit-event-taxonomy";
import { AuditOutcome } from "@/shared/audit/domain/audit-outcome";
import { connectMongo } from "@/shared/db/connect";

export async function updateWarningLetterPlatformFeeCollectionStatus(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
  nextStatus: WarningLetterPlatformFeeCollectionStatus;
  internalNote?: string | null;
  correlationId?: string;
}): Promise<void> {
  assertLawyerAdminOrganization(input.context);
  await connectMongo();

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const doc = await DebtCase.findOne({ debtCaseId: input.debtCaseId }).session(session);
      if (!doc) {
        throw new DebtCaseError(DebtCaseErrorCode.NOT_FOUND, "Debt case not found");
      }
      if (!doc.platformFeePreference || doc.platformFeeCollectionStatus == null) {
        throw new DebtCaseError(DebtCaseErrorCode.EDIT_NOT_ALLOWED, "No platform fee on case");
      }

      const current = doc.platformFeeCollectionStatus as WarningLetterPlatformFeeCollectionStatus;
      const allowed = LAWYER_ALLOWED_PLATFORM_FEE_STATUS_TRANSITIONS[current] ?? [];
      if (!allowed.includes(input.nextStatus)) {
        throw new DebtCaseError(DebtCaseErrorCode.VALIDATION, "Invalid status transition");
      }

      const fromStatus = current;
      const userObjectId = new Types.ObjectId(input.context.user.id);
      const note = input.internalNote?.trim() || null;

      doc.platformFeeCollectionStatus = input.nextStatus;
      if (note) {
        doc.platformFeeInternalNote = note;
      }
      doc.platformFeeStatusHistory.push({
        fromStatus,
        toStatus: input.nextStatus,
        note,
        updatedByUserId: userObjectId,
        updatedAt: new Date(),
      });
      doc.updatedByUserId = userObjectId;
      doc.revision += 1;
      await doc.save({ session });

      await writeAuditEventMandatory(
        {
          eventType: AuditEventType.DEBT_CASE_STATUS_CHANGED,
          actor: buildUserAuditActor(input.context),
          action: "platform_fee_collection_status_update",
          outcome: AuditOutcome.SUCCESS,
          target: { entityType: "debt_case", entityId: input.debtCaseId },
          metadata: {
            buildingId: doc.buildingId,
            fromStatus,
            toStatus: input.nextStatus,
            revision: doc.revision,
          },
          correlationId: input.correlationId,
        },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }
}
