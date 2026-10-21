"use client";

import { Button } from "@/components/ui/Button/Button";
import { CollapsibleFilterPanel } from "@/components/ui/DataList/CollapsibleFilterPanel";
import dataListStyles from "@/components/ui/DataList/DataList.module.scss";
import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import { describeLawyerDebtCaseActiveFilters } from "@/modules/debt-cases/presentation/lawyer-debt-case-list-filters";
import type { LawyerDebtCaseBuildingOption } from "@/modules/debt-cases/services/lawyer-debt-case-query.service";
import { LawyerDebtCaseActiveFilters } from "@/modules/debt-cases/ui/lawyer/LawyerDebtCaseActiveFilters";
import { LAWYER_DEBT_CASE_LIST_CLEAR_HREF } from "@/modules/debt-cases/ui/lawyer/lawyer-debt-case-list-url";
import type { LawyerDebtCaseListParams } from "@/modules/debt-cases/validation/lawyer-debt-case-list.schema";

type Props = {
  params: LawyerDebtCaseListParams;
  buildings: LawyerDebtCaseBuildingOption[];
};

export function LawyerDebtCaseQueueFilters({ params, buildings }: Props) {
  const buildingNameById = new Map(buildings.map((b) => [b.buildingId, b.displayName]));
  const active = describeLawyerDebtCaseActiveFilters(params, buildingNameById);

  return (
    <>
      {active.length > 0 ? (
        <LawyerDebtCaseActiveFilters params={params} buildings={buildings} />
      ) : null}
      <CollapsibleFilterPanel
        activeFilterCount={active.length}
        resetHref={active.length > 0 ? LAWYER_DEBT_CASE_LIST_CLEAR_HREF : undefined}
        hiddenFields={<input type="hidden" name="page" value="1" />}
        primary={
          <div className={dataListStyles.filterField}>
            <label className={dataListStyles.filterLabel} htmlFor="q">
              חיפוש
            </label>
            <input
              id="q"
              name="q"
              className={dataListStyles.filterInput}
              defaultValue={params.q ?? ""}
              placeholder="דירה, שם חייב…"
            />
          </div>
        }
        secondary={
          <>
            <div className={dataListStyles.filterField}>
              <label className={dataListStyles.filterLabel} htmlFor="buildingId">
                בניין
              </label>
              <select
                id="buildingId"
                name="buildingId"
                className={dataListStyles.filterSelect}
                defaultValue={params.buildingId ?? ""}
              >
                <option value="">כל הבניינים</option>
                {buildings.map((building) => (
                  <option key={building.buildingId} value={building.buildingId}>
                    {building.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div className={dataListStyles.filterField}>
              <label className={dataListStyles.filterLabel} htmlFor="lawyerReviewStatus">
                סטטוס בדיקה
              </label>
              <select
                id="lawyerReviewStatus"
                name="lawyerReviewStatus"
                className={dataListStyles.filterSelect}
                defaultValue={params.lawyerReviewStatus}
              >
                <option value="all">הכל</option>
                <option value={DebtCaseLawyerReviewStatus.PENDING}>ממתין לבדיקה</option>
                <option value={DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP}>
                  אושר להכנת מכתב
                </option>
                <option value={DebtCaseLawyerReviewStatus.RETURNED}>הוחזר</option>
                <option value={DebtCaseLawyerReviewStatus.REJECTED}>נדחה</option>
                <option value={DebtCaseLawyerReviewStatus.NOT_SUBMITTED}>טרם הוגש</option>
              </select>
            </div>
            <div className={dataListStyles.filterField}>
              <label className={dataListStyles.filterLabel} htmlFor="workflowStatus">
                סטטוס תיק
              </label>
              <select
                id="workflowStatus"
                name="workflowStatus"
                className={dataListStyles.filterSelect}
                defaultValue={params.workflowStatus}
              >
                <option value="all">הכל</option>
                <option value={DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW}>
                  ממתין לבדיקת עורך דין
                </option>
                <option value={DebtCaseWorkflowStatus.RETURNED_FOR_COMPLETION}>הוחזר להשלמה</option>
                <option value={DebtCaseWorkflowStatus.REJECTED}>נדחה</option>
                <option value={DebtCaseWorkflowStatus.DRAFT}>טיוטה</option>
                <option value={DebtCaseWorkflowStatus.CLOSED_MANUAL}>נסגר ידנית</option>
              </select>
            </div>
          </>
        }
        actions={
          <Button type="submit" size="sm">
            החל סינון
          </Button>
        }
      />
    </>
  );
}
