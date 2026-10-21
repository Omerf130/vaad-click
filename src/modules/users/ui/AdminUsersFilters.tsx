"use client";

import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import type { AdminUserListParams } from "@/modules/users/validation/admin-user-list.schema";
import { buildAdminUsersListHref } from "@/modules/users/ui/admin-users-list-url";
import { Button } from "@/components/ui/Button/Button";
import { CollapsibleFilterPanel } from "@/components/ui/DataList/CollapsibleFilterPanel";
import dataListStyles from "@/components/ui/DataList/DataList.module.scss";

type AdminUsersFiltersProps = {
  params: AdminUserListParams;
};

function countActiveFilters(params: AdminUserListParams): number {
  let count = 0;
  if (params.q?.trim()) count += 1;
  if (params.role) count += 1;
  if (params.status && params.view !== "pending") count += 1;
  return count;
}

export function AdminUsersFilters({ params }: AdminUsersFiltersProps) {
  const statusDisabled = params.view === "pending";
  const activeCount = countActiveFilters(params);
  const resetHref = buildAdminUsersListHref({
    view: params.view,
    page: 1,
  });

  return (
    <CollapsibleFilterPanel
      activeFilterCount={activeCount}
      resetHref={activeCount > 0 ? resetHref : undefined}
      action="/app/admin/users"
      hiddenFields={
        <>
          <input type="hidden" name="view" value={params.view} />
          <input type="hidden" name="page" value="1" />
        </>
      }
      primary={
        <div className={dataListStyles.filterField}>
          <label className={dataListStyles.filterLabel} htmlFor="admin-users-q">
            חיפוש
          </label>
          <input
            id="admin-users-q"
            className={dataListStyles.filterInput}
            type="search"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="שם או דוא״ל"
            autoComplete="off"
            maxLength={120}
          />
        </div>
      }
      secondary={
        <>
          <div className={dataListStyles.filterField}>
            <label className={dataListStyles.filterLabel} htmlFor="admin-users-role">
              תפקיד
            </label>
            <select
              id="admin-users-role"
              className={dataListStyles.filterSelect}
              name="role"
              defaultValue={params.role ?? ""}
            >
              <option value="">הכל</option>
              <option value={UserRole.BUILDING_REP}>נציג בניין</option>
              <option value={UserRole.MANAGEMENT_COMPANY}>חברת ניהול</option>
            </select>
          </div>
          <div className={dataListStyles.filterField}>
            <label className={dataListStyles.filterLabel} htmlFor="admin-users-status">
              סטטוס
            </label>
            <select
              id="admin-users-status"
              className={dataListStyles.filterSelect}
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
        </>
      }
      actions={
        <Button type="submit" variant="secondary" size="sm">
          החל סינון
        </Button>
      }
    />
  );
}
