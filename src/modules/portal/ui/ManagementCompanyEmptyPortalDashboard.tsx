import { ManagementCompanyAddBuildingPanel } from "@/modules/portal/ui/ManagementCompanyAddBuildingPanel";
import styles from "@/modules/portal/ui/OperatorPortalDashboard.module.scss";

export function ManagementCompanyEmptyPortalDashboard() {
  return (
    <div className={styles.pageCompact}>
      <p className={styles.dashboardLead}>אין עדיין בניינים משויכים לחברת הניהול.</p>
      <ManagementCompanyAddBuildingPanel defaultOpen />
      <p className={styles.emptyState}>
        לאחר הוספת בניין תוכלו לנהל תיקי חוב עבור ועד הבית — בכפוף לאימות משפטי במשרד.
      </p>
    </div>
  );
}
