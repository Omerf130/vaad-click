import { redirect } from "next/navigation";

import { getDebtCase } from "@/modules/debt-cases/services/debt-case.service";
import { debtCaseRecordToFormDefaults } from "@/modules/debt-cases/presentation/debt-case-form.defaults";
import { OperatorDebtCaseWorkspace } from "@/modules/debt-cases/ui/OperatorDebtCaseWorkspace";
import {
  getDocumentStorageUiState,
  listDebtCaseDocumentAssetsForCasePortal,
} from "@/modules/document-assets/services/document-asset.service";
import { OPERATOR_PORTAL_ROUTES } from "@/modules/portal/presentation/operator-portal-nav";
import {
  loadLatestOperatorReturnFeedbackHe,
  loadOperatorDebtCaseActivity,
} from "@/modules/portal/services/operator-debt-case-activity.service";
import { OperatorPortalPageFrame } from "@/modules/portal/ui/OperatorPortalPageFrame";
import { requireOperatorBuildingPortalAccess } from "@/shared/auth/require-operator-building-access";

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
  const [activity, returnFeedbackHe, documents, storageState] = await Promise.all([
    loadOperatorDebtCaseActivity({ context, debtCaseId }),
    loadLatestOperatorReturnFeedbackHe({ context, debtCaseId }),
    listDebtCaseDocumentAssetsForCasePortal({ context, debtCaseId }),
    Promise.resolve(getDocumentStorageUiState()),
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
      <OperatorDebtCaseWorkspace
        buildingId={buildingId}
        buildingDisplayName={building.displayName}
        record={record}
        defaults={defaults}
        activity={activity}
        returnFeedbackHe={returnFeedbackHe}
        documents={documents}
        storageState={storageState}
      />
    </OperatorPortalPageFrame>
  );
}
