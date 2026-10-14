import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button/ButtonLink";
import { AdminEmptyState } from "@/modules/admin/components/AdminEmptyState";
import { AdminPageFrame } from "@/modules/admin/components/AdminPageFrame";
import { BuildingOrganizationalStatus } from "@/modules/buildings/domain/building-status";
import { formatBuildingOrganizationalStatusHe } from "@/modules/buildings/presentation/building-labels.he";
import { listAdminBuildings } from "@/modules/buildings/services/admin-building-query.service";
import { buildAdminBuildingsListHref } from "@/modules/buildings/ui/admin-buildings-list-url";
import { parseAdminBuildingListSearchParams } from "@/modules/buildings/validation/admin-building-list.schema";
import { requireLawyerAdminPortal } from "@/shared/auth/require-access";
import styles from "@/modules/users/ui/AdminUsers.module.scss";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminBuildingsPage({ searchParams }: PageProps) {
  const context = await requireLawyerAdminPortal();
  const params = parseAdminBuildingListSearchParams(await searchParams);
  const list = await listAdminBuildings({ context, params });

  const prevHref =
    list.page > 1 ? buildAdminBuildingsListHref({ ...params, page: list.page - 1 }) : null;
  const nextHref =
    list.page < list.totalPages
      ? buildAdminBuildingsListHref({ ...params, page: list.page + 1 })
      : null;

  return (
    <AdminPageFrame
      title="בניינים"
      subtitle="יצירה, עריכה ושיוך נציגות וחברות ניהול — לפי כללי CP6."
      toolbar={
        <ButtonLink href="/app/admin/buildings/new" variant="primary" size="sm">
          בניין חדש
        </ButtonLink>
      }
    >
      <form method="get" action="/app/admin/buildings" className={styles.filters}>
        <input type="hidden" name="page" value="1" />
        <div className={styles.field}>
          <label className={styles.label} htmlFor="q">חיפוש</label>
          <input id="q" name="q" className={styles.input} type="search" defaultValue={params.q ?? ""} placeholder="שם או כתובת" />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="status">סטטוס</label>
          <select id="status" name="status" className={styles.select} defaultValue={params.status ?? ""}>
            <option value="">הכל</option>
            <option value={BuildingOrganizationalStatus.ACTIVE}>פעיל</option>
            <option value={BuildingOrganizationalStatus.ARCHIVED}>בארכיון</option>
          </select>
        </div>
        <div className={styles.field}>
          <button type="submit" className={styles.viewTab}>סינון</button>
        </div>
      </form>

      {list.items.length === 0 ? (
        <AdminEmptyState
          title="לא נמצאו בניינים"
          description={params.q ? "נסו חיפוש אחר." : "צרו בניין ראשון בלחיצה על «בניין חדש»."}
        />
      ) : (
        <>
          <p className={styles.metaLine}>{list.total} בניינים</p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>שם</th>
                  <th>כתובת</th>
                  <th>סטטוס</th>
                  <th>נציג</th>
                  <th>חברת ניהול</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.items.map((row) => (
                  <tr key={row.buildingId}>
                    <td>{row.displayName}</td>
                    <td>{`${row.street} ${row.houseNumber}, ${row.city}`}</td>
                    <td>{formatBuildingOrganizationalStatusHe(row.organizationalStatus)}</td>
                    <td>{row.representativeName ?? "—"}</td>
                    <td>{row.managementCompanyName ?? "—"}</td>
                    <td>
                      <Link href={`/app/admin/buildings/${row.buildingId}`}>פרטים</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.pagination}>
            <span>עמוד {list.page} מתוך {list.totalPages}</span>
            <div className={styles.actionsCell}>
              {prevHref ? <ButtonLink href={prevHref} variant="ghost" size="sm">הקודם</ButtonLink> : null}
              {nextHref ? <ButtonLink href={nextHref} variant="ghost" size="sm">הבא</ButtonLink> : null}
            </div>
          </div>
        </>
      )}
    </AdminPageFrame>
  );
}
