import Link from "next/link";

import {
  buildStatementOfClaimReviewPdfUrl,
  StatementOfClaimReviewPdfDisposition,
} from "@/modules/statement-of-claim-drafts/presentation/statement-of-claim-review-pdf-urls";
import styles from "@/modules/statement-of-claim-drafts/ui/StatementOfClaimDraftPanel.module.scss";

type Props = {
  debtCaseId: string;
  draftId: string;
  draftRevision: number;
};

export function StatementOfClaimReviewPdfDownload({ debtCaseId, draftId, draftRevision }: Props) {
  const viewHref = buildStatementOfClaimReviewPdfUrl({ debtCaseId, draftId });
  const downloadHref = buildStatementOfClaimReviewPdfUrl({
    debtCaseId,
    draftId,
    disposition: StatementOfClaimReviewPdfDisposition.ATTACHMENT,
  });

  return (
    <div className={styles.actionsRow} role="group" aria-label="הורדת PDF לבדיקה">
      <p className={styles.statusMessage}>
        PDF לבדיקה בלבד (גרסה {draftRevision}) — עם סימן מים «טיוטת פיתוח — לא להגשה».
      </p>
      <p className={styles.statusMessage}>
        <Link href={viewHref} target="_blank" rel="noopener noreferrer">
          פתיחת PDF
        </Link>
        {" · "}
        <Link href={downloadHref} download>
          הורדת PDF
        </Link>
      </p>
    </div>
  );
}