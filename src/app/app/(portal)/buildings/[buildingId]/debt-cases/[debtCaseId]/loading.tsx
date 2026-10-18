import { OperatorPortalPageFrame } from "@/modules/portal/ui/OperatorPortalPageFrame";
import styles from "@/modules/portal/ui/OperatorPortalDashboard.module.scss";

export default function PortalDebtCaseDetailLoading() {
  return (
    <OperatorPortalPageFrame title="טוען תיק חוב…">
      <p className={styles.emptyState} role="status">
        מביאים את פרטי התיק והיסטוריית הפעילות.
      </p>
    </OperatorPortalPageFrame>
  );
}
