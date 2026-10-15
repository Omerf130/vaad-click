import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button/ButtonLink";
import { getPortalPlatformModules } from "@/modules/portal/presentation/portal-platform-modules";
import type { ManagementCompanyPortalDashboard as McDashboardData } from "@/modules/portal/services/operator-portal-dashboard.service";
import { OperatorDashboardActionItems } from "@/modules/portal/ui/OperatorDashboardActionItems";
import { OperatorDashboardMetrics } from "@/modules/portal/ui/OperatorDashboardMetrics";
import { PortalPlatformModulesGrid } from "@/modules/portal/ui/PortalPlatformModulesGrid";
import { UserRole } from "@/modules/users/domain/user-role";
import styles from "@/modules/portal/ui/OperatorPortalDashboard.module.scss";

type Props = {
  userFullName: string;
  data: McDashboardData;
};

export function ManagementCompanyPortalDashboard({ userFullName, data }: Props) {
  const modules = getPortalPlatformModules({ role: UserRole.MANAGEMENT_COMPANY });

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <h1 className={styles.heroTitle}>שלום, {userFullName}</h1>
        <p className={styles.heroMeta}>
          חברת ניהול · {data.assignedBuildingCount} בניינים משויכים
        </p>
      </header>

      <OperatorDashboardMetrics metrics={data.aggregateMetrics} />

      <section className={styles.section} aria-labelledby="mc-buildings-title">
        <h2 id="mc-buildings-title" className={styles.sectionTitle}>
          בניינים בניהול
        </h2>
        <div className={styles.buildingGrid}>
          {data.buildings.map((building) => (
            <article key={building.buildingId} className={styles.buildingCard}>
              <h3 className={styles.buildingCardTitle}>{building.displayName}</h3>
              <p className={styles.buildingCardMeta}>
                {[building.city, `${building.metrics.totalDebtCases} תיקי חוב`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <p className={styles.buildingCardMeta}>
                {building.metrics.returnedForCompletion} הוחזרו להשלמה ·{" "}
                {building.metrics.pendingLawyerReview} ממתינים לעו&quot;ד
              </p>
              <ButtonLink href={`/app/buildings/${building.buildingId}`} size="sm">
                כניסה לבניין
              </ButtonLink>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="mc-action-required-title">
        <h2 id="mc-action-required-title" className={styles.sectionTitle}>
          דורש טיפול
        </h2>
        <OperatorDashboardActionItems items={data.actionItems} showBuildingName />
      </section>

      <section className={styles.section} aria-labelledby="mc-platform-modules-title">
        <h2 id="mc-platform-modules-title" className={styles.sectionTitle}>
          מודולי המערכת
        </h2>
        <PortalPlatformModulesGrid modules={modules} />
        <p className={styles.heroMeta}>
          <Link href="/app/buildings">רשימת כל הבניינים</Link>
        </p>
      </section>
    </div>
  );
}
