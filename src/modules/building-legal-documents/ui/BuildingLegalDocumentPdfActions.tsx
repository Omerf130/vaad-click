import {
  BUILDING_LEGAL_DOCUMENT_PDF_DOWNLOAD_LABEL_HE,
  BUILDING_LEGAL_DOCUMENT_PDF_HINT_HE,
  BUILDING_LEGAL_DOCUMENT_PDF_VIEW_LABEL_HE,
} from "@/modules/building-legal-documents/presentation/building-legal-document-messages.he";
import styles from "@/modules/building-legal-documents/ui/BuildingLegalDocumentPdfActions.module.scss";

type BuildingLegalDocumentPdfActionsProps = {
  inlineHref: string;
  downloadHref: string;
};

export function BuildingLegalDocumentPdfActions({
  inlineHref,
  downloadHref,
}: BuildingLegalDocumentPdfActionsProps) {
  return (
    <div className={styles.wrap}>
      <p className={styles.hint}>{BUILDING_LEGAL_DOCUMENT_PDF_HINT_HE}</p>
      <div className={styles.actions}>
        <a
          className={styles.actionPrimary}
          href={inlineHref}
          target="_blank"
          rel="noopener noreferrer"
        >
          {BUILDING_LEGAL_DOCUMENT_PDF_VIEW_LABEL_HE}
        </a>
        <a className={styles.actionSecondary} href={downloadHref} download>
          {BUILDING_LEGAL_DOCUMENT_PDF_DOWNLOAD_LABEL_HE}
        </a>
      </div>
    </div>
  );
}
