import { AdminShell } from "@/modules/admin/layout/AdminShell";
import { countUnreadNotifications } from "@/modules/notifications/services/notification-query.service";
import { requireLawyerAdminPortal } from "@/shared/auth/require-access";

export default async function LawyerAdminAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await requireLawyerAdminPortal();
  const initialUnreadNotifications = await countUnreadNotifications(context);

  return (
    <AdminShell
      userFullName={context.user.fullName}
      userEmail={context.user.email ?? ""}
      initialUnreadNotifications={initialUnreadNotifications}
    >
      {children}
    </AdminShell>
  );
}
