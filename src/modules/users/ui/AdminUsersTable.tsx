import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button/ButtonLink";
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
      <p className={styles.metaLine}>
        {total} משתמשים{listParams.view === "pending" ? " ממתינים" : ""}
      </p>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
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
                  <td>
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
                  <td className={styles.actionsCell}>
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
      <div className={styles.pagination}>
        <span>
          עמוד {page} מתוך {totalPages}
        </span>
        <div className={styles.actionsCell}>
          {prevHref ? (
            <ButtonLink href={prevHref} variant="ghost" size="sm">
              הקודם
            </ButtonLink>
          ) : null}
          {nextHref ? (
            <ButtonLink href={nextHref} variant="ghost" size="sm">
              הבא
            </ButtonLink>
          ) : null}
        </div>
      </div>
    </>
  );
}
