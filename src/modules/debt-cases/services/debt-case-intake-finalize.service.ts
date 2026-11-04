import "server-only";

import { randomUUID } from "node:crypto";

import mongoose, { Types } from "mongoose";

import { DebtCaseError, DebtCaseErrorCode } from "@/modules/debt-cases/domain/debt-case-errors";
import { DebtCaseIntakeDraftStatus } from "@/modules/debt-cases/domain/debt-case-intake-draft-status";
import {
  collectDebtCaseSubmissionFlags,
  hasBlockingValidationFlags,
} from "@/modules/debt-cases/domain/debt-case-validation";
import { findOverlappingOpenCase } from "@/modules/debt-cases/domain/debt-case-duplicate-detection";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import { lawyerReviewStatusAfterOperatorSubmit } from "@/modules/debt-cases/domain/debt-case-status-transitions";
import { DebtCaseIntakeDraft } from "@/modules/debt-cases/infra/debt-case-intake-draft.model";
import { DebtCase } from "@/modules/debt-cases/infra/debt-case.model";
import { buildPlatformFeeFieldsForCaseSubmit } from "@/modules/debt-cases/domain/warning-letter-platform-fee-submit";
import type { WarningLetterPlatformFeePaymentPreference } from "@/modules/debt-cases/domain/warning-letter-platform-fee-payment-preference";
import { recordDebtCaseSubmitted } from "@/modules/debt-cases/services/debt-case-audit.service";
import { loadDebtCaseDuplicateCandidates } from "@/modules/debt-cases/services/debt-case-duplicate-query.service";
import { loadBuildingLegalReadinessForDebtCase } from "@/modules/debt-cases/services/debt-case-legal-readiness.loader";
import {
  debtCaseSubmitInputSchema,
  mapSubmitInputToPartyStructure,
  parseApartmentFromDraftInput,
} from "@/modules/debt-cases/validation/debt-case.schema";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { User } from "@/modules/users/infra/user.model";
import { DocumentAsset } from "@/modules/document-assets/infra/document-asset.model";
import { DocumentOwnerEntityType } from "@/modules/document-assets/domain/document-owner-entity-type";

export async function finalizeIntakeReviewToDebtCase(input: {
  context: AuthenticatedContext;
  intakeDraftId: string;
  buildingId: string;
  caseDraft: unknown;
  correlationId?: string;
  session: mongoose.ClientSession;
}): Promise<{ debtCaseId: string }> {
  const intake = await DebtCaseIntakeDraft.findOne({
    intakeDraftId: input.intakeDraftId,
    status: DebtCaseIntakeDraftStatus.SUBMITTED_PENDING_BUILDING,
  }).session(input.session);
  if (!intake) {
    throw new DebtCaseError(DebtCaseErrorCode.NOT_FOUND, "Intake not pending");
  }
  if (intake.linkedDebtCaseId) {
    return { debtCaseId: intake.linkedDebtCaseId };
  }

  const submitPayload = debtCaseSubmitInputSchema.parse({
    ...(input.caseDraft as Record<string, unknown>),
    buildingId: input.buildingId,
  });

  const apt = parseApartmentFromDraftInput(submitPayload.apartmentNumber);
  const parties = mapSubmitInputToPartyStructure(submitPayload);
  const readiness = await loadBuildingLegalReadinessForDebtCase(input.buildingId);
  const duplicateCandidates = await loadDebtCaseDuplicateCandidates({
    buildingId: input.buildingId,
    apartmentKeyNormalized: apt.apartmentKeyNormalized,
  });

  const user = await User.findById(input.context.user.id).select("phoneE164").session(input.session).lean();
  const flags = collectDebtCaseSubmissionFlags({
    buildingId: input.buildingId,
    debtCaseId: "pending",
    apartmentKeyNormalized: apt.apartmentKeyNormalized,
    parties,
    principalAmountMinor: submitPayload.principalAmountMinor,
    periodStartMonth: submitPayload.periodStartMonth,
    periodEndMonth: submitPayload.periodEndMonth,
    operatorMobileE164: user?.phoneE164 ?? null,
    buildingAverageMonthlyVaadFeeMinor: readiness.averageMonthlyVaadFeeMinor,
    amountAnomalyPolicy: { enabled: false },
    legalReadiness: readiness,
    duplicateCandidates,
  });

  const overlap = findOverlappingOpenCase({
    buildingId: input.buildingId,
    apartmentKeyNormalized: apt.apartmentKeyNormalized,
    periodStartMonth: submitPayload.periodStartMonth,
    periodEndMonth: submitPayload.periodEndMonth,
    candidates: duplicateCandidates,
  });
  if (overlap.isBlockingOverlap || hasBlockingValidationFlags(flags)) {
    throw new DebtCaseError(DebtCaseErrorCode.VALIDATION, "Cannot finalize intake case");
  }

  const debtCaseId = randomUUID();
  const userObjectId = new Types.ObjectId(input.context.user.id);
  const nextReview = lawyerReviewStatusAfterOperatorSubmit();

  await DebtCase.create(
    [
      {
        debtCaseId,
        buildingId: input.buildingId,
        workflowStatus: DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW,
        lawyerReviewStatus: nextReview,
        apartmentNumberDisplay: apt.apartmentNumberDisplay,
        apartmentKeyNormalized: apt.apartmentKeyNormalized,
        parties: parties as unknown as Record<string, unknown>,
        debtType: submitPayload.debtType,
        specialAssessmentDescription: submitPayload.specialAssessmentDescription,
        principalAmountMinor: submitPayload.principalAmountMinor,
        periodStartMonth: submitPayload.periodStartMonth,
        periodEndMonth: submitPayload.periodEndMonth,
        predecessorDebtCaseId: submitPayload.predecessorDebtCaseId,
        validationFlags: flags,
        legalHoldReasons: readiness.legalTreatmentAllowed ? [] : readiness.holdReasons,
        submittedAt: new Date(),
        submittedByUserId: userObjectId,
        createdByUserId: userObjectId,
        updatedByUserId: userObjectId,
        revision: 0,
        ...(intake.platformFeePreference
          ? buildPlatformFeeFieldsForCaseSubmit(
              intake.platformFeePreference as WarningLetterPlatformFeePaymentPreference,
            )
          : {}),
      },
    ],
    { session: input.session },
  );

  await DocumentAsset.updateMany(
    {
      ownerEntityType: DocumentOwnerEntityType.DEBT_CASE_INTAKE_DRAFT,
      ownerEntityId: input.intakeDraftId,
    },
    {
      $set: {
        buildingId: input.buildingId,
        ownerEntityType: DocumentOwnerEntityType.DEBT_CASE,
        ownerEntityId: debtCaseId,
      },
    },
    { session: input.session },
  );

  intake.status = DebtCaseIntakeDraftStatus.COMPLETED;
  intake.linkedDebtCaseId = debtCaseId;
  await intake.save({ session: input.session });

  await recordDebtCaseSubmitted({
    context: input.context,
    debtCaseId,
    buildingId: input.buildingId,
    revision: 0,
    lawyerReviewStatus: nextReview,
    validationFlagCodes: flags.map((f) => f.code),
    correlationId: input.correlationId,
    session: input.session,
  });

  return { debtCaseId };
}
