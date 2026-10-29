import { loadBuildingLegalDocumentsPortalView } from "@/modules/building-legal-documents/services/building-legal-document.service";
import { BuildingLegalDocumentsPortalPanel } from "@/modules/building-legal-documents/ui/BuildingLegalDocumentsPortalPanel";
import { listDebtCasesForBuilding } from "@/modules/debt-cases/services/debt-case.service";
import { BuildingDebtCasesPanel } from "@/modules/debt-cases/ui/BuildingDebtCasesPanel";
import { OPERATOR_PORTAL_ROUTES } from "@/modules/portal/presentation/operator-portal-nav";
import { OperatorPortalPageFrame } from "@/modules/portal/ui/OperatorPortalPageFrame";
import { UserRole } from "@/modules/users/domain/user-role";
import { requireBuildingPortalAccess } from "@/shared/auth/require-building-access";
import debtStyles from "@/modules/debt-cases/ui/DebtCases.module.scss";
import styles from "@/modules/portal/ui/OperatorPortalDashboard.module.scss";

type PageProps = {
  params: Promise<{ buildingId: string }>;
};

export default async function PortalBuildingDetailPage({ params }: PageProps) {
  const { buildingId } = await params;
  const { context, building } = await requireBuildingPortalAccess(buildingId);

  const isOperator =
    context.user.role === UserRole.BUILDING_REP ||
    context.user.role === UserRole.MANAGEMENT_COMPANY;

  const [debtCases, legalDocumentCategories] = await Promise.all([
    isOperator ? listDebtCasesForBuilding({ context, buildingId }) : Promise.resolve([]),
    isOperator
      ? loadBuildingLegalDocumentsPortalView({ context, buildingId })
      : Promise.resolve([]),
  ]);

  const subtitle = isOperator
    ? "ניהול תיקי חוב — שמירת טיוטות והגשה לבדיקת עורך דין (לא שליחת מכתב)."
    : "תצוגת בניין.";

  return (
    <OperatorPortalPageFrame
      title={building.displayName}
      subtitle={subtitle}
      breadcrumbs={[
        { label: "לוח בקרה", href: OPERATOR_PORTAL_ROUTES.home },
        { label: "בניינים", href: OPERATOR_PORTAL_ROUTES.buildings },
        { label: building.displayName },
      ]}
    >
      {isOperator ? (
        <div className={`${styles.buildingDetailLayout} ${debtStyles.section}`}>
          <BuildingLegalDocumentsPortalPanel categories={legalDocumentCategories} />
          <BuildingDebtCasesPanel buildingId={buildingId} cases={debtCases} />
        </div>
      ) : (
        <p className={styles.sectionHint}>אין תוכן תפעולי לתפקיד זה.</p>
      )}
    </OperatorPortalPageFrame>
  );
}
