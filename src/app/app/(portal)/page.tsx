import Link from "next/link";

import { Container } from "@/components/ui";
import { Card } from "@/components/ui/Card/Card";
import { BuildingRepPortalDashboard } from "@/modules/portal/ui/BuildingRepPortalDashboard";
import { ManagementCompanyEmptyPortalDashboard } from "@/modules/portal/ui/ManagementCompanyEmptyPortalDashboard";
import { ManagementCompanyPortalDashboard } from "@/modules/portal/ui/ManagementCompanyPortalDashboard";
import { loadOperatorPortalDashboard } from "@/modules/portal/services/operator-portal-dashboard.service";
import { UserRole } from "@/modules/users/domain/user-role";
import { requireOperationalPortalAccess } from "@/shared/auth/require-access";
import styles from "../portal.module.scss";

export default async function AppPortalPage() {
  const context = await requireOperationalPortalAccess();
  const { user } = context;

  if (user.role === UserRole.LAWYER_ADMIN) {
    return (
      <Container>
        <Card className={styles.card}>
          <h1 className={styles.title}>שלום, {user.fullName}</h1>
          <p className={styles.meta}>מנהל משרד עורכי דין · {user.email}</p>
          <p className={styles.body}>
            לניהול תיקי חוב, בניינים והגדרות מערכת — השתמשו בממשק מנהל המשרד.
          </p>
          <p className={styles.linkRow}>
            <Link href="/app/admin">מעבר לממשק מנהל המשרד</Link>
          </p>
          <p className={styles.linkRow}>
            <Link href="/app/buildings">בניינים פעילים (תצוגה)</Link>
          </p>
        </Card>
      </Container>
    );
  }

  if (
    user.role !== UserRole.BUILDING_REP &&
    user.role !== UserRole.MANAGEMENT_COMPANY
  ) {
    return (
      <Container>
        <Card className={styles.card}>
          <h1 className={styles.title}>שלום, {user.fullName}</h1>
          <p className={styles.body}>אין לחשבון זה לוח בקרה תפעולי.</p>
        </Card>
      </Container>
    );
  }

  const dashboard = await loadOperatorPortalDashboard(context);

  if (dashboard.kind === "empty") {
    if (user.role === UserRole.MANAGEMENT_COMPANY) {
      return (
        <Container>
          <ManagementCompanyEmptyPortalDashboard userFullName={user.fullName} />
        </Container>
      );
    }
    return (
      <Container>
        <Card className={styles.card}>
          <h1 className={styles.title}>שלום, {user.fullName}</h1>
          <p className={styles.meta}>{user.email}</p>
          <p className={styles.body}>
            החשבון מאושר, אך אין עדיין בניין משויך. מנהל המשרד ישייך בניין כאשר יהיה מוכן.
          </p>
        </Card>
      </Container>
    );
  }

  if (dashboard.kind === "building_rep") {
    return (
      <Container>
        <BuildingRepPortalDashboard userFullName={user.fullName} data={dashboard} />
      </Container>
    );
  }

  return (
    <Container>
      <ManagementCompanyPortalDashboard userFullName={user.fullName} data={dashboard} />
    </Container>
  );
}
