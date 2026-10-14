import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import type { AdminUserListParams } from "@/modules/users/validation/admin-user-list.schema";
import styles from "@/modules/users/ui/AdminUsers.module.scss";
import { Button } from "@/components/ui/Button/Button";

type AdminUsersFiltersProps = {
  params: AdminUserListParams;
};

export function AdminUsersFilters({ params }: AdminUsersFiltersProps) {
  const statusDisabled = params.view === "pending";

  return (
    <form method="get" action="/app/admin/users" className={styles.filters}>
      <input type="hidden" name="view" value={params.view} />
      <input type="hidden" name="page" value="1" />
      <div className={styles.field}>
        <label className={styles.label} htmlFor="admin-users-q">
          חיפוש
        </label>
        <input
          id="admin-users-q"
          className={styles.input}
          type="search"
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="שם או דוא״ל"
          autoComplete="off"
          maxLength={120}
        />
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="admin-users-role">
          תפקיד
        </label>
        <select
          id="admin-users-role"
          className={styles.select}
          name="role"
          defaultValue={params.role ?? ""}
        >
          <option value="">הכל</option>
          <option value={UserRole.BUILDING_REP}>נציג בניין</option>
          <option value={UserRole.MANAGEMENT_COMPANY}>חברת ניהול</option>
        </select>
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="admin-users-status">
          סטטוס
        </label>
        <select
          id="admin-users-status"
          className={styles.select}
          name="status"
          defaultValue={params.status ?? ""}
          disabled={statusDisabled}
        >
          <option value="">הכל</option>
          <option value={AccountStatus.PENDING_APPROVAL}>ממתין לאישור</option>
          <option value={AccountStatus.ACTIVE}>פעיל</option>
          <option value={AccountStatus.REJECTED}>נדחה</option>
          <option value={AccountStatus.DISABLED}>מושבת</option>
          <option value={AccountStatus.LOCKED}>נעול</option>
        </select>
      </div>
      <div className={styles.field}>
        <Button type="submit" variant="secondary" size="sm">
          סינון
        </Button>
      </div>
    </form>
  );
}
