import "server-only";

import type {
  DocumentStorageAdapter,
  DocumentStorageCapability,
} from "@/modules/document-assets/domain/document-storage-adapter.types";

const NOT_CONFIGURED_CAPABILITY: DocumentStorageCapability = {
  state: "storage_not_configured",
  provider: null,
};

class UnconfiguredDocumentStorageAdapter implements DocumentStorageAdapter {
  getCapability(): DocumentStorageCapability {
    return NOT_CONFIGURED_CAPABILITY;
  }

  async createUploadIntent(): Promise<never> {
    throw new Error("Document storage is not configured");
  }

  async headObject(): Promise<never> {
    throw new Error("Document storage is not configured");
  }

  async readObjectStream(): Promise<never> {
    throw new Error("Document storage is not configured");
  }

  async deleteObject(): Promise<never> {
    throw new Error("Document storage is not configured");
  }
}

let adapterSingleton: DocumentStorageAdapter | null = null;

/**
 * Returns the active storage adapter. CP7 ships with storage_not_configured only.
 * A future checkpoint will register Vercel Private Blob here when env is present.
 */
export function getDocumentStorageAdapter(): DocumentStorageAdapter {
  if (!adapterSingleton) {
    adapterSingleton = new UnconfiguredDocumentStorageAdapter();
  }
  return adapterSingleton;
}

export function getDocumentStorageCapability(): DocumentStorageCapability {
  return getDocumentStorageAdapter().getCapability();
}

/** Test hook — do not use in production routes. */
export function __setDocumentStorageAdapterForTests(
  adapter: DocumentStorageAdapter | null,
): void {
  adapterSingleton = adapter;
}
