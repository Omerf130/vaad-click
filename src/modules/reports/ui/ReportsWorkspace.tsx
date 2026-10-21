"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  WorkspaceAccessibleTabs,
  type WorkspaceTabDefinition,
} from "@/modules/debt-cases/ui/WorkspaceAccessibleTabs";
import {
  formatDebtCaseInstantHe,
  formatMinorUnitsToNisDisplay,
} from "@/modules/debt-cases/presentation/debt-case-labels.he";
import { buildReportQuery } from "@/modules/reports/presentation/report-search-params";
import type { ReportPageData } from "@/modules/reports/services/report-page.service";
import { ReportDistributionChart } from "@/modules/reports/ui/ReportDistributionChart";
import { ReportExportPanel } from "@/modules/reports/ui/ReportExportPanel";
import { ReportFiltersForm } from "@/modules/reports/ui/ReportFiltersForm";
import { ReportMetricsGrid } from "@/modules/reports/ui/ReportMetricsGrid";
import { ReportTrendChart } from "@/modules/reports/ui/ReportTrendChart";
import { ListPagination } from "@/components/ui/DataList/ListPagination";
import dataListStyles from "@/components/ui/DataList/DataList.module.scss";
import { ButtonLink } from "@/components/ui/Button/ButtonLink";
import styles from "@/modules/reports/ui/Reports.module.scss";

const TAB_OVERVIEW = "overview";
const TAB_CASES = "cases";
const TAB_BUILDINGS = "buildings";
const TAB_EXPORT = "export";

type Props = {
  data: Extract<ReportPageData, { ok: true }>;
  activeTab: string;
  pendingApprovals?: number | null;
};

export function ReportsWorkspace({ data, activeTab, pendingApprovals }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const showMc = data.scopeKind === "lawyer_admin";
  const showBuildingsTab = data.scopeKind !== "building_rep";

  const overviewPanel = (
    <div className={styles.workspace}>
      <ReportMetricsGrid
        metrics={data.overview.metrics}
        rangeLabel={data.overview.dateRange.labelHe}
        dateFieldLabel={data.overview.dateFieldLabel}
        showPendingApprovals={pendingApprovals}
      />
      <ReportDistributionChart
        title="התפלגות לפי סטטוס תיק"
        noteHe={data.distribution.noteHe}
        buckets={data.distribution.buckets}
      />
      <ReportTrendChart
        title="הגשות לבדיקה לפי חודש"
        noteHe={data.trend.noteHe}
        points={data.trend.points}
      />
    </div>
  );

  const casesPanel = (
    <div className={styles.workspace}>
      {data.caseList && data.caseList.items.length > 0 ? (
        <>
          <div className={`${dataListStyles.tableShell} ${dataListStyles.desktopOnly}`}>
            <p className={dataListStyles.scrollHint}>גלילה אופקית להשוואת עמודות</p>
            <div className={dataListStyles.tableScroll}>
              <table className={dataListStyles.dataTable}>
                <thead>
                  <tr>
                    <th scope="col">תיק</th>
                    <th scope="col">בניין</th>
                    <th scope="col">דירה</th>
                    <th scope="col">סטטוס</th>
                    <th scope="col">הוגש</th>
                    <th scope="col">סכום רשום</th>
                  </tr>
                </thead>
                <tbody>
                  {data.caseList.items.map((row) => (
                    <tr key={row.debtCaseId}>
                      <td>
                        <Link href={row.caseHref}>{row.debtCaseId.slice(0, 8)}…</Link>
                      </td>
                      <td className={dataListStyles.cellTruncate} title={row.buildingDisplayName}>
                        {row.buildingDisplayName}
                      </td>
                      <td>{row.apartmentNumberDisplay || "—"}</td>
                      <td>{row.workflowStatusHe}</td>
                      <td>{row.submittedAtIso ? formatDebtCaseInstantHe(row.submittedAtIso) : "—"}</td>
                      <td>
                        {row.principalAmountMinor != null && row.principalAmountMinor > 0
                          ? `${formatMinorUnitsToNisDisplay(row.principalAmountMinor)} ₪`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <ul
            className={`${dataListStyles.cardList} ${dataListStyles.mobileOnly}`}
            aria-label="תיקי חוב בדוח"
          >
            {data.caseList.items.map((row) => (
              <li key={row.debtCaseId} className={dataListStyles.cardRow}>
                <div className={dataListStyles.cardHeader}>
                  <p className={dataListStyles.cardTitle}>
                    {row.buildingDisplayName} · דירה {row.apartmentNumberDisplay || "—"}
                  </p>
                </div>
                <dl className={dataListStyles.cardGrid}>
                  <div className={dataListStyles.cardGridRow}>
                    <dt>תיק</dt>
                    <dd>{row.debtCaseId.slice(0, 8)}…</dd>
                  </div>
                  <div className={dataListStyles.cardGridRow}>
                    <dt>סטטוס</dt>
                    <dd>{row.workflowStatusHe}</dd>
                  </div>
                  <div className={dataListStyles.cardGridRow}>
                    <dt>הוגש</dt>
                    <dd>{row.submittedAtIso ? formatDebtCaseInstantHe(row.submittedAtIso) : "—"}</dd>
                  </div>
                  <div className={dataListStyles.cardGridRow}>
                    <dt>סכום רשום</dt>
                    <dd>
                      {row.principalAmountMinor != null && row.principalAmountMinor > 0
                        ? `${formatMinorUnitsToNisDisplay(row.principalAmountMinor)} ₪`
                        : "—"}
                    </dd>
                  </div>
                </dl>
                <div className={dataListStyles.cardFooter}>
                  <ButtonLink href={row.caseHref} variant="secondary" size="sm">
                    פתיחת תיק
                  </ButtonLink>
                </div>
              </li>
            ))}
          </ul>

          <ListPagination
            page={data.caseList.page}
            totalPages={data.caseList.totalPages || 1}
            summary={`עמוד ${data.caseList.page} מתוך ${data.caseList.totalPages || 1} (${data.caseList.total} תיקים)`}
            onPrev={
              data.caseList.page > 1
                ? () =>
                    router.push(
                      `${pathname}?${buildReportQuery(
                        { ...data.filters, page: data.caseList!.page - 1 },
                        TAB_CASES,
                      )}`,
                    )
                : undefined
            }
            onNext={
              data.caseList.page < data.caseList.totalPages
                ? () =>
                    router.push(
                      `${pathname}?${buildReportQuery(
                        { ...data.filters, page: data.caseList!.page + 1 },
                        TAB_CASES,
                      )}`,
                    )
                : undefined
            }
          />
        </>
      ) : (
        <p className={styles.sectionNote} role="status">
          אין תיקים בטווח ובסינון הנוכחי.
        </p>
      )}
    </div>
  );

  const buildingsPanel = (
    <div className={styles.workspace}>
      <p className={styles.sectionNote}>
        ספירות לפי {data.overview.dateFieldLabel} וטווח {data.overview.dateRange.labelHe}. «ממתינים
        לבדיקה» — תיק במצב «ממתין לבדיקת עורך דין» עם בדיקה שטרם נקבעה (כמו בכרטיס הסקירה).
      </p>
      {data.buildingSummaries && data.buildingSummaries.length > 0 ? (
        <div className={dataListStyles.tableShell}>
          <p className={dataListStyles.scrollHint}>גלילה אופקית — טבלת השוואה בין בניינים</p>
          <div className={dataListStyles.tableScroll}>
            <table className={`${dataListStyles.dataTable} ${dataListStyles.dataTableComfortable}`}>
              <caption className={styles.visuallyHidden}>
                סיכום בניינים — חוב רשום בלבד, לא גבייה
              </caption>
              <thead>
                <tr>
                  <th scope="col">בניין</th>
                  <th scope="col">עיר</th>
                  <th scope="col">תיקים</th>
                  <th scope="col">ממתינים לבדיקה</th>
                  <th scope="col">הוחזרו</th>
                  <th scope="col">אושרו להכנת מכתב</th>
                  <th scope="col">חוב רשום (₪)</th>
                </tr>
              </thead>
              <tbody>
                {data.buildingSummaries.map((row) => (
                  <tr key={row.buildingId}>
                    <td className={dataListStyles.cellTruncate} title={row.displayName}>
                      {row.displayName}
                    </td>
                    <td>{row.city || "—"}</td>
                    <td>{row.totalCases}</td>
                    <td>{row.awaitingReview}</td>
                    <td>{row.returned}</td>
                    <td>{row.approvedForLetterPrep}</td>
                    <td>{formatMinorUnitsToNisDisplay(row.recordedDebtMinor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className={styles.sectionNote}>אין נתוני בניינים להצגה.</p>
      )}
    </div>
  );

  const exportPanel = (
    <div className={styles.workspace}>
      <ReportExportPanel filters={data.filters} />
    </div>
  );

  const tabs: WorkspaceTabDefinition[] = [
    { id: TAB_OVERVIEW, label: "סקירה כללית", panel: overviewPanel },
    { id: TAB_CASES, label: "תיקי חוב", panel: casesPanel },
  ];
  if (showBuildingsTab) {
    tabs.push({ id: TAB_BUILDINGS, label: "בניינים", panel: buildingsPanel });
  }
  tabs.push({ id: TAB_EXPORT, label: "ייצוא נתונים", panel: exportPanel });

  const resolvedTab = tabs.some((t) => t.id === activeTab) ? activeTab : TAB_OVERVIEW;

  return (
    <div className={styles.workspace}>
      <ReportFiltersForm
        filters={data.filters}
        tab={resolvedTab}
        buildingOptions={data.buildingOptions}
        managementCompanyOptions={data.managementCompanyOptions}
        showManagementCompanyFilter={showMc}
      />
      <WorkspaceAccessibleTabs
        ariaLabel="דוחות ונתונים"
        tabs={tabs}
        activeTabId={resolvedTab}
        onTabChange={(tabId) => {
          const params = new URLSearchParams(window.location.search);
          params.set("tab", tabId);
          router.push(`${pathname}?${params.toString()}`);
        }}
      />
    </div>
  );
}
