import Link from "next/link";

import {
  buildWarningLetterReviewPdfPath,
  WarningLetterReviewPdfDisposition,
} from "@/modules/warning-letters/presentation/warning-letter-review-pdf-urls";
import styles from "@/modules/warning-letters/ui/WarningLetterPreviewPanel.module.scss";

type Props = {
  debtCaseId: string;
  draftId: string;
  draftRevision: number;
};

export function WarningLetterReviewPdfDownload({ debtCaseId, draftId, draftRevision }: Props) {
  const viewHref = buildWarningLetterReviewPdfPath({ debtCaseId, draftId });
  const downloadHref = buildWarningLetterReviewPdfPath({
    debtCaseId,
    draftId,
    disposition: WarningLetterReviewPdfDisposition.ATTACHMENT,
  });

  return (
    <div className={styles.pdfDownloadRow} role="group" aria-label="הורדת PDF לבדיקה">
      <p className={styles.metaLine}>
        PDF לבדיקה בלבד (גרסה {draftRevision}) — לא מסמך סופי ולא משפיע על אישור או שליחה.
      </p>
      <p className={styles.linkRow}>
        <Link href={viewHref} target="_blank" rel="noopener noreferrer">
          פתיחת PDF בלשונית חדשה
        </Link>
        {" · "}
        <Link href={downloadHref} download>
          הורדת PDF
        </Link>
      </p>
    </div>
  );
}