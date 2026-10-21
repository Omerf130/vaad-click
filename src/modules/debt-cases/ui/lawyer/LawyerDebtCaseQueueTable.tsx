import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button/ButtonLink";
import { ListPagination } from "@/components/ui/DataList/ListPagination";
import dataListStyles from "@/components/ui/DataList/DataList.module.scss";
import {
  formatDebtPeriodDisplayHe,
  formatDebtCaseInstantHe,
  formatMinorUnitsToNisDisplay,
} from "@/modules/debt-cases/presentation/debt-case-labels.he";
import {
  DebtCaseLawyerReviewStatusBadge,
  DebtCaseWorkflowStatusBadge,
} from "@/modules/debt-cases/ui/DebtCaseStatusBadges";
import type { LawyerDebtCaseListResult } from "@/modules/debt-cases/services/lawyer-debt-case-query.service";
import { buildLawyerDebtCaseListHref } from "@/modules/debt-cases/ui/lawyer/lawyer-debt-case-list-url";
import type { LawyerDebtCaseListParams } from "@/modules/debt-cases/validation/lawyer-debt-case-list.schema";

type Props = {
  list: LawyerDebtCaseListResult;
  params: LawyerDebtCaseListParams;
};

function formatSubmittedAt(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  return formatDebtCaseInstantHe(iso);
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
      <p className={dataListStyles.metaLine}>{list.totalCount} תיקי חוב</p>

      <div className={`${dataListStyles.tableShell} ${dataListStyles.desktopOnly}`}>
        <p className={dataListStyles.scrollHint}>גלילה אופקית להשוואת עמודות</p>
        <div className={dataListStyles.tableScroll}>
          <table className={`${dataListStyles.dataTable} ${dataListStyles.dataTableComfortable}`}>
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
                  <td className={dataListStyles.cellTruncate} title={row.buildingDisplayName}>
                    {row.buildingDisplayName}
                  </td>
                  <td>{row.apartmentNumberDisplay}</td>
                  <td className={dataListStyles.cellTruncate} title={row.debtorDisplayName}>
                    {row.debtorDisplayName}
                  </td>
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
                  <td className={dataListStyles.actionsCell}>
                    <Link href={`/app/admin/debt-cases/${row.debtCaseId}`}>פתיחה</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ul className={`${dataListStyles.cardList} ${dataListStyles.mobileOnly}`} aria-label="תיקי חוב">
        {list.items.map((row) => (
          <li key={row.debtCaseId} className={dataListStyles.cardRow}>
            <div className={dataListStyles.cardHeader}>
              <p className={dataListStyles.cardTitle}>
                {row.buildingDisplayName} · דירה {row.apartmentNumberDisplay}
              </p>
              <DebtCaseWorkflowStatusBadge status={row.workflowStatus} />
            </div>
            <dl className={dataListStyles.cardGrid}>
              <div className={dataListStyles.cardGridRow}>
                <dt>חייב</dt>
                <dd>{row.debtorDisplayName}</dd>
              </div>
              <div className={dataListStyles.cardGridRow}>
                <dt>סכום</dt>
                <dd>{formatMinorUnitsToNisDisplay(row.principalAmountMinor)} ₪</dd>
              </div>
              <div className={dataListStyles.cardGridRow}>
                <dt>תקופה</dt>
                <dd>{formatDebtPeriodDisplayHe(row.periodStartMonth, row.periodEndMonth)}</dd>
              </div>
              <div className={dataListStyles.cardGridRow}>
                <dt>בדיקת עו&quot;ד</dt>
                <dd>
                  <DebtCaseLawyerReviewStatusBadge status={row.lawyerReviewStatus} />
                </dd>
              </div>
              <div className={dataListStyles.cardGridRow}>
                <dt>הוגש</dt>
                <dd>{formatSubmittedAt(row.submittedAtIso)}</dd>
              </div>
            </dl>
            <div className={dataListStyles.cardFooter}>
              <ButtonLink href={`/app/admin/debt-cases/${row.debtCaseId}`} variant="secondary" size="sm">
                פתיחת תיק
              </ButtonLink>
            </div>
          </li>
        ))}
      </ul>

      <ListPagination
        page={list.page}
        totalPages={list.totalPages}
        summary={`עמוד ${list.page} מתוך ${list.totalPages}`}
        prevHref={prevHref}
        nextHref={nextHref}
      />
    </>
  );
}
