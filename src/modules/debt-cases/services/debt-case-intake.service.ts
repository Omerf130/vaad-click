import "server-only";

import { randomUUID } from "node:crypto";

import mongoose, { Types } from "mongoose";

import { normalizeBuildingAddressKey } from "@/modules/buildings/domain/normalize-building-address";
import { DebtCaseError, DebtCaseErrorCode } from "@/modules/debt-cases/domain/debt-case-errors";
import {
  BuildingAssociationReviewStatus,
  DebtCaseIntakeDraftStatus,
} from "@/modules/debt-cases/domain/debt-case-intake-draft-status";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import { BuildingAssociationReview } from "@/modules/debt-cases/infra/building-association-review.model";
import { DebtCaseIntakeDraft } from "@/modules/debt-cases/infra/debt-case-intake-draft.model";
import { DebtCase } from "@/modules/debt-cases/infra/debt-case.model";
import type { DebtCaseRecord } from "@/modules/debt-cases/domain/debt-case-record.types";
import {
  detectIntakeAddressCollision,
  resolveBuildingIdForIntakeSubmit,
  resolveRepAssignedBuilding,
} from "@/modules/debt-cases/services/debt-case-intake-building-resolver.service";
import { assertDebtCaseAccountEligible } from "@/modules/debt-cases/services/debt-case-authorization.service";
import {
  debtCaseSubmitInputSchema,
  mapSubmitInputToPartyStructure,
  parseApartmentFromDraftInput,
} from "@/modules/debt-cases/validation/debt-case.schema";
import {
  collectDebtCaseSubmissionFlags,
  hasBlockingValidationFlags,
} from "@/modules/debt-cases/domain/debt-case-validation";
import { loadBuildingLegalReadinessForDebtCase } from "@/modules/debt-cases/services/debt-case-legal-readiness.loader";
import { loadDebtCaseDuplicateCandidates } from "@/modules/debt-cases/services/debt-case-duplicate-query.service";
import { findOverlappingOpenCase } from "@/modules/debt-cases/domain/debt-case-duplicate-detection";
import {
  lawyerReviewStatusAfterOperatorSubmit,
} from "@/modules/debt-cases/domain/debt-case-status-transitions";
import { recordDebtCaseSubmitted } from "@/modules/debt-cases/services/debt-case-audit.service";
import { buildPlatformFeeFieldsForCaseSubmit } from "@/modules/debt-cases/domain/warning-letter-platform-fee-submit";
import {
  debtCaseIntakeDraftSaveSchema,
  debtCaseIntakeSubmitSchema,
  type DebtCaseIntakeDraftSaveInput,
  type DebtCaseIntakeSubmitInput,
} from "@/modules/debt-cases/validation/debt-case-intake.schema";
import { canOperatorSubmitDebtCase } from "@/modules/users/domain/client-portal-access";
import { listAccessibleBuildings } from "@/shared/auth/building-access";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { connectMongo } from "@/shared/db/connect";
import { User } from "@/modules/users/infra/user.model";

export type IntakePortalContext = {
  repAssignedBuildingId: string | null;
  accessibleBuildings: { buildingId: string; displayName: string; city: string }[];
};

export async function loadIntakePortalContext(
  context: AuthenticatedContext,
): Promise<IntakePortalContext> {
  const repAssignedBuildingId = await resolveRepAssignedBuilding(context);
  const rows = await listAccessibleBuildings({ context });
  return {
    repAssignedBuildingId,
    accessibleBuildings: rows.map((row) => ({
      buildingId: row.buildingId,
      displayName: row.displayName,
      city: "",
    })),
  };
}

function assertMayUseIntake(context: AuthenticatedContext): void {
  assertDebtCaseAccountEligible(context);
  if (!canOperatorSubmitDebtCase(context.user)) {
    throw new DebtCaseError(DebtCaseErrorCode.SUBMIT_NOT_ALLOWED, "Cannot use intake");
  }
}

async function assertIntakeDraftOwned(
  context: AuthenticatedContext,
  intakeDraftId: string,
): Promise<{ doc: NonNullable<Awaited<ReturnType<typeof DebtCaseIntakeDraft.findOne>>> }> {
  await connectMongo();
  const doc = await DebtCaseIntakeDraft.findOne({
    intakeDraftId,
    createdByUserId: new Types.ObjectId(context.user.id),
  });
  if (!doc) {
    throw new DebtCaseError(DebtCaseErrorCode.NOT_FOUND, "Intake draft not found");
  }
  if (doc.status !== DebtCaseIntakeDraftStatus.DRAFT) {
    throw new DebtCaseError(DebtCaseErrorCode.EDIT_NOT_ALLOWED, "Intake draft is not editable");
  }
  return { doc };
}

function buildingSnapshotFromInput(
  building: DebtCaseIntakeDraftSaveInput["building"] | DebtCaseIntakeSubmitInput["building"],
): Record<string, unknown> {
  if (building.mode === "existing") {
    return {
      displayName: "",
      city: "",
      street: "",
      houseNumber: "",
      postalCode: null,
      normalizedAddressKey: null,
    };
  }
  const address = building.address ?? {};
  const snapshot = {
    displayName: building.displayName ?? "",
    city: address.city ?? "",
    street: address.street ?? "",
    houseNumber: address.houseNumber ?? "",
    postalCode: address.postalCode ?? null,
  };
  if (snapshot.city && snapshot.street && snapshot.houseNumber) {
    return {
      ...snapshot,
      normalizedAddressKey: normalizeBuildingAddressKey({
        city: snapshot.city,
        street: snapshot.street,
        houseNumber: snapshot.houseNumber,
        postalCode: snapshot.postalCode ?? undefined,
      }),
    };
  }
  return { ...snapshot, normalizedAddressKey: null };
}

export function isPristineIntakeDraft(doc: {
  buildingSnapshot?: {
    displayName?: string | null;
    city?: string | null;
    street?: string | null;
    houseNumber?: string | null;
  } | null;
  caseDraftJson?: Record<string, unknown> | null;
}): boolean {
  const snap = doc.buildingSnapshot ?? {};
  const buildingEmpty =
    !String(snap.displayName ?? "").trim() &&
    !String(snap.city ?? "").trim() &&
    !String(snap.street ?? "").trim() &&
    !String(snap.houseNumber ?? "").trim();
  const caseJson = doc.caseDraftJson ?? {};
  const caseEmpty = Object.entries(caseJson).every(([key, value]) => {
    if (key === "buildingId") {
      return true;
    }
    if (value == null || value === "") {
      return true;
    }
    if (Array.isArray(value)) {
      return value.length === 0;
    }
    return false;
  });
  return buildingEmpty && caseEmpty;
}

async function findReusablePristineIntakeDraft(context: AuthenticatedContext) {
  return DebtCaseIntakeDraft.findOne({
    createdByUserId: new Types.ObjectId(context.user.id),
    status: DebtCaseIntakeDraftStatus.DRAFT,
  })
    .sort({ updatedAt: -1 })
    .then((doc) => (doc && isPristineIntakeDraft(doc) ? doc : null));
}

/** Creates a server-owned empty draft (no building provisioning). Prefer lazy creation on the new-case page. */
export async function createEmptyDebtCaseIntakeDraft(input: {
  context: AuthenticatedContext;
}): Promise<{ intakeDraftId: string; revision: number }> {
  return saveDebtCaseIntakeDraft({
    context: input.context,
    payload: {
      building: { mode: "new", address: {} },
      caseDraft: {},
    },
  });
}

export async function saveDebtCaseIntakeDraft(input: {
  context: AuthenticatedContext;
  payload: unknown;
  correlationId?: string;
}): Promise<{ intakeDraftId: string; revision: number }> {
  assertMayUseIntake(input.context);
  const parsed = debtCaseIntakeDraftSaveSchema.parse(input.payload);
  await connectMongo();

  const repAssigned = await resolveRepAssignedBuilding(input.context);
  let building = parsed.building;
  if (repAssigned) {
    building = { mode: "existing", buildingId: repAssigned };
  }

  const caseDraftJson = {
    ...parsed.caseDraft,
    buildingId: building.mode === "existing" ? building.buildingId : undefined,
  };

  let intakeDraftId = parsed.intakeDraftId ?? null;
  let expectedRevision = parsed.expectedRevision;

  if (!intakeDraftId) {
    const reusable = await findReusablePristineIntakeDraft(input.context);
    if (reusable) {
      intakeDraftId = reusable.intakeDraftId;
      expectedRevision = reusable.revision;
    }
  }

  if (intakeDraftId) {
    const { doc } = await assertIntakeDraftOwned(input.context, intakeDraftId);
    if (expectedRevision != null && doc.revision !== expectedRevision) {
      throw new DebtCaseError(DebtCaseErrorCode.REVISION_CONFLICT, "Stale revision");
    }
    doc.buildingSelectionMode = building.mode;
    doc.existingBuildingId = building.mode === "existing" ? building.buildingId : null;
    doc.buildingSnapshot = buildingSnapshotFromInput(building) as typeof doc.buildingSnapshot;
    doc.caseDraftJson = caseDraftJson;
    doc.platformFeePreference = parsed.platformFeePreference ?? null;
    doc.revision += 1;
    await doc.save();
    return { intakeDraftId: doc.intakeDraftId, revision: doc.revision };
  }

  const newIntakeDraftId = randomUUID();
  await DebtCaseIntakeDraft.create({
    intakeDraftId: newIntakeDraftId,
    createdByUserId: new Types.ObjectId(input.context.user.id),
    status: DebtCaseIntakeDraftStatus.DRAFT,
    buildingSelectionMode: building.mode,
    existingBuildingId: building.mode === "existing" ? building.buildingId : null,
    buildingSnapshot: buildingSnapshotFromInput(building),
    caseDraftJson,
    platformFeePreference: parsed.platformFeePreference ?? null,
    revision: 0,
  });

  return { intakeDraftId: newIntakeDraftId, revision: 0 };
}

export async function getDebtCaseIntakeDraft(input: {
  context: AuthenticatedContext;
  intakeDraftId: string;
}) {
  assertMayUseIntake(input.context);
  await connectMongo();
  const doc = await DebtCaseIntakeDraft.findOne({
    intakeDraftId: input.intakeDraftId,
    createdByUserId: new Types.ObjectId(input.context.user.id),
  }).lean();
  if (!doc) {
    throw new DebtCaseError(DebtCaseErrorCode.NOT_FOUND, "Intake draft not found");
  }
  return doc;
}

export async function listDebtCaseIntakeDrafts(context: AuthenticatedContext) {
  assertMayUseIntake(context);
  await connectMongo();
  return DebtCaseIntakeDraft.find({
    createdByUserId: new Types.ObjectId(context.user.id),
    status: DebtCaseIntakeDraftStatus.DRAFT,
  })
    .sort({ updatedAt: -1 })
    .limit(20)
    .select("intakeDraftId updatedAt buildingSnapshot caseDraftJson")
    .lean();
}

export type IntakeSubmitResult =
  | { kind: "submitted"; debtCaseId: string; buildingId: string }
  | { kind: "pending_building_review"; intakeDraftId: string; reviewId: string };

async function reassignIntakeDocuments(input: {
  intakeDraftId: string;
  buildingId: string;
  debtCaseId: string;
  session: mongoose.ClientSession;
}): Promise<void> {
  const { DocumentAsset } = await import("@/modules/document-assets/infra/document-asset.model");
  const { DocumentOwnerEntityType } = await import(
    "@/modules/document-assets/domain/document-owner-entity-type"
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
        ownerEntityId: input.debtCaseId,
      },
    },
    { session: input.session },
  );
}

export async function submitDebtCaseIntake(input: {
  context: AuthenticatedContext;
  payload: unknown;
  correlationId?: string;
}): Promise<IntakeSubmitResult> {
  assertMayUseIntake(input.context);
  const parsed = debtCaseIntakeSubmitSchema.parse(input.payload);

  await connectMongo();
  const existingIdempotent = await DebtCaseIntakeDraft.findOne({
    submitIdempotencyKey: parsed.submitIdempotencyKey,
    createdByUserId: new Types.ObjectId(input.context.user.id),
  }).lean();
  if (existingIdempotent?.linkedDebtCaseId && existingIdempotent.status === DebtCaseIntakeDraftStatus.COMPLETED) {
    const debtCase = await DebtCase.findOne({ debtCaseId: existingIdempotent.linkedDebtCaseId }).lean();
    if (debtCase) {
      return {
        kind: "submitted",
        debtCaseId: debtCase.debtCaseId,
        buildingId: debtCase.buildingId,
      };
    }
  }
  if (
    existingIdempotent?.status === DebtCaseIntakeDraftStatus.SUBMITTED_PENDING_BUILDING &&
    existingIdempotent.buildingAssociationReviewId
  ) {
    return {
      kind: "pending_building_review",
      intakeDraftId: existingIdempotent.intakeDraftId,
      reviewId: existingIdempotent.buildingAssociationReviewId,
    };
  }

  const { doc: intakeDoc } = await assertIntakeDraftOwned(input.context, parsed.intakeDraftId);
  if (intakeDoc.revision !== parsed.expectedRevision) {
    throw new DebtCaseError(DebtCaseErrorCode.REVISION_CONFLICT, "Stale revision");
  }

  const repAssigned = await resolveRepAssignedBuilding(input.context);
  let building = parsed.building;
  if (repAssigned) {
    building = { mode: "existing", buildingId: repAssigned };
  }

  if (building.mode === "new") {
    const normalizedAddressKey = normalizeBuildingAddressKey(building.address);
    const collision = await detectIntakeAddressCollision({
      context: input.context,
      normalizedAddressKey,
    });
    if (collision.collision) {
      debtCaseSubmitInputSchema.parse({
        ...parsed.caseDraft,
        buildingId: randomUUID(),
      });

      const reviewId = randomUUID();
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          await BuildingAssociationReview.create(
            [
              {
                reviewId,
                intakeDraftId: parsed.intakeDraftId,
                submittedByUserId: new Types.ObjectId(input.context.user.id),
                submitterRole: input.context.user.role,
                buildingSnapshot: {
                  displayName: building.displayName,
                  city: building.address.city,
                  street: building.address.street,
                  houseNumber: building.address.houseNumber,
                  postalCode: building.address.postalCode ?? null,
                  normalizedAddressKey,
                },
                caseSubmitPayloadJson: parsed.caseDraft,
                documentAssetIds: intakeDoc.documentAssetIds ?? [],
                status: BuildingAssociationReviewStatus.OPEN,
              },
            ],
            { session },
          );

          await DebtCaseIntakeDraft.updateOne(
            { intakeDraftId: parsed.intakeDraftId, revision: parsed.expectedRevision },
            {
              $set: {
                status: DebtCaseIntakeDraftStatus.SUBMITTED_PENDING_BUILDING,
                buildingAssociationReviewId: reviewId,
                submitIdempotencyKey: parsed.submitIdempotencyKey,
                submittedAt: new Date(),
                buildingSnapshot: {
                  displayName: building.displayName,
                  city: building.address.city,
                  street: building.address.street,
                  houseNumber: building.address.houseNumber,
                  postalCode: building.address.postalCode ?? null,
                  normalizedAddressKey,
                },
                caseDraftJson: parsed.caseDraft,
                platformFeePreference: parsed.platformFeePreference,
              },
              $inc: { revision: 1 },
            },
            { session },
          );

          const { markClientPendingLawyerApprovalOnFirstSubmit } = await import(
            "@/modules/users/services/client-approval.service"
          );
          await markClientPendingLawyerApprovalOnFirstSubmit({
            context: input.context,
            correlationId: input.correlationId,
            session,
          });
        });
      } finally {
        await session.endSession();
      }

      const { notifyLawyerAdminsBuildingAssociationReviewRequired } = await import(
        "@/modules/notifications/services/notification-dispatch.service"
      );
      await notifyLawyerAdminsBuildingAssociationReviewRequired({
        reviewId,
        intakeDraftId: parsed.intakeDraftId,
      });

      return {
        kind: "pending_building_review",
        intakeDraftId: parsed.intakeDraftId,
        reviewId,
      };
    }
  }

  const session = await mongoose.startSession();
  let debtCaseId = "";
  let buildingId = "";

  try {
    await session.withTransaction(async () => {
      const resolution = await resolveBuildingIdForIntakeSubmit({
        context: input.context,
        building,
        correlationId: input.correlationId,
        session,
      });
      if (resolution.outcome === "collision") {
        throw new DebtCaseError(DebtCaseErrorCode.VALIDATION, "Building collision");
      }
      if (resolution.outcome === "forbidden") {
        throw new DebtCaseError(DebtCaseErrorCode.FORBIDDEN, resolution.message);
      }
      buildingId = resolution.buildingId;

      const submitPayload = debtCaseSubmitInputSchema.parse({
        ...parsed.caseDraft,
        buildingId,
      });

      const apt = parseApartmentFromDraftInput(submitPayload.apartmentNumber);
      const parties = mapSubmitInputToPartyStructure(submitPayload);
      const readiness = await loadBuildingLegalReadinessForDebtCase(buildingId);
      const duplicateCandidates = await loadDebtCaseDuplicateCandidates({
        buildingId,
        apartmentKeyNormalized: apt.apartmentKeyNormalized,
      });

      const user = await User.findById(input.context.user.id).select("phoneE164").session(session).lean();
      const flags = collectDebtCaseSubmissionFlags({
        buildingId,
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
        buildingId,
        apartmentKeyNormalized: apt.apartmentKeyNormalized,
        periodStartMonth: submitPayload.periodStartMonth,
        periodEndMonth: submitPayload.periodEndMonth,
        candidates: duplicateCandidates,
      });
      if (overlap.isBlockingOverlap) {
        throw new DebtCaseError(
          DebtCaseErrorCode.DUPLICATE_OVERLAP,
          "Overlapping open debt case exists",
        );
      }
      if (hasBlockingValidationFlags(flags)) {
        throw new DebtCaseError(DebtCaseErrorCode.VALIDATION, "Submission blocked");
      }

      debtCaseId = randomUUID();
      const userObjectId = new Types.ObjectId(input.context.user.id);
      const nextReview = lawyerReviewStatusAfterOperatorSubmit();

      await DebtCase.create(
        [
          {
            debtCaseId,
            buildingId,
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
            ...buildPlatformFeeFieldsForCaseSubmit(parsed.platformFeePreference),
            submittedAt: new Date(),
            submittedByUserId: userObjectId,
            createdByUserId: userObjectId,
            updatedByUserId: userObjectId,
            revision: 0,
          },
        ],
        { session },
      );

      await reassignIntakeDocuments({
        intakeDraftId: parsed.intakeDraftId,
        buildingId,
        debtCaseId,
        session,
      });

      await DebtCaseIntakeDraft.updateOne(
        { intakeDraftId: parsed.intakeDraftId },
        {
          $set: {
            status: DebtCaseIntakeDraftStatus.COMPLETED,
            linkedDebtCaseId: debtCaseId,
            submitIdempotencyKey: parsed.submitIdempotencyKey,
            submittedAt: new Date(),
          },
          $inc: { revision: 1 },
        },
        { session },
      );

      await recordDebtCaseSubmitted({
        context: input.context,
        debtCaseId,
        buildingId,
        revision: 0,
        lawyerReviewStatus: nextReview,
        validationFlagCodes: flags.map((f) => f.code),
        correlationId: input.correlationId,
        session,
      });

      const { markClientPendingLawyerApprovalOnFirstSubmit } = await import(
        "@/modules/users/services/client-approval.service"
      );
      await markClientPendingLawyerApprovalOnFirstSubmit({
        context: input.context,
        correlationId: input.correlationId,
        session,
      });
    });
  } finally {
    await session.endSession();
  }

  const { notifyLawyerAdminsDebtCaseSubmitted } = await import(
    "@/modules/notifications/services/notification-dispatch.service"
  );
  const aptLabel =
    (parsed.caseDraft.apartmentNumber as string | undefined)?.trim() || "—";
  await notifyLawyerAdminsDebtCaseSubmitted({
    debtCaseId,
    buildingId,
    revision: 0,
    apartmentLabel: aptLabel,
    resubmitted: false,
  });

  return { kind: "submitted", debtCaseId, buildingId };
}

export async function getIntakeDraftAsDebtCaseRecord(input: {
  context: AuthenticatedContext;
  intakeDraftId: string;
}): Promise<{ intakeDraftId: string; revision: number; record: DebtCaseRecord | null }> {
  const doc = await getDebtCaseIntakeDraft(input);
  if (doc.linkedDebtCaseId) {
    const { getDebtCase } = await import("@/modules/debt-cases/services/debt-case.service");
    const record = await getDebtCase({
      context: input.context,
      debtCaseId: doc.linkedDebtCaseId,
    });
    return { intakeDraftId: doc.intakeDraftId, revision: doc.revision, record };
  }
  return { intakeDraftId: doc.intakeDraftId, revision: doc.revision, record: null };
}
