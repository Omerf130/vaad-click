"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { resolveBuildingAssociationReview } from "@/modules/debt-cases/services/building-association-review.service";
import { resolveAuditCorrelationId } from "@/modules/audit/services/audit-correlation";
import { requireLawyerAdminPortal } from "@/shared/auth/require-access";

export async function resolveBuildingAssociationReviewAction(formData: FormData) {
  const context = await requireLawyerAdminPortal();
  const reviewId = String(formData.get("reviewId") ?? "");
  const mode = String(formData.get("mode") ?? "provision_for_submitter");
  const correlationId = await resolveAuditCorrelationId();

  const result = await resolveBuildingAssociationReview({
    context,
    reviewId,
    resolution:
      mode === "link_existing"
        ? {
            mode: "link_existing",
            buildingId: String(formData.get("buildingId") ?? ""),
          }
        : { mode: "provision_for_submitter" },
    correlationId,
  });

  revalidatePath(`/app/admin/building-association-reviews/${reviewId}`);
  redirect(`/app/admin/debt-cases/${result.debtCaseId}`);
}
