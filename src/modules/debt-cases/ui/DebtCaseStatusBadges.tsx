import { StatusBadge } from "@/components/ui/StatusBadge/StatusBadge";
import type { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import type { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import {
  lawyerReviewStatusBadgeLabel,
  lawyerReviewStatusBadgeVariant,
  workflowStatusBadgeLabel,
  workflowStatusBadgeVariant,
} from "@/modules/debt-cases/presentation/debt-case-status-badges";

export function DebtCaseLawyerReviewStatusBadge({
  status,
}: {
  status: DebtCaseLawyerReviewStatus;
}) {
  return (
    <StatusBadge
      label={lawyerReviewStatusBadgeLabel(status)}
      variant={lawyerReviewStatusBadgeVariant(status)}
    />
  );
}

export function DebtCaseWorkflowStatusBadge({ status }: { status: DebtCaseWorkflowStatus }) {
  return (
    <StatusBadge
      label={workflowStatusBadgeLabel(status)}
      variant={workflowStatusBadgeVariant(status)}
    />
  );
}
