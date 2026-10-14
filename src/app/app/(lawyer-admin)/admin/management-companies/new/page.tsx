import Link from "next/link";

import { AdminPageFrame } from "@/modules/admin/components/AdminPageFrame";
import { listEligibleManagementCompanyPrimaryUsers } from "@/modules/buildings/services/admin-building-query.service";
import { ManagementCompanyCreateForm } from "@/modules/management-companies/ui/ManagementCompanyCreateForm";
import { requireLawyerAdminPortal } from "@/shared/auth/require-access";

export default async function AdminManagementCompanyCreatePage() {
  await requireLawyerAdminPortal();
  const eligiblePrimaryUsers = await listEligibleManagementCompanyPrimaryUsers();

  return (
    <AdminPageFrame
      title="חברת ניהול חדשה"
      subtitle="יש לקשר משתמש מאושר מסוג חברת ניהול — לא ניתן ליצור משתמשים מזויפים."
      toolbar={<Link href="/app/admin/management-companies">חזרה לרשימה</Link>}
    >
      <ManagementCompanyCreateForm eligiblePrimaryUsers={eligiblePrimaryUsers} />
    </AdminPageFrame>
  );
}
