import { Button } from "@/components/ui/Button/Button";
import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import type { LawyerDebtCaseBuildingOption } from "@/modules/debt-cases/services/lawyer-debt-case-query.service";
import { LawyerDebtCaseActiveFilters } from "@/modules/debt-cases/ui/lawyer/LawyerDebtCaseActiveFilters";
import styles from "@/modules/debt-cases/ui/lawyer/LawyerDebtCasesAdmin.module.scss";
import type { LawyerDebtCaseListParams } from "@/modules/debt-cases/validation/lawyer-debt-case-list.schema";

type Props = {
  params: LawyerDebtCaseListParams;
  buildings: LawyerDebtCaseBuildingOption[];
};

export function LawyerDebtCaseQueueFilters({ params, buildings }: Props) {
  return (
    <>
      <LawyerDebtCaseActiveFilters params={params} buildings={buildings} />
      <form method="get" className={styles.filters}>
        <input type="hidden" name="page" value="1" />
        <div className={styles.field}>
          <label className={styles.label} htmlFor="q">
            חיפוש
          </label>
          <input
            id="q"
            name="q"
            className={styles.input}
            defaultValue={params.q ?? ""}
            placeholder="דירה, שם חייב…"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="buildingId">
            בניין
          </label>
          <select
            id="buildingId"
            name="buildingId"
            className={styles.select}
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
        <div className={styles.field}>
          <label className={styles.label} htmlFor="lawyerReviewStatus">
            סטטוס בדיקה
          </label>
          <select
            id="lawyerReviewStatus"
            name="lawyerReviewStatus"
            className={styles.select}
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
        <div className={styles.field}>
          <label className={styles.label} htmlFor="workflowStatus">
            סטטוס תיק
          </label>
          <select
            id="workflowStatus"
            name="workflowStatus"
            className={styles.select}
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
        <div className={styles.field}>
          <Button type="submit" size="sm">
            סינון
          </Button>
        </div>
      </form>
    </>
  );
}
