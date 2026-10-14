export const DocumentAssetErrorCode = {
  FORBIDDEN: "DOCUMENT_ASSET_FORBIDDEN",
  NOT_FOUND: "DOCUMENT_ASSET_NOT_FOUND",
  VALIDATION: "DOCUMENT_ASSET_VALIDATION",
  STORAGE_NOT_CONFIGURED: "DOCUMENT_ASSET_STORAGE_NOT_CONFIGURED",
  STORAGE_UNAVAILABLE: "DOCUMENT_ASSET_STORAGE_UNAVAILABLE",
  INVALID_STATUS_TRANSITION: "DOCUMENT_ASSET_INVALID_STATUS_TRANSITION",
  AUDIT_PERSISTENCE: "DOCUMENT_ASSET_AUDIT_PERSISTENCE",
} as const;

export type DocumentAssetErrorCode =
  (typeof DocumentAssetErrorCode)[keyof typeof DocumentAssetErrorCode];

export class DocumentAssetError extends Error {
  readonly code: DocumentAssetErrorCode;

  constructor(code: DocumentAssetErrorCode, message: string) {
    super(message);
    this.name = "DocumentAssetError";
    this.code = code;
  }
}
