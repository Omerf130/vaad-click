import { ButtonLink } from "@/components/ui/Button/ButtonLink";
import { createDebtCaseDraftFormAction } from "@/modules/debt-cases/actions/portal-debt-case.actions";
import { BuildingDebtCasesCreateButton } from "@/modules/debt-cases/ui/BuildingDebtCasesCreateButton";
import type { BuildingRepPortalDashboard as BuildingRepDashboardData } from "@/modules/portal/services/operator-portal-dashboard.service";
import { OperatorDashboardActionItems } from "@/modules/portal/ui/OperatorDashboardActionItems";
import { OperatorDashboardMetrics } from "@/modules/portal/ui/OperatorDashboardMetrics";
import { OperatorDashboardWaitingList } from "@/modules/portal/ui/OperatorDashboardWaitingList";
import { OperatorRecentActivityList } from "@/modules/portal/ui/OperatorRecentActivityList";
import styles from "@/modules/portal/ui/OperatorPortalDashboard.module.scss";

type Props = {
  data: BuildingRepDashboardData;
};

export function BuildingRepPortalDashboard({ data }: Props) {
  const { building, metrics, actionItems, waitingForLawyerItems, recentActivity } = data;
  const addressLine = [building.displayName, building.city].filter(Boolean).join(" · ");
  const hasActionItems = actionItems.length > 0;
  const hasWaiting = waitingForLawyerItems.length > 0;

  return (
    <div className={styles.pageCompact}>
      {addressLine ? <p className={styles.dashboardLead}>{addressLine}</p> : null}

      <OperatorDashboardMetrics metrics={metrics} />

      {hasActionItems || hasWaiting ? (
        <div className={styles.priorityGrid}>
          {hasActionItems ? (
            <section className={styles.section} aria-labelledby="action-required-title">
              <h2 id="action-required-title" className={styles.sectionTitle}>
                דורש את פעולתכם
              </h2>
              <p className={styles.sectionHint}>
                טיוטות והתיקים שהוחזרו — יש להשלים ולהגיש מחדש.
              </p>
              <OperatorDashboardActionItems items={actionItems} />
            </section>
          ) : null}
          {hasWaiting ? (
            <section className={styles.section} aria-labelledby="waiting-lawyer-title">
              <h2 id="waiting-lawyer-title" className={styles.sectionTitle}>
                ממתין לבדיקת עורך דין
              </h2>
              <OperatorDashboardWaitingList items={waitingForLawyerItems} />
            </section>
          ) : null}
        </div>
      ) : null}

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
            תיקי החוב והבניין
          </ButtonLink>
        </div>
      </section>

      <details className={styles.disclosureSection}>
        <summary className={styles.disclosureSummary}>פעילות אחרונה</summary>
        <div className={styles.disclosureBody}>
          <OperatorRecentActivityList items={recentActivity} />
        </div>
      </details>
    </div>
  );
}
