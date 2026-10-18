import { ManagementCompanyAddBuildingPanel } from "@/modules/portal/ui/ManagementCompanyAddBuildingPanel";
import styles from "@/modules/portal/ui/OperatorPortalDashboard.module.scss";

type Props = {
  userFullName: string;
};

export function ManagementCompanyEmptyPortalDashboard({ userFullName }: Props) {
  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <h1 className={styles.heroTitle}>שלום, {userFullName}</h1>
        <p className={styles.heroMeta}>חברת ניהול · אין עדיין בניינים משויכים</p>
      </header>

      <ManagementCompanyAddBuildingPanel defaultOpen />

      <p className={styles.emptyState}>
        לאחר הוספת בניין תוכלו לנהל תיקי חוב עבור ועד הבית — בכפוף לאימות משפטי במשרד.
      </p>
    </div>
  );
}
