import { ButtonLink } from "@/components/ui/Button/ButtonLink";
import { AdminEmptyState } from "@/modules/admin/components/AdminEmptyState";
import { AdminPageFrame } from "@/modules/admin/components/AdminPageFrame";
import { listAdminManagementCompanies } from "@/modules/management-companies/services/admin-management-company-query.service";
import { AdminManagementCompanyListFilters } from "@/modules/management-companies/ui/AdminManagementCompanyListFilters";
import { AdminManagementCompaniesTable } from "@/modules/management-companies/ui/AdminManagementCompaniesTable";
import { parseAdminManagementCompanyListSearchParams } from "@/modules/management-companies/validation/admin-management-company-list.schema";
import { requireLawyerAdminPortal } from "@/shared/auth/require-access";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function buildHref(q?: string, page?: number) {
  const search = new URLSearchParams();
  if (q) search.set("q", q);
  if (page && page > 1) search.set("page", String(page));
  const query = search.toString();
  return query ? `/app/admin/management-companies?${query}` : "/app/admin/management-companies";
}

export default async function AdminManagementCompaniesPage({ searchParams }: PageProps) {
  const context = await requireLawyerAdminPortal();
  const params = parseAdminManagementCompanyListSearchParams(await searchParams);
  const list = await listAdminManagementCompanies({ context, params });

  const prevHref = list.page > 1 ? buildHref(params.q, list.page - 1) : null;
  const nextHref = list.page < list.totalPages ? buildHref(params.q, list.page + 1) : null;

  return (
    <AdminPageFrame
      title="חברות ניהול"
      subtitle="יצירת חברות וקישור למשתמשים מאושרים מההרשמה הציבורית."
      toolbar={
        <ButtonLink href="/app/admin/management-companies/new" variant="primary" size="sm">
          חברה חדשה
        </ButtonLink>
      }
    >
      <AdminManagementCompanyListFilters q={params.q} />

      {list.items.length === 0 ? (
        <AdminEmptyState title="לא נמצאו חברות" description="צרו חברת ניהול חדשה לאחר אישור משתמש מתאים." />
      ) : (
        <AdminManagementCompaniesTable
          items={list.items}
          page={list.page}
          totalPages={list.totalPages}
          prevHref={prevHref}
          nextHref={nextHref}
        />
      )}
    </AdminPageFrame>
  );
}
