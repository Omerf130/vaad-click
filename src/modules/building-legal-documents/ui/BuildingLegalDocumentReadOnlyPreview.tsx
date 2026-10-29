import {
  BUILDING_LEGAL_DOCUMENT_HISTORICAL_BANNER_HE,
  BUILDING_LEGAL_DOCUMENT_READONLY_BANNER_HE,
  buildingLegalDocumentUiStatusLabelHe,
  PORTAL_SIGNATURE_UNAVAILABLE_HE,
} from "@/modules/building-legal-documents/presentation/building-legal-document-messages.he";
import { BuildingLegalDocumentUiStatus } from "@/modules/building-legal-documents/domain/building-legal-document-status";
import type { BuildingLegalDocumentPreviewView } from "@/modules/building-legal-documents/services/building-legal-document.service";
import { BuildingLegalDocumentPdfActions } from "@/modules/building-legal-documents/ui/BuildingLegalDocumentPdfActions";
import styles from "@/modules/building-legal-documents/ui/BuildingLegalDocumentReadOnlyPreview.module.scss";

type BuildingLegalDocumentReadOnlyPreviewProps = {
  document: BuildingLegalDocumentPreviewView;
  showSignatureNote?: boolean;
  pdfLinks?: { inlineHref: string; downloadHref: string };
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("he-IL", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function BuildingLegalDocumentReadOnlyPreview({
  document,
  showSignatureNote = true,
  pdfLinks,
}: BuildingLegalDocumentReadOnlyPreviewProps) {
  const isHistorical = document.uiStatus === BuildingLegalDocumentUiStatus.SUPERSEDED;

  return (
    <article className={styles.article}>
      <header className={styles.header}>
        <h1 className={styles.title}>{document.titleHe}</h1>
        <p className={styles.banner}>{BUILDING_LEGAL_DOCUMENT_READONLY_BANNER_HE}</p>
        {isHistorical ? (
          <p className={styles.historicalBanner}>{BUILDING_LEGAL_DOCUMENT_HISTORICAL_BANNER_HE}</p>
        ) : null}
      </header>
      <dl className={styles.metaList}>
        <div className={styles.metaRow}>
          <dt>סטטוס</dt>
          <dd>{buildingLegalDocumentUiStatusLabelHe(document.uiStatus)}</dd>
        </div>
        <div className={styles.metaRow}>
          <dt>גרסת תבנית</dt>
          <dd>{document.templateRevisionNumber}</dd>
        </div>
        <div className={styles.metaRow}>
          <dt>תאריך הפקה</dt>
          <dd>{formatDate(document.createdAtIso)}</dd>
        </div>
        {document.generatedByFullName ? (
          <div className={styles.metaRow}>
            <dt>הופק על ידי</dt>
            <dd>{document.generatedByFullName}</dd>
          </div>
        ) : null}
        {document.supersededAtIso ? (
          <div className={styles.metaRow}>
            <dt>הוחלף</dt>
            <dd>{formatDate(document.supersededAtIso)}</dd>
          </div>
        ) : null}
      </dl>
      {pdfLinks ? (
        <BuildingLegalDocumentPdfActions
          inlineHref={pdfLinks.inlineHref}
          downloadHref={pdfLinks.downloadHref}
        />
      ) : null}
      <div className={styles.bodyFrame} aria-label="תוכן המסמך">
        <pre className={styles.body} dir="rtl">
          {document.renderedContentSnapshot || "(ריק)"}
        </pre>
      </div>
      {showSignatureNote ? (
        <p className={styles.signatureNote}>{PORTAL_SIGNATURE_UNAVAILABLE_HE}</p>
      ) : null}
    </article>
  );
}
