"use client";

import { useRouter, usePathname } from "next/navigation";

import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import { formatWorkflowStatusHe } from "@/modules/debt-cases/presentation/debt-case-labels.he";
import { ReportDateField } from "@/modules/reports/domain/report-date-field";
import { dateFieldLabelHe } from "@/modules/reports/presentation/report-labels.he";
import { ReportDatePreset } from "@/modules/reports/validation/report-filters.schema";
import { buildReportQuery } from "@/modules/reports/presentation/report-search-params";
import type { ReportFilters } from "@/modules/reports/validation/report-filters.schema";
import styles from "@/modules/reports/ui/Reports.module.scss";

type Props = {
  filters: ReportFilters;
  tab: string;
  buildingOptions: Array<{ buildingId: string; displayName: string; city: string }>;
  managementCompanyOptions: Array<{ id: string; displayName: string }>;
  showManagementCompanyFilter: boolean;
};

export function ReportFiltersForm({
  filters,
  tab,
  buildingOptions,
  managementCompanyOptions,
  showManagementCompanyFilter,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

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

  return (
    <form
      className={styles.filters}
      onSubmit={(event) => {
        event.preventDefault();
        submit(event.currentTarget);
      }}
    >
      <div className={styles.filterField}>
        <label className={styles.label} htmlFor="report-preset">
          טווח
        </label>
        <select id="report-preset" name="preset" className={styles.select} defaultValue={filters.preset}>
          <option value={ReportDatePreset.LAST_30}>30 יום</option>
          <option value={ReportDatePreset.LAST_90}>90 יום</option>
          <option value={ReportDatePreset.THIS_YEAR}>שנה נוכחית</option>
          <option value={ReportDatePreset.ALL}>כל הזמנים</option>
          <option value={ReportDatePreset.CUSTOM}>מותאם</option>
        </select>
      </div>
      <div className={styles.filterField}>
        <label className={styles.label} htmlFor="report-date-field">
          שדה תאריך
        </label>
        <select
          id="report-date-field"
          name="dateField"
          className={styles.select}
          defaultValue={filters.dateField}
          aria-describedby="report-date-field-hint"
        >
          <option value={ReportDateField.CREATED}>{dateFieldLabelHe(ReportDateField.CREATED)}</option>
          <option value={ReportDateField.SUBMITTED}>{dateFieldLabelHe(ReportDateField.SUBMITTED)}</option>
          <option value={ReportDateField.UPDATED}>{dateFieldLabelHe(ReportDateField.UPDATED)}</option>
        </select>
        <span id="report-date-field-hint" className={styles.fieldHint}>
          קובע את טווח הזמן לכרטיסי סטטוס, לטבלאות ולסה״כ תיקים. לא משפיע על «הגשות חדשות» ועל גרף
          ההגשות — שם נספר לפי תאריך הגשה בלבד.
        </span>
      </div>
      <div className={styles.filterField}>
        <label className={styles.label} htmlFor="report-from">
          מתאריך (מותאם)
        </label>
        <input
          id="report-from"
          name="customFrom"
          type="date"
          className={styles.input}
          defaultValue={filters.customFrom ?? ""}
        />
      </div>
      <div className={styles.filterField}>
        <label className={styles.label} htmlFor="report-to">
          עד תאריך (מותאם)
        </label>
        <input
          id="report-to"
          name="customTo"
          type="date"
          className={styles.input}
          defaultValue={filters.customTo ?? ""}
        />
      </div>
      {buildingOptions.length > 1 ? (
        <div className={styles.filterField}>
          <label className={styles.label} htmlFor="report-building">
            בניין
          </label>
          <select id="report-building" name="buildingId" className={styles.select} defaultValue={filters.buildingId ?? ""}>
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
        <div className={styles.filterField}>
          <label className={styles.label} htmlFor="report-mc">
            חברת ניהול
          </label>
          <select
            id="report-mc"
            name="managementCompanyId"
            className={styles.select}
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
      <div className={styles.filterField}>
        <label className={styles.label} htmlFor="report-status">
          סטטוס תיק
        </label>
        <select
          id="report-status"
          name="workflowStatus"
          className={styles.select}
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
      <div className={styles.filterField}>
        <label className={styles.label} htmlFor="report-q">
          חיפוש
        </label>
        <input
          id="report-q"
          name="q"
          className={styles.input}
          placeholder="מזהה תיק / דירה"
          defaultValue={filters.q ?? ""}
        />
      </div>
      <div className={styles.filterField}>
        <label className={styles.label} htmlFor="report-sort">
          מיון
        </label>
        <select id="report-sort" name="sort" className={styles.select} defaultValue={filters.sort}>
          <option value="newest">עדכון אחרון (חדש)</option>
          <option value="oldest">עדכון אחרון (ישן)</option>
          <option value="amount_desc">סכום (גבוה)</option>
          <option value="amount_asc">סכום (נמוך)</option>
        </select>
      </div>
      <button type="submit" className={styles.input}>
        החל סינון
      </button>
    </form>
  );
}
