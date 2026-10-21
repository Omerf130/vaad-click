import { NotificationsListPanel } from "@/modules/notifications/ui/NotificationsListPanel";
import pageStyles from "@/modules/notifications/ui/NotificationsPageFrame.module.scss";
import { requireAuthenticatedPortalSession } from "@/shared/auth/require-access";

export default async function PortalNotificationsPage() {
  const context = await requireAuthenticatedPortalSession();

  return (
    <div className={pageStyles.page}>
      <h1 className={pageStyles.title}>התראות</h1>
      <p className={pageStyles.intro}>
        עדכונים על פעולות במערכת — לא הודעות פרטיות בין משתמשים.
      </p>
      <NotificationsListPanel context={context} />
    </div>
  );
}
