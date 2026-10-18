import { getPortalPlatformModules } from "@/modules/portal/presentation/portal-platform-modules";
import type { ManagementCompanyPortalDashboard as McDashboardData } from "@/modules/portal/services/operator-portal-dashboard.service";
import { ManagementCompanyAddBuildingPanel } from "@/modules/portal/ui/ManagementCompanyAddBuildingPanel";
import { ManagementCompanyBuildingExplorer } from "@/modules/portal/ui/ManagementCompanyBuildingExplorer";
import { ManagementCompanyCreateCasePanel } from "@/modules/portal/ui/ManagementCompanyCreateCasePanel";
import { OperatorDashboardActionItems } from "@/modules/portal/ui/OperatorDashboardActionItems";
import { OperatorDashboardMetrics } from "@/modules/portal/ui/OperatorDashboardMetrics";
import { OperatorDashboardWaitingList } from "@/modules/portal/ui/OperatorDashboardWaitingList";
import { OperatorRecentActivityList } from "@/modules/portal/ui/OperatorRecentActivityList";
import { PortalPlatformModulesGrid } from "@/modules/portal/ui/PortalPlatformModulesGrid";
import { UserRole } from "@/modules/users/domain/user-role";
import styles from "@/modules/portal/ui/OperatorPortalDashboard.module.scss";

type Props = {
  userFullName: string;
  data: McDashboardData;
};

export function ManagementCompanyPortalDashboard({ userFullName, data }: Props) {
  const modules = getPortalPlatformModules({ role: UserRole.MANAGEMENT_COMPANY });
  const buildingNames = new Map(data.buildings.map((b) => [b.buildingId, b.displayName]));

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <h1 className={styles.heroTitle}>שלום, {userFullName}</h1>
        <p className={styles.heroMeta}>
          חברת ניהול · {data.assignedBuildingCount} בניינים משויכים · הלקוח המשפטי הוא ועד הבית
        </p>
      </header>

      <OperatorDashboardMetrics metrics={data.aggregateMetrics} />

      <ManagementCompanyCreateCasePanel buildings={data.buildings} />

      <section className={styles.section} aria-labelledby="mc-action-required-title">
        <h2 id="mc-action-required-title" className={styles.sectionTitle}>
          דורש טיפול בבניינים
        </h2>
        <OperatorDashboardActionItems items={data.actionItems} showBuildingName />
      </section>

      <section className={styles.section} aria-labelledby="mc-waiting-lawyer-title">
        <h2 id="mc-waiting-lawyer-title" className={styles.sectionTitle}>
          ממתין לבדיקת עורך דין
        </h2>
        <OperatorDashboardWaitingList items={data.waitingForLawyerItems} showBuildingName />
      </section>

      <section className={styles.section} aria-labelledby="mc-recent-activity-title">
        <h2 id="mc-recent-activity-title" className={styles.sectionTitle}>
          פעילות אחרונה
        </h2>
        <OperatorRecentActivityList
          items={data.recentActivity}
          showBuildingName
          buildingNames={buildingNames}
        />
      </section>

      <ManagementCompanyAddBuildingPanel />

      <section className={styles.section} aria-labelledby="mc-buildings-title">
        <h2 id="mc-buildings-title" className={styles.sectionTitle}>
          בניינים בניהול
        </h2>
        <ManagementCompanyBuildingExplorer buildings={data.buildings} />
      </section>

      <section className={styles.section} aria-labelledby="mc-platform-modules-title">
        <h2 id="mc-platform-modules-title" className={styles.sectionTitle}>
          מודולי המערכת
        </h2>
        <PortalPlatformModulesGrid modules={modules} />
      </section>
    </div>
  );
}
