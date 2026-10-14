import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminPageFrame } from "@/modules/admin/components/AdminPageFrame";
import { getAdminManagementCompanyDetail } from "@/modules/management-companies/services/admin-management-company-query.service";
import { ManagementCompanyDetailForm } from "@/modules/management-companies/ui/ManagementCompanyDetailForm";
import { requireLawyerAdminPortal } from "@/shared/auth/require-access";

type PageProps = {
  params: Promise<{ managementCompanyId: string }>;
};

export default async function AdminManagementCompanyDetailPage({ params }: PageProps) {
  const context = await requireLawyerAdminPortal();
  const { managementCompanyId } = await params;
  const company = await getAdminManagementCompanyDetail({ context, managementCompanyId });

  if (!company) {
    notFound();
  }

  return (
    <AdminPageFrame
      title={company.displayName}
      subtitle={company.managementCompanyId}
      toolbar={<Link href="/app/admin/management-companies">חזרה לרשימה</Link>}
    >
      <ManagementCompanyDetailForm company={company} />
    </AdminPageFrame>
  );
}
