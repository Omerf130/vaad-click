import { notFound } from "next/navigation";

import { AdminPageFrame } from "@/modules/admin/components/AdminPageFrame";
import { DebtCaseError, DebtCaseErrorCode } from "@/modules/debt-cases/domain/debt-case-errors";
import { loadLawyerDebtCaseDetailBundle } from "@/modules/debt-cases/services/lawyer-debt-case-query.service";
import { LawyerDebtCaseReviewDetail } from "@/modules/debt-cases/ui/lawyer/LawyerDebtCaseReviewDetail";
import { requireLawyerAdminPortal } from "@/shared/auth/require-access";

type PageProps = {
  params: Promise<{ debtCaseId: string }>;
};

async function loadBundle(debtCaseId: string) {
  const context = await requireLawyerAdminPortal();
  try {
    return await loadLawyerDebtCaseDetailBundle({ context, debtCaseId });
  } catch (error) {
    if (error instanceof DebtCaseError && error.code === DebtCaseErrorCode.NOT_FOUND) {
      notFound();
    }
    throw error;
  }
}

export default async function AdminDebtCaseReviewDetailPage({ params }: PageProps) {
  const { debtCaseId } = await params;
  const bundle = await loadBundle(debtCaseId);
  const title = `בדיקת תיק · דירה ${bundle.record.apartmentNumberDisplay || "—"}`;

  return (
    <AdminPageFrame title={title} subtitle={bundle.buildingDisplayName}>
      <LawyerDebtCaseReviewDetail bundle={bundle} />
    </AdminPageFrame>
  );
}
