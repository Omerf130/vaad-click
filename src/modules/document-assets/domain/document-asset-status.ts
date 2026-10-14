export const DocumentAssetStatus = {
  PENDING_UPLOAD: "pending_upload",
  PENDING_VALIDATION: "pending_validation",
  PENDING_SCAN: "pending_scan",
  ACTIVE: "active",
  QUARANTINED: "quarantined",
  EXPIRED: "expired",
  SOFT_DELETED: "soft_deleted",
} as const;

export type DocumentAssetStatus =
  (typeof DocumentAssetStatus)[keyof typeof DocumentAssetStatus];

export const DOCUMENT_ASSET_STATUSES: readonly DocumentAssetStatus[] =
  Object.values(DocumentAssetStatus);

/** Statuses that must not be downloadable or previewable. */
export const NON_DOWNLOADABLE_DOCUMENT_STATUSES: readonly DocumentAssetStatus[] = [
  DocumentAssetStatus.PENDING_UPLOAD,
  DocumentAssetStatus.PENDING_VALIDATION,
  DocumentAssetStatus.PENDING_SCAN,
  DocumentAssetStatus.QUARANTINED,
  DocumentAssetStatus.EXPIRED,
  DocumentAssetStatus.SOFT_DELETED,
];

export function isDownloadableDocumentStatus(status: DocumentAssetStatus): boolean {
  return status === DocumentAssetStatus.ACTIVE;
}
