import Link from "next/link";

import type { AdminUserListParams } from "@/modules/users/validation/admin-user-list.schema";
import { buildAdminUsersListHref } from "@/modules/users/ui/admin-users-list-url";
import styles from "@/modules/users/ui/AdminUsers.module.scss";

type AdminUsersViewTabsProps = {
  activeView: AdminUserListParams["view"];
  pendingCount: number;
  baseParams: Pick<AdminUserListParams, "q" | "role" | "status">;
};

export function AdminUsersViewTabs({
  activeView,
  pendingCount,
  baseParams,
}: AdminUsersViewTabsProps) {
  const allHref = buildAdminUsersListHref({ ...baseParams, view: "all", page: 1 });
  const pendingHref = buildAdminUsersListHref({ ...baseParams, view: "pending", page: 1 });

  return (
    <nav className={styles.viewTabs} aria-label="תצוגות משתמשים">
      <Link
        href={allHref}
        className={[styles.viewTab, activeView === "all" ? styles.viewTabActive : ""]
          .filter(Boolean)
          .join(" ")}
        aria-current={activeView === "all" ? "page" : undefined}
      >
        כל המשתמשים
      </Link>
      <Link
        href={pendingHref}
        className={[styles.viewTab, activeView === "pending" ? styles.viewTabActive : ""]
          .filter(Boolean)
          .join(" ")}
        aria-current={activeView === "pending" ? "page" : undefined}
      >
        בקשות ממתינות לאישור
        {pendingCount > 0 ? (
          <span className={styles.pendingCount} aria-label={`${pendingCount} ממתינים`}>
            {pendingCount}
          </span>
        ) : null}
      </Link>
    </nav>
  );
}
