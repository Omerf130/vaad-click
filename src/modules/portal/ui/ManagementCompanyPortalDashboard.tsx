import type { ManagementCompanyPortalDashboard as McDashboardData } from "@/modules/portal/services/operator-portal-dashboard.service";
import { ManagementCompanyAddBuildingPanel } from "@/modules/portal/ui/ManagementCompanyAddBuildingPanel";
import { ManagementCompanyBuildingExplorer } from "@/modules/portal/ui/ManagementCompanyBuildingExplorer";
import { ManagementCompanyCreateCasePanel } from "@/modules/portal/ui/ManagementCompanyCreateCasePanel";
import { OperatorDashboardActionItems } from "@/modules/portal/ui/OperatorDashboardActionItems";
import { OperatorDashboardMetrics } from "@/modules/portal/ui/OperatorDashboardMetrics";
import { OperatorDashboardWaitingList } from "@/modules/portal/ui/OperatorDashboardWaitingList";
import { OperatorRecentActivityList } from "@/modules/portal/ui/OperatorRecentActivityList";
import styles from "@/modules/portal/ui/OperatorPortalDashboard.module.scss";

type Props = {
  data: McDashboardData;
};

export function ManagementCompanyPortalDashboard({ data }: Props) {
  const buildingNames = new Map(data.buildings.map((b) => [b.buildingId, b.displayName]));
  const hasActionItems = data.actionItems.length > 0;
  const hasWaiting = data.waitingForLawyerItems.length > 0;

  return (
    <div className={styles.pageCompact}>
      <p className={styles.dashboardLead}>
        {data.assignedBuildingCount} בניינים משויכים · הלקוח המשפטי הוא ועד הבית
      </p>

      <OperatorDashboardMetrics metrics={data.aggregateMetrics} />

      {hasActionItems || hasWaiting ? (
        <div className={styles.priorityGrid}>
          {hasActionItems ? (
            <section className={styles.section} aria-labelledby="mc-action-required-title">
              <h2 id="mc-action-required-title" className={styles.sectionTitle}>
                דורש טיפול
              </h2>
              <OperatorDashboardActionItems items={data.actionItems} showBuildingName />
            </section>
          ) : null}
          {hasWaiting ? (
            <section className={styles.section} aria-labelledby="mc-waiting-lawyer-title">
              <h2 id="mc-waiting-lawyer-title" className={styles.sectionTitle}>
                ממתין לבדיקת עורך דין
              </h2>
              <OperatorDashboardWaitingList items={data.waitingForLawyerItems} showBuildingName />
            </section>
          ) : null}
        </div>
      ) : null}

      <ManagementCompanyCreateCasePanel buildings={data.buildings} />

      <section className={styles.section} aria-labelledby="mc-buildings-title">
        <h2 id="mc-buildings-title" className={styles.sectionTitle}>
          בניינים בניהול
        </h2>
        <ManagementCompanyBuildingExplorer buildings={data.buildings} />
      </section>

      <details className={styles.disclosureSection}>
        <summary className={styles.disclosureSummary}>פעילות אחרונה ועדכונים</summary>
        <div className={styles.disclosureBody}>
          <OperatorRecentActivityList
            items={data.recentActivity}
            showBuildingName
            buildingNames={buildingNames}
          />
        </div>
      </details>

      <details className={styles.disclosureSection}>
        <summary className={styles.disclosureSummary}>הוספת בניין חדש</summary>
        <div className={styles.disclosureBody}>
          <ManagementCompanyAddBuildingPanel hideSectionTitle defaultOpen />
        </div>
      </details>
    </div>
  );
}
