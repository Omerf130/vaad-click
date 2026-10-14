import type { ApprovedDocumentMimeType } from "@/modules/document-assets/domain/document-content-policy";

export type DocumentStorageCapability =
  | { state: "configured"; provider: string }
  | { state: "storage_not_configured"; provider: null };

export type DocumentUploadIntent = {
  storageKey: string;
  uploadUrl: string;
  expiresAt: Date;
  requiredHeaders: Record<string, string>;
};

export type StoredObjectMetadata = {
  byteSize: number;
  etag?: string;
  lastModified?: Date;
};

export type DocumentStorageAdapter = {
  getCapability(): DocumentStorageCapability;
  createUploadIntent(input: {
    storageKey: string;
    maxByteSize: number;
    contentType: ApprovedDocumentMimeType;
    expiresAt: Date;
  }): Promise<DocumentUploadIntent>;
  headObject(storageKey: string): Promise<StoredObjectMetadata | null>;
  readObjectStream(storageKey: string): Promise<ReadableStream<Uint8Array>>;
  deleteObject(storageKey: string): Promise<void>;
};
