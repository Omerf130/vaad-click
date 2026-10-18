import "server-only";

import {
  BuildingOrganizationalStatus,
  LawyerVerificationStatus,
} from "@/modules/buildings/domain/building-status";
import { Building } from "@/modules/buildings/infra/building.model";
import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import { DebtCase } from "@/modules/debt-cases/infra/debt-case.model";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import { User } from "@/modules/users/infra/user.model";
import { assertLawyerAdminOrganization } from "@/modules/organizations/services/assert-lawyer-admin";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { connectMongo } from "@/shared/db/connect";

export type AdminOperationalCounts = {
  debtCasesAwaitingReview: number;
  debtCasesReturned: number;
  buildingsPendingVerification: number;
  casesApprovedForLetterPrep: number;
};

export type AdminAttentionItem = {
  id: string;
  kind: "user_pending" | "debt_case_review" | "building_verification";
  titleHe: string;
  metaHe: string;
  statusHe: string;
  href: string;
};

const ATTENTION_LIMIT = 8;

export async function getAdminOperationalCounts(
  context: AuthenticatedContext,
): Promise<AdminOperationalCounts> {
  assertLawyerAdminOrganization(context);
  await connectMongo();

  const [
    debtCasesAwaitingReview,
    debtCasesReturned,
    buildingsPendingVerification,
    casesApprovedForLetterPrep,
  ] = await Promise.all([
    DebtCase.countDocuments({
      workflowStatus: DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW,
      lawyerReviewStatus: DebtCaseLawyerReviewStatus.PENDING,
    }),
    DebtCase.countDocuments({
      workflowStatus: DebtCaseWorkflowStatus.RETURNED_FOR_COMPLETION,
    }),
    Building.countDocuments({
      organizationalStatus: BuildingOrganizationalStatus.ACTIVE,
      lawyerVerificationStatus: { $ne: LawyerVerificationStatus.VERIFIED },
    }),
    DebtCase.countDocuments({
      lawyerReviewStatus: DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP,
    }),
  ]);

  return {
    debtCasesAwaitingReview,
    debtCasesReturned,
    buildingsPendingVerification,
    casesApprovedForLetterPrep,
  };
}

export async function listAdminAttentionItems(
  context: AuthenticatedContext,
): Promise<AdminAttentionItem[]> {
  assertLawyerAdminOrganization(context);
  await connectMongo();

  const items: AdminAttentionItem[] = [];

  const pendingUsers = await User.find({
    role: { $in: [UserRole.BUILDING_REP, UserRole.MANAGEMENT_COMPANY] },
    accountStatus: AccountStatus.PENDING_APPROVAL,
  })
    .sort({ createdAt: -1 })
    .limit(4)
    .select("fullName email role")
    .lean();

  for (const user of pendingUsers) {
    items.push({
      id: `user-${user._id.toString()}`,
      kind: "user_pending",
      titleHe: user.fullName,
      metaHe: user.email ?? "",
      statusHe: "ממתין לאישור חשבון",
      href: `/app/admin/users/${user._id.toString()}`,
    });
  }

  const reviewCases = await DebtCase.find({
    workflowStatus: DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW,
    lawyerReviewStatus: DebtCaseLawyerReviewStatus.PENDING,
  })
    .sort({ submittedAt: -1, updatedAt: -1 })
    .limit(4)
    .select("debtCaseId apartmentNumberDisplay buildingId submittedAt")
    .lean();

  const buildingIds = [...new Set(reviewCases.map((row) => row.buildingId))];
  const buildingRows = await Building.find({ buildingId: { $in: buildingIds } })
    .select("buildingId displayName")
    .lean();
  const buildingNames = new Map(buildingRows.map((row) => [row.buildingId, row.displayName]));

  for (const row of reviewCases) {
    items.push({
      id: `case-${row.debtCaseId}`,
      kind: "debt_case_review",
      titleHe: `תיק · דירה ${row.apartmentNumberDisplay ?? "—"}`,
      metaHe: buildingNames.get(row.buildingId) ?? "בניין",
      statusHe: "ממתין לבדיקת עורך דין",
      href: `/app/admin/debt-cases/${row.debtCaseId}`,
    });
  }

  const unverifiedBuildings = await Building.find({
    organizationalStatus: BuildingOrganizationalStatus.ACTIVE,
    lawyerVerificationStatus: { $ne: LawyerVerificationStatus.VERIFIED },
  })
    .sort({ updatedAt: -1 })
    .limit(4)
    .select("buildingId displayName address.city lawyerVerificationStatus")
    .lean();

  for (const row of unverifiedBuildings) {
    items.push({
      id: `building-${row.buildingId}`,
      kind: "building_verification",
      titleHe: row.displayName,
      metaHe: row.address?.city ?? "",
      statusHe: "טרם אומת משפטית",
      href: `/app/admin/buildings/${row.buildingId}`,
    });
  }

  return items.slice(0, ATTENTION_LIMIT);
}
