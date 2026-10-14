import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button/ButtonLink";
import { AdminEmptyState } from "@/modules/admin/components/AdminEmptyState";
import { AdminPageFrame } from "@/modules/admin/components/AdminPageFrame";
import { listAdminManagementCompanies } from "@/modules/management-companies/services/admin-management-company-query.service";
import { parseAdminManagementCompanyListSearchParams } from "@/modules/management-companies/validation/admin-management-company-list.schema";
import { requireLawyerAdminPortal } from "@/shared/auth/require-access";
import styles from "@/modules/users/ui/AdminUsers.module.scss";

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
      <form method="get" action="/app/admin/management-companies" className={styles.filters}>
        <input type="hidden" name="page" value="1" />
        <div className={styles.field}>
          <label className={styles.label} htmlFor="q">חיפוש</label>
          <input id="q" name="q" className={styles.input} type="search" defaultValue={params.q ?? ""} />
        </div>
        <div className={styles.field}>
          <button type="submit" className={styles.viewTab}>סינון</button>
        </div>
      </form>

      {list.items.length === 0 ? (
        <AdminEmptyState title="לא נמצאו חברות" description="צרו חברת ניהול חדשה לאחר אישור משתמש מתאים." />
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>שם</th>
                  <th>משתמש ראשי</th>
                  <th>בניינים</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.items.map((row) => (
                  <tr key={row.managementCompanyId}>
                    <td>{row.displayName}</td>
                    <td>{row.primaryUserName ?? "—"}</td>
                    <td>{row.buildingCount}</td>
                    <td>
                      <Link href={`/app/admin/management-companies/${row.managementCompanyId}`}>פרטים</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.pagination}>
            <span>עמוד {list.page} מתוך {list.totalPages}</span>
            <div className={styles.actionsCell}>
              {list.page > 1 ? (
                <ButtonLink href={buildHref(params.q, list.page - 1)} variant="ghost" size="sm">הקודם</ButtonLink>
              ) : null}
              {list.page < list.totalPages ? (
                <ButtonLink href={buildHref(params.q, list.page + 1)} variant="ghost" size="sm">הבא</ButtonLink>
              ) : null}
            </div>
          </div>
        </>
      )}
    </AdminPageFrame>
  );
}
