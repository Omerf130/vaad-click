import { redirect } from "next/navigation";

import { getDebtCase } from "@/modules/debt-cases/services/debt-case.service";
import { debtCaseRecordToFormDefaults } from "@/modules/debt-cases/presentation/debt-case-form.defaults";
import { DebtCaseOperatorForm } from "@/modules/debt-cases/ui/DebtCaseOperatorForm";
import { OPERATOR_PORTAL_ROUTES } from "@/modules/portal/presentation/operator-portal-nav";
import {
  loadLatestOperatorReturnFeedbackHe,
  loadOperatorDebtCaseActivity,
} from "@/modules/portal/services/operator-debt-case-activity.service";
import { OperatorCaseActivityPanel } from "@/modules/portal/ui/OperatorCaseActivityPanel";
import { OperatorCaseLifecyclePanel } from "@/modules/portal/ui/OperatorCaseLifecyclePanel";
import { OperatorPortalPageFrame } from "@/modules/portal/ui/OperatorPortalPageFrame";
import { requireOperatorBuildingPortalAccess } from "@/shared/auth/require-operator-building-access";
import styles from "@/modules/portal/ui/OperatorPortalDashboard.module.scss";

type PageProps = {
  params: Promise<{ buildingId: string; debtCaseId: string }>;
};

export default async function PortalDebtCaseDetailPage({ params }: PageProps) {
  const { buildingId, debtCaseId } = await params;
  const { context, building } = await requireOperatorBuildingPortalAccess(buildingId);

  const record = await getDebtCase({ context, debtCaseId });
  if (record.buildingId !== buildingId) {
    redirect("/forbidden?reason=building");
  }
  const [activity, returnFeedbackHe] = await Promise.all([
    loadOperatorDebtCaseActivity({ context, debtCaseId }),
    loadLatestOperatorReturnFeedbackHe({ context, debtCaseId }),
  ]);

  const defaults = debtCaseRecordToFormDefaults(record);
  const caseTitle = `תיק חוב · דירה ${record.apartmentNumberDisplay || "—"}`;

  return (
    <OperatorPortalPageFrame
      title={caseTitle}
      subtitle={building.displayName}
      breadcrumbs={[
        { label: "לוח בקרה", href: OPERATOR_PORTAL_ROUTES.home },
        { label: "בניינים", href: OPERATOR_PORTAL_ROUTES.buildings },
        { label: building.displayName, href: `/app/buildings/${buildingId}` },
        { label: "תיק חוב" },
      ]}
    >
      <div className={styles.caseDetailLayout}>
        <OperatorCaseLifecyclePanel record={record} />
        <OperatorCaseActivityPanel activity={activity} returnFeedbackHe={returnFeedbackHe} />
        <DebtCaseOperatorForm buildingId={buildingId} record={record} defaults={defaults} />
      </div>
    </OperatorPortalPageFrame>
  );
}
