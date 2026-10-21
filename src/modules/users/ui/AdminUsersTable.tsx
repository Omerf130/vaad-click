import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button/ButtonLink";
import { ListPagination } from "@/components/ui/DataList/ListPagination";
import dataListStyles from "@/components/ui/DataList/DataList.module.scss";
import { StatusBadge } from "@/components/ui/StatusBadge/StatusBadge";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { formatAdminUserDateTime } from "@/modules/users/presentation/format-admin-user-date";
import {
  accountStatusBadgeVariant,
  formatAccountStatusHe,
  formatAdminUserRoleHe,
} from "@/modules/users/presentation/admin-user-labels.he";
import type { AdminUserListItem } from "@/modules/users/services/admin-user-query.service";
import type { AdminUserListParams } from "@/modules/users/validation/admin-user-list.schema";
import { buildAdminUsersListHref } from "@/modules/users/ui/admin-users-list-url";
import styles from "@/modules/users/ui/AdminUsers.module.scss";

type AdminUsersTableProps = {
  items: AdminUserListItem[];
  listParams: AdminUserListParams;
  page: number;
  totalPages: number;
  total: number;
};

export function AdminUsersTable({
  items,
  listParams,
  page,
  totalPages,
  total,
}: AdminUsersTableProps) {
  const prevHref =
    page > 1
      ? buildAdminUsersListHref({ ...listParams, page: page - 1 })
      : null;
  const nextHref =
    page < totalPages
      ? buildAdminUsersListHref({ ...listParams, page: page + 1 })
      : null;

  return (
    <>
      <p className={dataListStyles.metaLine}>
        {total} משתמשים{listParams.view === "pending" ? " ממתינים" : ""}
      </p>

      <div className={`${dataListStyles.tableShell} ${dataListStyles.desktopOnly}`}>
        <div className={dataListStyles.tableScroll}>
          <table className={dataListStyles.dataTable}>
            <thead>
              <tr>
                <th scope="col">שם</th>
                <th scope="col">דוא״ל</th>
                <th scope="col">תפקיד</th>
                <th scope="col">סטטוס</th>
                <th scope="col">תאריך הרשמה</th>
                <th scope="col">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {items.map((user) => {
                const pending = user.accountStatus === AccountStatus.PENDING_APPROVAL;
                return (
                  <tr
                    key={user.id}
                    className={pending ? styles.rowPending : undefined}
                  >
                    <td>{user.fullName}</td>
                    <td className={dataListStyles.cellTruncate} title={user.email}>
                      <Link href={`/app/admin/users/${user.id}`}>{user.email}</Link>
                    </td>
                    <td>{formatAdminUserRoleHe(user.role)}</td>
                    <td>
                      <StatusBadge
                        label={formatAccountStatusHe(user.accountStatus)}
                        variant={accountStatusBadgeVariant(user.accountStatus)}
                      />
                    </td>
                    <td>{formatAdminUserDateTime(user.createdAt)}</td>
                    <td className={dataListStyles.actionsCell}>
                      <ButtonLink href={`/app/admin/users/${user.id}`} variant="ghost" size="sm">
                        {pending ? "בדיקה ואישור" : "פרטים"}
                      </ButtonLink>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ul className={`${dataListStyles.cardList} ${dataListStyles.mobileOnly}`} aria-label="משתמשים">
        {items.map((user) => {
          const pending = user.accountStatus === AccountStatus.PENDING_APPROVAL;
          return (
            <li
              key={user.id}
              className={pending ? `${dataListStyles.cardRow} ${dataListStyles.cardRowPending}` : dataListStyles.cardRow}
            >
              <div className={dataListStyles.cardHeader}>
                <p className={dataListStyles.cardTitle}>{user.fullName}</p>
                <StatusBadge
                  label={formatAccountStatusHe(user.accountStatus)}
                  variant={accountStatusBadgeVariant(user.accountStatus)}
                />
              </div>
              <dl className={dataListStyles.cardGrid}>
                <div className={dataListStyles.cardGridRow}>
                  <dt>דוא״ל</dt>
                  <dd>
                    <Link href={`/app/admin/users/${user.id}`}>{user.email}</Link>
                  </dd>
                </div>
                <div className={dataListStyles.cardGridRow}>
                  <dt>תפקיד</dt>
                  <dd>{formatAdminUserRoleHe(user.role)}</dd>
                </div>
                <div className={dataListStyles.cardGridRow}>
                  <dt>הרשמה</dt>
                  <dd>{formatAdminUserDateTime(user.createdAt)}</dd>
                </div>
              </dl>
              <div className={dataListStyles.cardFooter}>
                <ButtonLink href={`/app/admin/users/${user.id}`} variant="secondary" size="sm">
                  {pending ? "בדיקה ואישור" : "פרטים"}
                </ButtonLink>
              </div>
            </li>
          );
        })}
      </ul>

      <ListPagination
        page={page}
        totalPages={totalPages}
        prevHref={prevHref}
        nextHref={nextHref}
      />
    </>
  );
}
