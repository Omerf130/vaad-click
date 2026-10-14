import { AdminShell } from "@/modules/admin/layout/AdminShell";
import { requireLawyerAdminPortal } from "@/shared/auth/require-access";

export default async function LawyerAdminAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireLawyerAdminPortal();

  return (
    <AdminShell userFullName={user.fullName} userEmail={user.email ?? ""}>
      {children}
    </AdminShell>
  );
}
