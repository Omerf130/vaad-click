import { resolveBuildingAssociationReviewAction } from "@/modules/debt-cases/actions/admin-building-association.actions";
import { getBuildingAssociationReview } from "@/modules/debt-cases/services/building-association-review.service";
import { requireLawyerAdminPortal } from "@/shared/auth/require-access";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ reviewId: string }> };

export default async function BuildingAssociationReviewPage({ params }: Props) {
  const { reviewId } = await params;
  const context = await requireLawyerAdminPortal();
  let review;
  try {
    review = await getBuildingAssociationReview({ context, reviewId });
  } catch {
    notFound();
  }

  const snapshot = review.buildingSnapshot;

  return (
    <main style={{ padding: "1.5rem", maxWidth: 720 }}>
      <h1>בדיקת שיוך בניין</h1>
      <p>מזהה בקשה: {review.reviewId}</p>
      <p>סטטוס: {review.status}</p>
      <section aria-labelledby="submitted-building-heading">
        <h2 id="submitted-building-heading">פרטי בניין שהוגשו</h2>
        <p>
          {snapshot.displayName} · {snapshot.city}, {snapshot.street} {snapshot.houseNumber}
        </p>
      </section>
      {review.status === "open" ? (
        <form action={resolveBuildingAssociationReviewAction}>
          <input type="hidden" name="reviewId" value={reviewId} />
          <input type="hidden" name="mode" value="provision_for_submitter" />
          <button type="submit">יצירת בניין לפי ההגשה ופתיחת תיק</button>
        </form>
      ) : (
        <p>
          נפתר: בניין {review.resolvedBuildingId ?? "—"} · תיק {review.resolvedDebtCaseId ?? "—"}
        </p>
      )}
    </main>
  );
}
