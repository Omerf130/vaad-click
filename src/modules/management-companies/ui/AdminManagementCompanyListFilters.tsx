"use client";

import { Button } from "@/components/ui/Button/Button";
import { CollapsibleFilterPanel } from "@/components/ui/DataList/CollapsibleFilterPanel";
import dataListStyles from "@/components/ui/DataList/DataList.module.scss";

type Props = {
  q?: string;
};

export function AdminManagementCompanyListFilters({ q }: Props) {
  const active = q?.trim() ? 1 : 0;

  return (
    <CollapsibleFilterPanel
      action="/app/admin/management-companies"
      activeFilterCount={active}
      resetHref={active ? "/app/admin/management-companies" : undefined}
      hiddenFields={<input type="hidden" name="page" value="1" />}
      primary={
        <div className={dataListStyles.filterField}>
          <label className={dataListStyles.filterLabel} htmlFor="mc-q">
            חיפוש
          </label>
          <input
            id="mc-q"
            name="q"
            className={dataListStyles.filterInput}
            type="search"
            defaultValue={q ?? ""}
          />
        </div>
      }
      actions={
        <Button type="submit" variant="secondary" size="sm">
          החל סינון
        </Button>
      }
    />
  );
}
