import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button/ButtonLink";
import { formatDebtPeriodDisplayHe, formatMinorUnitsToNisDisplay } from "@/modules/debt-cases/presentation/debt-case-labels.he";
import {
  DebtCaseLawyerReviewStatusBadge,
  DebtCaseWorkflowStatusBadge,
} from "@/modules/debt-cases/ui/DebtCaseStatusBadges";
import type { LawyerDebtCaseListResult } from "@/modules/debt-cases/services/lawyer-debt-case-query.service";
import { buildLawyerDebtCaseListHref } from "@/modules/debt-cases/ui/lawyer/lawyer-debt-case-list-url";
import styles from "@/modules/debt-cases/ui/lawyer/LawyerDebtCasesAdmin.module.scss";
import type { LawyerDebtCaseListParams } from "@/modules/debt-cases/validation/lawyer-debt-case-list.schema";

type Props = {
  list: LawyerDebtCaseListResult;
  params: LawyerDebtCaseListParams;
};

function formatSubmittedAt(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  return new Date(iso).toLocaleString("he-IL", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function LawyerDebtCaseQueueTable({ list, params }: Props) {
  const prevHref =
    list.page > 1 ? buildLawyerDebtCaseListHref({ ...params, page: list.page - 1 }) : null;
  const nextHref =
    list.page < list.totalPages
      ? buildLawyerDebtCaseListHref({ ...params, page: list.page + 1 })
      : null;

  return (
    <>
      <p className={styles.metaLine}>{list.totalCount} תיקי חוב</p>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">בניין</th>
              <th scope="col">דירה</th>
              <th scope="col">חייב / בעלים</th>
              <th scope="col">סכום (₪)</th>
              <th scope="col">תקופה</th>
              <th scope="col">סטטוס תיק</th>
              <th scope="col">בדיקת עו&quot;ד</th>
              <th scope="col">הוגש</th>
              <th scope="col">פעולה</th>
            </tr>
          </thead>
          <tbody>
            {list.items.map((row) => (
              <tr key={row.debtCaseId}>
                <td>{row.buildingDisplayName}</td>
                <td>{row.apartmentNumberDisplay}</td>
                <td>{row.debtorDisplayName}</td>
                <td>{formatMinorUnitsToNisDisplay(row.principalAmountMinor)}</td>
                <td>
                  {formatDebtPeriodDisplayHe(row.periodStartMonth, row.periodEndMonth)}
                </td>
                <td>
                  <DebtCaseWorkflowStatusBadge status={row.workflowStatus} />
                </td>
                <td>
                  <DebtCaseLawyerReviewStatusBadge status={row.lawyerReviewStatus} />
                </td>
                <td>{formatSubmittedAt(row.submittedAtIso)}</td>
                <td>
                  <Link href={`/app/admin/debt-cases/${row.debtCaseId}`}>פתיחה</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.pagination}>
        {prevHref ? (
          <ButtonLink href={prevHref} variant="secondary" size="sm">
            הקודם
          </ButtonLink>
        ) : null}
        <span className={styles.metaLine}>
          עמוד {list.page} מתוך {list.totalPages}
        </span>
        {nextHref ? (
          <ButtonLink href={nextHref} variant="secondary" size="sm">
            הבא
          </ButtonLink>
        ) : null}
      </div>
    </>
  );
}
