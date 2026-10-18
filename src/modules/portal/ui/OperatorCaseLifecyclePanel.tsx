import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import { DebtCaseLetterDeliveryStatus } from "@/modules/debt-cases/domain/debt-case-letter-delivery-status";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import type { DebtCaseRecord } from "@/modules/debt-cases/domain/debt-case-record.types";
import {
  DebtCaseLawyerReviewStatusBadge,
  DebtCaseWorkflowStatusBadge,
} from "@/modules/debt-cases/ui/DebtCaseStatusBadges";
import {
  OPERATOR_LETTER_DELIVERY_NOT_ACTIVE_HE,
  OPERATOR_LETTER_PREP_CLARIFICATION_HE,
  OPERATOR_PAYMENT_NOT_ACTIVE_HE,
} from "@/modules/portal/presentation/operator-debt-case-activity.he";
import styles from "@/modules/portal/ui/OperatorPortalDashboard.module.scss";

type Props = {
  record: DebtCaseRecord;
};

function formatLetterDeliveryHe(status: string, letterSentAtIso: string | null): string {
  if (letterSentAtIso) {
    return `מכתב נשלח (תיעוד) · ${new Date(letterSentAtIso).toLocaleDateString("he-IL")}`;
  }
  if (status === DebtCaseLetterDeliveryStatus.SENT) {
    return "סטטוס משלוח: נשלח (ללא תאריך)";
  }
  if (status === DebtCaseLetterDeliveryStatus.PENDING_SEND) {
    return "ממתין להפעלת תהליך משלוח — לא פעיל כרגע";
  }
  if (status === DebtCaseLetterDeliveryStatus.NONE) {
    return OPERATOR_LETTER_DELIVERY_NOT_ACTIVE_HE;
  }
  return OPERATOR_LETTER_DELIVERY_NOT_ACTIVE_HE;
}

export function OperatorCaseLifecyclePanel({ record }: Props) {
  const showLetterPrepNote =
    record.lawyerReviewStatus === DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP;

  return (
    <section className={styles.lifecyclePanel} aria-labelledby="case-lifecycle-title">
      <h2 id="case-lifecycle-title" className={styles.sectionTitle}>
        מצב התיק
      </h2>
      <dl className={styles.lifecycleGrid}>
        <div>
          <dt>סטטוס תיק</dt>
          <dd>
            <DebtCaseWorkflowStatusBadge status={record.workflowStatus} />
          </dd>
        </div>
        <div>
          <dt>בדיקת עורך דין</dt>
          <dd>
            <DebtCaseLawyerReviewStatusBadge status={record.lawyerReviewStatus} />
          </dd>
        </div>
        <div>
          <dt>משלוח מכתב</dt>
          <dd>{formatLetterDeliveryHe(record.letterDeliveryStatus, record.letterSentAtIso)}</dd>
        </div>
        <div>
          <dt>תשלום</dt>
          <dd>{OPERATOR_PAYMENT_NOT_ACTIVE_HE}</dd>
        </div>
      </dl>
      {showLetterPrepNote ? (
        <p className={styles.infoBanner}>{OPERATOR_LETTER_PREP_CLARIFICATION_HE}</p>
      ) : null}
      {record.workflowStatus === DebtCaseWorkflowStatus.REJECTED ? (
        <p className={styles.warningBanner} role="status">
          התיק נדחה. לפרטים פנו למשרד עורך הדין.
        </p>
      ) : null}
      {record.validationFlags.length > 0 ? (
        <div className={styles.validationFlagsBox}>
          <p className={styles.label}>הערות אימות על התיק</p>
          <ul>
            {record.validationFlags.map((flag, index) => (
              <li key={`${flag.code}-${index}`}>
                {flag.messageHe}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
