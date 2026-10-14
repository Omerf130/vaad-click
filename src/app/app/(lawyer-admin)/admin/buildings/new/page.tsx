import Link from "next/link";

import { AdminPageFrame } from "@/modules/admin/components/AdminPageFrame";
import { BuildingCreateForm } from "@/modules/buildings/ui/BuildingCreateForm";
import { requireLawyerAdminPortal } from "@/shared/auth/require-access";

export default async function AdminBuildingCreatePage() {
  await requireLawyerAdminPortal();

  return (
    <AdminPageFrame
      title="בניין חדש"
      subtitle="כתובת מנורמלת לזיהוי כפילויות. חריג דורש נימוק מבוקר ורישום ביקורת."
      toolbar={<Link href="/app/admin/buildings">חזרה לרשימה</Link>}
    >
      <BuildingCreateForm />
    </AdminPageFrame>
  );
}
