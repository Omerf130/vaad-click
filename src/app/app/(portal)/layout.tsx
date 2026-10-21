import { Container } from "@/components/ui";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { BackToPublicHomeLink } from "@/components/navigation/BackToPublicHomeLink";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import { countUnreadNotifications } from "@/modules/notifications/services/notification-query.service";
import { NotificationBell } from "@/modules/notifications/ui/NotificationBell";
import { PortalOperatorNav } from "@/modules/portal/ui/PortalOperatorNav";
import { requireAuthenticatedPortalSession } from "@/shared/auth/require-access";
import { getAccessibleBuildingPublicIds } from "@/shared/auth/building-access";
import styles from "../app-shell.module.scss";

export default async function PortalAppLayout({ children }: { children: React.ReactNode }) {
  const context = await requireAuthenticatedPortalSession();
  const initialUnreadNotifications = await countUnreadNotifications(context);

  let primaryBuildingId: string | null = null;
  if (
    context.user.role === UserRole.BUILDING_REP &&
    context.user.accountStatus === AccountStatus.ACTIVE
  ) {
    const buildingIds = await getAccessibleBuildingPublicIds(context);
    primaryBuildingId = buildingIds[0] ?? null;
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Container className={styles.headerInner}>
          <span className={styles.brand}>ועד בקליק — אזור מפעילים</span>
          <div className={styles.headerActions}>
            <NotificationBell
              initialUnreadCount={initialUnreadNotifications}
              fullListHref="/app/notifications"
            />
            <BackToPublicHomeLink />
            <LogoutButton />
          </div>
        </Container>
        <Container className={styles.headerNavRow}>
          <PortalOperatorNav primaryBuildingId={primaryBuildingId} />
        </Container>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
