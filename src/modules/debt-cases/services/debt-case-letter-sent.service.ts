import "server-only";

import mongoose, { Types } from "mongoose";

import { DebtCaseLetterDeliveryStatus } from "@/modules/debt-cases/domain/debt-case-letter-delivery-status";
import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import { DebtCaseError, DebtCaseErrorCode } from "@/modules/debt-cases/domain/debt-case-errors";
import { assertDebtCaseWorkflowTransition } from "@/modules/debt-cases/domain/debt-case-status-transitions";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import { DebtCase } from "@/modules/debt-cases/infra/debt-case.model";
import { assertLawyerAdminDebtCaseReview } from "@/modules/debt-cases/services/debt-case-authorization.service";
import { recordDebtCaseLetterSent } from "@/modules/debt-cases/services/debt-case-audit.service";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { connectMongo } from "@/shared/db/connect";

export async function applyDebtCaseLetterSentTransition(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
  letterSentAt: Date;
  finalDocumentId: string;
  deliveryRecordId: string;
  correlationId?: string;
}): Promise<{ transitioned: boolean; revision: number }> {
  await assertLawyerAdminDebtCaseReview({ context: input.context });
  await connectMongo();

  const session = await mongoose.startSession();
  try {
    let transitioned = false;
    let revision = 0;

    await session.withTransaction(async () => {
      const doc = await DebtCase.findOne({ debtCaseId: input.debtCaseId }).session(session);
      if (!doc) {
        throw new DebtCaseError(DebtCaseErrorCode.NOT_FOUND, "Debt case not found");
      }

      revision = doc.revision;

      if (doc.workflowStatus === DebtCaseWorkflowStatus.LETTER_SENT) {
        return;
      }

      if (doc.lawyerReviewStatus !== DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP) {
        throw new DebtCaseError(
          DebtCaseErrorCode.INVALID_STATUS_TRANSITION,
          "Case not approved for letter delivery",
        );
      }

      const fromStatus = doc.workflowStatus as DebtCaseWorkflowStatus;
      assertDebtCaseWorkflowTransition({
        from: fromStatus,
        to: DebtCaseWorkflowStatus.LETTER_SENT,
        context: {
          role: input.context.user.role,
          accountStatus: input.context.user.accountStatus,
        },
      });

      doc.workflowStatus = DebtCaseWorkflowStatus.LETTER_SENT;
      doc.letterDeliveryStatus = DebtCaseLetterDeliveryStatus.SENT;
      doc.letterSentAt = input.letterSentAt;
      if (!doc.debtSnapshotAtLetter && doc.principalAmountMinor != null) {
        doc.debtSnapshotAtLetter = {
          apartmentNumberDisplay: doc.apartmentNumberDisplay ?? "",
          apartmentKeyNormalized: doc.apartmentKeyNormalized ?? "",
          debtType: doc.debtType!,
          specialAssessmentDescription: doc.specialAssessmentDescription ?? null,
          principalAmountMinor: doc.principalAmountMinor,
          periodStartMonth: doc.periodStartMonth!,
          periodEndMonth: doc.periodEndMonth!,
          parties: doc.parties!,
        };
      }
      doc.updatedByUserId = new Types.ObjectId(input.context.user.id);
      doc.revision += 1;
      await doc.save({ session });
      revision = doc.revision;
      transitioned = true;

      await recordDebtCaseLetterSent(
        {
          context: input.context,
          debtCaseId: input.debtCaseId,
          buildingId: doc.buildingId,
          revision: doc.revision,
          correlationId: input.correlationId,
          finalDocumentId: input.finalDocumentId,
          deliveryRecordId: input.deliveryRecordId,
          letterSentAtIso: input.letterSentAt.toISOString(),
        },
        session,
      );
    });

    return { transitioned, revision };
  } finally {
    await session.endSession();
  }
}