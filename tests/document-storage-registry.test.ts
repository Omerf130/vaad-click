import { afterEach, describe, expect, it } from "vitest";

import type { DocumentStorageAdapter } from "@/modules/document-assets/domain/document-storage-adapter.types";
import {
  __setDocumentStorageAdapterForTests,
  getDocumentStorageCapability,
} from "@/modules/document-assets/infra/document-storage-registry";

describe("document storage registry", () => {
  afterEach(() => {
    __setDocumentStorageAdapterForTests(null);
  });

  it("reports storage_not_configured by default", () => {
    expect(getDocumentStorageCapability()).toEqual({
      state: "storage_not_configured",
      provider: null,
    });
  });

  it("uses injected adapter in tests", () => {
    const adapter: DocumentStorageAdapter = {
      getCapability: () => ({ state: "configured", provider: "vercel_blob" }),
      createUploadIntent: async () => {
        throw new Error("not implemented");
      },
      headObject: async () => {
        throw new Error("not implemented");
      },
      readObjectStream: async () => {
        throw new Error("not implemented");
      },
      deleteObject: async () => {
        throw new Error("not implemented");
      },
    };
    __setDocumentStorageAdapterForTests(adapter);
    expect(getDocumentStorageCapability().state).toBe("configured");
  });
});
