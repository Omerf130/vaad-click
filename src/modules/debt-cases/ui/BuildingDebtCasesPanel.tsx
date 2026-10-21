import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button/ButtonLink";
import dataListStyles from "@/components/ui/DataList/DataList.module.scss";
import { createDebtCaseDraftFormAction } from "@/modules/debt-cases/actions/portal-debt-case.actions";
import type { DebtCaseListItem } from "@/modules/debt-cases/persistence/debt-case.mapper";
import { formatDebtCaseInstantHe, formatMinorUnitsToNisDisplay } from "@/modules/debt-cases/presentation/debt-case-labels.he";
import {
  DebtCaseLawyerReviewStatusBadge,
  DebtCaseWorkflowStatusBadge,
} from "@/modules/debt-cases/ui/DebtCaseStatusBadges";
import { BuildingDebtCasesCreateButton } from "@/modules/debt-cases/ui/BuildingDebtCasesCreateButton";
import styles from "@/modules/debt-cases/ui/DebtCases.module.scss";

type BuildingDebtCasesPanelProps = {
  buildingId: string;
  cases: DebtCaseListItem[];
};

function formatPeriod(start: string | null, end: string | null): string {
  if (!start || !end) {
    return "—";
  }
  return `${start} – ${end}`;
}

export function BuildingDebtCasesPanel({ buildingId, cases }: BuildingDebtCasesPanelProps) {
  return (
    <section className={styles.section} aria-labelledby="debt-cases-heading">
      <h2 id="debt-cases-heading" className={styles.title}>
        תיקי חוב
      </h2>
      <p className={styles.meta}>
        הגשה לבדיקת עורך דין — לא שליחת מכתב. טיוטות ניתן לשמור בחלקיות.
      </p>

      {cases.length === 0 ? (
        <p className={styles.meta} role="status">
          אין תיקים עדיין.
        </p>
      ) : (
        <>
          <div className={`${dataListStyles.tableShell} ${dataListStyles.desktopOnly}`}>
            <div className={dataListStyles.tableScroll}>
              <table className={dataListStyles.dataTable}>
                <thead>
                  <tr>
                    <th scope="col">מזהה</th>
                    <th scope="col">דירה</th>
                    <th scope="col">סכום (₪)</th>
                    <th scope="col">תקופה</th>
                    <th scope="col">סטטוס תיק</th>
                    <th scope="col">בדיקת עו&quot;ד</th>
                    <th scope="col">עודכן</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map((item) => (
                    <tr key={item.debtCaseId}>
                      <td>
                        <Link href={`/app/buildings/${buildingId}/debt-cases/${item.debtCaseId}`}>
                          {item.debtCaseId.slice(0, 8)}…
                        </Link>
                      </td>
                      <td>{item.apartmentNumberDisplay || "—"}</td>
                      <td>{formatMinorUnitsToNisDisplay(item.principalAmountMinor)}</td>
                      <td>{formatPeriod(item.periodStartMonth, item.periodEndMonth)}</td>
                      <td>
                        <DebtCaseWorkflowStatusBadge status={item.workflowStatus} />
                      </td>
                      <td>
                        <DebtCaseLawyerReviewStatusBadge status={item.lawyerReviewStatus} />
                      </td>
                      <td>{formatDebtCaseInstantHe(item.updatedAtIso)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <ul
            className={`${dataListStyles.cardList} ${dataListStyles.mobileOnly}`}
            aria-label="תיקי חוב בבניין"
          >
            {cases.map((item) => (
              <li key={item.debtCaseId} className={dataListStyles.cardRow}>
                <div className={dataListStyles.cardHeader}>
                  <p className={dataListStyles.cardTitle}>דירה {item.apartmentNumberDisplay || "—"}</p>
                  <DebtCaseWorkflowStatusBadge status={item.workflowStatus} />
                </div>
                <dl className={dataListStyles.cardGrid}>
                  <div className={dataListStyles.cardGridRow}>
                    <dt>מזהה</dt>
                    <dd>{item.debtCaseId.slice(0, 8)}…</dd>
                  </div>
                  <div className={dataListStyles.cardGridRow}>
                    <dt>סכום</dt>
                    <dd>{formatMinorUnitsToNisDisplay(item.principalAmountMinor)} ₪</dd>
                  </div>
                  <div className={dataListStyles.cardGridRow}>
                    <dt>תקופה</dt>
                    <dd>{formatPeriod(item.periodStartMonth, item.periodEndMonth)}</dd>
                  </div>
                  <div className={dataListStyles.cardGridRow}>
                    <dt>בדיקת עו&quot;ד</dt>
                    <dd>
                      <DebtCaseLawyerReviewStatusBadge status={item.lawyerReviewStatus} />
                    </dd>
                  </div>
                  <div className={dataListStyles.cardGridRow}>
                    <dt>עודכן</dt>
                    <dd>{formatDebtCaseInstantHe(item.updatedAtIso)}</dd>
                  </div>
                </dl>
                <div className={dataListStyles.cardFooter}>
                  <ButtonLink
                    href={`/app/buildings/${buildingId}/debt-cases/${item.debtCaseId}`}
                    variant="secondary"
                    size="sm"
                  >
                    פתיחת תיק
                  </ButtonLink>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <BuildingDebtCasesCreateButton buildingId={buildingId} action={createDebtCaseDraftFormAction} />
    </section>
  );
}
