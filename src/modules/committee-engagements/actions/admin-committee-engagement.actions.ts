"use server";

import { revalidatePath } from "next/cache";

import {
  captureOrReplaceProposedCommitteeTerms,
} from "@/modules/committee-engagements/services/committee-engagement.service";
import { CommitteeEngagementError } from "@/modules/committee-engagements/domain/engagement-errors";
import { mapCommitteeEngagementErrorToHebrew } from "@/modules/committee-engagements/presentation/engagement-messages.he";
import { resolveAuditCorrelationId } from "@/modules/audit/services/audit-correlation";
import { requireLawyerAdminPortal } from "@/shared/auth/require-access";
import { assertSameOriginMutationRequest } from "@/shared/security/request-origin";

const ADMIN_BUILDINGS_PATH = "/app/admin/buildings";

export type CommitteeEngagementActionState = {
  ok: boolean;
  message?: string;
};

function handleError(error: unknown): CommitteeEngagementActionState {
  if (error instanceof CommitteeEngagementError) {
    return {
      ok: false,
      message: mapCommitteeEngagementErrorToHebrew(error.code),
    };
  }
  return { ok: false, message: "לא ניתן להשלים את הפעולה." };
}

export async function captureProposedCommitteeTermsFormAction(
  _prev: CommitteeEngagementActionState,
  formData: FormData,
): Promise<CommitteeEngagementActionState> {
  try {
    await assertSameOriginMutationRequest();
    const context = await requireLawyerAdminPortal();
    const buildingId = String(formData.get("buildingId") ?? "").trim();
    if (!buildingId) {
      return { ok: false, message: "מזהה בניין חסר." };
    }

    const correlationId = await resolveAuditCorrelationId();
    const result = await captureOrReplaceProposedCommitteeTerms({
      context,
      buildingId,
      correlationId,
    });

    revalidatePath(ADMIN_BUILDINGS_PATH);
    revalidatePath(`${ADMIN_BUILDINGS_PATH}/${buildingId}`);

    return {
      ok: true,
      message: result.replaced
        ? "טיוטת התנאים המוצעים עודכנה (טרם חתימה)."
        : "טיוטת תנאים מוצעים נשמרה (טרם חתימה).",
    };
  } catch (error) {
    if (error instanceof CommitteeEngagementError) {
      return handleError(error);
    }
    return handleError(error);
  }
}
