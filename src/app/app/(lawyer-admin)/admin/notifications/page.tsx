import { AdminPageFrame } from "@/modules/admin/components/AdminPageFrame";
import { NotificationsListPanel } from "@/modules/notifications/ui/NotificationsListPanel";
import { requireLawyerAdminPortal } from "@/shared/auth/require-access";

export default async function AdminNotificationsPage() {
  const context = await requireLawyerAdminPortal();

  return (
    <AdminPageFrame
      title="התראות"
      subtitle="עדכונים על פעולות במערכת — לא הודעות פרטיות."
      breadcrumbs={[
        { label: "סקירה", href: "/app/admin" },
        { label: "התראות" },
      ]}
    >
      <NotificationsListPanel context={context} />
    </AdminPageFrame>
  );
}
