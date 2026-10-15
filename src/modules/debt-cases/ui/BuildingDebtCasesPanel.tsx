import Link from "next/link";

import { createDebtCaseDraftFormAction } from "@/modules/debt-cases/actions/portal-debt-case.actions";
import type { DebtCaseListItem } from "@/modules/debt-cases/persistence/debt-case.mapper";
import { formatMinorUnitsToNisDisplay } from "@/modules/debt-cases/presentation/debt-case-labels.he";
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
        <p className={styles.meta}>אין תיקים עדיין.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
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
                  <td>{new Date(item.updatedAtIso).toLocaleDateString("he-IL")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <BuildingDebtCasesCreateButton buildingId={buildingId} action={createDebtCaseDraftFormAction} />
    </section>
  );
}
