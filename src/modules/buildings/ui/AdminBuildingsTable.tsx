import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button/ButtonLink";
import { ListPagination } from "@/components/ui/DataList/ListPagination";
import dataListStyles from "@/components/ui/DataList/DataList.module.scss";
import {
  formatBuildingOrganizationalStatusHe,
  formatLawyerVerificationStatusHe,
} from "@/modules/buildings/presentation/building-labels.he";
import type { AdminBuildingListItem } from "@/modules/buildings/services/admin-building-query.service";
import { buildAdminBuildingsListHref } from "@/modules/buildings/ui/admin-buildings-list-url";
import type { AdminBuildingListParams } from "@/modules/buildings/validation/admin-building-list.schema";

type Props = {
  items: AdminBuildingListItem[];
  params: AdminBuildingListParams;
  page: number;
  totalPages: number;
  total: number;
};

export function AdminBuildingsTable({ items, params, page, totalPages, total }: Props) {
  const prevHref = page > 1 ? buildAdminBuildingsListHref({ ...params, page: page - 1 }) : null;
  const nextHref =
    page < totalPages ? buildAdminBuildingsListHref({ ...params, page: page + 1 }) : null;

  return (
    <>
      <p className={dataListStyles.metaLine}>{total} בניינים</p>

      <div className={`${dataListStyles.tableShell} ${dataListStyles.desktopOnly}`}>
        <div className={dataListStyles.tableScroll}>
          <table className={dataListStyles.dataTable}>
            <thead>
              <tr>
                <th scope="col">שם</th>
                <th scope="col">כתובת</th>
                <th scope="col">סטטוס</th>
                <th scope="col">אימות</th>
                <th scope="col">נציג</th>
                <th scope="col">חברת ניהול</th>
                <th scope="col">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.buildingId}>
                  <td className={dataListStyles.cellTruncate} title={row.displayName}>
                    {row.displayName}
                  </td>
                  <td>{`${row.street} ${row.houseNumber}, ${row.city}`}</td>
                  <td>{formatBuildingOrganizationalStatusHe(row.organizationalStatus)}</td>
                  <td>{formatLawyerVerificationStatusHe(row.lawyerVerificationStatus)}</td>
                  <td>{row.representativeName ?? "—"}</td>
                  <td>{row.managementCompanyName ?? "—"}</td>
                  <td className={dataListStyles.actionsCell}>
                    <Link href={`/app/admin/buildings/${row.buildingId}`}>פרטים</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ul className={`${dataListStyles.cardList} ${dataListStyles.mobileOnly}`} aria-label="בניינים">
        {items.map((row) => (
          <li key={row.buildingId} className={dataListStyles.cardRow}>
            <p className={dataListStyles.cardTitle}>{row.displayName}</p>
            <p className={dataListStyles.cardMeta}>
              {row.street} {row.houseNumber}, {row.city}
            </p>
            <dl className={dataListStyles.cardGrid}>
              <div className={dataListStyles.cardGridRow}>
                <dt>סטטוס</dt>
                <dd>{formatBuildingOrganizationalStatusHe(row.organizationalStatus)}</dd>
              </div>
              <div className={dataListStyles.cardGridRow}>
                <dt>אימות</dt>
                <dd>{formatLawyerVerificationStatusHe(row.lawyerVerificationStatus)}</dd>
              </div>
              <div className={dataListStyles.cardGridRow}>
                <dt>נציג</dt>
                <dd>{row.representativeName ?? "—"}</dd>
              </div>
              <div className={dataListStyles.cardGridRow}>
                <dt>חברת ניהול</dt>
                <dd>{row.managementCompanyName ?? "—"}</dd>
              </div>
            </dl>
            <div className={dataListStyles.cardFooter}>
              <ButtonLink href={`/app/admin/buildings/${row.buildingId}`} variant="secondary" size="sm">
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
