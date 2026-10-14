import { DocumentClassification } from "@/modules/document-assets/domain/document-classification";
import { DocumentAssetStatus } from "@/modules/document-assets/domain/document-asset-status";

export const DOCUMENT_ASSET_UI_COPY = {
  sectionTitle: "מסמכים",
  storageNotConfigured:
    "אחסון מסמכים מאובטח עדיין לא הופעל בסביבה זו. העלאה, תצוגה והורדה יהיו זמינים לאחר חיבור ספק אחסון וסריקת תוכן.",
  emptyState: "אין מסמכים פעילים לבניין זה.",
  uploadDisabledLabel: "העלאת מסמך (לא זמין)",
  downloadDisabledLabel: "הורדה (לא זמין)",
  classificationColumn: "סוג מסמך",
  statusColumn: "סטטוס",
  createdColumn: "נוצר",
  sizeColumn: "גודל",
  documentIdColumn: "מזהה",
} as const;

const CLASSIFICATION_LABELS: Record<DocumentClassification, string> = {
  [DocumentClassification.BUILDING_COMMITTEE_AUTHORIZATION]: "הרשאת ועד בית",
  [DocumentClassification.BANK_ACCOUNT_OWNERSHIP_PROOF]: "אישור בעלות חשבון בנק",
  [DocumentClassification.LEGAL_ENGAGEMENT_AGREEMENT]: "הסכם שירות משפטי",
  [DocumentClassification.SIGNED_ENGAGEMENT_AGREEMENT]: "הסכם חתום",
  [DocumentClassification.DEBT_CASE_ATTACHMENT]: "נספח תיק חוב",
  [DocumentClassification.GENERATED_WARNING_LETTER]: "מכתב התראה",
  [DocumentClassification.PAYMENT_TRANSFER_PROOF]: "אישור תשלום/העברה",
};

const STATUS_LABELS: Record<DocumentAssetStatus, string> = {
  [DocumentAssetStatus.PENDING_UPLOAD]: "ממתין להעלאה",
  [DocumentAssetStatus.PENDING_VALIDATION]: "ממתין לאימות",
  [DocumentAssetStatus.PENDING_SCAN]: "ממתין לסריקה",
  [DocumentAssetStatus.ACTIVE]: "פעיל",
  [DocumentAssetStatus.QUARANTINED]: "בהסגר",
  [DocumentAssetStatus.EXPIRED]: "פג תוקף",
  [DocumentAssetStatus.SOFT_DELETED]: "נמחק",
};

export function formatDocumentClassificationHe(
  classification: DocumentClassification,
): string {
  return CLASSIFICATION_LABELS[classification] ?? classification;
}

export function formatDocumentAssetStatusHe(status: DocumentAssetStatus): string {
  return STATUS_LABELS[status] ?? status;
}

export function formatDocumentByteSizeHe(byteSize: number | null): string {
  if (byteSize == null) {
    return "—";
  }
  if (byteSize < 1024) {
    return `${byteSize} B`;
  }
  if (byteSize < 1024 * 1024) {
    return `${(byteSize / 1024).toFixed(1)} KB`;
  }
  return `${(byteSize / (1024 * 1024)).toFixed(1)} MB`;
}
