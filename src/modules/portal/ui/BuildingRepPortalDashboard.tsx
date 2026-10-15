import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button/ButtonLink";
import { createDebtCaseDraftFormAction } from "@/modules/debt-cases/actions/portal-debt-case.actions";
import { BuildingDebtCasesCreateButton } from "@/modules/debt-cases/ui/BuildingDebtCasesCreateButton";
import { getPortalPlatformModules } from "@/modules/portal/presentation/portal-platform-modules";
import type { BuildingRepPortalDashboard as BuildingRepDashboardData } from "@/modules/portal/services/operator-portal-dashboard.service";
import { OperatorDashboardActionItems } from "@/modules/portal/ui/OperatorDashboardActionItems";
import { OperatorDashboardMetrics } from "@/modules/portal/ui/OperatorDashboardMetrics";
import { PortalPlatformModulesGrid } from "@/modules/portal/ui/PortalPlatformModulesGrid";
import { UserRole } from "@/modules/users/domain/user-role";
import styles from "@/modules/portal/ui/OperatorPortalDashboard.module.scss";

type Props = {
  userFullName: string;
  data: BuildingRepDashboardData;
};

export function BuildingRepPortalDashboard({ userFullName, data }: Props) {
  const { building, metrics, actionItems } = data;
  const addressLine = [building.displayName, building.city].filter(Boolean).join(" · ");
  const modules = getPortalPlatformModules({
    role: UserRole.BUILDING_REP,
    primaryBuildingId: building.buildingId,
  });

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <h1 className={styles.heroTitle}>שלום, {userFullName}</h1>
        <p className={styles.heroMeta}>נציגות בית משותף · חשבון פעיל</p>
        <p className={styles.heroAddress}>{addressLine || building.displayName}</p>
      </header>

      <OperatorDashboardMetrics metrics={metrics} />

      <section className={styles.section} aria-labelledby="action-required-title">
        <h2 id="action-required-title" className={styles.sectionTitle}>
          דורש טיפול
        </h2>
        <OperatorDashboardActionItems items={actionItems} />
      </section>

      <section className={styles.section} aria-labelledby="quick-actions-title">
        <h2 id="quick-actions-title" className={styles.sectionTitle}>
          פעולות מהירות
        </h2>
        <div className={styles.actionsRow}>
          <BuildingDebtCasesCreateButton
            buildingId={building.buildingId}
            action={createDebtCaseDraftFormAction}
          />
          <ButtonLink href={`/app/buildings/${building.buildingId}`} variant="secondary">
            כל תיקי החוב
          </ButtonLink>
          <ButtonLink href={`/app/buildings/${building.buildingId}`} variant="secondary">
            פרטי בניין
          </ButtonLink>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="platform-modules-title">
        <h2 id="platform-modules-title" className={styles.sectionTitle}>
          מודולי המערכת
        </h2>
        <PortalPlatformModulesGrid modules={modules} />
        <p className={styles.heroMeta}>
          <Link href="/app/buildings">כל הבניינים הנגישים</Link>
        </p>
      </section>
    </div>
  );
}
