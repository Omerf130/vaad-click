"use client";

import { useRouter, usePathname } from "next/navigation";

import { Button } from "@/components/ui/Button/Button";
import { CollapsibleFilterPanel } from "@/components/ui/DataList/CollapsibleFilterPanel";
import dataListStyles from "@/components/ui/DataList/DataList.module.scss";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import { formatWorkflowStatusHe } from "@/modules/debt-cases/presentation/debt-case-labels.he";
import { ReportDateField } from "@/modules/reports/domain/report-date-field";
import { dateFieldLabelHe } from "@/modules/reports/presentation/report-labels.he";
import { ReportDatePreset } from "@/modules/reports/validation/report-filters.schema";
import { buildReportQuery } from "@/modules/reports/presentation/report-search-params";
import type { ReportFilters } from "@/modules/reports/validation/report-filters.schema";

type Props = {
  filters: ReportFilters;
  tab: string;
  buildingOptions: Array<{ buildingId: string; displayName: string; city: string }>;
  managementCompanyOptions: Array<{ id: string; displayName: string }>;
  showManagementCompanyFilter: boolean;
};

function countReportActiveFilters(filters: ReportFilters): number {
  let count = 0;
  if (filters.preset !== ReportDatePreset.LAST_90) count += 1;
  if (filters.dateField !== ReportDateField.SUBMITTED) count += 1;
  if (filters.customFrom || filters.customTo) count += 1;
  if (filters.buildingId) count += 1;
  if (filters.managementCompanyId) count += 1;
  if (filters.workflowStatus) count += 1;
  if (filters.q?.trim()) count += 1;
  if (filters.sort !== "newest") count += 1;
  return count;
}

export function ReportFiltersForm({
  filters,
  tab,
  buildingOptions,
  managementCompanyOptions,
  showManagementCompanyFilter,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const activeCount = countReportActiveFilters(filters);

  function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const next: ReportFilters = {
      ...filters,
      preset: String(data.get("preset") ?? filters.preset) as ReportFilters["preset"],
      dateField: String(data.get("dateField") ?? filters.dateField) as ReportFilters["dateField"],
      customFrom: String(data.get("customFrom") ?? "") || null,
      customTo: String(data.get("customTo") ?? "") || null,
      buildingId: String(data.get("buildingId") ?? "") || null,
      managementCompanyId: String(data.get("managementCompanyId") ?? "") || null,
      workflowStatus: (String(data.get("workflowStatus") ?? "") || null) as ReportFilters["workflowStatus"],
      q: String(data.get("q") ?? "") || null,
      page: 1,
      pageSize: filters.pageSize,
      sort: (String(data.get("sort") ?? filters.sort) || "newest") as ReportFilters["sort"],
    };
    router.push(`${pathname}?${buildReportQuery(next, tab)}`);
  }

  const resetHref = `${pathname}?${buildReportQuery(
    {
      ...filters,
      preset: ReportDatePreset.LAST_90,
      dateField: ReportDateField.SUBMITTED,
      customFrom: null,
      customTo: null,
      buildingId: null,
      managementCompanyId: null,
      workflowStatus: null,
      q: null,
      page: 1,
      sort: "newest",
    },
    tab,
  )}`;

  return (
    <CollapsibleFilterPanel
      title="סינון דוחות"
      activeFilterCount={activeCount}
      resetHref={activeCount > 0 ? resetHref : undefined}
      onSubmit={(event) => {
        event.preventDefault();
        submit(event.currentTarget);
      }}
      primary={
        <>
          <div className={dataListStyles.filterField}>
            <label className={dataListStyles.filterLabel} htmlFor="report-preset">
              טווח
            </label>
            <select
              id="report-preset"
              name="preset"
              className={dataListStyles.filterSelect}
              defaultValue={filters.preset}
            >
              <option value={ReportDatePreset.LAST_30}>30 יום</option>
              <option value={ReportDatePreset.LAST_90}>90 יום</option>
              <option value={ReportDatePreset.THIS_YEAR}>שנה נוכחית</option>
              <option value={ReportDatePreset.ALL}>כל הזמנים</option>
              <option value={ReportDatePreset.CUSTOM}>מותאם</option>
            </select>
          </div>
          <div className={dataListStyles.filterField}>
            <label className={dataListStyles.filterLabel} htmlFor="report-date-field">
              שדה תאריך
            </label>
            <select
              id="report-date-field"
              name="dateField"
              className={dataListStyles.filterSelect}
              defaultValue={filters.dateField}
              aria-describedby="report-date-field-hint"
            >
              <option value={ReportDateField.CREATED}>{dateFieldLabelHe(ReportDateField.CREATED)}</option>
              <option value={ReportDateField.SUBMITTED}>{dateFieldLabelHe(ReportDateField.SUBMITTED)}</option>
              <option value={ReportDateField.UPDATED}>{dateFieldLabelHe(ReportDateField.UPDATED)}</option>
            </select>
            <span id="report-date-field-hint" className={dataListStyles.filterLabel}>
              קובע את טווח הזמן לכרטיסי סטטוס ולטבלאות. גרף ההגשות — לפי תאריך הגשה בלבד.
            </span>
          </div>
          <div className={dataListStyles.filterField}>
            <label className={dataListStyles.filterLabel} htmlFor="report-q">
              חיפוש
            </label>
            <input
              id="report-q"
              name="q"
              className={dataListStyles.filterInput}
              placeholder="מזהה תיק / דירה"
              defaultValue={filters.q ?? ""}
            />
          </div>
        </>
      }
      secondary={
        <>
          <div className={dataListStyles.filterField}>
            <label className={dataListStyles.filterLabel} htmlFor="report-from">
              מתאריך (מותאם)
            </label>
            <input
              id="report-from"
              name="customFrom"
              type="date"
              className={dataListStyles.filterInput}
              defaultValue={filters.customFrom ?? ""}
            />
          </div>
          <div className={dataListStyles.filterField}>
            <label className={dataListStyles.filterLabel} htmlFor="report-to">
              עד תאריך (מותאם)
            </label>
            <input
              id="report-to"
              name="customTo"
              type="date"
              className={dataListStyles.filterInput}
              defaultValue={filters.customTo ?? ""}
            />
          </div>
          {buildingOptions.length > 1 ? (
            <div className={dataListStyles.filterField}>
              <label className={dataListStyles.filterLabel} htmlFor="report-building">
                בניין
              </label>
              <select
                id="report-building"
                name="buildingId"
                className={dataListStyles.filterSelect}
                defaultValue={filters.buildingId ?? ""}
              >
                <option value="">כל הבניינים המורשים</option>
                {buildingOptions.map((b) => (
                  <option key={b.buildingId} value={b.buildingId}>
                    {b.displayName}
                    {b.city ? ` · ${b.city}` : ""}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {showManagementCompanyFilter ? (
            <div className={dataListStyles.filterField}>
              <label className={dataListStyles.filterLabel} htmlFor="report-mc">
                חברת ניהול
              </label>
              <select
                id="report-mc"
                name="managementCompanyId"
                className={dataListStyles.filterSelect}
                defaultValue={filters.managementCompanyId ?? ""}
              >
                <option value="">כל החברות</option>
                {managementCompanyOptions.map((mc) => (
                  <option key={mc.id} value={mc.id}>
                    {mc.displayName}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className={dataListStyles.filterField}>
            <label className={dataListStyles.filterLabel} htmlFor="report-status">
              סטטוס תיק
            </label>
            <select
              id="report-status"
              name="workflowStatus"
              className={dataListStyles.filterSelect}
              defaultValue={filters.workflowStatus ?? ""}
            >
              <option value="">הכל</option>
              {Object.values(DebtCaseWorkflowStatus).map((status) => (
                <option key={status} value={status}>
                  {formatWorkflowStatusHe(status)}
                </option>
              ))}
            </select>
          </div>
          <div className={dataListStyles.filterField}>
            <label className={dataListStyles.filterLabel} htmlFor="report-sort">
              מיון
            </label>
            <select id="report-sort" name="sort" className={dataListStyles.filterSelect} defaultValue={filters.sort}>
              <option value="newest">עדכון אחרון (חדש)</option>
              <option value="oldest">עדכון אחרון (ישן)</option>
              <option value="amount_desc">סכום (גבוה)</option>
              <option value="amount_asc">סכום (נמוך)</option>
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
