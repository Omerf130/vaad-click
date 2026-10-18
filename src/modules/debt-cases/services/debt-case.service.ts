import "server-only";

import { randomUUID } from "node:crypto";

import mongoose, { Types } from "mongoose";
import { ZodError } from "zod";

import { DebtCaseError, DebtCaseErrorCode } from "@/modules/debt-cases/domain/debt-case-errors";
import {
  assertDebtCaseContentEditable,
  lawyerReviewStatusAfterOperatorContentEdit,
} from "@/modules/debt-cases/domain/debt-case-edit-policy";
import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import {
  assertDebtCaseWorkflowTransition,
  lawyerReviewStatusAfterOperatorSubmit,
} from "@/modules/debt-cases/domain/debt-case-status-transitions";
import {
  findOverlappingOpenCase,
  assertSuccessorCaseAllowed,
  overlappingOpenCaseFlag,
} from "@/modules/debt-cases/domain/debt-case-duplicate-detection";
import {
  collectDebtCaseSubmissionFlags,
  hasBlockingValidationFlags,
} from "@/modules/debt-cases/domain/debt-case-validation";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import { DebtCase, type DebtCaseDocument } from "@/modules/debt-cases/infra/debt-case.model";
import {
  mapDebtCaseDocumentToListItem,
  mapDebtCaseDocumentToRecord,
} from "@/modules/debt-cases/persistence/debt-case.mapper";
import type { DebtCaseListItem } from "@/modules/debt-cases/persistence/debt-case.mapper";
import type { DebtCaseRecord } from "@/modules/debt-cases/domain/debt-case-record.types";
import {
  assertCanListBuildingDebtCases,
  assertCanMutateDebtCase,
  assertCanReadDebtCase,
  buildPendingUserDraftListFilter,
  resolveAuthorizedBuildingIdForDraftCreate,
} from "@/modules/debt-cases/services/debt-case-authorization.service";
import { WarningLetterDraftInvalidationReason } from "@/modules/warning-letters/domain/warning-letter-draft-invalidation-reason";
import { maybeInvalidateWarningLetterDraftOnDebtCaseChange } from "@/modules/warning-letters/services/warning-letter-draft-invalidation.service";
import {
  recordDebtCaseDraftCreated,
  recordDebtCaseDraftUpdated,
  recordDebtCaseReviewInvalidatedByEdit,
  recordDebtCaseSubmitted,
} from "@/modules/debt-cases/services/debt-case-audit.service";
import { notifyLawyerAdminsDebtCaseSubmitted } from "@/modules/notifications/services/notification-dispatch.service";
import { loadDebtCaseDuplicateCandidates } from "@/modules/debt-cases/services/debt-case-duplicate-query.service";
import { loadBuildingLegalReadinessForDebtCase } from "@/modules/debt-cases/services/debt-case-legal-readiness.loader";
import {
  claimDebtCasePeriodMonths,
  replaceDebtCasePeriodClaims,
} from "@/modules/debt-cases/services/debt-case-period-claim.service";
import {
  debtCaseDraftInputSchema,
  debtCaseSubmitInputSchema,
  mapSubmitInputToPartyStructure,
  parseApartmentFromDraftInput,
  type DebtCaseDraftInput,
} from "@/modules/debt-cases/validation/debt-case.schema";
import { User } from "@/modules/users/infra/user.model";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { AuditWriteFailedError } from "@/shared/audit/errors/audit-errors";
import { connectMongo } from "@/shared/db/connect";
import { AccountStatus } from "@/modules/users/domain/account-status";

function mapAuditPersistenceError(error: unknown): never {
  if (error instanceof AuditWriteFailedError) {
    throw new DebtCaseError(
      DebtCaseErrorCode.AUDIT_PERSISTENCE,
      "Debt case change could not be recorded",
    );
  }
  throw error;
}

function mapZodError(error: unknown): never {
  if (error instanceof ZodError) {
    throw new DebtCaseError(DebtCaseErrorCode.VALIDATION, "Invalid debt case input");
  }
  throw error;
}

const STATUSES_WITH_ACTIVE_CLAIMS = [
  DebtCaseWorkflowStatus.AWAITING_BUILDING_VERIFICATION,
  DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW,
  DebtCaseWorkflowStatus.RETURNED_FOR_COMPLETION,
  DebtCaseWorkflowStatus.LETTER_SENT,
] as const;

function caseHasActiveClaims(status: DebtCaseWorkflowStatus): boolean {
  return (STATUSES_WITH_ACTIVE_CLAIMS as readonly string[]).includes(status);
}

async function loadDebtCaseByPublicId(debtCaseId: string) {
  await connectMongo();
  const doc = await DebtCase.findOne({ debtCaseId });
  if (!doc) {
    throw new DebtCaseError(DebtCaseErrorCode.NOT_FOUND, "Debt case not found");
  }
  return doc;
}

async function resolveOperatorMobile(context: AuthenticatedContext): Promise<string | null> {
  const user = await User.findById(context.user.id).select("phoneE164").lean();
  return user?.phoneE164 ?? null;
}

export async function createDebtCaseDraft(input: {
  context: AuthenticatedContext;
  payload: { buildingId?: string | null };
  correlationId?: string;
}): Promise<DebtCaseRecord> {
  const { buildingId, pendingOnboardingRequestId } =
    await resolveAuthorizedBuildingIdForDraftCreate({
      context: input.context,
      clientBuildingId: input.payload.buildingId,
    });

  const debtCaseId = randomUUID();
  const userObjectId = new Types.ObjectId(input.context.user.id);
  await connectMongo();

  const session = await mongoose.startSession();
  try {
    let createdDoc: DebtCaseDocument | null = null;
    await session.withTransaction(async () => {
      const [doc] = await DebtCase.create(
        [
          {
            debtCaseId,
            buildingId,
            pendingOnboardingRequestId,
            workflowStatus: DebtCaseWorkflowStatus.DRAFT,
            lawyerReviewStatus: DebtCaseLawyerReviewStatus.NOT_SUBMITTED,
            createdByUserId: userObjectId,
            updatedByUserId: userObjectId,
            revision: 0,
          },
        ],
        { session },
      );
      if (!doc) {
        throw new DebtCaseError(DebtCaseErrorCode.VALIDATION, "Draft creation failed");
      }
      createdDoc = doc;
      await recordDebtCaseDraftCreated({
        context: input.context,
        debtCaseId,
        buildingId,
        revision: 0,
        correlationId: input.correlationId,
        session,
      });
    });
    if (!createdDoc) {
      throw new DebtCaseError(DebtCaseErrorCode.VALIDATION, "Draft creation failed");
    }
    return mapDebtCaseDocumentToRecord(createdDoc);
  } catch (error) {
    if (error instanceof DebtCaseError) {
      throw error;
    }
    mapAuditPersistenceError(error);
  } finally {
    await session.endSession();
  }
}

export async function getDebtCase(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
}): Promise<DebtCaseRecord> {
  const doc = await loadDebtCaseByPublicId(input.debtCaseId);
  await assertCanReadDebtCase({ context: input.context, doc });
  return mapDebtCaseDocumentToRecord(doc);
}

export async function listDebtCasesForBuilding(input: {
  context: AuthenticatedContext;
  buildingId: string;
}): Promise<DebtCaseListItem[]> {
  await assertCanListBuildingDebtCases({
    context: input.context,
    buildingId: input.buildingId,
  });

  await connectMongo();
  let filter: Record<string, unknown> = { buildingId: input.buildingId };

  if (input.context.user.accountStatus === AccountStatus.PENDING_APPROVAL) {
    filter = {
      ...filter,
      ...buildPendingUserDraftListFilter(input.context.user.id),
    };
  }

  const rows = await DebtCase.find(filter).sort({ updatedAt: -1 }).limit(200);
  return rows.map((row) => mapDebtCaseDocumentToListItem(row));
}

function applyDraftFieldsToDocument(
  doc: InstanceType<typeof DebtCase>,
  draft: DebtCaseDraftInput,
): void {
  if (draft.apartmentNumber != null && draft.apartmentNumber.trim()) {
    const apt = parseApartmentFromDraftInput(draft.apartmentNumber);
    doc.apartmentNumberDisplay = apt.apartmentNumberDisplay;
    doc.apartmentKeyNormalized = apt.apartmentKeyNormalized;
  }
  if (draft.debtType != null) {
    doc.debtType = draft.debtType;
  }
  if (draft.specialAssessmentDescription !== undefined) {
    doc.specialAssessmentDescription = draft.specialAssessmentDescription;
  }
  if (draft.principalAmountMinor != null) {
    doc.principalAmountMinor = draft.principalAmountMinor;
  }
  if (draft.periodStartMonth != null) {
    doc.periodStartMonth = draft.periodStartMonth;
  }
  if (draft.periodEndMonth != null) {
    doc.periodEndMonth = draft.periodEndMonth;
  }
  if (draft.predecessorDebtCaseId !== undefined) {
    doc.predecessorDebtCaseId = draft.predecessorDebtCaseId;
  }

  if (draft.propertyOwners || draft.occupancyType || draft.legalDebtorDesignation || draft.tenant) {
    const parsedSubmit = debtCaseSubmitInputSchema.safeParse({
      buildingId: doc.buildingId,
      apartmentNumber: doc.apartmentNumberDisplay || draft.apartmentNumber || "0",
      propertyOwners: draft.propertyOwners ?? [{ fullName: "placeholder", mobile: "0500000000" }],
      occupancyType: draft.occupancyType ?? "owner",
      legalDebtorDesignation: draft.legalDebtorDesignation ?? "property_owners",
      tenant: draft.tenant,
      postalAddress: draft.postalAddress,
      debtType: draft.debtType ?? "regular_vaad",
      specialAssessmentDescription: draft.specialAssessmentDescription,
      principalAmountMinor: draft.principalAmountMinor ?? 1,
      periodStartMonth: draft.periodStartMonth ?? "2024-01",
      periodEndMonth: draft.periodEndMonth ?? "2024-01",
    });
    if (parsedSubmit.success) {
      doc.parties = mapSubmitInputToPartyStructure(parsedSubmit.data) as typeof doc.parties;
    } else if (draft.propertyOwners) {
      doc.parties = {
        propertyOwners: draft.propertyOwners.map((o) => ({
          fullName: o.fullName?.trim() ?? "",
          identityDocumentType: o.identityDocumentType ?? null,
          identityNumber: o.identityNumber?.trim() ?? null,
          mobileE164: null,
          email: o.email?.trim() ?? null,
        })),
        occupancyType: draft.occupancyType ?? doc.parties?.occupancyType ?? "owner",
        legalDebtorDesignation:
          draft.legalDebtorDesignation ?? doc.parties?.legalDebtorDesignation ?? "property_owners",
        tenant: draft.tenant
          ? {
              fullName: draft.tenant.fullName?.trim() ?? "",
              identityDocumentType: draft.tenant.identityDocumentType ?? null,
              identityNumber: draft.tenant.identityNumber?.trim() ?? null,
              mobileE164: draft.tenant.mobile?.trim() ?? "",
              email: draft.tenant.email?.trim() ?? null,
            }
          : null,
        postalAddress: draft.postalAddress?.trim() ?? null,
      } as typeof doc.parties;
    }
  }
}

export async function updateDebtCase(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
  expectedRevision: number;
  payload: unknown;
  correlationId?: string;
}): Promise<DebtCaseRecord> {
  let draft: DebtCaseDraftInput;
  try {
    draft = debtCaseDraftInputSchema.parse(input.payload);
  } catch (error) {
    mapZodError(error);
  }

  const doc = await loadDebtCaseByPublicId(input.debtCaseId);
  await assertCanMutateDebtCase({ context: input.context, doc });

  assertDebtCaseContentEditable({
    workflowStatus: doc.workflowStatus as DebtCaseWorkflowStatus,
    letterSentAtIso: doc.letterSentAt ? doc.letterSentAt.toISOString() : null,
  });

  if (doc.debtSnapshotAtLetter) {
    throw new DebtCaseError(
      DebtCaseErrorCode.EDIT_NOT_ALLOWED,
      "Letter snapshot cannot be modified",
    );
  }

  const previousReviewStatus = doc.lawyerReviewStatus as DebtCaseLawyerReviewStatus;
  const previousPeriod = {
    start: doc.periodStartMonth,
    end: doc.periodEndMonth,
    aptKey: doc.apartmentKeyNormalized,
  };

  applyDraftFieldsToDocument(doc, draft);
  doc.updatedByUserId = new Types.ObjectId(input.context.user.id);

  const nextReviewStatus = lawyerReviewStatusAfterOperatorContentEdit({
    workflowStatus: doc.workflowStatus as DebtCaseWorkflowStatus,
    previousLawyerReviewStatus: previousReviewStatus,
  });
  const reviewInvalidated =
    nextReviewStatus !== previousReviewStatus &&
    previousReviewStatus === DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP;
  doc.lawyerReviewStatus = nextReviewStatus;

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const updated = await DebtCase.findOneAndUpdate(
        { debtCaseId: input.debtCaseId, revision: input.expectedRevision },
        {
          $set: {
            apartmentNumberDisplay: doc.apartmentNumberDisplay,
            apartmentKeyNormalized: doc.apartmentKeyNormalized,
            parties: doc.parties,
            debtType: doc.debtType,
            specialAssessmentDescription: doc.specialAssessmentDescription,
            principalAmountMinor: doc.principalAmountMinor,
            periodStartMonth: doc.periodStartMonth,
            periodEndMonth: doc.periodEndMonth,
            predecessorDebtCaseId: doc.predecessorDebtCaseId,
            lawyerReviewStatus: doc.lawyerReviewStatus,
            updatedByUserId: doc.updatedByUserId,
          },
          $inc: { revision: 1 },
        },
        { session, new: true },
      );
      if (!updated) {
        throw new DebtCaseError(DebtCaseErrorCode.REVISION_CONFLICT, "Stale revision");
      }

      if (
        caseHasActiveClaims(doc.workflowStatus as DebtCaseWorkflowStatus) &&
        doc.apartmentKeyNormalized &&
        doc.periodStartMonth &&
        doc.periodEndMonth &&
        (previousPeriod.start !== doc.periodStartMonth ||
          previousPeriod.end !== doc.periodEndMonth ||
          previousPeriod.aptKey !== doc.apartmentKeyNormalized)
      ) {
        await replaceDebtCasePeriodClaims({
          debtCaseId: doc.debtCaseId,
          buildingId: doc.buildingId,
          apartmentKeyNormalized: doc.apartmentKeyNormalized,
          periodStartMonth: doc.periodStartMonth as import("@/modules/debt-cases/domain/debt-period").DebtPeriodMonth,
          periodEndMonth: doc.periodEndMonth as import("@/modules/debt-cases/domain/debt-period").DebtPeriodMonth,
          session,
        });
      }

      if (reviewInvalidated) {
        await recordDebtCaseReviewInvalidatedByEdit({
          context: input.context,
          debtCaseId: doc.debtCaseId,
          buildingId: doc.buildingId,
          revision: updated.revision,
          lawyerReviewStatus: nextReviewStatus,
          correlationId: input.correlationId,
          session,
        });
      } else {
        await recordDebtCaseDraftUpdated({
          context: input.context,
          debtCaseId: doc.debtCaseId,
          buildingId: doc.buildingId,
          revision: updated.revision,
          workflowStatus: updated.workflowStatus as DebtCaseWorkflowStatus,
          lawyerReviewStatus: updated.lawyerReviewStatus as DebtCaseLawyerReviewStatus,
          correlationId: input.correlationId,
          session,
        });
      }

      await maybeInvalidateWarningLetterDraftOnDebtCaseChange({
        context: input.context,
        debtCase: mapDebtCaseDocumentToRecord(updated),
        session,
        correlationId: input.correlationId,
        reason: reviewInvalidated
          ? WarningLetterDraftInvalidationReason.DEBT_CASE_REVIEW_INVALIDATED
          : WarningLetterDraftInvalidationReason.DEBT_CASE_MATERIAL_EDIT,
      });
    });
  } catch (error) {
    if (error instanceof DebtCaseError) {
      throw error;
    }
    mapAuditPersistenceError(error);
  } finally {
    await session.endSession();
  }

  return getDebtCase({ context: input.context, debtCaseId: input.debtCaseId });
}

export async function previewDebtCaseSubmissionFlags(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
  payload: unknown;
}): Promise<{
  flags: import("@/modules/debt-cases/domain/debt-case-validation-flag").DebtCaseValidationFlag[];
  legalTreatmentAllowed: boolean;
  blocking: boolean;
}> {
  let submitPayload;
  try {
    submitPayload = debtCaseSubmitInputSchema.parse(input.payload);
  } catch (error) {
    mapZodError(error);
  }

  const doc = await loadDebtCaseByPublicId(input.debtCaseId);
  await assertCanMutateDebtCase({ context: input.context, doc });

  if (submitPayload.buildingId !== doc.buildingId) {
    throw new DebtCaseError(DebtCaseErrorCode.FORBIDDEN, "Building mismatch");
  }

  const apt = parseApartmentFromDraftInput(submitPayload.apartmentNumber);
  const parties = mapSubmitInputToPartyStructure(submitPayload);
  const readiness = await loadBuildingLegalReadinessForDebtCase(doc.buildingId);
  const duplicateCandidates = await loadDebtCaseDuplicateCandidates({
    buildingId: doc.buildingId,
    apartmentKeyNormalized: apt.apartmentKeyNormalized,
    excludeDebtCaseId: doc.debtCaseId,
  });

  const operatorMobile = await resolveOperatorMobile(input.context);
  const flags = collectDebtCaseSubmissionFlags({
    buildingId: doc.buildingId,
    debtCaseId: doc.debtCaseId,
    apartmentKeyNormalized: apt.apartmentKeyNormalized,
    parties,
    principalAmountMinor: submitPayload.principalAmountMinor,
    periodStartMonth: submitPayload.periodStartMonth,
    periodEndMonth: submitPayload.periodEndMonth,
    operatorMobileE164: operatorMobile,
    buildingAverageMonthlyVaadFeeMinor: readiness.averageMonthlyVaadFeeMinor,
    amountAnomalyPolicy: { enabled: false },
    legalReadiness: readiness,
    duplicateCandidates,
  });

  const overlap = findOverlappingOpenCase({
    buildingId: doc.buildingId,
    apartmentKeyNormalized: apt.apartmentKeyNormalized,
    periodStartMonth: submitPayload.periodStartMonth,
    periodEndMonth: submitPayload.periodEndMonth,
    excludeDebtCaseId: doc.debtCaseId,
    candidates: duplicateCandidates,
  });
  if (overlap.isBlockingOverlap) {
    flags.push(
      overlappingOpenCaseFlag(overlap.conflictingCaseId ?? "unknown"),
    );
  }

  return {
    flags,
    legalTreatmentAllowed: readiness.legalTreatmentAllowed,
    blocking: hasBlockingValidationFlags(flags),
  };
}

export async function submitDebtCaseForLawyerReview(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
  expectedRevision: number;
  payload: unknown;
  correlationId?: string;
}): Promise<DebtCaseRecord> {
  if (input.context.user.accountStatus === AccountStatus.PENDING_APPROVAL) {
    throw new DebtCaseError(DebtCaseErrorCode.SUBMIT_NOT_ALLOWED, "Account must be active to submit");
  }

  let submitPayload;
  try {
    submitPayload = debtCaseSubmitInputSchema.parse(input.payload);
  } catch (error) {
    mapZodError(error);
  }

  const doc = await loadDebtCaseByPublicId(input.debtCaseId);
  await assertCanMutateDebtCase({ context: input.context, doc });

  if (submitPayload.buildingId !== doc.buildingId) {
    throw new DebtCaseError(DebtCaseErrorCode.FORBIDDEN, "Building mismatch");
  }

  const fromStatus = doc.workflowStatus as DebtCaseWorkflowStatus;
  const toStatus = DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW;
  assertDebtCaseWorkflowTransition({
    from: fromStatus,
    to: toStatus,
    context: {
      role: input.context.user.role,
      accountStatus: input.context.user.accountStatus,
    },
  });

  const apt = parseApartmentFromDraftInput(submitPayload.apartmentNumber);
  const parties = mapSubmitInputToPartyStructure(submitPayload);
  const readiness = await loadBuildingLegalReadinessForDebtCase(doc.buildingId);
  const duplicateCandidates = await loadDebtCaseDuplicateCandidates({
    buildingId: doc.buildingId,
    apartmentKeyNormalized: apt.apartmentKeyNormalized,
    excludeDebtCaseId: doc.debtCaseId,
  });

  const operatorMobile = await resolveOperatorMobile(input.context);
  const flags = collectDebtCaseSubmissionFlags({
    buildingId: doc.buildingId,
    debtCaseId: doc.debtCaseId,
    apartmentKeyNormalized: apt.apartmentKeyNormalized,
    parties,
    principalAmountMinor: submitPayload.principalAmountMinor,
    periodStartMonth: submitPayload.periodStartMonth,
    periodEndMonth: submitPayload.periodEndMonth,
    operatorMobileE164: operatorMobile,
    buildingAverageMonthlyVaadFeeMinor: readiness.averageMonthlyVaadFeeMinor,
    amountAnomalyPolicy: { enabled: false },
    legalReadiness: readiness,
    duplicateCandidates,
  });

  if (submitPayload.predecessorDebtCaseId) {
    const predecessor = await DebtCase.findOne({
      debtCaseId: submitPayload.predecessorDebtCaseId,
    }).lean();
    const successorFlag = assertSuccessorCaseAllowed({
      predecessorLetterSentAtIso: predecessor?.letterSentAt
        ? predecessor.letterSentAt.toISOString()
        : null,
    });
    if (successorFlag) {
      flags.push(successorFlag);
    }
  }

  const overlap = findOverlappingOpenCase({
    buildingId: doc.buildingId,
    apartmentKeyNormalized: apt.apartmentKeyNormalized,
    periodStartMonth: submitPayload.periodStartMonth,
    periodEndMonth: submitPayload.periodEndMonth,
    excludeDebtCaseId: doc.debtCaseId,
    candidates: duplicateCandidates,
  });
  if (overlap.isBlockingOverlap) {
    throw new DebtCaseError(
      DebtCaseErrorCode.DUPLICATE_OVERLAP,
      "Overlapping open debt case exists for this apartment",
    );
  }

  if (hasBlockingValidationFlags(flags)) {
    throw new DebtCaseError(DebtCaseErrorCode.VALIDATION, "Submission blocked by validation flags");
  }

  const nextReview = lawyerReviewStatusAfterOperatorSubmit();
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      if (caseHasActiveClaims(fromStatus)) {
        await replaceDebtCasePeriodClaims({
          debtCaseId: doc.debtCaseId,
          buildingId: doc.buildingId,
          apartmentKeyNormalized: apt.apartmentKeyNormalized,
          periodStartMonth: submitPayload.periodStartMonth,
          periodEndMonth: submitPayload.periodEndMonth,
          session,
        });
      } else {
        await claimDebtCasePeriodMonths({
          buildingId: doc.buildingId,
          apartmentKeyNormalized: apt.apartmentKeyNormalized,
          periodStartMonth: submitPayload.periodStartMonth,
          periodEndMonth: submitPayload.periodEndMonth,
          debtCaseId: doc.debtCaseId,
          session,
        });
      }

      const updated = await DebtCase.findOneAndUpdate(
        { debtCaseId: input.debtCaseId, revision: input.expectedRevision },
        {
          $set: {
            apartmentNumberDisplay: apt.apartmentNumberDisplay,
            apartmentKeyNormalized: apt.apartmentKeyNormalized,
            parties,
            debtType: submitPayload.debtType,
            specialAssessmentDescription: submitPayload.specialAssessmentDescription,
            principalAmountMinor: submitPayload.principalAmountMinor,
            periodStartMonth: submitPayload.periodStartMonth,
            periodEndMonth: submitPayload.periodEndMonth,
            predecessorDebtCaseId: submitPayload.predecessorDebtCaseId,
            workflowStatus: toStatus,
            lawyerReviewStatus: nextReview,
            validationFlags: flags,
            legalHoldReasons: readiness.legalTreatmentAllowed ? [] : readiness.holdReasons,
            submittedAt: new Date(),
            submittedByUserId: new Types.ObjectId(input.context.user.id),
            updatedByUserId: new Types.ObjectId(input.context.user.id),
          },
          $inc: { revision: 1 },
        },
        { session, new: true },
      );

      if (!updated) {
        throw new DebtCaseError(DebtCaseErrorCode.REVISION_CONFLICT, "Stale revision");
      }

      await recordDebtCaseSubmitted({
        context: input.context,
        debtCaseId: doc.debtCaseId,
        buildingId: doc.buildingId,
        revision: updated.revision,
        lawyerReviewStatus: nextReview,
        validationFlagCodes: flags.map((f) => f.code),
        correlationId: input.correlationId,
        session,
      });

      await notifyLawyerAdminsDebtCaseSubmitted({
        debtCaseId: doc.debtCaseId,
        buildingId: doc.buildingId,
        revision: updated.revision,
        apartmentLabel: apt.apartmentNumberDisplay || "—",
        resubmitted: fromStatus === DebtCaseWorkflowStatus.RETURNED_FOR_COMPLETION,
        session,
      });
    });
  } catch (error) {
    if (error instanceof DebtCaseError) {
      throw error;
    }
    mapAuditPersistenceError(error);
  } finally {
    await session.endSession();
  }

  return getDebtCase({ context: input.context, debtCaseId: input.debtCaseId });
}
