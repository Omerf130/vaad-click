"use client";

import { useActionState, useEffect } from "react";

import { Button } from "@/components/ui/Button/Button";
import {
  exportReportDebtCasesCsvAction,
  type ReportExportActionState,
} from "@/modules/reports/actions/report-export.actions";
import type { ReportFilters } from "@/modules/reports/validation/report-filters.schema";
import styles from "@/modules/reports/ui/Reports.module.scss";

type Props = {
  filters: ReportFilters;
};

const initialState: ReportExportActionState = { ok: false, message: "" };

export function ReportExportPanel({ filters }: Props) {
  const [state, action, pending] = useActionState(exportReportDebtCasesCsvAction, initialState);

  useEffect(() => {
    if (!state.ok || !("csvBase64" in state)) {
      return;
    }
    const bytes = Uint8Array.from(atob(state.csvBase64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = state.filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [state]);

  return (
    <div className={styles.exportBox}>
      <p className={styles.bannerInfo}>
        ייצוא CSV בקידוד UTF-8 (מתאים ל-Excel). הנתונים מסוננים לפי ההרשאות והסינון הנוכחי. סכומי
        חוב — רשומים בלבד, לא גבייה.
      </p>
      <form action={action}>
        <input type="hidden" name="preset" value={filters.preset} />
        <input type="hidden" name="dateField" value={filters.dateField} />
        <input type="hidden" name="customFrom" value={filters.customFrom ?? ""} />
        <input type="hidden" name="customTo" value={filters.customTo ?? ""} />
        <input type="hidden" name="buildingId" value={filters.buildingId ?? ""} />
        <input type="hidden" name="managementCompanyId" value={filters.managementCompanyId ?? ""} />
        <input type="hidden" name="workflowStatus" value={filters.workflowStatus ?? ""} />
        <input type="hidden" name="q" value={filters.q ?? ""} />
        <input type="hidden" name="sort" value={filters.sort} />
        <Button type="submit" disabled={pending}>
          {pending ? "מייצא…" : "הורדת דוח תיקי חוב (CSV)"}
        </Button>
      </form>
      {state.ok ? (
        <p className={styles.sectionNote} role="status">
          הקובץ הורד.
        </p>
      ) : state.message ? (
        <p className={styles.bannerWarning} role="status">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
