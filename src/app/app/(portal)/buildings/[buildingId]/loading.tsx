import { OperatorPortalPageFrame } from "@/modules/portal/ui/OperatorPortalPageFrame";
import styles from "@/modules/portal/ui/OperatorPortalDashboard.module.scss";

export default function PortalBuildingDetailLoading() {
  return (
    <OperatorPortalPageFrame title="טוען בניין…">
      <p className={styles.emptyState} role="status">
        מביאים את פרטי הבניין ותיקי החוב.
      </p>
    </OperatorPortalPageFrame>
  );
}
