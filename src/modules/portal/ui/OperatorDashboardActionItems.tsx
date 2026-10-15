import Link from "next/link";

import {
  DebtCaseLawyerReviewStatusBadge,
  DebtCaseWorkflowStatusBadge,
} from "@/modules/debt-cases/ui/DebtCaseStatusBadges";
import type { OperatorDashboardActionItem } from "@/modules/portal/services/operator-portal-dashboard.service";
import styles from "@/modules/portal/ui/OperatorPortalDashboard.module.scss";
import type { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import type { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";

type Props = {
  items: OperatorDashboardActionItem[];
  showBuildingName?: boolean;
};

export function OperatorDashboardActionItems({ items, showBuildingName = false }: Props) {
  if (items.length === 0) {
    return <p className={styles.emptyState}>אין כרגע תיקים שדורשים פעולה מיידית.</p>;
  }

  return (
    <ul className={styles.actionList}>
      {items.map((item) => (
        <li key={item.debtCaseId} className={styles.actionItem}>
          <div>
            <p className={styles.actionMeta}>
              {showBuildingName ? `${item.buildingDisplayName} · ` : ""}
              דירה {item.apartmentNumberDisplay}
            </p>
            <div className={styles.actionsRow}>
              <DebtCaseWorkflowStatusBadge status={item.workflowStatus as DebtCaseWorkflowStatus} />
              <DebtCaseLawyerReviewStatusBadge
                status={item.lawyerReviewStatus as DebtCaseLawyerReviewStatus}
              />
            </div>
          </div>
          <Link href={`/app/buildings/${item.buildingId}/debt-cases/${item.debtCaseId}`}>
            פתיחת תיק
          </Link>
        </li>
      ))}
    </ul>
  );
}
