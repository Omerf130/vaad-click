import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminPageFrame } from "@/modules/admin/components/AdminPageFrame";
import { getAdminUserDetail } from "@/modules/users/services/admin-user-query.service";
import { AdminUserDetailSections } from "@/modules/users/ui/AdminUserDetailSections";
import { requireLawyerAdminPortal } from "@/shared/auth/require-access";

type PageProps = {
  params: Promise<{ userId: string }>;
};

export default async function AdminUserDetailPage({ params }: PageProps) {
  const context = await requireLawyerAdminPortal();
  const { userId } = await params;
  const user = await getAdminUserDetail({ context, userId });

  if (!user) {
    notFound();
  }

  return (
    <AdminPageFrame
      title={user.fullName}
      subtitle={user.email}
      toolbar={
        <Link href="/app/admin/users">חזרה לרשימה</Link>
      }
    >
      <AdminUserDetailSections user={user} />
    </AdminPageFrame>
  );
}
