import "server-only";

import { Types } from "mongoose";

import {
  assignBuildingRepresentative,
  linkBuildingToManagementCompany,
} from "@/modules/buildings/services/building-assignment.service";
import {
  OrganizationError,
  OrganizationErrorCode,
} from "@/modules/buildings/domain/organization-errors";
import { BuildingOrganizationalStatus } from "@/modules/buildings/domain/building-status";
import { Building } from "@/modules/buildings/infra/building.model";
import { PendingBuildingOnboardingStatus } from "@/modules/debt-cases/domain/pending-building-onboarding-status";
import { DebtCaseError, DebtCaseErrorCode } from "@/modules/debt-cases/domain/debt-case-errors";
import { PendingBuildingOnboardingRequest } from "@/modules/debt-cases/infra/pending-building-onboarding-request.model";
import { bindPendingOnboardingToBuilding } from "@/modules/debt-cases/services/pending-building-onboarding.service";
import { ManagementCompany } from "@/modules/management-companies/infra/management-company.model";
import { assertLawyerAdminOrganization } from "@/modules/organizations/services/assert-lawyer-admin";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import { User } from "@/modules/users/infra/user.model";
import type { BindUserPendingOnboardingBuildingInput } from "@/modules/users/validation/admin-user-onboarding.schema";
import type { AdminUserOnboardingBuildingSearchParams } from "@/modules/users/validation/admin-user-onboarding.schema";
import { ADMIN_BUILDING_LIST_PAGE_SIZE } from "@/modules/buildings/validation/admin-building-list.schema";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { isWellFormedBuildingPublicId } from "@/shared/auth/building-access/building-public-id";
import { connectMongo } from "@/shared/db/connect";

export type AdminUserOnboardingRequestView = {
  onboardingRequestId: string;
  status: PendingBuildingOnboardingStatus;
  boundBuilding: {
    buildingId: string;
    displayName: string;
    city: string;
    street: string;
    houseNumber: string;
  } | null;
  boundAt: string | null;
};

export type AdminUserOnboardingBuildingOption = {
  buildingId: string;
  displayName: string;
  city: string;
  street: string;
  houseNumber: string;
  representativeName: string | null;
  managementCompanyName: string | null;
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function loadAdminUserOnboardingRequest(
  userId: string,
): Promise<AdminUserOnboardingRequestView | null> {
  if (!Types.ObjectId.isValid(userId)) {
    return null;
  }
  await connectMongo();
  const request = await PendingBuildingOnboardingRequest.findOne({
    userId: new Types.ObjectId(userId),
    status: { $in: [PendingBuildingOnboardingStatus.OPEN, PendingBuildingOnboardingStatus.BOUND] },
  }).lean();

  if (!request) {
    return null;
  }

  let boundBuilding: AdminUserOnboardingRequestView["boundBuilding"] = null;
  if (request.buildingId) {
    const building = await Building.findOne({
      buildingId: request.buildingId,
      organizationalStatus: BuildingOrganizationalStatus.ACTIVE,
    })
      .select("buildingId displayName address")
      .lean();
    if (building) {
      boundBuilding = {
        buildingId: building.buildingId,
        displayName: building.displayName,
        city: building.address.city,
        street: building.address.street,
        houseNumber: building.address.houseNumber,
      };
    }
  }

  return {
    onboardingRequestId: request.onboardingRequestId,
    status: request.status as PendingBuildingOnboardingStatus,
    boundBuilding,
    boundAt: request.boundAt ? request.boundAt.toISOString() : null,
  };
}

export async function listBuildingsForUserOnboardingAssignment(input: {
  context: AuthenticatedContext;
  targetUserId: string;
  params: AdminUserOnboardingBuildingSearchParams;
}): Promise<{
  items: AdminUserOnboardingBuildingOption[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  assertLawyerAdminOrganization(input.context);
  if (!Types.ObjectId.isValid(input.targetUserId)) {
    return { items: [], total: 0, page: 1, pageSize: ADMIN_BUILDING_LIST_PAGE_SIZE, totalPages: 1 };
  }

  await connectMongo();
  const user = await User.findById(input.targetUserId).lean();
  if (!user || (user.role !== UserRole.BUILDING_REP && user.role !== UserRole.MANAGEMENT_COMPANY)) {
    return { items: [], total: 0, page: 1, pageSize: ADMIN_BUILDING_LIST_PAGE_SIZE, totalPages: 1 };
  }

  const andClauses: Record<string, unknown>[] = [
    { organizationalStatus: BuildingOrganizationalStatus.ACTIVE },
  ];

  if (input.params.q) {
    const pattern = escapeRegex(input.params.q.trim());
    andClauses.push({
      $or: [
        { displayName: { $regex: pattern, $options: "i" } },
        { "address.city": { $regex: pattern, $options: "i" } },
        { "address.street": { $regex: pattern, $options: "i" } },
        { "address.houseNumber": { $regex: pattern, $options: "i" } },
      ],
    });
  }

  if (user.role === UserRole.BUILDING_REP) {
    andClauses.push({
      $or: [
        { designatedRepresentativeUserId: null },
        { designatedRepresentativeUserId: { $exists: false } },
        { designatedRepresentativeUserId: user._id },
      ],
    });
  } else if (user.role === UserRole.MANAGEMENT_COMPANY) {
    if (!user.managementCompanyId) {
      if (user.accountStatus === AccountStatus.ACTIVE) {
        return { items: [], total: 0, page: 1, pageSize: ADMIN_BUILDING_LIST_PAGE_SIZE, totalPages: 1 };
      }
    } else {
      andClauses.push({
        $or: [
          { managementCompanyId: null },
          { managementCompanyId: { $exists: false } },
          { managementCompanyId: user.managementCompanyId },
        ],
      });
    }
  }

  const filter: Record<string, unknown> = { $and: andClauses };

  const page = input.params.page;
  const skip = (page - 1) * ADMIN_BUILDING_LIST_PAGE_SIZE;

  const [rows, total] = await Promise.all([
    Building.find(filter)
      .sort({ displayName: 1 })
      .skip(skip)
      .limit(ADMIN_BUILDING_LIST_PAGE_SIZE)
      .populate("designatedRepresentativeUserId", "fullName")
      .populate("managementCompanyId", "displayName")
      .lean(),
    Building.countDocuments(filter),
  ]);

  const items: AdminUserOnboardingBuildingOption[] = rows.map((row) => {
    const rep = row.designatedRepresentativeUserId as { fullName?: string } | null;
    const company = row.managementCompanyId as { displayName?: string } | null;
    return {
      buildingId: row.buildingId,
      displayName: row.displayName,
      city: row.address.city,
      street: row.address.street,
      houseNumber: row.address.houseNumber,
      representativeName: rep?.fullName ?? null,
      managementCompanyName: company?.displayName ?? null,
    };
  });

  return {
    items,
    total,
    page,
    pageSize: ADMIN_BUILDING_LIST_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / ADMIN_BUILDING_LIST_PAGE_SIZE)),
  };
}

async function assertBuildingRepAssignmentAllowed(input: {
  userObjectId: Types.ObjectId;
  buildingId: string;
}): Promise<void> {
  const existingAssignment = await Building.findOne({
    designatedRepresentativeUserId: input.userObjectId,
    organizationalStatus: BuildingOrganizationalStatus.ACTIVE,
    buildingId: { $ne: input.buildingId },
  }).lean();
  if (existingAssignment) {
    throw new OrganizationError(
      OrganizationErrorCode.REP_ALREADY_ASSIGNED,
      "Representative already assigned elsewhere",
    );
  }

  const building = await Building.findOne({
    buildingId: input.buildingId,
    organizationalStatus: BuildingOrganizationalStatus.ACTIVE,
  }).lean();
  if (!building) {
    throw new OrganizationError(OrganizationErrorCode.NOT_FOUND, "Building not found");
  }

  const currentRepId = building.designatedRepresentativeUserId?.toString();
  if (currentRepId && currentRepId !== input.userObjectId.toString()) {
    throw new OrganizationError(
      OrganizationErrorCode.BUILDING_ALREADY_HAS_REP,
      "Building already has another representative",
    );
  }
}

async function applyActiveOperationalAssignment(input: {
  context: AuthenticatedContext;
  user: { _id: Types.ObjectId; role: UserRole; managementCompanyId?: Types.ObjectId | null };
  buildingId: string;
  correlationId?: string;
}): Promise<boolean> {
  if (input.user.role === UserRole.BUILDING_REP) {
    await assertBuildingRepAssignmentAllowed({
      userObjectId: input.user._id,
      buildingId: input.buildingId,
    });

    const building = await Building.findOne({ buildingId: input.buildingId }).lean();
    if (building?.designatedRepresentativeUserId?.equals(input.user._id)) {
      return false;
    }

    await assignBuildingRepresentative({
      context: input.context,
      buildingId: input.buildingId,
      representativeUserId: input.user._id.toString(),
      correlationId: input.correlationId,
    });
    return true;
  }

  if (input.user.role === UserRole.MANAGEMENT_COMPANY) {
    if (!input.user.managementCompanyId) {
      throw new OrganizationError(
        OrganizationErrorCode.VALIDATION,
        "Management company user has no company record",
      );
    }
    const company = await ManagementCompany.findById(input.user.managementCompanyId).lean();
    if (!company) {
      throw new OrganizationError(OrganizationErrorCode.NOT_FOUND, "Management company not found");
    }

    const building = await Building.findOne({
      buildingId: input.buildingId,
      organizationalStatus: BuildingOrganizationalStatus.ACTIVE,
    }).lean();
    if (!building) {
      throw new OrganizationError(OrganizationErrorCode.NOT_FOUND, "Building not found");
    }

    if (building.managementCompanyId?.equals(input.user.managementCompanyId)) {
      return false;
    }

    if (
      building.managementCompanyId &&
      !building.managementCompanyId.equals(input.user.managementCompanyId)
    ) {
      throw new OrganizationError(
        OrganizationErrorCode.CONFLICT,
        "Building linked to another management company",
      );
    }

    await linkBuildingToManagementCompany({
      context: input.context,
      buildingId: input.buildingId,
      managementCompanyId: company.managementCompanyId,
      correlationId: input.correlationId,
    });
    return true;
  }

  return false;
}

export type BindUserPendingOnboardingResult = {
  onboardingChanged: boolean;
  operationalAssignmentApplied: boolean;
};

export async function bindUserPendingOnboardingBuilding(input: {
  context: AuthenticatedContext;
  payload: BindUserPendingOnboardingBuildingInput;
  correlationId?: string;
}): Promise<BindUserPendingOnboardingResult> {
  assertLawyerAdminOrganization(input.context);
  if (input.context.user.id === input.payload.targetUserId) {
    throw new OrganizationError(OrganizationErrorCode.FORBIDDEN, "Self-assignment forbidden");
  }

  if (!isWellFormedBuildingPublicId(input.payload.buildingId)) {
    throw new OrganizationError(OrganizationErrorCode.VALIDATION, "Invalid building id");
  }

  await connectMongo();
  const user = await User.findById(input.payload.targetUserId).lean();
  if (!user?.email) {
    throw new OrganizationError(OrganizationErrorCode.NOT_FOUND, "User not found");
  }
  if (user.role !== UserRole.BUILDING_REP && user.role !== UserRole.MANAGEMENT_COMPANY) {
    throw new OrganizationError(OrganizationErrorCode.INVALID_ROLE, "Invalid user role");
  }

  if (user.role === UserRole.BUILDING_REP) {
    await assertBuildingRepAssignmentAllowed({
      userObjectId: user._id,
      buildingId: input.payload.buildingId,
    });
  }

  let onboardingChanged = false;
  try {
    const bindResult = await bindPendingOnboardingToBuilding({
      context: input.context,
      targetUserId: input.payload.targetUserId,
      onboardingRequestId: input.payload.onboardingRequestId,
      buildingId: input.payload.buildingId,
      expectedOnboardingStatus: input.payload.expectedOnboardingStatus,
      expectedBoundBuildingId: input.payload.expectedBoundBuildingId ?? null,
      correlationId: input.correlationId,
    });
    onboardingChanged = bindResult.changed;
  } catch (error) {
    if (error instanceof DebtCaseError) {
      throw mapDebtCaseErrorToOrganization(error);
    }
    throw error;
  }

  let operationalAssignmentApplied = false;
  if (user.accountStatus === AccountStatus.ACTIVE) {
    operationalAssignmentApplied = await applyActiveOperationalAssignment({
      context: input.context,
      user: {
        _id: user._id,
        role: user.role as UserRole,
        managementCompanyId: user.managementCompanyId,
      },
      buildingId: input.payload.buildingId,
      correlationId: input.correlationId,
    });
  }

  return { onboardingChanged, operationalAssignmentApplied };
}

function mapDebtCaseErrorToOrganization(error: DebtCaseError): OrganizationError {
  if (
    error.message.includes("concurrent") ||
    error.message.includes("state changed elsewhere")
  ) {
    return new OrganizationError(OrganizationErrorCode.CONFLICT, error.message);
  }
  switch (error.code) {
    case DebtCaseErrorCode.NOT_FOUND:
      return new OrganizationError(OrganizationErrorCode.NOT_FOUND, error.message);
    case DebtCaseErrorCode.VALIDATION:
      return new OrganizationError(OrganizationErrorCode.VALIDATION, error.message);
    case DebtCaseErrorCode.FORBIDDEN:
      return new OrganizationError(OrganizationErrorCode.FORBIDDEN, error.message);
    case DebtCaseErrorCode.AUDIT_PERSISTENCE:
      return new OrganizationError(OrganizationErrorCode.AUDIT_PERSISTENCE, error.message);
    default:
      return new OrganizationError(OrganizationErrorCode.CONFLICT, error.message);
  }
}
