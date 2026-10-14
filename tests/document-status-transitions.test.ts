import { describe, expect, it } from "vitest";

import {
  DocumentAssetError,
  DocumentAssetErrorCode,
} from "@/modules/document-assets/domain/document-asset-errors";
import { DocumentAssetStatus } from "@/modules/document-assets/domain/document-asset-status";
import {
  assertDocumentStatusTransition,
  assertMayBecomeActive,
} from "@/modules/document-assets/domain/document-status-transitions";

describe("document status transitions", () => {
  it("allows pending_upload to pending_validation", () => {
    expect(() =>
      assertDocumentStatusTransition(
        DocumentAssetStatus.PENDING_UPLOAD,
        DocumentAssetStatus.PENDING_VALIDATION,
      ),
    ).not.toThrow();
  });

  it("rejects active to quarantined", () => {
    expect(() =>
      assertDocumentStatusTransition(DocumentAssetStatus.ACTIVE, DocumentAssetStatus.QUARANTINED),
    ).toThrowError(
      expect.objectContaining({ code: DocumentAssetErrorCode.INVALID_STATUS_TRANSITION }),
    );
  });

  it("requires malware scan before active", () => {
    expect(() =>
      assertMayBecomeActive({
        storageKey: "buildings/a/assets/b/c",
        storageProvider: "vercel_blob",
        sha256Checksum: "b".repeat(64),
        byteSize: 100,
        detectedMimeType: "application/pdf",
        malwareScanComplete: false,
      }),
    ).toThrow(DocumentAssetError);
  });

  it("allows active when storage metadata and scan complete", () => {
    expect(() =>
      assertMayBecomeActive({
        storageKey: "buildings/a/assets/b/c",
        storageProvider: "vercel_blob",
        sha256Checksum: "b".repeat(64),
        byteSize: 100,
        detectedMimeType: "application/pdf",
        malwareScanComplete: true,
      }),
    ).not.toThrow();
  });
});
