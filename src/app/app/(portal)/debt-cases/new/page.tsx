import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button/ButtonLink";
import { DebtCaseIntakeClientForm } from "@/modules/debt-cases/ui/DebtCaseIntakeClientForm";
import { loadIntakePortalContext } from "@/modules/debt-cases/services/debt-case-intake.service";
import { OperatorPortalPageFrame } from "@/modules/portal/ui/OperatorPortalPageFrame";
import { getDocumentStorageUiState } from "@/modules/document-assets/services/document-asset.service";
import { requireOperationalPortalAccess } from "@/shared/auth/require-access";
import { UserRole } from "@/modules/users/domain/user-role";
import styles from "@/modules/portal/ui/OperatorPortalDashboard.module.scss";

export default async function NewDebtCaseIntakePage() {
  const context = await requireOperationalPortalAccess();
  if (
    context.user.role !== UserRole.BUILDING_REP &&
    context.user.role !== UserRole.MANAGEMENT_COMPANY
  ) {
    return (
      <OperatorPortalPageFrame title="פתיחת תיק חייב חדש">
        <p>אין הרשאה לפתיחת תיק.</p>
      </OperatorPortalPageFrame>
    );
  }

  const portalContext = await loadIntakePortalContext(context);
  const storageState = getDocumentStorageUiState();

  return (
    <OperatorPortalPageFrame
      title="פתיחת תיק חייב חדש"
      subtitle="השלימו פרטי בניין, חייב וחוב — ניתן לשמור טיוטה ולהמשיך מאוחר יותר."
      breadcrumbs={[
        { label: "לוח בקרה", href: "/app" },
        { label: "תיק חייב חדש", href: "/app/debt-cases/new" },
      ]}
    >
      <p className={styles.sectionHint}>
        <Link href="/app">חזרה ללוח הבקרה</Link>
      </p>
      <DebtCaseIntakeClientForm
        role={context.user.role}
        repAssignedBuildingId={portalContext.repAssignedBuildingId}
        accessibleBuildings={portalContext.accessibleBuildings}
        initialRevision={0}
        storageState={storageState}
      />
      <p className={styles.sectionHint}>
        <ButtonLink href="/app/debt-cases/intake" variant="ghost">
          טיוטות שמורות
        </ButtonLink>
      </p>
    </OperatorPortalPageFrame>
  );
}
