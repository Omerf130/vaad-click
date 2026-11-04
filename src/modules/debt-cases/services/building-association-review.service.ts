import "server-only";

import mongoose, { Types } from "mongoose";

import {
  OrganizationError,
  OrganizationErrorCode,
} from "@/modules/buildings/domain/organization-errors";
import {
  BuildingAssociationReviewStatus,
  DebtCaseIntakeDraftStatus,
} from "@/modules/debt-cases/domain/debt-case-intake-draft-status";
import { BuildingAssociationReview } from "@/modules/debt-cases/infra/building-association-review.model";
import { DebtCaseIntakeDraft } from "@/modules/debt-cases/infra/debt-case-intake-draft.model";
import { assertLawyerAdminOrganization } from "@/modules/organizations/services/assert-lawyer-admin";
import { provisionBuildingForIntakeSubmit } from "@/modules/debt-cases/services/debt-case-intake-building-resolver.service";
import { finalizeIntakeReviewToDebtCase } from "@/modules/debt-cases/services/debt-case-intake-finalize.service";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { connectMongo } from "@/shared/db/connect";
import { User } from "@/modules/users/infra/user.model";
import { UserRole } from "@/modules/users/domain/user-role";

export async function listOpenBuildingAssociationReviews(context: AuthenticatedContext) {
  assertLawyerAdminOrganization(context);
  await connectMongo();
  return BuildingAssociationReview.find({ status: BuildingAssociationReviewStatus.OPEN })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
}

export async function getBuildingAssociationReview(input: {
  context: AuthenticatedContext;
  reviewId: string;
}) {
  assertLawyerAdminOrganization(input.context);
  await connectMongo();
  const review = await BuildingAssociationReview.findOne({ reviewId: input.reviewId }).lean();
  if (!review) {
    throw new OrganizationError(OrganizationErrorCode.NOT_FOUND, "Review not found");
  }
  return review;
}

/** Lawyer resolves by binding an existing authorized building or provisioning from submitted snapshot. */
export async function resolveBuildingAssociationReview(input: {
  context: AuthenticatedContext;
  reviewId: string;
  resolution: { mode: "provision_for_submitter" } | { mode: "link_existing"; buildingId: string };
  correlationId?: string;
}): Promise<{ debtCaseId: string; buildingId: string }> {
  assertLawyerAdminOrganization(input.context);
  await connectMongo();

  const review = await BuildingAssociationReview.findOne({
    reviewId: input.reviewId,
    status: BuildingAssociationReviewStatus.OPEN,
  });
  if (!review) {
    throw new OrganizationError(OrganizationErrorCode.NOT_FOUND, "Review not open");
  }

  const intake = await DebtCaseIntakeDraft.findOne({
    intakeDraftId: review.intakeDraftId,
    status: DebtCaseIntakeDraftStatus.SUBMITTED_PENDING_BUILDING,
  });
  if (!intake) {
    throw new OrganizationError(OrganizationErrorCode.CONFLICT, "Intake not pending");
  }

  const submitter = await User.findById(review.submittedByUserId).lean();
  if (!submitter?.email) {
    throw new OrganizationError(OrganizationErrorCode.NOT_FOUND, "Submitter not found");
  }

  const submitterContext: AuthenticatedContext = {
    user: {
      id: submitter._id.toString(),
      email: submitter.email,
      fullName: submitter.fullName,
      role: submitter.role as UserRole,
      accountStatus: submitter.accountStatus as AuthenticatedContext["user"]["accountStatus"],
      clientApprovalStatus:
        (submitter.clientApprovalStatus as AuthenticatedContext["user"]["clientApprovalStatus"]) ??
        null,
    },
    session: input.context.session,
  };

  const session = await mongoose.startSession();
  let buildingId = "";
  let debtCaseId = "";

  try {
    await session.withTransaction(async () => {
      if (input.resolution.mode === "link_existing") {
        buildingId = input.resolution.buildingId;
      } else {
        const snapshot = review.buildingSnapshot;
        const resolution = await provisionBuildingForIntakeSubmit({
          context: submitterContext,
          buildingPayload: {
            displayName: snapshot.displayName,
            address: {
              city: snapshot.city,
              street: snapshot.street,
              houseNumber: snapshot.houseNumber,
              postalCode: snapshot.postalCode ?? undefined,
            },
          },
          correlationId: input.correlationId,
          session,
        });
        if (resolution.outcome !== "ready") {
          throw new OrganizationError(
            OrganizationErrorCode.CONFLICT,
            "Could not provision building for submitter",
          );
        }
        buildingId = resolution.buildingId;
      }

      const result = await finalizeIntakeReviewToDebtCase({
        context: submitterContext,
        intakeDraftId: review.intakeDraftId,
        buildingId,
        caseDraft: review.caseSubmitPayloadJson,
        correlationId: input.correlationId,
        session,
      });
      debtCaseId = result.debtCaseId;

      review.status = BuildingAssociationReviewStatus.RESOLVED;
      review.resolvedBuildingId = buildingId;
      review.resolvedDebtCaseId = debtCaseId;
      review.resolvedAt = new Date();
      review.resolvedByUserId = new Types.ObjectId(input.context.user.id);
      await review.save({ session });
    });
  } finally {
    await session.endSession();
  }

  const { notifyLawyerAdminsDebtCaseSubmitted } = await import(
    "@/modules/notifications/services/notification-dispatch.service"
  );
  await notifyLawyerAdminsDebtCaseSubmitted({
    debtCaseId,
    buildingId,
    revision: 0,
    apartmentLabel: "—",
    resubmitted: false,
  });

  return { debtCaseId, buildingId };
}
