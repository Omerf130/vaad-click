import { NotificationsListPanel } from "@/modules/notifications/ui/NotificationsListPanel";
import { requireAuthenticatedPortalSession } from "@/shared/auth/require-access";

export default async function PortalNotificationsPage() {
  const context = await requireAuthenticatedPortalSession();

  return (
    <div style={{ maxWidth: "40rem", margin: "0 auto", padding: "1rem" }}>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>התראות</h1>
      <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted, #666)" }}>
        עדכונים על פעולות במערכת — לא הודעות פרטיות בין משתמשים.
      </p>
      <NotificationsListPanel context={context} />
    </div>
  );
}
