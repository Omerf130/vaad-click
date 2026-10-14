import type { DocumentClassification } from "@/modules/document-assets/domain/document-classification";
import type { DocumentAssetStatus } from "@/modules/document-assets/domain/document-asset-status";

export type AdminDocumentAssetListItem = {
  documentAssetId: string;
  classification: DocumentClassification;
  status: DocumentAssetStatus;
  createdAtIso: string;
  byteSize: number | null;
};

export type DocumentStorageUiState = {
  configured: boolean;
  state: "storage_not_configured" | "configured";
};
