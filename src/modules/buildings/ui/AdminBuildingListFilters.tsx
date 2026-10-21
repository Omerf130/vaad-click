"use client";

import { Button } from "@/components/ui/Button/Button";
import { CollapsibleFilterPanel } from "@/components/ui/DataList/CollapsibleFilterPanel";
import dataListStyles from "@/components/ui/DataList/DataList.module.scss";
import { BuildingOrganizationalStatus } from "@/modules/buildings/domain/building-status";
import { adminBuildingVerificationFilter } from "@/modules/buildings/validation/admin-building-list.schema";
import type { AdminBuildingListParams } from "@/modules/buildings/validation/admin-building-list.schema";
import { buildAdminBuildingsListHref } from "@/modules/buildings/ui/admin-buildings-list-url";

type Props = {
  params: AdminBuildingListParams;
};

function countActive(params: AdminBuildingListParams): number {
  let n = 0;
  if (params.q?.trim()) n += 1;
  if (params.status) n += 1;
  if (params.verification && params.verification !== adminBuildingVerificationFilter.ALL) n += 1;
  return n;
}

export function AdminBuildingListFilters({ params }: Props) {
  const active = countActive(params);
  const resetHref = buildAdminBuildingsListHref({ page: 1 });

  return (
    <CollapsibleFilterPanel
      action="/app/admin/buildings"
      activeFilterCount={active}
      resetHref={active > 0 ? resetHref : undefined}
      hiddenFields={<input type="hidden" name="page" value="1" />}
      primary={
        <div className={dataListStyles.filterField}>
          <label className={dataListStyles.filterLabel} htmlFor="admin-buildings-q">
            חיפוש
          </label>
          <input
            id="admin-buildings-q"
            name="q"
            className={dataListStyles.filterInput}
            type="search"
            defaultValue={params.q ?? ""}
            placeholder="שם או כתובת"
          />
        </div>
      }
      secondary={
        <>
          <div className={dataListStyles.filterField}>
            <label className={dataListStyles.filterLabel} htmlFor="admin-buildings-status">
              סטטוס ארגוני
            </label>
            <select
              id="admin-buildings-status"
              name="status"
              className={dataListStyles.filterSelect}
              defaultValue={params.status ?? ""}
            >
              <option value="">הכל</option>
              <option value={BuildingOrganizationalStatus.ACTIVE}>פעיל</option>
              <option value={BuildingOrganizationalStatus.ARCHIVED}>בארכיון</option>
            </select>
          </div>
          <div className={dataListStyles.filterField}>
            <label className={dataListStyles.filterLabel} htmlFor="admin-buildings-verification">
              אימות משפטי
            </label>
            <select
              id="admin-buildings-verification"
              name="verification"
              className={dataListStyles.filterSelect}
              defaultValue={params.verification ?? adminBuildingVerificationFilter.ALL}
            >
              <option value={adminBuildingVerificationFilter.ALL}>הכל</option>
              <option value={adminBuildingVerificationFilter.PENDING}>טרם אומת</option>
              <option value={adminBuildingVerificationFilter.VERIFIED}>אומת</option>
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
