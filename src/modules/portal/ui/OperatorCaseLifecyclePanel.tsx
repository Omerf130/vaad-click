import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import type { DebtCaseRecord } from "@/modules/debt-cases/domain/debt-case-record.types";
import {
  formatClientDebtCaseTrackingPhaseHe,
  resolveClientDebtCaseTrackingPhase,
} from "@/modules/debt-cases/presentation/client-debt-case-tracking-phase";
import {
  DebtCaseLawyerReviewStatusBadge,
  DebtCaseWorkflowStatusBadge,
} from "@/modules/debt-cases/ui/DebtCaseStatusBadges";
import {
  OPERATOR_LETTER_DELIVERY_NOT_ACTIVE_HE,
  OPERATOR_LETTER_PREP_CLARIFICATION_HE,
} from "@/modules/portal/presentation/operator-debt-case-activity.he";
import { formatDebtCasePaymentStatusHe } from "@/modules/debt-cases/presentation/debt-case-payment-status.he";
import type { PortalDebtCasePaymentSummary } from "@/modules/debt-cases/services/debt-case-post-letter-finance.service";
import styles from "@/modules/portal/ui/OperatorPortalDashboard.module.scss";

type Props = {
  record: DebtCaseRecord;
  printedDeadlineDateIso?: string | null;
  paymentSummary?: PortalDebtCasePaymentSummary | null;
  embedded?: boolean;
};

export function OperatorCaseLifecyclePanel({
  record,
  printedDeadlineDateIso = null,
  paymentSummary = null,
  embedded = false,
}: Props) {
  const clientPhase = resolveClientDebtCaseTrackingPhase({
    record,
    printedDeadlineDateIso,
  });
  const showLetterPrepNote =
    record.lawyerReviewStatus === DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP;

  const Wrapper = embedded ? "div" : "section";
  const wrapperClass = embedded ? styles.lifecycleEmbedded : styles.lifecyclePanel;
  const titleClass = embedded ? styles.subsectionTitlePortal : styles.sectionTitle;

  return (
    <Wrapper
      className={wrapperClass}
      aria-labelledby={embedded ? undefined : "case-lifecycle-title"}
    >
      {embedded ? (
        <h3 className={titleClass}>מצב התיק</h3>
      ) : (
        <h2 id="case-lifecycle-title" className={titleClass}>
          מצב התיק
        </h2>
      )}
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
          <dt>מעקב מכתב (לקוח)</dt>
          <dd>{formatClientDebtCaseTrackingPhaseHe(clientPhase)}</dd>
        </div>
        <div>
          <dt>משלוח מכתב</dt>
          <dd>
            {record.letterSentAtIso
              ? `מכתב נשלח (תיעוד) · ${new Date(record.letterSentAtIso).toLocaleDateString("he-IL")}`
              : OPERATOR_LETTER_DELIVERY_NOT_ACTIVE_HE}
          </dd>
        </div>
        {printedDeadlineDateIso ? (
          <div>
            <dt>מועד אחרון (מכתב)</dt>
            <dd>{printedDeadlineDateIso}</dd>
          </div>
        ) : null}
        <div>
          <dt>תשלום (תיעוד)</dt>
          <dd>
            {paymentSummary
              ? `${formatDebtCasePaymentStatusHe(paymentSummary.paymentStatus)} · יתרה ${paymentSummary.outstandingBalanceDisplay} ₪ (מול ${paymentSummary.letterTotalDueDisplay} ₪ במכתב)`
              : "תיעוד תשלומים יוצג לאחר מכתב מסופק."}
          </dd>
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
    </Wrapper>
  );
}
