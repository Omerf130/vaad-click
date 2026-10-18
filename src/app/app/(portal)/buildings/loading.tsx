import { Container } from "@/components/ui";
import styles from "@/modules/portal/ui/OperatorPortalDashboard.module.scss";

export default function PortalBuildingsLoading() {
  return (
    <Container>
      <p className={styles.emptyState} role="status">
        טוען בניינים…
      </p>
    </Container>
  );
}
