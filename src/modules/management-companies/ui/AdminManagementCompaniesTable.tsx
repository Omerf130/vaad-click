import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button/ButtonLink";
import { ListPagination } from "@/components/ui/DataList/ListPagination";
import dataListStyles from "@/components/ui/DataList/DataList.module.scss";

export type AdminManagementCompanyListRow = {
  managementCompanyId: string;
  displayName: string;
  primaryUserName: string | null;
  buildingCount: number;
};

type Props = {
  items: AdminManagementCompanyListRow[];
  page: number;
  totalPages: number;
  prevHref: string | null;
  nextHref: string | null;
};

export function AdminManagementCompaniesTable({
  items,
  page,
  totalPages,
  prevHref,
  nextHref,
}: Props) {
  return (
    <>
      <div className={`${dataListStyles.tableShell} ${dataListStyles.desktopOnly}`}>
        <div className={dataListStyles.tableScroll}>
          <table className={dataListStyles.dataTable}>
            <thead>
              <tr>
                <th scope="col">שם</th>
                <th scope="col">משתמש ראשי</th>
                <th scope="col">בניינים</th>
                <th scope="col">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.managementCompanyId}>
                  <td>{row.displayName}</td>
                  <td>{row.primaryUserName ?? "—"}</td>
                  <td>{row.buildingCount}</td>
                  <td className={dataListStyles.actionsCell}>
                    <Link href={`/app/admin/management-companies/${row.managementCompanyId}`}>פרטים</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ul className={`${dataListStyles.cardList} ${dataListStyles.mobileOnly}`} aria-label="חברות ניהול">
        {items.map((row) => (
          <li key={row.managementCompanyId} className={dataListStyles.cardRow}>
            <p className={dataListStyles.cardTitle}>{row.displayName}</p>
            <dl className={dataListStyles.cardGrid}>
              <div className={dataListStyles.cardGridRow}>
                <dt>משתמש ראשי</dt>
                <dd>{row.primaryUserName ?? "—"}</dd>
              </div>
              <div className={dataListStyles.cardGridRow}>
                <dt>בניינים</dt>
                <dd>{row.buildingCount}</dd>
              </div>
            </dl>
            <div className={dataListStyles.cardFooter}>
              <ButtonLink
                href={`/app/admin/management-companies/${row.managementCompanyId}`}
                variant="secondary"
                size="sm"
              >
                פרטים
              </ButtonLink>
            </div>
          </li>
        ))}
      </ul>

      <ListPagination page={page} totalPages={totalPages} prevHref={prevHref} nextHref={nextHref} />
    </>
  );
}
