"use client";

import Link from "next/link";

import {
  buildWarningLetterFinalPdfPath,
  WarningLetterFinalPdfDisposition,
} from "@/modules/warning-letters/presentation/warning-letter-final-pdf-urls";
import styles from "@/modules/warning-letters/ui/WarningLetterPreviewPanel.module.scss";

type Props = {
  debtCaseId: string;
  finalDocumentId: string;
  draftRevision: number;
  archivalNoteHe: string;
};

export function WarningLetterFinalPdfDownload({
  debtCaseId,
  finalDocumentId,
  draftRevision,
  archivalNoteHe,
}: Props) {
  const viewHref = buildWarningLetterFinalPdfPath({ debtCaseId, finalDocumentId });
  const downloadHref = buildWarningLetterFinalPdfPath({
    debtCaseId,
    finalDocumentId,
    disposition: WarningLetterFinalPdfDisposition.ATTACHMENT,
  });

  return (
    <div className={styles.pdfDownloadRow} role="group" aria-label="הורדת PDF סופי">
      <p className={styles.metaLine}>
        PDF סופי · גרסה {draftRevision} — נוצר מהצילום הקפוא (בלי סימון בדיקה).
      </p>
      <p className={styles.metaLine}>{archivalNoteHe}</p>
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