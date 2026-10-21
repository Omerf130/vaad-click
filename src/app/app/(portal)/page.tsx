import Link from "next/link";

import { Card } from "@/components/ui/Card/Card";
import { BuildingRepPortalDashboard } from "@/modules/portal/ui/BuildingRepPortalDashboard";
import { ManagementCompanyEmptyPortalDashboard } from "@/modules/portal/ui/ManagementCompanyEmptyPortalDashboard";
import { ManagementCompanyPortalDashboard } from "@/modules/portal/ui/ManagementCompanyPortalDashboard";
import { OperatorPortalPageFrame } from "@/modules/portal/ui/OperatorPortalPageFrame";
import { loadOperatorPortalDashboard } from "@/modules/portal/services/operator-portal-dashboard.service";
import { UserRole } from "@/modules/users/domain/user-role";
import { requireOperationalPortalAccess } from "@/shared/auth/require-access";
import styles from "../portal.module.scss";

function portalDashboardSubtitle(role: UserRole): string {
  if (role === UserRole.MANAGEMENT_COMPANY) {
    return "חברת ניהול · לוח בקרה תפעולי";
  }
  if (role === UserRole.BUILDING_REP) {
    return "נציגות בית משותף · לוח בקרה";
  }
  return "אזור מפעילים";
}

export default async function AppPortalPage() {
  const context = await requireOperationalPortalAccess();
  const { user } = context;

  if (user.role === UserRole.LAWYER_ADMIN) {
    return (
      <OperatorPortalPageFrame
        title={`שלום, ${user.fullName}`}
        subtitle="מנהל משרד עורכי דין"
      >
        <Card className={styles.card}>
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
      </OperatorPortalPageFrame>
    );
  }

  if (
    user.role !== UserRole.BUILDING_REP &&
    user.role !== UserRole.MANAGEMENT_COMPANY
  ) {
    return (
      <OperatorPortalPageFrame title={`שלום, ${user.fullName}`}>
        <Card className={styles.card}>
          <p className={styles.body}>אין לחשבון זה לוח בקרה תפעולי.</p>
        </Card>
      </OperatorPortalPageFrame>
    );
  }

  const dashboard = await loadOperatorPortalDashboard(context);

  if (dashboard.kind === "empty") {
    if (user.role === UserRole.MANAGEMENT_COMPANY) {
      return (
        <OperatorPortalPageFrame
          title={`שלום, ${user.fullName}`}
          subtitle={portalDashboardSubtitle(user.role)}
        >
          <ManagementCompanyEmptyPortalDashboard />
        </OperatorPortalPageFrame>
      );
    }
    return (
      <OperatorPortalPageFrame
        title={`שלום, ${user.fullName}`}
        subtitle={portalDashboardSubtitle(user.role)}
      >
        <Card className={styles.card}>
          <p className={styles.body}>
            החשבון מאושר, אך אין עדיין בניין משויך. מנהל המשרד ישייך בניין כאשר יהיה מוכן.
          </p>
        </Card>
      </OperatorPortalPageFrame>
    );
  }

  if (dashboard.kind === "building_rep") {
    return (
      <OperatorPortalPageFrame
        title={`שלום, ${user.fullName}`}
        subtitle={portalDashboardSubtitle(user.role)}
      >
        <BuildingRepPortalDashboard data={dashboard} />
      </OperatorPortalPageFrame>
    );
  }

  return (
    <OperatorPortalPageFrame
      title={`שלום, ${user.fullName}`}
      subtitle={portalDashboardSubtitle(user.role)}
    >
      <ManagementCompanyPortalDashboard data={dashboard} />
    </OperatorPortalPageFrame>
  );
}
