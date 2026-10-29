"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { OrganizationError } from "@/modules/buildings/domain/organization-errors";
import { resolveAuditCorrelationId } from "@/modules/audit/services/audit-correlation";
import {
  approveRegisteredAccount,
  reconsiderRejectedAccount,
  rejectRegisteredAccount,
} from "@/modules/organizations/services/account-approval.service";
import {
  ADMIN_USER_ONBOARDING_BIND_SUCCESS_ACTIVE_HE,
  ADMIN_USER_ONBOARDING_BIND_SUCCESS_HE,
} from "@/modules/users/presentation/admin-user-onboarding.he";
import { mapOrganizationErrorToAdminUserHe } from "@/modules/users/presentation/admin-user-messages.he";
import { bindUserPendingOnboardingBuilding } from "@/modules/users/services/admin-user-onboarding.service";
import { bindUserPendingOnboardingBuildingSchema } from "@/modules/users/validation/admin-user-onboarding.schema";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { User } from "@/modules/users/infra/user.model";
import { requireLawyerAdminPortal } from "@/shared/auth/require-access";
import { assertSameOriginMutationRequest } from "@/shared/security/request-origin";
import { connectMongo } from "@/shared/db/connect";

const ADMIN_USERS_PATH = "/app/admin/users";

const targetUserIdSchema = z.object({
  targetUserId: z.string().regex(/^[a-f0-9]{24}$/i, "מזהה משתמש לא תקין"),
});

export type AdminUserActionState = {
  ok: boolean;
  message?: string;
  targetUserId?: string;
};

async function guardAdminMutation() {
  await assertSameOriginMutationRequest();
  return requireLawyerAdminPortal();
}

function revalidateAdminUserViews(userId: string) {
  revalidatePath(ADMIN_USERS_PATH);
  revalidatePath(`${ADMIN_USERS_PATH}/${userId}`);
}

function handleError(error: unknown): AdminUserActionState {
  if (error instanceof OrganizationError) {
    return { ok: false, message: mapOrganizationErrorToAdminUserHe(error.code) };
  }
  return { ok: false, message: "לא ניתן להשלים את הפעולה." };
}

export async function approveRegisteredUserAction(
  _prev: AdminUserActionState,
  formData: FormData,
): Promise<AdminUserActionState> {
  try {
    const context = await guardAdminMutation();
    const parsed = targetUserIdSchema.safeParse({
      targetUserId: formData.get("targetUserId"),
    });
    if (!parsed.success) {
      return { ok: false, message: "נתונים לא תקינים." };
    }

    const correlationId = await resolveAuditCorrelationId();
    await approveRegisteredAccount({
      context,
      targetUserId: parsed.data.targetUserId,
      correlationId,
    });
    revalidateAdminUserViews(parsed.data.targetUserId);
    return { ok: true, message: "החשבון אושר." };
  } catch (error) {
    return handleError(error);
  }
}

export async function rejectRegisteredUserAction(
  _prev: AdminUserActionState,
  formData: FormData,
): Promise<AdminUserActionState> {
  try {
    const context = await guardAdminMutation();
    const parsed = targetUserIdSchema.safeParse({
      targetUserId: formData.get("targetUserId"),
    });
    if (!parsed.success) {
      return { ok: false, message: "נתונים לא תקינים." };
    }

    const correlationId = await resolveAuditCorrelationId();
    await rejectRegisteredAccount({
      context,
      targetUserId: parsed.data.targetUserId,
      correlationId,
    });
    revalidateAdminUserViews(parsed.data.targetUserId);
    return { ok: true, message: "הבקשה נדחתה." };
  } catch (error) {
    return handleError(error);
  }
}

export async function reconsiderRejectedUserAction(
  _prev: AdminUserActionState,
  formData: FormData,
): Promise<AdminUserActionState> {
  try {
    const context = await guardAdminMutation();
    const parsed = targetUserIdSchema.safeParse({
      targetUserId: formData.get("targetUserId"),
    });
    if (!parsed.success) {
      return { ok: false, message: "נתונים לא תקינים." };
    }

    const correlationId = await resolveAuditCorrelationId();
    await reconsiderRejectedAccount({
      context,
      targetUserId: parsed.data.targetUserId,
      correlationId,
    });
    revalidateAdminUserViews(parsed.data.targetUserId);
    return { ok: true, message: "החשבון אושר לאחר שקילה מחדש." };
  } catch (error) {
    return handleError(error);
  }
}

export async function bindUserPendingOnboardingBuildingAction(
  _prev: AdminUserActionState,
  formData: FormData,
): Promise<AdminUserActionState> {
  try {
    const context = await guardAdminMutation();
    const payload = bindUserPendingOnboardingBuildingSchema.parse({
      targetUserId: formData.get("targetUserId"),
      onboardingRequestId: formData.get("onboardingRequestId"),
      buildingId: formData.get("buildingId"),
      expectedOnboardingStatus: formData.get("expectedOnboardingStatus"),
      expectedBoundBuildingId: formData.get("expectedBoundBuildingId") ?? "",
    });

    const correlationId = await resolveAuditCorrelationId();
    const result = await bindUserPendingOnboardingBuilding({
      context,
      payload,
      correlationId,
    });

    await connectMongo();
    const user = await User.findById(payload.targetUserId).select("accountStatus").lean();

    revalidateAdminUserViews(payload.targetUserId);
    revalidatePath("/app/admin/buildings");
    revalidatePath(`/app/admin/buildings/${payload.buildingId}`);

    if (!result.onboardingChanged && !result.operationalAssignmentApplied) {
      return {
        ok: true,
        targetUserId: payload.targetUserId,
        message: "לא בוצע שינוי — הבניין כבר משויך לבקשה זו.",
      };
    }

    const message =
      user?.accountStatus === AccountStatus.ACTIVE && result.operationalAssignmentApplied
        ? ADMIN_USER_ONBOARDING_BIND_SUCCESS_ACTIVE_HE
        : ADMIN_USER_ONBOARDING_BIND_SUCCESS_HE;

    return {
      ok: true,
      targetUserId: payload.targetUserId,
      message,
    };
  } catch (error) {
    return handleError(error);
  }
}
