import { DocumentAssetStatus } from "@/modules/document-assets/domain/document-asset-status";
import {
  DocumentAssetError,
  DocumentAssetErrorCode,
} from "@/modules/document-assets/domain/document-asset-errors";

const ALLOWED_TRANSITIONS: Readonly<
  Record<DocumentAssetStatus, readonly DocumentAssetStatus[]>
> = {
  [DocumentAssetStatus.PENDING_UPLOAD]: [
    DocumentAssetStatus.PENDING_VALIDATION,
    DocumentAssetStatus.EXPIRED,
    DocumentAssetStatus.SOFT_DELETED,
  ],
  [DocumentAssetStatus.PENDING_VALIDATION]: [
    DocumentAssetStatus.PENDING_SCAN,
    DocumentAssetStatus.QUARANTINED,
    DocumentAssetStatus.EXPIRED,
    DocumentAssetStatus.SOFT_DELETED,
  ],
  [DocumentAssetStatus.PENDING_SCAN]: [
    DocumentAssetStatus.ACTIVE,
    DocumentAssetStatus.QUARANTINED,
    DocumentAssetStatus.SOFT_DELETED,
  ],
  [DocumentAssetStatus.ACTIVE]: [DocumentAssetStatus.SOFT_DELETED],
  [DocumentAssetStatus.QUARANTINED]: [
    DocumentAssetStatus.SOFT_DELETED,
    DocumentAssetStatus.PENDING_SCAN,
  ],
  [DocumentAssetStatus.EXPIRED]: [DocumentAssetStatus.SOFT_DELETED],
  [DocumentAssetStatus.SOFT_DELETED]: [],
};

export function assertDocumentStatusTransition(
  from: DocumentAssetStatus,
  to: DocumentAssetStatus,
): void {
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new DocumentAssetError(
      DocumentAssetErrorCode.INVALID_STATUS_TRANSITION,
      `Invalid document status transition from ${from} to ${to}`,
    );
  }
}

/** Active requires verified storage metadata and successful malware scan (future). */
export function assertMayBecomeActive(input: {
  storageKey: string | null | undefined;
  storageProvider: string | null | undefined;
  sha256Checksum: string | null | undefined;
  byteSize: number | null | undefined;
  detectedMimeType: string | null | undefined;
  malwareScanComplete: boolean;
}): void {
  if (
    !input.storageKey ||
    !input.storageProvider ||
    !input.sha256Checksum ||
    input.byteSize == null ||
    !input.detectedMimeType
  ) {
    throw new DocumentAssetError(
      DocumentAssetErrorCode.VALIDATION,
      "Document cannot become active without verified storage metadata",
    );
  }
  if (!input.malwareScanComplete) {
    throw new DocumentAssetError(
      DocumentAssetErrorCode.VALIDATION,
      "Document cannot become active until malware scan completes",
    );
  }
}
